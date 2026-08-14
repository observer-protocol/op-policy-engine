# Changelog

All notable changes to `@observer-protocol/policy-engine`.

## 1.0.0-rc.15

**Type-only. One type added, one field retyped, no runtime behaviour changed and nothing removed.**

### A signer's claim is typed with a claim vocabulary

`ClaimedKeyCustody` is added and exported. `ResolutionActor.assurance` was typed `RequiredKeyCustody`
through rc.13 and rc.14, which is the vocabulary of what a credential MAY DEMAND, on a field
recording what the signing party SAID when they signed.

**The requirement type is not widened.** `REQUIRED_KEY_CUSTODY` stays at its three members and keeps
mirroring the served schema. The fourth value, `approver-held`, is claimable and designatable by no
published schema version, so it lives on the claim side. A signer can claim a custody level no
mandate could have required, and that mismatch is evidence a reader must be able to see. Typing the
claim with the requirement vocabulary made it unrepresentable, which is a check that cannot fail
because the shape prevents it.

**No runtime array for the claim side, and the asymmetry with `REQUIRED_KEY_CUSTODY` is deliberate.**
That array exists so a counterparty can check a designation against a closed set. Nothing checks a
claim against a set: `resolutionPayload` requires only a non-empty string, and a claim outside the
vocabulary is a fact about the signer rather than a validation failure. Exporting values would invite
a membership check that refuses exactly the records worth looking at.

### Fixed

- A note in `core/records/types.ts` said this type "must not type a signer's claim, and
  `resolution.ts` does not export a custody type for that reason". True and irrelevant:
  `resolution.ts` did not EXPORT one, it USED one. **rc.14 shipped the rule and its violation in the
  same release, inside the note written to prevent it.** A note wrong on arrival is worse than no
  note, because it answers "was this considered?" with yes.

### What this release did not carry

No test changed. The release is a type swap plus a new type and its notes, and the types are erased
at runtime, so there is no runtime behaviour any suite could assert against. **No compile-time
witness was added either**, so the property that a claim is typed by the claim vocabulary is held by
the declaration alone and not by anything that would fail if it were reverted. Recorded rather than
left for someone to notice.

## 1.0.0-rc.14

**BREAKING FOR ANYONE ON rc.13. Three published names are renamed, and rc.13 is the release that
published them.** Nothing signed changes, and no member of the vocabulary changes.

| rc.13 | rc.14 |
|---|---|
| `ApproverKeyAssurance` (type) | `RequiredKeyCustody` |
| `APPROVER_KEY_ASSURANCE` | `REQUIRED_KEY_CUSTODY` |
| `APPROVER_KEY_ASSURANCE_SCHEMA_VERSION` | `REQUIRED_KEY_CUSTODY_SCHEMA_VERSION` |

**Neither this nor the payment server's field is assurance, and the word asserts something neither
carries.** This one is a REQUIREMENT: a principal states in advance what custody a key must be under
before its holder may approve. A constraint has been stated; nothing has been checked. The subject of
both is key custody.

The word was also already taken. `assurance` has a fixed meaning in AI-safety and regulator-facing
work, and Arbis is named as runtime assurance partner on Cambridge, so reusing it here creates
ambiguity where precision is the product.

**Renamed hours after rc.13 published the name, with zero adopters outside the estate.** The cost of
renaming a published symbol will never be lower than the day it shipped, and it rises monotonically
after.

**The wire field stays `assurance` inside signed credentials.** Renaming it is a schema version and
is deferred. Three members are unchanged and still mirror the served schema, measured from the
published bytes: v2.5 serves two, v2.7 serves three.

**The three-versus-four is not drift**, and the reason is written at the type: a requirement is set
before the fact by the party granting authority, a claim is made at the time of the act by the party
exercising it, and the mismatch between them is evidence. One type covering both would make a claimed
custody no mandate could require unrepresentable. See rc.15, where that is exactly what had happened.

## 1.0.0-rc.13

