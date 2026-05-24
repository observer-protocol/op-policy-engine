# Integration patterns

The Policy Engine supports two integration patterns. Both produce identical `PolicyEvaluationCredential` outputs. The choice is purely a deployment-shape concern.

## Pattern 1: Wallet-embedded (recommended)

The wallet imports the engine as a library and runs the evaluator **in-process, before any signature** over the underlying transaction. If the engine denies, the wallet's signing routine is not reached — the key material doesn't proceed.

```
┌────────────────────────────────────────────────────────────┐
│                       Wallet process                       │
│                                                            │
│   user / agent → propose transaction                       │
│                       ↓                                    │
│   import { evaluate } from '@observer-protocol/policy-core'│
│   const decision = await evaluate({                        │
│     proposal, delegationCredential, attestations? })       │
│                       ↓                                    │
│   if (decision.allowed) → wallet signs + broadcasts        │
│   else                  → wallet does NOT sign;            │
│                           surfaces decision.denyReason     │
└────────────────────────────────────────────────────────────┘
```

The engine is a synchronous (~50–100ms) function call. It returns a signed `PolicyEvaluationCredential` regardless of decision; the wallet stores or forwards that credential alongside its audit log.

When to choose:
- TypeScript/JavaScript is in the wallet's stack (most modern wallets).
- "Key never touched on deny" is a load-bearing security claim.
- The wallet wants to surface the decision credential to the user / counterparty / auditor without an extra network call.

Wallet-specific guides:
- [WDK (Tether) — npm-embedded](./WDK-INTEGRATION.md)
- [Aqua / Liquid — native bindings or sidecar](./AQUA-INTEGRATION.md)
- [Safe App — planned](./SAFE-INTEGRATION.md)
- [Open Wallet Standard — planned](./OWS-INTEGRATION.md)

## Pattern 2: Sidecar API

A long-running Node process exposes the engine over localhost HTTP. The wallet (in any language) posts a transaction proposal + the delegation credential and receives the signed decision.

```
┌──────────────────────────┐   POST /evaluate    ┌───────────────────┐
│   Wallet process         │  ─────────────────→ │ Policy sidecar    │
│   (native / Python / Go) │                     │ localhost:8001    │
│                          │  ←───────────────── │ Node + evaluator  │
│                          │  PolicyEvaluation   │                   │
└──────────────────────────┘  Credential (JSON)  └───────────────────┘
```

When to choose:
- Wallet stack is native / non-JS (C++, Rust, Go, Python).
- Multiple wallet processes on the same host want to share one evaluator instance.
- The wallet treats the evaluator as an external dependency on principle.

Trade-offs vs. embedded:
- Adds ~5ms localhost-HTTP overhead per call.
- Adds one service to monitor (systemd + healthcheck recommended; see [policy-core-impl/systemd](https://github.com/observer-protocol/policy-core-impl)).
- "Key never touched" still holds at the wallet — the wallet must still not sign on deny.

## Wire format (both patterns)

### Input

A transaction proposal + the delegation credential + optional fetched attestation context.

```json
{
  "proposal": {
    "rail": "ethereum-mainnet",
    "canonicalBytes": "<hex of the rail-native pre-sign bytes>",
    "humanReadable": {
      "to": "0x...",
      "value": "1234500000000000000",
      "data": "0x..."
    }
  },
  "delegationCredential": { /* signed ObserverDelegationCredential */ },
  "attestations": [
    /* optional — pre-fetched counterparty attestations the engine
       can use without making its own network calls */
  ]
}
```

`humanReadable` is informative; the engine canonicalises the proposal from `canonicalBytes` and hashes that.

### Output

A `PolicyEvaluationCredential`. Same shape regardless of integration pattern. See [SPEC.md](./SPEC.md) and the [TypeScript types](../packages/policy-interface/src/types.ts).

## On the "single source of truth" claim

Both integration patterns are backed by the same evaluator code (the `policy-core` package). Different deployment shapes, identical logic, identical signed output. There is no embedded-mode vs sidecar-mode behavioural drift.
