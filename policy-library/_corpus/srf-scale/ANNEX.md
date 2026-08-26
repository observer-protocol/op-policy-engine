# Measurement annex: a synthetic claim corpus over the SRF duty matrix

**SYNTHETIC. DEMONSTRATION-KEY.** Session CORPUS-SRF-SCALE, run created `2026-08-26T04:50:45Z` (the instant was supplied by the caller; the engine reads no clock). Register `srf@0.1.0`, sha256 `c27fccb68b7aaae2a13724ac9e0a873f87cc85565e77c19096339666f08bf033`, accepted at tag `srf-register-accepted-v1`. Nothing in this annex measures any bank, Telco, account holder, claimant or incident: every claim is constructed from the register's own fact vocabulary, and every figure is a property of the register and the engine over those constructions.

Every percentage carries its denominator on the same line. Every count names its population.

## 1. N, construction method, coverage

**N = 42,188 claims constructed, 42,188 ran, 0 did not run** (`out/corpus.jsonl.gz`, one line per claim). Records: 42,188 (`out/records.jsonl.gz`), one signed record per claim.

| population | claims | construction |
|---|---|---|
| single-clause | 36,294 | for each of the 42 clauses with duty_holder fi or telco and an evaluation (duty_holder read from clauses.json, F-03): the fact paths the clause reads, derived from its evaluation tree through bindings and clause references, each varied over its declared domain (facts.json kinds as `_corpus/space.mjs` SRF_FIELDS lays them out, including null, absent and malformed); every other fact held at cases.mjs `base`, resolutions at `resolved`. Full product where it is at most the cap (5,000 for fi/telco-tier duty clauses, 1,000 for Section 6 compositions and process-tier clauses), otherwise a seeded sample of exactly the cap; per-clause table below |
| scope | 1,056 | the 11 paths the four scope limbs read (product 38,707,200): every single-path variation (56) plus a seeded sample of 1,000 from the product. Out-of-scope claims (corporate holder, card transaction, non-covered scam type, non-SMS platform, ...) arise here and wherever a duty clause reads a scope path |
| resolutions | 64 | the 64-cell grid of the institutional inputs the register refuses to default: A3 (a never-arisen duty) x A5 (the filter-duty reading) x the two ungrounded meanings, on `base` |
| random | 2,000 | a seeded sample of 2,000 claims over every declared field (92) and resolution axis (3) from scratch, no base: the construction `_corpus/build.mjs` uses |
| pairwise | 420 | for the 8 waterfall duties, one witness fact-delta per result each reached in single-clause (31 witnesses), then every pair of duties crossed witness x witness (28 pairs). the second duty's witness delta is applied after the first; on a shared path the second wins |
| tier-judgments | 1,922 | every waterfall-duty witness (31) x each of the 8 tier-level held judgments through its domain (1,147 claims), and x the FI and Telco causation judgments crossed (775 claims). Added after the first full run reached `telco_bears` 0 times in 39,834 claims (finding S-01) |
| credits | 432 | every claim of an earlier population whose outcome is fi_bears or telco_bears, with the crediting flag of that party varied over its domain (added after the second full run reached no affirmative for srf/7.13 and 7.14 anywhere; finding S-09) |
| **total** | **42,188** | seed 20260825; reproducible by `node build.mjs --created 2026-08-26T04:50:45Z` up to the key |

**Facts first.** No fact was chosen to reach an outcome. The construction decides which paths vary and over what domain, both derived from the register; discharged, breached and unevaluable are labels the engine assigns after the run (section 1.2). The multi-duty populations (pairwise, tier-judgments, random) are documented samples, not a full product: the full product of the FI tier alone is 2.5 x 10^14.

### 1.1 Single-clause variation, per clause

