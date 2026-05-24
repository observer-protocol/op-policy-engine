# Observer Protocol Policy Engine

[![Spec: AIP v0.8](https://img.shields.io/badge/Spec-AIP%20v0.8-blue)](https://github.com/observer-protocol/aip/blob/main/aip-v0.8-draft-1.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Interface-007ACC?logo=typescript&logoColor=white)](packages/policy-interface/)

**Delegation-scoped policy enforcement for agentic wallets.**

This repository hosts the public specification, JSON Schema, integration guides, and TypeScript interfaces for the Observer Protocol Policy Engine — a wallet-embeddable enforcement layer that evaluates proposed transactions against the `tradingMandate` declared in a signed `ObserverDelegationCredential` and emits a verifiable `PolicyEvaluationCredential` recording the decision.

## Quick links

- **Spec:** [AIP v0.8 draft 1](https://github.com/observer-protocol/aip/blob/main/aip-v0.8-draft-1.md) — the authoritative source for `tradingMandate` extensions and `PolicyEvaluationCredential`.
- **Integration patterns:** [docs/INTEGRATION.md](./docs/INTEGRATION.md).
- **JSON Schema:** [schema/policy.schema.json](./schema/policy.schema.json).
- **Example policies:** [examples/policy-templates/](./examples/policy-templates/).
- **npm package:** [`@observer-protocol/policy-interface`](./packages/policy-interface) — TypeScript interfaces only (MIT). The runtime evaluator implementation is proprietary.

## What this is

A policy engine that runs **at the wallet boundary, pre-settlement**. When an agent's delegated wallet (Tether WDK, Aqua/Liquid, OWS, Safe App, …) is about to sign and broadcast a transaction, the engine evaluates the proposed action against the agent's signed delegation credential. The engine answers a single question: *did this proposed action fall within the scope of the cryptographic mandate the agent's principal signed?*

If the answer is no, the transaction is not signed — the key material does not proceed. If the answer is yes, the engine returns a signed `PolicyEvaluationCredential` recording the allow decision, bound to the specific transaction proposal and the specific delegation credential.

## What this is not

- **Not a custodial service.** The engine does not custody keys, route funds, or settle transactions. It evaluates authorization and signs decisions.
- **Not a reputation system.** Counterparty trust is consumed from Observer Protocol attestations (`issuer_class`), not computed here. AT-ARS scoring is a separate concern.
- **Not a single-vendor approach.** The engine is designed to be embedded in any wallet that runs untrusted code on behalf of a principal. Reference integrations exist for several wallets; the protocol is intentionally portable.

## Two integration patterns

See [docs/INTEGRATION.md](./docs/INTEGRATION.md) for the full treatment.

1. **Wallet-embedded** (recommended) — the wallet imports `@observer-protocol/policy-core` and runs the evaluator in-process, pre-signature. Denial means the wallet's signing routine is never reached. Reference adapters: [WDK](./docs/WDK-INTEGRATION.md), [Aqua/Liquid](./docs/AQUA-INTEGRATION.md), [Safe (planned)](./docs/SAFE-INTEGRATION.md), [OWS (planned)](./docs/OWS-INTEGRATION.md).

   ```ts
   import { evaluate } from '@observer-protocol/policy-core';

   const decision = await evaluate({
     proposal: { rail: 'ethereum-mainnet', canonicalBytes: unsignedTxHex },
     delegationCredential,           // the signed ObserverDelegationCredential
     attestations: counterpartyAttestations,  // optional pre-fetched context
   });

   if (decision.credentialSubject.decision === 'deny') {
     throw new PolicyViolationError(decision.credentialSubject.denyReason!.message);
   }
   // Allowed. `decision` is itself a signed PolicyEvaluationCredential bound
   // to the proposal hash + the delegation credential hash — store it
   // alongside the signed transaction for the audit trail.
   ```

2. **Sidecar API** — the wallet calls a localhost HTTP endpoint that runs the evaluator. Useful when embedding TypeScript in the wallet's stack is impractical (e.g. native wallets, multi-language teams). Sidecar shape documented in the integration guides.

Both patterns produce identical signed `PolicyEvaluationCredential`s. Verifiers cannot tell which integration pattern produced a given decision; they only verify the proof.

## Verification

Every `PolicyEvaluationCredential` is signed by an `assertionMethod`-valid key on the issuer DID. Observer Protocol's policy evaluator signs with `did:web:observerprotocol.org#key-3`, scoped to this credential type only. The full key-scoping policy is published at [`https://observerprotocol.org/.well-known/key-scoping.json`](https://observerprotocol.org/.well-known/key-scoping.json). Verifiers SHOULD consult that document to detect mis-scoped issuance.

Other implementers of the Policy Engine are encouraged to publish their own key-scoping policies under their issuer DID.

## Status

v0.8 is published as a draft in the [AIP repository](https://github.com/observer-protocol/aip). This repository tracks the implementation surface — schema, types, integration guides, examples. The runtime reference implementation is maintained privately (see Implementation, below).

## Implementation

The reference implementation is `observer-protocol/policy-core-impl` (private). It exposes the same wire format as documented here. Other implementations are welcome and encouraged; this repository's spec, schema, and interfaces are sufficient to build an interoperable evaluator.

## Contributing

This repository hosts the public specification and integration surface. The reference runtime implementation is maintained privately.

**Contributions welcome:**
- Integration guides for additional wallets — submit a PR adding `docs/{WALLET}-INTEGRATION.md` following the structure of the existing guides.
- Per-rail canonicalisation specs — add `docs/canonicalization/{rail}.md` describing exactly how `proposalHash` is computed for that rail (see [SPEC.md](./docs/SPEC.md)).
- Policy template examples in `examples/policy-templates/` — must validate against `schema/policy.schema.json`.
- TypeScript interface improvements in `packages/policy-interface/` — keep types 1:1 with AIP v0.8.
- Documentation clarifications — open an issue describing the ambiguity before submitting a PR.

**Not in scope for this repo:**
- Runtime evaluator implementation (proprietary).
- Wallet-specific bug reports — file those with the wallet vendor; if the bug is in the integration pattern itself, open an issue here.
- Spec changes — those land in the [AIP repository](https://github.com/observer-protocol/aip) as numbered draft revisions.

See the [contribution guide in each wallet integration doc](./docs/) for wallet-specific contribution paths.

## License

This repository's contents are MIT-licensed (`LICENSE`). The proprietary reference implementation is not part of this repository.
