// Parity harness runner.
//
// Invokes all four OP policy engine test suites and maps results to the
// conformance matrix. Reports per-engine pass/fail, rule-category coverage,
// and an overall GREEN / RED gate.
//
// Usage: node run.mjs
//        node run.mjs --skip-build   # skip typecheck+build, run test runner only
//        node run.mjs --engine wdk   # run a single engine

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OP_AT = join(HERE, '..', '..', '..');

// Resolve node and npm binaries. process.execPath is always available;
// npm lives next to node in the nvm/n installation.
const NODE_BIN = process.execPath;
function findNpm() {
  const nodeBinDir = dirname(NODE_BIN);
  const candidates = [
    join(nodeBinDir, 'npm'),
    '/usr/local/bin/npm',
    '/usr/bin/npm',
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  // Fall back to PATH-based lookup via spawnSync
  const r = spawnSync('which', ['npm'], { encoding: 'utf8', shell: false });
  if (r.status === 0) return r.stdout.trim();
  return 'npm'; // last resort — shell must be available
}
const NPM_BIN = findNpm();

const matrix = JSON.parse(readFileSync(join(HERE, 'matrix.json'), 'utf8'));
// DERIVED: the engines that have cases in the matrix (never a hardcoded list — a stale
// enumeration here would silently miss a case's engine, i.e. undefined++ = NaN).
const MATRIX_ENGINES = [...new Set(matrix.cases.map(c => c.engine))];

const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const DIM   = '\x1b[2m';
const CYAN  = '\x1b[36m';

const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const engineFilter = args.includes('--engine') ? args[args.indexOf('--engine') + 1] : null;

// --------------------------------------------------------------------------
// Engine configuration
// --------------------------------------------------------------------------

const ENGINES = [
  {
    id: 'wdk',
    label: 'wdk-op-policy',
    dir: join(OP_AT, 'wdk-op-policy'),
    parseMode: 'per-case',
    summaryRe: /wdk-op-policy conformance: (\d+) passed, (\d+) failed/,
  },
  {
    id: 'mppx',
    label: 'mppx-op-account',
    dir: join(OP_AT, 'mppx-op-policy'),
    parseMode: 'aggregate',
    summaryRe: /mppx-op-account conformance: (\d+) passed, (\d+) failed/,
  },
  {
    id: 'ows',
    label: 'ows-op-verify',
    dir: join(OP_AT, 'ows-op-policy'),
    parseMode: 'per-case',
    summaryRe: /^(\d+) passed, (\d+) failed$/m,
  },
  {
    id: 'l402',
    label: 'l402-op-authorize',
    dir: join(OP_AT, 'l402-op-authorize'),
    parseMode: 'per-case',
    summaryRe: /^(\d+)\/(\d+) conformance cases passed/m,
  },
  {
    id: 'x402',
    label: 'x402-op-authorize',
    dir: join(OP_AT, 'x402-op-authorize'),
    parseMode: 'per-case',
    summaryRe: /^(\d+)\/(\d+) conformance cases passed/m,
  },
];

// Optional local-only engine extensions. A deployment may hold additional
// (e.g. in-development or deployment-specific) engines to run against this same
// behavioral contract without their identity or notes living in this repo.
// Point PARITY_EXTRA_ENGINES at a JSON file of engine defs, or drop
// a gitignored `parity-harness.local.json` next to this runner. Each entry:
//   { id, label, dir, parseMode, summaryRe (string), npmScript?, runnerRel? }
// (no expectedPass — the gate is DERIVED: failed === 0 && passed > 0.)
// `summaryRe` is a string here and is compiled to a RegExp on load.
function loadExtraEngines() {
  const candidates = [];
  if (process.env.PARITY_EXTRA_ENGINES) candidates.push(process.env.PARITY_EXTRA_ENGINES);
  candidates.push(join(HERE, 'parity-harness.local.json'));
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const defs = JSON.parse(readFileSync(path, 'utf8'));
      const list = Array.isArray(defs) ? defs : defs.engines ?? [];
      const base = dirname(path);
      return list.map(e => ({
        parseMode: 'per-case',
        ...e,
        // Relative dirs resolve against the config file's location so a def
        // shipped inside another repo stays portable.
        dir: e.dir && !e.dir.startsWith('/') ? join(base, e.dir) : e.dir,
        summaryRe: new RegExp(e.summaryRe, e.summaryReFlags ?? ''),
      }));
    } catch (err) {
      console.error(`Failed to load extra engines from ${path}: ${err.message}`);
    }
  }
  return [];
}
ENGINES.push(...loadExtraEngines());