**Additive only. Two value exports, two types, nothing removed and no behaviour changed.**

### `resolutionPayload` is published, reversing the rc.9 withdrawal

`resolutionPayload` and `RESOLUTION_PAYLOAD_TYPE`, plus the types `SignableResolution` and
`ResolutionActor`.

rc.8 exported it and rc.9 withdrew it on two objections. Both are answered rather than reverted, and
`index.ts` keeps the withdrawal note intact rather than deleting it:

- **Adjacency** was a fair charge and no longer applies. It is here on its own subject: this package
  publishes the payload constructors a counterparty must rebuild without us, and an approval is the
  one artifact in the estate that turns on a person's judgement. Refusal, lapse and verdict rebuild
  offline; approval and denial did not, **so the record a human is accountable for was the one nobody
  outside could check.**
- **A colliding type made permanent** was real, and is answered by this package's own later decision.
  Since rc.9 it exports the approver custody vocabulary as a named type plus runtime values and its
  schema version, precisely so a counterparty can check that field. The actor is typed against that
  export, so no second meaning of `assurance` enters. (Those three names are renamed one release
  later; see rc.14.)

**A move, not a rewrite.** The body is byte-for-byte the payment server's. The type string is copied
verbatim as `op.approval.resolution.v1` and deliberately NOT renamed to this package's
`op.enforcement.*` convention: **that field is inside the canonicalised bytes, and the tidier name
would have invalidated every approval ever signed.** A move must not tidy the thing it moves.

Cherry-picked onto main rather than cut from the branch it was written on, so an unrelated verdict
payload change did not ride along. A change to a signed payload travels on its own decision.

### The test that pinned the old ruling was inverted, not deleted

`test/public-exports.mjs` asserted the rc.9 ruling that `resolutionPayload` must stay absent. **That
assertion failed when the ruling changed, which is what it is for.** It is inverted and strengthened
rather than removed: the rc.9 objection was that a second meaning of `assurance` would enter the
surface, so it now asserts the type string is the payment server's `op.approval.resolution.v1` and
not renamed, that one custody vocabulary remains the only one exported, and that the constructor
refuses to build a payload with no actor. A reachable constructor that silently accepted one would be
worse than an absent one.

## 1.0.0-rc.12

**A DEFECT IN rc.11. Two refusals were lost when the verdict payload moved, and rc.11 is weaker than the
implementation it replaced. Anyone on rc.11 should move.**

`evaluationVerdictPayload` was missing two guards the `op-mcp-payment-server` original had:

- **A `denialDetail` on a non-deny is refused.** An escalate breached nothing and a release breached
  nothing, so a signed bound on either asserts a comparison that did not happen. Same class as v2 signing
  `breachedConstraint` on an escalate, which is why v3 exists.
- **A present `denialDetail` field that is not a string is refused BY NAME.** The canonicaliser would
  refuse a number one layer down and report a type; this reports which bound.

### How it got through, which is the part worth keeping

rc.11's parity was verified by comparing BYTES across three canonicalisers over real driven records, and
they were identical. **Byte parity over valid inputs cannot detect a lost refusal.** Both guards are
about what the function REJECTS, and nothing in an output comparison reaches them.

They were caught by `op-mcp-payment-server`'s own suite the moment it imported this function — the
downstream control `test/public-exports.mjs` describes as the strong one, doing exactly what that comment
says it would. Both are now asserted here, so the next move of this construction cannot lose them the
same way.

## 1.0.0-rc.11

**Additive only. Two new value exports, two new types, nothing removed and no behaviour changed.**

### The evaluation verdict payload is exported

`evaluationVerdictPayload`, `EVALUATION_VERDICT_PAYLOAD_TYPE`, and the types
`SignableEvaluationVerdict` and `SignedDenialDetail`.

A counterparty could already rebuild the bytes a REFUSAL was signed over, since `refusalPayload` moved
here at rc.8, and could not rebuild a verdict's. **A verdict exists for every payment while a refusal
exists only for stopped ones**, so this is the larger half of the same gap.

