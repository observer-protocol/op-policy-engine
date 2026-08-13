# Observer Protocol Policy Engine

**The shared core of [OP Crossrail](https://observerprotocol.org)** — Observer Protocol's cross-rail authorization layer. The crossRailBudget vocabulary (schema v2.3), the shared CrossRailLedger, and the rail-agnostic mandate evaluator live here; the per-rail engines (OWS, mppx/Tempo, Tether WDK, L402/Lightning, x402) are its instances.

[![Spec: AIP v0.8](https://img.shields.io/badge/Spec-AIP%20v0.8-blue)](https://github.com/observer-protocol/aip/blob/main/aip-v0.8-draft-1.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@observer-protocol/policy-engine?logo=npm)](https://www.npmjs.com/package/@observer-protocol/policy-engine)

**Delegation-scoped policy enforcement for agentic wallets.**

This repository hosts the public specification, JSON Schema, integration guides **and the runtime** for the Observer Protocol Policy Engine — a wallet-embeddable enforcement layer that evaluates proposed transactions against the `tradingMandate` declared in a signed `ObserverDelegationCredential` and emits a verifiable `PolicyEvaluationCredential` recording the decision.

## Quick links

- **Spec:** [AIP v0.8 draft 1](https://github.com/observer-protocol/aip/blob/main/aip-v0.8-draft-1.md) — the authoritative source for `tradingMandate` extensions and `PolicyEvaluationCredential`.
- **Integration patterns:** [docs/INTEGRATION.md](./docs/INTEGRATION.md).
- **JSON Schema:** [schema/policy.schema.json](./schema/policy.schema.json).
- **Example policies:** [examples/policy-templates/](./examples/policy-templates/).
- **npm package:** [`@observer-protocol/policy-engine`](https://www.npmjs.com/package/@observer-protocol/policy-engine) — the evaluator itself (MIT), built from [`packages/policy-engine/`](./packages/policy-engine). Credential verification, `eddsa-jcs-2022` proofs, DID resolution, revocation, mandate evaluation.
- **Verify a credential:** `npm install @observer-protocol/policy-engine@rc`, then `verifyCredentialObject(credential, config, Date.now())`. Offline — no API key, no call back to Observer.

## What this is

A policy engine that runs **at the wallet boundary, pre-settlement**. When an agent's delegated wallet (Tether WDK, Aqua/Liquid, OWS, Safe App, …) is about to sign and broadcast a transaction, the engine evaluates the proposed action against the agent's signed delegation credential. The engine answers a single question: *did this proposed action fall within the scope of the cryptographic mandate the agent's principal signed?*

If the answer is no, the transaction is not signed — the key material does not proceed. If the answer is yes, the engine returns a signed `PolicyEvaluationCredential` recording the allow decision, bound to the specific transaction proposal and the specific delegation credential.

## What this is not

- **Not a custodial service.** The engine does not custody keys, route funds, or settle transactions. It evaluates authorization and signs decisions.
- **Not a reputation system.** Counterparty trust is consumed from Observer Protocol attestations (`issuer_class`), not computed here. AT-ARS scoring is a separate concern.
- **Not a single-vendor approach.** The engine is designed to be embedded in any wallet that runs untrusted code on behalf of a principal. Reference integrations exist for several wallets; the protocol is intentionally portable.

## Two integration patterns

See [docs/INTEGRATION.md](./docs/INTEGRATION.md) for the full treatment.

1. **Wallet-embedded** (recommended) — the wallet imports `@observer-protocol/policy-engine` and runs the evaluator in-process, pre-signature. Denial means the wallet's signing routine is never reached. Reference adapters: [WDK](./docs/WDK-INTEGRATION.md), [Aqua/Liquid](./docs/AQUA-INTEGRATION.md), [Safe (planned)](./docs/SAFE-INTEGRATION.md), [OWS (planned)](./docs/OWS-INTEGRATION.md).

   ```ts
   import { enforceMandate } from '@observer-protocol/policy-engine';

   const decision = enforceMandate(
     ctx,                            // PolicyContext
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

v0.8 is published as a draft in the [AIP repository](https://github.com/observer-protocol/aip). This repository holds the schema, the types, the integration guides — **and the runtime**. `packages/policy-engine/` is the source of the published [`@observer-protocol/policy-engine`](https://www.npmjs.com/package/@observer-protocol/policy-engine) package, including credential verification, `eddsa-jcs-2022` proof checking, DID resolution, revocation, mandate evaluation and the cross-rail ledger, with its test suite.

## Implementation

**The runtime you install is in this repository.** `packages/policy-engine/src/` builds the published package; `src/core/verify.ts`, `src/core/mandate.ts`, `src/core/proof.ts` and their neighbours are the real thing, not interface stubs. Anything that verifies a credential against Observer Protocol can be read here and run from npm.

This README previously said the runtime reference implementation was maintained privately. That was wrong, and it understated what is published — a correction that matters, because the argument for verification being checkable rests on the code being readable.

A separate private repository, `observer-protocol/policy-core-impl`, exists and is not this package. Nothing you need in order to verify a credential lives there.

Other implementations are welcome and encouraged; this repository's spec, schema and interfaces are sufficient to build an interoperable evaluator.

## Adapter support tiers

Seven per-rail adapters build on this engine. **They are not equally supported, and the difference is
not cosmetic.** Each adapter's own README carries its tier at the top; this table is the single place
they are listed together.

| adapter | tier | what backs it |
|---|---|---|
| [`l402-op-authorize`](https://github.com/observer-protocol/l402-op-authorize) | **Proven against a live system, not yet deployable** | In-process consumer in `op-lnd-interceptor`; mainnet existence proof on lnd v0.20.1-beta. No install path yet, and real issuance is the binding constraint. |
| [`x402-op-authorize`](https://github.com/observer-protocol/x402-op-authorize) | Reference implementation | Exercised by our conformance harness. No production consumer found. |
| [`mppx-op-account`](https://github.com/observer-protocol/mppx-op-account) | Reference implementation | Exercised by our conformance harness. No production consumer found. |
| [`wdk-op-policy`](https://github.com/observer-protocol/wdk-op-policy) | Reference implementation | Exercised by our conformance harness. Two declared dependents do not survive contact: one pins a range excluding the published version, the other injects a stand-in and never runs the engine. |
| [`ap2-op-authorize`](https://github.com/observer-protocol/ap2-op-authorize) | Reference implementation | Exercised by our conformance harness; interop-proven against the AP2 reference SDK. **No npm artifact** — publication is blocked by a `file:` dependency on an unpublished package. |
| [`ows-op-policy`](https://github.com/observer-protocol/ows-op-policy) (publishes `ows-op-verify`) | Reference implementation, **no consumer found** | No import found in our estate or on the production host, not even in our harness. Its rail-registry entry is read only by that registry's validator, never by the running server. |
| [`fireblocks-op-authorize`](https://github.com/observer-protocol/fireblocks-op-authorize) | Reference implementation, **no consumer found** | Only its own examples import it. **No npm artifact.** |

**"No consumer found" is an absence with a scope, not an assertion that nobody uses it.** The search
covered the Observer Protocol estate and the production host. An external adopter would be invisible
to us, and both of those adapters target someone else's stack.

**Registry pins are not current versions.** The Observer Protocol API's `rails.registry.json` names
these packages, and every pin in it is behind the published version, some by two minors. Read the
registry as a declaration of which rails exist, never as a statement of what version is current.
Whether it should track publication or deliberately lag is an open decision.

## Contributing

This repository hosts the public specification, the integration surface and the runtime that ships as `@observer-protocol/policy-engine`.

**Contributions welcome:**
- Integration guides for additional wallets — submit a PR adding `docs/{WALLET}-INTEGRATION.md` following the structure of the existing guides.
- Per-rail canonicalisation specs — add `docs/canonicalization/{rail}.md` describing exactly how `proposalHash` is computed for that rail (see [SPEC.md](./docs/SPEC.md)).
- Policy template examples in `examples/policy-templates/` — must validate against `schema/policy.schema.json`.
- TypeScript type improvements in `packages/policy-engine/src/core/types.ts` — keep types 1:1 with AIP v0.8.
- Documentation clarifications — open an issue describing the ambiguity before submitting a PR.

**Not in scope for this repo:**
- Rail-specific transaction decode (`evmtx`, `soltx`, `resolve-transfer`) — those belong to the adapter layer, see `packages/policy-engine/PROVENANCE.md`.
- Wallet-specific bug reports — file those with the wallet vendor; if the bug is in the integration pattern itself, open an issue here.
- Spec changes — those land in the [AIP repository](https://github.com/observer-protocol/aip) as numbered draft revisions.

See the [contribution guide in each wallet integration doc](./docs/) for wallet-specific contribution paths.

## License

This repository's contents are MIT-licensed (`LICENSE`), including the runtime in `packages/policy-engine/`.
