// monthlyVolumeCap: enforced against a 30-day counter, or refused.
//
// Cases first, per the standing rule, and the permitted half first within that.
// Three over-refusals in three days all arrived with a hardening change and all
// were caught (or missed) by whether a must-still-pass case existed.
//
// The defect this closes: monthlyVolumeCap was compared against
// ctx.spending.daily_total, the SAME counter the daily cap uses. So a monthly cap
// only tripped when a single rolling-24h window exceeded a whole month's budget.
// A 30,000 monthly cap spent at 1,000/day for 30 days never denied. The field
// named the window and the code used a different one.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCredential, enforceMandate } from '../dist/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'fixtures', 'out');
const { configTemplate, MERCHANT_ADDR } = JSON.parse(readFileSync(join(OUT, 'config.json'), 'utf8'));
const NOW = Date.parse('2026-06-25T12:00:00Z');

let pass = 0, fail = 0;
const failures = [];
function assert(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(`${name}${detail ? ': ' + detail : ''}`); console.log(`  FAIL  ${name}  <<< ${detail}`); }
}

function cfg(cred) { return { ...configTemplate, credentialPath: join(OUT, `cred-${cred}.json`) }; }

/** Evaluate `cred` with an explicit pair of counters. `monthly` undefined means
 * the signing context supplied no 30-day counter at all. */
async function evaluate(cred, { amount, daily = 0n, monthly }) {
  const config = cfg(cred);
  const v = await verifyCredential(config, NOW);
  if (!v.allow) return v;
  const ctx = {
    chain_id: 'test:1',
    timestamp: '2026-06-25T12:00:00Z',
    spending: {
      daily_total: String(daily),
      ...(monthly !== undefined ? { monthly_total: String(monthly) } : {}),
      date: '2026-06-25',
    },
    transaction: { to: MERCHANT_ADDR, value: '0' },
    policy_config: config,
  };
  const resolved = { kind: 'transfer', recipient: MERCHANT_ADDR, amount, assetSymbol: 'TUNIT', decimals: 0, notes: [] };
  return enforceMandate(ctx, v.cred, config, resolved);
}

console.log('\n── MUST STILL PASS ──');

{
  // The case the old code got wrong in the permissive direction: well under the
  // monthly cap, many days of history. Must allow.
  const r = await evaluate('velocity-monthly', { amount: 10n, daily: 10n, monthly: 500n });
  assert('under both caps, 30-day history present → allow', r.allow === true, r.reason);
}
{
  const r = await evaluate('velocity-monthly', { amount: 10n, daily: 10n, monthly: 990n });
  assert('exactly at the monthly cap (1000) → allow', r.allow === true, r.reason);
}
{
  // A mandate with only a DAILY cap must not acquire a monthly requirement.
  const r = await evaluate('velocity', { amount: 10n, daily: 10n });
  assert('dailyVolumeCap only, no monthly counter supplied → allow (no new requirement)', r.allow === true, r.reason);
}

console.log('\n── MUST DENY ──');

{
  // The whole point. Daily is fine, the month is spent.
  const r = await evaluate('velocity-monthly', { amount: 10n, daily: 10n, monthly: 995n });
  assert('daily fine, monthly exhausted → deny',
    r.allow === false && /monthlyVolumeCap/.test(r.reason), r.reason);
}
{
  // Fail-closed, matching per_day, dailyVolumeCap and crossRailBudget, which all
  // deny when their counter is unestablished. This was the one exception.
  const r = await evaluate('velocity-monthly', { amount: 10n, daily: 10n });
  assert('monthlyVolumeCap present, NO monthly counter supplied → deny (fail-closed)',
    r.allow === false && /monthly/i.test(r.reason), r.reason);
}
{
  const r = await evaluate('velocity-monthly', { amount: 10n, daily: 10n, monthly: 995n });
  assert('the denial names the 30-day window, not "today"',
    r.allow === false && !/today's observed volume alone/.test(r.reason), r.reason);
}

console.log('\n── the two counters are independent ──');
{
  const r = await evaluate('velocity-monthly', { amount: 60n, daily: 95n, monthly: 100n });
  assert('daily cap trips while monthly has room → deny on daily',
    r.allow === false && /dailyVolumeCap/.test(r.reason), r.reason);
}

console.log(`\nmonthly-velocity: ${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
