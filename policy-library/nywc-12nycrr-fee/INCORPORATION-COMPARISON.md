# The incorporation finding, compared against the Illinois rehearsal

A comparison, not a generalisation. Written 2026-08-24 on the branch, against the register as
built (`versions/in-force/register.json`) and against the Molina rehearsal's own reports
(`~/molina-rehearsal/REPORT.md` §3e and §4, `REPORT-3.md` "New", `REPORT-7.md` §5), which are quoted
where they are relied on. Nothing here changes the register; one wording it corrects is noted at
the end.

## What the Illinois finding actually is, in its own words

Three statements, and they are three different things:

1. **Elsewhere-heavy.** "Most of the chapter's operative content is (a) in other documents it
   points to, (b) reserved to Molina as a discretion or a process, or (c) contract furniture ...
   a provider manual removes judgment from the provider by moving the rules out of the manual, not
   by stating them mechanically." (REPORT.md §4.) Measured as the misfit family: INCORPORATION 22
   sites + OPEN_INCORPORATION 1 of 213 units (10.8%), beside PROCESS 11, DISCRETION 9 and the rest.
2. **Named and located elsewhere: cited with a pointer, content not in the chapter.** 23 sites
   (REPORT.md §3e): CMS/state billing guidelines, the NUCC and NUBC manuals, CPT and HCPCS, NCCI,
   HFS Chapter 200, the Provider's contract. Named by class, mostly with no locator.
3. **A term the document decides an outcome with and defines nowhere, here or by pointer.** Nine
   terms on ten clauses, encoded as `rests_on_ungrounded_term`, whose emission says "the document
   decides this outcome with a term it never defines, here or by pointer". The instance that
   produced the 25% class: **"clean claim"**, the term the manual's only stated processing deadline
   turns on, "used twice in the manual, defined nowhere", and defined at 42 CFR 447.45(b), **a
   regulation the manual does not cite**. Over 24,000 paired evaluations, 25% of the divergences
   were "the manual cannot determine because its term is defined only in a regulation it does not
   cite" (REPORT-3.md). REPORT-7 §5 then tested twelve of Meridian's operative terms on four
   columns (decides what; defined in the chapter; elsewhere in the manual; defined in an uncited
   regulation) and found seven of twelve in an uncited federal regulation.

The item asks whether the NY register's eight INCORPORATED_BY_REFERENCE clauses are statement 2
or statement 3. They are statement 2, and statement 3 is present in the NY register too, on other
clauses, and was not labelled.

## The eight clauses: what each incorporates, and whether it is cited or gestured at

"Cited" here means the regulation names the document by title, states its edition, names its
publisher and says where it can be obtained. "Located" means it also names the rule inside the
document. "Gestured" means it points with a phrase and no locator.

| clause | what the regulation incorporates | how it points | retrieval |
|---|---|---|---|
| `12nycrr/329-1.3/a/incorporation` | the whole Official New York Workers' Compensation Medical Fee Schedule: fees, RVUs, conversion factors, ground rules | **cited**: title, "updated December 11, 2019", "published by OptumInsight", "herein incorporated by reference"; 329-1.3(b) gives four examination sites, a postal address, a telephone number and two URLs | purchase, or examination at the Department of State and listed libraries |
| `12nycrr/329-4.2/a/incorporation` | the whole Acupuncture and PT/OT Fee Schedule, for acupuncture | **cited** as above; 329-4.2(c) gives the same sites | purchase or examination |
| `12nycrr/329-4.2/b/incorporation` | the same schedule, for PT and OT | **cited** | purchase or examination |
| `12nycrr/333.2/a/incorporation` | the whole Behavioral Health Fee Schedule | **cited**; 333.2(b) | purchase or examination |
| `12nycrr/343.2/a/incorporation` | the whole Podiatry Fee Schedule | **cited**; 343.2(b) | purchase or examination |
| `12nycrr/348.2/a/incorporation` | the whole Chiropractic Fee Schedule | **cited**; 348.2(b) | purchase or examination |
| `12nycrr/329-1.3/c/4/rvu-cap-unchanged` | the daily maximum of billable RVUs for PT and OT | **gestured**: "as outlined elsewhere in the fee schedule". The document is identifiable through (a); the rule inside it is not located | purchase or examination |
| `12nycrr/329-1.3/e/2/v/rules-elsewhere` | the rules on co-surgeons, assistant surgeons, minimum assistant surgeons, surgical teams, inpatient billing | **gestured**: "outlined and addressed elsewhere in the Official New York Workers' Compensation Medical Fee Schedules"; the second limb of the same subdivision then **locates** one rule precisely, Surgery Ground Rule 12(B), and quotes its sentence | purchase or examination |

So: six of eight incorporate a whole document and cite it fully; two incorporate a rule inside a
cited document and gesture at the rule's location; one of those two sits beside a precise
citation of a neighbouring rule in the same subdivision.

