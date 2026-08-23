#!/usr/bin/env node
/**
 * A clause whose basis CLAIMS to compose, consume or feed another clause must actually read one
 * during a live run.
 *
 * ─── WHY ────────────────────────────────────────────────────────────────────────────────────────
 *
 * Three clauses stated an effect the code did not have, and each was found by tracing rather than by
 * reading. `psr-2017/67/4` said it `changes the authorisation result for later transactions` and its
 * result was read by nothing. `34-2010/3.6/p5/foreign-deadline` said it `selects which deadline the
 * fourth paragraph imposes` and its result was read by nothing. `psr-2017/76/1/trigger` said it
 * composed `the 75 burden` and read that clause zero times.
 *
 * All three survived review because a basis is prose and nothing compared it to the code.
 *
 * ─── WHAT IT TRACES ─────────────────────────────────────────────────────────────────────────────
 *
 * The evaluator builds its results in an object and reads earlier ones out of it. That object is
 * wrapped in a Proxy which records reads, and the reads are attributed to the clause being computed
 * by flushing on each `put`. Recording stops when the evaluator returns, because the case files
 * iterate the result to print it and an earlier version of this instrument counted that as
 * consumption, reporting every clause consumed.
 *
 * ─── WHAT IT CANNOT SEE, STATED ─────────────────────────────────────────────────────────────────
 *
 * A basis that names a clause in PROSE, by regulation or paragraph number rather than by id, is
 * matched only through the small reference map below. `the 75 burden` resolves; a novel phrasing
 * would not. That is a real limit and it is why assertion A exists: a basis claiming composition
 * must read SOMETHING, whoever it names.
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';

// TWO DIRECTIONS, AND THEY ARE NOT THE SAME CLAIM. `composes` and `consumes` say this clause READS
// others. `feeds`, `changes the result of`, `selects which` say others READ THIS ONE. The first
// version of this check conflated them and reported a clause that feeds as one that reads nothing.
const CLAIMS_TO_READ = /\bcompos(?:es|ing)\b|\bconsum(?:es|ing)\b|\breads (?:the|another|three|two)\b|governs how the .*results/i;
const CLAIMS_TO_FEED = /changes the .*result|selects which|\bfeeds\b|forbids reading/i;
// prose references, resolved to id fragments. Declared rather than inferred.
const REFERENCE = [
  [/\bthe (\d{2}) (?:burden|bar|result)\b/gi, (m) => `/${m[1]}/`],
  [/\breg(?:ulation)? (\d{2})\b/gi, (m) => `/${m[1]}/`],
  [/\bnumeral (\d\.\d)\b/gi, (m) => `/${m[1]}/`],
];

function trace(dir, objName) {
  const src = readFileSync(`${dir}/evaluate.mjs`, 'utf8');
  const proxy = `
  globalThis.__reads = []; globalThis.__buf = []; globalThis.__rec = true;
  const ${objName} = new Proxy({}, {
    get(t, k) { if (globalThis.__rec && typeof k === 'string' && k.includes('/')) globalThis.__buf.push(k); return t[k]; },
    set(t, k, v) { t[k] = v; return true; },
    ownKeys(t) { return Reflect.ownKeys(t); },
    getOwnPropertyDescriptor(t, k) { return Reflect.getOwnPropertyDescriptor(t, k); } });
`;
  let s = src.replace(new RegExp(`\\n  const ${objName} = \\{\\};`), proxy);
  if (s === src) throw new Error(`could not instrument ${dir}`);
  // ATTRIBUTE READS TO THE CLAUSE BEING COMPUTED, by flushing on each put. The first version matched
  // `\n  out[id] = ` and the put bodies are single-line, so it matched nothing, inserted nothing, and
  // reported every clause as reading zero others. It failed silently and its output looked like a
  // finding. Now the replacement is asserted.
  const before = s;
  s = s.replace(new RegExp(`(${objName})\\[id\\] = `, 'g'),
    `globalThis.__reads.push([id, globalThis.__buf.slice()]); globalThis.__buf = []; $1[id] = `);
  if (s === before) throw new Error(`could not insert the read flush in ${dir}: attribution would be empty`);
  s = s.replace(new RegExp(`\\n  return ${objName};`), `\n  globalThis.__rec = false;\n  return ${objName};`);
  const tgt = `${dir}/__claims-eval.mjs`;
  writeFileSync(tgt, s);
  return tgt;
}

let pass = 0, fail = 0, findings = [];
const a = (n, ok, d = '') => { if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n}${d ? '\n          ' + d : ''}`); } };

for (const dir of process.argv.slice(2)) {
  const reg = JSON.parse(readFileSync(`${dir}/clauses.json`, 'utf8')).clauses;
  const ids = new Set(reg.map((c) => c.id));
  const objName = readFileSync(`${dir}/evaluate.mjs`, 'utf8').includes('\n  const out = {};') ? 'out' : 'o';
  const tgt = trace(dir, objName);
  const { evaluate } = await import(`file://${process.cwd()}/${tgt}?t=${Date.now()}`);
  try { evaluate({}, {}); } catch { /* an empty run is enough to see the read graph */ }
  const readsBy = new Map();
  for (const [id, rd] of globalThis.__reads) readsBy.set(id, new Set(rd.filter((r) => ids.has(r) && r !== id)));
  if (existsSync(tgt)) unlinkSync(tgt);

  console.log(`\n══ ${dir} ══  ${reg.length} clauses`);
  const claimedNotRead = [], readNotClaimed = [];
  for (const c of reg) {
    const basis = [c.disposition_basis, c.reuse_note, c.note].filter(Boolean).join(' ');
    const actual = readsBy.get(c.id) ?? new Set();
    if (CLAIMS_TO_FEED.test(basis) && !CLAIMS_TO_READ.test(basis)) {
      const readers = [...readsBy].filter(([, set]) => set.has(c.id)).map(([k]) => k);
      if (readers.length === 0) claimedNotRead.push(`${c.id}: claims to FEED another clause, and NOTHING READS IT  ["${basis.slice(0, 70)}"]`);
    } else if (CLAIMS_TO_READ.test(basis)) {
      if (actual.size === 0) claimedNotRead.push(`${c.id}: claims to COMPOSE, and READS NOTHING  ["${basis.slice(0, 70)}"]`);
      else {
        for (const [re, frag] of REFERENCE) {
          for (const m of basis.matchAll(re)) {
            const f = frag(m);
            const named = reg.filter((d) => d.id.includes(f) && d.id !== c.id).map((d) => d.id);
            if (named.length && !named.some((n) => actual.has(n))) {
              claimedNotRead.push(`${c.id}: names "${m[0].trim()}" and reads none of ${named.join(', ')}`);
            }
          }
        }
      }
    }
    if (!CLAIMS_TO_READ.test(basis) && actual.size > 0) {
      readNotClaimed.push(`${c.id}: reads ${[...actual].join(', ')} and its basis claims no composition`);
    }
  }
  a(`no clause claims an effect it does not have (${reg.length} checked)`, claimedNotRead.length === 0, claimedNotRead.join('\n          '));
  if (readNotClaimed.length) {
    console.log(`  NOTE  read-but-not-claimed, reported separately and not a failure:`);
    for (const r of readNotClaimed) console.log(`          ${r}`);
  }
  findings.push({ dir, claimedNotRead, readNotClaimed });
}
console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}: ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
