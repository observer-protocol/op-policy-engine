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
failures. Per-suite totals in `## Item 2` below.
