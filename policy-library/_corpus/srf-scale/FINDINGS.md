# Findings: the SRF synthetic claim corpus (SCALE)

Session CORPUS-SRF-SCALE, 2026-08-25. Register `mas-srf-2024` at tag `srf-register-accepted-v1`
(`49540c2`). Numbered S-01 onward so the annex, the register's own FINDINGS.md and later sessions
can cite them. Every count names its population; the figures are read from `ANNEX.md` and
`out/measurement.json`, which are generated from the run. **SYNTHETIC throughout: no figure here is
a measurement of any bank, Telco, account holder or claim.** The register is frozen at Boyd's
accepted tag; nothing below changes it. Findings that suggest a register change say so and stop.

## Register findings (logged for a later revision, not tuned)

**S-02. A consumer-bears outcome follows an established duty breach when that party's causation is
denied, and at the FI tier this also closes the Telco tier without a Telco finding.** 1,200 of
10,509 `account_holder_bears` outcomes (of 42,188 claims) rest on a waterfall duty breach that the
engine established. Mechanism, FI side: `srf/6.2/fi-bears` row {any_breach true, causation denied}
yields `fi_not_liable_under_6.2` ("the register encodes the words"; A4 is the registered
ambiguity), the FI tier closes `fi_not_liable`, and `srf/6.4/telco-bears` then reads
`fi_complied_all_ok === false` and answers `telco_not_liable` under 6.5 **before any Telco duty is
read**: 806 claims with an FI duty breach, 757 of which closed the Telco tier that way, 16 of which
had a Telco duty breach ALSO established (two established breaches, the account holder bears).
Telco side: 410 claims with a Telco duty breach and Telco causation denied or 6.6 not met. The
engine matches the register on every record (parity 0 of 42,188), so this is the register's
semantics; whether the SRF's words mean it is A4's question, and the 6.5 consequence (a Telco duty
never examined once the FI has any breach, even one the loss did not arise from) is a new one for
the register's ambiguity list. Not tuned.

**S-03. A consumer-bears outcome is issued while another FI duty is undetermined.** 109 of 10,509
`account_holder_bears` outcomes (96 single-clause, 13 pairwise) carry a waterfall duty status
`undetermined`, or `srf/6.4/a/fi-complied-all` undetermined. The register's FINDINGS.md property 3
says "undetermined on any duty blocks the tier" with one stated exception (an established breach
closes to `fi_bears`); this is a second exception the statement does not name: the same 6.2 row
as S-02 closes the FI tier to `fi_not_liable_under_6.2` on one established breach plus denied
causation, whatever the other duties say, and 6.7 then reaches the consumer row. Measured in the
dangerous direction (ANNEX section 3.1). Not tuned.

**S-11. Six point six percent of the headline is nothing but a missing institutional resolution.**
490 of 7,396 headline claims (undetermined at the FI or Telco tier) have every non-DERIVED clause
at the tier decided and the composition guarded on A3 or A5 unresolved. F-09 said the record
cannot name this state (it reads `waiting: clause` or `fact`); at scale it is a distinct
population, and a submission that counts "not computable" should say how much of it is a choice
of reading rather than a missing fact or assessment. 56 of the 64 resolutions-grid claims are in
it, and the rest come from single-clause variations whose duty came out `not_applicable` under a
supplied A3 that composes as something other than complied.

**S-08. One class is unreached anywhere: `srf/7.7/inform-telco: breach`**, over 42,188 claims and
the register's six scenarios (five `satisfied`, one `not_applicable`). Unreached is not
unreachable: the clause's 12 read paths (product 1.5 x 10^8) were sampled at 1,000 in its own
variation and the breach needs a conjunction (relevant claim, SMS, Telco named, number and SMS
details provided, the FI not informing within the period) that random draws over 16-value
timestamp ladders rarely satisfy. Logged as a coverage limit of this corpus; a targeted
population would settle it and was not built, because it would be the first outcome-first
construction in the corpus.

**S-04. The brief's four duty-status classes have no slot for `not_applicable`.** The register's
CONDITIONAL duties answer `not_applicable` when the duty never arose, and the register says that
is not a pass. Forcing it into `affirmative` would overstate discharge (2,126 of 42,188 claims on
`srf/4.2.1/cooling-off` alone); forcing it into `not-evaluated` would misreport an evaluated
clause. The annex uses five classes and says so.

**S-10. Out-of-scope is the largest single outcome, and most of it is not the scope population.**
14,962 of 42,188 claims are `out_of_scope`; 956 come from the scope population and 11,869 from
single-clause variations of duty clauses that read a scope path (`account.issuer_type` in the
cooling-off and alert duties, `scam.contact_platform` in every Telco duty). A duty clause's fact
paths include the claim's scope, so a full product over them exercises the scope limbs as a side
effect. A property of fact-first construction, stated so the 35.5% is not read as a finding about
claims.

