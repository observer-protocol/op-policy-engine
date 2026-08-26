# Provenance of the retrieved sources

Retrieval and inspection. Every claim below traces to a file in this directory. Digests are in
`SHA256SUMS` (`shasum -a 256`, run in this directory) and repeated here for the two documents the
register pins to.

| file | document | http | content-type | bytes | pages | sha256 | retrieved (UTC) |
|---|---|---|---|---|---|---|---|
| `srf-guidelines.pdf` | Guidelines on Shared Responsibility Framework, issued 24 October 2024, effective 16 December 2024 | 200 | application/pdf | 316,947 | 15 | `bc5f937a1baffac0758532b3ae95c9f7cc4b7db5ba9d2c2d7b5a5124892af6a1` | 2026-08-26T00:27:16Z |
| `eupg-2024-12-16.pdf` | E-Payments User Protection Guidelines, amended 24 October 2024, effective 16 December 2024 | 200 | application/pdf | 412,922 | 38 | `384e962f206cae51b4e7899a621f2f151f004a0c6e4be7e5bf10ca3853fa0fd7` | 2026-08-26T00:27:16Z |
| `annex-a-2023-media-release.pdf` | Annex A to the 25 October 2023 consultation media release. SUPERSEDED; pinned by no clause | 200 | application/pdf | 103,890 | 1 | `eedc411f40bcf020fb241adabcb62f934eb43dff1738d4ae0425b37fe1cd07a2` | 2026-08-26T00:27:17Z |
| `srf-infographic.pdf` | Operational workflow infographic, listed beside the Guidelines | 200 | application/pdf | 110,541 | 1 | `8c7acb15687a24529e455c81371a021879ea8d6a394b0a35e07ff10dd7ccc6f0` | 2026-08-26T00:27:18Z |
| `*.txt` | `pdftotext -layout` of each PDF (poppler, this machine) | | text/plain | | | in SHA256SUMS | 2026-08-26T00:29Z |

Retrieved with `curl -sSL` and a desktop Chrome User-Agent from `www.mas.gov.sg`; the effective
URL equalled the requested URL for every file (no redirect). The landing pages
(`/regulation/guidelines/guidelines-on-shared-responsibility-framework`,
`/regulation/guidelines/e-payments-user-protection-guidelines`) were fetched the same way (HTTP
200, 273,311 and 269,184 bytes) to read the published-date and applies-to fields and the list of
files each page serves; they are not stored (they carry the site's navigation and change on every
deploy).

## Retrieval check

- `srf-guidelines.pdf` page 1, line 1: `GUIDELINES ON SHARED RESPONSIBILITY FRAMEWORK`; lines 2-3:
  `Issue Date : 24 October 2024`, `Effective Date : 16 December 2024`. The document the brief named,
  in its current version. Not the consultation paper.
- `eupg-2024-12-16.pdf` page 1: `E-PAYMENTS USER PROTECTION GUIDELINES`, `[Amendments to take
  effect on 16 December 2024]`; page 2: `Issue Date : 28 September 2018`, `Effective Date : 16
  December 2024 [Amended on 24 October 2024]`. The post-December-2024 enhanced version the brief
  named. The landing page lists the 5 September 2020 version as `Cancelled w.e.f 16 December 2024`.
- The brief's third document, the Annex, does not exist in a current version: the Guidelines carry
  no annex (0 occurrences of `annex` in 579 lines of text) and the landing page serves two files.
  The 2023 consultation annex is stored and marked superseded. STOP CONDITION 1 of the brief is
  triggered for this document and reported in `../FINDINGS.md` F-01; the register is built from the
  two current documents and pins nothing to the annex.
- PDF metadata: both current PDFs were created 2024-10-24 (CST), consistent with their stated
  dates. Neither carries an author field.

## Locations used

Clause `source_locator` values cite paragraph numbers and the page of the retrieved PDF as
`pdftotext` paginates it (the printed folio at the foot of each page, which starts at 1 after the
cover for the SRF and after the cover and notice page for the EUPG). Quotations in `text_en` are
verbatim from the `.txt` extractions, with footnote markers removed.

## What this file does not establish

- That either document is the version in force on any date other than the retrieval date. The
  EUPG's own 1.5 defers four paragraphs to 16 June 2025; the register carries that as clauses
  (`eupg/1.5/deferred-commencement`, `srf/4.4/fraud-surveillance-commencement`), not as a fact
  about this retrieval.
- Anything about IMDA's Directions (SRF 5.1), the SGNIC aggregator list (footnote 9) or any
  designated malicious-URL database (5.2.3): none was retrieved.
- Business-day counting in Singapore (public holidays): the register's `business_days` unit counts
  weekdays (ambiguities.json A28).
