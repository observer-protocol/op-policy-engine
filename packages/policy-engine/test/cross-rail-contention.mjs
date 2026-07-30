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
import { appendFileSync, writeFileSync, readFileSync, rmSync, mkdtempSync } from 'node:fs';
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


// 10. WALL-CLOCK REGRESSION — the class this guard no longer has.
//
//     The guard used to ask `e.ts >= PROCESS_START_MS`. Date.now() is wall-clock and
//     not monotonic: an NTP step, a VM suspend/resume, a live migration or a host
//     clock corrected after drift can place a PREDECESSOR's records in a restarted
//     process's future. Every one of its own prior records then read as a concurrent
//     writer, and the service restarted and denied every payment, on a self-hosted
//     box, with a symptom pointing nowhere near its cause.
//
//     A test could only ever have proved correct behaviour on a regression we
//     simulated. The dependency was removed instead: the file is append-only, so it
//     already carries a total order, and byte offset answers "before or after we
//     opened" without a clock. This case exists to prove the class is closed, not to
//     defend against a trigger.
{
  const f = p('clock-regression.jsonl');
  const future = Date.now() + 6 * 60 * 60 * 1000; // predecessor's clock ran 6h fast
  appendFileSync(f, JSON.stringify({
    rail: 'x402', asset: 'USDC', amountRaw: '3000000', decimals: 6,
    ts: future, state: 'committed', w: `${hostname()}:999999`,
  }) + '\n');
  const l = new CrossRailLedger(f);
  const r = l.sumWindowConverted(rates);
  A('a predecessor record timestamped in OUR FUTURE is history, not contention',
    r.ok === true, r.ok ? '' : r.reason);
  // And it must still be COUNTED. Treating it as history is only correct if the spend
  // is included; silently dropping it would trade a false denial for an under-count,
  // which is the direction that permits more spending.
  A('...and is still counted, so the fix does not under-count instead',
    r.ok === true && r.total === 3000000n, r.ok ? String(r.total) : r.reason);

  // The same record appended AFTER we opened is still contention: the offset boundary
  // is doing the work, so a foreign writer cannot hide behind a backdated timestamp
  // either.
  const l2 = new CrossRailLedger(p('clock-regression-2.jsonl'));
  l2.record({ rail: 'x402', asset: 'USDC', amountRaw: '1000000', decimals: 6 });
  appendFileSync(p('clock-regression-2.jsonl'), JSON.stringify({
    rail: 'x402', asset: 'USDC', amountRaw: '1000000', decimals: 6,
    ts: 1, state: 'committed', w: `${hostname()}:999998`, // backdated to the epoch
  }) + '\n');
  const r2 = l2.sumWindowConverted(rates);
  A('a foreign record appended after we opened is contention even if BACKDATED',
    r2.ok === false, r2.ok ? String(r2.total) : '');
}


// 11. THE ORDERING claimOffset's SAFETY ARGUMENT RESTS ON.
//
//     Resetting claimOffset after a rewrite is safe ONLY because rewrite runs the guard
//     over every line and throws BEFORE the temp-write/rename. If someone later moves the
//     compaction ahead of the check for a plausible reason, that argument silently becomes
//     false: a rewrite would drop a concurrent writer's committed spends and then reset the
//     boundary so the loss was never detectable.
//
//     So the ordering is asserted directly rather than left as a comment. Rule-at-the-
//     violation-site with a test behind it.
{
  const f = p('rewrite-ordering.jsonl');
  const l = new CrossRailLedger(f);
  // A record old enough that prune() WOULD remove it, so the compaction has real work to
  // do and a passing test cannot be explained by there being nothing to drop.
  appendFileSync(f, JSON.stringify({
    rail: 'x402', asset: 'USDC', amountRaw: '1000000', decimals: 6,
    ts: Date.now() - 400 * 24 * 60 * 60 * 1000, state: 'committed', w: `${hostname()}:${process.pid}`,
  }) + '\n');
  execFileSync('node', [CHILD, 'write', f, 'USDC', '5000000', '6']); // a real second process
  const before = readFileSync(f, 'utf8');

  let threw = false;
  try { l.prune(); } catch (e) { threw = e instanceof ObserverLedgerContentionError; }
  A('rewrite throws on a foreign record', threw);
  A('...and left the file UNCOMPACTED, which is what makes resetting claimOffset safe',
    readFileSync(f, 'utf8') === before);
  A('...including the prunable record it would otherwise have dropped',
    readFileSync(f, 'utf8').includes('"amountRaw":"1000000"'));
}

rmSync(DIR, { recursive: true, force: true });
console.log(`\ncross-rail contention: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
