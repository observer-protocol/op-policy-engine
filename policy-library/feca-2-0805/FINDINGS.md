# FECA PM 2-0805: re-derivation under the extended schema

Re-derived from `source/ch_2-0805.txt` on 2026-08-23, not reworked from the first pass. The first
pass is kept at `clauses.first-pass.json`.

**No stop condition fired.** 1 of 59 clauses fits no category, 1.7%, against a 10% threshold. No
Banxico or PSR disposition needed changing.

---

## STEP 1: the extended schema

| category | what it carries | result domain | how the evaluator must treat it |
|---|---|---|---|
| MECHANICAL | a test against recorded facts | the primitive's own | evaluate |
| JUDGMENT | a standard with no test | `affirmed` / `denied` / `not_assessed` | evaluate, taking the judgment as an input |
| CONDITIONAL | an obligation arising only under a precondition | plus `not_applicable` | evaluate |
| DERIVED | a composition of other clauses' results, reading no fact | the composed domain | evaluate |
| **DEFINITIONAL** | a meaning other clauses consume | **none of its own** | **not evaluated to a result.** It parameterises other clauses, and the run must be able to report which definition was applied |
| **INSTRUCTION** | a directed act | **NONE** | **must refuse to evaluate.** Throw or omit; never assign a result |

**INSTRUCTION is a different kind of thing from the other five**, and the refusal is the point. A
clause with no result domain that nonetheless returns something is the defect class this estate keeps
finding: it is E1's collapse, D3's disjunction and the floor's open-ended projection, one layer up.
Assigning `satisfied` to `Ask the claimant to provide a factual statement` would assert that a claim
fact makes it true, and none does.

**A consequence, recorded before it bites.** `check-coverage.mjs` compares the register's clause ids
against the ids a live run emits, by set equality. **Eleven INSTRUCTION clauses will never be
emitted**, so the coverage check as written would report them MISSING and exit 1. The check needs to
know the distinction before an evaluator exists, and it is the register that must tell it.

**ILLUSTRATIVE does not enter**, on one instance in one domain. Candidate treatments, none taken:
carry it as a clause with an explicit `no_category` marker so the count stays honest; move it out of
the register into a worked-examples file; or drop it and lose the fact that a fifth of paragraph 4 is
illustration. The first is what is in place.

### The two existing domains, checked against the extension

**No Banxico or PSR clause is DEFINITIONAL or INSTRUCTION.** Every clause in both registers states a
condition that must hold. Neither document tells anyone what to do next, which is the difference the
category was added for. **The extension therefore requires no change to either**, and the stop
condition does not fire.

**One incidental finding, reported and not changed.** `psr-2017/67/4/series-withdrawal` is dispositioned
DERIVED with the basis `Reads no fact of its own`. The evaluator reads
`f.consent?.series_withdrawn_at` directly at `evaluate.mjs:175`. **The stated basis is false against
the code**, and the clause is CONDITIONAL or MECHANICAL rather than DERIVED. This is a finding about
the PSR conversion and predates the extension. Awaiting a ruling.

## The fourth thing: UNGROUNDED

**A term the document decides outcomes with and supplies no meaning for, here or by reference.**

That sentence mentions neither syntax nor return type, which is E10's test. **`UNDEFINED` was
rejected** because it is a claim relative to a location: `physician` is also undefined *here* and is
perfectly grounded, because the chapter cites 5 U.S.C. 8101(2). The distinction that matters is not
where a definition is absent but whether one is reachable at all.

**Distinct from ambiguity, and the register was wrong about this.** An ambiguity is a text permitting
two readings, resolved by an institution choosing one. An ungrounded term supplies no reading and
there is nothing to choose between. `rationalized medical opinion` was registered as ambiguity F6.
It has been moved, and the ambiguity count drops from 6 to 5 rather than being padded to preserve the
symmetry with the other two domains.

Three terms, in `undefined-terms.json`:

| term | pointer | what turns on it |
|---|---|---|
| **`rationalized medical opinion`** | **none** | whether a claim outside the clear-cut traumatic band can be accepted at all |
| `independent intervening cause` | partial: a case is cited for the presumption, not for the defeater | whether a later off-duty injury stays inside an accepted claim |
| `chain of causation` | none | whether a disability after a second injury is still related to the original |

