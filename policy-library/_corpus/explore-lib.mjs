const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const setPath = (o, path, v) => { const p = path.split("."); let c = o; for (let i = 0; i < p.length - 1; i++) c = (c[p[i]] ??= {}); c[p[p.length - 1]] = v; };
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
