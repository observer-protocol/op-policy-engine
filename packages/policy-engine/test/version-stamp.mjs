// Proves the core version stamp is DERIVED from package.json at build time (not a
// hand-set constant — the hardcoded-count disease Boyd named), and that the
// ledger-safety self-check reads it correctly.
import { CORE_VERSION, LEDGER_SAFE_FLOOR, compareCoreVersion, assertLedgerCoreSafe } from '../dist/index.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const pkgVersion = JSON.parse(readFileSync(join(HERE, '..', 'package.json'), 'utf8')).version;
let pass = 0, fail = 0;
const A = (n, ok, d = '') => { if (ok) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  <<< ' + d : '')); } };

console.log('\n── core version stamp + ledger self-check ──');
// The load-bearing one: the bundled stamp MUST equal the real package.json
// version. A hand-set constant would pass a hardcoded value and drift silently;
// this fails the instant the --define didn't wire or someone hand-edited it.
A(`CORE_VERSION is DERIVED from package.json (${CORE_VERSION} === ${pkgVersion})`, CORE_VERSION === pkgVersion, `stamp=${CORE_VERSION} pkg=${pkgVersion}`);
A('CORE_VERSION is not the unstamped fallback', CORE_VERSION !== '0.0.0-unstamped');
A('compare: 0.3.0 (fail-open) below floor → -1', compareCoreVersion('0.3.0', LEDGER_SAFE_FLOOR) === -1);
A('compare: 0.3.1 (false-contend) below floor → -1', compareCoreVersion('0.3.1', LEDGER_SAFE_FLOOR) === -1);
A('compare: 0.3.2 at floor → 0', compareCoreVersion('0.3.2', LEDGER_SAFE_FLOOR) === 0);
A('compare: 0.4.0 above floor → 1', compareCoreVersion('0.4.0', LEDGER_SAFE_FLOOR) === 1);
const s = assertLedgerCoreSafe();
A('current build reports SAFE (>= floor) and stamps its own version', s.safe === true && s.coreVersion === pkgVersion && s.unstamped === false, JSON.stringify(s));
let threw = false; try { assertLedgerCoreSafe({ mode: 'refuse' }); } catch { threw = true; }
A('refuse mode does NOT throw when core is at/above floor', threw === false);

console.log(`\nversion-stamp: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
