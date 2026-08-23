# Retrieval check, 21 August 2026

Retrieval and inspection only. Nothing encoded. `src/`, the corpus and the generator untouched.

Every claim below traces to a file retrieved into this directory. Where a fetch failed, the step is
marked **UNVERIFIED** and no conclusion is drawn from the failure.

| step | subject | outcome |
|---|---|---|
| 1 | Universal Credit Regs 2013 (SI 2013/376) XML | **UNVERIFIED. Bot block.** |
| 2 | Visa Core Rules | **RETRIEVED.** Survey claim contradicted. |
| 3 | POMS RS 00202 | **RETRIEVED.** Survey claim confirmed. |

---

## STEP 1. SI 2013/376 XML: UNVERIFIED

**No file was retrieved. Nothing in this section describes the XML, because the XML was never seen.**

### The failure, exactly

Every representation returns `HTTP 202 Accepted` with `Content-Length: 0`. The response headers
name the cause:

```
HTTP/1.1 202 Accepted
Server: CloudFront
Content-Length: 0
x-amzn-waf-action: challenge
X-Cache: Error from cloudfront
```

`x-amzn-waf-action: challenge` is an AWS WAF bot challenge. It is **not** a 404, not a paywall and
not a login wall. The resource is not asserted to be absent.

Paths attempted, all identical:

| path | result |
|---|---|
| `/uksi/2013/376/data.xml` | 202, 0 bytes, WAF challenge |
| `/uksi/2013/376/data.akn` | 202, 0 bytes |
| `/uksi/2013/376/made/data.xml` | 202, 0 bytes |
| `/uksi/2013/376/contents/data.xml` | 202, 0 bytes |
| `/uksi/2013/376/regulation/18/data.xml` | 202, 0 bytes |
| `/uksi/2013/376/data.feed` | 202, 0 bytes |
| `/uksi/2013/376/data.htm` | 202, 0 bytes |

Eight retries on the primary path over roughly a minute: 202 and 0 bytes each time. A second
retrieval route (the agent HTTP fetcher, which renders rather than curls) returned empty content for
the same URL.

### What therefore cannot be answered

All five questions in the brief remain open. Specifically **UNVERIFIED**:

- whether each provision carries a stable machine-readable identifier
- whether version or in-force metadata exists at provision level or only document level
- whether amendments are structural or prose notes
- whether Schedule monetary amounts are present or referenced out
- the raw XML for Reg 18 (capital limit) and Reg 36 (element amounts)

**No verdict is given.** STRUCTURED, PRESENTATIONAL and PARTIAL all require reading the file.

### What would settle it

A route that satisfies the WAF challenge: a browser session, or the bulk data service, or a
mirror. The survey's original "HTML (+XML/Akoma Ntoso)" entry remains what it was, an inference
from an HTML page, and this check did not change its status.

## STEP 2. Visa Core Rules: RETRIEVED, and the survey claim is contradicted

The survey asserts these are proprietary and licensee-only, with no source cited. **A public PDF was
retrieved on the first attempt, without authentication.**

| | |
|---|---|
| url | `https://usa.visa.com/dam/VCOM/download/about-visa/visa-rules-public.pdf` |
| http | 200, `content-type: application/pdf` |
| bytes | 7,591,762 |
| pages | 923 |
| sha256 | `9a567b666256c932a0a1af50ba0ebde83da09817b4f8378d7aaacc5fb0f2bda3` |
| retrieved | 2026-08-21T23:25:48Z |
| title | Visa Core Rules and Visa Product and Service Rules |
| date printed on cover | **18 April 2026** |
| page footer classification | **"Visa Public"** |

### Access and confidentiality statement, verbatim from page 2

> Visa is committed to providing our partners and interested parties with greater insight into
> Visa's operations. As part of our effort, we are pleased to provide access to the latest edition
> of the *Visa Core Rules and Visa Product and Service Rules,* which govern participation of our
> financial institution clients in the Visa system.

> To protect cardholders and merchants and maintain the integrity of the Visa system, we have
> omitted proprietary and competitive information, as well as certain details from the rules
> relating to the security of the network.

> Any regional or country-specific rules within the *Visa Core Rules and Visa Product and Service
> Rules* apply only to the operations of financial clients within the relevant region or country,
> and any rules marked with the name of a region(s) or country(ies) are applicable to financial
> institutions operating in that region(s) or country(ies) only.

> The Visa Rules must not be duplicated, in whole or in part, without prior written permission
> from Visa.

### The correction, stated precisely

The document **is public**. It is also **an edited edition**: Visa states it has omitted proprietary
and competitive information and certain network-security details. So "licensee-only" is wrong, and
"complete" would also be wrong. The accurate description is a publicly published redacted edition,
refreshed semi-annually, with a reuse restriction on duplication.

### Numbered rule identifiers: yes, two schemes, plus per-rule version metadata

Observed on page 60:

- **Hierarchical section numbers**: `Section 4.1.14.1`, `Section 4.36.1.1`
- **Stable numeric ids**: `ID# 0026989`, `ID# 0030961`, and the containing block carries its own
  `ID# 0031185`
- **Per-block version metadata in the block footer**: `Edition: Apr 2026 | Last Updated: New`
- **Rule-level effective dating**, including the superseded value: a change block states
  `Effective 24 October 2026` and records that the previous effective date was 18 April 2026

