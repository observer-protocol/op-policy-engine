# What a conversion actually consumed, against what section 7 names

**Measured 2026-08-23. Population: every artifact in the three domain directories plus the shared
instruments (`_corpus`, `_primitives`, `_sourcing`, `_phase0`, `_interpreter`) at this commit.
Method: each artifact mapped to the conversion step that produced or checks it, then each of
section 7's seven steps classified by whether an INSTRUMENT covers it today, a SESSION AND A HUMAN
RELAYING covers it, or NEITHER does.**

| section 7's step | state today | the artifacts and instruments |
|---|---|---|
| derive-from-source | **partly instrumented** | source pinning and digests are instrumented (`source/PROVENANCE.md` per domain, `_sourcing/canonicalise-xml.mjs` for XML with the canonicalisation stated, `RETRIEVAL-CHECK` discipline). The DERIVATION itself, text to units, is a session |
| the fixed decomposition schema | **instrumented** | `_interpreter/register.schema.json` + `validate.mjs`, seventeen rules, every one shown firing; but `clauses.json` is authored and the validator sees it only after assembly into a register |
| disposition assignment | **session + human ruling** | no instrument assigns or checks a disposition against the text; R11 checks the token is declared, which is structure. The EVIDENTIAL survey and its stop condition were a session and Boyd |
| ambiguity registration | **session** | `ambiguities.json` authored; the register carries `resolution_key` (E24) but nothing detects an unregistered ambiguity |
| undefined-term detection | **session** | `undefined-terms.json` (FECA only) authored; no detector exists, and Banxico and PSR have no register of them, which is absence of a register, not evidence of absence of terms |
| divergence reporting | **instrumented, one domain** | `_corpus/restatement.mjs` + `disagree.mjs` + `disagreement.json`: an independent encoding of the restatement compared to the evaluator, Banxico only, because only Banxico has a restatement to diverge from |
| trace verification | **instrumented** | parity (120,052 records, byte), `check-coverage.mjs` per domain, `_corpus/coverage.mjs`, `reads-graph.mjs`, `check-claimed-effects.mjs` (prose-keyed, E13's stated limit), `check-firmeza-table.mjs` |

## The steps a conversion consumed that section 7 does not name, and this is the finding

1. **Worked-case authoring and revision** (`cases.mjs` per domain, revised against what the corpus
   reported unreached). Every domain has it; no step names it.
2. **Coverage measurement as a conversion output** (reachable against reached, `coverage.json`):
   the instrument that told the fixtures what they were missing.
3. **Primitive-set evolution and its log discipline** (REUSE-LOG entries E1 to E32,
   INVENTORY-AUDIT, the E4 wait rule): the largest single consumer of ruling attention across the
   three conversions, and section 7 does not name it as a step at all.
4. **Defined-term registration** (FECA `defined-terms.json`), distinct from undefined-term
   detection: what the manual defines elsewhere is neither an ambiguity nor an ungrounded term.
5. **Decision-table derivation and completeness checking** (firmeza; `check-firmeza-table.mjs`):
   the change of representation that found F1, which no amount of fixture-running would have.
6. **Misfit reporting** (now `_conversion/misfit-report.mjs`): every conversion produced at least
   one category the schema could not express, and the first FECA pass shows the suppression is
   silent, 37 units against 59 from one source.
7. **Evaluation-layer authoring** (`evaluation.json` per domain, post-Phase-0): the register's
   operative half, authored per clause; nothing in section 7's list corresponds to it.

## The cost and misfit instruments

`_conversion/cost-report.mjs` and `_conversion/misfit-report.mjs`, print-only, deriving what is
derivable and printing NOT_RECOVERABLE where the artifacts do not hold a figure. Their outputs are
not stored, per the `_totalCases` rule: a stored count drifts.
