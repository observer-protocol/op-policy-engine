# 12 NYCRR fee schedule provisions: encoding findings

Findings file. No client-facing report, per scope. Built 2026-08-24 (local; the retrieval
instants read from the environment clock are `2026-08-25T04:08:39Z` and `2026-08-25T04:16:51Z`).
Branch only; not merged; nothing deployed or published.

**The deliverable is the artifact a first engagement hands back:** a versioned clause register
converted from primary source, synthetic determinations replayed against both versions, and
divergence reported by clause with denominators, plus the defensibility figure. Everything below
is derived from files in this directory by the scripts named beside it.

---

## The property this specimen forces: evaluable by a party holding zero clause text

The Official New York Workers' Compensation fee schedules are licensed and are incorporated into
12 NYCRR by reference. **No clause text from any of them, and no CPT descriptor, code text or
table, appears in this register.** Where the regulation itself quotes them (four places), the
quotation is elided and marked; codes are cited by identifier. The proposed schedules the Board
posted beside its rulemaking were not downloaded.

What that leaves the register able to do, stated positively:

- **The register holds the rules the regulation states in its own words** and tests a determination
  against them: which edition is in force on the date of service; that a PTA or OTA service carries
  CQ or CO and is paid at 85 percent of the direct-therapist amount; that a resident's non-surgical
  service carries 1R at the same amount and an assistant-at-surgery service carries 84 at 16 percent;
  the one-unit-per-day telemedicine limits; the COVID-19 testing code's regional fees, which the
  regulation states to the cent. Those three amounts are verifiable to the cent by a party holding no schedule
  text. The region is not a fact: `Region I` to `Region IV` are used by 329-1.3(d)(1) and defined
  nowhere in 12 NYCRR, a provider's region is assigned by the schedule's ground rules the section
  does not cite for it, and since the amendment of 2026-08-24 the region is the institution's
  supplied MEANING of the term, which the determination carries in its result token
  (`equal_on_supplied_meaning`) or waits on (`undetermined, waiting: meaning`). See
  `INCORPORATION-COMPARISON.md` and the amendment section below.
- **The scheduled amount itself arrives on the determination as the applied bound**
  (`applied_bound.amount`, `applied_bound.code`), supplied by the payer that holds the schedule. The
  register never holds it and never needs it: it tests the RELATIONS the regulation states between
  that bound and the payment.
- **Where the operative rule sits inside the incorporated schedule**, the clause carries the
  disposition `INCORPORATED_BY_REFERENCE`, new to the schema in this encoding: its emission names
  the document, the clause that identifies the edition, and the retrieval condition (purchase,
  per 329-1.3(b) and its siblings). It is a disposition with a distinct value, not `undetermined`
  and not unknown. Eight clauses carry it.

The same property the Molina rehearsal established by choice is forced here by law.

---

## Clause count and disposition split

`project-versions.mjs` output, verbatim:

```
in-force               74 clauses  {"MECHANICAL":21,"CONDITIONAL":27,"INSTRUCTION":1,"JUDGMENT":3,"DEFINITIONAL":13,"INCORPORATED_BY_REFERENCE":8,"ILLUSTRATIVE":1}  6 ambiguities  53 fields, 52 read
proposed-2026-01-14    47 clauses  {"MECHANICAL":16,"CONDITIONAL":9,"INSTRUCTION":1,"JUDGMENT":2,"DEFINITIONAL":11,"INCORPORATED_BY_REFERENCE":7,"ILLUSTRATIVE":1}  7 ambiguities  53 fields, 34 read, 18 unread in this version: ...
```

| disposition | in-force | proposed-2026-01-14 |
|---|---|---|
| MECHANICAL | 21 | 16 |
| CONDITIONAL | 27 | 9 |
| DEFINITIONAL | 13 | 11 |
| INCORPORATED_BY_REFERENCE | 8 | 7 |
| JUDGMENT | 3 | 2 |
| INSTRUCTION | 1 | 1 |
| ILLUSTRATIVE | 1 | 1 |
| DERIVED, EVIDENTIAL | 0 | 0 |
| **total** | **74** | **47** |

51 clauses carry an evaluation in force, 27 as proposed. No clause is DERIVED: every composition
in this instrument is a gate or a guard over facts, and the one clause that reads another
((e)(2)(i) reads (e)(2)(ii)) is CONDITIONAL because it arises only on that reading.

