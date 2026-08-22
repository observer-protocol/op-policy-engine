# PSR 2017 (SI 2017/752) reg 76: encoding findings

Findings file. No client-facing report, per scope.

> **SUPERSEDED IN PART, 2026-08-21, by `../_primitives/INVENTORY-AUDIT.md`.**
>
> The reuse figures below were computed from the hand-authored `primitive` field in `clauses.json`.
> An execution trace of both evaluators shows that field names the sole top-level call on **13 of 21
> clauses and disagrees on 8**, and that the 13-primitive baseline omits **11 operations both
> encodings actually invoke**. On the audited baseline `amounts_equal` is PARAMETERISED rather than
> NEW, and an undeclared `disjunction_over_results` takes its place, so the count of genuinely new
> primitives is still two but a **different** two.
>
> **Do not quote the 86% outside this repository.** The audit's replacement figure is contingent on
> a boundary decision that has not been made. Everything below about scope, ambiguities, version
> history and worked cases is unaffected.

The measurement is **whether the Banxico primitives transfer**. The encoded regulation is the
byproduct.

---

## Headline: 16 of 21 clauses reused a primitive unchanged

| classification | clauses |
|---|---|
| REUSED, unchanged | **16** |
| PARAMETERISED, same primitive with a new argument | **2** |
| NEW, required a primitive that did not exist | **3** |

**18 of 21 clauses, 86%, were served by the existing 13 primitives** with at most a new
argument. **Two distinct new primitives** were needed, below the four that would have stopped this
run.

### The two NEW primitives

**`ordered_before(a, b)`** returns `before | after | simultaneous | missing_operand`. Two clauses
need it: reg 67(3), withdrawal of consent before the point of irrevocability, and reg 76(4), a credit
value date no later than the debit date.

*Is it genuinely new, or a variant of one that was too narrow?* **The second.** `elapsed_within`
measures an interval **against a limit**. Comparing two instants for order is the more primitive
operation, and `elapsed_within` cannot express it without inventing a limit the rule does not have.
The existing set had the composite and lacked the atom. Two independent users in one regulation is
why this is recorded as a shape rather than a one-off.

**`amounts_equal(a, b)`** returns `equal | not_equal | incomparable_currency | missing_operand`. One
clause needs it: reg 76(1)(a), refund the amount of the unauthorised transaction.

*Genuinely new.* The existing set has **no numeric comparison at all**. Banxico's ceiling test was
real arithmetic but it lived inside the engine's mandate evaluator and was never lifted into the
primitive inventory, so the first regulation that had to compare two amounts found nothing there.
That is a gap in the inventory rather than a gap in the idea.

### The two PARAMETERISED

**`elapsed_within` gains a `months` unit.** Banxico needed `calendar_days` and `business_days`. Reg
74(1) is 13 months from the debit date, which is not a fixed multiple of either and must not be
approximated as 395 days.

**`open_set_floor` at arity one.** Reg 75(3) says the recorded use of a payment instrument is `not
in itself necessarily sufficient` to prove authorisation. That is the same shape as `por lo menos`:
what is enumerated is necessary and the rule declines to make it sufficient. Banxico passed a list of
element results; this passes a single evidence item. **The shape transferred across jurisdictions
untouched**, which is the strongest single result here.

### Primitive usage

- `conditional_requirement`  6 clause(s)
- `conjunction_over_results`  4 clause(s)
- `held_judgment`  3 clause(s)
- `ordered_before`  2 clause(s)
- `elapsed_within`  2 clause(s)
- `any_present`  1 clause(s)
- `member_of_register`  1 clause(s)
- `open_set_floor`  1 clause(s)
- `amounts_equal`  1 clause(s)

## Scope, decided by the source

Reg 76 is `subject to regulations 74 and 75` and turns on whether a transaction was authorised `in
accordance with regulation 67`. Those three are in.

**Regulation 72 is out, and named rather than dropped silently.** It is referenced by reg 75(3) and
75(4) as the subject of a proof burden, two hops from 76, and never as a condition of the refund.
Section 333A(2) of the Proceeds of Crime Act 2002 is external primary legislation, not part of this
instrument.

## Decomposition

**21 clauses.** 7 MECHANICAL, 4 JUDGMENT, 6 CONDITIONAL, 4 DERIVED.