`defined-terms.json` previously held all three with `where_defined: NOWHERE`, which is a contradiction
a register of defined terms should not have been able to express.

**The evaluator treatment, recorded for when one is built:** a clause resting on an ungrounded term
cannot be evaluated to satisfied or breached from the document alone. It returns `undetermined` unless
an institutional resolution supplies the meaning, on the same discipline ambiguities already follow.
Three clauses carry `rests_on_ungrounded_term`.

## STEP 2: the two decompositions side by side

| disposition | first pass | re-derived |
|---|---|---|
| MECHANICAL | 14 | 14 |
| JUDGMENT | 6 | **13** |
| CONDITIONAL | 6 | 7 |
| DERIVED | **0** | **1** |
| DEFINITIONAL | 6 | **12** |
| INSTRUCTION | 4 | **11** |
| ILLUSTRATIVE | 1 | 1 |
| **total** | **37** | **59** |

**0 clauses were genuinely dropped. 8 were renamed with the same subject. 22 are genuinely new.**

**Three dispositions changed, and all three are the schema working:**

| clause | first pass | re-derived | which |
|---|---|---|---|
| `3/a/physician` | MECHANICAL | DEFINITIONAL | **schema.** It supplies the meaning every clause requiring a physician opinion consumes. The first pass had nowhere to put that, so it recorded the membership test the definition implies |
| `3/a/2/psychologist` | MECHANICAL | DEFINITIONAL | **schema.** It extends the scope of a defined term for one condition class |
| `7/b/intervening` | JUDGMENT | DEFINITIONAL | **schema.** The first pass merged the definition of an intervening injury with the judgment about breaking the chain. They are now two clauses, one of each |

**The 22 new clauses are the first pass being wrong, and in one direction.** Eleven are INSTRUCTION
and six are DEFINITIONAL or JUDGMENT units the first pass compressed into a neighbour because the
schema gave them nowhere to sit. **A schema that cannot express a category does not merely
mis-label it, it suppresses the count**, and the first pass under-reported the chapter by more than a
third while producing a disposition split that looked plausible.

## STEP 3: the case-law exposure, recorded as a finding

Three clauses rest on ECAB decisions **cited by holding, not quoted, and not in the retrieved set**:

| clause | decision | what it supplies |
|---|---|---|
| `2/b/1/baseline-carveout` | James L. Hearn, 29 ECAB 278 | that inability to return to the original job does not extend a temporary aggravation |
| `3/a/3/chiropractor` | Loras C. Digmann, 34 ECAB 1049 | the subluxation-plus-x-rays condition |
| `7/a/natural-consequence` | Sandra Dixon-Mills, 44 ECAB 882 (1993) | the natural-consequence presumption itself |

**Two of the three supply content the chapter uses and does not define**, and one of those,
`independent intervening cause`, is the sole exception to a presumption the chapter states as a rule.

**Not retrieved, and the exposure is the point.** The chapter's operative content is not bounded by
the chapter, nor by the statute and regulation pinned beside it. Part of it lives in adjudicated
decisions the document names in passing. **In an institution's own manual the equivalent is
precedent nobody wrote down**: decisions taken once, cited by memory, and load-bearing. A conversion
that pins the manual and both statutory sides can still be resting on something nobody has counted,
and neither of the first two domains had this exposure at all.

## STEP 4: does DERIVED being empty survive?

**No, and the correction matters more than the original claim.**

| | FECA 2-0805 | Banxico | PSR |
|---|---|---|---|
| DERIVED clauses | 1 of 59 | 3 of 19 | 4 of 21 |
| share | **1.7%** | 15.8% | 19.0% |

The one is `3/d/applicability`: *If the circumstances noted above in 3c do not apply, the CE should
determine whether a medical report is contained in the file.* It reads no fact of its own. It reads
**the result of 3c** and gates the whole of paragraph 3d. The first pass missed it by treating the
sentence as connective tissue rather than as a clause.

**So the claim that a manual never composes its own determinations is false, and the defensible claim
is narrower: it composes about a tenth as often.** That is a real difference and it survives the
correction, but it is a difference of degree.