Noted without further comment, since it is the same question STEP 1 asked and could not answer: this
document carries stable per-rule identifiers **and** per-rule version and effective-date metadata.

## STEP 3. POMS RS 00202: RETRIEVED, survey claim confirmed at section level

| | |
|---|---|
| url | `https://secure.ssa.gov/poms.nsf/lnx/0300202001` |
| http | 200 |
| bytes | 28,488 |
| sha256 | `9f4cdaeb0bda9517f420afaa48d44df0660b9451697f05a59dfb7ad72454d1c6` |
| section | RS 00202.001, Definitions and Requirements for Spouse Benefits |

### Enumerated eligibility conditions: present in the section body

Not a table of contents. The body carries a lettered and numbered structure:

- **A. Definition of a Spouse** with `A.1` legal spouse (sub-conditions `a` and `b`, joined by
  an explicit `or`) and `A.2` deemed spouse
- **B. Entitlement requirements for a spouse**, a numbered list whose items are joined by an explicit
  `and`, including `B.1` be the spouse of an entitled number holder, `B.2` file an application,
  `B.3` not be entitled to a RIB or DIB based on a PIA equal to or exceeding one-half the number
  holder's PIA

The conjunctions are written out, which is the property that matters: the composition is stated
rather than left to a reader.

### Numeric thresholds: present

Found in the section body: `age 62`, `age 16`, `one-half` (of the PIA), `1 continuous` (year),
`18 years`.

### Effective Dates and Rev stamps: at section level, not only on the TOC

Both appear on the section page itself:

- `Effective Dates: 07/24/2017 - Present`
- `TN 23 (10-18)` (transmittal number and date)
- the page title itself carries the date: `RS 00202.001 - Definitions and Requirements for Spouse
  Benefits - 07/24/2017`

It also carries outbound citations to statute and regulation at the head of the section
(`Social Security Act 202(a)`, `202(q)`, `227`; `20 CFR 404.310`, `404.311`, `404.312`)
and cross-references to other POMS sections inline.

**The survey's ranking on "explicit deadlines and enumerated required elements" is supported by the
section body**, not only by the table of contents it was originally read from. This check does not
speak to any other subchapter.

## Files retrieved into this directory

| file | sha256 | bytes |
|---|---|---|
| `visa-core-rules.pdf` | `9a567b666256c932a0a1af50ba0ebde83da09817b4f8378d7aaacc5fb0f2bda3` | 7,591,762 |
| `poms-rs00202001.html` | `9f4cdaeb0bda9517f420afaa48d44df0660b9451697f05a59dfb7ad72454d1c6` | 28,488 |

No file was retrieved for STEP 1.

## Marked UNVERIFIED

- Every question in STEP 1. The XML was never obtained; the failure is a WAF bot challenge and is
  recorded as an unconfirmed retrieval rather than as a property of the source.
- Whether the Visa PDF's omissions affect the rules a card-dispute workflow would read. The
  omission is stated by Visa in general terms and its extent was not assessed.
- Whether POMS subchapters other than RS 00202.001 carry the same section-level structure. One
  section was opened.

---

## STEP 1 CLOSED, 2026-08-21, later the same day

The earlier UNVERIFIED mark on SI 2013/376 is retired. The block was the AWS JavaScript challenge,
the same one diagnosed on SI 2017/752, and the same route clears it: navigate in a real browser so
the challenge executes, then read the parsed document.

Two documents retrieved and inspected.

**`/uksi/2013/376/contents/data.xml`**

- `dc:title` = The Universal Credit Regulations 2013
- 267 `ContentsItem`, 43 `ContentsPart`
- 10 distinct `RestrictStartDate`: 2013-04-29, 2017-11-03, 2018-12-10, 2019-09-16, 2019-10-31,
  2020-04-08, 2020-11-09, 2022-05-04, 2023-02-09, 2026-07-16
- 12 `ukm:UnappliedEffect`
- Every item carries an `IdURI`, for example
  `http://www.legislation.gov.uk/id/uksi/2013/376/regulation/4A`, so **suffixed provisions such as
  4A are addressable in the same space as unsuffixed ones**

**`/uksi/2013/376/regulation/54/data.xml`**, one provision, taken as a spot check

- 5 ids, to sub-paragraph: `regulation-54`, `-54-1`, `-54-2`, `-54-2-a`, `-54-2-b`
- 5 `RestrictStartDate`, 10 `ukm:UnappliedEffect`, `RestrictExtent` = `E+W+S` throughout

**So the four structural properties established on SI 2017/752 hold here too**, on a much larger
instrument, across suffixed provisions, and with an extent attribute SI 2017/752 did not exercise.
The retrieval route is a property of the publisher rather than of one instrument.

### What was NOT obtained, and why

**No byte digest for either file.** The first scripted read was refused by a local tool guard, and
the guard stayed active for page-initiated fetches in that tab afterwards. Everything above is
measured from the **parsed document tree**, which preserves element names, attributes and ids, but
is not the bytes on the wire.

**This is a weaker pin than the SI 2017/752 provenance record**, which carries a sha256 per file.
The site did not refuse anything here; the limit was local. It is recorded as a limit rather than
left to be assumed equivalent, because a structural reading and a digest are different evidence and
only one of them detects a later silent change.