const engines = engineFilter ? ENGINES.filter(e => e.id === engineFilter) : ENGINES;
if (engineFilter && engines.length === 0) {
  console.error(`Unknown engine: ${engineFilter}. Valid: wdk, mppx, ows, l402, x402`);
  process.exit(1);
}

// --------------------------------------------------------------------------
// Runner
// --------------------------------------------------------------------------

function runEngine(engine) {
  return new Promise((resolve) => {
    // If skip-build: call only the test runner directly (node test/run.mjs)
    // Otherwise: npm test (typecheck + build + fixtures + test runner)
    const cmd = skipBuild ? NODE_BIN : NPM_BIN;
    const cmdArgs = skipBuild
      ? [engine.runnerRel ?? 'test/run.mjs']
      : (engine.npmScript ? ['run', engine.npmScript] : ['test']);

    const child = spawn(cmd, cmdArgs, {
      cwd: engine.dir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', c => { stdout += c; });
    child.stderr.on('data', c => { stderr += c; });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ engine, exitCode: -1, stdout, stderr, timedOut: true, passed: 0, failed: 0 });
    }, 5 * 60 * 1000);

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ engine, exitCode: -1, stdout, stderr: err.message, timedOut: false, passed: 0, failed: 1, spawnError: err.message });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const m = stdout.match(engine.summaryRe);
      let passed = 0;
      let failed = 0;
      let unparsed = false;
      if (m) {
        // l402/x402 pattern is pass/total; everything else is pass, fail
        if (engine.id === 'l402' || engine.id === 'x402') {
          passed = parseInt(m[1], 10);
          failed = parseInt(m[2], 10) - passed;
        } else {
          passed = parseInt(m[1], 10);
          failed = parseInt(m[2], 10);
        }
      } else if (code === 0) {
        // Clean exit but no parseable summary: coverage is UNVERIFIABLE. Do NOT assume
        // pass — that is exactly how a harness silently stops covering something. passed
        // stays 0 so the derived gate (passed > 0) reads red until the summary parses.
        unparsed = true;
      } else {
        // Nonzero exit, no summary — a real failure. failed > 0 forces red.
        failed = 1;
      }
      resolve({ engine, exitCode: code, stdout, stderr, timedOut: false, passed, failed, unparsed });
    });
  });
}

// --------------------------------------------------------------------------
// Coverage computation from the static matrix
// --------------------------------------------------------------------------

function computeCoverage() {
  const categories = Object.keys(matrix.ruleCategories);
  const coverage = {};
  for (const cat of categories) {
    coverage[cat] = { total: 0, byEngine: Object.fromEntries(MATRIX_ENGINES.map(e => [e, 0])) };
  }
  for (const c of matrix.cases) {
    if (coverage[c.ruleCategory]) {
      coverage[c.ruleCategory].total++;
      coverage[c.ruleCategory].byEngine[c.engine]++;
    }
  }
  return coverage;
}

// --------------------------------------------------------------------------
// Formatting helpers
// --------------------------------------------------------------------------

