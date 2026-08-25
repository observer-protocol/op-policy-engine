# Divergence by clause: in-force against proposed-2026-01-14

Rendered by `report.mjs` from `out/divergence.json`, `out/version-diff.json` and `out/defensibility.json`. Do not edit by hand.

**Population:** 600 synthetic determinations (`determinations.json`, seed 20260825); every figure below is over that denominator unless it says otherwise. The population's parameters are stated in the header of `generate-determinations.mjs` and reproduced here, adjacent, because a figure that travels without them becomes an operational claim; `check-figures.mjs` refuses any surface in this directory that carries one of these figures without the marker [population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history].

```
POPULATION (the source is the header of generate-determinations.mjs; this copy's sha256 ceb49c4d590d is checked against it at render time)
POPULATION PARAMETERS (stated here because they are choices, and a choice a report does not
state is a choice the reader cannot discount):
  N                        600 determinations, seed 20260825 (a seeded PRNG; rerunning reproduces); a different N
                           or seed is a different population with a different digest
  service.kind             uniform over the seven declared kinds
  rendering class          uniform over the classes the kind admits (a physician, resident, fellow,
                           PA or NP for medical; PT or PTA; OT or OTA; one class for the others)
  cited register version   in-force 70%, proposed-2026-01-14 30%
  cited edition            the in-force edition for the kind 60%, the proposed edition 25%,
                           another declared edition 15%; publisher matches the edition 90%
  cited schedule kind      the natural schedule for the kind 85%, another 15%; for PT and OT the
                           natural schedule is itself split, medical 50% / acu_pt_ot 50% (NY-A1)
  applied bound            present 90%, absent 10% (code and amount both unsupplied)
  payment relation         see paymentFor(): exact fraction 65%, an off-by-one-cent rounding 15%,
                           unrelated 20%
  branch facts             COVID-19 testing on 15% of medical; telemedicine on 20% of the five
                           kinds the telemedicine subdivisions cover; proration on 10% of physician
                           services; each optional fact unsupplied (undefined) 5% of the time
  resolutions              NY-A1 pt_ot_governing_schedule: medical 40% / acu_pt_ot 40% / unsupplied
                           20%. NY-A2 proposed_effective_date: unsupplied 40% / 2026-07-01 30% /
                           2027-07-01 30% (the Board's anticipated July 2027 and a placeholder)
  dates                    service dates on a ladder around the edition effective dates the
                           register declares (2019-04-01, 2020-01-01) and the two assumed
                           proposed effective dates; never composed from the clock
  meanings (amendment 2026-08-24)  five ungrounded terms; for EACH term, independently, the
                           institution supplies a meaning 50% / leaves it unsupplied 50%. Region
                           uniform over I to IV; DOH-guidance qualification, reserved-service and
                           authorized true 50% / 50% / 90%; unit fee specified 80%, amount drawn
                           by type. The interpreter never supplies one. The supply rate is a
                           population parameter and is NOT chosen to land any waiting rate
```

**Read only after `HARNESS-SELF-CHECK.md`**, which shows the comparator catching a single-constant mutation on the clause that carries it and reporting zero on an identical re-run.

## 1. The two versions differ on 46 of 74 clauses (derived, not listed)

| change | clauses |
|---|---|
| changed | 19 |
| unchanged | 28 |
| absent_in_proposed | 27 |

Per-version data whose definition differs: `v_edition_acu`, `v_edition_bh`, `v_edition_chiro`, `v_edition_medical`, `v_edition_pod`, `v_edition_pt_ot`, `v_effective_from_acu`, `v_effective_from_bh`, `v_effective_from_chiro`, `v_effective_from_medical`, `v_effective_from_pod`, `v_effective_from_pt_ot`, `v_effective_known`, `v_pta_code_source`, `v_publisher`.

