# Divergence by clause: in-force against proposed-2026-01-14

Rendered by `report.mjs` from `out/divergence.json`, `out/version-diff.json` and `out/defensibility.json`. Do not edit by hand.

**Population:** 600 synthetic determinations (`determinations.json`, seed 20260825); every figure below is over that denominator unless it says otherwise. The population's parameters are stated in the header of `generate-determinations.mjs` and reproduced here, adjacent, because a figure that travels without them becomes an operational claim; `check-figures.mjs` refuses any surface in this directory that carries one of these figures without the marker [population: 600 synthetic determinations, seed 20260825, parameters sha256 2268173b241c from generate-determinations.mjs header].

```
POPULATION (the source is the header of generate-determinations.mjs; this copy's sha256 2268173b241c is checked against it at render time)
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
POPULATION (the source is the header of generate-determinations.mjs; this copy's sha256 2268173b241c is checked against it at render time)
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
denominator: 600 determinations; 74 clauses in the union of both runs
clauses on which at least one determination diverges: 35 of 74
determinations diverging on at least one clause: 600/600 (100.0%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 2268173b241c from generate-determinations.mjs header] (on a result token: 443/600 (73.8%); the rest only on clause absence)
  12nycrr/329-1.1/schedule-in-effect-on-dos            diverge 95/600 (15.8%); agree 505/600 (84.2%)
        33  cited_edition_not_the_one_in_force -> undetermined
        23  cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force
        12  cited_edition_in_force_on_dos -> undetermined
        10  dos_precedes_edition_effect -> cited_edition_not_the_one_in_force
         7  cited_edition_not_the_one_in_force -> dos_precedes_edition_effect
         4  dos_precedes_edition_effect -> undetermined
         3  cited_edition_not_the_one_in_force -> cited_edition_in_force_on_dos
         2  missing_operand -> undetermined
         1  missing_operand -> cited_edition_not_the_one_in_force
  12nycrr/329-1.3/c/1/pta-code-source                  diverge 35/600 (5.8%); agree 565/600 (94.2%)
        23  codes_from_required_schedule -> codes_not_from_required_schedule
        12  codes_not_from_required_schedule -> codes_from_required_schedule
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
  12nycrr/329-4.1/a/acupuncture-dos                    diverge 69/600 (11.5%); agree 531/600 (88.5%)
        18  cited_edition_not_the_one_in_force -> undetermined
        15  cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force
        11  cited_edition_in_force_on_dos -> undetermined
         9  cited_edition_not_the_one_in_force -> dos_precedes_edition_effect
         7  dos_precedes_edition_effect -> cited_edition_not_the_one_in_force
         5  dos_precedes_edition_effect -> undetermined
         4  cited_edition_not_the_one_in_force -> cited_edition_in_force_on_dos
  12nycrr/329-4.1/b/pt-ot-dos                          diverge 50/600 (8.3%); agree 550/600 (91.7%)
        27  cited_edition_not_the_one_in_force -> undetermined
        10  cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force
         4  cited_edition_in_force_on_dos -> undetermined
         3  dos_precedes_edition_effect -> undetermined
         3  dos_precedes_edition_effect -> cited_edition_not_the_one_in_force
         2  cited_edition_not_the_one_in_force -> cited_edition_in_force_on_dos
         1  cited_edition_not_the_one_in_force -> dos_precedes_edition_effect
  12nycrr/329-4.2/d/one-unit-per-day                   absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/329-4.2/d/telemedicine-code                  absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/333.1/psychology-dos                         diverge 58/600 (9.7%); agree 542/600 (90.3%)
        17  cited_edition_not_the_one_in_force -> undetermined
        12  cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force
        12  cited_edition_in_force_on_dos -> undetermined
         5  dos_precedes_edition_effect -> cited_edition_not_the_one_in_force
         4  cited_edition_not_the_one_in_force -> dos_precedes_edition_effect
         4  dos_precedes_edition_effect -> undetermined
         2  missing_operand -> undetermined
         2  cited_edition_not_the_one_in_force -> cited_edition_in_force_on_dos
  12nycrr/333.2/c/no-1b-enhancement                    absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/333.2/c/one-unit-per-day                     absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/333.2/c/telemedicine-codes                   absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/343.1/podiatry-dos                           diverge 53/600 (8.8%); agree 547/600 (91.2%)
        15  cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force
        14  cited_edition_not_the_one_in_force -> undetermined
        10  cited_edition_in_force_on_dos -> undetermined
         5  cited_edition_not_the_one_in_force -> dos_precedes_edition_effect
         4  cited_edition_not_the_one_in_force -> cited_edition_in_force_on_dos
         2  missing_operand -> undetermined
         2  cited_edition_not_the_one_in_force -> missing_operand
         1  missing_operand -> cited_edition_not_the_one_in_force
  12nycrr/348.1/chiropractic-dos                       diverge 83/600 (13.8%); agree 517/600 (86.2%)
        27  cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force
        18  cited_edition_in_force_on_dos -> undetermined
        17  cited_edition_not_the_one_in_force -> undetermined
         7  cited_edition_not_the_one_in_force -> dos_precedes_edition_effect
         6  dos_precedes_edition_effect -> cited_edition_not_the_one_in_force
         5  dos_precedes_edition_effect -> undetermined
         3  cited_edition_not_the_one_in_force -> cited_edition_in_force_on_dos
  12nycrr/348.2/c/one-unit-per-day                     absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
  12nycrr/348.2/c/telemedicine-code                    absent in proposed-2026-01-14 600/600 (100.0%); agree 0/600 (0.0%)
RESULT: DIVERGENT. [exit 1]
```