| tier | holder | clause | paths | product | method | claims |
|---|---|---|---|---|---|---|
| fi | fi | `srf/4.2.1/cooling-off` | 5 | 2,000 | full product | 2,000 |
| fi | fi | `srf/4.2.2/i/token-activation-alert` | 2 | 20 | full product | 20 |
| fi | fi | `srf/4.2.2/ii/new-device-login-alert` | 3 | 100 | full product | 100 |
| fi | fi | `srf/4.2.2/iii/high-risk-activity-alert` | 2 | 20 | full product | 20 |
| fi | fi | `srf/4.2.2/alerts` | 7 | 40,000 | seeded sample | 5,000 |
| fi | fi | `srf/4.2.3/outgoing-transaction-notification` | 5 | 2,000 | full product | 2,000 |
| fi | fi | `srf/4.2.4/reporting-channel` | 1 | 4 | full product | 4 |
| fi | fi | `srf/4.2.4/kill-switch` | 2 | 16 | full product | 16 |
| fi | fi | `srf/4.2.4/duty` | 3 | 64 | full product | 64 |
| fi | fi | `srf/4.2.5/surveillance-in-place` | 1 | 4 | full product | 4 |
| fi | fi | `srf/4.2.5/response` | 2 | 30 | full product | 30 |
| fi | fi | `srf/4.2.5/duty` | 4 | 1,920 | full product | 1,920 |
| fi | fi | `srf/6.4/a/fi-complied-all` | 21 | 2.46e+14 | seeded sample | 1,000 |
| fi | fi | `srf/6.2/any-fi-breach` | 21 | 2.46e+14 | seeded sample | 1,000 |
| fi | fi | `srf/6.2/fi-bears` | 22 | 1.23e+15 | seeded sample | 1,000 |
| fi | fi | `eupg/5.5/a/fraud-or-negligence` | 1 | 5 | full product | 5 |
| fi | fi | `eupg/5.5/b/mas-requirement-noncompliance` | 1 | 5 | full product | 5 |
| fi | fi | `srf/6.3/fi-responsible-notwithstanding` | 3 | 125 | full product | 125 |
| fi | fi | `srf/6/fi-tier` | 25 | 1.54e+17 | seeded sample | 1,000 |
| telco | fi | `srf/7.7/perpetrated-through-sms` | 1 | 9 | full product | 9 |
| telco | telco | `srf/5.2.1/deliver-only-from-authorised-aggregators` | 5 | 4,500 | full product | 4,500 |
| telco | telco | `srf/5.2.2/block-unauthorised-sender-id` | 6 | 18,000 | seeded sample | 5,000 |
| telco | telco | `srf/5.2.3/filter-implemented` | 2 | 36 | full product | 36 |
| telco | telco | `srf/5.2.3/designated-database` | 3 | 180 | full product | 180 |
| telco | telco | `srf/5.2.3/this-sms-blocked` | 3 | 180 | full product | 180 |
| telco | telco | `srf/5.2.3/duty` | 5 | 3,600 | full product | 3,600 |
| telco | telco | `srf/6.4/b/any-telco-breach` | 9 | 1.80e+6 | seeded sample | 1,000 |
| telco | telco | `srf/6.4/telco-bears` | 34 | 1.42e+23 | seeded sample | 1,000 |
| process | fi | `srf/7.2/explain-workflow` | 1 | 4 | full product | 4 |
| process | fi | `srf/7.5/transaction-information-on-enquiry` | 2 | 16 | full product | 16 |
| process | fi | `srf/7.6/out-of-scope-route` | 12 | 1.55e+8 | seeded sample | 1,000 |
| process | fi | `srf/7.7/inform-telco` | 12 | 1.55e+8 | seeded sample | 1,000 |
| process | fi | `srf/7.8/fi-independent-governance` | 1 | 4 | full product | 4 |
| process | telco | `srf/7.8/telco-independent-governance` | 2 | 36 | full product | 36 |
| process | fi | `srf/7.9/investigation-timeline` | 4 | 20,480 | seeded sample | 1,000 |
| process | fi | `srf/7.10/written-outcome` | 2 | 16 | full product | 16 |
| process | fi | `eupg/8.1/withhold-charges` | 2 | 64 | full product | 64 |
| process | fi | `srf/7.13/fi-credits` | 48 | 3.04e+32 | seeded sample | 1,000 |
| process | telco | `srf/7.14/telco-credits` | 48 | 3.04e+32 | seeded sample | 1,000 |
| process | fi | `eupg/4.14/kill-switch-characteristics` | 3 | 64 | full product | 64 |
| process | fi | `eupg/4.20/reporting-channel-characteristics` | 2 | 16 | full product | 16 |
| process | fi | `eupg/4.21/detection-and-blocking` | 3 | 256 | full product | 256 |

