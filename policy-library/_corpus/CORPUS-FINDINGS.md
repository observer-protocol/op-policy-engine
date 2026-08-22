# Forward-running corpus: findings

Facts first. Every result in `corpus.json` was computed by running the committed evaluator over the
facts beside it. **No expected result is asserted anywhere in this directory.**

Seeded and reproducible: `node coverage.mjs`, `node build.mjs`, `node disagree.mjs`.

---

## STEP 1: 58 of 134 reachable results are reached by any existing fixture

| | Banxico | PSR | both |
|---|---|---|---|
| clauses | 19 | 21 | 40 |
| distinct results the register can produce | 62 | 72 | **134** |
| distinct results the worked cases reach | 30 | 28 | **58** |
| **never reached by any fixture** | **32** | **44** | **76** |

**More than half of what these registers can say has never been observed coming out of them.** The
three Banxico worked cases and the three PSR ones were written to be interesting, and being
interesting is not the same as being wide.

### The sample saturated, so the 130 is a stable lower bound

| sampled fact sets | Banxico | PSR |
|---|---|---|
| 1,000 | **62** | **72** |
| 40,000 | 62 | 72 |

Nothing new appears between the first thousand draws and forty thousand out of a space of roughly 10^18 and 10^25
combinations. That is evidence the ladder of candidate values is adequate; **it is not a proof of
completeness**, and no sampling run could be. A result this instrument never produced is a result
nobody has seen, not a result that cannot exist.

## Where the candidate values come from, and the trap that was avoided

Values are drawn **per field, from the kind that field's own register declares**: an `enum` yields
its declared members plus a non-member, a `boolean` yields true, false, null and absent, a
`timestamp` yields a ladder of instants plus null, absent and malformed.

Timestamps are laddered **against the periods the register declares**, 45 and 180 days from the
aviso, 45 from delivery, 13 months, one business day. Knowing that a clause measures a 45 day period
is structural. Choosing which side of it to land on would be outcome-first, which is exactly what
the original demo generator did at `generate-banxico-corpus.mjs:391`, where facts were derived from
outcomes so that no case could exist in which determination and policy disagree.

**Nothing here consults an intended result.** The generator states facts; the evaluator states what
follows.

**PSR's domains are weaker evidence than Banxico's.** Banxico has `facts.json` with a declared kind
per field. PSR has no fact register at all, so its 33 field domains were read off the evaluator. That
is a worse source and is recorded as one.

## A finding from STEP 1, before anything was generated

**The Banxico fact register declares a judgment vocabulary the evaluator does not use.**
`facts.json` gives `dictamen.language_is_plain` the domain `['yes', 'no', 'not_assessed']`. Measured:

| recorded value | `3.6/p4/language` | firmeza |
|---|---|---|
| `yes` (declared) | `yes` | **`undetermined`** |
| `no` (declared) | `no` | **`undetermined`** |
| `not_assessed` (declared) | `not_assessed` | `undetermined` |
| `affirmed` (NOT declared) | `affirmed` | `not_attached` |
| `denied` (NOT declared) | `denied` | `attached` |

**An institution populating facts to the register's own spec gets `undetermined` on every judgment
clause.** Only the two undeclared tokens decide anything. One of the three declared values,
`not_assessed`, happens to agree.

This surfaced because the generator draws from the REGISTER rather than from the fixtures. Every
existing fixture uses `affirmed`, so nothing had ever exercised the declared vocabulary.

## STEP 2: results that are structurally unreachable, which is a third state

Sampling says what IS reachable. It cannot say what is not. These are unreachable **by reading the
call site**, and the sampler agreeing is corroboration rather than the argument.

`conditional_requirement` declares five outcomes after E1 widened it. Eight of its nine call sites
cannot produce all five:

| clause | reachable | cannot produce | why, from the call site |
|---|---|---|---|
| `34-2010/3.6/d/device-address` | 3/5 | `outstanding`, `undetermined` | passes a strict boolean |
| `34-2010/3.6/p4/channel` | 3/5 | `outstanding`, `undetermined` | passes a strict boolean |
| `34-2010/3.6/p5/expediente-copy` | **5/5** | none | passes a total remap of `elapsed_within` |
| `psr-2017/67/2/a/timing` | 3/5 | `outstanding`, `undetermined` | passes a strict boolean |
| `psr-2017/74/2/information-failure` | **2/5** | `breached`, `outstanding`, `undetermined` | the requirement operand is the LITERAL `true` |
| `psr-2017/75/4/supporting-evidence` | 3/5 | `outstanding`, `undetermined` | passes a strict boolean |
| `psr-2017/76/1/b/restore` | 4/5 | `outstanding` | remap emits `true`, `false`, `undetermined` only |
| `psr-2017/76/3/fraud-carveout` | 3/5 | `outstanding`, `undetermined` | passes a strict boolean |
| `psr-2017/76/5/b/pisp-compensates` | 3/5 | `outstanding`, `undetermined` | passes a strict boolean |

**16 clause-result pairs are structurally unreachable, not missed.** Reporting them as coverage gaps
would be wrong: a corpus cannot reach them and should not be asked to.

`psr-2017/74/2/information-failure` is the sharpest: its requirement operand is the constant `true`,
so the clause is a two-valued flag wearing a five-valued type. That is worth knowing before anyone
reads its `breached` as meaningful.

