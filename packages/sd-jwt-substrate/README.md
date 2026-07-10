# @observer-protocol/sd-jwt-substrate

The shared SD-JWT substrate for external mandate formats — RFC 9901 serialization, ES256/P-256, `_sd_alg` sha-256, RFC 7800 `cnf` key binding. Built for the AP2 profile; Verifiable Intent reuses the same primitives. Thin, fail-closed wrappers over the OpenWallet Foundation `@sd-jwt/*` libraries — the audited code does the format work, this package pins the profile and turns every failure into a reason.

## Two dialects, deliberately

**SD-JWT VC profile** (`issueSdJwtVc` / `presentSdJwtVc` / `verifySdJwtVc`) — flat credentials with top-level `iss` + `vct`, issuer trust resolved by a caller-supplied `resolveIssuerJwk(iss, kid)` callback (the trust decision is never the substrate's), optional KB-JWT with exact `aud`/`nonce` matching.

**AP2 reference-SDK envelope** (`issueAp2MandateToken` / `verifyAp2MandateToken`) — the wire shape the AP2 reference SDK actually speaks, which is not a flat SD-JWT-VC: mandate claims ride inside a `delegate_payload` array (one RFC 9901 array-element disclosure per entry), no top-level `iss`, no `typ` header, issuer key handed to the verifier out-of-band. Discovered against the SDK source, not the prose spec.

## Interop is proven, not assumed

`test/roundtrip-ap2.test.mjs` round-trips against the AP2 reference SDK's Python `MandateClient`, both directions: a mandate this package issues verifies in their SDK (including their pydantic model validation of the mandate fields), and a mandate their SDK creates verifies here (with the wrong-issuer-key fail side). The gate needs a local oracle:

```
python3 -m venv ap2-venv && ap2-venv/bin/pip install jwcrypto pydantic cryptography sd-jwt
git clone --depth 1 https://github.com/google-agentic-commerce/AP2.git ap2-ref
AP2_PY=ap2-venv/bin/python AP2_SDK_PATH=ap2-ref/code/sdk/python npm test
```

Without the env the two interop tests skip loudly; the other nine run hermetically.

## Stricter than the library where the RFC is strict

The underlying library silently drops a disclosure whose digest matches nothing (the forged value never lands, but verification succeeds with the claim absent). RFC 9901 says an unreferenced disclosure MUST reject. This package enforces the MUST: any disclosure not referenced by a digest — in the payload or inside another disclosed value — rejects with `token tampered or malformed`.

## Fail-closed inventory (each is a test)

Wrong holder key on the KB-JWT · wrong `aud` · wrong `nonce` (replay) · tampered disclosure · untrusted issuer (resolver refuses) · wrong issuer key · expired token · `vct` mismatch · non-ES256 `alg` (rejected before the trust resolver is consulted).

## Scope

Root tokens. `~~`-joined delegation chains (the AP2 multi-hop KB-SD-JWT model) are a later layer and `verifyAp2MandateToken` rejects them explicitly rather than half-verifying.