Full product on 29 of 42 clauses; seeded sample on 13 (the eight waterfall duties are full on six: `srf/4.2.2/alerts` (40,000) and `srf/5.2.2/block-unauthorised-sender-id` (18,000) are sampled at 5,000 each, and `srf/4.2.2/alerts` is the conjunction of three sub-clauses that are each full).

### 1.2 Duty status vocabulary, and coverage

The brief names four classes (affirmative / breach / undetermined / not-evaluated). The register has a fifth state the four cannot hold: **not_applicable**, a CONDITIONAL duty that never arose, which the register says is not a pass. It is carried as its own class (finding S-04). The map from result token to class is total and throws on an unmapped token; it fired once during construction (`overdue`, finding S-06). Classification of the edge tokens:

- `overdue`: the limit passed with no end event (elapsed_within against clock.now): breach
- `exceeded`: the end event came after the limit: breach
- `not_yet_due`: no end event and the limit has not passed: not decidable yet, classed undetermined
- `outstanding`: the obligation arose and is not yet discharged or due: classed undetermined
- `out_of_order`: end before start: nothing decided, classed undetermined
- `_on_supplied_meaning`: the suffix is stripped before mapping; the record keeps the full token in tiers/exhibits
- `not_applicable`: a duty that never arose: its own class. Neither discharged nor breached (register: CONDITIONAL), and the brief's four classes have no slot for it
- `not_evaluated`: the record carries no result key: refused (INSTRUCTION), no result domain (DEFINITIONAL), or awaiting a person (JUDGMENT not assessed, after routing)

