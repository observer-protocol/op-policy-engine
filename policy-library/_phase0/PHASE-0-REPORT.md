# Phase 0: the register becomes a specification

**Branch: `phase-0/register-interpreter`, taken from `origin/policy-library/fixture-revision-and-handoff` at `57b13bd`.**
That branch is PR #30, open and unmerged, so this is a stacked pull request and its base must merge
first. Nothing here is merged; merge is Boyd's action.

**One command for the whole claim:** `node policy-library/_phase0/gate.mjs`.

---

## 1. What was read

| path | what it is |
|---|---|
| `policy-library/_primitives/REUSE-LOG.md` | the numbered entries, E1 to E17 on arrival |
| `policy-library/_primitives/INVENTORY-AUDIT.md` | the primitive audit, its follow-up, the firmeza table move |
| `policy-library/_primitives/EVIDENTIAL.md` | the seventh category and the survey that declined to recategorise |
| `~/Downloads/build-roadmap-handoff-2.md` | sections 1, 2 and 4 |

Also read in full, because the schema had to be derived from them rather than designed and fitted:
`banxico-34-2010/{clauses,facts,primitives,ambiguities}.json` and `evaluate.mjs`, `cases.mjs`;
`psr-2017-752/{clauses,ambiguities}.json` and `evaluate.mjs`, `cases.mjs`;
`feca-2-0805/{clauses,ambiguities,defined-terms,undefined-terms}.json` and `evaluate.mjs`,
`cases.mjs`; `_corpus/{build,explore,explore-lib,coverage,space}.mjs`, `corpus.json`,
`coverage.json`.

---

## 2. The oracle, and the harness shown failing

**Frozen at `57b13bd`.** `policy-library/_phase0/oracle/MANIFEST.json` records the commit, the branch,
that the worktree was dirty and which paths, the seed, and a sha256 per frozen file.

The oracle is `JSON.stringify(output)` exactly as the hand-written evaluator produced it. Key order is
insertion order and is part of it, so a candidate that computes every result correctly and emits the
clauses in another order FAILS. Four populations, each named with what it was taken over:

| population | banxico | psr | feca | source |
|---|---|---|---|---|
| fixtures | 3 | 3 | 4 | each domain's `cases.mjs`, read through a spy rather than transcribed |
| corpus | 17 | 25 | **0** | `_corpus/corpus.json`. FECA has no slice; NOT_FOUND, not filled |
| sample-full | 250 | 250 | 250 | `_corpus/space.mjs`, seed 20260822, records 0 to 249, frozen VERBATIM |
| sample-wide | 40000 | 40000 | 40000 | the same stream, frozen as a 64-bit digest of the exact output bytes |

Frozen paths: `oracle/{banxico,psr,feca}.fixtures.inputs.json`, `…fixtures.out.jsonl`,
`oracle/{banxico,psr}.corpus.out.jsonl`, `oracle/{banxico,psr,feca}.sample.out.jsonl`,
`oracle/{banxico,psr,feca}.sample.digests.txt`, `oracle/MANIFEST.json`.

**A digest is a compaction of the bytes, not a summary of them.** On a wide-population mismatch the
harness re-runs the hand-written evaluator for that one record, CHECKS the re-run against the frozen
digest, and only then prints it as the oracle value. If the re-run disagrees it reports the oracle
UNREPRODUCIBLE and makes no statement about the candidate.

### The freeze's own provenance, recorded after the fact

**The oracle was frozen from a dirty tree.** At `57b13bd`, `policy-library` carried five untracked
files (`_sourcing/RETRIEVAL-CHECK-2026-08-21.md`, `_sourcing/poms-rs00202001.html`,
`_sourcing/visa-core-rules.pdf`, `feca-2-0805/source/ecfr_20cfr10.txt`,
`feca-2-0805/source/usc_ch81.txt`) plus the capture's own in-progress `_phase0/`, and the
repository root carried two more untracked files outside the manifest's scope
(`BANXICO-POLICY-INVENTORY.md`, `POLICY-ENGINE-PROVENANCE.md`). The manifest recorded the
policy-library portion and the freeze proceeded anyway.

**The frozen bytes' soundness therefore rests on a measurement, not on the tree having been
clean:** the read-trace at `policy-library/_phase0/fs-trace.cjs`, preloaded into the whole gate,
recorded 40 distinct paths read, every one under `policy-library` and none of the seven untracked
files among them, with a positive control first showing the instrument seeing reads of exactly
those files in every access mode it patches. Its stated limit: ESM module loading is outside its
reach, and none of the seven is a loadable module.

