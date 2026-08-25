# 12 NYCRR 325-1.25 against two restatement layers: encoding findings (CV8)

Findings file. Built 2026-08-25 (retrieval instant `2026-08-25T05:18:13Z`, read from the environment
clock). Branch `session/nywc-325-1-25`, stacked on the unmerged CV7 branch because the shared-layer
additions and the figure instruments exist only there. Not merged; nothing published; layer B held.

MARKER: [population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

## 1. The pay-or-object hypothesis (first task)

`pay-or-object.mjs`, recorded in `PAY-OR-OBJECT.md`. One determination: bill submitted and received
2026-03-10, carrier objected 2026-04-19 (day 40) in the prescribed format, every meaning supplied,
HP-1.0 requested 2026-05-01. Evaluated under the regulation and under layer A on the same clause ids.

**It holds, on one clause, for a valuation objection.** `325-1.25/d/1/award-availability`:
regulation `remedy_not_available_timely_valuation_notice_on_supplied_meaning`; layer A
`remedy_available`. The carrier complied with (c)(1) (`notified_within_45_on_supplied_meaning`)
and its objection is reviewable under (c)(3); layer A carries neither clause. What turns on the
difference: (d)(1) has three conjuncts (timely submission, non-payment, no timely valuation notice)
and the page states one; the objection limb is the one dropped.

**For a legal objection on day 40 it does not hold on that clause**: both say `remedy_available`,
because (d)(1)'s exclusion names valuation notices only. The divergence moves to
`325-1.25/d/3/i/not-before-legal-determined` (regulation `not_acceptable_issues_pending`; layer A
carries no such clause): a provider following the page would file an HP-1.0 the Board will not
accept until 30 days after the objection is finally determined against the carrier.

The page's hedge, `you may be able to`, is NY25-A6, registered and not resolved.

## 2. Term inventory (TERMS.md)

Four ungrounded terms on 11 of 59 clauses, each with the missing citation named: **authorized**
(WCL 13-b, Part 324, uncited; the section cites 325-1.4 and Part 441 for services instead);
**format prescribed by the Chair for such purpose** (the Board's objection forms, uncited; the
bill format is a fact because (b)(1) cites 325-1.3); **applicable fee schedule** (Parts 329, 333,
343, 348, uncited and licensed); **legally defective** (325-1.3 cited for another purpose, WCL
13-a(4) uncited; layer A supplies a meaning and withdraws it as a sole basis). Ten terms are facts
under cited documents; eleven objection grounds are category tokens whose truth no clause
evaluates; six terms are in the third state (`in full`, `evidentiary purposes`, `good cause`,
`medically necessary`, `finally determined adversely`, `promptly`), with the retrieval limit stated.
No fact field exists for any of the four ungrounded terms; CV7's defect was not repeated.

## 3. Clause count and disposition split

`project-versions.mjs --dir nywc-325-1-25`:

| disposition | regulation | layer A (WCB) | layer B (daisyBill) |
|---|---|---|---|
| CONDITIONAL | 37 | 3 | 12 |
| MECHANICAL | 7 | 1 | 4 |
| DEFINITIONAL | 7 | 0 | 3 |
| JUDGMENT | 5 | 0 | 1 |
| DERIVED | 2 | 0 | 1 |
| INSTRUCTION | 1 | 0 | 0 |
| **total** | **59** | **4** | **21** |

Layer A states 4 of 59 regulation clauses. Layer B states 20 and adds one the regulation does not
carry (`325-1.25/B/electronic-only-after-2025-08-01`, the post-2025-08-01 electronic mandate).
INCORPORATED_BY_REFERENCE is unused: nothing 325-1.25 points at is purchase-only, and the
licensed fee schedule is reached as an ungrounded term because the section never cites it.

Validation: **PASS, no rule failed** on all three registers (two R7 notes on remaps whose source
domain the schema cannot resolve). Coverage by set equality on empty facts: 59/59, 4/4, 21/21.

**Cross-check of the regulation text:** NOT DONE. Westlaw refused (403 to curl; blocked to the
fetcher; no archive capture); Justia 403; Casetext 410. LII is the one rendering cited.

## 4. Harness self-check

MARKER: [population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

`harness-selfcheck.mjs`, recorded in `HARNESS-SELF-CHECK.md`:

> **Mutation:** the constant 45 in `bindings.action_within_45_of_submission`, set to 40, in memory.
> **Detected:** 56 of 600 determinations diverge, on the four clauses that read the binding
> ((c)(3) late-objection-barred 56, (c)(3) liable-full 21, (e)(1) 18, (d)(1) 3); comparator exit 1.
> **Unmutated re-run:** 0 of 600; exit 0. **Verdict: SHOWN FAILING, THEN CLEAN.**

## 5. Divergence by clause, both denominators (DIVERGENCE.md)

MARKER: [population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

Every rate is stated over all 600 determinations and over the determinations the clause reaches
(applicability holds on the facts, and the ungrounded emitter did not refuse an unsupplied
meaning before testing it). Every divergence is one of four classes: *regulation waiting* (the
reference is undetermined and the restatement decides), *attribution only* (same decision, the
reference's attributed to a supplied meaning), *applicability*, *decision* (both decide,
differently). The last is a disagreement about the rule.

### Layer A (WCB), publishable: 4 of 4 stated clauses diverge, all 4 on a decision

MARKER: [population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

| clause | diverge / 600 | diverge / reached | decision / reached | what turns on it |
|---|---|---|---|---|
| `d/1/award-availability` | 548/600 | 548/600 | 224/600 | the page states one condition (not paid in full within 45 days of submission) where (d)(1) has three; 182 bills ineligible under (b)(1) get `remedy_available`, 5 with a timely valuation notice do, 9 paid in full after day 45 do; 323 are regulation-waiting on the format meaning |
| `b/1/format-prescribed` | 600/600 | 600/600 | 94/600 | the page tests the CMS-1500 field matrix and states no authorization gate; the regulation tests 325-1.3 under `authorized`; 164 agree in decision and differ only in attribution, 342 are regulation-waiting |
| `d/5/reject-incomplete-or-mismatch` | 74/600 | 74/173 | 74/173 | `will be denied` on a bill/Board-file mismatch where the regulation says `may be rejected` on an eCase mismatch and rejects the incomplete outright |
| `c/6/legally-defective-report` | 315/600 | 10/10 | 4/10 | the page decides `legally defective` by three elements; the regulation waits on a meaning (311 regulation-waiting) or attributes one |

### Layer B (daisyBill), REPOSITORY-INTERNAL: 11 of 20 stated clauses diverge, all 11 on a decision

MARKER: [population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

| clause | diverge / 600 | diverge / reached | decision / reached | what turns on it |
|---|---|---|---|---|
| `c/1/pay-or-notify-45` | 434/600 | 407/573 | 45/573 | clock from submission, not receipt (NY25-A1); no format condition |
| `f/1/adjudication-of-legal-mtg` | 441/600 | 238/238 | 85/238 | review conditioned on timeliness where the regulation conditions it on the prescribed format |
| `c/1/legal-objection-format` | 392/600 | 131/131 | 47/131 | `Form C-81.B`, no such form (NY25-A7): every legal objection nonconforming |
| `c/1/mtg-objection-format` | 398/600 | 158/158 | 36/158 | the same form identifier |
| `c/1/valuation-objection-format` | 386/600 | 124/124 | 41/124 | recipients provider and WCB only; no simultaneity |
| `c/1/notice-recipients` | 75/600 | 75/301 | 75/301 | the claimant and the attorney are dropped from the recipient list |
| `b/1/format-prescribed` | 68/600 | 68/600 | 68/600 | electronic submission as the format, not 325-1.3 |
| `b/1/ineligible-if-late-or-wrong-format` | 46/600 | 46/600 | 46/600 | follows from the format reading |
| `e/1/arbitration-availability` | 48/600 | 48/60 | 48/60 | arbitration stated as available on any timely valuation objection; no eligibility, no failure-to-agree |
| `c/7/mtg-ground-member` | 48/600 | 48/158 | 48/158 | `Examples ... include` opens a set the regulation closes at three |
| `c/5/valuation-ground-enumerated` | 23/600 | 23/124 | 23/124 | seven grounds listed as if closed; fee-schedule excess moved to the EOB exception |

Nine of 20 agree on every determination, among them the two 45-day clauses (c)(3), the 120-day
rule and the EOB exception. One rule is added by the restatement and has no regulation clause.

**Where A and B disagree with each other** (recorded, not reconciled): the two layers share one
clause, (b)(1) format, and read it differently (field matrix; electronic submission).

### The waiting axis

MARKER: [population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

Regulation: 35,400 records, meaning-waiting 3,979 of 35,400 (11.24%); 569 of 600 determinations
carry at least one such record. Of the 3,979, 3,470 are the undetermined records on the 11
ungrounded clauses (1,776 reached plus 1,694 refused before applicability) and 509 sit on other
clauses that consume a meaning through a binding; 323 of 600 is the unsupplied-format population,
the determinations on which the objection-format meaning is unsupplied, not the count of
determinations with a meaning-waiting record. Corrected 2026-08-25: as first typed, this paragraph
gave the 3,470 and the 323 under the label meaning-waiting, with 9.80 percent; the derived tally
never did, and the scanner of the time matched figures over 600 only. Ungrounded split over
11 clauses x 600 = 6,600 records: decided 516, on supplied meaning 1,021, undetermined reached
1,776, undetermined refused before applicability 1,694, not applicable 1,593. Not reconciled to CV7 (5.54%) or Molina
(2.8%); 325-1.25 rests on a term (the objection format) that six clauses consume, which is why it
lands higher.

## 6. Ambiguities: 9 registered, none resolved

NY25-A1 receipt against submission as day zero (the regulation uses both); A2 calendar or
business days; A3 `in full` against `up to the maximum`; A4 `not paid in full or in part`; A5 (g)'s
2020-01-01 against two later amendments; A6 layer A's `may be able to`; A7 layer B's `C-81.B`;
A8 whether `the manner described herein` includes format; A9 `finally determined adversely`.

## 7. Currency dispositions (pre-ruled 3), on the version entries

`regulation`: `dated_by_compilation_history`. `layer-a-wcb`: `UNDATED_RESTATEMENT` (the hub page
carries no date; the CMS-1500 page dates a spreadsheet, not its narrative). `layer-b-daisybill`:
`DATED_BY_PUBLISHER_ONLY` (self-published dates, no corroboration), and its quoted (c)(1) is a
superseded text (57 deletions, 24 insertions against the in-force 426 words).

## 8. What changed outside this directory

`nywc-12nycrr-fee/figure.mjs` and `check-figures.mjs` take a target directory and read figure sets
from `figures` arrays in `out/*.json`; `project-versions.mjs` takes `--dir`, `clauses_by_version`,
`only_in_versions` and `rests_on_ungrounded_term_by_version`, and checks declared meaning keys
across versions; `compare.mjs` takes `--dir`; the scanner exempts `RETIRED:` lines; three domain
rows in `_phase0/build-register.mjs`. CV7's `FIGURE-CAVEAT.md` retires the two CV7-era headline figures by name
(item 8; the strings themselves appear only on that file's RETIRED lines). Design reasoning in op-at-specs, `2026-08-25-nywc-325-1-25-restatements-as-versions.md`.

## Stated limits

- `bill.amount` is read by no clause: the register has no at-most primitive to place the amount
  billed against the schedule maximum; (c)(3) records liability up to the maximum without
  computing it.
- (c)(3)'s `in the manner described herein` is tested as timing and kinds, not format (NY25-A8),
  because a clause rests on one ungrounded term.
- (d)(6)'s `at least 30 days` reads a filing date exactly 30 days out as under 30; the primitive
  has no at-least form.
- `carrier.notice_deadline_at` is supplied rather than derived (no date arithmetic).
- The population is synthetic and parameterised; the rates measure what the registers decide and
  count on it, nothing about any payer's bills.

## Not built, by the non-goals

No console, CLI, docs, demo or deployment; layer B unpublished; no merge.