**Coverage statement.** For each duty clause: the classes reached in its OWN single-clause variation, and the classes reached anywhere in the corpus. A class a duty never reaches in its own variation is a fact about the construction (the product is sampled, or the class needs a fact outside the clause's own paths); a class never reached anywhere is a fact about the register over this corpus.

| clause | own variation | anywhere in corpus (count) |
|---|---|---|
| `srf/4.2.1/cooling-off` | affirmative, breach, not_applicable, undetermined | affirmative 24,745, undetermined 14,627, not_applicable 2,126, breach 690 |
| `srf/4.2.2/i/token-activation-alert` | affirmative, breach, not_applicable, undetermined | affirmative 26,712, undetermined 10,331, not_applicable 4,431, breach 714 |
| `srf/4.2.2/ii/new-device-login-alert` | affirmative, breach, not_applicable, undetermined | not_applicable 31,801, undetermined 10,104, breach 149, affirmative 134 |
| `srf/4.2.2/iii/high-risk-activity-alert` | affirmative, breach, not_applicable, undetermined | affirmative 28,381, undetermined 9,374, not_applicable 3,634, breach 799 |
| `srf/4.2.2/alerts` | affirmative, breach, not_applicable, undetermined | affirmative 24,938, undetermined 15,148, breach 1,614, not_applicable 488 |
| `srf/4.2.3/outgoing-transaction-notification` | affirmative, breach, not_applicable, undetermined | affirmative 30,710, undetermined 10,435, not_applicable 875, breach 168 |
| `srf/4.2.4/reporting-channel` | affirmative, breach, undetermined | affirmative 35,046, undetermined 4,685, breach 2,457 |
| `srf/4.2.4/kill-switch` | affirmative, breach, undetermined | affirmative 33,439, undetermined 7,003, breach 1,746 |
| `srf/4.2.4/duty` | affirmative, breach, undetermined | affirmative 32,826, undetermined 5,600, breach 3,762 |
| `srf/4.2.5/surveillance-in-place` | affirmative, breach, undetermined | affirmative 33,840, undetermined 5,596, breach 2,752 |
| `srf/4.2.5/response` | affirmative, breach, not_applicable, undetermined | not_applicable 32,925, undetermined 7,422, affirmative 1,009, breach 832 |
| `srf/4.2.5/duty` | affirmative, breach, not_applicable, undetermined | affirmative 31,241, undetermined 7,576, breach 2,600, not_applicable 771 |
| `srf/5.2.1/deliver-only-from-authorised-aggregators` | affirmative, breach, not_applicable, undetermined | affirmative 19,668, not_applicable 15,904, undetermined 6,179, breach 437 |
| `srf/5.2.2/block-unauthorised-sender-id` | affirmative, breach, not_applicable, undetermined | not_applicable 35,123, undetermined 6,668, breach 267, affirmative 130 |
| `srf/5.2.3/filter-implemented` | affirmative, breach, not_applicable, undetermined | affirmative 20,835, not_applicable 15,168, undetermined 5,793, breach 392 |
| `srf/5.2.3/designated-database` | affirmative, breach, not_applicable, undetermined | affirmative 20,600, not_applicable 14,887, undetermined 6,656, breach 45 |
| `srf/5.2.3/this-sms-blocked` | affirmative, breach, not_applicable, undetermined | not_applicable 35,905, undetermined 5,895, breach 333, affirmative 55 |
| `srf/5.2.3/duty` | affirmative, breach, not_applicable, undetermined | affirmative 20,578, not_applicable 15,168, undetermined 6,038, breach 404 |
| `srf/7.2/explain-workflow` | affirmative, breach, undetermined | affirmative 40,679, undetermined 999, breach 510 |
| `srf/7.5/transaction-information-on-enquiry` | affirmative, breach, not_applicable, undetermined | affirmative 40,293, undetermined 1,237, not_applicable 539, breach 119 |
| `srf/7.6/out-of-scope-route` | affirmative, breach, undetermined | not_applicable 18,445, breach 12,895, undetermined 10,141, affirmative 707 |
| `srf/7.7/inform-telco` | not_applicable, undetermined | not_applicable 20,102, affirmative 11,787, undetermined 10,299 |
| `srf/7.8/fi-independent-governance` | affirmative, breach, undetermined | affirmative 40,684, undetermined 1,027, breach 477 |
| `srf/7.8/telco-independent-governance` | affirmative, breach, not_applicable, undetermined | affirmative 21,729, not_applicable 15,168, undetermined 5,231, breach 60 |
| `srf/7.9/investigation-timeline` | affirmative, breach, undetermined | affirmative 39,490, undetermined 2,348, breach 350 |
| `srf/7.10/written-outcome` | affirmative, breach, undetermined | affirmative 40,308, undetermined 1,519, breach 361 |
| `eupg/8.1/withhold-charges` | affirmative, breach, not_applicable, undetermined | affirmative 38,027, undetermined 3,001, not_applicable 771, breach 389 |
| `srf/7.13/fi-credits` | not_applicable, undetermined | not_applicable 25,591, undetermined 16,345, breach 168, affirmative 84 |
| `srf/7.14/telco-credits` | not_applicable, undetermined | not_applicable 25,891, undetermined 16,225, breach 48, affirmative 24 |
| `eupg/4.14/kill-switch-characteristics` | affirmative, breach, undetermined | affirmative 40,152, undetermined 1,809, breach 227 |
| `eupg/4.20/reporting-channel-characteristics` | affirmative, breach, undetermined | affirmative 40,294, undetermined 1,498, breach 396 |
| `eupg/4.21/detection-and-blocking` | affirmative, breach, not_applicable, undetermined | affirmative 37,579, undetermined 3,520, not_applicable 771, breach 318 |

Classes never reached anywhere, over the three the brief asks for (affirmative, breach, undetermined): `srf/7.7/inform-telco: breach`.
Tier-level compositions and held judgments (Section 6, EUPG 5.5, 7.7) carry their raw tokens in each record under `tiers`; the outcome-level coverage is section 2.

## 2. Outcome distribution

| outcome | all claims (42,188) | in scope, i.e. scope limb `relevant_claim` (18,445) |
|---|---|---|
| `account_holder_bears` | 10,509 / 42,188 (24.9%) | 10,509 / 18,445 (57.0%) |
| `fi_bears` | 420 / 42,188 (1.0%) | 420 / 18,445 (2.3%) |
| `telco_bears` | 120 / 42,188 (0.3%) | 120 / 18,445 (0.7%) |
| `undetermined` | 16,177 / 42,188 (38.3%) | 7,396 / 18,445 (40.1%) |
| `out_of_scope` | 14,962 / 42,188 (35.5%) | 0 / 18,445 (0.0%) |

Claims whose scope could not be decided (outcome undetermined at the scope limb): 8,781 / 42,188 (20.8%). They are neither in the in-scope denominator nor out of scope.

By population (denominator: that population's claims):

| population | claims | account_holder_bears | fi_bears | telco_bears | undetermined | out_of_scope |
|---|---|---|---|---|---|---|
| single-clause | 36,294 | 9,421 / 36,294 (26.0%) | 60 / 36,294 (0.2%) | 0 / 36,294 (0.0%) | 14,944 / 36,294 (41.2%) | 11,869 / 36,294 (32.7%) |
| scope | 1,056 | 23 / 1,056 (2.2%) | 0 / 1,056 (0.0%) | 0 / 1,056 (0.0%) | 77 / 1,056 (7.3%) | 956 / 1,056 (90.5%) |
| resolutions | 64 | 8 / 64 (12.5%) | 0 / 64 (0.0%) | 0 / 64 (0.0%) | 56 / 64 (87.5%) | 0 / 64 (0.0%) |
| random | 2,000 | 0 / 2,000 (0.0%) | 0 / 2,000 (0.0%) | 0 / 2,000 (0.0%) | 130 / 2,000 (6.5%) | 1,870 / 2,000 (93.5%) |
| pairwise | 420 | 189 / 420 (45.0%) | 0 / 420 (0.0%) | 0 / 420 (0.0%) | 150 / 420 (35.7%) | 81 / 420 (19.3%) |
| tier-judgments | 1,922 | 868 / 1,922 (45.2%) | 24 / 1,922 (1.2%) | 24 / 1,922 (1.2%) | 820 / 1,922 (42.7%) | 186 / 1,922 (9.7%) |
| credits | 432 | 0 / 432 (0.0%) | 336 / 432 (77.8%) | 96 / 432 (22.2%) | 0 / 432 (0.0%) | 0 / 432 (0.0%) |

Tier reached (a decided outcome names the tier that decided it; an undetermined outcome names the tier it stopped at):

| outcome @ tier | claims of 42,188 |
|---|---|
| out_of_scope @ scope | 14,962 / 42,188 (35.5%) |
| account_holder_bears @ consumer | 10,509 / 42,188 (24.9%) |
| undetermined @ srf/7.1.1/relevant-claim | 8,781 / 42,188 (20.8%) |
| undetermined @ srf/6/fi-tier | 5,643 / 42,188 (13.4%) |
| undetermined @ srf/6.4/telco-bears | 1,753 / 42,188 (4.2%) |
| fi_bears @ fi | 420 / 42,188 (1.0%) |
| telco_bears @ telco | 120 / 42,188 (0.3%) |

## 3. The headline: consumer-bears would have required an affirmative finding that was not computable

**Definition.** `account_holder_bears` is the register's only consumer-bears outcome, and its decision table reaches it on two rows only: scope `relevant_claim`, the FI tier `fi_not_liable`, the Telco tier `telco_not_liable` or `not_applicable` (an affirmative `not_sms`). A claim counts when its outcome is `undetermined` with the waterfall stopped at the FI or Telco tier: the claim is in scope, no breach closed it, and an affirmative non-liability finding the consumer-bears row needs was not computable from the inputs.

| numerator | denominator | share |
|---|---|---|
| 7,396 | all claims ran: 42,188 | 7,396 / 42,188 (17.5%) |
| 7,396 | in scope: 18,445 | 7,396 / 18,445 (40.1%) |
| 7,396 | in scope and not closed by an established breach: 17,905 | 7,396 / 17,905 (41.3%) |

Stopped at the FI tier: 5,643 / 7,396 (76.3%); at the Telco tier: 1,753 / 7,396 (23.7%).

What the open duty clauses at the stopping tier were waiting on (per claim; `fact` = a fact never supplied, `judgment` = an assessment nobody made, `meaning` = an ungrounded term with no supplied meaning, `clause` = a derived input, which is where an unresolved ambiguity lands, F-09):

| waiting on | claims of 7,396 |
|---|---|
| fact | 3,671 / 7,396 (49.6%) |
| fact+judgment | 1,783 / 7,396 (24.1%) |
| judgment | 1,404 / 7,396 (19.0%) |
| nothing but an institutional resolution (A3 or A5 unresolved: every input clause decided, the composition guarded) | 490 / 7,396 (6.6%) |
| meaning | 48 / 7,396 (0.6%) |

Which waterfall duty was open (a claim can have several):

| duty | headline claims in which it is open, of 7,396 |
|---|---|
| `srf/4.2.3/outgoing-transaction-notification` | 2,431 / 7,396 (32.9%) |
| `srf/4.2.5/duty` | 1,837 / 7,396 (24.8%) |
| `srf/4.2.2/alerts` | 1,624 / 7,396 (22.0%) |
| `srf/4.2.1/cooling-off` | 1,217 / 7,396 (16.5%) |
| `srf/5.2.2/block-unauthorised-sender-id` | 996 / 7,396 (13.5%) |
| `srf/5.2.1/deliver-only-from-authorised-aggregators` | 699 / 7,396 (9.5%) |
| `srf/4.2.4/duty` | 569 / 7,396 (7.7%) |
| `srf/5.2.3/duty` | 448 / 7,396 (6.1%) |

By population: single-clause 6,540 / 36,294 (18.0%); resolutions 56 / 64 (87.5%); pairwise 104 / 420 (24.8%); tier-judgments 696 / 1,922 (36.2%).

### 3.1 The dangerous direction: consumer-bears issued on a non-affirmative duty state

The headline counts claims the register REFUSED to decide. The opposite failure is a consumer-bears outcome the register DID issue while a duty finding was not affirmative. Both rows below are the register's encoded semantics (the hand evaluator and the interpreter agree on every record, section 4) and are logged as register findings, not tuned:

| state at issue | claims | of account_holder_bears (10,509) | of all (42,188) |
|---|---|---|---|
| a waterfall duty, or fi-complied-all, undetermined (S-03) | 109 | 109 / 10,509 (1.0%) | 109 / 42,188 (0.3%) |
| a waterfall duty breach (FI or Telco) established, that party's causation denied (S-02) | 1,200 | 1,200 / 10,509 (11.4%) | 1,200 / 42,188 (2.8%) |
| of which an FI duty breach, FI causation denied (6.2 row {breach, denied} -> fi_not_liable_under_6.2; A4 as encoded) | 806 | 806 / 10,509 (7.7%) | 806 / 42,188 (1.9%) |
| of which the Telco tier then closed `telco_not_liable` under 6.5 (the FI did not comply with all of 4.2) with no Telco duty finding read | 757 | 757 / 10,509 (7.2%) | 757 / 42,188 (1.8%) |
| of which a Telco duty breach was ALSO established: two established breaches, the account holder bears | 16 | 16 / 10,509 (0.2%) | 16 / 42,188 (0.0%) |
| of which a Telco duty breach, Telco causation denied or 6.6 not met (6.4 after a breach) | 410 | 410 / 10,509 (3.9%) | 410 / 42,188 (1.0%) |

## 4. Verification pass

Verifier: the published `@observer-protocol/policy-engine` **1.0.0-rc.22** (`verifyEddsaJcs2022`, `decodeEd25519DidKey`, `jcsBytes`), installed outside this repository and named on the command line; nothing from the signer is imported. Key: `did:key:z6Mkg4RPWUC5T6d4pSXuYN4cRsBCcQNqBgV6BtUYnTRZBUTW`.

| check | result |
|---|---|
| signature verifies (eddsa-jcs-2022, against the manifest did:key) | 42,188 / 42,188 (100.0%) records; failed 0 |
| record rebuilds: facts reconstructed from corpus.jsonl.gz, engine rerun at this tree, body re-projected and compared canonically | 42,188 / 42,188 (100.0%) records; failed 0 |
| signed record with no corpus line | 0 |
| distinct signing keys seen | 1 |
| exhibits (full v7 record sets): signature | 7 / 7 (100.0%) |
| exhibits: rebuild to the claim record's recordSetSha256 and factsDigest | 7 / 7 (100.0%) |
| parity, hand evaluator against interpreter, every claim | 42,188 compared, 0 disagreements |
| throws | 0 classes |
| invariant failures (I1: consumer-bears only on the register's two rows; I2: an undetermined outcome names a tier) | 0 |
| **verdict** | **ALL 42188 RECORDS AND 7 EXHIBITS VERIFY AND REBUILD** |

Verification findings: none. What the rebuild check establishes is reproducibility of every record from corpus + engine; the projection code is shared with the builder and that is stated in `verify.mjs`. Independence is the signature check.

## 5. Tamper test

One field modified per case after signing; the same published verifier (`@observer-protocol/policy-engine` 1.0.0-rc.22) run over the original and the copy. Tampered copies are committed at `out/exhibits/TAMPERED-records.json` so the failure can be rerun.

| tamper | claim | original verifies | tampered verifies | verifier reason on the copy |
|---|---|---|---|---|
| outcome token changed | `SRF-SCALE-SYN-000001` | true | false | eddsa-jcs-2022 signature does not verify against the issuer key |
| one duty status changed | `SRF-SCALE-SYN-000017` | true | false | eddsa-jcs-2022 signature does not verify against the issuer key |
| claim id changed | `SRF-SCALE-SYN-037415` | true | false | eddsa-jcs-2022 signature does not verify against the issuer key |
| proofValue altered by one character | `SRF-SCALE-SYN-000003` | true | false | eddsa-jcs-2022 signature does not verify against the issuer key |

**ALL 4 TAMPERED COPIES FAIL VERIFICATION; ALL 4 ORIGINALS PASS.**

## 6. Key custody (D1)

Ephemeral Ed25519 key generated in the build process. Labels: SYNTHETIC, DEMONSTRATION-KEY. did: `did:key:z6Mkg4RPWUC5T6d4pSXuYN4cRsBCcQNqBgV6BtUYnTRZBUTW`. Custody: ephemeral, in-process; no production custody contact. Ledger: SCALE signing, 2026-08-25. Private half written to disk: false; released before the manifest was written, at `2026-08-26T04:51:05.952Z` (the one clock read in the build, the moment of an event of that process). No further record can be signed with this key; a record that verifies against it was signed during the run.

## 7. Files

| file | sha256 |
|---|---|
| `corpus.jsonl (uncompressed bytes)` | `aabcb162983eb575682205035c311884637379cc8708415c2af96eb126710e14` |
| `corpus.jsonl.gz` | `0225d7c7fe03cd0e459b2777bb05b1eccf59b5d1bd8083f389171cb8bbd8379f` |
| `records.jsonl (uncompressed bytes)` | `5db184ec87c2947dbefa3a72f34bd3aca89c78e66f2c8bade55e715f529199fe` |
| `records.jsonl.gz` | `161c796585e5f6186128d8d972d13bdea754e9b938238f50046a96c3164f0793` |
| `measurement.json` | `c1a911dcb3298eda52bb74168e7813a70bf5176fe84e1da07a15b27377bfc52f` |
| corpus.jsonl uncompressed bytes | 41,448,933 |
| records.jsonl uncompressed bytes | 143,256,106 |

Both JSONL files are committed gzipped; the manifest digests the uncompressed bytes and the archives. `out/exhibits/` holds one full v7 record set per (outcome, tier) reached, signed with the same key, and the tampered copies. `out/measurement.json` is the data this annex was generated from; `out/verification.json` and `out/tamper-test.json` are the verifier's outputs. Rerun: `node build.mjs --created <instant>` (a new key), `node verify.mjs --engine <package dir>`, `node tamper.mjs --engine <package dir>`, `node annex.mjs`.

## 8. Findings

Numbered in `FINDINGS.md` (S-01 onward). None is a footnote; none changes the register.
