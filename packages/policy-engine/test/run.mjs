// Standalone conformance runner for @observer-protocol/policy-engine.
//
// Tests verifyCredential() and enforceMandate() directly — no rail-specific
// decode, no wallet proxy, no escrow account. The test rail is synthetic
// ('test:1', TUNIT, decimals=0). All four universal rule categories are covered:
// credentialIntegrity (steps 1-5), amountLimits, counterparty, failClosed (steps 6-7).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCredential, enforceMandate } from '../dist/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT  = join(HERE, 'fixtures', 'out');

const { configTemplate, ISSUER, AGENT, MERCHANT_ADDR, OTHER_ADDR, BLOCKED_ADDR, SCHEMA_URL } =
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

// ══════════════════════════════════════════════════════════════════════════════
console.log(`\npolicy-engine conformance: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error('\nFAILURES:');
  failures.forEach(f => console.error('  ✗ ' + f));
  process.exit(1);
}