**Against Illinois statement 2.** Same phenomenon, opposite pointer quality. Molina points at
"CMS/state billing guidelines" and "the NUCC manual" by class with no locator; 12 NYCRR points at
each schedule by title, edition, publisher and purchase address, because incorporation by
reference in a New York regulation has to (the Department of State requires the material to be
examinable at its office, which is why every availability subdivision names One Commerce Plaza).
The regulation is a better pointer than the manual. It is not a better register: the pointed-to
text is licensed in both cases (CPT for Molina; the schedules here), and the gap the pointer leaves
is the same gap.

**Not the same phenomenon in one respect.** In Molina, incorporation was a MISFIT: the schema had
no category for it, and 22 sites were counted outside the register. Here it is a disposition
inside the register, which is what the brief pre-ruled. So the two counts (22 + 1 of 213 units;
8 of 74 clauses) are not the same count: one is a residue outside a register, the other a class
inside one.

## Statement 3, tested on the NY register: terms the regulation decides with and defines nowhere

The eleven in-scope sections contain **no definition of any term**: zero occurrences of "means",
"shall mean" or "defined" (`source/lii-sections.txt` and the Board's texts, grepped). 12 NYCRR 300.1
defines terms "as used in this Part" (Part 300) only. So every operative term is defined, if at
all, in a document outside the sections, and the question is whether the section cites it.

The REPORT-7 §5 columns, applied:

| term | decides (clause) | defined in the eleven sections? | cited where it is defined? | defined only in a document the section does not cite? | how the register takes it |
|---|---|---|---|---|---|
| **Region I to IV** | the 87635 fee, `d/1/regional-fee` | no; used once, in (d)(1) | **no**. The schedule is cited in (a); nothing says the regions are defined in it, and the section does not say where a provider's region comes from | **yes**: the schedule's ground rules assign counties to regions | supplied fact `covid.region`. The clause decides 4 of 600 on it |
| **required pre-operative testing protocol in accordance with Department of Health guidance** | `d/2/billable-basis` | no | **no**: "Department of Health guidance", no title, date or URL (NY-A8) | **yes** | supplied fact `covid.claim_basis`; 5 of 600 decided |
| **routine screening** | `d/3/no-routine-screening` | no | no | not defined anywhere retrieved; plan-internal, like Molina's "minimum edits" | supplied fact; 5 of 600 |
| **serological, molecular or other reliable testing** | `d/covid-testing-code` | no | no | "reliable" is defined nowhere retrieved | supplied list `covid.tests_billed`; 1 of 600 |
| **services or activities otherwise reserved for PTs and OTs** | `c/6/scope-not-expanded` (JUDGMENT) | no | **partly**: "by statute, and/or any applicable regulations promulgated by" three agencies, a class; (c)(6)(i) cites one section, Education Law 6738(a), as an example | yes, for everything the example does not cover | held judgment `assistant.service_reserved_for_pt_ot`; 81 of 600 assessed |
| **maximum numbers of billable RVUs** | `c/4` (incorporated), `c/5/priority` | no | gestured, "elsewhere in the fee schedule" | **yes** (the value) | (c)(4) is INCORPORATED; (c)(5) decides on the recorded priority without the value, 33 of 600 |
| **unit fee for a definite treatment and period of aftercare** | `329-1.2`, five clauses | no | "the schedule", gestured; the schedule is cited in 329-1.3(a) | **yes**, and whether any such fee exists is NY-A9 | supplied facts; 0 of 600 reached the first clause, 1 of 600 the death clause |
| **amount payable ... had they been performed directly** (the direct-therapist or physician fee) | `c/3/eighty-five-percent`, `e/1/same-amount`, `e/2/sixteen-percent` | no | the schedule, cited in (a) | **the amount is in the cited document**; the term is not defined but the document is named | applied bound; 74, 10 and 19 of 600 decided |
| **Physical Medicine Section** | `c/1`, `c/2` code-source | no | **located**: a named section of a cited document | no | supplied `schedule.cited.code_source` |
| **Modifier 1B of Ground Rule 9** | `333.2/c/no-1b-enhancement` | no | **located**: rule number in a cited document | no | modifier list; 8 of 600 |
| **Surgery Ground Rule 12(B)** | `e/2/v/supersedes-gr12b` | no; the sentence is quoted | **located** and quoted | no | DEFINITIONAL |
| **telemedicine in accordance with section 325-1.8** | three telemedicine clauses | no | **located**: 12 NYCRR 325-1.8, public, out of scope | no | supplied fact `telemedicine.per_325_1_8` |
| **authorized** (PT, OT, physician; "Board-authorized") | every supervision clause | no; seven uses | **no**: authorization is under WCL 13-b and 13-k and 12 NYCRR Part 324 and 325, none cited in these sections | **yes** | supplied facts `provider.supervising_authorized` etc. |
| **ACGME accredited residency or fellowship program** | `e/acgme-program` | no | the accrediting body is named; its standards are not cited | the body's own | supplied boolean |
| **assistant at surgery**, **physician code fee** | (e)(2) | no | the schedule, cited in (a) | in the cited document | supplied role and bound |
| **demonstrably different services** | `e/2/iv/single-bill-1R` | no; one excluded ground stated | no | not defined anywhere retrieved | held judgment |

[population: 600 synthetic determinations, seed 20260825, parameters sha256 2268173b241c from generate-determinations.mjs header]

**Count and pattern.** Sixteen operative terms. The sections define none of them. Six are defined
only in a document the section does not cite by location or at all (**Region**, **DOH guidance**,
**reserved services** beyond the one example, the **RVU maximum**, the **unit fee**, and
**authorized**); four are located precisely inside a cited document (Physical Medicine Section,
Ground Rule 9 / Modifier 1B, Ground Rule 12(B), section 325-1.8); three are in a cited document
without a locator (the direct amount, assistant at surgery, physician code fee); three are
defined nowhere retrieved (routine screening, reliable testing, demonstrably different).

**The one that has the Illinois shape exactly is Region.** A clause the regulation states to the
cent, on which the register can decide with nothing but its own text, turns on a term the
regulation uses once and never defines, whose definition sits in the licensed document the section
incorporates without saying that is where regions come from. That is "clean claim": a decisive
term, defined only in a document the deciding text does not cite for it. The difference is
degree, not kind: 447.45(b) is public and uncited; the region table is licensed and uncited.
"Authorized" is the second exact instance: it gates every supervision clause and its definition is
in statute and in Parts the sections never name.

## Is any clause undeterminable for that reason?

**In the register as built, no, and that is an encoding choice, not a property of the source.**
Molina encoded its nine no-pointer terms with the `ungrounded` emitter: unsupplied, the clause
returns `undetermined, waiting: meaning`; supplied by the institution, the result token carries
`_on_supplied_meaning` and the record attributes it. 131 of 4,730 records in its sample were
waiting on a meaning (2.8%), and every determination in its signed run read `undetermined,
waiting: meaning` on those clauses.

The NY register took every such term as a **fact** (`covid.region`, `covid.claim_basis`,
`provider.supervising_authorized`) or a **held judgment** (`assistant.service_reserved_for_pt_ot`).
So no NY record waits on a meaning: the replay shows `waiting: meaning` on 0 of 44,400 records.
The region is never undetermined for want of a definition, because the determination asserts a
region and the register believes it. That is the same shape as a payer asserting that a claim is
"clean" and the register not asking what clean means.

**What would change if the six uncited-definition terms were encoded as Molina's were.** The
clauses `d/1/regional-fee`, `d/2/billable-basis`, `c/6/scope-not-expanded`, the five 329-1.2
clauses, and every clause reading `provider.supervising_authorized` (four) would carry
`rests_on_ungrounded_term`, return `undetermined, waiting: meaning` unless the institution
supplied the term's meaning, and carry `_on_supplied_meaning` when it did. On this population
that is 4 + 5 + 81 + 1 + (the supervision clauses' 28 + 21 decided) records that would move from
a decided token to `undetermined` or to an attributed token. Not done here: it is a change to the
register's reading of the source and it is the item's decision, not mine. The comparison is only
sound once both registers measure the same thing the same way, and today they do not.

## So: same phenomenon, or two things sharing a label?

- The **eight INCORPORATED_BY_REFERENCE clauses** are Illinois statement 2, cited-elsewhere, with
  a better pointer than any Molina site has. Same phenomenon as Molina's INCORPORATION class,
  counted differently (inside the register against outside it).
- The **Illinois finding's actual shape**, statement 3, a decisive term defined only in a document
  the deciding text does not cite, **is present in the NY regulation on at least two terms**
  (Region, authorized) and four more by gesture, and **is not labelled in the NY register**,
  which took those terms as supplied facts. The NY register therefore reports 0 meaning-waiting
  records where the Molina register reported 2.8%, and that difference is the encoding, not the
  documents.
- Two occurrences of statement 3 exist once the NY terms are read the Molina way. Two occurrences
  of statement 2 exist now. Which of the two the property should be stated over is the thing to
  decide before stating it, and this document does not state it.

## One correction this comparison forced

`clauses.json` for `12nycrr/329-1.3/d/1/regional-fee`, the evaluation note, and FINDINGS.md all
said the regional fee was "the one bound in this register a party holding zero clause text can
verify to the cent". True of the amounts, false of the clause: the region is the uncited term. All
three now say "given the region". The claim was mine, it was in the register, and the comparison
is what found it.
