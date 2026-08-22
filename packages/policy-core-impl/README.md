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


## Missing operands: this layer decides, the policy library does not

There are two bodies of rule logic in this repository and **they resolve a missing operand in
opposite directions on purpose.** Neither is wrong. Anyone reading one should know the other exists
before assuming its convention is the house style.

**Here, a missing operand resolves to an outcome, per rule, asymmetrically:**

| rule | operand absent | resolution |
|---|---|---|
| `amount-limits` `maxNotionalPerOrder` | no notional hint | **DENY** |
| `amount-limits` `maxPosition` | no state in context | SKIP |
| `amount-limits` `dailyDrawdownCap` | always, not implemented | SKIP |
| `counterparty` `allowList` | no counterparty hint | **DENY** |
| `counterparty` `blockList` | no counterparty hint | SKIP |
| `counterparty` `requireIssuerClassIn` | no attestation | SKIP, caller records `evaluatedWithAttestations=false` |
| `geographic` `allowedJurisdictionsOnly` | jurisdiction unknown | **DENY** |
| `geographic` `blockedJurisdictions` | jurisdiction unknown | SKIP |
| `velocity` daily and monthly caps | no state in context | SKIP, deferring to the server-side evaluator |

The organising principle is consistent even though the table looks mixed: **a closed permission list
fails closed, an open prohibition list fails open, and a stateful rule skips rather than guesses.**

**In `policy-library/`, a missing operand resolves to a THIRD VALUE and no outcome at all.**
`elapsed_within` returns `no_end_event`, `ordered_before` and `amounts_equal` return
`missing_operand`, `held_judgment` returns `not_assessed`, `member_of_register` returns
`no_candidate`, and any composition over an unresolved input returns `undetermined`. Nothing there
ever converts an absence into a decision.

**Why both are right.** This layer answers *may this proposal proceed*, and something must happen
next, so an absent operand has to resolve to allow or deny. The policy library answers *what does
the regulation say about these facts*, where nothing happens next and the answer is the whole
product. A regulation encoding that guessed on a missing fact would be inventing a finding.

**They cannot meet.** The `policy-library/` encodings import nothing at all and are shipped by no
package, so no caller reaches both on the same question. If that ever changes, the conversion at the
boundary is a decision to take explicitly, and the direction that loses information is
`undetermined` becoming `deny`.

Recorded 2026-08-21. The other half of this note is in
`policy-library/_primitives/INVENTORY-AUDIT.md`.