## STEP 3: all four known cases are reached, none special-cased

| case | reached |
|---|---|
| `expediente-copy` returning `outstanding`, requested and still in time | yes |
| Banxico `language` returning `denied`, distinct from `not_assessed` | yes, both observed as separate results |
| an unrecognised factor kind returning `undetermined` | yes |
| the PSR refund trigger returning `undetermined` on facts establishing nothing | yes |

None is targeted by the generator. Each falls out of drawing values by declared kind, because the
kind ladders include the states the fixtures never used: an absent delivery instant with a clock
supplied, the `denied` token, a non-member of the factor enumeration, and an absent notification.

**That is the whole argument for the instrument.** All four were found in the last three sessions by
reading code. All four would have been found by running this.

## STEP 4: the disagreement slice

Recorded determinations come from `restatement.mjs`, an independent encoding of the five divergences
catalogued in `../banxico-34-2010/DIVERGENCE.md`. **It never sees the evaluator's output.** It
implements the restatement's element table (which omits inciso a)'s verification method, D1), its
single 45 day period (which never applies the fifth paragraph's 180 days, D2), and its silence on
channel and signatory (D5).

Over 5,000 independently sampled fact sets: **460 agree, 4,540 diverge on firmeza.**

| share | cause |
|---|---|
| **86.4%** | **the restatement has no third state, so it records a determination where the source supports none** |
| 2.0% | D1: the element table omits the verification method, so a dictamen missing it still conforms |
| 1.8% | D2: the 45 day period applied to a foreign operation the fifth paragraph gives 180 days |
| 0.7% | D5: channel and signatory are not tested, so a dictamen failing one still conforms |
| 0.0% | unclassified, 1 case |

### The largest divergence is not on the divergence list

`DIVERGENCE.md` catalogues five clause-level divergences and calls two of them outcome-changing.
Measured against facts, those two together account for **3.8%**. The dominant cause is not a clause
at all: **the restatement's output vocabulary has no `undetermined`**, so on any fact pattern where
the source supports no determination it records one anyway.

A divergence review that reads two documents side by side finds differences of CONTENT. It does not
find a difference in what the two can EXPRESS, because that is not visible in any single clause
comparison. It took running both over facts neither author chose.

## The incidental finding, now fixed

Chasing the unclassified divergences turned up a fact pattern neither reading rejected. Measured
before the fix:

| | deadline | firmeza |
|---|---|---|
| aviso then dictamen, 29 days | `within` | `not_attached` |
| dictamen 16 days BEFORE the aviso | `within` | `not_attached` |
| dictamen SIX YEARS before the aviso | `within` | `not_attached` |

`elapsed_within` compared an interval against a limit, and a negative interval is under any limit, so
a dictamen that predated the complaint it answered read as delivered in time. **An incoherent record
passed as compliant.**

**Fixed 2026-08-22, inside the primitive.** It returns a new value, `out_of_order`, when the end
event or the clock precedes the event that starts the period. Tested inside rather than at the call
sites because all four sites in the two domains measure an end event that must follow its start, so
they do not differ, and a call-site guard would be forgotten on the fifth.

| | deadline | firmeza |
|---|---|---|
| aviso then dictamen, 29 days | `within` | `not_attached` |
| dictamen 16 days BEFORE the aviso | **`out_of_order`** | **`undetermined`** |
| dictamen SIX YEARS before the aviso | **`out_of_order`** | **`undetermined`** |

`undetermined` survives composition: the deadline clause reports the incoherence as its own state,
and firmeza declines to conclude from it. The two are kept apart from `no_end_event`, where the
record is coherent and only the clock is missing; here both instants are present and contradict
each other.

**The closed vocabularies caught it before any test did.** Adding the token made
`remap_result_domain` throw at the PSR trigger and the firmeza lookup throw on a missing row, each
naming exactly what was unhandled. A new primitive result cannot fall silently through a composition.

## What this corpus is not

It is **not a replacement for the three worked cases**, which stay exactly as they are.
`POLICY-ENCODING-REPORT.md` is public on main, its tables reconcile against live output, and nothing
here touches it.

It is **not a claim of completeness**. It is a lower bound that saturated, which is a different and
weaker thing.

And the recorded determinations are **one institution's reading of one regulation**, encoded from a
document about a restatement. A second institution would diverge differently, and the 78.3% figure
is a property of this pairing rather than of restatements in general.

## A second instrument: `absent-fact-sweep.mjs`

Added 2026-08-22 with E9. It asks, for every fact a predicate reads: **does making it ABSENT produce a
decided clause result?** A clause is taken to depend on a field when its result differs between the
field's two recorded values; the question is then what absence gives for those clauses.

**Its first version could not see the defect it was written for.** It compared the absent case against
the recorded-`false` case and skipped anything that matched, which is exactly the pair E9 says are
indistinguishable. Recorded in REUSE-LOG E9 rather than quietly repaired.

At the time of writing it reports **4 clause results across 2 facts**, down from 8 across 4 before E9
and the factor-list instance were fixed. Both remaining are reported in E9 and not fixed: closing them
needs `open_set_floor` to carry a third state, which is a primitive widening and its own decision.