**The freeze now refuses.** `capture-oracle.mjs` exits non-zero on a dirty tree under
`policy-library`, ignored files included so an excludes-file edit cannot hide a file inside the
scope, and writes no manifest and no oracle. `--allow-dirty` overrides deliberately, and the
override plus the dirty paths at that moment are recorded in the manifest under
`freeze_discipline`. The oracle this report rests on predates the refusal and was NOT re-frozen
under it; this note is the record a later reader needs in order not to reconstruct that from pull
request comments.

**Shown failing on all four branches before anything was asserted on it passing**, transcript
generated rather than pasted at `_phase0/HARNESS-SHOWN-FAILING.md`:

1. one byte of `banxico.fixtures.out.jsonl` flipped at offset 836, `member` to `membfr`. It named
   record 0, the clause `34-2010/3.6/p4/signatory`, and both values.
2. a candidate diverging only on `overdue`, whose first instance is sampled record 526 and therefore
   past the verbatim set. It named the record and re-derived the oracle value under a checked digest.
3. one hex character of a frozen digest. It reported the oracle unreproducible and refused.
4. a moved input-stream digest. It refused to state a parity result at all.

**My own capture script had the estate's own class on its first run.** The clean-worktree check ran
`git status --porcelain -- policy-library` with the working directory already inside
`policy-library`, so the pathspec matched nothing and it reported clean unconditionally. Corrected
before the oracle was committed; the manifest now records the tree as dirty and lists the paths.

---

## 3. Per domain

| | clauses | re-expressed | with an evaluation | refused, no result domain | parity | records compared |
|---|---|---|---|---|---|---|
| **Banxico 34/2010 numeral 3.6** | 19 | 19 | 19 | 0 | **IDENTICAL** | **40,020** |
| **PSR 2017 reg 76 and dependencies** | 21 | 21 | 21 | 0 | **IDENTICAL** | **40,028** |
| **FECA PM 2-0805** | 59 | 59 | 35 | 24 | **IDENTICAL** | **40,004** |
| | **99** | **99** | **75** | **24** | | **120,052** |

**The population each count was taken over.** Per domain: 3, 3 or 4 committed fixture runs; 17, 25 or
0 corpus fact sets; and 40,000 records of the seeded stream from `_corpus/space.mjs` at seed
20260822, of which the first 250 are compared against frozen bytes and all 40,000 against a digest of
the frozen bytes. The 250 are the same records as the first 250 of the 40,000 and are not counted
twice.

**Identical means `JSON.stringify(candidate) === the frozen line`.** Clause set, key order, every
result token, every note string including the three-branch interpolated note on
`34-2010/3.6/p4/deadline`, and every extra field including FECA's `definition_applied`,
`rests_on`, `term` and `undetermined_because`.

**Zero throws over the whole population**, on either side, in all three domains. Throw parity is
therefore NOT exercised and no claim is made about it.

**What bounds the claim.** `_corpus/space.mjs` says of PSR and FECA that their fact domains *were read
off the evaluator, which is a weaker source than Banxico's declared kinds*. That does not weaken
parity, which feeds both sides the same inputs, but it does bound coverage: a fact the population
never varies would let both sides agree on `undefined` for a reason unrelated to either being right.
Checked, in both directions, by `_phase0/reads-graph.mjs`: **every one of the 24, 36 and 56 fact
paths the three registers read is varied by the population, and every field the population varies is
read by some clause.**

---

## 4. Where the three registers disagree

Reported, not merged by preference. Full text on both sides in **REUSE-LOG E26**. Six fields:

1. **the clause text field names the language in two of three** — `text_es`, `text_en`, `text`.
2. **`source_locator` and `source` carry different KINDS of thing** — a PDF page plus a numeral
   against a provision identifier, which is E3's finding showing up as a schema question.
3. **`assertion`** is on 78 of 99 clauses and on none of PSR, and it is doing translation in one
   domain and restatement in another.
4. **`disposition_basis`** is on 78 of 99 and on ONE PSR clause, so for 20 of 21 PSR clauses the
   register does not record why the category was chosen.
5. **`depends_on`, `governs` and `implements` are three DIFFERENT relations**, one of which points
   backwards along the dependency edge and one of which points outside the register entirely.
6. **the ambiguity readings field**: `competing_readings`, `readings`, and in FECA no field at all,
   which is why FECA's five ambiguities are inputs to nothing.

