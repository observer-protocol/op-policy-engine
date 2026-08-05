# @observer-protocol/policy-core-impl

The rule implementations the policy evaluator runs: amount limits, counterparty, geographic,
temporal and velocity, plus the mandate hierarchy resolution and proposal-hint handling they read.

**Private to this repository.** `private: true`, not published, no build. The package that ships is
[`@observer-protocol/policy-engine`](../policy-engine). This is here to be **read and re-run**: it is
the code behind the verdicts, co-located with the engine so one conformance harness can gate both.

## What is deliberately not here

This is the rules core only. Three things stayed in the private build repository, and the omission is
the point rather than an oversight:

| not here | why |
|---|---|
| `src/signer.ts` | The `PolicyEvaluationCredential` signing implementation. |
| `src/server.ts` | The HTTP surface that wraps it. |
| `systemd/policy-sidecar.service` | The sidecar's deployment unit, naming its service user, working directory and signing-key path. |

Together those are the **evaluator sidecar** behind `POST api.observerprotocol.org/policy/evaluate`.
That is production infrastructure and whether its implementation should be readable is a separate
decision, taken deliberately rather than as a side effect of moving code. Rule implementations are
public on the same grounds the engine is: **enforcement you cannot read is enforcement you have to
take on trust.**

The split is clean rather than convenient: `signer.ts` is imported only by `server.ts`, and neither
is reachable from anything in `src/rules/`, `evaluator.ts`, `hierarchy.ts`, `proposal-hints.ts` or
`at-ars.ts`.

## Types, and why there is no runtime dependency

Every `@observer-protocol/policy-interface` import in this package is `import type`. Nothing here
depends on that package at runtime, so `tsconfig.json` path-maps it to the sibling package's source
rather than declaring a dependency. That is what keeps the cross-repo `file:` dependency from
following the code across.

## Run it

```sh
npm install
npm run typecheck   # tsc --noEmit, sources and tests
npm test            # vitest
```

40 tests across 6 files at the time of import.
