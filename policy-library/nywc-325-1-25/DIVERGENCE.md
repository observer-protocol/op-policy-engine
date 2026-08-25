# Divergence by clause: 12 NYCRR 325-1.25 against two restatement layers

Rendered by `report.mjs` from `out/tally.json`, `out/divergence-a.json` and `out/divergence-b.json`. Do not edit by hand.

**Reference direction:** the regulation register is the reference; each restatement layer is under test. **Layer A (WCB provider pages) is the publishable comparison. Layer B (daisyBill knowledge base) is MEASURED AND HELD INTERNAL; nothing in section 3 leaves this repository.** Read only after `HARNESS-SELF-CHECK.md`.

**Population:** 600 synthetic bill determinations; every figure below carries [population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history].

```
POPULATION (the source is the header of generate-determinations.mjs; this copy's sha256 2c863ce04da2 is checked against it at render time)
POPULATION PARAMETERS (choices, stated so a reader can discount them):
  N                        600 determinations, seed 20260825 (seeded PRNG; rerunning reproduces);
                           a different N or seed is a different population with a different digest
  provider class           uniform over the eleven declared classes; hospital outpatient 10%
  dates                    care rendered on a ladder; submitted 0 to 130 days after care on a
                           ladder around the 120-day limit; received 0 to 6 days after submission
                           (NY25-A1 is only visible when they differ); clock.now on a ladder
  carrier action           paid_full 35% / paid_partial 15% / objected 35% / none 15%; action day
                           on a ladder around 45 (10, 30, 40, 44, 45, 46, 60, 100) from receipt
  objections               kinds drawn 1 to 3 from legal/valuation/mtg; grounds uniform over the
                           declared enumerations including `other` and `s25a_liability`; forms
                           uniform over C-8.1B / C-8.4 / EOB / other; recipients: the full set 60%,
                           provider+board 25%, provider only 15%; simultaneous 80%
  award request            present on 45% of bills not paid in full; request day on a ladder
                           around 45 and 120; certifications each true 85%; complete 90%;
                           eCase match 85%; Board-file match 85%; prior request 10%
  legal issues / decisions on 30% of bills with a legal or MTG objection; dates laddered around 30
  report elements          each present 80%; narrative table applied by layer A only
  meanings                 four ungrounded terms; for EACH, independently, supplied 50% / unsupplied
                           50%. authorized true 90%; prescribed format true 80%; report legally
                           defective true 30%; fee schedule: scheduled and maximum amounts drawn by
                           type, conforms true 80%. Not chosen to land any rate
  optional facts           each unsupplied (undefined) 5% of the time
```

**Both denominators, on every rate:** `k/600` is over all determinations; `k/reached` is over the determinations the clause reaches under the regulation (its result is not `not_applicable`, and not an `undetermined` the ungrounded emitter returned before testing applicability). CV7's headline rate was uninterpretable for want of the second.

## 1. Regulation against layer A (WCB), publishable

