# Provenance, 12 NYCRR fee schedule provisions

Retrieved 2026-08-25 from this machine; the retrieval instant read from the environment clock was
`2026-08-25T04:08:39Z` (first batch) and `2026-08-25T04:16:51Z` (the official-compilation attempt).
Every digest below was computed locally with `shasum -a 256`. `SHA256SUMS` beside this file covers
the files kept in this directory.

## What is kept here, and what is pinned by digest only

**Kept (the primary amendment instruments, the Board's own text, and the compiled text as
extracted):**

| file | what | bytes | sha256 |
|---|---|---|---|
| `proposed-2026-01-14-text.pdf` | Text of the Notice of Proposed Rule Making, State Register 2026-01-14, WCB subject no. 046-1788 | 111,374 | `9526c60e9a0b53d3515fc4f8208ae8615fc6f9596b8ba54ad7509311a33e3e40` |
| `revised-proposal-2026-08-21-text.pdf` | Text of the revised proposal of 2026-08-21 (Notice of Revised Rule Making, State Register 2026-09-02). NOT ENCODED; kept for the record | 112,121 | `59d64c8faaf736882cffe8938bca4e192cd0af9adf42b67c80f69b38d1755b6b` |
| `adopted-2026-04-22-329-1.3e-text.pdf` | Text of the adopted new subdivision (e) of 329-1.3, Notice of Adoption State Register 2026-04-22 | 68,009 | `8e91699c9c8861629a97d23121888fdf7b0451d4abf436f7f615264ffcd2483a` |
| `adopted-2025-02-26-329-1.3c-text.pdf` | Text of the adopted subdivision (c) of 329-1.3, Notice of Adoption State Register 2025-02-26, effective 2025-03-22 | 99,056 | `0ef01bb15c89d5f28ab14e0966a5faf1f75b08d28df25b025ab7bc047a6331d2` |
| `*.txt` beside each PDF | `pdftotext -layout` of the PDF | | in `SHA256SUMS` |
| `lii-sections.txt` | Body text of the eleven in-scope sections as compiled by LII, tags stripped, whitespace collapsed, notes block kept | | in `SHA256SUMS` |

**The January proposal text was retrieved from the Internet Archive**, capture
`20260521044345` of `https://www.wcb.ny.gov/content/main/regulations/proposed/med-fee-sched-2026-01/text.pdf`,
because by 2026-08-25 the Board's page for the January proposal returned HTTP 404 on both hosts
tried (`www.wcb.ny.gov`, `apps.wcb.ny.gov`); the Board's regulations index now lists the revised
proposal in its place. The capture is the Board's PDF as served on 2026-05-21; the archive is a
second party between the Board and this register, and that is stated rather than hidden.

**Pinned by digest, not stored (raw HTML, ~30 KB each, public and re-fetchable):**

| source | URL | sha256 of raw HTML |
|---|---|---|
| LII 329-1.1 | https://www.law.cornell.edu/regulations/new-york/12-NYCRR-329-1.1 | `a6dd905cd79fd181a5e591e9f9dcc779808988de993b07c46d53499808ba2f8d` |
| LII 329-1.2 | …/12-NYCRR-329-1.2 | `10912d20a595320e3f65c7b3dceed1a6a135697592c635b60b991097c38d3694` |
| LII 329-1.3 | …/12-NYCRR-329-1.3 | `411ea12fbb842af830eea57df646fb57c8aea7791858c8bd8cb255835179ef1a` |
| LII 329-4.1 | …/12-NYCRR-329-4.1 | `b147d2037d839b21168235bdc547651e32b5b84ca774dd2ee0ec67d374322648` |
| LII 329-4.2 | …/12-NYCRR-329-4.2 | `19514f73591433550d82fc7f1768f2b00678b3f5b0bf8aedef24ad2bf4fb3665` |
| LII 333.1 | …/12-NYCRR-333.1 | `9a9570da56afc567cab4554e1aa0c2c8ec85df2864ac64455ef1270d44239b16` |
| LII 333.2 | …/12-NYCRR-333.2 | `7658619895e04046342a5375952ecc5fdfdd6eba69ae311e4f0815fb27424bb8` |
| LII 343.1 | …/12-NYCRR-343.1 | `878d23699e9166b7fcfd425693b521701dd76fc0ae0470459460d506d47b9109` |
| LII 343.2 | …/12-NYCRR-343.2 | `2a98dc5bfe3f5532052c43ac7a0042ec0f62f294bf454519d96255f82f2dc99c` |
| LII 348.1 | …/12-NYCRR-348.1 | `6b218e5d57ea17f9bfd297c790f749ed624a4a82a0d37149938ccd6a1aab4e84` |
| LII 348.2 | …/12-NYCRR-348.2 | `ae8f499fbbbf21572125601f61d5a5a6c9d5e3f7fb7ba00f833680e80ab1b518` |
| WCB subject no. 046-1788 | https://www.wcb.ny.gov/content/main/SubjectNos/sn046_1788.jsp | `57247b064d7225697ebe0ac556299c7ba553982ad1a1d25b04b5ee82493a6087` |
| WCB regulations index | https://www.wcb.ny.gov/content/main/regulations/ | `5aae79849256b38b3d35388ab5ca4db25f9ea5ae152ec508963b1d26694bb97b` |
| WCB revised proposal page | https://www.wcb.ny.gov/content/main/regulations/revised/revised-med-fee-2026-08/ | `7c85f1e1153bbd9b6f73b776c3fcad64aeda1af47979c13ae60f1e9beb0f8602` |
| WCB adoption page, (e) | https://www.wcb.ny.gov/content/main/regulations/adopted/billing-guidance-2026-04/ | `cdbd682a6ac8cad69e1f16715cd62962fb797ec31661f6f2089ed7fdd15fe75d` |
| WCB adoption page, (c) | https://www.wcb.ny.gov/content/main/regulations/adopted/pta-ota-2025-02/ | `a7b2bf192a0bd6d35b7d0c12a104a1b20c074c8f46ae8a59bdc6105f3e461fc9` |
| WCB revised proposal, assessment of public comment (PDF) | …/revised-med-fee-2026-08/assessment-public-comment.pdf | `de5a2e8a105511be72fbcc8634d262f48439d3067a56658db7375c76df01ccf3` |
| WCB revised proposal, regulatory impact statement (PDF) | …/revised-med-fee-2026-08/ris.pdf | `3041185f4996371b385e92cc1039af26cb50d7086c15de72f60a91fa384a28ed` |
| Internet Archive capture of the January proposal PAGE (2026-04-20) | http://web.archive.org/web/20260420123949/…/med-fee-sched-2026-01/ | `8aff602c28d456814f9145430a308af139b83c45c10e9187735a59e806c1e32f` |

