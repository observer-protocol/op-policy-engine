/**
 * A FIGURE THAT CANNOT TRAVEL WITHOUT ITS POPULATION.
 *
 * Every count over the synthetic determination set is rendered through `renderFigure`, which
 * THROWS unless the figure carries a population block whose parameter digest equals the digest of
 * the generator's own header, re-read from disk at render time. The generator's header is the one
 * source of the population's parameters; determinations.json carries a derived copy and its
 * digest; a figure carries the same. A stale copy, a missing copy, or a figure built without one
 * cannot be rendered.
 *
 * The rendered form always places the population beside the number:
 *   57/600 (9.5%) [population: 600 synthetic determinations, seed 20260825, parameters sha256 a1b2c3d4e5f6 from generate-determinations.mjs header]
 * and `POPULATION_MARKER` is the bracketed part, which check-figures.mjs looks for beside every
 * occurrence of a figure string in every surface of this directory.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relative, resolve } from 'node:path';
const HERE = new URL('.', import.meta.url).pathname;
// The repository root, so a population block can name its register by a path that is the same in
// every worktree. A derived file whose content depends on where it was generated is not
// reproducible, and the replay check compares digests (2026-08-25).
const ROOT = new URL('../../', import.meta.url).pathname;
const registerPathOf = (dir) => relative(ROOT, resolve(dir));
const dirOfRegister = (register) => `${resolve(ROOT, register)}/`;
const sha = (s) => createHash('sha256').update(s).digest('hex');

/** The population parameters, parsed from the generator's header comment. ONE SOURCE. */
export function parametersFromGeneratorHeader(dir = HERE) {
  const src = readFileSync(`${dir}/generate-determinations.mjs`, 'utf8');
  const start = src.indexOf(' * POPULATION PARAMETERS');
  // the block ends at the first blank comment line after it; any register's generator can carry one
  const end = src.indexOf('\n *\n', start);
  if (start < 0 || end < 0) throw new Error('generate-determinations.mjs: the POPULATION PARAMETERS block is not where figure.mjs expects it');
  const text = src.slice(start, end).split('\n').map((l) => l.replace(/^ \* ?/, '')).join('\n').trim();
  return { text, sha256: sha(text) };
}

/** The population block a determination set and a figure carry. */
export function populationOf(det, dir = HERE) {
  const p = det.population;
  if (p === undefined) throw new Error('determinations.json carries no population block; regenerate it');
  const live = parametersFromGeneratorHeader(dir);
  p.$register = registerPathOf(dir);   // repository-relative, never the worktree's absolute path
  if (p.parameters_sha256 !== live.sha256) throw new Error(`determinations.json population is STALE: its parameters digest ${p.parameters_sha256.slice(0, 12)} is not the generator header's ${live.sha256.slice(0, 12)}; regenerate`);
  return p;
}

/** The marker every figure carries. TWO restrictions ride in it, so neither can be dropped without
 *  dropping the other: the population, and REPOSITORY-INTERNAL, ruled 2026-08-24: no synthetic
 *  defensibility figure leaves op-policy-engine in any form until an equivalent is computed over a
 *  real history. check-figures.mjs matches the whole marker, restriction included. */
export const populationMarker = (pop) => `[population: ${pop.count} synthetic determinations, seed ${pop.seed}, parameters sha256 ${pop.parameters_sha256.slice(0, 12)} from ${pop.$generator_label ?? 'generate-determinations.mjs'} header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]`;

export function figure(k, n, pop) {
  if (pop === undefined || pop === null) throw new Error(`figure ${k}/${n} built without a population; a figure over a synthetic set is not a figure without its population`);
  if (n !== pop.count) throw new Error(`figure ${k}/${n}: the denominator is not the population's count ${pop.count}`);
  return { k, n, pct: (100 * k) / n, population: pop };
}

/** THE ONLY WAY A FIGURE BECOMES TEXT. Refuses a bare one. */
export function renderFigure(f, { marker = true } = {}) {
  // the population block remembers the directory it was checked against; a figure from another
  // register cannot be rendered against this register's header by accident
  if (f === undefined || f === null || typeof f !== 'object' || !('k' in f) || !('n' in f)) throw new Error('renderFigure: not a figure; build it with figure(k, n, population)');
  const pop = f.population;
  if (pop === undefined || pop === null) throw new Error(`renderFigure: figure ${f.k}/${f.n} carries no population; refusing to render it bare`);
  const live = parametersFromGeneratorHeader(pop.$register ? dirOfRegister(pop.$register) : HERE);
  if (pop.parameters_sha256 !== live.sha256) throw new Error(`renderFigure: figure ${f.k}/${f.n} carries a population whose parameters digest is stale against the generator header; refusing`);
  const s = `${f.k}/${f.n} (${f.pct.toFixed(1)}%)`;
  return marker ? `${s} ${populationMarker(pop)}` : s;
}

/** The parameters block, to print ONCE at the top of any surface that carries figures. */
export const populationBlock = (pop) => `POPULATION (the source is the header of generate-determinations.mjs; this copy's sha256 ${pop.parameters_sha256.slice(0, 12)} is checked against it at render time)\n${pop.parameters_text}`;
