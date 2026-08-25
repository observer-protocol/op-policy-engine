# Provenance, 12 NYCRR 325-1.25 and its two restatement layers

Retrieved 2026-08-25; the retrieval instant read from the environment clock was `2026-08-25T05:18:13Z`.
Digests computed locally with `shasum -a 256`. The files kept here are the extracted texts; the raw
HTML is pinned by digest and not stored (public, re-fetchable).

## The regulation

| source | URL | sha256 of raw HTML | kept as |
|---|---|---|---|
| LII, 12 NYCRR 325-1.25 | https://www.law.cornell.edu/regulations/new-york/12-NYCRR-325-1.25 | `d716273ae539673f` (first 16 of `d716273ae539673f…`, full value in DIGESTS-raw.txt) | `lii-325-1.25.txt` |

LII's notes block: amended State Register 2020-01-29 (eff. 2020-01-29) and 2021-10-27 (eff.
2021-11-01). Subdivision (g) says effective 2020-01-01 (NY25-A5). LII states no currency date.

**The cross-check against Westlaw was NOT done.** `govt.westlaw.com/nycrr` returned HTTP 403 to
curl (browser user agent) and is blocked to the session's fetcher; the Internet Archive holds no
capture of any Westlaw NYCRR document for this section; Justia returned 403 and Casetext 410. LII
is the one rendering this session can cite, and the register cites it. The specimen CSV's own
line that LII and Westlaw "agree" is an agent's claim this session could not verify and does not
rely on.

## Layer A, publishable (New York State Workers' Compensation Board)

| document | URL | dated | sha256 raw HTML (16) | kept as |
|---|---|---|---|---|
| What Providers Need to Know | https://www.wcb.ny.gov/content/main/hcpp/what-providers-need-to-know.jsp | **undated** | `5663ddee0eefe4b3` | `layerA-wcb-what-providers-need-to-know.txt` |
| CMS-1500 Requirements | https://www.wcb.ny.gov/CMS-1500/requirements.jsp | field matrix `Updated 05/18/2026`; narrative undated | `ff8690009e7e36af` | `layerA-wcb-cms1500-requirements.txt` |

The hub page's "Medical Billing Disputes page" link resolves to a 404 on both URL forms tried
(`MedicalBillingDisputes.jsp`, `medical-billing-disputes.jsp`); the fuller WCB statement of the
HP-1.0 conditions, if one exists, was not retrieved.

## Layer B, measured and held internal (daisyBill knowledge base)

| document | URL | dated (self-published) | sha256 raw HTML (16) | kept as |
|---|---|---|---|---|
| Timely Payment Requirements | https://kb.daisybill.com/articles/timely-payment-abc780c1-004b-42f9-b6da-16dcdf84eb24 | Last update December 16, 2025 | `ca74294d82bf2b5f` | `layerB-daisybill-timely-payment.txt` |
| Timely Filing | https://kb.daisybill.com/articles/billing-guides-a7397df4-a566-403f-8bf3-51218b621be8 | Last update December 4, 2025 | `8b64665e2eaea5f1` | `layerB-daisybill-timely-filing.txt` |
| Reimbursement Disputes | https://kb.daisybill.com/articles/payment-guides-be5200b6-d23a-4f04-a93c-d3bb930f8e34 | Last update December 16, 2025 | `f257484c343bffbe` | `layerB-daisybill-reimbursement-disputes.txt` |

URLs from `~/Atlas/review-queue/ny-wc-restatement-specimens-2026-08-25.csv`, retrieved by this
session, not by the agent that wrote the CSV.

**Layer B's quoted regulation text is not the in-force text.** Each article ends with a
`Subsection Text` block. Its (c)(1), compared word by word with LII's (c)(1) after collapsing
whitespace: 426 words against 369; the quotation says `submitted` where the compilation says
`received`, `placed on the chair prescribed form` where the compilation says `made in the format
prescribed by the Chair`, omits `the claimant and claimant's attorney if applicable` from every
recipient list, and omits the three `simultaneously with any other objections to the bill`
sentences. That is consistent with a text predating the 2021-11-01 amendment; which amendment
introduced each difference was not established (the earlier text was not retrieved). The register
encodes the articles' own prose, not their quotation.

## The specimen CSV

`ny-wc-restatement-specimens-2026-08-25.csv` and its companion `.md` (Atlas review queue) supplied
the layer B URLs and the dating claims. Every URL was fetched here; every date above is read from the
retrieved page, not from the CSV.
