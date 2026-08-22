import { BX_FIELDS, BX_RESOLUTIONS } from './space.mjs';
import { restatementDetermination } from './restatement.mjs';
import { writeFileSync } from 'node:fs';
const LIB = new URL('..', import.meta.url).pathname;
const bx = (await import(`${LIB}/banxico-34-2010/evaluate.mjs`)).evaluate;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const setPath = (o, p, v) => { const q = p.split('.'); let c = o; for (let i = 0; i < q.length - 1; i++) c = (c[q[i]] ??= {}); c[q[q.length - 1]] = v; };

const rnd = mulberry32(778899);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const N = Number(process.env.N || 5000);
let agree = 0;
const causes = {}, examples = {};
const bump = (k, rec) => { causes[k] = (causes[k] || 0) + 1; if (!examples[k]) examples[k] = rec; };

for (let i = 0; i < N; i++) {
  const facts = {};
  for (const [p, vs] of Object.entries(BX_FIELDS)) { const v = pick(vs); if (v !== undefined) setPath(facts, p, v); }
  const res = {};
  for (const [k, vs] of Object.entries(BX_RESOLUTIONS)) { const v = pick(vs); if (v !== undefined) res[k] = v; }
  let o; try { o = bx(facts, res); } catch { continue; }
  const rd = restatementDetermination(facts);
  const ours = o['34-2010/3.6/p7/firmeza'].result;
  const rec = { facts, resolutions: res, recorded: rd.firmeza, evaluated: ours };
  if (rd.firmeza === ours) { agree++; continue; }

  // classify, from the FACTS, never from the evaluator's reasoning
  if (ours === 'undetermined' || ours === 'not_yet_attached') {
    bump('the restatement has no third state, so it records a determination where the source supports none', rec);
  } else if (facts.operation?.executed_abroad === true) {
    bump('D2: the restatement applies the 45 day period to a foreign operation, which the fifth paragraph gives 180 days', rec);
  } else if (facts.dictamen?.verification_method_stated !== true
             && o['34-2010/3.6/a/verification-method'].result === 'absent') {
    bump('D1: the restatement element table omits the verification method, so a dictamen missing it still conforms', rec);
  } else if (o['34-2010/3.6/p4/signatory'].result !== 'member' || o['34-2010/3.6/p4/channel'].result === 'breached') {
    bump('D5: the restatement does not test channel or signatory, so a dictamen failing one still conforms', rec);
  } else {
    bump('unclassified', rec);
  }
}
const total = Object.values(causes).reduce((a, b) => a + b, 0);
console.log(`${N} sampled fact sets: ${agree} agree, ${total} diverge on firmeza\n`);
for (const [k, v] of Object.entries(causes).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(5)}  ${(100 * v / N).toFixed(1).padStart(5)}%  ${k}`);
}
writeFileSync('disagreement.json', JSON.stringify({
  $note: 'Recorded determinations come from restatement.mjs, an independent encoding of DIVERGENCE.md that never sees the evaluator output. Causes are classified from the FACTS.',
  seed: 778899, sampled: N, agree, diverge: total, causes,
  one_example_per_cause: examples,
}, null, 1));
console.log('\nwritten: disagreement.json');
