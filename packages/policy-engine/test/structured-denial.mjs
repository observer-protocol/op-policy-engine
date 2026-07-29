// Structured denials: the detail a client can branch on.
//
// The property under test is not "denials have a tag". It is that the numbers a
// caller most needs, the limit and the HEADROOM against it, survive to the caller
// instead of being formatted into a sentence and lost. And that the message keeps
// saying what it said, because the message is what a model reads and the detail is
// what a client acts on.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCredential, enforceMandate, DENIAL_TAGS, formatScaled } from '../dist/index.mjs';

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

async function evaluate(cred, { amount, daily = 0n, monthly } = {}) {
  const config = { ...configTemplate, credentialPath: join(OUT, `cred-${cred}.json`) };
  const v = await verifyCredential(config, NOW);
  if (!v.allow) return v;
  const ctx = {
    chain_id: 'test:1', timestamp: '2026-06-25T12:00:00Z',
    spending: { daily_total: String(daily), ...(monthly !== undefined ? { monthly_total: String(monthly) } : {}), date: '2026-06-25' },
    transaction: { to: MERCHANT_ADDR, value: '0' }, policy_config: config,
  };
  return enforceMandate(ctx, v.cred, config,
    { kind: 'transfer', recipient: MERCHANT_ADDR, amount, assetSymbol: 'TUNIT', decimals: 0, notes: [] });
}

console.log('\n── headroom reaches the caller ──');
{
  // ceiling 100, request 150. Headroom against the ceiling is 100 minus 0 spent.
  const r = await evaluate('valid', { amount: 150n });
  const d = r.detail;
  assert('a ceiling denial carries detail at all', !!d, JSON.stringify(r).slice(0, 120));
  assert('tag is a member of the exported taxonomy', d && DENIAL_TAGS.includes(d.tag), d && d.tag);
  assert('names the constraint by dotted path, not prose',
    d?.constraint === 'actionScope.per_transaction_ceiling', d?.constraint);
  assert('carries the limit', d?.limit === '100', d?.limit);
  assert('carries what was observed', d?.observed === '150', d?.observed);
  // A per-transaction ceiling accumulates nothing, so the whole cap is available to
  // a smaller request. This assertion originally expected '0' from cap-minus-projected
  // and was wrong: headroom is what is still spendable, not what is left after the
  // request that just failed.
  assert('per-transaction ceiling: headroom is the whole cap', d?.headroom === '100', d?.headroom);
  assert('and the remedy names it', /100/.test(d?.remedy ?? ''), d?.remedy);
  assert('amounts are strings, not numbers (18-decimal precision)',
    typeof d?.limit === 'string' && typeof d?.headroom === 'string', typeof d?.limit);
}
{
  // The case headroom exists for: 60 spent against a 100 daily cap, asking 50.
  const r = await evaluate('velocity-monthly', { amount: 50n, daily: 60n, monthly: 60n });
  const d = r.detail;
  assert('velocity denial: headroom is the remaining allowance, not zero',
    d?.headroom === '40', `headroom=${d?.headroom} limit=${d?.limit} observed=${d?.observed}`);
  assert('velocity denial: remedy names an amount that would pass',
    /40/.test(d?.remedy ?? ''), d?.remedy);
}

console.log('\n── the message still says what it said ──');
{
  const r = await evaluate('valid', { amount: 150n });
  assert('message retains the human-readable reason', /per_transaction_ceiling/.test(r.reason), r.reason);
  assert('message states the boundary is not an opening offer',
    /cannot be raised|not negotiable|cannot be raised by this request/i.test(r.reason), r.reason);
  assert('detail is NOT flattened into the message: reason has no JSON',
    !/[{}]/.test(r.reason), r.reason);
}

console.log('\n── terminal marks "stop", not "adjust and retry" ──');
{
  const r = await evaluate('fc-allowed-cpty-types', { amount: 50n });
  assert('an unenforceable constraint is terminal', r.detail?.terminal === true, JSON.stringify(r.detail));
  assert('and carries no headroom, because spending less would not help',
    r.detail?.headroom === undefined, r.detail?.headroom);
}
{
  const r = await evaluate('fc-unknown-scope-rule', { amount: 50n });
  assert('an unknown rule is terminal', r.detail?.terminal === true, JSON.stringify(r.detail));
}

console.log('\n── MUST STILL PASS: an allow carries no denial detail ──');
{
  const r = await evaluate('valid', { amount: 50n });
  assert('allow → allow', r.allow === true, r.reason);
  assert('allow carries no detail', r.detail === undefined, JSON.stringify(r.detail));
}

console.log('\n── formatScaled ──');
assert('trims trailing zeros', formatScaled(1500000n, 6) === '1.5', formatScaled(1500000n, 6));
assert('whole numbers have no point', formatScaled(2000000n, 6) === '2', formatScaled(2000000n, 6));
assert('zero decimals passes through', formatScaled(42n, 0) === '42', formatScaled(42n, 0));
assert('sub-unit amounts keep precision', formatScaled(1n, 18) === '0.000000000000000001', formatScaled(1n, 18));

console.log(`\nstructured-denial: ${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