**Reading the transitions.** `X -> Y` is the token under in-force, then under proposed, for one determination. `-> undetermined` on a date-of-service clause is the proposed version's effective date being unsupplied (NY-A2) on that determination; the register refuses to decide a date test against a date the source does not state. `cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force` is a determination citing the 2019 OptumInsight edition, correct today, wrong under the proposal. The reverse transition is a determination citing the 2025 RefMed edition, wrong today, right under the proposal on the effective date it assumed. `absent in proposed-2026-01-14 600/600` is a clause the proposal's restatement does not carry (NY-A7): a determination applying it under the proposed version has no clause to rest on. [population: 600 synthetic determinations, seed 20260825, parameters sha256 2268173b241c from generate-determinations.mjs header]

## 3. Defensibility

```
DEFENSIBILITY over 600 synthetic determinations (denominator 600; in-force register, replay in-force.jsonl)
POPULATION (the source is the header of generate-determinations.mjs; this copy's sha256 2268173b241c is checked against it at render time)
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
  carry NO APPLIED BOUND:                         57/600 (9.5%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 2268173b241c from generate-determinations.mjs header]
  CITE A VERSION NOT IN FORCE (union):            435/600 (72.5%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 2268173b241c from generate-determinations.mjs header]
    (a) cite a register version other than in-force: 160/600 (26.7%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 2268173b241c from generate-determinations.mjs header]
    (b) cite a schedule edition not in force on DOS:  368/600 (61.3%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 2268173b241c from generate-determinations.mjs header]   [read off the replay's date-of-service clauses]
    both (a) and (b):                                 93/600 (15.5%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 2268173b241c from generate-determinations.mjs header]
  date-of-service clauses undetermined (NY-A1/NY-A2 unresolved, or DOS unsupplied): 29/600 (4.8%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 2268173b241c from generate-determinations.mjs header]  [counted under neither]
  no edition cited at all:                         26/600 (4.3%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 2268173b241c from generate-determinations.mjs header]  [counted under neither; it is a missing citation, not a wrong one]
```

The union is the figure. Its two parts are independent facts about a determination and are both reported because they fail differently: (a) is a claim the determination makes about itself (which register version it says it was decided under) and is checked by string equality; (b) is read off the in-force replay and inherits the replay's limits, which is why the undetermined and no-edition rows sit beside it and are counted under neither.
