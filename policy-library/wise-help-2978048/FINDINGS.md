# Wise help 2978048 encode: findings

Findings file. No client-facing report. Retrieval instant `2026-08-29T23:21:16Z`.
Branch only; not merged; nothing deployed or published.

[population: 8 synthetic determinations, seed enumerated-not-random, parameters sha256 48f824ec585f from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

## Pins

| source | URL | retrieved | bytes | sha256 |
|---|---|---|---|---|
| How do I report fraud or a scam? | https://wise.com/help/articles/2978048/how-do-i-report-fraud-or-a-scam | 2026-08-29T23:21:16Z | 119222/119222 | `5db3e87aa10515a5f4ac7322db38b76a947e8be9218cdcb623affccaedc08894` |

Only this URL is pinned. The related card-fraud article is ABSENT-RULED and is not encoded.

Paired by reference only: `policy-library/psr-2017-752` (CV2). PSR sha256 `c605d94f1ce7b1a5e032cb807f461e428c1a43e79e6fed232835a394efd52e86` is unchanged.

## Clause count

The register carries **9/9** clauses (the array length; not invented):

- `wise/2978048/scope/authorised-scam` (CONDITIONAL)
- `wise/2978048/exclude/card-unauthorised` (CONDITIONAL)
- `wise/2978048/exclude/account-unauthorised` (CONDITIONAL)
- `wise/2978048/report/wise-channel` (MECHANICAL)
- `wise/2978048/report/police` (MECHANICAL)
- `wise/2978048/outcome/recall-not-guaranteed` (MECHANICAL)
- `wise/2978048/outcome/no-guaranteed-refund` (MECHANICAL)
- `wise/2978048/loss/authorised-sender-responsible` (MECHANICAL)
- `wise/2978048/citation/psr-app` (MECHANICAL)

Ambiguities registered, not resolved: **4/4** (W1–W4).

## Completeness

| id | status | kind | checked |
|---|---|---|---|
| W-scope | WIRED | presence | true |
| W-card-exclude | WIRED | presence | true |
| W-account-exclude | WIRED | presence | true |
| W-report-wise | WIRED | presence | true |
| W-report-police | WIRED | presence | true |
| W-recall | WIRED | presence | true |
| W-refund | WIRED | presence | true |
| W-loss | WIRED | presence | true |
| W-psr-app-wired-absence | WIRED | absence | true |
| W-card-fraud-page-absent-ruled | ABSENT-RULED | out-of-scope | true |
| W-banxico-absent-ruled | ABSENT-RULED | out-of-scope | true |

GAP: **0/11**. Every item has a check function. A skipped check is never passed.

## Citation mutant

Shown failing first: encoding `wise/2978048/citation/psr-app` as `const present` makes the citation assertion fail.
Then green: clean interpret is `absent` (WIRED absence). Determinations changed on the mutant: 8/8 (100.0%) [population: 8 synthetic determinations, seed enumerated-not-random, parameters sha256 48f824ec585f from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history].

## Replay against PSR 2017/752

Authorised synthetic on the paired register: 67/1 `one_present`; 76/1 trigger is not `satisfied`.
Notice in-scope synthetics with refund stance `not_guaranteed`: **5/5** (in-scope denominator; not the full synthetic population of 8/8).

Missing citation: **6/6** paired rows, including the PSR APP requirement row. That absence is WIRED. It is not filled in.

| paired clause | notice counterpart | citation |
|---|---|---|
| `psr-2017/67/1/consent` | `wise/2978048/scope/authorised-scam` | MISSING |
| `psr-2017/76/1/trigger` | (none) | MISSING |
| `psr-2017/76/1/a/refund` | `wise/2978048/outcome/no-guaranteed-refund` | MISSING |
| `psr-2017/74/1/thirteen-months` | (none) | MISSING |
| `psr-2017/76/2/deadline` | (none) | MISSING |
| `PSR-APP-requirement` | `wise/2978048/citation/psr-app` | MISSING |

## Synthetic rates

0/8 (0.0%) [population: 8 synthetic determinations, seed enumerated-not-random, parameters sha256 48f824ec585f from generate-determinations.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]

Synthetic rates stay REPOSITORY-INTERNAL. They are not findings about Wise.

Generator header digest `48f824ec585f`.
