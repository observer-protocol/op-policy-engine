# WDK integration (Tether)

This guide describes how to integrate the Observer Protocol Policy Engine as a pre-settlement hook inside the [Tether WDK](https://wallet.tether.io/). The pattern is wallet-embedded (see [INTEGRATION.md](./INTEGRATION.md) for pattern selection).

## What gets added to the WDK build

One npm dependency:

```bash
npm install @observer-protocol/policy-core
```

(The package is published from the proprietary `policy-core-impl` repository. The public `@observer-protocol/policy-interface` package carries the types only and is sufficient for type-checking integrations that defer the runtime to a sidecar.)

## Where the hook lives

Inside the WDK's transaction-signing pipeline, **immediately before** the call that signs the unsigned transaction. The hook receives the unsigned tx + the delegation credential that authorises the signing agent, and returns a decision.

```ts
import { evaluate } from '@observer-protocol/policy-core';
import type { PolicyEvaluationCredential } from '@observer-protocol/policy-interface';

async function preSettlementHook(
  unsignedTx: WDKUnsignedTransaction,
  delegationCredential: ObserverDelegationCredential,
): Promise<PolicyEvaluationCredential> {
  const decision = await evaluate({
    proposal: {
      rail: unsignedTx.rail,                       // e.g. 'ethereum-mainnet' | 'tron'
      canonicalBytes: unsignedTx.preSignBytes(),   // rail-native canonical pre-sign hex
      humanReadable: unsignedTx.toJSON(),
    },
    delegationCredential,
    attestations: await fetchAttestationsForCounterparty(unsignedTx),
  });

  if (decision.credentialSubject.decision === 'deny') {
    // Surface the structured deny reason to the agent / human operator.
    throw new PolicyDenied(decision);
  }
  return decision;
}
```

The WDK signer is wrapped to call the hook first and store the returned credential alongside the broadcast record.

## Per-rail canonicalisation

The `proposalHash` inside the returned `PolicyEvaluationCredential` is the SHA-256 of `canonicalBytes`. For each rail the WDK supports, the canonical pre-sign bytes are:

| Rail | Canonical pre-sign bytes |
|---|---|
| EVM mainnet / testnets | RLP encoding of the unsigned transaction (the same bytes a signer normally hashes) |
| TRON (TRC-20 USDT) | Protobuf-serialised `raw_data` of the `Transaction` |
| Bitcoin / Lightning HTLCs | Standard sighash preimage |
| Solana | Compiled message bytes pre-signature |

The reference implementation publishes the exact canonicalisation per rail at `https://docs.observerprotocol.org/policy/canonicalization/{rail}`. WDK implementations MUST consume the canonical pre-sign bytes from the rail's standard libraries — never reimplement.

## What gets stored on success

For each allowed transaction, the WDK stores three artifacts together:

1. The signed transaction (as today).
2. The `PolicyEvaluationCredential` (new) — signed by the engine, bound to the proposal hash and the delegation credential hash.
3. The broadcast receipt / on-chain tx hash (as today).

These three together form the audit trail: *here is the action, here is the cryptographic decision that authorised it, here is the on-chain confirmation*.

## Denial surface

On deny, the WDK MUST NOT sign. The structured deny reason (`ruleType`, `ruleField`, `message`) is surfaced to the user / agent so they can adjust the proposal or escalate.

The `PolicyEvaluationCredential` on deny is still emitted and SHOULD be stored — both for audit purposes and because a denied attempt may itself be reportable (compliance, fraud detection, behavioural analysis).

## Latency budget

Target: <100ms per evaluation (p95). The engine's declarative rules evaluate in <5ms; attestation lookups are the dominant cost when not pre-fetched. WDK implementations SHOULD pre-fetch counterparty attestations alongside other counterparty resolution (address lookups, ENS, etc.) and pass them via the `attestations` field.

## Verifying the credential later

Anyone — counterparty, auditor, regulator — can independently verify the returned `PolicyEvaluationCredential`:

1. Resolve the issuer DID (e.g. `did:web:observerprotocol.org`).
2. Extract the `assertionMethod`-listed verification key referenced in `proof.verificationMethod`.
3. Verify the Ed25519 signature over the JCS-canonical form of the credential (excluding `proof`).
4. Optionally cross-check against `https://observerprotocol.org/.well-known/key-scoping.json` to confirm the signing key is governance-scoped for this credential type.

No call back to Observer Protocol's servers is required for verification.
