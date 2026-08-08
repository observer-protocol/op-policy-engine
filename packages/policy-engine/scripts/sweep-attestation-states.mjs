// MUTATION SWEEP OVER THE ATTESTATION STATE DISTINCTIONS.
//
// A control sweep asks "does this control fire". This asks something else: **if two states were
// collapsed into one, would any test notice?** A vocabulary whose values are distinguishable only by
// reading the code is a vocabulary that will be collapsed by the next person who finds one of them
// inconvenient.
//
// MOVED HERE 2026-08-07 from op-mcp-payment-server, which held a second copy of attestation.ts and
// was deleting it. These four mutated that file; it now lives here, so they follow the source. The
// payment server's sweep keeps the nine that mutate files still local to it.
//
// ─── WHY THIS REBUILDS, AND WHY THAT IS THE WHOLE DIFFERENCE FROM THE ORIGINAL ──────────────────
//
// 14 of this package's tests import `../dist/index.mjs`. A mutation to `src/` that is not rebuilt is
// INVISIBLE to them: every mutation would report SURVIVED, and a sweep reporting "no kills" reads as
// "the distinctions are untested" when it actually means "nothing was tested at all". That is the
// vacuous-detector shape in the instrument built to find vacuous detectors.
//
// So each run is: mutate src -> BUILD -> run suites -> restore -> build again. It is slower and it is
// the only version that measures anything.
//
//   node scripts/sweep-attestation-states.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFile, execFileSync } from 'node:child_process';

const TARGET = 'src/core/attestation.ts';
// THE SUITE LIST IS DERIVED FROM `npm test`, NOT FROM THE DIRECTORY.
//
// `readdirSync('test')` looked right and was wrong: `test/ledger-child.mjs` is a CHILD PROCESS another
// suite spawns, and it exits non-zero when run standalone because it requires a path argument. That
// made the baseline report a crash and the sweep refused — correctly, but for a reason that had
// nothing to do with the code under test.
//
// The test script is the project's own statement of what its suites are, so it is the authority. A
// directory listing is a guess that happens to agree most of the time.
const suites = [...new Set(
  (JSON.parse(readFileSync('package.json', 'utf8')).scripts.test.match(/test\/[\w.-]+\.mjs/g) ?? []),
)];
if (suites.length === 0) {
  console.error('REFUSING: no suites found in the `test` script. A sweep over nothing reports no kills.');
  process.exit(1);
}

// RESTORE ON EVERY EXIT PATH. A sweep interrupted halfway leaves a mutated source that looks like a
// deliberate edit, and the next person to run the suite debugs a defect nobody wrote.
const originals = new Map();
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); originals.clear(); };
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { restore(); process.exit(130); });
process.on('exit', restore);
process.on('uncaughtException', (e) => { restore(); console.error(e); process.exit(1); });

const build = () => { try { execFileSync('npm', ['run', 'build'], { stdio: 'ignore' }); return true; } catch { return false; } };

const runOne = (s) => new Promise((res) => execFile('node', ['--experimental-strip-types', s], (err, so, se) => {
  const out = String(so) + String(se);
  // THIS PACKAGE'S SUITES MARK A FAILURE WITH `  ✗ `, not `  FAIL`. Getting this wrong would report
  // every mutation as SURVIVED, which is the failure this sweep exists to detect, one level up.
  const fails = (out.match(/^ {2}✗/gm) || []).length;
  const ran = /\d+ passed, \d+ failed/.test(out);
  res({ fails, crashed: err && !fails ? 1 : 0, ran, assertions: Number((out.match(/(\d+) passed/) || [0, 0])[1]) });
}));

async function runSuites() {
  const acc = { fails: 0, crashed: 0, ran: 0, assertions: 0 };
  for (let i = 0; i < suites.length; i += 8) {
    for (const r of await Promise.all(suites.slice(i, i + 8).map(runOne))) {
      acc.fails += r.fails; acc.crashed += r.crashed; acc.ran += r.ran ? 1 : 0; acc.assertions += r.assertions;
    }
  }
  return acc;
}

