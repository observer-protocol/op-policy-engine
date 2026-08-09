# Known limits — @observer-protocol/policy-engine

## A status list on a different origin from its issuer refuses by default, and Observer's own published revocation demo is such a pair

`credentialStatus[].statusListCredential` is a URL chosen by whoever signed the credential. Before
any request is made, the verifier requires that URL's origin to be either the pinned `did:web`
issuer's own origin or an entry in `config.statusListOriginAllowlist`. The allowlist is **empty by
default and therefore refuses**. The refusal is deliberate: a credential from a trusted issuer that
names an arbitrary URL every verifier will then dial is a confused deputy, and the check that catches
a hostile list reads the response body, so on its own it can reject what came back but cannot prevent
the dial.

**Observer Protocol's own clause-zero demo is a cross-origin pair.** Measured against production on
2026-08-04:

| | |
|---|---|
| credential issuer | `did:web:bitcoinsingularity.ai`, so the pinned origin is `https://bitcoinsingularity.ai` |
| `statusListCredential` | `https://api.observerprotocol.org/api/v1/demo/clause-zero/status-list` |

Those origins differ, so **every clause-zero credential fails closed at the origin pin unless the
allowlist carries that origin.** The failure is a denial with
`[revocation] status could not be established`, not an allow, so nothing is let through. But the
practical consequence is that the published revocation demonstration cannot be verified out of the
box by anyone who installs this package and follows the README.

The correct allowlist value, exactly:

```js
const config = {
  issuerDid: 'did:web:bitcoinsingularity.ai',
  statusListOriginAllowlist: ['https://api.observerprotocol.org'],
  // ...
};
```

Origin comparison is exact and includes scheme and port. `api.observerprotocol.org` without the
scheme does not match, `http://` does not satisfy an `https://` entry, and no prefix matching is
performed, so a longer hostname that merely starts with a listed one is not admitted.

Adding an origin to this list is a trust decision about where that issuer's revocation truth may
live. Add the specific origin, never a wildcard.

## `credentialStatus` as a bare object is tolerated on the crypto path only, and that tolerance is temporary

The array is canonical. Delegation schemas v2.4, v2.5 and v2.6 all type `credentialStatus` as
`type: array`, and `validateStructure` rejects anything else, so `verifyCredentialObject` denies a
bare object at the schema gate.

`verifyCredentialCrypto` skips `validateStructure` by design, and there it accepts a single bare
object as a one-element list, recording a note on the verdict when it does. This exists because the
deployed clause-zero issuer (`observer-protocol-api/demo_clause_zero.py`) emits the object form while
declaring v2.4, so credentials already in the wild carry a shape their own declared schema forbids.

**This is a compatibility shim, not a widening of the shape.** It is scoped to hold until the issuer
is corrected to emit an array and every credential minted with the object form has expired.
Clause-zero credentials carry a 24-hour `validUntil`, so the shim's useful life ends one day after
the issuer fix deploys. Nothing enforces that expiry today; removing it is a deliberate follow-up,
and the intent is recorded here so the removal is a decision rather than an archaeology exercise.

`test/credential-status-shape.mjs` case 6 asserts that `validateStructure` still rejects the object
form. If that assertion ever flips, the shim has become the schema.

## The proof block is verified cryptographically, never schema-validated, and that is PERMANENT

**This is a standing constraint, not a known limit awaiting a fix. Anyone here to remove it should
read this first.** The code carries the same warning at `src/core/schema.ts`.

`validateStructure` validates the credential BODY against the delegation structure and does **not**
validate the `proof` block against the schema the credential cites. The proof is checked
cryptographically instead, per W3C VC Data Integrity with `eddsa-jcs-2022`.

**Why, measured 2026-08-09 across the whole corpus.** Delegation schemas **v2, v2.1 and v2.3 pin
`proof.type` to the constant `"Ed25519Signature2026"`**. That name is not a registered W3C
cryptosuite. It was fabricated, and the construction behind it omitted the SHA-256 hashing step and
the proofConfig contribution that binds proof options into the signature, leaving a real malleability
gap. `observer-protocol-api` commit `f251ec6` removed it across eight emitters and replaced it with
the registered standard. **v2.4 onward pin `DataIntegrityProof` + `eddsa-jcs-2022` correctly.**

**The schemas cannot be corrected.** Published schema URLs are immutable under `aip/SCHEMA_POLICY.md`.
Three URLs therefore require a fabricated proof type forever.

| | |
|---|---|
| pre-v2.5 delegation credentials in the estate | 127 |
| failing the schema they themselves cite | **104** |
| of those, failing on `/proof/type must be equal to constant` alone | **102** |
| credentials citing v2.4 that conform to v2.4 | **13 of 13** |

**The last row is the control.** Conformance tracks the cited schema VERSION, not the issuer. This is
one schema defect with 102 instances, and **104 must never be reported as an issuer-quality number.**

**So the 102 are more correct than their own declarations, permanently, and this deviation is the only
reason they verify at all.** Schema-validating the proof block would reject 102 credentials whose
proofs are cryptographically valid and whose suite is the correct one.

**The tidy-up is attractive and whoever attempts it will have good reasons** — "the schema is the
contract", "we validate everything else against it", "this is an inconsistency". All true, and it
still breaks the entire delegation corpus. The decision available is not whether this file deviates;
it is whether anything is ever expected to schema-validate a v2/v2.1/v2.3 proof block. **Recorded
answer: no.**

Full derivation: `op-at-specs/2026-08-09-the-104-and-the-working-revocation-path.md` §3.
