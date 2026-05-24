# Specification

The Policy Engine's wire format is defined in **AIP v0.8 draft 1**:

> https://github.com/observer-protocol/aip/blob/main/aip-v0.8-draft-1.md

That document is normative. This page summarises what an integrator needs to know to consume the engine.

## Two artifacts

### 1. The `tradingMandate` sub-object on `ObserverDelegationCredential`

The cryptographically-bound scope of authority. Lives at `credentialSubject.tradingMandate` inside a signed `ObserverDelegationCredential` (v0.6/v0.7/v0.8). Carries all rules the engine evaluates against:

- **v0.7 core:** `allowedVenues`, `allowedInstruments`, `maxNotionalPerOrder`, `maxPosition`, `unit`, `dailyDrawdownCap`.
- **v0.8 extensions:** `counterparty` (`allowList`, `blockList`, `requireIssuerClassIn`), `temporal` (`allowedTimeWindows`), `geographic` (`blockedJurisdictions`, `allowedJurisdictionsOnly`), `velocity` (`dailyVolumeCap`, `monthlyVolumeCap`).

Because the mandate lives inside the signed credential, **changing scope requires re-issuing the credential** — there is no mutable side-channel policy store the engine consults. The credential is the policy.

JSON Schema: [schema/policy.schema.json](../schema/policy.schema.json) — standalone schema for validating a `tradingMandate` object outside the credential envelope (useful when authoring policies before signing).

### 2. `PolicyEvaluationCredential`

A new Verifiable Credential type recording the engine's decision. One per evaluation. Bound to the specific transaction proposal and the specific delegation it was evaluated against.

Key fields in `credentialSubject`:

- `decision`: `"allow"` or `"deny"`.
- `denyReason` (required on deny): `{ ruleType, ruleField, message, currentValue?, proposedValue? }`.
- `evaluatedAgainst.delegationCredentialId` / `delegationCredentialHash` — binds the decision to a specific delegation credential (by id and by SHA-256 of its canonical bytes).
- `proposal.proposalHash` / `proposal.rail` — binds the decision to a specific proposed action via the SHA-256 of its rail-native canonical pre-sign bytes.
- `evaluator.id` / `evaluator.version` — software/version of the engine instance.
- `evaluatedAt` — ISO 8601 timestamp.
- `evaluatedWithAttestations` — whether OP attestation data was available (false → attestation-dependent rules were skipped per fail modes in v0.8 §2.3).

The credential is signed `Ed25519Signature2026`. Observer Protocol's reference implementation signs with `did:web:observerprotocol.org#key-3` — an `assertionMethod`-valid on-server key scoped exclusively to this credential type. Other implementations sign with their own `assertionMethod`-valid keys.

## Fail-mode rules

The engine is **fail-closed by default for explicit allow-lists**, **fail-open for blocks against unverifiable data**. Specifically:

- `counterparty.allowList` (closed list): if counterparty cannot be resolved/verified, **deny**.
- `counterparty.blockList` (closed list of denied entities): if counterparty cannot be resolved/verified, **continue** (skip rule).
- `counterparty.requireIssuerClassIn`: if attestation unavailable → skip rule, log `evaluatedWithAttestations: false`.
- `geographic.blockedJurisdictions`: if jurisdiction unknown → skip rule (fail-open).
- `geographic.allowedJurisdictionsOnly`: if jurisdiction unknown → **deny** (fail-closed).
- `temporal.allowedTimeWindows`: evaluated against the verifier's local clock in the window's stated IANA timezone.
- `velocity.*Cap`: stateful. Wallet-embedded evaluators without persistent state SHOULD skip; server-side enforcement is authoritative.

See v0.8 §2 for the normative statement.

## Rail-specific canonicalisation

The `proposalHash` field in a `PolicyEvaluationCredential` is the SHA-256 of the canonical pre-sign bytes of the proposed action on a specific rail. **Each implementation MUST publish a canonicalisation specification per rail.** Observer Protocol's reference implementation publishes its rules at:

> `https://docs.observerprotocol.org/policy/canonicalization/{rail}`

Per-rail canonicalisation rules will be added to this repository (`docs/canonicalization/<rail>.md`) as they stabilise. For now, the implementation guides ([WDK](./WDK-INTEGRATION.md), [Aqua](./AQUA-INTEGRATION.md)) carry the per-rail details inline.

## What's not in v0.8

- Cross-rail aggregate state (a single velocity counter spanning EVM + TRON).
- AT-ARS reputation thresholds as a policy rule (`requireAtArsMinimum`).
- Multi-party policy approval workflows.
- Hot-swappable policies (the credential is the policy; rotation = re-issue).

These are explicitly out of scope for v0.8 and are not supported by this engine.