const MUTATIONS = [
  { id: 'A1', claim: 'not-cited is distinct from cited-unresolvable (nothing claimed vs unobtainable)',
    find: "if (citedDecisionId === undefined) return { state: 'not-cited' };",
    repl: "if (citedDecisionId === undefined) return { state: 'cited-unresolvable', reason: 'x' };" },
  { id: 'A2', claim: 'cited-unresolvable is distinct from cited-invalid (absence vs hostility)',
    find: "return { state: 'cited-unresolvable', reason: `The decider uses an unsupported DID method",
    repl: "return { state: 'cited-invalid', reason: `The decider uses an unsupported DID method" },
  { id: 'A3', claim: 'cited-invalid is distinct from cited-unresolvable (failed check vs could not check)',
    find: "return { state: 'cited-invalid', reason: 'The decider is not a well-formed ed25519 did:key",
    repl: "return { state: 'cited-unresolvable', reason: 'The decider is not a well-formed ed25519 did:key" },
  { id: 'A4', claim: 'attested is distinct from cited-unresolvable (verified vs could not check)',
    find: "    state: 'attested',\n    decisionId: att.decisionId as string,",
    repl: "    state: 'cited-unresolvable' as 'attested',\n    decisionId: att.decisionId as string," },
];

console.log('MUTATION SWEEP: the attestation state distinctions\n');
if (!build()) { console.error('REFUSING: the baseline build failed.'); process.exit(1); }
const base = await runSuites();
console.log(`BASELINE  fails=${base.fails} crashed=${base.crashed} suites=${base.ran}/${suites.length} assertions=${base.assertions}`);
if (base.fails || base.crashed) {
  console.error('\nREFUSING TO SWEEP: the baseline is not green, so no kill count would mean anything.\n');
  process.exit(1);
}

const rows = [];
for (const m of MUTATIONS) {
  const orig = readFileSync(TARGET, 'utf8');
  // THE TARGET MUST EXIST AND BE UNAMBIGUOUS. A `find` that matches nothing, or matches twice, makes
  // SURVIVED meaningless — the first silently mutates nothing, the second mutates the wrong one.
  const hits = orig.split(m.find).length - 1;
  if (hits !== 1) { rows.push({ ...m, verdict: `UNSOUND: ${hits} occurrences of the target` }); continue; }

  originals.set(TARGET, orig);
  writeFileSync(TARGET, orig.replace(m.find, m.repl));
  const built = build();
  const r = built ? await runSuites() : { fails: 0, crashed: suites.length, ran: 0, assertions: 0 };
  writeFileSync(TARGET, orig); originals.delete(TARGET);

  // A MUTATION THAT DOES NOT COMPILE IS NOT A KILL. It proves the type system rejected it, which is
  // a different and weaker claim than a test noticing the behaviour changed. Reported as its own
  // verdict rather than folded into KILLED.
  if (!built) { rows.push({ ...m, verdict: 'TYPE-REJECTED (did not build; not a test kill)' }); continue; }
  // THE ANTI-VACUITY TERM. If assertions collapse, the run measured nothing and SURVIVED would be a
  // lie in the safe-looking direction.
  if (r.assertions < base.assertions * 0.5 && r.crashed === 0) {
    rows.push({ ...m, verdict: `UNSOUND: assertions collapsed ${base.assertions}->${r.assertions}` }); continue;
  }
  rows.push({ ...m, verdict: r.fails > 0 || r.crashed > 0 ? `KILLED (${r.fails} failing assertions)` : 'SURVIVED' });
}

build();
console.log();
for (const r of rows) console.log(`  ${r.verdict.startsWith('KILLED') ? 'KILLED  ' : r.verdict.startsWith('SURVIVED') ? 'SURVIVED' : 'UNSOUND '} ${r.id}  ${r.claim}\n           ${r.verdict}`);

const survived = rows.filter((r) => r.verdict === 'SURVIVED');
const unsound = rows.filter((r) => r.verdict.startsWith('UNSOUND'));
console.log(`\n${rows.length} distinctions swept, ${survived.length} SURVIVED, ${unsound.length} UNSOUND.`);
if (survived.length) {
  console.log('\nA SURVIVING MUTATION MEANS THE DISTINCTION IS HELD BY PROSE. The two states can be');
  console.log('collapsed and every test still passes, so nothing stops the next person collapsing them.');
}
if (survived.length || unsound.length) process.exitCode = 1;
