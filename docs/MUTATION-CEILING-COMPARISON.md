# Is the constraint comparison in `evaluateMandate` verified by anything?

Mutation test of the comparison that decides breach against compliance for
`actionScope.per_transaction_ceiling`. Run 2026-08-13 against
`c552756` on branch `artifact-gate` (one commit ahead of `origin/main`).

## The subject

`packages/policy-engine/src/core/mandate.ts:428`

```ts
const ceiling = parseDecimalScaled(c.amount, decimals);
if ((value as bigint) > ceiling) {
  return deny(
    `[ceiling] transaction value exceeds per_transaction_ceiling of ${c.amount} ${c.currency}. ${NON_NEGOTIABLE}`,
    notes,
    capDetail({ tag: 'ceiling', constraint: 'actionScope.per_transaction_ceiling', ... }),
  );
}
```

This is the comparison a downstream consumer reads as a boolean. It is the only
thing that decides whether a request carries `detail.constraint`
(`actionScope.per_transaction_ceiling`), which is what a consumer copies into
`breachedConstraint` on a signed `op.evaluation.verdict.v3`. Nothing in this
repository converts `MandateOutcome.detail` into a verdict record: the field
`breachedConstraint` appears only in `src/core/records/*` and in
`test/record-payloads.mjs`, where it is a literal. The bridge is downstream, so
downstream cannot test this comparison and this repository is the only place it
can be broken on purpose.

`evaluateMandate` is reached publicly two ways: directly (exported from
`src/index.ts`) and through `enforceMandate` (`src/core/verify.ts:236`), which
wraps it.

## Item 1: classification, recorded before the break

### Test files that name the comparison

Grep over `test/` and `scripts/` for `per_transaction_ceiling` and the
`[ceiling]` denial tag, excluding generated fixtures:

| file | naming references |
| --- | --- |
| `test/escalation-threshold.mjs` | 5 |
| `test/run.mjs` | 4 (1 by field name, 3 by the `ceiling` reason fragment) |
| `test/structured-denial.mjs` | 2 |
| `test/fixtures/gen.mjs` | 3 (generator, not a suite) |

Twenty generated credentials under `test/fixtures/out/` also carry the field.
They are output, not assertions.

### Test files that execute the comparison

A file executes it only if it drives `evaluateMandate` or `enforceMandate` with
a credential whose `actionScope` carries `per_transaction_ceiling`. Five test
files reach the mandate path at all; every other suite imports something else
from `dist/index.mjs` and never enters it.

| file | classification | in `npm test`? |
| --- | --- | --- |
| `test/run.mjs` | drives it with real inputs, both directions, and names it | yes |
| `test/structured-denial.mjs` | drives it with real inputs, both directions, and names it | yes |
| `test/escalation-threshold.mjs` | drives it with real inputs, both directions, and names it | yes |
| `test/monthly-velocity.mjs` | drives it with real inputs and never names it | yes |
| `test/purchase-terms.mjs` | drives `evaluateMandate`, but its credential has no ceiling, so the comparison never executes | **no** |
| `test/record-payloads.mjs` | constructs `breachedConstraint` as a fixture literal, never runs the engine | yes |
| the other 12 suites | do not reference it and do not reach it | yes |

Two notes on that table.

`test/monthly-velocity.mjs` is the case worth naming. It never mentions the
ceiling. It drives `cred-velocity-monthly`, whose `actionScope` carries
`per_transaction_ceiling: 100 TUNIT`, and every one of its requests (10 and 60)
sits under that ceiling and is asserted to allow. It guards the comparison
without knowing it does.

`test/purchase-terms.mjs` is the other. It drives `evaluateMandate` directly,
and it is not in the `test` script in `package.json`. Neither is it in
`prepublishOnly`. It has never run in CI. That is independent of this mutation
and is recorded because the classification surfaced it.

### Prediction, recorded before the break

Inverting `>` to `<=` makes a breaching request allow and a compliant request
deny. Predicted outcome:

- **4 suites notice**: `run.mjs`, `structured-denial.mjs`,
  `escalation-threshold.mjs`, `monthly-velocity.mjs`.
