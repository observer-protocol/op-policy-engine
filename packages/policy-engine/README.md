# @observer-protocol/policy-engine

**Verify an Observer Protocol delegation credential. Offline.**

No API key, no bearer token, no call back to Observer at verification time. Everything this checks is
public: the issuer's DID document, the schemas, the revocation status lists.

```bash
npm install @observer-protocol/policy-engine
```

## Verify a credential you were given

```js
import { verifyCredentialObject } from '@observer-protocol/policy-engine';

const verdict = await verifyCredentialObject(credential, config, Date.now());

verdict.allow    // boolean
verdict.reason   // why, in a sentence
verdict.notes    // what else the run observed
verdict.checks   // the checks that ran, keyed by name
```

**`verifyCredential(config, nowMs)` is a different exported function and does not take the
credential.** If you have the credential object, you want `verifyCredentialObject`.

The minimum config:

```js
const config = {
  credentialPath: '<provenance label for logs>',
  issuerDid: 'did:web:example.org',        // PINNED — see below
  schemaAllowlist: ['https://observerprotocol.org/schemas/delegation/v2.6.json'],
  revocation: {
    maxStalenessHours: 24,
    onUnreachable: 'cache-then-deny',      // the only accepted value
    fetchTimeoutMs: 5000,
  },
  didCache: { maxStalenessHours: 24 },
  cacheDir: '/tmp/op-cache',
  auditLog: '/tmp/op-cache/audit.log',
  rails: {},
  allowContractCalls: false,
};
```

**Pin the issuer.** A verifier that trusts whoever the credential names as its issuer is not verifying
anything, it is agreeing. `issuerDid` is what you expect; a mismatch is a denial.

**`onUnreachable: 'cache-then-deny'` is the only accepted value, deliberately.** If the revocation
status list cannot be fetched, a cached answer is used and then the credential is denied. Nothing is
allowed through on a fetch failure.

**A status list hosted on a different origin from its issuer is refused until you allowlist it.**
`statusListOriginAllowlist` is empty by default, so a credential whose `statusListCredential` does
not live on the pinned `did:web` issuer's own origin denies with
`[revocation] status could not be established`. Observer's own clause-zero revocation demo is such a
pair and needs `statusListOriginAllowlist: ['https://api.observerprotocol.org']`. See
[KNOWN-LIMITS.md](./KNOWN-LIMITS.md), which also records why `credentialStatus` as a bare object is
tolerated on one path and when that tolerance is meant to end.

## A runnable example

[`examples/verify-a-credential/`](https://github.com/observer-protocol/op-policy-engine/tree/main/examples/verify-a-credential)
verifies a real published credential against the live schemas, then asks the hosted verifier the same
question and compares. Two commands:

```bash
npm install && node verify.mjs
```

Its actual output today, unedited:

```
credential  https://observerprotocol.org/credentials/maxi-0001-trading-mandate.json
issuer      did:web:bitcoinsingularity.ai
subject     did:web:observerprotocol.org:agents:maxi-0001
schema      https://observerprotocol.org/schemas/delegation/v2.2.json

ALLOW       false
reason      [schema] structure: authorizationLevel policy requires authorizationConfig.policy

cross-check against verify.observerprotocol.org (no token required)
  hosted ALLOW  false
  hosted reason [schema] structure: authorizationLevel policy requires authorizationConfig.policy
  AGREE — the hosted endpoint reached the same verdict as the code you just ran.
```

**That credential is genuinely invalid, and the example ships pointed at it on purpose.** An example
that only ever prints success teaches you nothing about what a failure looks like or whether the check
is real. This one shows the denial, the reason, and the hosted endpoint arriving at the same answer
independently.

## Why you do not have to trust us

The hosted verifier at `verify.observerprotocol.org` runs this package. That is checkable rather than
asserted: run the example above and compare the two verdicts. If they ever disagree, **the offline
answer is the one to trust — it is the one you ran.**

- The issuer DID document is public: `https://observerprotocol.org/.well-known/did.json`
- The schemas are published and immutable: `https://observerprotocol.org/schemas/delegation/`
- Revocation status lists are static public files

## Attest a decision, not only a payment

A decision attestation records **what an agent or a person determined and under which policy
artifact**, whether or not money moved. A denied claim produces a record; an attestation that only
exists when money moves is a record biased toward approvals.

```js
import { issueDecisionAttestation, verifyDecisionAttestation, ed25519Verify, base58Decode }
  from '@observer-protocol/policy-engine';

// Issuance takes YOUR signer. Your key never reaches this package or Observer.
const result = await issueDecisionAttestation(attestation, {
  deciderDid: async () => 'did:key:z6Mk…',
  sign: async (payload) => yourEd25519Signature(payload),
  assurance: () => 'self-declared',
});
```

Verification needs no network and no Observer service: `verifyDecisionAttestation` takes an ed25519
verifier and a `did:key` decoder, both exported here.

**`outcome` is a value from a vocabulary you declare, and we never interpret it.** We attest that the
decider chose this value from *this* enumerated set, fixed by hash. What it means is yours.

**`vocabularyRef.source` accepts `client-defined` and `op-starter-set`, and `op-starter-set` is
currently REFUSED.** No OP starter vocabulary is published, so an attestation claiming one would
assert a provenance nobody can resolve. **Use `client-defined` and name your own vocabulary by id,
version and hash.** The value is declared in the type rather than added later so that publishing a
starter set is a code change here and not a change to a shape you have already signed.

Two further limits, so you can size them before building:

- **`did:web` deciders are opt-in.** Pass a resolver as the sixth argument to
  `verifyDecisionAttestation` and a `did:web` decider verifies; omit it and `did:web` is refused by
  name rather than accepted unverified. **The default is no resolver**, so upgrading never adds a
  network call to your verification path without you asking for one.

  **A `did:web` decider proves the holder of a key that domain publishes signed. It does not prove
  the organisation authorised the decision internally.** No cryptography here can establish the
  second. A `did:key` decider proves less again: that *a key* signed, with nothing tying it to a
  named party.

  **A decider that cannot be resolved is `cited-unresolvable`, not a denial.** An unreachable status
  list fails closed because the credential may have been revoked and the unknown is adverse. An
  unreachable decider document is a different fact: it means we cannot say *who* signed, and an
  attestation is evidence carried alongside a payment rather than the authority for it. So the
  citation is shown marked unverified instead of a decider's outage becoming a payment outage.
  Nothing fails open: an unresolved decider never renders as verified.
- **Nothing can yet require an attestation.** A delegation credential cannot compel a payment to cite
  one; that field is not in a published schema.

## What else is exported

`enforceMandate` and `evaluateMandate` for evaluating a proposed transfer against a credential's
`tradingMandate`; `verifyEddsaJcs2022`, `jcsBytes`, `ed25519Verify`, `resolveDidDocument`,
`checkStatusEntry` and the `CrossRailLedger` for building on the pieces directly. Types in
`dist/index.d.ts` are the reference.

## Provenance

`PROVENANCE.md` in this package records where each module in `src/core/` came from and which
rail-specific modules are deliberately excluded. The source is
[`packages/policy-engine/`](https://github.com/observer-protocol/op-policy-engine/tree/main/packages/policy-engine)
in the public repository — runtime and types together, MIT.

## Spec

[AIP v0.8 draft 1](https://github.com/observer-protocol/aip/blob/main/aip-v0.8-draft-1.md).
