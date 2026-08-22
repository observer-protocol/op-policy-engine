import { BX_FIELDS, BX_RESOLUTIONS, PSR_FIELDS, PSR_RESOLUTIONS } from './space.mjs';
import { explore } from './explore-lib.mjs';
import { restatementDetermination } from './restatement.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
const LIB = new URL('..', import.meta.url).pathname;
const N = Number(process.env.N || 40000);

const bx = (await import(`${LIB}/banxico-34-2010/evaluate.mjs`)).evaluate;
const psr = (await import(`${LIB}/psr-2017-752/evaluate.mjs`)).evaluate;

const corpus = {};
for (const [name, fields, res, ev] of [['banxico', BX_FIELDS, BX_RESOLUTIONS, bx], ['psr', PSR_FIELDS, PSR_RESOLUTIONS, psr]]) {
  const { seen } = explore(fields, res, ev, N, 20260822);
  // one CASE per (clause, result) witness. The case carries FACTS ONLY; results are computed below.
  const cases = [];
  const key = new Set();
  for (const [id, m] of [...seen].sort()) {
    for (const [result, w] of [...m].sort()) {
      const sig = JSON.stringify(w.facts) + JSON.stringify(w.res);
      if (key.has(sig)) continue;             // one fact set often witnesses many results
      key.add(sig);
      cases.push({ facts: w.facts, resolutions: w.res, witnesses: `${id} -> ${result}` });
    }
  }
  // results computed by RUNNING, never asserted alongside the facts
  for (const c of cases) c.results = Object.fromEntries(Object.entries(ev(c.facts, c.resolutions)).map(([k, v]) => [k, v.result]));
  corpus[name] = cases;
  console.log(`${name}: ${cases.length} distinct fact sets witnessing ${[...seen.values()].reduce((a,m)=>a+m.size,0)} results`);
}

// ── STEP 4: the disagreement slice, Banxico only (the restatement is a Banxico document) ─────────
const dis = [];
for (const c of corpus.banxico) {
  const rd = restatementDetermination(c.facts);
  const ours = c.results['34-2010/3.6/p7/firmeza'];
  const oursFloor = c.results['34-2010/3.6/p4/floor'];
  if (rd.firmeza !== ours || rd.floor !== oursFloor) {
    dis.push({
      recorded: { firmeza: rd.firmeza, floor: rd.floor, produced_by: rd.basis },
      evaluated: { firmeza: ours, floor: oursFloor },
      diverges_on: [rd.firmeza !== ours ? '34-2010/3.6/p7/firmeza' : null,
                    rd.floor !== oursFloor ? '34-2010/3.6/p4/floor' : null].filter(Boolean),
      facts: c.facts, resolutions: c.resolutions,
    });
  }
}
const byClause = {};
for (const d of dis) for (const cl of d.diverges_on) byClause[cl] = (byClause[cl] || 0) + 1;
console.log(`\ndisagreement slice: ${dis.length} of ${corpus.banxico.length} Banxico cases diverge`);
for (const [k, v] of Object.entries(byClause).sort()) console.log(`  ${k.padEnd(38)}${v}`);

writeFileSync('corpus.json', JSON.stringify({ $note: 'Facts first. Every `results` block was computed by running the committed evaluator over the `facts` block; no expected result is asserted anywhere.', seed: 20260822, sampled: N, banxico: corpus.banxico, psr: corpus.psr }, null, 1));
writeFileSync('disagreement.json', JSON.stringify({ $note: 'Recorded determinations come from restatement.mjs, an independent encoding of DIVERGENCE.md. It never sees the evaluator output.', cases: dis }, null, 1));
console.log('\nwritten: corpus.json, disagreement.json');