**Scope:** Subpart 329-1 in full; 329-1.3 (a) to (e); the four sections the January 2026 proposal
amends beside it (329-4.2, 333.2, 343.2, 348.2) and their applicability siblings (329-4.1, 333.1,
343.1, 348.1). Subparts 329-2 and 329-3 are named as out of scope in `clauses.json`, with the
reason.

**The field `accident.date` is read by no clause, by the rule's own terms** ("regardless of the
date of accident"); it is declared so the derived `read_by` shows, per version, that nothing
consults it.

---

## Two versions: what differs, derived from the register rather than listed

`version-diff.mjs`: **19 changed, 28 unchanged, 27 absent in the proposed version**, of 74.

- **6 date-of-service clauses** change on DATA only: the edition identity, the publisher and the
  effective date are per-version bindings (`v_edition_*`, `v_publisher`, `v_effective_from_*`,
  `v_effective_known`). The evaluation tree is one copy.
- **2 clauses change in text and data**: 329-1.3(c)(1) and (c)(2), which move PTA/OTA coding from
  the Physical Medicine Section of the Medical Fee Schedule to the Acupuncture and PT/OT schedule
  under 329-4.2 (`v_pta_code_source`).
- **11 DEFINITIONAL clauses change in text**: the five edition clauses (December 11, 2019 or
  December 26, 2018, OptumInsight, to December 30, 2025, RefMed) and the six availability clauses
  (purchase from RefMed by telephone or at marketplace.refmed.com).
- **27 clauses are absent from the proposed version**: the whole of 329-1.3(e) (20 clauses, adopted
  2026-04-22, after the proposal was drafted) and the telemedicine subdivisions 329-4.2(d), 333.2(c)
  and 348.2(c) (7 clauses). The proposal restates each section "to read as follows" without them.
  Encoded as the proposal reads; whether that is a repeal or a drafting artefact is **NY-A7**, not
  settled here.

**The proposed version states no effective date** (NY-A2). Under it, every date-of-service clause
is `undetermined` unless the determination supplies `proposed_effective_date`; the synthetic set
supplies one on 60% of determinations (2026-07-01 or 2027-07-01, the Board's own anticipated July
2027 among them) and leaves it unsupplied on 40%, so both states are measured.

---

## Harness self-check, before any divergence figure

