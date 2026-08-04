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

## What else is exported

`enforceMandate` and `evaluateMandate` for evaluating a proposed transfer against a credential's
`tradingMandate`; `verifyEddsaJcs2022`, `jcsBytes`, `resolveDidDocument`, `checkStatusEntry` and the
`CrossRailLedger` for building on the pieces directly. Types in `dist/index.d.ts` are the reference.

## Provenance

`PROVENANCE.md` in this package records where each module in `src/core/` came from and which
rail-specific modules are deliberately excluded. The source is
[`packages/policy-engine/`](https://github.com/observer-protocol/op-policy-engine/tree/main/packages/policy-engine)
in the public repository — runtime and types together, MIT.

## Spec

[AIP v0.8 draft 1](https://github.com/observer-protocol/aip/blob/main/aip-v0.8-draft-1.md).