[population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

```
COMPARE  regulation  vs  layer-a-wcb
POPULATION (the source is the header of generate-determinations.mjs; this copy's sha256 2c863ce04da2 is checked against it at render time)
POPULATION PARAMETERS (choices, stated so a reader can discount them):
  N                        600 determinations, seed 20260825 (seeded PRNG; rerunning reproduces);
                           a different N or seed is a different population with a different digest
  provider class           uniform over the eleven declared classes; hospital outpatient 10%
  dates                    care rendered on a ladder; submitted 0 to 130 days after care on a
                           ladder around the 120-day limit; received 0 to 6 days after submission
                           (NY25-A1 is only visible when they differ); clock.now on a ladder
  carrier action           paid_full 35% / paid_partial 15% / objected 35% / none 15%; action day
                           on a ladder around 45 (10, 30, 40, 44, 45, 46, 60, 100) from receipt
  objections               kinds drawn 1 to 3 from legal/valuation/mtg; grounds uniform over the
                           declared enumerations including `other` and `s25a_liability`; forms
                           uniform over C-8.1B / C-8.4 / EOB / other; recipients: the full set 60%,
                           provider+board 25%, provider only 15%; simultaneous 80%
  award request            present on 45% of bills not paid in full; request day on a ladder
                           around 45 and 120; certifications each true 85%; complete 90%;
                           eCase match 85%; Board-file match 85%; prior request 10%
  legal issues / decisions on 30% of bills with a legal or MTG objection; dates laddered around 30
  report elements          each present 80%; narrative table applied by layer A only
  meanings                 four ungrounded terms; for EACH, independently, supplied 50% / unsupplied
                           50%. authorized true 90%; prescribed format true 80%; report legally
                           defective true 30%; fee schedule: scheduled and maximum amounts drawn by
                           type, conforms true 80%. Not chosen to land any rate
  optional facts           each unsupplied (undefined) 5% of the time
denominator: 600 determinations; 59 clauses in the union of both runs
clauses on which at least one determination diverges: 59 of 59
determinations diverging on at least one clause: 600/600 (100.0%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history] (on a result token: 600/600 (100.0%); the rest only on clause absence)
  325-1.25/a/1/medical-care-defined                    absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/1/mtg-consistent-care                     absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/1/provide-promptly                        absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/amount-fee-schedule-or-agreed           absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/i/within-mtg                            absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/ii/variance-or-authorized               absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/iii/agreed                              absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/iv/ordered                              absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/liable-when-accepted                    absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/not-obligated-outside-mtg               absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/obligation-to-pay                       absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/b/1/120-days                                absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/b/1/format-prescribed                       diverge 600/600 (100.0%); agree 0/600 (0.0%)
       246  undetermined -> format_prescribed
       155  format_prescribed_on_supplied_meaning -> format_prescribed
        96  undetermined -> format_not_prescribed
        52  format_prescribed_on_supplied_meaning -> format_not_prescribed
        20  format_not_prescribed_on_supplied_meaning -> format_prescribed
        18  provider_not_authorized_on_supplied_meaning -> format_prescribed
         9  format_not_prescribed_on_supplied_meaning -> format_not_prescribed
         4  provider_not_authorized_on_supplied_meaning -> format_not_prescribed
  325-1.25/b/1/ineligible-if-late-or-wrong-format      absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/b/1/pre-2020-care                           absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/b/2/hospital-120-days                       absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/b/2/hospital-format                         absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/b/3/good-cause-late-submission              absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/1/eob-alternative                         absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/1/legal-objection-format                  absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/1/mtg-objection-format                    absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/1/notice-recipients                       absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/1/pay-or-notify-45                        absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/1/valuation-objection-format              absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/2/pay-uncontested-portion                 absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/3/late-objection-barred                   absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/3/no-timely-objection-liable-full         absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/4/objections-simultaneous                 absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/5/valuation-categories                    absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/5/valuation-ground-enumerated             absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/6/25a-not-valid                           absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/6/attach-par-denial                       absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/6/legal-categories                        absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/6/legal-ground-enumerated                 absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/6/legally-defective-report                diverge 315/600 (52.5%); agree 285/600 (47.5%)
       305  undetermined -> not_applicable
         3  report_not_legally_defective_on_supplied_meaning -> elements_present
         3  undetermined -> may_be_found_legally_defective_elements_missing
         3  undetermined -> elements_present
         1  report_not_legally_defective_on_supplied_meaning -> may_be_found_legally_defective_elements_missing
  325-1.25/c/6/par-not-raised-denied                   absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/7/iv/par-not-raised-denied                absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/7/mtg-categories                          absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/7/mtg-ground-member                       absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/1/award-availability                      diverge 548/600 (91.3%); agree 52/600 (8.7%)
       263  undetermined -> remedy_available
       182  remedy_not_available_bill_ineligible -> remedy_available
        60  undetermined -> remedy_not_available_paid_in_full
        28  remedy_not_available_bill_ineligible -> remedy_not_available_paid_in_full
         9  remedy_not_available_paid_in_full -> remedy_available
         5  remedy_not_available_timely_valuation_notice_on_supplied_meaning -> remedy_available
         1  remedy_available_on_supplied_meaning -> remedy_available
  325-1.25/d/1/request-window                          absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/2/good-cause-late-request                 absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/3/i/not-before-legal-determined           absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/3/ii/one-request-per-dos                  absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/4/certifications                          absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/5/reject-incomplete-or-mismatch           diverge 74/600 (12.3%); agree 526/600 (87.7%)
        28  rejected_incomplete -> accepted_for_examination
        21  may_be_rejected_mismatch -> accepted_for_examination
        15  accepted_for_examination -> denied_mismatch
         7  may_be_rejected_mismatch -> denied_mismatch
         3  rejected_incomplete -> denied_mismatch
  325-1.25/d/6/proposed-award-process                  absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/6/proposed-filing-date-30                 absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/7/objection-to-proposed-award             absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/8/interest                                absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/e/1/arbitration-availability                absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/e/2/provider-option                         absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/e/3/good-cause-late-arbitration             absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/e/4/not-before-legal-determined             absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/f/1/adjudication-of-legal-mtg               absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/f/2/pay-within-30-of-decision               absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/f/3/no-stay-on-further-appeal               absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/f/3/withhold-pending-review                 absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/g/effective-date                            absent in layer-a-wcb 600/600 (100.0%); agree 0/600 (0.0%)
RESULT: DIVERGENT. [exit 1]
```

## 2. Both denominators, layer A

[population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

```
REGULATION vs LAYER A (layer-a-wcb) [population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]
  restatement states 4 of 59 regulation clauses; 4 of those diverge on at least one determination; 4 on a DECISION (both sides decided, differently)
  325-1.25/b/1/format-prescribed                     diverge 600/600 (100.0%) over all; 600/600 (100.0%) over reached; agree 0/600
      of which: regulation waiting 342, attribution only 164, applicability 0, DECISION 94 (94/600 over reached)
       246  undetermined -> format_prescribed
       155  format_prescribed_on_supplied_meaning -> format_prescribed
        96  undetermined -> format_not_prescribed
        52  format_prescribed_on_supplied_meaning -> format_not_prescribed
  325-1.25/c/6/legally-defective-report              diverge 315/600 (52.5%) over all;  10/ 10 (100.0%) over reached; agree 285/600
      of which: regulation waiting 311, attribution only 0, applicability 0, DECISION 4 (4/10 over reached)
       305  undetermined -> not_applicable
         3  report_not_legally_defective_on_supplied_meaning -> elements_present
         3  undetermined -> may_be_found_legally_defective_elements_missing
         3  undetermined -> elements_present
  325-1.25/d/1/award-availability                    diverge 548/600 (91.3%) over all; 548/600 (91.3%) over reached; agree 52/600
      of which: regulation waiting 323, attribution only 1, applicability 0, DECISION 224 (224/600 over reached)
       263  undetermined -> remedy_available
       182  remedy_not_available_bill_ineligible -> remedy_available
        60  undetermined -> remedy_not_available_paid_in_full
        28  remedy_not_available_bill_ineligible -> remedy_not_available_paid_in_full
  325-1.25/d/5/reject-incomplete-or-mismatch         diverge  74/600 (12.3%) over all;  74/173 (42.8%) over reached; agree 526/600
      of which: regulation waiting 0, attribution only 0, applicability 0, DECISION 74 (74/173 over reached)
        28  rejected_incomplete -> accepted_for_examination
        21  may_be_rejected_mismatch -> accepted_for_examination
        15  accepted_for_examination -> denied_mismatch
         7  may_be_rejected_mismatch -> denied_mismatch

```

## 3. Regulation against layer B (daisyBill), REPOSITORY-INTERNAL, NOT PUBLISHED

[population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

```
COMPARE  regulation  vs  layer-b-daisybill
POPULATION (the source is the header of generate-determinations.mjs; this copy's sha256 2c863ce04da2 is checked against it at render time)
POPULATION PARAMETERS (choices, stated so a reader can discount them):
  N                        600 determinations, seed 20260825 (seeded PRNG; rerunning reproduces);
                           a different N or seed is a different population with a different digest
  provider class           uniform over the eleven declared classes; hospital outpatient 10%
  dates                    care rendered on a ladder; submitted 0 to 130 days after care on a
                           ladder around the 120-day limit; received 0 to 6 days after submission
                           (NY25-A1 is only visible when they differ); clock.now on a ladder
  carrier action           paid_full 35% / paid_partial 15% / objected 35% / none 15%; action day
                           on a ladder around 45 (10, 30, 40, 44, 45, 46, 60, 100) from receipt
  objections               kinds drawn 1 to 3 from legal/valuation/mtg; grounds uniform over the
                           declared enumerations including `other` and `s25a_liability`; forms
                           uniform over C-8.1B / C-8.4 / EOB / other; recipients: the full set 60%,
                           provider+board 25%, provider only 15%; simultaneous 80%
  award request            present on 45% of bills not paid in full; request day on a ladder
                           around 45 and 120; certifications each true 85%; complete 90%;
                           eCase match 85%; Board-file match 85%; prior request 10%
  legal issues / decisions on 30% of bills with a legal or MTG objection; dates laddered around 30
  report elements          each present 80%; narrative table applied by layer A only
  meanings                 four ungrounded terms; for EACH, independently, supplied 50% / unsupplied
                           50%. authorized true 90%; prescribed format true 80%; report legally
                           defective true 30%; fee schedule: scheduled and maximum amounts drawn by
                           type, conforms true 80%. Not chosen to land any rate
  optional facts           each unsupplied (undefined) 5% of the time
denominator: 600 determinations; 60 clauses in the union of both runs
clauses on which at least one determination diverges: 51 of 60
determinations diverging on at least one clause: 600/600 (100.0%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history] (on a result token: 498/600 (83.0%); the rest only on clause absence)
  325-1.25/B/electronic-only-after-2025-08-01          absent in regulation 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/1/medical-care-defined                    absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/1/mtg-consistent-care                     absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/1/provide-promptly                        absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/amount-fee-schedule-or-agreed           absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/i/within-mtg                            absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/ii/variance-or-authorized               absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/iii/agreed                              absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/iv/ordered                              absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/liable-when-accepted                    absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/not-obligated-outside-mtg               absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/a/2/obligation-to-pay                       absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/b/1/format-prescribed                       diverge 68/600 (11.3%); agree 532/600 (88.7%)
        46  format_prescribed_on_supplied_meaning -> format_not_prescribed_on_supplied_meaning
        22  format_not_prescribed_on_supplied_meaning -> format_prescribed_on_supplied_meaning
  325-1.25/b/1/ineligible-if-late-or-wrong-format      diverge 46/600 (7.7%); agree 554/600 (92.3%)
        31  eligible -> ineligible_format
        15  ineligible_format -> eligible
  325-1.25/b/1/pre-2020-care                           absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/b/2/hospital-120-days                       absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/b/2/hospital-format                         absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/1/legal-objection-format                  diverge 392/600 (65.3%); agree 208/600 (34.7%)
       261  undetermined -> not_applicable
        62  undetermined -> nonconforming
        47  conforming_on_supplied_meaning -> nonconforming
        22  nonconforming_on_supplied_meaning -> nonconforming
  325-1.25/c/1/mtg-objection-format                    diverge 398/600 (66.3%); agree 202/600 (33.7%)
       240  undetermined -> not_applicable
        83  undetermined -> nonconforming
        39  nonconforming_on_supplied_meaning -> nonconforming
        36  conforming_on_supplied_meaning -> nonconforming
  325-1.25/c/1/notice-recipients                       diverge 75/600 (12.5%); agree 525/600 (87.5%)
        75  recipient_missing -> all_required_recipients
  325-1.25/c/1/pay-or-notify-45                        diverge 434/600 (72.3%); agree 166/600 (27.7%)
        72  undetermined -> notified_within_45
        69  undetermined -> notified_after_45
        60  undetermined -> paid_within_45
        60  undetermined -> paid_after_45
        39  undetermined -> neither_within_45
        37  notified_within_45_on_supplied_meaning -> notified_within_45
        16  undetermined -> notified_within_45_not_in_prescribed_manner
        15  notified_within_45_not_in_prescribed_manner_on_supplied_meaning -> notified_within_45_not_in_prescribed_manner
        14  notified_within_45_not_in_prescribed_manner_on_supplied_meaning -> notified_after_45
        13  paid_within_45 -> paid_after_45
        10  notified_within_45_on_supplied_meaning -> notified_after_45
         8  notified_within_45_not_in_prescribed_manner_on_supplied_meaning -> notified_within_45
         5  undetermined -> out_of_order
         3  not_applicable -> paid_within_45
         3  not_applicable -> notified_after_45
         2  not_applicable -> notified_within_45_not_in_prescribed_manner
         2  not_applicable -> neither_within_45
         2  not_applicable -> notified_within_45
         2  undetermined -> not_yet_due
         1  not_applicable -> paid_after_45
         1  not_applicable -> out_of_order
  325-1.25/c/1/valuation-objection-format              diverge 386/600 (64.3%); agree 214/600 (35.7%)
       262  undetermined -> not_applicable
        53  undetermined -> nonconforming
        35  conforming_on_supplied_meaning -> nonconforming
        15  nonconforming_on_supplied_meaning -> nonconforming
         8  undetermined -> conforming
         7  conforming_on_supplied_meaning -> conforming
         6  nonconforming_on_supplied_meaning -> conforming
  325-1.25/c/2/pay-uncontested-portion                 absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/4/objections-simultaneous                 absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/5/valuation-ground-enumerated             diverge 23/600 (3.8%); agree 577/600 (96.2%)
        15  not_enumerated_open_set -> not_a_listed_ground
         8  enumerated -> not_a_listed_ground
  325-1.25/c/6/25a-not-valid                           absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/6/attach-par-denial                       absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/6/legally-defective-report                absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/6/par-not-raised-denied                   absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/7/iv/par-not-raised-denied                absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/c/7/mtg-ground-member                       diverge 48/600 (8.0%); agree 552/600 (92.0%)
        48  not_an_mtg_objection -> not_enumerated_open_set
  325-1.25/d/1/award-availability                      absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/1/request-window                          absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/2/good-cause-late-request                 absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/3/i/not-before-legal-determined           absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/3/ii/one-request-per-dos                  absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/4/certifications                          absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/5/reject-incomplete-or-mismatch           absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/6/proposed-award-process                  absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/6/proposed-filing-date-30                 absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/7/objection-to-proposed-award             absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/d/8/interest                                absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/e/1/arbitration-availability                diverge 48/600 (8.0%); agree 552/600 (92.0%)
        47  arbitration_not_available_bill_ineligible -> arbitration_available
         1  no_dispute_to_arbitrate -> arbitration_available
  325-1.25/e/2/provider-option                         absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/e/3/good-cause-late-arbitration             absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/e/4/not-before-legal-determined             absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/f/1/adjudication-of-legal-mtg               diverge 441/600 (73.5%); agree 159/600 (26.5%)
       203  undetermined -> not_applicable
        65  undetermined -> reviewed_by_board
        55  undetermined -> untimely
        55  reviewed_by_board_on_supplied_meaning -> untimely
        33  reviewed_by_board_on_supplied_meaning -> reviewed_by_board
        17  not_in_prescribed_format_on_supplied_meaning -> untimely
        13  not_in_prescribed_format_on_supplied_meaning -> reviewed_by_board
  325-1.25/f/2/pay-within-30-of-decision               absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/f/3/no-stay-on-further-appeal               absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/f/3/withhold-pending-review                 absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
  325-1.25/g/effective-date                            absent in layer-b-daisybill 600/600 (100.0%); agree 0/600 (0.0%)
RESULT: DIVERGENT. [exit 1]
```

```
REGULATION vs LAYER B (layer-b-daisybill) [population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]
  restatement states 20 of 59 regulation clauses; 11 of those diverge on at least one determination; 11 on a DECISION (both sides decided, differently)
  325-1.25/b/1/120-days                              diverge   0/600 (0.0%) over all;   0/600 (0.0%) over reached; agree 600/600
  325-1.25/b/1/format-prescribed                     diverge  68/600 (11.3%) over all;  68/600 (11.3%) over reached; agree 532/600
      of which: regulation waiting 0, attribution only 0, applicability 0, DECISION 68 (68/600 over reached)
        46  format_prescribed_on_supplied_meaning -> format_not_prescribed_on_supplied_meaning
        22  format_not_prescribed_on_supplied_meaning -> format_prescribed_on_supplied_meaning
  325-1.25/b/1/ineligible-if-late-or-wrong-format    diverge  46/600 (7.7%) over all;  46/600 (7.7%) over reached; agree 554/600
      of which: regulation waiting 0, attribution only 0, applicability 0, DECISION 46 (46/600 over reached)
        31  eligible -> ineligible_format
        15  ineligible_format -> eligible
  325-1.25/b/3/good-cause-late-submission            diverge   0/600 (0.0%) over all;   0/ 22 (0.0%) over reached; agree 600/600
  325-1.25/c/1/eob-alternative                       diverge   0/600 (0.0%) over all;   0/ 17 (0.0%) over reached; agree 600/600
  325-1.25/c/1/legal-objection-format                diverge 392/600 (65.3%) over all; 131/131 (100.0%) over reached; agree 208/600
      of which: regulation waiting 323, attribution only 22, applicability 0, DECISION 47 (47/131 over reached)
       261  undetermined -> not_applicable
        62  undetermined -> nonconforming
        47  conforming_on_supplied_meaning -> nonconforming
        22  nonconforming_on_supplied_meaning -> nonconforming
  325-1.25/c/1/mtg-objection-format                  diverge 398/600 (66.3%) over all; 158/158 (100.0%) over reached; agree 202/600
      of which: regulation waiting 323, attribution only 39, applicability 0, DECISION 36 (36/158 over reached)
       240  undetermined -> not_applicable
        83  undetermined -> nonconforming
        39  nonconforming_on_supplied_meaning -> nonconforming
        36  conforming_on_supplied_meaning -> nonconforming
  325-1.25/c/1/notice-recipients                     diverge  75/600 (12.5%) over all;  75/301 (24.9%) over reached; agree 525/600
      of which: regulation waiting 0, attribution only 0, applicability 0, DECISION 75 (75/301 over reached)
        75  recipient_missing -> all_required_recipients
  325-1.25/c/1/pay-or-notify-45                      diverge 434/600 (72.3%) over all; 407/573 (71.0%) over reached; agree 166/600
      of which: regulation waiting 323, attribution only 52, applicability 14, DECISION 45 (45/573 over reached)
        72  undetermined -> notified_within_45
        69  undetermined -> notified_after_45
        60  undetermined -> paid_within_45
        60  undetermined -> paid_after_45
  325-1.25/c/1/valuation-objection-format            diverge 386/600 (64.3%) over all; 124/124 (100.0%) over reached; agree 214/600
      of which: regulation waiting 323, attribution only 22, applicability 0, DECISION 41 (41/124 over reached)
       262  undetermined -> not_applicable
        53  undetermined -> nonconforming
        35  conforming_on_supplied_meaning -> nonconforming
        15  nonconforming_on_supplied_meaning -> nonconforming
  325-1.25/c/3/late-objection-barred                 diverge   0/600 (0.0%) over all;   0/301 (0.0%) over reached; agree 600/600
  325-1.25/c/3/no-timely-objection-liable-full       diverge   0/600 (0.0%) over all;   0/527 (0.0%) over reached; agree 600/600
  325-1.25/c/5/valuation-categories                  diverge   0/600 (0.0%) over all;   0/  0 (n/a%) over reached; agree 600/600
  325-1.25/c/5/valuation-ground-enumerated           diverge  23/600 (3.8%) over all;  23/124 (18.5%) over reached; agree 577/600
      of which: regulation waiting 0, attribution only 0, applicability 0, DECISION 23 (23/124 over reached)
        15  not_enumerated_open_set -> not_a_listed_ground
         8  enumerated -> not_a_listed_ground
  325-1.25/c/6/legal-categories                      diverge   0/600 (0.0%) over all;   0/  0 (n/a%) over reached; agree 600/600
  325-1.25/c/6/legal-ground-enumerated               diverge   0/600 (0.0%) over all;   0/131 (0.0%) over reached; agree 600/600
  325-1.25/c/7/mtg-categories                        diverge   0/600 (0.0%) over all;   0/  0 (n/a%) over reached; agree 600/600
  325-1.25/c/7/mtg-ground-member                     diverge  48/600 (8.0%) over all;  48/158 (30.4%) over reached; agree 552/600
      of which: regulation waiting 0, attribution only 0, applicability 0, DECISION 48 (48/158 over reached)
        48  not_an_mtg_objection -> not_enumerated_open_set
  325-1.25/e/1/arbitration-availability              diverge  48/600 (8.0%) over all;  48/ 60 (80.0%) over reached; agree 552/600
      of which: regulation waiting 0, attribution only 0, applicability 0, DECISION 48 (48/60 over reached)
        47  arbitration_not_available_bill_ineligible -> arbitration_available
         1  no_dispute_to_arbitrate -> arbitration_available
  325-1.25/f/1/adjudication-of-legal-mtg             diverge 441/600 (73.5%) over all; 238/238 (100.0%) over reached; agree 159/600
      of which: regulation waiting 323, attribution only 33, applicability 0, DECISION 85 (85/238 over reached)
       203  undetermined -> not_applicable
        65  undetermined -> reviewed_by_board
        55  undetermined -> untimely
        55  reviewed_by_board_on_supplied_meaning -> untimely
  added by the restatement (no regulation clause): 325-1.25/B/electronic-only-after-2025-08-01
```

## 4. The waiting axis and the ungrounded split

[population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

```
TALLY over 600 synthetic determinations [population: 600 synthetic determinations, seed 20260825, parameters sha256 2c863ce04da2 from nywc-325-1-25/generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]
POPULATION (the source is the header of generate-determinations.mjs; this copy's sha256 2c863ce04da2 is checked against it at render time)
POPULATION PARAMETERS (choices, stated so a reader can discount them):
  N                        600 determinations, seed 20260825 (seeded PRNG; rerunning reproduces);
                           a different N or seed is a different population with a different digest
  provider class           uniform over the eleven declared classes; hospital outpatient 10%
  dates                    care rendered on a ladder; submitted 0 to 130 days after care on a
                           ladder around the 120-day limit; received 0 to 6 days after submission
                           (NY25-A1 is only visible when they differ); clock.now on a ladder
  carrier action           paid_full 35% / paid_partial 15% / objected 35% / none 15%; action day
                           on a ladder around 45 (10, 30, 40, 44, 45, 46, 60, 100) from receipt
  objections               kinds drawn 1 to 3 from legal/valuation/mtg; grounds uniform over the
                           declared enumerations including `other` and `s25a_liability`; forms
                           uniform over C-8.1B / C-8.4 / EOB / other; recipients: the full set 60%,
                           provider+board 25%, provider only 15%; simultaneous 80%
  award request            present on 45% of bills not paid in full; request day on a ladder
                           around 45 and 120; certifications each true 85%; complete 90%;
                           eCase match 85%; Board-file match 85%; prior request 10%
  legal issues / decisions on 30% of bills with a legal or MTG objection; dates laddered around 30
  report elements          each present 80%; narrative table applied by layer A only
  meanings                 four ungrounded terms; for EACH, independently, supplied 50% / unsupplied
                           50%. authorized true 90%; prescribed format true 80%; report legally
                           defective true 30%; fee schedule: scheduled and maximum amounts drawn by
                           type, conforms true 80%. Not chosen to land any rate
  optional facts           each unsupplied (undefined) 5% of the time

regulation: 35400 records (30600 with a result domain); waiting {"none":30296,"judgment":815,"meaning":3979,"fact":310}; meaning-waiting 3979 of 35400 (11.24%), determinations with one 569/600 (94.8%)

layer-a-wcb: 2400 records (2400 with a result domain); waiting {"none":2400}; meaning-waiting 0 of 2400 (0.00%), determinations with one 0/600 (0.0%)

layer-b-daisybill: 12600 records (10800 with a result domain); waiting {"meaning":963,"fact":54,"none":11576,"judgment":7}; meaning-waiting 963 of 12600 (7.64%), determinations with one 465/600 (77.5%)

ungrounded split (regulation), 11 clauses x 600 = 6600 records: {"decided":516,"undetermined_reached":1776,"undetermined_refused_before_applicability":1694,"on_supplied_meaning":1021,"not_applicable":1593}

```
