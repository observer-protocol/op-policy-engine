// What do the committed worked cases reach, against what the registers can produce?
import { BX_FIELDS, BX_RESOLUTIONS, PSR_FIELDS, PSR_RESOLUTIONS, FECA_FIELDS, FECA_RESOLUTIONS, SRF_FIELDS, SRF_RESOLUTIONS } from './space.mjs';
import { explore } from './explore-lib.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const LIB = new URL('..', import.meta.url).pathname;

// Run the REAL cases.mjs against a spy, so the fixtures are the committed ones.
// THE SPY AND CASE FILES ARE PER-RUN SCRATCH, in the same isolated directory populations.mjs
// uses: pid plus UUID under .phase0-scratch/ at the repository root, gitignored, outside the
// freeze scope. They were written to process.cwd() until 2026-08-23, which put six of them at
// policy-library's root when this ran from there, and a broad git add swept all six onto public
// main; the /tmp fix had covered populations.mjs and never this second writer.
import { randomUUID } from 'node:crypto';
const __SCRATCH = `${new URL('../../', import.meta.url).pathname}.phase0-scratch/${process.pid}-${randomUUID()}`;
mkdirSync(__SCRATCH, { recursive: true });
async function fixtureResults(dir, tag) {
  const spy = `${__SCRATCH}/spy-${tag}.mjs`;
  // RE-EXPORT EVERYTHING THE REAL MODULE EXPORTS, not just `evaluate`. FECA's cases.mjs also imports
  // `resultOf`, and a spy that exports one name turns a missing re-export into a SyntaxError that
  // reads as the domain being broken rather than as the harness being narrow.
  writeFileSync(spy, `
    import { evaluate as real } from '${LIB}/${dir}/evaluate.mjs';
    export * from '${LIB}/${dir}/evaluate.mjs';
    globalThis.__hits = globalThis.__hits || [];
    export const evaluate = (f, r) => { const o = real(f, r); globalThis.__hits.push(o); return o; };
  `);
  const cs = readFileSync(`${LIB}/${dir}/cases.mjs`, 'utf8').replace(/from '\.\/evaluate\.mjs'/, `from '${spy}'`);
  const tc = `${__SCRATCH}/cases-${tag}.mjs`;
  writeFileSync(tc, cs);
  globalThis.__hits = [];
  const log = console.log; console.log = () => {};
  await import(tc);
  console.log = log;
  const m = new Map();
  for (const o of globalThis.__hits) for (const [id, v] of Object.entries(o)) {
    if (!m.has(id)) m.set(id, new Set());
    if (!('result' in v)) continue;   // no result domain: not a result of `undefined`
    m.get(id).add(v.result);
  }
  return m;
}

const N = Number(process.env.N || 40000);
const out = {};
for (const [name, dir, fields, res] of [['banxico','banxico-34-2010',BX_FIELDS,BX_RESOLUTIONS],
                                        ['psr','psr-2017-752',PSR_FIELDS,PSR_RESOLUTIONS],
                                        ['feca','feca-2-0805',FECA_FIELDS,FECA_RESOLUTIONS],
                                        ['srf','mas-srf-2024',SRF_FIELDS,SRF_RESOLUTIONS]]) {
  const ev = (await import(`${LIB}/${dir}/evaluate.mjs`)).evaluate;
  const { seen } = explore(fields, res, ev, N, 20260822);
  const fix = await fixtureResults(dir, name);
  let reachable = 0, reached = 0;
  const missed = [];
  for (const [id, m] of [...seen].sort()) {
    for (const r of [...m.keys()].sort()) {
      reachable++;
      if (fix.get(id)?.has(r)) reached++; else missed.push(`${id} -> ${r}`);
    }
  }
  out[name] = { reachable, reached, missed, seen };
  console.log(`\n${name.toUpperCase()}`);
  console.log(`  clauses                                  ${seen.size}`);
  console.log(`  distinct results the register can produce ${reachable}`);
  console.log(`  distinct results the worked cases reach   ${reached}`);
  console.log(`  NEVER REACHED BY ANY FIXTURE              ${missed.length}`);
}
// Written beside this script, not into whatever directory the caller stood in: the first caveat
// run wrote a stray copy at the caller's cwd while the committed artifact stayed caveat-less.
writeFileSync(new URL('./coverage.json', import.meta.url), JSON.stringify({
  $caveat: 'REACHABLE IS A SAMPLER-DERIVED LOWER BOUND AND IS BLIND TO STRUCTURAL UNREACHABILITY (E33): 37 declared-token instances across the three registers, tokens conditional_requirement declares that its call sites can never emit, appear in neither these reachable counts nor these missed lists, because no running instrument can see a token no input reaches. Only the structural derivation (validate.mjs, the R7 reachable-subset notes) sees them. A coverage figure quoted without this sentence overstates what was measured.',
  ...Object.fromEntries(Object.entries(out).map(([k,v]) => [k, {reachable:v.reachable, reached:v.reached, missed:v.missed}]))}, null, 1));
console.log('\nCAVEAT (E33): reachable is a lower bound blind to structurally unreachable declared tokens; see coverage.json $caveat.');
console.log('\nwritten: coverage.json');
