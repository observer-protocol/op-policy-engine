# Verify a credential — runnable

Verifies a real published Observer Protocol delegation credential offline, then cross-checks the
hosted verifier and compares.

```bash
npm install
node verify.mjs
```

No API key. No bearer token. Everything it touches is public.

## What it does

1. Fetches `https://observerprotocol.org/credentials/maxi-0001-trading-mandate.json`
2. Verifies it with `verifyCredentialObject` against the live published schemas
3. Prints the verdict, the reason, and the checks that ran
4. Asks `verify.observerprotocol.org` the same question and compares

Set `SKIP_HOSTED=1` to stop after step 3. A network failure in step 4 is not a verification failure and
the example says so — the offline verdict already stands on its own.

## The credential it points at is invalid, on purpose

It denies with `authorizationLevel policy requires authorizationConfig.policy`. That is a real defect
in a real published credential, not a contrived fixture.

An example that only prints success teaches you nothing about what a failure looks like, or whether
the check is doing anything at all. This one shows the denial, the reason, and an independent endpoint
reaching the same answer.

## The issuer is pinned, and it is not who you would guess

This credential is issued by `did:web:bitcoinsingularity.ai`, not by `did:web:observerprotocol.org`.
Point `issuerDid` at Observer Protocol and the run denies on issuer mismatch before it gets anywhere
near the structure check — which is the correct behaviour and the reason to pin rather than to read
the issuer out of the credential you are checking.
