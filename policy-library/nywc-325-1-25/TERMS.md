# Term inventory, 12 NYCRR 325-1.25: the missing-citation test, applied at encoding time

The test, carried from CV7 and applied BEFORE each clause was encoded:

- a term defined in a document the section DOES cite for it: **supplied fact**;
- a term defined only in a document the section does NOT cite for it: **ungrounded term**, an
  institution-supplied meaning, attributed on the record, never a fact;
- a term with no defining document retrievable at all: **third state**, reported as such. That
  is a claim about this session's retrieval, not about the world.

"Cite for it" means the section names the document as the source of THIS term. 325-1.25 cites
325-1.3 for the bill format, so the bill format is a fact; it does not cite anything for the
objection format, so the objection format is a meaning.

## Ungrounded terms (four), with the citation that is missing

| term | clauses | consumed as | the missing citation |
|---|---|---|---|
| **authorized** (`authorized by the Chair to provide treatment and care`) | (b)(1) format-prescribed | meaning `provider_authorized` | Provider authorization is under WCL 13-b and 12 NYCRR Part 324 and Subpart 325-1 provisions this section never names. It cites 325-1.4 and Part 441, which authorize SERVICES, a different thing. Same term, same missing citation as CV7. |
| **format prescribed by the Chair for such purpose** (the objection and non-payment notice format) | (c)(1) pay-or-notify, legal, valuation and MTG objection format; (d)(1) award-availability (the valuation notice limb); (f)(1) adjudication | meaning `notice_in_prescribed_format` | The Chair's prescribed objection forms (C-8.1B, C-8.4, the EOB) are prescribed in Board form instructions the section does not cite. Contrast (b)(1), which cites 325-1.3 for the BILL format. |
| **applicable fee schedule** (`the amount set forth in the applicable fee schedule`, `the maximum amount established in the applicable fee schedule`, `conforms to the fee schedule, if any`) | (a)(2) amount; (c)(3) liable-full; (d)(4) certification (iv) | meaning `scheduled_amount`, `maximum_amount`, `bill_conforms` | The schedules are adopted by 12 NYCRR Parts 329, 333, 343 and 348, which 325-1.25 never cites, and they are licensed. The amount is a meaning the institution supplies and never a value the register holds. |
| **legally defective** (`the medical report was not timely filed or was legally defective`) | (c)(6) legally-defective-report | meaning `report_legally_defective` | Report requirements are in 325-1.3 (cited in (b)(1) for the bill format, not for report defectiveness) and WCL 13-a(4), uncited. **Layer A supplies a meaning** (work status, causal relationship, temporary impairment percentage, by provider type) and then withdraws it as a sole basis for denial. |

Eleven clauses of 59 rest on one of the four. Under layer A, (b)(1), (c)(6) and (d)(1) consume no
meaning (the page names a field matrix, three elements, and a date instead); under layer B, the
(c)(1) and (f)(1) clauses consume none (the article names forms and a timeliness condition).

## Supplied facts: terms defined in a document the section cites for them

| term | cited document | fact |
|---|---|---|
| Medical Care | defined in (a)(1) itself | (the definition is a DEFINITIONAL clause) |
| Medical Treatment Guidelines | 324.2(a) | `claim.body_part_mtg_covered`; `care.within_mtg_criteria` is the held judgment of correct application |
| variance | 324.3, 324.3(a)(2) | `care.variance_proper_324_3` |
| authorized (a service), prior authorization | 325-1.4, Part 441 | `care.authorized_325_1_4_or_441`; `par.*` |
| bill format | 325-1.3 | `bill.format_per_325_1_3` |
| hospital bill format | 10 NYCRR 400.18, Appendices C-2, C-3 | `bill.uds_format` |
| interest | 300.19 | `proposed_award.interest_paid_per_300_19` |
| application for review | WCL 23 | `decision.review_application_filed` |
| section 25-a liability | WCL 13(a), 25-a | `objection.legal_ground = s25a_liability` |
| administrative award | WCL 13-g(1), 13-k(6), 13-l(6), 13-m(7) | the (d) clauses' own facts |

## Category tokens: named grounds whose truth the register never evaluates

The objection grounds in (c)(5), (c)(6) and (c)(7) are tested for membership of the enumerated
set only. Several name terms defined in uncited documents (`controverted`, WCL 25(2); `preferred
provider organization`, WCL Art. 10-A; `not authorized under the Workers' Compensation Law`, WCL
13-b; `pertinent fee schedule`, `Ground Rules limitation`, `improper current procedural
terminology codes`, the licensed schedule and CPT). Because no clause decides whether such a ground
is TRUE, no meaning is consumed and the test does not bite. If a later register evaluated a
ground's merit, each of these would be an ungrounded term.

## Third state: no defining document retrievable

| term | where | note |
|---|---|---|
| **in full** (`paid ... in full`, `not been paid in full or in part`) | (c)(3), (d)(1), (e)(1); layer A's sentence; layer B's `pay the bill in full up to the maximum` | Defined nowhere retrieved; NY25-A3 registers the two readings (amount billed against schedule maximum). The register does not decide it: (c)(3) records liability up to the maximum without computing it, and (d)(1) tests the carrier's action token, not an amount. |
| **evidentiary purposes** (`the bill is for evidentiary purposes and not for treatment`) | (c)(6) | A category token; no defining document found. |
| **good cause** | (b)(3), (d)(2), (e)(3) | The Chair's assessment; held judgment `chair.good_cause_found`. |
| **medically necessary** | (a)(2) | 12 NYCRR 324 may define it; not retrieved in this session; held judgment. |
| **finally determined adversely** | (d)(3)(i), (e)(4) | NY25-A9; a recorded decision date is used and the reading is registered, not settled. |
| **demonstrably**, **promptly** | (a)(1) | Held judgment `care.provided_promptly`. |

**The limit, stated:** "no defining document retrievable" means this session did not retrieve one
from LII, the Board's pages, or the specimens. The Board's form instructions and the licensed
schedules were not opened; a definition may sit in either.

## What the test changed against CV7's first encoding

CV7 encoded five such terms as facts and rebuilt the register after the comparison exposed it. Here
the four ungrounded terms were encoded as meanings on the first pass, and the fact schema declares
no field for any of them. `authorized` recurs, with the same missing citation; `format prescribed
by the Chair` and `legally defective` are new to this section; `applicable fee schedule` is CV7's
Region finding in a different form: the section decides amounts with a document it neither cites
nor may reproduce.