[population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

`harness-selfcheck.mjs`, recorded verbatim in `HARNESS-SELF-CHECK.md` (re-run after the amendment):

> **Mutation:** `12nycrr/329-1.3/c/3/eighty-five-percent`, constant 85 set to 80, in memory.
> **Detected:** 38 of 600 determinations diverge, all on that clause (`equal -> not_equal`), no
> other clause moves; comparator exit 1. **Unmutated re-run:** 0 of 600 diverge on 0 of 74
> clauses; comparator exit 0. **Verdict: SHOWN FAILING, THEN CLEAN.**

---

## Divergence by clause (denominator 600 determinations)

[population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

`compare.mjs out/in-force.jsonl out/proposed-2026-01-14.jsonl`, rendered in full in
`DIVERGENCE.md`:

- **35 of 74 clauses** carry at least one diverging determination.
- **600 of 600 determinations diverge on at least one clause**; 437 of 600 on a result token, the
  other 163 only on clause absence. The 600/600 is a direct consequence of 27 clauses being
  absent from one version: every determination has, under the proposed version, 27 clauses it
  cannot rest on.
- The eight clauses that diverge on a token, with counts over 600:

| clause | diverge | largest transition |
|---|---|---|
| `12nycrr/329-1.1/schedule-in-effect-on-dos` | 98 | 35 `cited_edition_not_the_one_in_force -> undetermined` |
| `12nycrr/343.1/podiatry-dos` | 72 | 22 `cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force` |
| `12nycrr/333.1/psychology-dos` | 68 | 23 `cited_edition_not_the_one_in_force -> undetermined` |
| `12nycrr/348.1/chiropractic-dos` | 61 | 18 `cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force` |
| `12nycrr/329-4.1/a/acupuncture-dos` | 59 | 25 `cited_edition_not_the_one_in_force -> undetermined` |
| `12nycrr/329-1.3/c/1/pta-code-source` | 43 | 22 `codes_from_required_schedule -> codes_not_from_required_schedule` |
| `12nycrr/329-4.1/b/pt-ot-dos` | 41 | 22 `cited_edition_not_the_one_in_force -> undetermined` |
| `12nycrr/329-1.3/c/2/ota-code-source` | 34 | 18 `codes_from_required_schedule -> codes_not_from_required_schedule` |

- The other 27 diverging clauses are the absent ones: `absent in proposed-2026-01-14 600/600` each.
- The eight ungrounded clauses do NOT diverge between versions: the meaning is supplied or not per
  determination, identically under both.

**Every divergence is attached to a clause by construction**: the comparator has no record-level
"differs" that does not name the clause.

---

## Defensibility (denominator 600)

[population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

`defensibility.mjs out/in-force.jsonl` (re-run after the amendment; the population moved, see below):

```
  carry NO APPLIED BOUND:                         70/600 (11.7%)
  CITE A VERSION NOT IN FORCE (union):            444/600 (74.0%)
    (a) cite a register version other than in-force: 198/600 (33.0%)
    (b) cite a schedule edition not in force on DOS:  371/600 (61.8%)   [read off the replay's date-of-service clauses]
    both (a) and (b):                                 125/600 (20.8%)
  date-of-service clauses undetermined (NY-A1/NY-A2 unresolved, or DOS unsupplied): 25/600 (4.2%)  [counted under neither]
  no edition cited at all:                         31/600 (5.2%)  [counted under neither; it is a missing citation, not a wrong one]
```

**These figures describe the synthetic population and nothing else, and the caveat is structural:**
every figure is built with `figure(k, n, population)` and rendered only through `renderFigure`,
which refuses a figure without the population block or with a stale one; the marker every figure
carries also says REPOSITORY-INTERNAL, ruled 2026-08-24: no synthetic defensibility figure leaves
op-policy-engine in any form until an equivalent is computed over a real history. `check-figures.mjs`
fails any surface in this directory carrying one of these figures without the marker in its
section, or carrying a count over 600 that no current report produces (`FIGURE-CAVEAT.md` shows it
refusing). The generator cites the proposed register version on 30% of determinations, cites a
non-in-force edition on 40%, and draws dates of service from a ladder that includes dates before
the 2020-01-01 effective date; the 74.0% is the product of those parameters, and quoting it as an
operational rate would be a count under the wrong population. What the figure demonstrates is that
the register can COUNT the failure mode: a determination that cites a version not in force is
identified per determination, per clause, with the token that says why.

---

## Ambiguities: 9 registered, none resolved

`ambiguities.json`. Each names who would have to settle it. Two gate an evaluation (NY-A1, NY-A2);
the others bear on text, lettering, rounding or applicability.

| id | question, in one line | who settles |
|---|---|---|
| NY-A1 | which schedule governs a PT/OT service: 329-1.1 (medical) or 329-4.1(b) (PT/OT); both in force | the Board or an adjudicator; the ground rules (purchase) |
| NY-A2 | the proposed edition's effective date, not stated | the Board, by Notice of Adoption |
| NY-A3 | compilation vs the Board's restatement of current text (329-4.2(b) creation date; 333.2(b) phone and URL) | the Department of State's compilation, not retrieved |
| NY-A4 | which amendment added 329-1.3(d), and the lettering (a) to (e) | the Department of State's compilation |
| NY-A5 | rounding of 85 percent and 16 percent | the Board, or the ground rules (purchase) |
| NY-A6 | under the proposal, which document's RVU maximum (c)(4) preserves | the Board |
| NY-A7 | the proposal's restatements omit (e) and the telemedicine subdivisions: repeal or artefact | the Board at adoption; the compilation |
| NY-A8 | which DOH guidance makes pre-operative testing `required` | the Department of Health; the Board on a dispute |
| NY-A9 | whether the current schedule specifies any unit fee, so that 329-1.2 applies at all | the ground rules (purchase) |

Three of nine have their settling text in the purchased document. That is recorded as a
disposition of the ambiguity, not as unknown.

---

## Source findings for Boyd (not resolved, not acted on)

1. **The January proposal was superseded on 2026-08-21 by a revised proposal** (Notice of Revised
   Rule Making, State Register 2026-09-02), which changes the edition date from "December 30, 2025"
   to "August 2026" and reverts the behavioral health code set; it repeats the January text's
   omissions of (e) and the telemedicine subdivisions. Retained in `source/`, not encoded: the brief
   names the January amendment. A third version would be a projection of the same source file.
2. **The Board's page for the January proposal is gone** (404 on both hosts); the text was
   retrieved from the Internet Archive's capture of 2026-05-21.
3. **The official compilation (Westlaw, for the Department of State) refused retrieval** (403).
   The in-force text rests on LII plus the Board's own texts, and the three agree modulo typography
   on 329-1.3; the disagreements on other sections are NY-A3.
4. **LII does not carry 329-1.3(e)**, adopted 2026-04-22; the Board's adoption text is the only
   retrieved source for it.

---

## Harness and gates, what ran

[population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

- `_interpreter/validate.mjs` on both projected registers: **PASS, no rule failed** (R1 to R18);
  four R7 notes on structurally unreachable `conditional_requirement` tokens, which are facts about
  the sites.
- Coverage by set equality on a live run with empty facts: **74 of 74** and **47 of 47** clause
  ids emitted, nothing missing, nothing extra.
- `_phase0/parity.mjs --candidate=interpreter` over the three existing domains, after the
  interpreter gained `amount_fraction_of`: **PARITY: IDENTICAL, 120,052 record comparisons, exit 0.**
  The frozen oracle did not move. (Run before the amendment; the amendment changed no shared file.)
- Replay after the amendment: 600 x 74 = 44,400 records in force (waiting: none 41,783, meaning
  2,458, fact 152, judgment 7); 600 x 47 = 28,200 as proposed (none 25,725, meaning 2,143, fact
  332). `out/tally.json` carries every per-clause count.

**Clause never reaching a decided token on this population:** `12nycrr/329-1.2/departure-earned-portion`,
`not_applicable` on 600 of 600 (the proration branch is 10% of physician services and departure is
one of three termination values). Every other with-result clause reaches at least one decided or
attributed token. Reported so the count of clauses is not read as a count of clauses exercised.

---

## Amendment 2026-08-24: five uncited-definition terms re-encoded as ungrounded

[population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

Boyd's ruling: a term defined only in a document the section does not cite for it is stated
elsewhere and waiting on a meaning, not a fact the record supplies; encoding it as a supplied fact
computes an affirmative determination independently of the check that would justify it. Applied
to the sixteen operative terms of `INCORPORATION-COMPARISON.md` with the test "the citation is
missing, not the definition":

| term | clauses re-encoded | the citation that is missing |
|---|---|---|
| Region I to IV | `329-1.3/d/1/regional-fee` | the section names no document for the regions; their assignment is in the ground rules of the schedule incorporated by 329-1.3(a), which the section does not cite for it |
| required pre-operative testing protocol in accordance with Department of Health guidance | `329-1.3/d/2/billable-basis` | "Department of Health guidance", no title, date or locator (NY-A8) |
| services or activities otherwise reserved for PTs and OTs | `329-1.3/c/6/scope-not-expanded` | "by statute, and/or any applicable regulations promulgated by" three agencies, a class; Education Law 6738(a) cited in (c)(6)(i) as an example only |
| authorized | `329-1.3/c/supervision`, `329-1.3/e/supervision` | WCL 13-b and 13-k and 12 NYCRR Parts 324 and 325, none cited in these sections |
| unit fee for a definite treatment and period of aftercare | `329-1.2/unit-fee-on-transfer`, `agreed-proration-separate-bills`, `death-no-proration` | "the schedule", a gesture with no rule located; whether any unit fee exists is NY-A9 |

Five terms, eight clauses. **The sixth term of the comparison, the RVU maximum, was not a supplied
fact anywhere**: its only consuming clause, (c)(4), was already INCORPORATED_BY_REFERENCE, and
(c)(5) decides on the recorded priority without the cap's value. Nothing on it moved. **No seventh
term surfaced under the test**: the three terms defined nowhere retrieved (routine screening,
reliable testing, demonstrably different services) fail the test's premise, since there is no
defining document to be uncited; they are Molina's no-pointer class and are reported, not
re-encoded. Terms defined in a document the section does cite for them (the direct amount, the
Physical Medicine Section, Ground Rule 9 / Modifier 1B, Ground Rule 12(B), section 325-1.8, ACGME)
stay supplied facts.

Five fields left the fact schema (`covid.region`, `provider.supervising_authorized`,
`proration.unit_fee_specified`, `proration.unit_fee_amount`, `assistant.service_reserved_for_pt_ot`)
and became meanings under `resolutions.ungrounded_terms[term]`, declared in `facts.json` and checked
by the projector against the keys the evaluation trees consult, both directions. The generator
supplies each meaning 50% of the time, independently per term, a stated parameter.

**The split, over the eight clauses x 600 = 4,800 records (in force):** decided on facts alone 7;
`_on_supplied_meaning` 96; `undetermined` 2,461; `not_applicable` 2,236. Of the 2,461
undetermined, 122 are records where the clause would have applied, and 2,339 are records where the
interpreter's `ungrounded` emitter returned `undetermined` before testing applicability, which is
its ruled order (an unsupplied meaning is refused first; `_interpreter/interpret.mjs`, the
`ungrounded` emitter). The shared interpreter was not changed.

**The waiting-on-a-meaning rate:** 2,458 of 44,400 records in force (5.54%); 8.03% of the 30,600
records with a result domain; 583 of 600 determinations carry at least one record waiting on a
meaning. As proposed: 2,143 of 28,200 (7.60%). Molina's corpus rate was 2.8%; the figures are
reported as they came and were not reconciled to it. The NY rate is dominated by the emitter's
order and by the 50% supply parameter, not by the reach of the eight clauses: 122 of the 2,461
undetermined are on records where the clause applied.

**The population moved.** Removing five fields changed the generator's draw sequence, so this is a
different population (parameters sha256 ceb49c4d590d against 2268173b241c before), and the
pre-amendment expectation of roughly 139 records moving is not measurable on it. On this
population the records that the old encoding would have decided on a supplied fact are the 7
decided + 96 attributed + 122 would-have-applied undetermined = 225 of the 4,800.

**The three corrected claims, final wording.** (1) `clauses.json`, `12nycrr/329-1.3/d/1/regional-fee`,
`disposition_basis`: "The AMOUNTS are verifiable to the cent by a party holding zero schedule text.
The REGION is not a fact the record can supply: `Region I` to `Region IV` are used here and defined
nowhere in 12 NYCRR, and a provider's region is assigned by the schedule's ground rules, which the
section incorporates and does not cite for it. The region is the institution's supplied MEANING of
the term; unsupplied, the clause is undetermined and waits on a meaning; supplied, the record says
`equal_on_supplied_meaning` and names what it rests on." (2) The evaluation note no longer exists:
the `ungrounded` emitter carries no note, and the record's own sentences replace it, verbatim from
`evaluation.json ungrounded_terms`: unsupplied, "the regulation decides this outcome with
`Region I to IV`, a term it does not define and whose definition sits in a document the section
does not cite for it; no meaning has been supplied"; supplied, `rests_on: a meaning supplied by the
institution, not by the regulation or by any document it cites for the term`. (3) This file, the
property section above: the amounts are verifiable to the cent by a party holding no schedule text;
the region is the institution's meaning of a term the regulation uses once and never defines, and
the determination carries that in its result token. The direction changed twice: from "verifiable
to the cent" to "given the region" to "the region is a supplied meaning the record attributes".

---

## What changed outside this directory

- `_interpreter/interpret.mjs`: primitive `amount_fraction_of(part, whole, percent)`, exact, same
  result domain as `amounts_equal`. REUSE-LOG E36.
- `_interpreter/register.schema.json`: the primitive; the disposition `INCORPORATED_BY_REFERENCE`
  under `without_result_domain`. REUSE-LOG E37.
- `_phase0/build-register.mjs`: the disposition's `no_lane` default; two domain rows pointing at
  the projected version directories; two clause fields carried through (`incorporated_document`,
  `register_version_id`); the ambiguity field name taken from the domain row.
- `_conversion/misfit-report.mjs` hard-codes the no-result dispositions as `DEFINITIONAL` and
  `INSTRUCTION` (line 18) and will call the new one a misfit. NOT changed here; noted.

Design reasoning for the disposition and the primitive is in op-at-specs, branch
`session/nywc-incorporated-disposition`, not here.

---

## Stated limits

- **The applicability gates decide `not_applicable` on an absent `service.kind`** and on absent
  provider classes, the same shape the PSR gates have. The generator always supplies both. A real
  intake that omitted them would make every gated clause `not_applicable`, which is not "conforming".
- **Exact fractions.** `amount_fraction_of` applies no rounding (NY-A5). On this population 15% of
  fraction payments are one cent off by construction and read `not_equal`.
- **Two assistant lists** (`surgery.resident_assistants_billed`, `surgery.all_assistants_billed`)
  are supplied separately and their consistency is not checked.
- **A determination's `cites.register_version_id` is a claim the determination makes about
  itself**, checked by string equality against `in-force`. Nothing binds it to the edition it
  cites; the two are counted separately in the defensibility figure for that reason.
- **The population is synthetic and parameterised.** It measures what the register can decide and
  count, not what any payer's determinations do.

## Not built, by the stop condition

No console view, no demo, no CLI, no documentation beyond this findings file and the derived
reports. **Step 6 (the restatement as a third comparison) is not done: it waits on Atlas.** The
projector takes a third version as one more entry in `register_versions`, so the restatement
lands as data in the same file when it arrives.