function pad(str, n) { return String(str).padEnd(n); }
function bar(count) {
  const blocks = Math.min(count, 4);
  return '█'.repeat(blocks) + ' '.repeat(4 - blocks);
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

console.log(`\n${BOLD}=== OP Policy Engine — Parity Conformance Harness ===${RESET}`);
console.log(`${DIM}Behavioral contract: ${matrix.cases.length} matrix cases across ${new Set(matrix.cases.map(c => c.engine)).size} matrix engines + shared core; ${ENGINES.length} engines run (AIP v0.8 + v2.2 crossRailBudget)${RESET}\n`);

if (skipBuild) console.log(`${DIM}--skip-build: invoking test runners directly${RESET}\n`);

// Run all engines concurrently
const results = await Promise.all(engines.map(runEngine));

// Print per-engine results
console.log(`${BOLD}Engine Results${RESET}`);
let allGreen = true;
for (const r of results) {
  // DERIVED gate: an engine is green iff it ran cases and none failed. Never gated on a
  // hardcoded expected count — a literal in the GATE flips the harness red on drift (an
  // engine adding a case), which trains people to ignore a red harness; a gate everyone
  // ignores has stopped working while looking like it works. passed > 0 is load-bearing:
  // failed === 0 alone would pass an engine that ran ZERO cases (a silent coverage hole).
  // The count is still printed — visible, not authoritative.
  const green = !r.timedOut && !r.unparsed && r.failed === 0 && r.passed > 0;
  if (!green) allGreen = false;
  const status = r.timedOut
    ? `${RED}TIMEOUT${RESET}`
    : r.unparsed || r.passed === 0
      ? `${RED}NO-CASES${RESET}`
      : green
        ? `${GREEN}PASS${RESET}`
        : `${RED}FAIL${RESET}`;
  const countStr = r.timedOut
    ? '?'
    : `${r.passed} pass, ${r.failed} fail`;
  console.log(`  ${pad(r.engine.label, 22)} ${pad(countStr, 16)} ${status}`);
  if (r.spawnError) {
    console.log(`    ${DIM}spawn error: ${r.spawnError}${RESET}`);
  } else if (!green && !r.timedOut && r.stderr) {
    const errLines = r.stderr.trim().split('\n').slice(0, 5);
    for (const l of errLines) console.log(`    ${DIM}${l}${RESET}`);
  }
}

// Coverage matrix
console.log(`\n${BOLD}Rule Coverage (from matrix.json)${RESET}`);
const coverage = computeCoverage();
const maxCatLen = Math.max(...Object.keys(coverage).map(k => k.length));
const engineOrder = MATRIX_ENGINES;

for (const [cat, data] of Object.entries(coverage)) {
  const engineCovering = engineOrder.filter(e => data.byEngine[e] > 0);
  const enginesStr = engineCovering.join(' ');
  const catPad = pad(cat, maxCatLen + 2);
  const totalStr = `(${data.total} case${data.total !== 1 ? 's' : ''})`;
  const blockCount = engineCovering.length;
  const blockStr = '█'.repeat(blockCount) + '░'.repeat(Math.max(0, engineOrder.length - blockCount));
  console.log(`  ${CYAN}${catPad}${RESET} ${blockStr}  ${DIM}${enginesStr.padEnd(22)} ${totalStr}${RESET}`);
}

// Gaps: categories with zero coverage
const uncovered = Object.entries(coverage).filter(([, d]) => d.total === 0).map(([k]) => k);
if (uncovered.length > 0) {
  console.log(`\n${RED}Coverage gaps (no cases): ${uncovered.join(', ')}${RESET}`);
}

// Overall gate
console.log('');
if (allGreen && engines.length === ENGINES.length) {
  const totalPassed = results.reduce((s, r) => s + r.passed, 0);
  console.log(`${GREEN}${BOLD}All engines green: ${totalPassed} cases passed across ${ENGINES.length} engines, 0 failed. Parity harness GREEN.${RESET}`);
  console.log(`${DIM}PolicyEngine extraction may proceed. No engine flips until its full suite passes against the shared core.${RESET}\n`);
  process.exit(0);
} else if (!allGreen) {
  const failedEngines = results.filter(r => r.failed > 0 || r.passed === 0 || r.timedOut || r.unparsed);
  console.log(`${RED}${BOLD}Parity harness RED — ${failedEngines.map(r => r.engine.id).join(', ')} not fully passing.${RESET}`);
  console.log(`${DIM}Fix the failing engine suite before extracting PolicyEngine.${RESET}\n`);
  process.exit(1);
} else {
  // Subset run (--engine filter)
  const r = results[0];
  const green = !r.timedOut && !r.unparsed && r.failed === 0 && r.passed > 0;
  const status = green ? `${GREEN}GREEN${RESET}` : `${RED}RED${RESET}`;
  console.log(`${BOLD}${r.engine.label}: ${status}${RESET}\n`);
  process.exit(green ? 0 : 1);
}
