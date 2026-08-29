# GXS card-terms 4.7 + refund-help encode: findings

Findings file. No client-facing report. Retrieval instant `2026-08-29T23:21:16Z`.
Branch only; not merged; nothing deployed or published.

[population: 6 synthetic determinations, seed enumerated-not-random, parameters sha256 345115dc4be7 from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

## Pins

| source | URL | retrieved | bytes | sha256 |
|---|---|---|---|---|
| Card Account Terms, Section C clause 4.7 | https://www.gxs.com.sg/card-terms | 2026-08-29T23:21:16Z | 168557/168557 | `d42dfd6b480280c154ebd3820e5303d79a2b96976934a21bde8c1b71c6efc1b2` |
| Refund-help article | https://help.gxs.com.sg/?title=GXS_FlexiCredit%2FGXS_Credit_Card%2FSecurity_%26_Fraud%2FHow_can_I_request_a_refund_for_unauthorised_transactions_on_my_GXS_Credit_Card%3F | 2026-08-29T23:21:16Z | 64360/64360 | `4d0d6a06e4e7ab80b53ebd80c2385198eac674d577d3c4327c8b2a1ce0ba7bea` |

Paired by reference only: `srf-register-accepted-v1`. Not copied. No other institution's encode was copied, renamed, or cited into this directory.

## Clause count

The register carries **4/4** clauses (the array length; not invented):

- `gxs/card-terms/C/4.7/inform-immediately` (MECHANICAL)
- `gxs/card-terms/C/4.7/credit-permission` (MECHANICAL)
- `gxs/help/unauthorised-refund/in-app-path` (MECHANICAL)
- `gxs/notice/srf-citation` (MECHANICAL)

Ambiguities registered, not resolved: **4/4** (G1–G4).

## Completeness

| id | status | kind | checked |
|---|---|---|---|
| C-4.7-inform | WIRED | presence | true |
| C-4.7-credit | WIRED | presence | true |
| C-help-path | WIRED | presence | true |
| C-srf-citation-wired-absence | WIRED | absence | true |
| C-no-gxs-policy-authored | WIRED | presence | true |
| C-debit-5.7-absent-ruled | ABSENT-RULED | out-of-scope | true |
| C-banxico-absent-ruled | ABSENT-RULED | out-of-scope | true |

GAP: **0/7**. Every item has a check function. A skipped check is never passed.

## Citation mutant

Shown failing first: encoding `gxs/notice/srf-citation` as `const present` makes the citation assertion fail.
Then green: clean interpret is `absent` (WIRED absence). Determinations changed on the mutant: 6/6 (100.0%) [population: 6 synthetic determinations, seed enumerated-not-random, parameters sha256 345115dc4be7 from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history].

## Replay against the omitted public instrument

srf-register-accepted-v1 is not stored here. Divergence is by referenced clause id, including the missing-citation gap.

| paired clause (reference) | notice counterpart | citation |
|---|---|---|
| `srf/7.13/fi-credits` | `gxs/card-terms/C/4.7/credit-permission` | MISSING |
| `srf/7.2/explain-workflow` | (none) | MISSING |
| `srf/7.3/report-within-30-days` | `gxs/card-terms/C/4.7/inform-immediately` | MISSING |
| `srf/6.8/redress` | (none) | MISSING |
| `srf/1.1/fn1/card-exclusion` | (none) | MISSING |

Missing citation: **5/5** paired clause ids. That absence is WIRED. It is not filled in.

Credit-permission on the notice is the verb `may` (6/6 (100.0%) of the synthetic set). That is a fact about these pins, not a finding about GXS.

## Synthetic rates

0/6 (0.0%) [population: 6 synthetic determinations, seed enumerated-not-random, parameters sha256 345115dc4be7 from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

Synthetic rates stay REPOSITORY-INTERNAL. They are not findings about GXS.

Generator header digest `345115dc4be7`.