**What does survive absolutely is the other direction.** Zero of 40 clauses across Banxico and PSR are
INSTRUCTION, against 11 of 59 here. A rule addressed to an institution states what must be true; it
never tells an officer what to do next. **That asymmetry is total, and it is the one to build on.**

The honest form of the finding: composition is not a property that rules have and manuals lack. It is
a property both have, that rules exercise ten times more, **and the reason is visible in the
instruction count**. A manual can leave composition to a person because it is addressed to one and can
direct that person's next act. A regulation has no one to direct, so anything it wants composed it
must compose in its own text.

## Not built

No evaluator, no worked cases, no reuse figure, as scoped. Nothing is committed and no other domain
was changed.


---
---

# The evaluator, 2026-08-23

Built. No new primitive, no worked case changed anywhere else, every check green in all three domains.

## The three categories that produce no result

**All 59 clauses are emitted; 35 carry a `result` and 24 do not.** Emitting them is deliberate:
coverage by set equality still holds, and the absence of a `result` key is what stops anything
downstream reading one.

**INSTRUCTION is refused, not omitted, and not thrown at emit time.** Throwing would kill every run,
because instruction clauses always exist. Omitting would leave `out[id]` undefined, which reads as a
missing clause rather than a refused one. So the entry exists and carries
`{ refused: 'INSTRUCTION', why: ... }`, and **`resultOf()` throws if anything asks for a result**:

```
feca/2-0805/7/a/1/claimant-statement   => THREW: ... is INSTRUCTION and has no result
feca/2-0805/3/a/physician              => THREW: ... is DEFINITIONAL and has no result
feca/2-0805/4/a/difficulty-factors     => not_assessed
```

An accessor that returned `undefined` for the first two would be the silent failure this estate keeps
finding, one layer up.

**`put()` refuses at the source too.** Assigning a result to a clause the register says has no result
domain throws, so the refusal does not depend on anyone remembering it at the call site.

**DEFINITIONAL clauses report what they supply**, and each consuming clause records
`definition_applied`. In case 1, `3/medical-issue` and `3/a/3/chiropractor` both record that
`3/a/physician` was the definition applied.

## check-coverage.mjs was taught the distinction, and shown failing on both sides

It reads each clause's declared category and expects a result **exactly** where a result domain
exists. Passing:

```
PASS  the evaluator emits exactly the register (59)
PASS  all 35 clauses WITH a result domain produced one
PASS  all 24 clauses WITHOUT a result domain produced none
      correct absences: 12 DEFINITIONAL, 11 INSTRUCTION, 1 ILLUSTRATIVE
```

**Shown to fail on a real miss:** deleting one `put` for a JUDGMENT clause gives
`FAIL all 35 clauses WITH a result domain produced one <<< feca/2-0805/4/a/difficulty-factors [JUDGMENT]`.

**Shown to fail on the stop condition:** making the refusal path emit a result gives
`FAIL all 24 clauses WITHOUT a result domain produced none`, naming all twelve INSTRUCTION and
ILLUSTRATIVE clauses.

This is a **fourth copy** of a check that exists in three domains, and E5 already records that copies
drift. The Banxico and PSR copies still compare id sets by equality, which is correct for domains with
no INSTRUCTION clauses and would be wrong the moment one appeared.

## What the evaluator does with an ungrounded term, and whether it is right

A clause whose operative requirement is ungrounded returns **`undetermined`**, with the reason on the
row, unless a meaning is supplied in `resolutions.ungrounded_terms`. **The evaluator never supplies
one.**

Case 2, an occupational pulmonary claim, run twice on identical facts:

| | `3/d/2/rationalized` | `3/e/differentiate` |
|---|---|---|
| no meaning supplied | `undetermined` | `undetermined` |
| a meaning supplied | `satisfied` | `not_applicable` |

**Is that right? Mostly, and there is one thing about it I would not defend.**

The mechanism is right: a meaning is an input, never a default, which is the discipline ambiguities
already follow, and a run that used one records `depended_on_supplied_meaning`.

**What I would not defend is treating the two as the same act.** Resolving ambiguity A1 in Banxico is
an institution choosing between two readings the source permits. Supplying a meaning for
`rationalized medical opinion` is an institution **writing a rule the document does not contain**, and
calling the result `satisfied` afterwards makes the run look like it applied the chapter when it
applied the institution. The evaluator keeps the two fields distinct, which is the minimum. It does
not mark the RESULT as institutionally sourced, and it probably should: a decision resting on a
supplied meaning is a different kind of determination from one resting on the text, and only the
provenance field currently says so.

