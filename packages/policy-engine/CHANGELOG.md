# Changelog

All notable changes to `@observer-protocol/policy-engine`.

## 0.4.0

### Security — outbound fetch guard (behavior narrowing)

**`credentialStatus[].statusListCredential` is chosen by whoever signs the credential,
and every verifier that reads the credential dials it.** Until this release that URL went
into `fetch()` with `redirect: 'follow'` and no validation of any kind: no scheme check,
no address-class check, no per-hop redirect check. The check that catches a hostile status
list is issuer equality, and it reads the **response body**, so it could reject what came
back and could not prevent the request.

Scope, stated rather than inflated: a credential must be signed by the pinned issuer to
reach this code, because `validateStructure` rejects a foreign issuer first. So this is
not "anyone can point the engine anywhere". It is a confused deputy: a credential from a
trusted issuer selects an arbitrary URL that every verifier will dial, which matters most
inside a hosted multi-tenant verifier whose issuer allowlist has more than one entry.

Two controls, both fail-closed:

- **Origin pin, before the fetch.** For a `did:web` issuer, `statusListCredential` must be
  same-origin with the issuer's own domain, checked before any request is made. A `did:key`
  issuer carries no origin, so those fall through to the guard alone; that is the honest
  limit of pinning to an identity with no domain.
- **URL guard on every outbound dereference** (`src/core/url-guard.ts`, exported): http(s)
  only; refuses loopback, RFC1918, CGNAT, link-local (including cloud metadata), ULA,
  multicast, reserved, documentation and NAT64 ranges, as literals and as DNS answers,
  including IPv4-mapped IPv6 forms; follows redirects manually and re-checks **every hop**;
  refuses an https-to-http downgrade; caps hops.

**Known residual, deliberately written down:** the guard resolves a hostname and validates
the answers, then hands the URL to `fetch()`, which resolves again. A DNS-rebinding name is
not closed by this. Closing it needs a connection-pinned lookup, which needs a dispatcher,
which needs a runtime dependency this package deliberately does not have. Do not describe
this as DNS pinning.

### Changed — `did:web` resolution is https-only (behavior narrowing)

`did:web:localhost` and `did:web:127.0.0.1` previously resolved over plain **http**. That
was a spec-sanctioned development affordance and it put an unencrypted loopback dial one
credential away from an engine that also dereferences credential-supplied URLs. The guard
refuses loopback regardless, so the downgrade bought nothing. Local development uses
`config.offline.didDocumentPath`, which needs no network at all.

### Added

- `guardedFetch`, `assertFetchableUrl`, `blockedAddressReason`, `didWebOrigin`,
  `ObserverUrlRefusedError` exported, so adapters and hosted verifiers apply the same
  refusal set rather than each inventing one.
- `KNOWN_SCOPE_KEYS`, `KNOWN_TM_KEYS`, `DECLARED_UNENFORCEABLE` exported as data
  (`src/core/vocabulary.ts`), so a schema-versus-engine conformance check can diff the
  published delegation schemas against what the engine actually recognizes.

### Changed — declared-unenforceable denials are legible (no verdict change)

A property the published schemas **accept** but no engine enforces now denies as
`[unenforceable]`, naming the reason, instead of falling through `[unknown-rule]`. Applies
to `actionScope.allowed_counterparty_types` (accepted by schemas v2.1/v2.3/v2.4, recommended
by AIP v0.8 §1.3, enforced by nothing) and to `spending_limits.per_asset`. **Same verdict as
before.** An issuer who writes a schema-valid field is now told which of the two happened.

## 0.3.0

### Changed — fail-closed by default (behavior narrowing)

- The mandate evaluator now **denies** delegation credentials whose mandate shape it
  does not recognize. Previous versions (0.2.0 and earlier) silently **allowed** them
  (fail-open by omission). **If you relied on the prior behavior, you were relying on a
  bug.** An unrecognized `credentialSubject.delegation` container, a `per_asset` cap
  (out of scope for this engine), an unenforceable transfer, or a missing cap all now
  deny rather than pass.

### Added

- Reads and enforces `credentialSubject.delegation.scope.spending_limits.per_rail`
  (per-transaction and per-day caps, same-currency, no FX) — the shape Sovereign
  `/delegate` issues.

_0.x minor bump carries the fail-closed signal. No shim: there are no known consumers._
