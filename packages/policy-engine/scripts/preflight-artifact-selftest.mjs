// EACH PROPERTY, DRIVEN AGAINST A PACKAGE BUILT TO VIOLATE IT.
//
// A gate whose failure paths have never been exercised is a gate nobody has seen refuse. The existing
// publish preflight's selftest makes the same argument and this mirrors it: four constructed package
// directories, one per property, plus a passing control so the suite can tell "the rule fired" from
// "the rule matched nothing".
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preflightArtifact, declaredEntryPoints } from './preflight-artifact.mjs';

let pass = 0, fail = 0; const failures = [];
const a = (n, ok, d = '') => { if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; failures.push(n); console.log(`  FAIL  ${n}${d ? '  <<< ' + d : ''}`); } };

/** A package directory with a manifest, a src tree and optionally a dist tree. */
const mk = ({ files = ['dist/'], main = 'dist/index.cjs', exportsMap, withDist = true, distFiles = ['index.cjs', 'index.mjs', 'index.d.ts'], srcOlder = true }) => {
  const dir = mkdtempSync(join(tmpdir(), 'op-artifact-'));
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'index.ts'), 'export const x = 1;\n');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: 'x', version: '0.0.0', files, main,
    exports: exportsMap ?? { '.': { import: './dist/index.mjs', require: './dist/index.cjs' } },
  }));
  if (withDist) {
    mkdirSync(join(dir, 'dist'));
    for (const f of distFiles) writeFileSync(join(dir, 'dist', f), '// built\n');
    // Control the ordering explicitly rather than relying on write order: a test that depends on
    // filesystem timestamp granularity is a test that fails on a fast machine.
    const srcT = srcOlder ? 1_000 : 3_000, outT = 2_000;
    utimesSync(join(dir, 'src', 'index.ts'), srcT, srcT);
    for (const f of distFiles) utimesSync(join(dir, 'dist', f), outT, outT);
  }
  return dir;
};
const run = (dir) => preflightArtifact({ pkgDir: dir });

console.log('\n── CONTROL: a well-formed package passes, or every refusal below proves nothing ──');
{
  const r = run(mk({}));
  a('a built, current, fully-resolving package is accepted', r.ok === true, JSON.stringify(r).slice(0, 140));
}

console.log('\n── 1. dist absent or empty ──');
{
  const r = run(mk({ withDist: false }));
  a('an absent dist REFUSES', r.ok === false && r.code === 'ARTIFACT_STALE', JSON.stringify(r).slice(0, 120));
  a('...and says to build rather than building', /npm run build/.test(r.reason));
  const e = run(mk({ distFiles: [] }));
  a('an EMPTY dist refuses too, not just an absent one', e.ok === false);
}

console.log('\n── 2. a declared entry point resolves to nothing ──');
{
  // The rc.13 near-miss in miniature: a manifest naming index.js where the build emits .cjs/.mjs.
  const r = run(mk({ main: 'dist/index.js' }));
  a('main naming a file the build did not emit REFUSES', r.ok === false, JSON.stringify(r).slice(0, 140));
  a('...and names the offending key and path', /main -> dist\/index\.js/.test(r.reason), r.reason?.slice(0, 120));
  const x = run(mk({ exportsMap: { '.': { import: './dist/nope.mjs', require: './dist/index.cjs' } } }));
  a('a nested EXPORTS leaf is checked too, not just main', x.ok === false && /nope\.mjs/.test(x.reason));
}

console.log('\n── 3. a `files` entry matches nothing ──');
{
  const r = run(mk({ files: ['dist/', 'PROVENANCE.md'] }));
  a('a files entry that exists nowhere REFUSES', r.ok === false && /PROVENANCE\.md/.test(r.reason), JSON.stringify(r).slice(0, 140));
}

console.log('\n── 4. the build is older than its source — the case nothing else can see ──');
{
  const r = run(mk({ srcOlder: false }));
  a('source newer than output REFUSES', r.ok === false && /older than the source/.test(r.reason), JSON.stringify(r).slice(0, 140));
  a('...and reports BOTH timestamps and the file each came from',
    /newest source\s+src\/index\.ts/.test(r.detail ?? '') && /oldest output\s+dist\//.test(r.detail ?? ''), (r.detail ?? '').slice(0, 160));
}

console.log('\n── the entry-point enumerator, since every check above depends on it ──');
{
  const eps = declaredEntryPoints({ main: 'a', module: 'b', types: 'c', exports: { '.': { import: 'd', require: 'e' } } });
  a('main, module, types and every exports leaf are enumerated', eps.length === 5, JSON.stringify(eps));
  a('...and each carries the key it came from, so a refusal can name it',
    eps.every(([k]) => typeof k === 'string' && k.length > 0));
}

console.log(`\npreflight-artifact selftest: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.log(`  failures: ${failures.join(', ')}`); process.exit(1); }