## Corpus construction findings (this session's own)

**S-01. The first construction reached `telco_bears` 0 times in 39,834 claims.** `base` holds
every tier-level causation judgment `denied`, the single-clause variation of
`srf/6.4/telco-bears` samples 34 paths at random (the conjunction it needs is rare), and no
population varied the judgments the waterfall reads beside the duties. A `tier-judgments`
population was added (1,922 claims: every waterfall-duty witness crossed with each of the eight
tier-level judgment paths, and with the two causation judgments crossed); `telco_bears` is reached
24 times there and 120 times in all after S-09. The population is derived from the register's
fact paths, not from the outcome wanted, and the first run's zero is recorded here rather than
smoothed away.

**S-09. `srf/7.13/fi-credits` and `srf/7.14/telco-credits` reached no `affirmative` anywhere on
the second full run.** They arise only on `fi_bears` / `telco_bears`, which the 1,000-sample of
their 48 read paths never produced. A `credits` population (432 claims: every earlier claim whose
outcome attaches the loss, with that party's crediting flag through its domain) closed it:
affirmative 84 and 24. Same rule as S-01.

**S-05. The waterfall reading reported a later undetermined tier for a decided outcome.** The
first `readWaterfall` (taken from `mas-srf-2024/run-scenarios.mjs`) walked the tiers for the first
undetermined closer regardless of the outcome, so an `out_of_scope` claim whose FI tier happened
to be undetermined read "stopped at the FI tier": 9,095 of 41,756 records on the first full run.
Caught by the outcome-by-tier table, which is why that table is in the annex. Fixed in
`project.mjs` (a decided outcome names the tier that decided it). **For CORPUS-SRF:** the same
rule is in `run-scenarios.mjs`; its six scenarios never meet the condition, so the defect is latent
there and in `mapping.stoppedAt` of `out/determinations/*.json`. F-07 territory.

**S-07. The first consumer-bears invariant was stricter than the register and halted the run.**
Draft I1 required `srf/6.4/a/fi-complied-all` satisfied beside the register's two conditions;
690 claims failed it and the STOP fired. The excess was the register's 6.2 row (S-02), not the
engine's behaviour. I1 was restated as the register's own property 2 (scope relevant, FI tier
`fi_not_liable`, Telco tier `telco_not_liable` or `not_applicable`), and the dropped conjunct
became a measurement (annex 3.1). A guard that encodes what its author expected rather than what
the register says fires on the register.

**S-06. The total status map fired on `overdue`.** The map was written from a 3,000-claim survey;
the register declares `overdue` among `elapsed_within`'s tokens and the survey never drew it. The
throw stopped the run at claim 30,000 rather than classifying it silently. Added as breach (the
limit passed with no end event); `outstanding` added as undetermined on the same reading pass.

**S-12. Records are committed compressed.** 42,188 signed records are 143,467,199 bytes
uncompressed (3.4 KB each: per-clause status for 34 duty clauses, raw tokens for 14 tier-level
clauses, the open list) and 7.4 MB gzipped; the corpus 41,448,938 bytes and 1.2 MB. Both
`.jsonl.gz`; the manifest digests the uncompressed bytes and the archives, and `verify.mjs` reads
the archives. Seven full v7 record sets (one per outcome-and-tier reached) are committed plain as
exhibits.

**S-13. Parity held on a population the oracle never saw.** The hand evaluator and the interpreter
agree on all 42,188 claims (104 records each), a population built by product and witness-crossing
rather than the oracle's random draws. Corroborates the register's 40,006-record parity; does not
extend the frozen oracle, which was not re-frozen here.

## Verification and tamper (blocks 3 and 4): no findings

42,188 of 42,188 records verify against the manifest `did:key` with the published
`@observer-protocol/policy-engine@1.0.0-rc.22` and rebuild from corpus + engine; 7 of 7 exhibits
verify and rebuild; 4 of 4 tampered copies fail with the verifier's signature reason while their
originals pass. Numbered verification findings would appear here as V-n; there are none.

## What this does not cover

- IMDA's Directions, SGNIC's list, any malicious-URL database (register F-06).
- A determination on a real claim, or any real party's conduct.
- The full product of any tier: the multi-duty populations are documented samples (ANNEX 1).
- A targeted construction for `srf/7.7/inform-telco: breach` (S-08).
- The :3300 console or the payment-server path (register F-17 to F-20); this corpus runs the
  interpreter and router directly.
