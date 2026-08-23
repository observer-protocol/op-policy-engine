/**
 * The three populations the oracle is taken over, defined in ONE place so the capture and the
 * parity harness cannot disagree about what they are measuring.
 *
 * Each population yields records of {facts, resolutions}. Nothing here computes a result.
 *
 * ─── WHY THE FIXTURES ARE READ THROUGH A SPY RATHER THAN TRANSCRIBED ────────────────────────────
 *
 * `cases.mjs` holds the committed fact sets and also prints a report. Copying the fact sets into
 * this file would make a second representation of them, which is the defect class this estate keeps
 * finding: two copies that agree today and drift silently. The spy re-exports the real module and
 * records every (facts, resolutions) pair the committed cases actually evaluate.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { BX_FIELDS, BX_RESOLUTIONS, PSR_FIELDS, PSR_RESOLUTIONS, FECA_FIELDS, FECA_RESOLUTIONS } from '../_corpus/space.mjs';

export const LIB = new URL('..', import.meta.url).pathname;
// PER-RUN, ISOLATED, INSIDE THE REPOSITORY, IGNORED. This defaulted to /tmp until 2026-08-24,
// which put run artifacts where any process could read them and two concurrent runs shared file
// names. Now: one directory per process under .phase0-scratch/ at the repository root, named by
// pid plus a UUID so two concurrent runs cannot collide, OUTSIDE the freeze scope (which counts
// ignored files under policy-library as dirty, so the scratch cannot live there).
// RESOLVED AS A URL, NOT CONCATENATED AS A STRING. The first version built `${LIB}/../...`, and the
// unnormalised `//..` means two different things to the two consumers: POSIX fs resolves it to the
// repository root, URL segment removal resolves it to policy-library. The spy was WRITTEN at one
// path and IMPORTED from the other, and the failure arrived on the first concurrent-run test.
const REPO_ROOT = new URL('../../', import.meta.url).pathname;
export const SCRATCH = process.env.PHASE0_SCRATCH || `${REPO_ROOT}.phase0-scratch/${process.pid}-${randomUUID()}`;

export const DOMAINS = [
  { name: 'banxico', dir: 'banxico-34-2010', fields: BX_FIELDS,   resolutions: BX_RESOLUTIONS,   corpusKey: 'banxico' },
  { name: 'psr',     dir: 'psr-2017-752',    fields: PSR_FIELDS,  resolutions: PSR_RESOLUTIONS,  corpusKey: 'psr' },
  { name: 'feca',    dir: 'feca-2-0805',     fields: FECA_FIELDS, resolutions: FECA_RESOLUTIONS, corpusKey: null },
];

export const SEED = 20260822;
export const SAMPLE_N = Number(process.env.PHASE0_N || 40000);

export const sha = (s) => createHash('sha256').update(s).digest('hex');

// ─── the sampled population, regenerated rather than stored ─────────────────────────────────────
//
// Identical PRNG and field-iteration order to `_corpus/explore-lib.mjs`, so the fact sets are the
// same ones the corpus instruments draw. It is duplicated here rather than imported because
// explore-lib's `explore` runs the evaluator and keeps only first witnesses; this needs the INPUT
// STREAM and nothing else. The duplication is of a generator, and it is checked: the capture freezes
// a digest of the input stream and the harness recomputes it, so a divergence between the two copies
// fails loudly rather than quietly changing the population.
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

export function* sampledInputs(fields, resolutions, n, seed) {
  const rnd = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
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
    yield { facts, resolutions: res };
  }
}

// ─── the corpus population ──────────────────────────────────────────────────────────────────────
export function corpusInputs(corpusKey) {
  if (corpusKey === null) return [];
  const c = JSON.parse(readFileSync(`${LIB}/_corpus/corpus.json`, 'utf8'));
  return c[corpusKey].map((x) => ({ facts: x.facts, resolutions: x.resolutions }));
}

// ─── the fixture population ─────────────────────────────────────────────────────────────────────
//
// Returns {facts, resolutions, output} because the committed cases are the only population whose
// inputs are not otherwise recoverable: they exist as expressions inside cases.mjs.
export async function fixtureRuns(dir, tag) {
  mkdirSync(SCRATCH, { recursive: true });
  const spy = `${SCRATCH}/phase0-spy-${tag}.mjs`;
  writeFileSync(spy, `
    import { evaluate as real } from '${LIB}/${dir}/evaluate.mjs';
    export * from '${LIB}/${dir}/evaluate.mjs';
    globalThis.__phase0_runs = globalThis.__phase0_runs || [];
    export const evaluate = (f, r) => {
      const o = real(f, r);
      globalThis.__phase0_runs.push({ facts: f, resolutions: r ?? {}, output: o });
      return o;
    };
  `);
  const src = readFileSync(`${LIB}/${dir}/cases.mjs`, 'utf8')
    .replace(/from '\.\/evaluate\.mjs'/, `from '${spy}'`);
  const tc = `${SCRATCH}/phase0-cases-${tag}.mjs`;
  writeFileSync(tc, src);
  globalThis.__phase0_runs = [];
  const log = console.log; console.log = () => {};
  try { await import(`${tc}?t=${Date.now()}`); } finally { console.log = log; }
  return globalThis.__phase0_runs;
}