**The rc.9 withdrawal of `resolutionPayload` was answered rather than routed around.** Its four
objections, each taken separately: adjacency does not apply, because this package computes the decision
and a verdict is that decision signed; no payment-server concept travels, because the payload is
thirteen strings and one nested object of four optional strings; the canonicaliser question was measured
rather than argued, with this package's two canonicalisers and the payment server's producing identical
461 bytes for the worst-case deny.

**The fourth objection was real and is why the names are what they are.** This package already exports
`DenialDetail` (eight members, including a vocabulary `tag` and a boolean `terminal`) and `Verdict` (the
decision AS COMPUTED, with `allow: boolean`). Exported under their original names, the verdict's
four-string signed detail and its payload type would have put two `denialDetail` shapes and two verdict
concepts on one imported surface, with nothing saying which one a signature covers. So they are
`SignedDenialDetail` and `SignableEvaluationVerdict`, each stating what it is not, on the
`ApproverKeyAssurance` precedent this surface already set.

**`resolutionPayload` remains withdrawn**, and its absence is now asserted by a test rather than left as
an omission.

### The parity condition is enforced by the compiler

The three canonicalisers agree only because every signed field is a string. `_PARITY_OBLIGATION` in
`core/records/verdict.ts` fails to COMPILE if a non-string field enters the payload, and the error names
the offending field. A note could not enforce that, and the failure it guards against breaks no test: it
would make every already-stored signature unverifiable by the exported function while both sides looked
correct.

### Fixed

- `test/public-exports.mjs` did not cover the payload builders at all. `refusalPayload` moved here at
  rc.8 so counterparties could rebuild bytes, and its reachability was asserted nowhere. All five
  builders and all three domain separators are now checked, with the separator VALUES pinned rather than
  their names, because a changed value invalidates every signature already written over it.

## 1.0.0-rc.4

**Why this release exists.** `attestation.ts` has existed in TWO copies, here and in
`op-mcp-payment-server`, differing by exactly one line (an import path) and staying identical only
because someone mirrored every change by hand. Three hand-mirrors in two days. The cost is not
hypothetical: the duplicate stayed importable, and an EU261 harness imported *published* issuance
while verifying with the *local* copy, turning two correct refusals into silent passes. This release
is the publish half so the duplicate can be deleted.

**And the hand-mirror cost is visible inside this release.** `checkPaymentBinding` arrived here with
the counterparty and rail mirror and the entry point was never updated, so it was defined, correct,
and covered by tests in the *other* copy while being unreachable by any consumer. Nothing failed,
because nothing asserted the surface.

### BREAKING

- **`DecisionAttestation` now REQUIRES `counterparty: string` and `rail: string`.** An attestation
  that names neither the party paid nor the rail it is paid over constrains nothing that a payment
  can be checked against, so the binding surface must exist before it can ever be compared.
  Issuance refuses a missing or empty value via `checkPaymentBinding`.
- **The refusal is at ISSUANCE and deliberately NOT at verification.** A verifier receiving an older
  attestation without these fields does not newly reject it; the asymmetry is intentional, so this
  breaks producers rather than invalidating artifacts already issued.

### Added

- **`checkPaymentBinding`** is now exported. Its absence was an accident rather than a decision:
  compare `canonicalise`, which is withheld deliberately and says so with its reason.
- `test/public-exports.mjs` now asserts the **decision-attestation surface by name** from the built
  entry point, with a discriminating negative case so the loop cannot pass vacuously. It is a
  hand-written list and therefore the weak kind of control; the strong one is downstream, where
  `op-mcp-payment-server` imports these from the package and has deleted its own copy, so its build
  fails if any of them stops being exported.

### Changed

- **Verification declines any `assurance` above `self-declared` as `cited-unresolvable`** rather than
  attesting it. Nothing about the document failed a check: the check cannot be RUN, and
  `cited-invalid` is reserved for hostility. An **absent** `assurance` still verifies, because
  silence is not a claim.

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
