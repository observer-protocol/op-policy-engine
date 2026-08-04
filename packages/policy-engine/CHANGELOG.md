# Changelog

All notable changes to `@observer-protocol/policy-engine`.

## 1.0.0-rc.3

**Decision attestation moves into this package.** Issuing and verifying a decision attestation was
previously reachable only from `op-mcp-payment-server`, which is `"private": true` and unpublished, so
a consumer who wanted to attest DECISIONS rather than payments needed a private service present to
reach a builder and a verifier they would never otherwise run. Both are pure over injected primitives
and never required that service.

**Still an rc, and the label is deliberate.** Three named gaps remain in this direction: `did:web`
deciders are refused so an organisation cannot be named as the decider, no published schema can
require an attestation, and `vocabularyRef.source: 'op-starter-set'` is declared but refused because no
starter vocabulary is published. See the README, which states all three.

### What a decision-only consumer can now do that they could not

Install this package, bring their own signing key, and **issue and verify a decision attestation end to
end with no Observer service present and no network call.** Previously neither half was reachable: the
builder and the verifier both lived behind a private package. Verification was already standalone for
*credentials* via `verifyCredentialObject`; it was not for *attestations*.

### Added

- `issueDecisionAttestation`, `verifyDecisionAttestation`, `acceptDecisionAttestation`
- `checkDecisionRefs`, `checkDeciderArtifactRef` — the same well-formedness checks issuance runs, so a
  verifier can refuse a malformed claim carrying a good signature
- `assertNoObservation`, `ObservationRefused`, `FORBIDDEN_ATTESTATION_FIELDS`, `ATTESTATION_ESTABLISHES`
- Types: `DecisionAttestation`, `PolicyRef`, `VocabularyRef`, `DeciderArtifactRef`, `AttestedAmount`,
  `AttestationCitation`, `AttestationAssurance`, `AttestationSigner`, `IssueResult`,
  `AttestationState`, `AttestationBlock`, `VerifierCapabilities`, `AcceptResult`
- **`ed25519Verify`** — raw ed25519 over bytes, distinct from `verifyEddsaJcs2022`, which verifies a
  proof object on a credential. It existed in this package and was not exported, so a consumer had to
  hand-roll SPKI wrapping over `node:crypto` to check an attestation. It carries a 32-byte key length
  guard: a wrong-length key throws rather than returning a bad-signature result, because a false
  negative there is indistinguishable from a forgery.

### Deliberately NOT exported

The restricted canonicaliser that decision attestations sign through. This package now holds two
canonicalisers, and they produce identical bytes over the attestation domain **only because every
attestation field is a string** — measured across seven cases including unicode, absent optionals,
nested key reordering and arrays. A number entering that type diverges them silently and
asymmetrically: `jcsBytes` serialises it, the restricted one throws. Leaving it unexported means there
is no surface on which a caller can pick the wrong one and sign bytes no other implementation
reproduces. `jcsBytes` remains the public canonicaliser.

### Fixed

- `credentialStatus` given as a single object rather than an array is now checked rather than skipped
  on the `verifyCredentialCrypto` path. `.length` on an object is `undefined` and `undefined > 0` is
  false, so the revocation branch never ran: a revoked credential verified as valid, silently, in the
  direction that grants authority. Demonstrated against a real issued-and-revoked credential before and
  after. `verifyCredentialObject` was never affected — its structure gate rejects the object form — and
  still does, so the array remains canonical. A `credentialStatus` that is neither array nor object now
  refuses with a stated reason.

### Known limits

`KNOWN-LIMITS.md` now ships in the package. It records that a status list hosted on a different origin
from its issuer is refused until allowlisted — including Observer's own clause-zero revocation demo,
with the exact `statusListOriginAllowlist` value it needs — and that a `did:key` decider proves a key
signed rather than that an organisation decided.

## 1.0.0-rc.2

First publish since 0.4.0. `1.0.0-rc.1` was tagged in-tree but never published, so everything
it contained ships here.

### Package contents — the reason for this release

A README and a LICENSE file are now included in the published tarball. Until now the npm page
for this package was blank: the `license` metadata field said MIT but no licence text shipped,
and there was no README at all. That page is where integrators land first.

Also added: `examples/verify-a-credential/`, a runnable example that verifies a real published
credential against the live schemas and cross-checks the hosted verifier. It is pointed at a
credential that **denies**, deliberately — an example that only prints success demonstrates
neither what a failure looks like nor that the check does anything.

### Why this is a release candidate and not 1.0.0

`actionScope.escalationThreshold` and the approver vocabulary exist in this build and nothing
in production resolves them. The deployed engine is still 0.4.0. Separately, an inlined copy of
this engine moves 0.3.0 → 1.0.0-rc.1 inside a sidecar bundle when a downstream change ships,
because a `file:` dependency carries no version to pin — a major version change riding
invisibly into a deployed artifact. Cutting 1.0.0 would announce a stability that has not been
established.

### Since 0.4.0

- `actionScope.escalationThreshold` registered and evaluated as a third state, distinct from
  allow and deny, refusing at the old location rather than noting it
- `requiredPurchaseTerms` enforced, closing the gap between a declared field and a control
- counterparty entries are typed `{kind, value}` with an open kind vocabulary; unrecognised
  kinds deny, and the ledger records identities only, never classes
- structured denials: the denial tag is a value reaching the caller, with headroom
- `monthlyVolumeCap` gets a monthly counter; the config parser no longer defaults typos
- vocabulary additions: payor-adjudication, and `cancellationAuthority` absence in pre-v2.5
  credentials treated as absence rather than refusal
- single-writer guard keyed on the file's own append order rather than a wall clock
- origin pin gains a configured escape hatch, because the strict form made a real deployment
  impossible

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

- **Origin pin, before the fetch.** A `statusListCredential` URL is dereferenced only when it
  is same-origin with a `did:web` issuer's own domain, **or** its origin appears in
  `config.statusListOriginAllowlist`. That list is **empty by default**, so the default posture
  is same-origin only, and a `did:key` issuer (which carries no origin to pin against) permits
  nothing until configured.

  The allowlist exists because a strict pin made a legitimate deployment impossible: a
  `did:web` issuer serving its status list from a CDN or object store is the normal way to
  serve a static file at scale, and a control with no escape hatch for it is over-refusal
  rather than security. An operator-listed origin also satisfies the URL guard's address-class
  check, and only that check: the scheme test still applies and every redirect hop is still
  re-validated, so a sanctioned origin cannot redirect into an unsanctioned private one. Once
  the operator has named an origin, a credential can only choose among destinations already
  sanctioned, which is the whole of the anti-SSRF property.

  **Intended successor, recorded so the allowlist is understood as a bridge:** the permitted
  off-origin location is the issuer's business, not the verifier operator's. A service entry in
  the issuer's DID document, which the verifier already resolves, would carry it over a channel
  the issuer controls cryptographically, with no operator configuration and no list that grows
  with every issuer. `did:key` would still need the allowlist. That is a normative addition for
  a spec revision.
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