**Four clauses are affected**, all through `rationalized medical opinion`, `independent intervening
cause` and `chain of causation`.

## Worked cases: three, not generated

**The corpus generator does not fit this domain, and it was tested rather than assumed.** Two reasons:

1. It draws candidate values **per field from the kind that field's register declares**, and this
   domain has no fact register. Domains would have to be read off the evaluator, which is the weaker
   source PSR already uses.
2. Measured: its explorer reads `v.result` from every emitted entry. Against this evaluator it
   **records all 24 no-result-domain clauses as having a result of `undefined`**, which is exactly the
   silent failure the refusal was built to prevent. Adapting it is a change to an instrument three
   domains share and is a decision rather than a fix.

So the three cases are written against the register's own domains, facts first, results computed.
**Case 2 turns on an ungrounded term** and is run with and without a supplied meaning, so the report
shows what happens when a document decides an outcome with a word it never defines.

## STEP 3: reuse

**Zero NEW. Zero PARAMETERISED. Ten operations, all reused.**

| operation | origin | clauses |
|---|---|---|
| `held_judgment` | Banxico | 15 |
| `conditional_requirement` | Banxico | 13 |
| `applicability_gate` | composition shape | 5 |
| `remap_result_domain` | composition shape | 5 |
| `all_present` | Banxico | 4 |
| `field_present` | Banxico | 3 |
| `conjunction_over_results` | Banxico | 1 |
| `ordered_before` | PSR | 1 |
| `member_of_enumeration` | Banxico | 1 |
| `none_of_class_present` | Banxico | 1 |

Instrumented by tracing a live run and attributing top-level calls to clauses, not by a hand-authored
field. Every one of the 35 evaluated clauses is served.

### Whether the primitives serve a manual, and where they do not

**They serve everything a manual has that behaves like a regulation, and nothing else.**

The set derived from two regulations covers **35 of 35 evaluable clauses with nothing added**, which is
the strongest transfer result in the estate. But those 35 are **59% of the chapter**. The other 24
clauses are not poorly served; they are **not the kind of thing a primitive evaluates**. A primitive
takes facts and returns a value in a domain. A DEFINITIONAL clause supplies a meaning and an
INSTRUCTION clause directs an act, and neither has a value to return.

**So the honest finding is not a coverage figure but a boundary.** The primitive layer transfers
across document classes without modification, and it transfers only onto the part of a document that
states conditions. What a manual adds beyond a regulation is precisely what primitives cannot touch.

The usage profile shifts even where it transfers: **`held_judgment` is the most-used operation here at
15 clauses**, where in Banxico it served 3. A manual addressed to a decider is dense in the one
primitive that records that a person, not the document, decided.

## Not done

Not committed. No reuse rate is quoted outside this file. The Fannie Mae files were not touched.


---
---

# Ungrounded terms reach the result, 2026-08-23

**RULED: a determination that reached `satisfied` on a supplied meaning is not the same kind of result
as one that reached it from the chapter, and the result must say so.**

The operation is **`attribute_to_supplied_meaning`**. Its E10 sentence: **it marks a determination as
resting on a meaning the institution supplied rather than on the document.** Neither syntax nor return
type. `qualified` and `flagged` were rejected for saying how the token looks rather than what the
operation does; `institutional` for naming the supplier rather than the act.

Observed, identical facts, run twice:

| | `3/d/2/rationalized` | `3/e/differentiate` |
|---|---|---|
| no meaning supplied | `undetermined` | `undetermined` |
| a meaning supplied | **`satisfied_on_supplied_meaning`** | `not_applicable` |

**Attribution is gated on the meaning actually being read**, through a proxy that records access. The
second column is a plain `not_applicable` because that clause's precondition failed before the meaning
was reached. Attributing it would have overstated the institution's reach, which is the same error in
the other direction.

**And a composition cannot launder it.** `satisfied` and `satisfied_on_supplied_meaning` are different
tokens, so `remap_result_domain` throws on the second unless a downstream clause has decided what it
means there. An attributed determination cannot become an unattributed one by being composed.
