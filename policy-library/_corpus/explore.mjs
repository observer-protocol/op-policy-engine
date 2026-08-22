// Sample the fact space, run the evaluator, record what comes out. Facts first, always.
// Seeded so the run is reproducible: a corpus that cannot be regenerated identically is not evidence.
import { BX_FIELDS, BX_RESOLUTIONS, PSR_FIELDS, PSR_RESOLUTIONS } from './space.mjs';
const LIB = new URL('..', import.meta.url).pathname;

const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const setPath = (o, path, v) => {
  const p = path.split('.');
  let c = o;
  for (let i = 0; i < p.length - 1; i++) c = (c[p[i]] ??= {});
  c[p[p.length - 1]] = v;
};

export function explore(fields, resolutions, evaluate, n, seed) {
  const rnd = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const seen = new Map();          // clause -> Map(result -> {facts, res})
  const throws = new Map();
  for (let i = 0; i < n; i++) {
    const facts = {};
    for (const [path, vals] of Object.entries(fields)) {
      const v = pick(vals);
      if (v !== undefined) setPath(facts, path, v);   // undefined means the field is simply absent
    }
    const res = {};
    for (const [k, vals] of Object.entries(resolutions)) {
      const v = pick(vals);
      if (v !== undefined) res[k] = v;
    }
    let out;
    try { out = evaluate(facts, res); }
    catch (e) {
      const key = e.message.replace(/".*?"/g, '"..."').slice(0, 80);
      if (!throws.has(key)) throws.set(key, { facts, res });
      continue;
    }
    for (const [id, v] of Object.entries(out)) {
      if (!seen.has(id)) seen.set(id, new Map());
      const m = seen.get(id);
      if (!m.has(v.result)) m.set(v.result, { facts, res });
    }
  }
  return { seen, throws };
}

const bx = (await import(`${LIB}/banxico-34-2010/evaluate.mjs`)).evaluate;
const psr = (await import(`${LIB}/psr-2017-752/evaluate.mjs`)).evaluate;
const N = Number(process.env.N || 40000);
const results = {};
for (const [name, fields, res, ev] of [['banxico', BX_FIELDS, BX_RESOLUTIONS, bx], ['psr', PSR_FIELDS, PSR_RESOLUTIONS, psr]]) {
  const { seen, throws } = explore(fields, res, ev, N, 20260822);
  results[name] = { seen, throws };
  const total = [...seen.values()].reduce((a, m) => a + m.size, 0);
  console.log(`\n${'='.repeat(78)}\n${name.toUpperCase()}: ${seen.size} clauses, ${total} distinct results observed over ${N} sampled fact sets`);
  for (const [id, m] of [...seen].sort()) {
    console.log(`  ${id.padEnd(38)}${[...m.keys()].sort().join(', ')}`);
  }
  if (throws.size) {
    console.log(`  THROWS observed (${throws.size} distinct):`);
    for (const k of throws.keys()) console.log(`    ${k}`);
  }
}
globalThis.__results = results;
