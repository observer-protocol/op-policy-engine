# Provenance, FECA PM 2-0805

Retrieved by the Hermes cron job of 2026-08-23, recorded in `feca-retrieval-2026-08-23.md`. Every
digest below was recomputed locally after transfer and reconciles against that record.

## The chapter

| | |
|---|---|
| chapter | 2-0805, Causal Relationship, Group 1 (Adjudication of Claims) |
| URL | https://www.dol.gov/agencies/owcp/FECA/regs/compliance/DFECfolio/FECA-PT2/group1#20805 |
| page-stated revision | Trans. No. 13-05, dated 01/13, with paragraph 3 at Trans. No. 23-04, dated 05/23 |
| file | `ch_2-0805.txt`, 28,667 bytes |
| sha256 | `3f04d8c6a9a3f94dbfc21e9227df9fedd7bf72f6eadc89fc297cc631ea8381c6` |
| retrieved | 2026-08-23T00:08:33Z |

**Chapters are not separate URLs.** Each group page embeds all its chapters inline as
`<div title="Chapter N-NNNN, TITLE">` blocks, so provenance is per-chapter on the extracted text and
per-page on the raw HTML. The retrieval record carries both.

**dol.gov serves this folio behind an Akamai WAF**; plain `curl` returns 403 and the pages were
retrieved with HTTP/2 and full browser headers. Recorded because it is the same class of obstacle
that shaped the SI 2017/752 retrieval, and because a future re-pull will meet it again.

## Both sides pinned

| | file | bytes | sha256 |
|---|---|---|---|
| implementing regulation | `ecfr_20cfr10.txt` | 287,409 | `dff6759c251469dadd07e5e343b84efeaf5a05508f15ff09dc8f2603c1eaf889` |
| operative statute | `usc_ch81.txt` | 228,492 | `a5a9a34183655e477bc9de4a74c9bf815a9a227c01e300e79e1e19b7ed4cb430` |

**PINNED BY DIGEST, NOT STORED.** The two files above are 287 KB and 228 KB of public government
text and are left out of the repository, on the same basis as the SI 2017/752 sources: the URLs are
canonical and public, so anyone can re-fetch and compare against the digests. They sit on op-vps at
`~/.hermes/cron/output/feca/`.

**AND THE DIGESTS ABOVE ARE FETCH DIGESTS.** Neither has been tested for serialisation stability the
way the SI 2017/752 provisions were, so it is not known whether they reproduce. eCFR serves XML and
is the more likely of the two to move. Recorded as untested rather than assumed stable. See
REUSE-LOG E11 and ../../_sourcing/canonicalise-xml.mjs.

20 CFR Part 10 pulled against eCFR issue date **2026-08-20**, the most recent for Title 20 at
retrieval. 5 U.S.C. ch. 81 is the **USCODE-2020** edition, sections 8101 to 8152 plus 8171 to 8173
and 8191 to 8193.

Where a clause implements a provision of either, `clauses.json` names it in an `implements` field.
Four do.

## What is NOT pinned, and it is load-bearing

**Three ECAB decisions are cited as operative authority and are not in the retrieved set:** James L.
Hearn, 29 ECAB 278; Loras C. Digmann, 34 ECAB 1049; and Sandra Dixon-Mills, 44 ECAB 882 (1993).

The chapter states their holdings rather than quoting them, and two of the three supply content the
chapter uses and does not define: `independent intervening cause` and the natural-consequence rule
itself. **So part of the operative content of this encoding rests on documents nobody has pinned**,
and that is a different exposure from either earlier domain, neither of which incorporated
adjudicated case law.

## Scope

One chapter, as scoped. `meta_group1.json` is kept beside the text because it carries the retrieval
record's own per-chapter digest, so the reconciliation can be re-run without the narrative document.