**Retrieval mechanics.** `curl` with a browser user agent; LII and wcb.ny.gov served plain
HTTP 200. Justia (`regulations.justia.com`) returned 403 and is not used. `dos.ny.gov` (the State
Register itself) returned 403 on every path tried, so the Register issues of 2026-01-14 and
2026-04-22 are cited from the Board's notices, not from the Register.

## The official compilation was NOT retrieved

`https://govt.westlaw.com/nycrr/…` returned **HTTP 403** at `2026-08-25T04:16:51Z` on the index
and on a search URL. The in-force text is therefore established from an unofficial compilation
(LII) and from the Board's own texts, and the three are compared below. Where they disagree
(ambiguities NY-A3 and NY-A4) the compilation's text is encoded and the disagreement is registered.
The compilation says only "State regulations are updated quarterly"; it states no currency date.

## Three copies of the in-force 329-1.3 text, compared

The in-force text of 329-1.3 exists in three places retrieved here: the LII compilation, the Board's
2025 adoption text (which restates (a) to (c)), and the January 2026 proposal, whose bracketed
text is the Board's statement of the current text it proposes to strike. Compared after collapsing
whitespace:

| comparison | result |
|---|---|
| LII (a) vs 2025 adoption (a) | IDENTICAL |
| LII (b) vs 2025 adoption (b) | differs in two typographic places: `1 -800-464-3649` vs `1-800-464-3649`; a trailing period |
| LII (c) vs 2025 adoption (c) | differs only in apostrophe glyph (`'` vs `’`) at three places; LII then continues with (d), which the 2025 text does not carry |
| 2025 adoption (c) chapeau to (3) vs January proposal, bracketed current text | the proposal strikes `Physical Medicine Section of the` and `Medical Fee Schedule` in (c)(1) and (2) and inserts the PT/OT schedule reference; the rest is the same text |

So the operative text agrees across all three, modulo typography, and the two places the
Board's restatement disagrees with the compilation on OTHER sections (329-4.2(b)'s creation date,
333.2(b)'s telephone number and URL) are registered as NY-A3.

**What LII carries that the Board's texts do not, and the reverse.** LII carries 329-1.3(d), the
COVID-19 testing subdivision, which the Board's 2025 adoption text omits and the Board's 2026
proposal restates. LII does NOT carry 329-1.3(e), adopted 2026-04-22; the Board's adoption text
is the only retrieved source for it and is encoded from that text.

## Elisions under the licensing constraint

The regulation itself quotes, in four places, text that belongs to a licensed document. Each is
elided in `clauses.json` and marked `[… ELIDED …]`, and the register cites the code or rule by
identifier only:

- 329-1.3(e)(2)(v): one sentence of Surgery Ground Rule 12(B) of the Medical Fee Schedule;
- 329-4.2(d): the CPT descriptor of code 99441;
- 333.2(c)(1) to (3): the CPT descriptors of codes 99441, 99442 and 99443;
- 348.2(c): the CPT descriptor of code 99441.

The proposed fee schedules themselves (the `20251103-RefMed-NYFS-*.pdf` and
`20260623-RefMed-NYFS-*.pdf` documents the Board posted with the proposals) were **not
downloaded**. Their URLs were observed on the proposal pages and nothing in them was read.
