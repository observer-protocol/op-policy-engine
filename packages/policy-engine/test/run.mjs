// Standalone conformance runner for @observer-protocol/policy-engine.
//
// Tests verifyCredential() and enforceMandate() directly — no rail-specific
// decode, no wallet proxy, no escrow account. The test rail is synthetic
// ('test:1', TUNIT, decimals=0). All four universal rule categories are covered:
// credentialIntegrity (steps 1-5), amountLimits, counterparty, failClosed (steps 6-7).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCredential, enforceMandate, runRuntimeAdapter } from '../dist/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT  = join(HERE, 'fixtures', 'out');

const { configTemplate, multiRailConfig, ISSUER, AGENT, MERCHANT_ADDR, OTHER_ADDR, BLOCKED_ADDR, SCHEMA_URL, OPERATOR_DID, TEST_WALLET_ADDR } =
  JSON.parse(readFileSync(join(OUT, 'config.json'), 'utf8'));

const NOW = Date.parse('2026-06-25T12:00:00Z'); // inside validity window, inside temporal window

// Helpers
function cfg(credName, overrides = {}) {
  return {
    ...configTemplate,
    credentialPath: join(OUT, `cred-${credName}.json`),
    ...overrides,
  };
}

// A minimal valid ResolvedTransfer for the test rail
function resolved(opts = {}) {
  return {
    kind: 'transfer',
    recipient: opts.to ?? MERCHANT_ADDR,
    amount: opts.amount ?? 50n,
    assetSymbol: opts.asset ?? 'TUNIT',
    decimals: 0,
    notes: [],
    ...(opts.unenforceable ? { unenforceable: opts.unenforceable } : {}),
  };
}

// A minimal PolicyContext for the test rail
function ctx(opts = {}) {
  return {
    chain_id: 'test:1',
    timestamp: opts.timestamp ?? '2026-06-25T12:00:00Z',
    spending: { daily_total: String(opts.dailyTotal ?? 0n), date: '2026-06-25' },
    transaction: { to: opts.to ?? MERCHANT_ADDR, value: '0' },
    policy_config: cfg(opts.cred ?? 'valid'),
  };
}

let pass = 0, fail = 0;
const failures = [];

function assert(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(`${name}${detail ? ': ' + detail : ''}`); console.log(`  FAIL  ${name}${detail ? '  <<< ' + detail : ''}`); }
}