Plus one disagreement inside a single domain: `feca-2-0805/clauses.json` declares six categories and
**EVIDENTIAL is not among them**, while its own `evaluate.mjs` treats EVIDENTIAL as having a result
domain and `EVIDENTIAL.md` records five FECA clauses as EVIDENTIAL under the tight test.

---

## 5. What was added, and the source text that forced each

Nothing was added without an entry.

| addition | entry | the source text |
|---|---|---|
| `disjunction_over_results`, the fifth composition shape | **E18** | reg 76(1) chapeau read with reg 74(1) and 74(2): the bar is lifted by EITHER limb |
| `all_members_of_enumeration`, one primitive | **E19** | numeral 2.6 inciso a): `Los referidos factores deberán ser de entre los listados a continuación`, which closes the enumeration over the whole set of factors |

**No clause category was added.** The seven stand, and ILLUSTRATIVE is still not one of them.

`truthy` and `not` are expression operators at the layer of `eq` and `and`, not primitives and not
shapes. `INVENTORY-AUDIT.md` ruled that rendering a boolean into two of a clause's own result tokens
should stay unnamed because naming it adds inventory without adding reuse; that ruling is followed.

---

## 6. E17, built and shown

`force(node, ctx)` is the ONLY site in `_interpreter/interpret.mjs` that maps a node to a value.
Every primitive and every shape receives unevaluated NODES and decides in its own definition which to
force. `handler(force(a), force(b))` would have been the same eager evaluation one level up.

`_phase0/show-e17.mjs`, all four conditions hold:

1. one expression dispatch site, one clause dispatch site, one declaration of `force`.
2. E17's own case, precondition false in both rows with a meaning supplied: **`not_applicable` on
   both**, unattributed. Before the closure the second row read
   `not_applicable_on_supplied_meaning`.
3. `and` short-circuits, so a meaning behind a false conjunct is never consulted: **`breached`**, not
   `breached_on_supplied_meaning`.
4. over 40,000 sampled fact sets: `not_applicable_on_supplied_meaning` **0**,
   `breached_on_supplied_meaning` 9,607, `satisfied_on_supplied_meaning` 9,405.

**And what it does not remove, shown rather than claimed.** Writing the two conjuncts of
`feca/2-0805/3/e/differentiate` in the other order turns `breached` into
`breached_on_supplied_meaning` on identical facts. Recorded as **E20**.

---

## 7. The validator

`_interpreter/validate.mjs` against `_interpreter/register.schema.json`. **Neither is published, and
publication is not decided here.**

The closed vocabularies live in the schema as DATA and the validator reads them rather than restating
them. R12 derives a third copy from the interpreter's own implementation and compares in both
directions, so a vocabulary that has drifted from the code is reported rather than believed.

**All three registers pass. Twelve rules, every one shown firing** on a case written for it, in
`_phase0/show-validator.mjs`. R12 cannot be broken from a register and is perturbed at a copy of the
schema under the scratch directory instead.

The rules worth naming here:

- **R3** a clause cannot read a result emitted at or after its own position. Nothing checked this
  before; the dependency order was a property of the order `put()` happened to be called in.
- **R7** a remap over a closed result domain must be total, and over an open one must declare
  `$unmapped`. This is E6's ruling turned from a runtime throw on a reached token into a static check.
- **R8** no `cond` in a result may have a branch that is the bare literal `not_applicable` or
  `undetermined`. That is E8's closure enforced: those are `applicability_gate` and
  `guard_on_unresolved` written by hand, and E8 refused a general select-by-predicate beside them for
  exactly this reason.
- **R10** a decision table's rows must cover the product of its declared input domains, enumerated
  rather than counted. This generalises `check-firmeza-table.mjs` to any table in any register.

---

## 8. What this work retired, with the artifact that retired it

**Not on the basis that an interpreter exists.**

| entry | verdict | the artifact |
|---|---|---|
| **E7**, the disjunction not named | **RETIRED** | `_interpreter/interpret.mjs` op `disjunction_over_results`; `psr-2017-752/register.json` binding `not_barred`; `register.schema.json` `expression_ops.disjunction_over_results`. E7 named its own permit: *So would writing the truth table out.* Recorded as E18 |
| **E17**, attribution gated on a lexical read | **CONDITION MET, entry stands** | `_phase0/show-e17.mjs`, four conditions, and the single forcing site in `interpret.mjs`. The entry is not retired because it created **E20** |
| **E8**, select-by-predicate merged by form | **ruling now ENFORCED** | `register.schema.json` rule R8 and `validate.mjs`, shown firing twice in `show-validator.mjs`. The entry was already closed 2026-08-22; what changed is that its ruling is a check rather than a thing to remember |
| **E6**, two domains disagreeing about `denied` | **enforcement moved, entry already closed** | R7 checks totality statically for **16 of 29** remap sites. The other 13 are E23 |

