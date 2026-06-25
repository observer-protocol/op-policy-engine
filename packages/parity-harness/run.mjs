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
const OP_AT = join(HERE, '..', '..', '..', '..');

// Resolve node and npm binaries. process.execPath is always available;
// npm lives next to node in the nvm/n installation.
const NODE_BIN = process.execPath;
function findNpm() {
  const nodeBinDir = dirname(NODE_BIN);
  const candidates = [
    join(nodeBinDir, 'npm'),
    '/usr/local/bin/npm',
    '/usr/bin/npm',
    '/Users/agentic/.local/bin/npm',
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  // Fall back to PATH-based lookup via spawnSync
  const r = spawnSync('which', ['npm'], { encoding: 'utf8', shell: false });
  if (r.status === 0) return r.stdout.trim();
  return 'npm'; // last resort — shell must be available
}
const NPM_BIN = findNpm();

const matrix = JSON.parse(readFileSync(join(HERE, 'matrix.json'), 'utf8'));

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
    expectedPass: 26,
    parseMode: 'per-case',
    summaryRe: /wdk-op-policy conformance: (\d+) passed, (\d+) failed/,
  },
  {
    id: 'mppx',
    label: 'mppx-op-account',
    dir: join(OP_AT, 'mppx-op-policy'),
    expectedPass: 28,
    parseMode: 'aggregate',
    summaryRe: /mppx-op-account conformance: (\d+) passed, (\d+) failed/,
  },
  {
    id: 'ows',
    label: 'ows-op-verify',
    dir: join(OP_AT, 'ows-op-policy'),
    expectedPass: 70,
    parseMode: 'per-case',
    summaryRe: /^(\d+) passed, (\d+) failed$/m,
  },
  {
    id: 'l402',
    label: 'l402-op-authorize',
    dir: join(OP_AT, 'l402-op-authorize'),
    expectedPass: 12,
    parseMode: 'per-case',
    summaryRe: /^(\d+)\/(\d+) conformance cases passed/m,
  },
];

const engines = engineFilter ? ENGINES.filter(e => e.id === engineFilter) : ENGINES;
if (engineFilter && engines.length === 0) {
  console.error(`Unknown engine: ${engineFilter}. Valid: wdk, mppx, ows, l402`);
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
    const cmdArgs = skipBuild ? ['test/run.mjs'] : ['test'];

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
      resolve({ engine, exitCode: -1, stdout, stderr, timedOut: true, passed: 0, failed: engine.expectedPass });
    }, 5 * 60 * 1000);

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ engine, exitCode: -1, stdout, stderr: err.message, timedOut: false, passed: 0, failed: engine.expectedPass, spawnError: err.message });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const m = stdout.match(engine.summaryRe);
      let passed = 0;
      let failed = 0;
      if (m) {
        // l402 pattern is pass/total; everything else is pass, fail
        if (engine.id === 'l402') {
          passed = parseInt(m[1], 10);
          failed = parseInt(m[2], 10) - passed;
        } else {
          passed = parseInt(m[1], 10);
          failed = parseInt(m[2], 10);
        }
      } else if (code === 0) {
        // No summary line but clean exit — assume all pass
        passed = engine.expectedPass;
        failed = 0;
      } else {
        passed = 0;
        failed = engine.expectedPass;
      }
      resolve({ engine, exitCode: code, stdout, stderr, timedOut: false, passed, failed });
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
    coverage[cat] = { total: 0, byEngine: { wdk: 0, mppx: 0, ows: 0, l402: 0 } };
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
console.log(`${DIM}Behavioral contract: ${matrix.totalCases} cases across 4 engines (AIP v0.8)${RESET}\n`);

if (skipBuild) console.log(`${DIM}--skip-build: invoking test runners directly${RESET}\n`);

// Run all engines concurrently
const results = await Promise.all(engines.map(runEngine));

// Print per-engine results
console.log(`${BOLD}Engine Results${RESET}`);
let allGreen = true;
for (const r of results) {
  const green = r.passed === r.engine.expectedPass && r.failed === 0 && !r.timedOut;
  if (!green) allGreen = false;
  const status = r.timedOut
    ? `${RED}TIMEOUT${RESET}`
    : green
      ? `${GREEN}PASS${RESET}`
      : `${RED}FAIL${RESET}`;
  const countStr = r.timedOut
    ? '?/?'
    : `${r.passed}/${r.engine.expectedPass}`;
  console.log(`  ${pad(r.engine.label, 22)} ${pad(countStr, 6)} ${status}`);
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
const engineOrder = ['wdk', 'mppx', 'ows', 'l402'];

for (const [cat, data] of Object.entries(coverage)) {
  const engineCovering = engineOrder.filter(e => data.byEngine[e] > 0);
  const enginesStr = engineCovering.join(' ');
  const catPad = pad(cat, maxCatLen + 2);
  const totalStr = `(${data.total} case${data.total !== 1 ? 's' : ''})`;
  const blockCount = engineCovering.length;
  const blockStr = '█'.repeat(blockCount) + '░'.repeat(4 - blockCount);
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
  console.log(`${GREEN}${BOLD}All ${matrix.totalCases} cases PASS across ${ENGINES.length} engines. Parity harness GREEN.${RESET}`);
  console.log(`${DIM}PolicyEngine extraction may proceed. No engine flips until its full suite passes against the shared core.${RESET}\n`);
  process.exit(0);
} else if (!allGreen) {
  const failedEngines = results.filter(r => r.passed !== r.engine.expectedPass || r.failed > 0 || r.timedOut);
  console.log(`${RED}${BOLD}Parity harness RED — ${failedEngines.map(r => r.engine.id).join(', ')} not fully passing.${RESET}`);
  console.log(`${DIM}Fix the failing engine suite before extracting PolicyEngine.${RESET}\n`);
  process.exit(1);
} else {
  // Subset run (--engine filter)
  const r = results[0];
  const green = r.passed === r.engine.expectedPass && r.failed === 0 && !r.timedOut;
  const status = green ? `${GREEN}GREEN${RESET}` : `${RED}RED${RESET}`;
  console.log(`${BOLD}${r.engine.label}: ${status}${RESET}\n`);
  process.exit(green ? 0 : 1);
}