- **3 of those name it**; 1 (`monthly-velocity.mjs`) guards it without naming it.
- **0 suites that name it fail to notice.**
- `record-payloads.mjs` does not notice, because its `breachedConstraint` values
  are literals rather than engine output.
- `purchase-terms.mjs` does not notice, and would not even if it ran.

Reasoning for each prediction:

- `run.mjs:119-121` asserts a deny at 150 and 101 over a ceiling of 100, and
  `run.mjs:118,120` asserts an allow at 50 and at exactly 100. The inversion
  flips all four.
- `structured-denial.mjs:41` requires a ceiling denial at 150 to carry
  `detail.constraint === 'actionScope.per_transaction_ceiling'`, and
  `structured-denial.mjs:92-94` requires an allow at 50 to carry no detail at
  all. Both halves flip.
- `escalation-threshold.mjs:53-56` requires 150 to deny naming the ceiling and
  **not** to escalate. Inverted, 150 passes the ceiling and falls into the
  escalation band, so it escalates. `:64` (a hair above the ceiling denies) and
  `:63` (exactly at the ceiling escalates) flip too.
- `monthly-velocity.mjs` asserts allow at amounts under the ceiling. Inverted,
  the ceiling denies first, before the velocity logic the suite is about, so its
  MUST STILL PASS block fails for a reason it does not name.

Baseline before the break: 17 suites plus the publish preflight self-test, 0
failures.

## Item 2: the break

`> ceiling` became `<= ceiling`, rebuilt (`npm run build`, which is what puts the
mutation into `dist/index.mjs`, which is what every suite imports), then each
suite run individually rather than through the `&&`-chained `test` script, so a
first failure could not hide the rest.

### Establishing that a green suite is inert rather than blind

A suite that passes with the comparison inverted has told you nothing unless the
inverted line ran during it. Each run was measured with `NODE_V8_COVERAGE` and
the execution count of the mutated comparison read out of the coverage JSON.

The instrument was checked against itself first, because an instrument is not
exempt from the class of defect it hunts. Its first version computed the
source offset with `Buffer.byteLength`; V8 coverage offsets are UTF-16
character offsets, so it was 34 characters out on this bundle, which landed
inside the guarded block and returned a plausible count for a question it was
not asking. Corrected, it was validated in both directions: against a branch in
the same function that these fixtures cannot reach (`per_asset` caps,
`evaluated=0`) and against a suite that never enters the mandate path at all
(`version-stamp`, `evaluated=0`), with `structured-denial` reading
`evaluated=4`.

### Result

`evaluated` is the number of times the inverted comparison was reached.

| suite | exit | mutated line | result |
| --- | --- | --- | --- |
| `run.mjs` | **1** | evaluated=20 | **83 passed, 20 failed** |
| `monthly-velocity.mjs` | **1** | evaluated=7 | **1 passed, 6 failed** |
| `structured-denial.mjs` | **1** | evaluated=4 | **16 passed, 6 failed** |
| `escalation-threshold.mjs` | **1** | evaluated=15 | **10 passed, 24 failed** |
| `cross-rail-contention.mjs` | 0 | evaluated=0 | inert |
| `version-stamp.mjs` | 0 | evaluated=0 | inert |
| `url-guard.mjs` | 0 | evaluated=0 | inert |
| `status-list-origin.mjs` | 0 | evaluated=0 | inert |
| `vocabulary-purchase-terms.mjs` | 0 | bundle never imported | inert |
| `credential-status-shape.mjs` | 0 | evaluated=0 | inert |
| `public-exports.mjs` | 0 | evaluated=0 | inert |
| `decision-attestation.mjs` | 0 | evaluated=0 | inert |
| `decider-didweb.mjs` | 0 | evaluated=0 | inert |
| `attestation-source-invariants.mjs` | 0 | bundle never imported | inert |
| `record-payloads.mjs` | 0 | evaluated=0 | inert |
| `approver-assurance-vocabulary.mjs` | 0 | evaluated=0 | inert |
| `preflight-publish.mjs --selftest` | 0 | bundle never imported | inert |
| `purchase-terms.mjs` (not wired) | 0 | evaluated=0 | inert |

