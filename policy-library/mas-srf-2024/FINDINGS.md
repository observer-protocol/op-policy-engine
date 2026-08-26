# Findings: encoding the Shared Responsibility Framework

Session CORPUS-SRF, 2026-08-25. Register directory `policy-library/mas-srf-2024`. Numbered so
that other artifacts (clauses.json, ambiguities.json, the SCALE session's pre-log) can cite them.
Every count states its population. Nothing here is a measurement of any bank, Telco or claimant.

## What was encoded, and from what

Two current MAS documents, retrieved from `mas.gov.sg` and pinned by digest (SOURCES.md,
source/PROVENANCE.md): the Guidelines on Shared Responsibility Framework (issued 24 October 2024,
effective 16 December 2024) in full, and the paragraphs of the E-Payments User Protection
Guidelines (amended 24 October 2024) that the SRF names or depends on.

**Register: 104 clauses** (population: clauses.json). By disposition: 29 MECHANICAL, 23
CONDITIONAL, 16 DERIVED, 12 JUDGMENT, 14 DEFINITIONAL, 10 INSTRUCTION; 80 carry an evaluation, 24
refuse a result by category. By duty holder: fi 37, telco 11, account_holder 13, account_user 3,
none 40. By tier: scope 14, fi 26, telco 11, consumer 6, process 26, none 21. Fact vocabulary:
92 paths (facts.json). Ambiguities: 30 registered, 0 resolved (ambiguities.json); two (A3, A5)
are wired as guards. Ungrounded terms: 2 (`designated database`; `default industry-baseline
transaction notification threshold`).

**The waterfall** is the register's emit order: scope (`srf/7.1.1/relevant-claim`) then the five
FI duties and `srf/6/fi-tier`, then `srf/7.7/perpetrated-through-sms` and the three Telco duties
and `srf/6.4/telco-bears`, then `srf/6.7/outcome`. Three properties, each checked rather than
asserted:

1. **No default to discharged.** On empty facts every one of the 80 evaluable clauses is
   `undetermined` (60 waiting on a fact, 14 on a judgment, 2 on a meaning, 2 `missing_operand`,
   2 `no_end_event`); nothing decides (`check-coverage.mjs`; the interpreter on `{}`). Every
   boolean fact is read through a presence guard; every precondition's facts are guarded before
   `conditional_requirement` may answer `not_applicable`.
2. **The consumer outcome rests on affirmative findings only.** `srf/6.7/outcome` is a 36-row
   decision table; the two rows that yield `account_holder_bears` require `fi_not_liable` (itself
   two affirmative findings, 6.2 and 6.3) and `telco_not_liable` or `not_applicable` (an affirmative
   `not_sms` from 7.7). A duty that never arose composes only under a supplied resolution of A3;
   unresolved, `srf/6.4/a/fi-complied-all` is undetermined and the waterfall stops at the FI tier.
3. **Undetermined on any duty blocks the tier.** `fi-complied-all` is a conjunction in which
   undetermined dominates; `telco-bears` decides the duty question before reading causation or 6.6
   (found by scenario 5, F-13). The one direction that does NOT block is an established breach:
   `fi_bears` closes the waterfall even if another FI duty is undetermined (6.5), which is the
   tier terminating, not advancing.

**Parity and the gate.** The hand evaluator (`evaluate.mjs`) and the interpreter over
`register.json` agree on every record, waiting axis included, over the oracle frozen at commit
64abe3c (`_phase0/oracle/MANIFEST.json`): fixtures 6, sample-full 250, sample-wide 40,000
(`_corpus/space.mjs` SRF_FIELDS and SRF_RESOLUTIONS, seed 20260822); `parity.mjs
--candidate=interpreter --domain=srf`: 40,006 record comparisons, IDENTICAL. `_phase0/gate.mjs`
with the fourth register added: ALL SEVEN STEPS PASS (validator over four registers, every rule
shown firing, E17, the adoption chain, every fact path varied, hand-vs-oracle identity,
interpreter-vs-oracle). Reached after F-11 and F-16. [population: synthetic; the sampler varies
every declared fact path over its declared domain and no outcome was targeted]

## Numbered findings

**F-01. Source: the third named document is version-ambiguous. STOP CONDITION 1, reported.**
"Annex: Duties of FIs and Telcos under the SRF" exists on `mas.gov.sg` only as Annex A to the 25
October 2023 consultation media release (4 FI duties, superseded wording). The current Guidelines
carry no annex; the duties are 4.2 and 5.2 of the body. Handled by building from the two current
documents and pinning nothing to the annex (SOURCES.md). Whether that handling stands is Boyd's.

**F-02. Scope: EUPG detail deferred.** The register encodes the SRF in full and only the EUPG
paragraphs the SRF names or depends on (23 EUPG clauses). Not encoded: EUPG 1.1 to 1.4, 3.2 to
3.13, 3.16, 3.19, 4.1 to 4.6, 4.8, 4.12, 4.13, 4.15 to 4.18, 4.22 to 4.29, 5.1, 5.3, 5.4, 5.6 to
5.9, all of Section 6 (erroneous transactions), all of Section 7 (disputed investigations), 8.2 to
8.6. Under the brief's ~150-clause rule the full EUPG (an estimated 90 to 110 further clauses)
would have crossed it; the brief names "trim to SRF-only (defer EUPG detail)" as the response, and
this is that trim, taken without waiting because the SRF's own text is complete without it. The
Section 6 waterfall reads none of the deferred paragraphs.

**F-03. Pipeline: `duty_holder` and `tier` do not reach register.json.** They are fields of
clauses.json; `_phase0/build-register.mjs` copies a fixed list of clause fields and drops them.
Pre-logged by the SCALE session (shared memory, 2026-08-25). NOT FIXED this session by instruction;
a consumer reads them from clauses.json. Consequence for the record format: see F-07.

**F-04. Record format (v7): an ungrounded-term record is emitted before applicability.** The
`ungrounded` emitter checks for a supplied meaning before it forces `applies` (the interpreter's
ruled order, `_interpreter/interpret.mjs`). So on a WhatsApp scam, `srf/5.2.3/designated-database`
reads `undetermined, waiting: meaning, "the operative term designated database is ungrounded"`,
and for a holder who set their own threshold `eupg/2.1/transaction-notification-threshold/b`
reads the same, though neither clause could apply. The outcome is unaffected (both are read
through gates that never reach them), but the record says the claim waits on a meaning it does
not need. v7 has no field to say "would not have applied". LOGGED, NOT CHANGED.

**F-05. Primitive set: four measurements the instruments make are not expressible.** The 12-hour
cooling-off floor (4.2.1), the S$50,000 balance and 50% outflow of footnote 8, the 24-hour hold of
4.2.5(b), and the S$1,000 capability of the protected-account definition need an ordered
comparison over amounts or durations, a fraction, or an hours unit; the set has `amounts_equal`,
`elapsed_within` in days and months, and nothing else numeric. Nine clauses are therefore held
judgments or recorded flags where the text is mechanical: `srf/4.2.1/cooling-off` (two
judgments), `srf/4.2.5/fn8/rapid-drain`, `srf/4.2.5/response` (the 24 hours untested),
`srf/2.1/protected-account/b/balance-or-credit` (a capability flag),
`eupg/2.1/transaction-notification-threshold/a` and `/b` (the comparison as a judgment),
`srf/7.13/fi-credits` and `srf/7.14/telco-credits` (the amount uncompared). Each says so in its
`disposition_basis`. NO PRIMITIVE WAS ADDED: the closed set is a schema decision, and a domain
adding operations for its own convenience is the pattern the estate refuses.

**F-06. Source: IMDA's Directions prevail and were not retrieved.** SRF 5.1 subordinates the three
Telco duties to IMDA's Directions under s.31 of the Telecommunications Act. They are not on
`mas.gov.sg` and were not fetched under the brief's source rule. The register evaluates the SRF's
wording; an inconsistency, if any, is invisible to it. `srf/5.1/imda-directions-prevail` is
INSTRUCTION.

**F-07. Record format (v7): no field names the tier or the duty holder a record belongs to.** An
SRF determination is a claim-level outcome reached through tiers; the v7 record is per clause and
carries `lane` (who produces the determination) and `waiting` (what it waits on), never whose duty
the clause states or which tier it sits in. A reader of the run must join the clause id back to
clauses.json (F-03) to say "the claim is stopped at the FI tier on a duty of the FI". The Molina
generator's artifact put this beside the records as `mapping.stoppedAt`, outside v7. LOGGED, NOT
EXTENDED.

**F-08. Record format (v7): supplied-meaning attribution does not propagate.** A clause resting
on a supplied meaning emits `<result>_on_supplied_meaning` with `rests_on` and `term`. A clause
that reads it composes the token and emits a plain result: `srf/4.2.3/above-threshold` carries the
token through, but `srf/4.2.3/outgoing-transaction-notification`, `srf/5.2.3/duty`,
`srf/6.4/telco-bears` and `srf/6.7/outcome` say nothing about resting on an institution's
meaning of `designated database` or of the baseline threshold. A consumer outcome of
`account_holder_bears` can rest on both and the record does not say so. v7 has no field for it on
a derived record. LOGGED, NOT EXTENDED.

**F-09. Record format (v7): a run blocked on an unresolved ambiguity reads "waiting on a fact".**
The waiting axis has five values and none is "an institution must choose a reading"; the
interpreter's stated fallback lands it on `fact` (`_interpreter/WAITING-AXIS.md`, a known limit).
Here it matters more than elsewhere: the two guards that decide whether the waterfall can advance
(A3 on `srf/6.4/a/fi-complied-all`, A5 on `srf/5.2.3/duty`) are exactly this state, and scenario 5's
record says `undetermined, waiting: fact` when nothing gatherable would change it. LOGGED, NOT
EXTENDED.

**F-10. Pipeline: `$decided_on_absence` on a decision-table row was dropped by the builder.** R15
requires the annotation on any row keyed on an absence-class input that yields a decided outcome,
and the validator reads it from register.json; `_phase0/build-register.mjs` copied only `outcome`,
`note` and `reading`, so no register could have satisfied R15 with a table row (no earlier register
had such a row). Fixed by one additive line on this branch; the three prior registers rebuild
byte-identical. The rows that need it: `srf/6.2/fi-bears` row 5, `srf/6/fi-tier` rows 2 and 6,
`srf/6.7/outcome` rows 3, 15, 19 to 23.

**F-11. The hand evaluator had an eager-evaluation defect, found by parity.** `allReq` evaluated
both held judgments before composing where the register's `or` stops at the first `denied`; 92 of
3,006 records differed, all on `srf/4.2.1/cooling-off` and `srf/6.6/subscriber-not-account-holder`,
all on the waiting axis of a decided `breached` (`judgment` against `none`). Fixed to evaluate
lazily in the register's order; 0 of 40,006 after. The control fired on the real condition before
it was trusted.

**F-16. The scratch parity harness counted identical throws as agreement.** Before the oracle
freeze, a session harness compared the two implementations over 40,000 samples and reported 0
disagreements while both were THROWING on the same input class (`undetermined_on_supplied_meaning`
reaching a remap with no such key: a `not_assessed` judgment under a supplied baseline meaning).
The capture (`capture-oracle.mjs`, sample-full population) refused to freeze it. Fixed in the
register (the meaning is consulted only inside the decided arms of the judgment) and in the
harness (any throw is a defect). A comparison that treats "both failed the same way" as agreement
is a gate that cannot trip on the failure it was built to catch.

**F-12. Source: a one-day date difference between the EUPG landing page and its PDF.** "Last
Revised Date: 25 October 2024" against "[Amended on 24 October 2024]". Not a version ambiguity
(one current PDF; the prior version marked cancelled). Recorded.

**F-13. Encoding: the first Telco-tier composition let an affirmative denial of causation close the
tier while a duty was undetermined.** Scenario 5 (A5 unresolved, causation `denied`) came back
`account_holder_bears` on the first run. The composition now decides the duty question first
(6.4(a) failing, then undetermined blocks, then five affirmative non-breach findings), and reads
causation and 6.6 only after a breach is established. Both implementations changed together; the
scenario is the regression check (`cases.mjs` compares each scenario's name to its outcome).

**F-14. Register: 5.2.1 and 5.2.2 are one rule stated twice.** One unauthorised Sender ID SMS
delivery breaches both. Two records are emitted (A25); `srf/6.2/any-fi-breach`'s counterpart
`srf/6.4/b/any-telco-breach` is a disjunction, so the outcome is the same either way, but a count
of "duties breached" over records would read 2.

**F-15. Register: the SRF's consumer tier reads no consumer duty.** Section 3 duties, EUPG 3.17
and EUPG 5.2 recklessness are emitted (6 records, tier `consumer`) and read by nothing in Section
6 (A19). A consumer's own breach changes no SRF outcome under the words. Encoded so the gap is a
record rather than a remark.

## What this does not cover

- Any bank's terms (excluded by the brief for this session).
- IMDA's Directions (F-06), the SGNIC aggregator list, any malicious-URL database.
- EUPG Sections 6, 7 and most of 4 and 5 (F-02).
- Singapore public holidays in business-day counts (A28).
- A determination on a real claim. Every figure above is over synthetic inputs.
