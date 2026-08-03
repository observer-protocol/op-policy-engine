# Aqua / Liquid integration

This guide describes integrating the Policy Engine with Aqua-family wallets transacting on the Liquid network (notably USDT on Liquid). Aqua's native stack makes the **sidecar API** pattern (see [INTEGRATION.md](./INTEGRATION.md)) the natural choice; the embedded TypeScript module is not directly importable into Aqua's native runtime.

## Deployment shape

The Policy Engine runs as a long-running localhost service on the same machine as the Aqua wallet (desktop installer or server-side). Aqua calls it over `http://127.0.0.1:8001/evaluate` before broadcasting any transaction.

```
┌──────────────────────────┐   POST /evaluate    ┌───────────────────┐
│  Aqua wallet (native)    │ ──────────────────→ │  Policy sidecar   │
│  - Compose Liquid tx     │                     │  Node + evaluator │
│  - About to sign         │ ←────────────────── │  localhost:8001   │
│                          │  PolicyEvaluation   │                   │
│  If allow → sign + send  │  Credential (JSON)  │                   │
│  If deny  → DO NOT SIGN  │                     │                   │
└──────────────────────────┘                     └───────────────────┘
```

The sidecar systemd unit is not published. The evaluator it runs is `@observer-protocol/policy-engine`, built from this repository.

## Pre-settlement call

Aqua calls the sidecar with:

```json
POST /evaluate
Content-Type: application/json

{
  "proposal": {
    "rail": "liquid",
    "canonicalBytes": "<hex of Liquid tx pre-sign serialisation>",
    "humanReadable": {
      "from": "<liquid address>",
      "to": "<liquid address>",
      "amount": "5000.00",
      "asset": "USDT-Liquid"
    }
  },
  "delegationCredential": { /* signed ObserverDelegationCredential */ },
  "attestations": [ /* optional pre-fetched counterparty attestations */ ]
}
```

Response is a signed `PolicyEvaluationCredential` (same shape as for any other rail).

## Liquid-specific canonicalisation

The `proposalHash` is the SHA-256 of the canonical Liquid pre-sign bytes. Use the standard Elements (Liquid) transaction serialisation from libwally / elements-cpp; do not reimplement.

The reference implementation publishes the exact serialisation at `https://docs.observerprotocol.org/policy/canonicalization/liquid`.

## Allowlist DID resolution for Liquid counterparties

When a delegation's `tradingMandate.counterparty.allowList` carries DID entries, the engine resolves each DID to its Liquid-rail wallet binding via the Observer Protocol wallet-binding registry. Per the engine's fail-closed rule on `allowList`, DIDs that cannot be resolved (no Liquid-rail binding for that DID) are treated as not-on-the-list and the action is denied.

Raw Liquid address entries in `allowList` evaluate directly without registry lookup.

## Trust-data integration

USDT-on-Liquid counterparties may or may not have OP attestations. The `evaluatedWithAttestations: false` flag in the returned credential signals which evaluations were attestation-bare. For Aqua deployments where attestation enrichment is desired, deploy the engine alongside an OP attestation-fetch service or supply the `attestations` field pre-fetched.

## When the sidecar is unavailable

If `http://127.0.0.1:8001/evaluate` returns a non-2xx response or fails to respond, Aqua MUST treat the result as **deny**. Pre-settlement enforcement is fail-closed; a missing decision is not the same as a positive decision.

A healthcheck endpoint (`GET /health`) is provided so Aqua can pre-flight the sidecar's availability and surface degraded state to the user before they attempt to compose a transaction.

## Reference deployment

For desktop Aqua, the sidecar can ship as a bundled Node binary launched alongside the wallet. For server-side / hosted Aqua deployments, the sidecar runs as a separate systemd unit on the same host. The evaluator it runs is `@observer-protocol/policy-engine`, built from [`packages/policy-engine/`](../packages/policy-engine) in this repository. Deployment manifests and healthcheck wiring are not published.