**Not one green suite reached the mutation.** Every pass is inert, verified
rather than assumed, so there is no suite in this repository that names or
executes this comparison and fails to notice it broken.

### The delta

| | count |
| --- | --- |
| test files naming the comparison | 3 suites, plus the fixture generator |
| suites executing the comparison | 4 |
| suites noticing it broken | **4** |
| suites naming it that failed to notice | 0 |
| suites guarding it without naming it | 1 (`monthly-velocity.mjs`) |
| suites naming it without guarding it | 0 |

The prediction recorded in Item 1 was 4, naming exactly those four suites, and
it held in both directions. The comparison is verified. The premise this box was
built on, that it has never been broken-tested by anything, is now false, and it
was true until this run.

### The real finding, which is a direction rather than a count

**Every catch in the breach direction was on prose or on record shape. Not one
was on the boolean.**

The downstream service reads this verdict as a boolean. Inverted, a breaching
request still came back `allow === false` in all three suites that name the
comparison:

- `run.mjs:119` (`amount 150 over ceiling 100 → deny`) failed only because
  `expectDeny` also asserts a reason fragment. `allow` was still `false`: the
  request was denied by `[notional] maxNotionalPerOrder`, because
  `cred-valid.json` carries `tradingMandate.maxNotionalPerOrder: 100` beside
  `per_transaction_ceiling: 100 TUNIT`. A second cap at the same value shadows
  the first. Had that assertion checked only the boolean, it would have passed
  with the comparison inverted.
- `escalation-threshold.mjs:54` (`above the ceiling still DENIES`) **passed
  under the mutation.** At 150 the inverted ceiling no longer denies, so the
  request falls into the escalation band and `ok` is `false` for a different
  reason entirely. What caught it was `:55` (`is NOT an escalation`) and `:56`
  (`naming the ceiling rather than the threshold`).
- `structured-denial.mjs:46` caught it on `detail.constraint`, which is the
  field a consumer copies into `breachedConstraint`, not on `allow`.

What the boolean did catch was the other direction: a compliant request being
refused. `run.mjs:118,120`, `structured-denial.mjs:92-94` and the whole
`monthly-velocity.mjs` MUST-STILL-PASS block failed on the boolean alone,
because a false denial has nothing else to fall through to.

So the asymmetry is this. If this comparison broke permissively in a way no
second cap shadowed, the only assertions positioned to catch it are the ones
reading the denial reason and the constraint path. A consumer holding only the
boolean cannot distinguish a ceiling breach from a notional breach from an
escalation, and neither can any test that asserts only on `allow`.

### Two things the classification surfaced, unrelated to the mutation

1. `test/purchase-terms.mjs` is not in the `test` script in `package.json`, and
   not in `prepublishOnly`. It drives `evaluateMandate` directly and covers
   `requiredPurchaseTerms`, described in `mandate.ts` as the only real
   constraint on a payout rail. It passes when run by hand (9 passed, 0 failed),
   which is why nothing has reported it. Nothing runs it.
2. `cred-valid.json` sets `per_transaction_ceiling` and `maxNotionalPerOrder` to
   the same value, 100 TUNIT. Any breach large enough to cross one crosses the
   other, so the primary fixture cannot distinguish which rule refused except by
   its reason string.

Neither is fixed here. Recording first.

## Item 3: restore

`src/core/mandate.ts` restored from the pristine copy taken before the edit and
confirmed by digest, not by reading:

```
631f530424071a3c62fe0640a4c99ae731ec38aeae192347fec50e36a18036c6  mandate.ts.pristine
631f530424071a3c62fe0640a4c99ae731ec38aeae192347fec50e36a18036c6  src/core/mandate.ts
```

which is the digest recorded at `c552756` before the break. `git status` clean,
`dist/` rebuilt so the artifact matches the source again (`value <= ceiling`
absent from the bundle, `value > ceiling` present).

`npm test` re-run after the restore: 17 suites plus the preflight self-test, 0
failures, per-suite totals byte-identical to the baseline captured before the
mutation.