| change | disposition | clause | how |
|---|---|---|---|
| changed | MECHANICAL | `12nycrr/329-1.1/schedule-in-effect-on-dos` | evaluation_data:v_edition_medical+v_effective_from_medical+v_effective_known+v_publisher |
| changed | DEFINITIONAL | `12nycrr/329-1.3/a/edition` | text, operative_weight |
| changed | DEFINITIONAL | `12nycrr/329-1.3/b/availability` | text, operative_weight |
| changed | MECHANICAL | `12nycrr/329-1.3/c/1/pta-code-source` | text, evaluation_data:v_pta_code_source |
| changed | MECHANICAL | `12nycrr/329-1.3/c/2/ota-code-source` | text, evaluation_data:v_pta_code_source |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-1.3/e/supervision` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | MECHANICAL | `12nycrr/329-1.3/e/acgme-program` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | MECHANICAL | `12nycrr/329-1.3/e/no-independent-billing` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | MECHANICAL | `12nycrr/329-1.3/e/no-separate-supervision-fee` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-1.3/e/1/uses-medical-schedule` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-1.3/e/1/non-surgical-modifier` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-1.3/e/1/same-amount` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-1.3/e/2/uses-medical-schedule` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-1.3/e/2/assistant-modifier` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | JUDGMENT | `12nycrr/329-1.3/e/2/work-documented` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-1.3/e/2/sixteen-percent` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | MECHANICAL | `12nycrr/329-1.3/e/2/ii/one-per-procedure` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-1.3/e/2/i/one-resident-unless-complex` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-1.3/e/2/iii/other-assistants` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-1.3/e/2/iv/same-bill-84` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-1.3/e/2/iv/single-bill-1R` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | INCORPORATED_BY_REFERENCE | `12nycrr/329-1.3/e/2/v/rules-elsewhere` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | DEFINITIONAL | `12nycrr/329-1.3/e/2/v/supersedes-gr12b` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | MECHANICAL | `12nycrr/329-1.3/e/3/narrative-names` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | DEFINITIONAL | `12nycrr/329-1.3/e/4/scope-not-expanded` | the proposal's restatement does not carry it (NY-A7) |
| changed | MECHANICAL | `12nycrr/329-4.1/a/acupuncture-dos` | evaluation_data:v_edition_acu+v_effective_from_acu+v_effective_known+v_publisher |
| changed | MECHANICAL | `12nycrr/329-4.1/b/pt-ot-dos` | evaluation_data:v_edition_pt_ot+v_effective_from_pt_ot+v_effective_known+v_publisher |
| changed | DEFINITIONAL | `12nycrr/329-4.2/a/acupuncture-edition` | text, operative_weight |
| changed | DEFINITIONAL | `12nycrr/329-4.2/b/pt-ot-edition` | text, operative_weight |
| changed | DEFINITIONAL | `12nycrr/329-4.2/c/availability` | text, operative_weight |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-4.2/d/telemedicine-code` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/329-4.2/d/one-unit-per-day` | the proposal's restatement does not carry it (NY-A7) |
| changed | MECHANICAL | `12nycrr/333.1/psychology-dos` | evaluation_data:v_edition_bh+v_effective_from_bh+v_effective_known+v_publisher |
| changed | DEFINITIONAL | `12nycrr/333.2/a/edition` | text, operative_weight |
| changed | DEFINITIONAL | `12nycrr/333.2/b/availability` | text, operative_weight |
| absent_in_proposed | CONDITIONAL | `12nycrr/333.2/c/telemedicine-codes` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/333.2/c/one-unit-per-day` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/333.2/c/no-1b-enhancement` | the proposal's restatement does not carry it (NY-A7) |
| changed | MECHANICAL | `12nycrr/343.1/podiatry-dos` | evaluation_data:v_edition_pod+v_effective_from_pod+v_effective_known+v_publisher |
| changed | DEFINITIONAL | `12nycrr/343.2/a/edition` | text, operative_weight |
| changed | DEFINITIONAL | `12nycrr/343.2/b/availability` | text, operative_weight |
| changed | MECHANICAL | `12nycrr/348.1/chiropractic-dos` | evaluation_data:v_edition_chiro+v_effective_from_chiro+v_effective_known+v_publisher |
| changed | DEFINITIONAL | `12nycrr/348.2/a/edition` | text, operative_weight |
| changed | DEFINITIONAL | `12nycrr/348.2/b/availability` | text, operative_weight |
| absent_in_proposed | CONDITIONAL | `12nycrr/348.2/c/telemedicine-code` | the proposal's restatement does not carry it (NY-A7) |
| absent_in_proposed | CONDITIONAL | `12nycrr/348.2/c/one-unit-per-day` | the proposal's restatement does not carry it (NY-A7) |

## 2. Divergence by clause over the replay

```
COMPARE  in-force  vs  proposed-2026-01-14
POPULATION (the source is the header of generate-determinations.mjs; this copy's sha256 ceb49c4d590d is checked against it at render time)
POPULATION PARAMETERS (stated here because they are choices, and a choice a report does not
state is a choice the reader cannot discount):
  N                        600 determinations, seed 20260825 (a seeded PRNG; rerunning reproduces); a different N
                           or seed is a different population with a different digest
  service.kind             uniform over the seven declared kinds
  rendering class          uniform over the classes the kind admits (a physician, resident, fellow,
                           PA or NP for medical; PT or PTA; OT or OTA; one class for the others)
  cited register version   in-force 70%, proposed-2026-01-14 30%
  cited edition            the in-force edition for the kind 60%, the proposed edition 25%,
                           another declared edition 15%; publisher matches the edition 90%
  cited schedule kind      the natural schedule for the kind 85%, another 15%; for PT and OT the
                           natural schedule is itself split, medical 50% / acu_pt_ot 50% (NY-A1)
  applied bound            present 90%, absent 10% (code and amount both unsupplied)
  payment relation         see paymentFor(): exact fraction 65%, an off-by-one-cent rounding 15%,
                           unrelated 20%
  branch facts             COVID-19 testing on 15% of medical; telemedicine on 20% of the five
                           kinds the telemedicine subdivisions cover; proration on 10% of physician
                           services; each optional fact unsupplied (undefined) 5% of the time
  resolutions              NY-A1 pt_ot_governing_schedule: medical 40% / acu_pt_ot 40% / unsupplied
                           20%. NY-A2 proposed_effective_date: unsupplied 40% / 2026-07-01 30% /
                           2027-07-01 30% (the Board's anticipated July 2027 and a placeholder)
  dates                    service dates on a ladder around the edition effective dates the
                           register declares (2019-04-01, 2020-01-01) and the two assumed
                           proposed effective dates; never composed from the clock
  meanings (amendment 2026-08-24)  five ungrounded terms; for EACH term, independently, the
                           institution supplies a meaning 50% / leaves it unsupplied 50%. Region
                           uniform over I to IV; DOH-guidance qualification, reserved-service and
                           authorized true 50% / 50% / 90%; unit fee specified 80%, amount drawn
                           by type. The interpreter never supplies one. The supply rate is a
                           population parameter and is NOT chosen to land any waiting rate
denominator: 600 determinations; 74 clauses in the union of both runs
clauses on which at least one determination diverges: 35 of 74
determinations diverging on at least one clause: 600/600 (100.0%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history] (on a result token: 437/600 (72.8%); the rest only on clause absence)
  12nycrr/329-1.1/schedule-in-effect-on-dos            diverge 98/600 (16.3%); agree 502/600 (83.7%)
        35  cited_edition_not_the_one_in_force -> undetermined
        29  cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force
        15  cited_edition_in_force_on_dos -> undetermined
         7  dos_precedes_edition_effect -> undetermined
         6  cited_edition_not_the_one_in_force -> dos_precedes_edition_effect
         4  dos_precedes_edition_effect -> cited_edition_not_the_one_in_force
         1  missing_operand -> undetermined
         1  cited_edition_not_the_one_in_force -> cited_edition_in_force_on_dos
  12nycrr/329-1.3/c/1/pta-code-source                  diverge 43/600 (7.2%); agree 557/600 (92.8%)
        22  codes_from_required_schedule -> codes_not_from_required_schedule
        21  codes_not_from_required_schedule -> codes_from_required_schedule
  12nycrr/329-1.3/c/2/ota-code-source                  diverge 34/600 (5.7%); agree 566/600 (94.3%)
        18  codes_from_required_schedule -> codes_not_from_required_schedule
        16  codes_not_from_required_schedule -> codes_from_required_schedule
  12nycrr/329-1.3/e/1/non-surgical-modifier            absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/1/same-amount                      absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/1/uses-medical-schedule            absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/2/assistant-modifier               absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/2/i/one-resident-unless-complex    absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/2/ii/one-per-procedure             absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/2/iii/other-assistants             absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/2/iv/same-bill-84                  absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/2/iv/single-bill-1R                absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/2/sixteen-percent                  absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/2/uses-medical-schedule            absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/2/v/rules-elsewhere                absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/2/v/supersedes-gr12b               absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/2/work-documented                  absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/3/narrative-names                  absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/4/scope-not-expanded               absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/acgme-program                      absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/no-independent-billing             absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/no-separate-supervision-fee        absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-1.3/e/supervision                        absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-4.1/a/acupuncture-dos                    diverge 59/600 (9.8%); agree 541/600 (90.2%)
        25  cited_edition_not_the_one_in_force -> undetermined
        12  cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force
         8  cited_edition_in_force_on_dos -> undetermined
         6  cited_edition_not_the_one_in_force -> dos_precedes_edition_effect
         6  dos_precedes_edition_effect -> cited_edition_not_the_one_in_force
         1  dos_precedes_edition_effect -> undetermined
         1  missing_operand -> undetermined
  12nycrr/329-4.1/b/pt-ot-dos                          diverge 41/600 (6.8%); agree 559/600 (93.2%)
        22  cited_edition_not_the_one_in_force -> undetermined
         5  cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force
         4  dos_precedes_edition_effect -> cited_edition_not_the_one_in_force
         4  cited_edition_in_force_on_dos -> undetermined
         2  cited_edition_not_the_one_in_force -> dos_precedes_edition_effect
         2  cited_edition_not_the_one_in_force -> cited_edition_in_force_on_dos
         1  missing_operand -> cited_edition_not_the_one_in_force
         1  dos_precedes_edition_effect -> undetermined
  12nycrr/329-4.2/d/one-unit-per-day                   absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-4.2/d/telemedicine-code                  absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/333.1/psychology-dos                         diverge 68/600 (11.3%); agree 532/600 (88.7%)
        23  cited_edition_not_the_one_in_force -> undetermined
        14  cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force
        10  cited_edition_in_force_on_dos -> undetermined
         9  cited_edition_not_the_one_in_force -> dos_precedes_edition_effect
         6  dos_precedes_edition_effect -> cited_edition_not_the_one_in_force
         4  cited_edition_not_the_one_in_force -> cited_edition_in_force_on_dos
         2  dos_precedes_edition_effect -> undetermined
  12nycrr/333.2/c/no-1b-enhancement                    absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/333.2/c/one-unit-per-day                     absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/333.2/c/telemedicine-codes                   absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/343.1/podiatry-dos                           diverge 72/600 (12.0%); agree 528/600 (88.0%)
        22  cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force
        18  cited_edition_not_the_one_in_force -> undetermined
        17  cited_edition_in_force_on_dos -> undetermined
         9  cited_edition_not_the_one_in_force -> dos_precedes_edition_effect
         2  dos_precedes_edition_effect -> cited_edition_not_the_one_in_force
         1  missing_operand -> cited_edition_not_the_one_in_force
         1  missing_operand -> undetermined
         1  cited_edition_not_the_one_in_force -> cited_edition_in_force_on_dos
         1  dos_precedes_edition_effect -> undetermined
  12nycrr/348.1/chiropractic-dos                       diverge 61/600 (10.2%); agree 539/600 (89.8%)
        18  cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force
        15  cited_edition_not_the_one_in_force -> undetermined
        12  cited_edition_in_force_on_dos -> undetermined
         7  dos_precedes_edition_effect -> cited_edition_not_the_one_in_force
         4  cited_edition_not_the_one_in_force -> dos_precedes_edition_effect
         2  dos_precedes_edition_effect -> undetermined
         1  missing_operand -> cited_edition_not_the_one_in_force
         1  cited_edition_not_the_one_in_force -> cited_edition_in_force_on_dos
         1  missing_operand -> undetermined
  12nycrr/348.2/c/one-unit-per-day                     absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/348.2/c/telemedicine-code                    absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
RESULT: DIVERGENT. [exit 1]
```

**Reading the transitions.** `X -> Y` is the token under in-force, then under proposed, for one determination. `-> undetermined` on a date-of-service clause is the proposed version's effective date being unsupplied (NY-A2) on that determination; the register refuses to decide a date test against a date the source does not state. `cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force` is a determination citing the 2019 OptumInsight edition, correct today, wrong under the proposal. The reverse transition is a determination citing the 2025 RefMed edition, wrong today, right under the proposal on the effective date it assumed. `absent in proposed-2026-01-14 600/600` is a clause the proposal's restatement does not carry (NY-A7): a determination applying it under the proposed version has no clause to rest on. [population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

## 3. Defensibility

```
DEFENSIBILITY over 600 synthetic determinations (denominator 600; in-force register, replay in-force.jsonl)
POPULATION (the source is the header of generate-determinations.mjs; this copy's sha256 ceb49c4d590d is checked against it at render time)
POPULATION PARAMETERS (stated here because they are choices, and a choice a report does not
state is a choice the reader cannot discount):
  N                        600 determinations, seed 20260825 (a seeded PRNG; rerunning reproduces); a different N
                           or seed is a different population with a different digest
  service.kind             uniform over the seven declared kinds
  rendering class          uniform over the classes the kind admits (a physician, resident, fellow,
                           PA or NP for medical; PT or PTA; OT or OTA; one class for the others)
  cited register version   in-force 70%, proposed-2026-01-14 30%
  cited edition            the in-force edition for the kind 60%, the proposed edition 25%,
                           another declared edition 15%; publisher matches the edition 90%
  cited schedule kind      the natural schedule for the kind 85%, another 15%; for PT and OT the
                           natural schedule is itself split, medical 50% / acu_pt_ot 50% (NY-A1)
  applied bound            present 90%, absent 10% (code and amount both unsupplied)
  payment relation         see paymentFor(): exact fraction 65%, an off-by-one-cent rounding 15%,
                           unrelated 20%
  branch facts             COVID-19 testing on 15% of medical; telemedicine on 20% of the five
                           kinds the telemedicine subdivisions cover; proration on 10% of physician
                           services; each optional fact unsupplied (undefined) 5% of the time
  resolutions              NY-A1 pt_ot_governing_schedule: medical 40% / acu_pt_ot 40% / unsupplied
                           20%. NY-A2 proposed_effective_date: unsupplied 40% / 2026-07-01 30% /
                           2027-07-01 30% (the Board's anticipated July 2027 and a placeholder)
  dates                    service dates on a ladder around the edition effective dates the
                           register declares (2019-04-01, 2020-01-01) and the two assumed
                           proposed effective dates; never composed from the clock
  meanings (amendment 2026-08-24)  five ungrounded terms; for EACH term, independently, the
                           institution supplies a meaning 50% / leaves it unsupplied 50%. Region
                           uniform over I to IV; DOH-guidance qualification, reserved-service and
                           authorized true 50% / 50% / 90%; unit fee specified 80%, amount drawn
                           by type. The interpreter never supplies one. The supply rate is a
                           population parameter and is NOT chosen to land any waiting rate
  carry NO APPLIED BOUND:                         70/600 (11.7%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]
  CITE A VERSION NOT IN FORCE (union):            444/600 (74.0%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]
    (a) cite a register version other than in-force: 198/600 (33.0%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]
    (b) cite a schedule edition not in force on DOS:  371/600 (61.8%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]   [read off the replay's date-of-service clauses]
    both (a) and (b):                                 125/600 (20.8%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]
  date-of-service clauses undetermined (NY-A1/NY-A2 unresolved, or DOS unsupplied): 25/600 (4.2%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]  [counted under neither]
  no edition cited at all:                         31/600 (5.2%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 ceb49c4d590d from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]  [counted under neither; it is a missing citation, not a wrong one]
```

The union is the figure. Its two parts are independent facts about a determination and are both reported because they fail differently: (a) is a claim the determination makes about itself (which register version it says it was decided under) and is checked by string equality; (b) is read off the in-force replay and inherits the replay's limits, which is why the undetermined and no-edition rows sit beside it and are counted under neither.
