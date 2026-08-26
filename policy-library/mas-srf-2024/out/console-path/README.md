# The console path, run on a scratch instance (2026-08-26 01:33 to 01:35 UTC)

What was run, what it produced, and what the :3300 console could and could not render of it.
SYNTHETIC throughout; no figure here is a measurement of anything.

## What ran

- A fresh `op-mcp-payment-server` (main @ e2d35fb, engine `@observer-protocol/policy-engine`
  1.0.0-rc.22) on `127.0.0.1:9095`, `OP_STORE_PATH` a new file in this session's scratchpad, five
  Ed25519 keys minted into a scratch `keys/` (mode 0600, never in any repository), a scratch
  credential `urn:uuid:srf-demo-fi-payout-mandate` (rail `demo:srf:fi-credit`, SGD, ceiling
  25,000, escalation 5,000, **authorising outcome `fi_bears` only**, `policyRef`
  `urn:op:register:srf:0.1.0 @ sha256:c27fccb6…` = the bytes of `../../register.json`), and a
  decider grant written before the service started (`grant-decider.mjs`; `decider-grants.json`).
- `../../console-path/drive-9095.mjs`: for each of the six artifacts in `../determinations`, one
  decision attestation signed by the scratch decider (outcome = the artifact's
  `srf/6.7/outcome` record; `deciderArtifactDigest` = sha256 of the committed artifact bytes;
  `inputsDigest` over its facts and resolutions; vocabulary = the result domain of the 6.7 table,
  read from the register), posted to `POST /v1/determinations`; then one payment per claim
  citing it, verdict signed by the scratch evaluator over the server's own `verdictPayload`.
- `run-log.json` is the driver's record; `store-9095.jsonl` (33 lines) is the store as left;
  `verify-refusal.txt` is `scripts/verify-refusal.mjs` run offline over that file: every
  signature verified, every control rejected. The credential carries no `proof` (a scratch
  credential), which the verifier reports as an absence, not a failure.
- The instance was stopped after the reads. `9094` (the Molina store) was not touched: 941 lines
  before and after.

## What the store holds (population: this run, 6 claims)

| claim | scenario | outcome | payment | served as |
|---|---|---|---|---|
| SRF-SYN-2026-0001 | FI breach | fi_bears | 4,200.00 SGD | **instructed** (below the 5,000 escalation threshold) |
| SRF-SYN-2026-0002 | Telco breach | telco_bears | 8,800.00 SGD | refused `OUTCOME_NOT_AUTHORIZING`, signed v3 |
| SRF-SYN-2026-0003 | clean waterfall | account_holder_bears | 2,500.00 SGD | refused, signed v3 |
| SRF-SYN-2026-0004 | undetermined at FI tier | undetermined | 3,100.00 SGD | refused, signed v3 |
| SRF-SYN-2026-0005 | undetermined at Telco tier | undetermined | 6,600.00 SGD | refused, signed v3 |
| SRF-SYN-2026-0006 | out of scope (corporate) | out_of_scope | 1,900.00 SGD | refused, signed v3 |

`/v1/determinations`: 6 admitted through the determination route (`admission.path:
"determination"`, `grantRequired: true`, grant held) plus the same 6 admitted again through the
payment route, 12 rows. `/v1/refusals`: 5, `byConstraint` one group,
`actionScope.requiresDecisionAttestation`, 22,900.00 SGD stopped over 5 payments. `/v1/fleet`:
attempts 6, instructed 1, refused 5, attestation attested 6 of 6. `/v1/verdicts`: 6.
`/v1/reserved`: 1. `/v1/pending`, `/v1/resolutions`, `/v1/reconciliation`,
`/v1/ingestion-refusals`: 0.

## What the console path renders of an SRF determination, and what it cannot

The :3300 console reads `/v1/refusals`, `/v1/fleet`, `/v1/reserved`, `/v1/reconciliation`,
`/v1/resolutions`, `/v1/verdicts`, `/v1/pending` (agentic-terminal-molina
`src/lib/dashboard/read-api.ts`) and never `/v1/determinations`. Over this store it would show:

- five refused payments, each with `code OUTCOME_NOT_AUTHORIZING`, the constraint, the amount
  stopped, a verified signature, and `attestation.outcome` / `attestation.decisionId` verbatim
  (`refusals.json`); its one hop from `decisionId` goes to the :3200 inspector, not to any clause;
- one instructed payment with no attestation fields on its reserved row;
- the fleet totals above.

It cannot show: which tier stopped a claim or on whose duty (v7 carries neither; F-07); that a
refused `undetermined` is a different thing from a refused `telco_bears` (the store's own
`DETERMINATION_OUTCOME_IS_NOT_CLASSIFIED`: the console counts terms, not denials); the SRF
vocabulary the term came from (inside the base64 `document` only); the `outcomeTerm` of a
decision admitted through the determination route (absent on that row; present only on the
payment-path row, F-17).

## NOT RUN, reported as skipped

The console at `localhost:3300` itself was not pointed at this instance. Its upstream is fixed to
`127.0.0.1:9094` in `agenticterminal-dashboard/next.config.js` and `src/lib/dashboard/service-map.ts`
(the agentic-terminal repository, not this session's), and a test there fails if the two disagree.
What was run is the server side of the same path: the same endpoints, the same row shapes, read
into this directory. A screenshot of :3300 over this store needs that edit or a second console
instance, and is a separate decision.
