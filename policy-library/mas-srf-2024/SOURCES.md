# Sources

Retrieved 2026-08-26 00:26 to 00:27 UTC (2026-08-25 18:26 to 18:27 CST) from `www.mas.gov.sg`
directly (HTTP 200, no redirect, no WAF challenge), with a desktop browser User-Agent. Every
file is stored under `source/` with its SHA-256 in `source/SHA256SUMS`; text extractions were made
with `pdftotext -layout` (poppler) and are stored beside the PDFs. Nothing was taken from a
law-firm summary or any secondary source. See `source/PROVENANCE.md` for the retrieval check.

## Documents the register pins to

| # | Exact title (as the document states it) | Version / date | URL | sha256 | Pages |
|---|---|---|---|---|---|
| 1 | GUIDELINES ON SHARED RESPONSIBILITY FRAMEWORK | Issue Date: 24 October 2024. Effective Date: 16 December 2024. Landing page: "Published Date: 24 October 2024". Applies to: Full Bank (Locally Incorporated), Full Bank (Branch), Major Payment Institution. | https://www.mas.gov.sg/-/media/mas-media-library/regulation/guidelines/pso/guidelines-on-shared-responsibility-framework/guidelines-on-shared-responsibility-framework.pdf (from https://www.mas.gov.sg/regulation/guidelines/guidelines-on-shared-responsibility-framework) | `bc5f937a1baffac0758532b3ae95c9f7cc4b7db5ba9d2c2d7b5a5124892af6a1` | 15 |
| 2 | E-PAYMENTS USER PROTECTION GUIDELINES [Amendments to take effect on 16 December 2024] | Issue Date: 28 September 2018. Effective Date: 16 December 2024 [Amended on 24 October 2024]. Its footnote 1: "This version ... indicates the amendments which will take effect on 16 December 2024. It has been published in advance". Its 1.5: amendments to 4.21, 6.4, 6.5 and Section 8 take effect 16 June 2025. Landing page: "Last Revised Date: 25 October 2024"; the 5 September 2020 version is listed "Cancelled w.e.f 16 December 2024". | https://www.mas.gov.sg/-/media/mas-media-library/regulation/guidelines/pso/e-payments-user-protection-guidelines-with-effect-from-16-dec-2024/e-payments-user-protection-guidelines-with-effect-from-16-december-2024.pdf (from https://www.mas.gov.sg/regulation/guidelines/e-payments-user-protection-guidelines) | `384e962f206cae51b4e7899a621f2f151f004a0c6e4be7e5bf10ca3853fa0fd7` | 38 |

The one-day difference between the EUPG landing page's "Last Revised Date: 25 October 2024" and
the PDF's "[Amended on 24 October 2024]" is recorded (FINDINGS.md F-12). It is not a version
ambiguity: one current PDF is served, and the prior version is marked cancelled.

## The third document the brief named: STOP CONDITION TRIGGERED, recorded, not built on

The brief named "Annex: Duties of FIs and Telcos under the SRF" as a Tier 1 document to fetch.
**The current Guidelines (document 1) carry no annex**: `grep -ci annex` over its text is 0, and
its landing page lists exactly two files, the Guidelines and the operational-workflow infographic.
The only document on `mas.gov.sg` with that title is the annex to the 25 October 2023
**consultation** media release, which predates the Guidelines by a year and lists FOUR FI duties
where the Guidelines assess FIVE (4.2.5, real-time fraud surveillance, was added after
consultation; media release of 24 October 2024, para 3). Its wording is also superseded (`known
phishing links` against `a designated database`; `SSIR` against `authorised aggregators`).

That is a version ambiguity on one of the three named documents. Per the brief it is reported
(FINDINGS.md F-01), and **no clause pins to it**: the duties are pinned to Guidelines 4.2 and 5.2,
which are the current text. It is retrieved and stored so the difference is inspectable, and is
cited once, in ambiguities.json A25, for the 2023 verb split between 5.2.1 and 5.2.2.

| # | Exact title | Version / date | URL | sha256 | Pages |
|---|---|---|---|---|---|
| 3 | Annex A: SRF Duties of Financial Institutions; SRF Duties of Telecommunication Companies | Annex to the MAS/IMDA media release of 25 October 2023 ("MAS and IMDA Consult on Shared Responsibility Framework for Phishing Scams"). PDF created 2023-10-25. SUPERSEDED by document 1. | https://www.mas.gov.sg/-/media/mas/news/media-releases/2023/annex-a_duties-of-financial-institutions-and-telcos-under-the-shared-responsibility-framework.pdf | `eedc411f40bcf020fb241adabcb62f934eb43dff1738d4ae0425b37fe1cd07a2` | 1 |

## Retrieved for context, not pinned by any clause

| Title | Date | URL | sha256 |
|---|---|---|---|
| SHARED RESPONSIBILITY FRAMEWORK Operational Workflow (infographic) | PDF created 2024-10-24; listed on the Guidelines landing page | https://www.mas.gov.sg/-/media/mas-media-library/regulation/guidelines/pso/guidelines-on-shared-responsibility-framework/infographic-on-operational-workflow-for-shared-responsibility-framework.pdf | `8c7acb15687a24529e455c81371a021879ea8d6a394b0a35e07ff10dd7ccc6f0` |
| MAS and IMDA Announce Implementation of Shared Responsibility Framework from 16 December 2024 (media release) | 24 October 2024 | https://www.mas.gov.sg/news/media-releases/2024/mas-and-imda-announce-implementation-of-shared-responsibility-framework-from-16-december-2024 | HTML, not stored; para 3 quoted in ambiguities.json A23 |

The infographic is cited in ambiguities.json A4 for its Outcome Stage wording ("If FI breaches SRF
duties"), which is a reading the register registers and does not adopt.

## Not retrieved

- IMDA's Directions to Telcos under section 31 of the Telecommunications Act 1999, which SRF 5.1
  says prevail over the 5.2 duties. Not on `mas.gov.sg`; outside the brief's source rule
  (FINDINGS.md F-06).
- The SGNIC list of participating aggregators (SRF footnote 9), which the register takes as a
  supplied fact (`telco.authorised_aggregators`), never as text.
- No bank's terms and conditions. Excluded by the brief for this session.
