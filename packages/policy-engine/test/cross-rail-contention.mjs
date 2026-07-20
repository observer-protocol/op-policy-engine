// Regression: the cross-rail ledger's single-writer guard fails CLOSED on a
// concurrent second writer, WITHOUT breaking the honest cases — including the
// two process orderings that matter most:
//   • CONCURRENT (overlapping lifetimes, same path)  → DENY, and BOTH deny.
//   • SEQUENTIAL (a process exits, a new one cold-starts on the same path in the
//     same window — e.g. serverless per-request) → COUNT the prior spends, never deny.
// The guard is process-identity based, so it can only be exercised honestly
// across REAL processes; helper is ledger-child.mjs.
import { CrossRailLedger, ObserverLedgerContentionError } from '../dist/index.mjs';
import { execFileSync, spawn } from 'node:child_process';
import { appendFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir, hostname } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHILD = join(HERE, 'ledger-child.mjs');
const DIR = mkdtempSync(join(tmpdir(), 'op-ledger-contention-'));
const rates = { USDC: '1', sat: '0.0005', TUNIT: '1' };
let pass = 0, fail = 0;
const A = (name, ok, detail = '') => { if (ok) { pass++; console.log('  PASS  ' + name); } else { fail++; console.log('  FAIL  ' + name + (detail ? '  <<< ' + detail : '')); } };
const p = (n) => join(DIR, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('\n── cross-rail ledger: single-writer fail-closed guard ──');

// 1. HONEST single writer — happy path unchanged (own writer id, never flagged)
{
  const l = new CrossRailLedger(p('honest.jsonl'));
  l.record({ rail: 'x402', asset: 'USDC', amountRaw: '10000000', decimals: 6 });
  l.record({ rail: 'lightning', asset: 'sat', amountRaw: '5940', decimals: 0 });
  const r = l.sumWindowConverted(rates);
  A('honest single writer: ok, total exact (12.97 USD)', r.ok === true && r.total === 12970000n, r.ok ? String(r.total) : r.reason);
}

// 2. LEGACY records (no writer id) counted, never falsely flagged
{
  const f = p('legacy.jsonl');
  appendFileSync(f, JSON.stringify({ rail: 'lightning', asset: 'sat', amountRaw: '2000', decimals: 0, ts: Date.now(), state: 'committed' }) + '\n');
  const r = new CrossRailLedger(f).sumWindowConverted(rates);
  A('legacy (no `w`): counted, no false contention', r.ok === true && r.total === 1000000n);
}

// 2b. CO-LOCATED bundled instance (same process, DIFFERENT module copy). Each
//     adapter bundles its own copy of this package, so one process holds several
//     module instances that must all read as the SAME writer. Simulate by writing
//     a record stamped with THIS process's own host:pid id (what any bundled copy
//     computes) — it must be counted, never flagged as contention. This is the
//     regression for the multi-adapter co-located case (the one the l402 suite hit).
{
  const f = p('colocated.jsonl');
  const selfId = `${hostname()}:${process.pid}`; // what a second bundled copy in THIS process also computes
  appendFileSync(f, JSON.stringify({ rail: 'x402', asset: 'USDC', amountRaw: '3000000', decimals: 6, ts: Date.now(), state: 'committed', w: selfId }) + '\n');
  const r = new CrossRailLedger(f).sumWindowConverted(rates);
  A('co-located bundled instance (same host:pid): counted, NOT contention', r.ok === true && r.total === 3000000n, r.ok ? String(r.total) : r.reason);
}

// 3. SEQUENTIAL / cold-start (REAL processes): writer exits, a NEW process reads.
//    The prior process's records predate the reader's start → counted, NOT denied.
//    This is the serverless/per-request shape and must never deny.
{
  const f = p('sequential.jsonl');
  execFileSync('node', [CHILD, 'write', f, 'USDC', '4000000', '6']); // process A writes, exits
  const out = execFileSync('node', [CHILD, 'read', f], { encoding: 'utf8' }); // process B cold-starts AFTER, reads
  const r = JSON.parse(out);
  A('sequential cold-start: prior process counted, NOT denied', r.ok === true && r.total === '4000000', out);
}

// 4. CONCURRENT second writer while THIS process is live → DENY (first-process view)
{
  const f = p('concurrent.jsonl');
  const l = new CrossRailLedger(f);
  l.record({ rail: 'lightning', asset: 'sat', amountRaw: '1000', decimals: 0 });
  execFileSync('node', [CHILD, 'write', f, 'USDC', '5000000', '6']); // a real 2nd process writes during our life
  const r = l.sumWindowConverted(rates);
  A('concurrent writer: sumWindowConverted → deny (not a low total)', r.ok === false && /contention/.test(r.reason || ''), r.ok ? '' : r.reason);
  let raw = false; try { l.sumWindowRaw('sat'); } catch (e) { raw = e instanceof ObserverLedgerContentionError; }
  A('concurrent writer: sumWindowRaw throws (fail-closed)', raw);
  let rw = false; try { l.prune(); } catch (e) { rw = e instanceof ObserverLedgerContentionError; }
  A('concurrent writer: rewrite refuses to clobber (throws)', rw);
}

// 5. BOTH deny, not one winning (symmetry). A live 'victim' child writes its own
//    spend and waits; we (a different live process) inject a foreign record with a
//    recent ts, signal, and the victim sums. It must deny — and so must we.
{
  const f = p('symmetry.jsonl');
  const l = new CrossRailLedger(f);
  const victim = spawn('node', [CHILD, 'victim', f], { encoding: 'utf8' });
  let vout = '';
  victim.stdout.on('data', (d) => (vout += d));
  const done = new Promise((res) => victim.on('close', res));
  await sleep(400); // victim imports dist (sets its start) + writes its own record
  l.record({ rail: 'x402', asset: 'USDC', amountRaw: '7000000', decimals: 6 }); // our foreign record, ts = now > victim.start
  writeFileSync(f + '.go', '');
  await done;
  let vr; try { vr = JSON.parse(vout); } catch { vr = { parse: vout }; }
  A('symmetry: the SECOND live process also denies', vr && vr.ok === false, vout);
  const r = l.sumWindowConverted(rates);
  A('symmetry: the FIRST process also denies (neither wins)', r.ok === false && /contention/.test(r.reason || ''), r.ok ? '' : r.reason);
}

rmSync(DIR, { recursive: true, force: true });
console.log(`\ncross-rail contention: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
