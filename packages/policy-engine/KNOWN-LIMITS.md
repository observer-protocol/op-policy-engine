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