### What it did NOT retire

| entry | why not |
|---|---|
| **E1** | closed 2026-08-22, before this block. The interpreter carries the closure in one place instead of two, which is not the same as retiring the entry |
| **E2** | `ordered_before` and `amounts_equal` are now implemented once and declared in the schema. The SHARED INVENTORY E2 is about, `banxico-34-2010/primitives.json`, still declares neither. Measured: 6 disagreements, listed in E22 and E26 |
| **E3** | untouched, and corroborated: E26 row 2 is the same finding arriving as a schema question |
| **E4, E10** | standing rules, in force. This block used E4's second trigger twice and E10's sentence test three times |
| **E5** | **NOT RETIRED, and it got worse before it gets better.** The three `evaluate.mjs` files still carry their own copies and ARE THE ORACLE, so nothing was deleted. The interpreter is a FOURTH copy of the primitive set until they are removed, and removing them is a deployment decision rather than this block's. E5's candidate fix 1, a drift check across the copies, is still not built |
| **E9** | the two reported-and-not-fixed Banxico clauses still read a recorded `false` and an unfilled field the same way. Byte identity required reproducing it. It is now a named op, `truthy`, with the standing 2026-08-21 ruling stated at it, rather than an inline ternary |
| **E11** | outside the interpreter entirely, as its own text says |
| **E12** | standing. Every report in this block names the branch it stands on |
| **E13** | **NOT RETIRED.** `check-claimed-effects.mjs` is unchanged and still keyed to prose. What exists now is the datum E13 asked for, derivable for all 75 evaluated clauses without anyone declaring it, and `_phase0/reads-graph.mjs`, which compares a declared list against a derived one in both directions. It compares `depends_on`. The instrument E13 is about is untouched |
| **E14** | a property of the wire format, untouched |
| **E15, E16** | op-mcp-payment-server and the shared-tree class. Outside this block's repository boundary |

---

## 9. New entries, E18 to E27

| | |
|---|---|
| **E18** | `disjunction_over_results` NAMED, on a change of representation. Closes E7 |
| **E19** | `all_members_of_enumeration` ADDED, the list lift of a primitive already in the set |
| **E20** | the gate is structural and operand ORDER inside `compute` is still an author's choice |
| **E21** | the corpus no longer reproduces: **11 of 17 Banxico and 25 of 25 PSR** stored result maps |
| **E22** | **five** definitions with no call site, and the audit's `the declared-and-never-called bucket is empty` has expired |
| **E23** | **no clause declares its own result domain**, so **12 of 29** remaps cannot be checked for totality |
| **E24** | the key an institution supplies a resolution by is in no register, and **3 of 17** registered ambiguities are inputs to anything |
| **E25** | the order a determination is reported in is a property of a program, and it is load-bearing for byte identity |
| **E26** | three registers, six fields, and the disagreements are not naming preferences |
| **E27** | a correction fixed the prose and left the structured field: **`p5/foreign-deadline` declares a dependency that runs the other way** |

---

## 10. The open questions section 4 of the handoff asks, answered where this work answers them

**Whether the interpreter is what ships to a client.** Not decided, and deliberately not decidable
from here: the interpreter is built so that shipping it is a deployment decision. What can be said is
that the register is not yet complete enough for it to be interchangeable, and **E23 is the specific
reason**: a register does not say what a clause can return, so a second implementation could not be
checked against the first except by running it.

**Whether the fact schema is part of the register.** It is, under its own top-level key with its own
`version`, per the pre-ruling. Two of three domains have no fact register at all, and that is
recorded as `NOT_FOUND` with a stated reason rather than filled in.

**What a register validates against, and whether that schema is published.** It validates against
`_interpreter/register.schema.json`, twelve rules, every one shown firing. **Not published, and this
block does not decide it.**

---

## 11. Not done, and why

- **Nothing merged.** Stacked on PR #30, which must merge first.
- **The three `evaluate.mjs` files are untouched.** They are the oracle for this phase.
- **The published encodings on main are untouched.** E21, E22, E23, E24, E26 and E27 all name defects
  in artifacts that are public on main, and every one is recorded rather than corrected.
- **`_corpus/corpus.json` was not regenerated.** E21.
- **The validator and its schema are not published.** Pre-ruled as a separate decision.
- **Throw parity is not established.** Zero throws were observed over 120,052 records, so there was
  nothing to compare.