The break is not committed. Only this document is.

## Item 4: two publishing questions, answered from this repository

Read only. No tag was changed and no publish was run.

### a. rc.13 through rc.15, and a `latest` still on rc.12

**On this repository's evidence: `latest` was not moved, and nothing here
records a decision either way.** There is no artifact in this repository of a
deliberate publish under an explicit tag.

What was searched, and what it holds:

| where a tag choice would live | what is there |
| --- | --- |
| any `--tag` or `dist-tag` string, repo-wide | none, in any `.md`, `.mjs`, `.json`, `.yml` |
| `publishConfig` in `packages/policy-engine/package.json` | absent |
| `.npmrc`, at either level | does not exist |
| CI | there is no `.github/` directory at all |
| `RELEASE.md` **Checklist**, step 3 | "Publish this package." No tag argument |
| `scripts/preflight-publish.mjs:37`, the documented command | `git tag -a v<version> -m "..." && git push origin v<version> && npm publish` |
| `RELEASE.md` release banner | still `## 1.0.0-rc.10 IS PUBLISHED. npm latest IS rc.10.` No mention of rc.11 through rc.15 anywhere in the file |
| `CHANGELOG.md` | newest entry is `## 1.0.0-rc.12`. No entry for rc.13, rc.14 or rc.15 |
| commit messages | no commit in any branch mentions a dist-tag or a `latest` decision |

The single command this repository documents is a bare `npm publish`, which
registers the published version under `latest`. So the procedure written here,
followed as written, would have moved `latest` to rc.15. It is on rc.12. **The
registry state is inconsistent with every publish path this repository
documents**, which is a stronger statement than "no record was kept": there is
no record, and the only recorded method contradicts the outcome.

The git half of the release ritual did run for all three. `v1.0.0-rc.13`,
`v1.0.0-rc.14` and `v1.0.0-rc.15` are annotated tags (`git cat-file -t` returns
`tag`, not `commit`), all dated 2026-08-12, all pushed, and all ancestors of
`origin/main`, which is exactly what `preflight-publish.mjs` requires. The half
that left no trace is the npm half.

The boundary in the registry and the boundary in the documentation are the same
version. `latest` stops at rc.12; `CHANGELOG.md` stops at rc.12; `RELEASE.md`
stops at rc.10. Three release candidates were tagged, merged and published with
no changelog entry and no release note.

**What this repository cannot settle.** A `--tag` typed on a command line leaves
nothing behind in a git repository. So the absence recorded above rules out a
deliberate, *recorded* tag choice; it cannot rule out an unrecorded one. If
rc.13 through rc.15 were tagged deliberately, the decision exists only in
whatever shell ran it, and the note that would have made it checkable was not
written. Either way the corrective action is the same and it is a decision for
Boyd, not something to do while holding: move `latest`, or write down why it
sits on rc.12.

### b. What this repository tells an integrator to install

**A bare package name, in every place it appears. No version, no tag, so the
default tag decides.**

| file | instruction |
| --- | --- |
| `README.md:20` | `npm install @observer-protocol/policy-engine` |
| `packages/policy-engine/README.md:9` | `npm install @observer-protocol/policy-engine` |
| `docs/WDK-INTEGRATION.md:17` | `npm install @observer-protocol/policy-engine` |
| `examples/verify-a-credential/verify.mjs:8` | `npm install @observer-protocol/policy-engine` |

Not one names a version or a tag. An integrator following any of them today
resolves `latest`, which is rc.12.

The one place a version is declared is the runnable example, and it does not
name the rc line at all: `examples/verify-a-credential/package.json` declares
`"@observer-protocol/policy-engine": "^0.4.0"`, with `package-lock.json`
resolving `0.4.0`. Per `RELEASE.md` under **Declared dependency range**, a caret
on a `0.x` version pins the minor, so that range excludes every `1.0.0-rc.*`
build. An integrator who copies the example gets `0.4.0`.

So the three states are three different versions: the documented install gives
rc.12, the shipped example gives 0.4.0, and downstream runs rc.15. **No
instruction in this repository yields the version downstream is on.**