async function expectAllow(name, verdictOrPromise) {
  const v = await verdictOrPromise;
  assert(name, v.allow === true, v.allow ? '' : v.reason);
}
async function expectDeny(name, verdictOrPromise, reasonFragment) {
  const v = await verdictOrPromise;
  const reasonOk = !reasonFragment || (v.reason ?? '').toLowerCase().includes(reasonFragment.toLowerCase());
  assert(name, v.allow === false && reasonOk,
    v.allow ? 'expected DENY but got ALLOW' : (!reasonOk ? `reason "${v.reason}" lacks "${reasonFragment}"` : ''));
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1: credentialIntegrity (steps 1–5, verifyCredential)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── credentialIntegrity ──');

await expectAllow('valid credential → allow', verifyCredential(cfg('valid'), NOW));
await expectDeny('expired credential → deny', verifyCredential(cfg('expired'), NOW), 'expired');
await expectDeny('not-yet-valid credential → deny', verifyCredential(cfg('not-yet-valid'), NOW), 'not yet valid');
await expectDeny('tampered credential → deny', verifyCredential(cfg('valid', { credentialPath: join(OUT, 'cred-tampered.json') }), NOW), 'does not verify');
await expectDeny('legacy proof suite → deny', verifyCredential(cfg('legacy-suite'), NOW), 'legacy');
await expectDeny('wrong issuer → deny', verifyCredential(cfg('wrong-issuer'), NOW), 'pinned trusted issuer');
await expectDeny('schema not in allowlist → deny', verifyCredential(cfg('bad-schema'), NOW), 'allowlist');
await expectDeny('signing key not in assertionMethod → deny', verifyCredential(cfg('key2-signed'), NOW), 'assertionMethod');
await expectDeny('revoked credential → deny',
  verifyCredential(cfg('valid', { offline: { ...configTemplate.offline, statusListPath: join(OUT, 'status-revoked.json') } }), NOW),
  'revoked');
await expectAllow('no credentialStatus → allow (noted)',
  verifyCredential(cfg('no-status'), NOW));
await expectDeny('credential file missing → deny',
  verifyCredential(cfg('valid', { credentialPath: join(OUT, 'cred-does-not-exist.json') }), NOW),
  'cannot read');

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2: amountLimits (enforceMandate — amount ceiling, same-currency)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── amountLimits ──');

// verifyCredential first, then enforceMandate directly
async function fullEval(credName, resolvedOpts = {}, ctxOpts = {}) {
  const config = cfg(credName, ctxOpts.cfgOverride ?? {});
  const verify = await verifyCredential(config, NOW);
  if (!verify.allow) return verify;
  const c = ctx({ cred: credName, ...ctxOpts });
  return enforceMandate(c, verify.cred, config, resolved(resolvedOpts));
}

await expectAllow('amount 50 under ceiling 100 → allow', fullEval('valid', { amount: 50n }));
await expectDeny('amount 150 over ceiling 100 → deny', fullEval('valid', { amount: 150n }), 'ceiling');
await expectAllow('amount 100 at ceiling 100 → allow', fullEval('valid', { amount: 100n }));
await expectDeny('amount 101 just over ceiling → deny', fullEval('valid', { amount: 101n }), 'ceiling');
await expectDeny('same-currency invariant: OUNIT vs TUNIT ceiling → deny',
  fullEval('wrong-currency', { amount: 50n }), 'same-currency');
await expectAllow('amount 50 under wide ceiling 1000 → allow', fullEval('wide-ceiling', { amount: 50n }));
await expectAllow('amount 999 under wide ceiling 1000 → allow', fullEval('wide-ceiling', { amount: 999n }));
await expectDeny('amount 1001 over wide ceiling 1000 → deny', fullEval('wide-ceiling', { amount: 1001n }), 'notional');

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3: counterparty (enforceMandate — allowList, blockList, requireIssuerClassIn)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── counterparty ──');

await expectAllow('allowList: MERCHANT_ADDR allowed → allow',
  fullEval('allowlist', { amount: 50n, to: MERCHANT_ADDR }));
await expectAllow('allowList: OTHER_ADDR allowed → allow',
  fullEval('allowlist', { amount: 50n, to: OTHER_ADDR }));
await expectDeny('allowList: BLOCKED_ADDR not on list → deny',
  fullEval('allowlist', { amount: 50n, to: BLOCKED_ADDR }), 'allowlist');
await expectAllow('blockList: MERCHANT_ADDR not blocked → allow',
  fullEval('valid', { amount: 50n, to: MERCHANT_ADDR }));
await expectDeny('blockList: BLOCKED_ADDR denied → deny',
  fullEval('valid', { amount: 50n, to: BLOCKED_ADDR }), 'blockList');
await expectDeny('requireIssuerClassIn: no attestation source → deny (fail-closed)',
  fullEval('require-issuer-class', { amount: 50n }), 'issuer class');
await expectAllow('no counterparty constraint + merchant → allow',
  fullEval('wide-ceiling', { amount: 50n, to: MERCHANT_ADDR }));

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4: failClosed (enforceMandate — unmapped rail, undecodable, velocity)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── failClosed ──');

// Unmapped rail: config.rails has no entry for 'unknown:99'
await expectDeny('unmapped rail → deny',
  (async () => {
    const config = cfg('valid', { rails: { 'test:1': configTemplate.rails['test:1'] } });
    const verify = await verifyCredential(config, NOW);
    if (!verify.allow) return verify;
    const c = { ...ctx(), chain_id: 'unknown:99', policy_config: config };
    return enforceMandate(c, verify.cred, config, resolved({ amount: 50n }));
  })(),
  'no rail mapping');

// Undecodable: resolved.unenforceable set with binding ceiling
await expectDeny('unenforceable resolved + binding ceiling → deny',
  fullEval('valid', { unenforceable: 'calldata could not be decoded', amount: 0n }),
  'unenforceable');

// Velocity: under cap
await expectAllow('velocity 50 under cap 200 (daily=0) → allow',
  fullEval('velocity', { amount: 50n }, { dailyTotal: 0n }));

// Velocity: over cap
await expectDeny('velocity 50 over cap 200 (daily=160) → deny',
  fullEval('velocity', { amount: 50n }, { dailyTotal: 160n }),
  'dailyVolumeCap');

// Velocity fails closed when ctx.spending.daily_total is missing
await expectDeny('velocity cap without spending counter → deny',
  (async () => {
    const config = cfg('velocity');
    const verify = await verifyCredential(config, NOW);
    if (!verify.allow) return verify;
    const c = { ...ctx({ cred: 'velocity' }), spending: undefined };
    return enforceMandate(c, verify.cred, config, resolved({ amount: 50n }));
  })(),
  'spending.daily_total');

// Temporal: inside window (09:00-17:00 UTC, test is at 12:00 UTC)
await expectAllow('temporal: inside window 09:00-17:00 UTC at 12:00 → allow',
  fullEval('temporal', { amount: 50n }, { timestamp: '2026-06-25T12:00:00Z' }));

// Temporal: outside window
await expectDeny('temporal: outside window 09:00-17:00 UTC at 20:00 → deny',
  fullEval('temporal', { amount: 50n }, { timestamp: '2026-06-25T20:00:00Z' }),
  'allowedTimeWindows');

// Geographic: allowedJurisdictionsOnly fails closed (jurisdiction always unknown at wallet layer)
await expectDeny('geographic: allowedJurisdictionsOnly → deny (fail-closed)',
  fullEval('geo-allow-only', { amount: 50n }),
  'allowedJurisdictionsOnly');

// Identity-only: no binding constraints → allow any transaction on any address
await expectAllow('identity-only mandate (no binding constraints) → allow',
  fullEval('no-constraint', { amount: 500n, to: '0x0000arbitrary' }));

// Spending-delegation shape (rail-parity items 3+4). BOTH halves must hold:
//   (3) a RECOGNIZED delegation.scope.spending_limits.per_rail is READ + enforced;
//   (4) an UNRECOGNIZED delegation container still fails closed (the half that
//       regresses invisibly if the guard is written carelessly).
const spendingCred = (perRail) => ({
  credentialSubject: {
    id: AGENT, actionScope: {}, delegationScope: { may_delegate_further: false },
    enforcementMode: 'pre_transaction_check',
    delegation: { scope: { spending_limits: { per_rail: perRail } } },
  },
});
// (3) recognized + in-cap → ALLOW
await expectAllow('spending_limits.per_rail: 50 under cap 1000 → allow',
  enforceMandate(ctx(), spendingCred({ 'test:1': { per_transaction: { max_amount: '1000', currency: 'TUNIT' } } }), cfg('valid'), resolved({ amount: 50n })));
// (3) recognized + over-cap → DENY on the CAP (not failClosed) — the shape is now read
await expectDeny('spending_limits.per_rail: 999999 over cap 100 → deny [spending-limits]',
  enforceMandate(ctx(), spendingCred({ 'test:1': { per_transaction: { max_amount: '100', currency: 'TUNIT' } } }), cfg('valid'), resolved({ amount: 999999n })), 'spending-limits');
// (3) same-currency invariant holds on the spending shape too
await expectDeny('spending_limits.per_rail: cap TUNIT vs OUNIT transfer → deny (no FX)',
  enforceMandate(ctx(), spendingCred({ 'test:1': { per_transaction: { max_amount: '1000', currency: 'TUNIT' } } }), cfg('valid'), resolved({ amount: 50n, asset: 'OUNIT' })), 'same-currency');
// (4) UNRECOGNIZED delegation container (no spending_limits.per_rail) → DENY [failClosed]
await expectDeny('delegation container without spending_limits.per_rail → deny [failClosed]',
  enforceMandate(ctx(), { credentialSubject: { id: AGENT, actionScope: {}, delegationScope: { may_delegate_further: false }, enforcementMode: 'pre_transaction_check', delegation: { scope: { something_unrecognized: {} } } } }, cfg('valid'), resolved({ amount: 50n })), 'failClosed');
// (4) per_asset present → DENY (per-asset out of scope for this engine, fail-closed)
await expectDeny('spending_limits.per_rail with per_asset → deny (out of scope here, fail-closed)',
  enforceMandate(ctx(), spendingCred({ 'test:1': { per_transaction: { max_amount: '1000', currency: 'TUNIT' }, per_asset: { 'asset-x': { per_transaction: { max_amount: '10', currency: 'TUNIT' } } } } }), cfg('valid'), resolved({ amount: 50n })), 'per_asset');

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 5: cross-rail generalizes — velocity/temporal/geographic on non-ows rails
// Proves: shared core enforces these rules regardless of rail family.
// Uses multiRailConfig (test:wdk, test:mppx, test:l402) with cross-rail credentials.
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── cross-rail: generalizes rules ──');

// evalOnRail: like fullEval but switches chain_id and uses multiRailConfig
async function evalOnRail(credName, chainId, resolvedOpts = {}, ctxOpts = {}) {
  const config = { ...multiRailConfig, credentialPath: join(OUT, `cred-${credName}.json`) };
  const verify = await verifyCredential(config, NOW);
  if (!verify.allow) return verify;
  const dailyTotalVal = ctxOpts.dailyTotal ?? 0n;
  const timestamp = ctxOpts.timestamp ?? '2026-06-25T12:00:00Z';
  const to = resolvedOpts.to ?? MERCHANT_ADDR;
  const c = {
    chain_id: chainId,
    timestamp,
    spending: { daily_total: String(dailyTotalVal), date: '2026-06-25' },
    transaction: { to, value: '0' },
    policy_config: config,
  };
  return enforceMandate(c, verify.cred, config, resolved({ ...resolvedOpts, to }));
}

// velocity on l402-like rail (3 cases)
await expectAllow('velocity/l402: 50 under cap 200 (daily=0) → allow',
  evalOnRail('cr-velocity', 'test:l402', { amount: 50n }));
await expectDeny('velocity/l402: 50 over cap 200 (daily=160) → deny',
  evalOnRail('cr-velocity', 'test:l402', { amount: 50n }, { dailyTotal: 160n }), 'dailyVolumeCap');
await expectDeny('velocity/l402: cap present but spending.daily_total missing → deny',
  (async () => {
    const config = { ...multiRailConfig, credentialPath: join(OUT, 'cred-cr-velocity.json') };
    const verify = await verifyCredential(config, NOW);
    if (!verify.allow) return verify;
    const c = { chain_id: 'test:l402', timestamp: '2026-06-25T12:00:00Z', spending: undefined, transaction: { to: MERCHANT_ADDR, value: '0' }, policy_config: config };
    return enforceMandate(c, verify.cred, config, resolved({ amount: 50n }));
  })(), 'spending.daily_total');

// temporal on wdk-like rail (2 cases)
await expectAllow('temporal/wdk: inside 09:00-17:00 UTC at 12:00 → allow',
  evalOnRail('cr-temporal', 'test:wdk', { amount: 50n }, { timestamp: '2026-06-25T12:00:00Z' }));
await expectDeny('temporal/wdk: outside 09:00-17:00 UTC at 20:00 → deny',
  evalOnRail('cr-temporal', 'test:wdk', { amount: 50n }, { timestamp: '2026-06-25T20:00:00Z' }), 'allowedTimeWindows');

// temporal on mppx-like rail (2 cases)
await expectAllow('temporal/mppx: inside window at 12:00 → allow',
  evalOnRail('cr-temporal', 'test:mppx', { amount: 50n }, { timestamp: '2026-06-25T12:00:00Z' }));
await expectDeny('temporal/mppx: outside window at 20:00 → deny',
  evalOnRail('cr-temporal', 'test:mppx', { amount: 50n }, { timestamp: '2026-06-25T20:00:00Z' }), 'allowedTimeWindows');

// temporal on l402-like rail (2 cases)
await expectAllow('temporal/l402: inside window at 12:00 → allow',
  evalOnRail('cr-temporal', 'test:l402', { amount: 50n }, { timestamp: '2026-06-25T12:00:00Z' }));
await expectDeny('temporal/l402: outside window at 20:00 → deny',
  evalOnRail('cr-temporal', 'test:l402', { amount: 50n }, { timestamp: '2026-06-25T20:00:00Z' }), 'allowedTimeWindows');

// geographic on wdk-like rail (2 cases)
await expectDeny('geographic/wdk: allowedJurisdictionsOnly → deny (fail-closed, jurisdiction unknown)',
  evalOnRail('cr-geo-allow-only', 'test:wdk', { amount: 50n }), 'allowedJurisdictionsOnly');
await expectAllow('geographic/wdk: blockedJurisdictions only → allow (fail-open, advisory)',
  evalOnRail('cr-blocked-geo', 'test:wdk', { amount: 50n }));

// geographic on mppx-like rail (2 cases)
await expectDeny('geographic/mppx: allowedJurisdictionsOnly → deny (fail-closed)',
  evalOnRail('cr-geo-allow-only', 'test:mppx', { amount: 50n }), 'allowedJurisdictionsOnly');
await expectAllow('geographic/mppx: blockedJurisdictions only → allow (fail-open)',
  evalOnRail('cr-blocked-geo', 'test:mppx', { amount: 50n }));

// geographic on l402-like rail (2 cases)
await expectDeny('geographic/l402: allowedJurisdictionsOnly → deny (fail-closed)',
  evalOnRail('cr-geo-allow-only', 'test:l402', { amount: 50n }), 'allowedJurisdictionsOnly');
await expectAllow('geographic/l402: blockedJurisdictions only → allow (fail-open)',
  evalOnRail('cr-blocked-geo', 'test:l402', { amount: 50n }));

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 6: cross-rail rail-specific — operationClassification, advisory fields
// operationClassification via allowed_transaction_categories IS in the shared core
// (generalizes across rails via config.transactionCategory). Advisory fields NEVER deny.
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── cross-rail: operationClassification + advisory ──');

// txcat-swap without config.transactionCategory → deny on wdk (can't establish category)
await expectDeny('operationClassification/wdk: allowed_transaction_categories without config → deny',
  evalOnRail('cr-txcat-swap', 'test:wdk', { amount: 50n }), 'category');

// txcat-swap without config.transactionCategory → deny on mppx
await expectDeny('operationClassification/mppx: allowed_transaction_categories without config → deny',
  evalOnRail('cr-txcat-swap', 'test:mppx', { amount: 50n }), 'category');

// txcat-swap without config.transactionCategory → deny on l402
await expectDeny('operationClassification/l402: allowed_transaction_categories without config → deny',
  evalOnRail('cr-txcat-swap', 'test:l402', { amount: 50n }), 'category');

// txcat-transfer with matching config.transactionCategory → allow (category established)
await expectAllow('operationClassification/wdk: matching transactionCategory → allow',
  (async () => {
    const config = { ...multiRailConfig, credentialPath: join(OUT, 'cred-cr-txcat-transfer.json'), transactionCategory: 'transfer' };
    const verify = await verifyCredential(config, NOW);
    if (!verify.allow) return verify;
    const c = { chain_id: 'test:wdk', timestamp: '2026-06-25T12:00:00Z', spending: { daily_total: '0', date: '2026-06-25' }, transaction: { to: MERCHANT_ADDR, value: '0' }, policy_config: config };
    return enforceMandate(c, verify.cred, config, resolved({ amount: 50n }));
  })());

// txcat-swap with wrong transactionCategory → deny (wrong category)
await expectDeny('operationClassification/wdk: wrong transactionCategory → deny',
  (async () => {
    const config = { ...multiRailConfig, credentialPath: join(OUT, 'cred-cr-txcat-swap.json'), transactionCategory: 'transfer' };
    const verify = await verifyCredential(config, NOW);
    if (!verify.allow) return verify;
    const c = { chain_id: 'test:wdk', timestamp: '2026-06-25T12:00:00Z', spending: { daily_total: '0', date: '2026-06-25' }, transaction: { to: MERCHANT_ADDR, value: '0' }, policy_config: config };
    return enforceMandate(c, verify.cred, config, resolved({ amount: 50n }));
  })(), 'category');

// advisory-only actionScope fields: cumulative_budget, geographic_restriction
// Per AIP v0.8 §1.2-§1.3 these are advisory — MUST NOT ground a deny.
// Note: allowed_counterparty_types is NOT advisory — it is fail-closed (tested below).
await expectAllow('advisory/test:1: cumulative_budget + geographic_restriction → allow',
  fullEval('cr-advisory-fields', { amount: 50n }));
await expectAllow('advisory/wdk: cumulative_budget + geographic_restriction on wdk-like rail → allow',
  evalOnRail('cr-advisory-fields', 'test:wdk', { amount: 50n }));
await expectAllow('advisory/l402: cumulative_budget + geographic_restriction on l402-like rail → allow',
  evalOnRail('cr-advisory-fields', 'test:l402', { amount: 50n }));

// allowed_counterparty_types: fail-closed — no enforcement path, named "allowed" implies enforcement.
// A mandate that sets it DENIES via the unknown-rule catch-all.
await expectDeny('failClosed/allowed_counterparty_types: no enforcement path → deny (unknown-rule)',
  evalOnRail('fc-allowed-cpty-types', 'test:1', { amount: 50n }), 'unknown-rule');

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 7: expanded fail-closed garbage set
// Boyd requirement B: prove the "hostile skill cannot move money" guarantee
// against the full garbage-input set, per rail. Every case MUST deny.
// Scenarios: (1) unknown rule type, (2) unknown/absent counterparty,
// (3) malformed/missing mandate, (4) unresolvable/expired credential,
// (5) unparseable proposal, (6) agent-supplied field ignored not honored.
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── fail-closed: garbage-input set ──');

// (1) Unknown rule type — unrecognized actionScope field
await expectDeny('garbage/test:1: unknown actionScope field → deny (fail-closed)',
  evalOnRail('fc-unknown-scope-rule', 'test:1', { amount: 50n }), 'unknown-rule');
await expectDeny('garbage/test:wdk: unknown actionScope field on wdk rail → deny',
  evalOnRail('fc-unknown-scope-rule', 'test:wdk', { amount: 50n }), 'unknown-rule');
await expectDeny('garbage/test:mppx: unknown actionScope field on mppx rail → deny',
  evalOnRail('fc-unknown-scope-rule', 'test:mppx', { amount: 50n }), 'unknown-rule');
await expectDeny('garbage/test:l402: unknown actionScope field on l402 rail → deny',
  evalOnRail('fc-unknown-scope-rule', 'test:l402', { amount: 50n }), 'unknown-rule');

// (1b) Unknown tradingMandate field
await expectDeny('garbage/test:1: unknown tradingMandate field → deny (fail-closed)',
  evalOnRail('fc-unknown-tm-rule', 'test:1', { amount: 50n }), 'unknown-rule');
await expectDeny('garbage/test:wdk: unknown tradingMandate field on wdk rail → deny',
  evalOnRail('fc-unknown-tm-rule', 'test:wdk', { amount: 50n }), 'unknown-rule');

// (2) Unknown/absent counterparty — requireIssuerClassIn, no attestation (already in §3)
// Variant: on l402-like rail using a cross-rail credential (attestation still absent on any rail)
await expectDeny('garbage/l402: requireIssuerClassIn, no attestation → deny (fail-closed)',
  evalOnRail('cr-require-issuer-class', 'test:l402', { amount: 50n }), 'issuer class');

// (3) Malformed mandate — maxNotionalPerOrder without unit (already in §8 deny path)
// Variant: confirmed on test:1 rail with unit stripped from credential in memory
await expectDeny('garbage/test:1: maxNotionalPerOrder without unit → deny',
  (async () => {
    const config = { ...multiRailConfig, credentialPath: join(OUT, 'cred-valid.json') };
    const verify = await verifyCredential(config, NOW);
    if (!verify.allow) return verify;
    // Clone cred and strip unit — unit is required with maxNotionalPerOrder
    const cred = JSON.parse(JSON.stringify(verify.cred));
    delete cred.credentialSubject.tradingMandate.unit;
    const c = { chain_id: 'test:1', timestamp: '2026-06-25T12:00:00Z', spending: { daily_total: '0', date: '2026-06-25' }, transaction: { to: MERCHANT_ADDR, value: '0' }, policy_config: config };
    return enforceMandate(c, cred, config, resolved({ amount: 50n }));
  })(), 'without unit');

// (4) Unresolvable/expired credential — already covered in §1 (expired, tampered, missing file)
// Variant: expired credential evaluated on wdk-like verifier config
await expectDeny('garbage/wdk: expired credential → deny',
  (async () => {
    const config = { ...multiRailConfig, credentialPath: join(OUT, 'cred-expired.json') };
    return verifyCredential(config, NOW);
  })(), 'expired');

// (5) Unparseable proposal — resolved with unenforceable flag AND binding ceiling
// (already in §4 as 'unenforceable resolved + binding ceiling'); variant on l402
await expectDeny('garbage/l402: unenforceable proposal + binding ceiling → deny',
  (async () => {
    const config = { ...multiRailConfig, credentialPath: join(OUT, 'cred-valid.json') };
    const verify = await verifyCredential(config, NOW);
    if (!verify.allow) return verify;
    const c = { chain_id: 'test:l402', timestamp: '2026-06-25T12:00:00Z', spending: { daily_total: '0', date: '2026-06-25' }, transaction: { to: MERCHANT_ADDR, value: '0' }, policy_config: config };
    return enforceMandate(c, verify.cred, config, { kind: 'transfer', recipient: MERCHANT_ADDR, amount: 0n, assetSymbol: 'TUNIT', decimals: 0, notes: [], unenforceable: 'l402 invoice could not be decoded' });
  })(), 'unenforceable');

// (6) Agent-supplied field in credential subject — must be IGNORED, not honored as grant.
// fc-agent-grant-cred has maxNotionalPerOrder=100 + agentApproval/trustLevel at subject level.
// Amount 500 (>> 100) must DENY via the mandate ceiling. Agent-supplied fields do not override.
// The reason is [notional] (maxNotionalPerOrder fires); no per_transaction_ceiling in this cred.
await expectDeny('garbage/test:1: agent-supplied credSubject grant fields + mandate ceiling → deny (agent fields ignored)',
  evalOnRail('fc-agent-grant-cred', 'test:1', { amount: 500n }), 'notional');
await expectDeny('garbage/test:wdk: same agent-supplied fields on wdk rail → deny',
  evalOnRail('fc-agent-grant-cred', 'test:wdk', { amount: 500n }), 'notional');
await expectDeny('garbage/test:l402: same agent-supplied fields on l402 rail → deny',
  evalOnRail('fc-agent-grant-cred', 'test:l402', { amount: 500n }), 'notional');

// (6b) Agent-supplied field in resolved transfer — IGNORED by evaluator; credential constraint wins
await expectDeny('garbage/test:1: extra fields in resolved transfer + binding ceiling → deny (resolved fields ignored)',
  (async () => {
    const config = { ...multiRailConfig, credentialPath: join(OUT, 'cred-valid.json') };
    const verify = await verifyCredential(config, NOW);
    if (!verify.allow) return verify;
    const c = { chain_id: 'test:1', timestamp: '2026-06-25T12:00:00Z', spending: { daily_total: '0', date: '2026-06-25' }, transaction: { to: MERCHANT_ADDR, value: '0' }, policy_config: config };
    // Hostile resolved: extra agentOverride field; amount 500 exceeds ceiling 100
    const hostileResolved = { kind: 'transfer', recipient: MERCHANT_ADDR, amount: 500n, assetSymbol: 'TUNIT', decimals: 0, notes: [], agentOverride: true, bypassPolicy: true };
    return enforceMandate(c, verify.cred, config, hostileResolved);
  })(), 'ceiling');

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Step 3 identity — signer-boundary + did:key dev-mode
// Boyd requirement Verify 2: mandate signing key must not be agent-controlled.
// The check fires in verifyCredential before evaluateMandate is called.
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Step 3: signer-boundary + did:key ──');

// Signer-boundary: mandate signed by agentDid → DENY [signer-boundary].
// Config: issuerDid = agentDid = AGENT. The credential is signed by AGENT's key.
// Proof verifies (agentKey is in agent DID doc assertionMethod), then the
// signer-boundary check fires because signingDid === config.agentDid.
await expectDeny('signer-boundary: proof.verificationMethod DID == agentDid → deny',
  verifyCredential({
    ...configTemplate,
    credentialPath: join(OUT, 'cred-agent-self-issued.json'),
    issuerDid: AGENT,
    agentDid: AGENT,
    offline: { didDocumentPath: join(OUT, 'agent-did.json') },
  }, NOW),
  'signer-boundary');

// Signer-boundary: normal valid credential — signing DID (ISSUER) != agentDid (AGENT) → allow.
await expectAllow('signer-boundary: signing DID != agentDid → allow (signer-boundary does not fire)',
  verifyCredential(cfg('valid'), NOW));

// did:key dev-mode: operator issues credential with did:key principal.
// The DID document is derived in-memory — no network, no offline file needed.
// Config: issuerDid = OPERATOR_DID (did:key), agentDid = AGENT (different DID) → allow.
await expectAllow('did:key dev-mode: operator credential with did:key issuer → allow',
  verifyCredential({
    ...configTemplate,
    credentialPath: join(OUT, 'cred-dev-operator.json'),
    issuerDid: OPERATOR_DID,
    agentDid: AGENT,
  }, NOW));

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Step 4 — RuntimeAdapter BIND→LINK→AUTHORIZE gate
// The three-step gate closes the cross-principal pairing attack:
// a valid WBC for an attacker-controlled wallet cannot be paired with a mandate
// issued by a different principal, because LINK rejects the combination.
// Dev-mode LINK: explicit DID equality (wbc.issuer === mandate.issuer).
// Full-mode LINK: scaffold fail-closed stub (L1 cosign_verify not wired in v1).
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Step 4: RuntimeAdapter BIND→LINK→AUTHORIZE gate ──');

// Helpers for Step 4 tests. Use cred-dev-operator.json (issuer = OPERATOR_DID did:key).
// agentDid = AGENT (different from OPERATOR_DID) so signer-boundary does not fire.
function devOpCfg(opts = {}) {
  return {
    ...configTemplate,
    credentialPath: join(OUT, 'cred-dev-operator.json'),
    issuerDid: OPERATOR_DID,
    agentDid: AGENT,
    issuanceMode: opts.issuanceMode ?? 'dev',
    ...(opts.wbcFile ? { walletBindingCredentialPath: join(OUT, opts.wbcFile) } : {}),
  };
}

function devOpCtx(walletId = TEST_WALLET_ADDR) {
  return {
    chain_id: 'test:1',
    wallet_id: walletId,
    api_key_id: 'test-api-key',
    timestamp: '2026-06-25T12:00:00Z',
    spending: { daily_total: '0', date: '2026-06-25' },
    transaction: { to: MERCHANT_ADDR, value: '0' },
    policy_config: {},
  };
}

// Test 1: no WBC configured → passes through to verifyCredential + enforceMandate.
// BIND+LINK steps are skipped entirely; credential verifies, mandate allows amount 50.
await expectAllow('RuntimeAdapter: no WBC configured → allow (passthrough)',
  runRuntimeAdapter(devOpCtx(), devOpCfg(), resolved({ amount: 50n }), NOW));

// Test 2: valid WBC + same operator (dev mode) → all three steps pass → allow.
// BIND: wbc.issuer = OPERATOR_DID, proof verifies, walletAddress = TEST_WALLET_ADDR = ctx.wallet_id.
// LINK (dev): wbc.issuer (OPERATOR_DID) === mandate.issuer (OPERATOR_DID) → pass.
// AUTHORIZE: amount 50 under ceiling 100 → allow.
await expectAllow('RuntimeAdapter: valid WBC + same-operator dev-mode link → allow',
  runRuntimeAdapter(devOpCtx(), devOpCfg({ wbcFile: 'wbc-valid.json' }), resolved({ amount: 50n }), NOW));

// Test 3: WBC controller ≠ mandate principal (dev mode) → deny [issuer-linkage].
// BIND: wbc-mislinked.json is issued by WRONG_OPERATOR_DID (a different did:key), proof verifies.
// LINK (dev): wbc.issuer (WRONG_OPERATOR_DID) !== mandate.issuer (OPERATOR_DID) → deny.
await expectDeny('RuntimeAdapter: WBC controller != mandate principal (dev) → deny [issuer-linkage]',
  runRuntimeAdapter(devOpCtx(), devOpCfg({ wbcFile: 'wbc-mislinked.json' }), resolved({ amount: 50n }), NOW),
  'issuer-linkage');

// Test 4: WBC walletAddress ≠ ctx.wallet_id → deny [bind].
// BIND address check: wbc-valid.json.walletAddress = TEST_WALLET_ADDR ≠ ctx.wallet_id.
await expectDeny('RuntimeAdapter: WBC walletAddress != ctx.wallet_id → deny [bind]',
  runRuntimeAdapter(devOpCtx('0xWRONG000000000000000000000000000000000F'), devOpCfg({ wbcFile: 'wbc-valid.json' }), resolved({ amount: 50n }), NOW),
  'bind');

// Test 5: full-mode LINK stub fail-closed → deny [issuer-linkage].
// Full-mode link check is not implemented in v1 scaffold.
// ANY full-mode request with a WBC denies here until cosign_verify is wired.
// Tests "WBC-controller ≠ mandate-principal → DENY in full mode" per Boyd's requirement.
await expectDeny('RuntimeAdapter: full-mode WBC → deny [issuer-linkage] (stub fail-closed, L1 not wired)',
  runRuntimeAdapter(devOpCtx(), devOpCfg({ wbcFile: 'wbc-mislinked.json', issuanceMode: 'full' }), resolved({ amount: 50n }), NOW),
  'issuer-linkage');

// ══════════════════════════════════════════════════════════════════════════════
// SECTION: crossRailBudget (schema v2.3) — one rolling-24h budget across rails,
// principal-attested rates, oracle-free. Mandate-layer only (enforceMandate
// takes the credential as an argument; integrity is SECTION 1's job).
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── crossRailBudget (v2.3, cross-rail 24h budget) ──');

function crbCred(budget) {
  return {
    credentialSubject: {
      id: AGENT,
      actionScope: {},
      delegationScope: { may_delegate_further: false },
      enforcementMode: 'pre_transaction_check',
      tradingMandate: { crossRailBudget: budget },
    },
  };
}
const CRB = { amount: '5', currency: 'USD', window: 'P1D', rates: { TUNIT: '1', sat: '0.0005' } };
const crbCtx = (crossRail) => ({ ...ctx(), ...(crossRail ? { cross_rail: crossRail } : {}) });

await expectAllow('cross-rail: 1 TUNIT (1 USD) after 3 USD prior spend (4/5) → allow',
  enforceMandate(crbCtx({ total: '3000000', currency: 'USD' }), crbCred(CRB), cfg('valid'), resolved({ amount: 1n })));
await expectDeny('cross-rail: 3 TUNIT after 3 USD prior spend (6/5) → deny [cross-rail]',
  enforceMandate(crbCtx({ total: '3000000', currency: 'USD' }), crbCred(CRB), cfg('valid'), resolved({ amount: 3n })), '[cross-rail]');
await expectDeny('cross-rail: budget with NO supplied counter → deny (fail-closed)',
  enforceMandate(crbCtx(), crbCred(CRB), cfg('valid'), resolved({ amount: 1n })), 'no cross-rail counter');
await expectDeny('cross-rail: transfer asset lacks a principal-attested rate → deny',
  enforceMandate(crbCtx({ total: '0', currency: 'USD' }), crbCred({ ...CRB, rates: { sat: '0.0005' } }), cfg('valid'), resolved({ amount: 1n })), 'no principal-attested rate');
await expectDeny('cross-rail: unsupported window (P2D) → deny (cannot establish window)',
  enforceMandate(crbCtx({ total: '0', currency: 'USD' }), crbCred({ ...CRB, window: 'P2D' }), cfg('valid'), resolved({ amount: 1n })), 'not supported');

// ══════════════════════════════════════════════════════════════════════════════
// SECTION: rail-family-aware counterparty case discipline. EVM hex folds case
// (EIP-55 is only a checksum); base58 rails (TRON, Solana) compare EXACT — a
// folded base58 compare makes a case-collision grindable.
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── counterparty case discipline (base58 exact vs EVM folded) ──');

const TRON_MERCHANT = 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9';
const caseCfg = cfg('valid', {
  rails: {
    ...cfg('valid').rails,
    'tron:mainnet': { rail: 'usdt-trc20', currency: 'TRX', decimals: 6, family: 'other' },
    'eip155:1': { rail: 'ethereum-mainnet', currency: 'ETH', decimals: 18, family: 'evm' },
  },
});
const cpCred = (allowList) => ({
  credentialSubject: {
    id: AGENT,
    actionScope: {},
    delegationScope: { may_delegate_further: false },
    enforcementMode: 'pre_transaction_check',
    tradingMandate: { counterparty: { allowList } },
  },
});
const railCtx = (chain, to) => ({ ...ctx(), chain_id: chain, transaction: { to, value: '0' } });

await expectAllow('base58 rail: exact-case allowlisted recipient → allow',
  enforceMandate(railCtx('tron:mainnet', TRON_MERCHANT), cpCred([TRON_MERCHANT]), caseCfg,
    { kind: 'trc20-token', assetSymbol: 'USDT', amount: 1n, decimals: 6, recipient: TRON_MERCHANT, recipientKind: 'wallet', notes: [] }));
await expectDeny('base58 rail: case-twiddled recipient → deny [counterparty] (no case folding on base58)',
  enforceMandate(railCtx('tron:mainnet', TRON_MERCHANT.toLowerCase()), cpCred([TRON_MERCHANT]), caseCfg,
    { kind: 'trc20-token', assetSymbol: 'USDT', amount: 1n, decimals: 6, recipient: TRON_MERCHANT.toLowerCase(), recipientKind: 'wallet', notes: [] }), '[counterparty]');
await expectAllow('EVM rail: mixed-case hex still folds (EIP-55 is a checksum, not identity) → allow',
  enforceMandate(railCtx('eip155:1', '0xa11ce00000000000000000000000000000000001'), cpCred(['0xA11CE00000000000000000000000000000000001']), caseCfg,
    { kind: 'evm-token', assetSymbol: 'USDC', amount: 1n, decimals: 6, recipient: '0xa11ce00000000000000000000000000000000001', recipientKind: 'wallet', notes: [] }));

// ══════════════════════════════════════════════════════════════════════════════
console.log(`\npolicy-engine conformance: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error('\nFAILURES:');
  failures.forEach(f => console.error('  ✗ ' + f));
  process.exit(1);
}