| clause | disposition | primitive | reuse |
|---|---|---|---|
| `psr-2017/67/1/consent` | MECHANICAL | `any_present` | **REUSED** |
| `psr-2017/67/2/b/form` | MECHANICAL | `member_of_register` | **REUSED** |
| `psr-2017/67/2/a/timing` | CONDITIONAL | `conditional_requirement` | **REUSED** |
| `psr-2017/67/3/withdrawal` | MECHANICAL | `ordered_before` | **NEW** |
| `psr-2017/67/4/series-withdrawal` | DERIVED | `conjunction_over_results` | **REUSED** |
| `psr-2017/74/1/undue-delay` | JUDGMENT | `held_judgment` | **REUSED** |
| `psr-2017/74/1/thirteen-months` | MECHANICAL | `elapsed_within` | **PARAMETERISED** |
| `psr-2017/74/2/information-failure` | CONDITIONAL | `conditional_requirement` | **REUSED** |
| `psr-2017/75/1/provider-burden` | JUDGMENT | `conjunction_over_results` | **REUSED** |
| `psr-2017/75/2/pisp-burden` | JUDGMENT | `held_judgment` | **REUSED** |
| `psr-2017/75/3/instrument-not-sufficient` | DERIVED | `open_set_floor` | **PARAMETERISED** |
| `psr-2017/75/4/supporting-evidence` | CONDITIONAL | `conditional_requirement` | **REUSED** |
| `psr-2017/76/1/trigger` | DERIVED | `conjunction_over_results` | **REUSED** |
| `psr-2017/76/1/a/refund` | MECHANICAL | `amounts_equal` | **NEW** |
| `psr-2017/76/1/b/restore` | CONDITIONAL | `conditional_requirement` | **REUSED** |
| `psr-2017/76/2/practicable` | JUDGMENT | `held_judgment` | **REUSED** |
| `psr-2017/76/2/deadline` | MECHANICAL | `elapsed_within` | **REUSED** |
| `psr-2017/76/3/fraud-carveout` | CONDITIONAL | `conditional_requirement` | **REUSED** |
| `psr-2017/76/4/value-date` | MECHANICAL | `ordered_before` | **NEW** |
| `psr-2017/76/5/a/aspsp-complies` | DERIVED | `conjunction_over_results` | **REUSED** |
| `psr-2017/76/5/b/pisp-compensates` | CONDITIONAL | `conditional_requirement` | **REUSED** |

## Ambiguities: 6, none resolved

Registered in `ambiguities.json`. Two are decisive.

**P1.** The fraud carve-out in reg 76(3) disapplies **paragraph (2) only**. Whether the refund
obligation in paragraph (1) survives with no deadline, or is suspended, is not stated. Case 3 returns
`undetermined` for the deadline on that ground rather than picking a reading.

**P6.** Reg 74(1) carries two limbs in one sentence, `without undue delay` and `in any event no later
than 13 months`. Whether the first bars redress independently of the second decides whether a
judgment clause sits on the path to losing the remedy.

**A note on how this differs from Banxico.** There the ambiguity was the **unit** of a period. Here
the period is unambiguous, 13 months from a defined date, and the open question is whether a second
qualitative limb bars the remedy independently. **A source can be structurally precise and still
leave the operative question open**, which is worth saying because the structural quality of this
source is otherwise much higher.

## Source quality, against Banxico

| | Banxico 34/2010 | SI 2017/752 |
|---|---|---|
| format | PDF, compiled text | XML, per provision |
| provision identity | none; cited by numeral in prose | `id` to sub-paragraph, plus `IdURI` |
| version metadata | none; a modification note with no in-force date | `RestrictStartDate` at provision level |
| amendments | prose notes inside the text | `ukm:UnappliedEffect` with typed attributes |
| commencement | not establishable from the document | four dated point-in-time versions |

**None of that changed the encoding difficulty.** The clause counts are comparable, the disposition
mix is comparable, and the ambiguity count is identical at six. Better markup made the source easier
to **retrieve and cite**; it did not make the rules easier to **decide**.

## Point-in-time versions

Four `RestrictStartDate` values on every provision encoded: **2018-01-13, 2020-12-31, 2024-10-30,
2026-04-28**.

**The encoding survives the earliest unchanged.** Regulation 76 at `2018-01-13` was retrieved and
compared against current: the operative text is **byte-identical**, the id set is identical at 10
ids, and the first differing character index is -1. The file bytes differ, 15,394 against 14,823,
which is annotation and metadata rather than operative text.

So every clause in this register applies unchanged across the full life of the instrument to date.
One observation, as scoped; no replay harness was built.

## Harness

Same as Banxico. `check-coverage.mjs` was **ported unchanged** and passes: register 21, emitted
21, set equality against a live run with empty facts.

Three worked cases in `cases.mjs`. Case 1 an unauthorised transaction refunded on the following
business day. Case 2 notification at 14 months, where the bar bites and the trigger returns
`not_satisfied`. Case 3 the fraud carve-out engaged with P1 unresolved, returning `undetermined` for
the deadline, `breached` for the value date and `breached` for supporting evidence.

## Carried to the reuse log

Entry E1 in `_primitives/REUSE-LOG.md` recorded that `conditional_requirement` collapses the three
values `elapsed_within` returns. **That pattern recurs here.** `psr-2017/75/4/supporting-evidence`
and `psr-2017/76/5/b/pisp-compensates` both wrap a result in a precondition, and
`psr-2017/76/2/deadline` composes a deadline under a carve-out. The question E1 deferred, whether
this is a Banxico artefact or a primitive-set defect, now has its second data point and the answer
is the second. Recorded there rather than fixed here.

## Not covered

- Regulation 72, for the reason above.
- The 2020-12-31, 2024-10-30 and 2026-04-28 versions. Only the earliest was compared.
- Regulations 77 and 90 onward, which carry the payer's own liability and the wider redress
  provisions reg 74 also gates.
- Whether the two NEW primitives should be added to the shared inventory. That is a decision about
  the inventory, not about this regulation.
