/**
 * A figure that cannot travel without its population.
 * Every count over the synthetic set is built with figure(k, n, population)
 * and rendered only through renderFigure, which throws unless the figure
 * carries a population whose parameter digest matches the generator header.
 * Synthetic rates stay REPOSITORY-INTERNAL.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relative, resolve } from 'node:path';

const HERE = new URL('.', import.meta.url).pathname;
const ROOT = new URL('../../', import.meta.url).pathname;
const registerPathOf = (dir) => relative(ROOT, resolve(dir));
const dirOfRegister = (register) => `${resolve(ROOT, register)}/`;
const sha = (s) => createHash('sha256').update(s).digest('hex');

export function parametersFromGeneratorHeader(dir = HERE) {
  const src = readFileSync(`${dir}/generate-determinations.mjs`, 'utf8');
  const start = src.indexOf(' * POPULATION PARAMETERS');
  const end = src.indexOf('\n *\n', start);
  if (start < 0 || end < 0) throw new Error('generate-determinations.mjs: POPULATION PARAMETERS block is not where figure.mjs expects it');
  const text = src.slice(start, end).split('\n').map((l) => l.replace(/^ \* ?/, '')).join('\n').trim();
  return { text, sha256: sha(text) };
}

export function populationOf(det, dir = HERE) {
  const p = det.population;
  if (p === undefined) throw new Error('determinations.json carries no population block; regenerate it');
  const live = parametersFromGeneratorHeader(dir);
  p.$register = registerPathOf(dir);
  if (p.parameters_sha256 !== live.sha256) {
    throw new Error(`determinations.json population is STALE: ${p.parameters_sha256.slice(0, 12)} is not ${live.sha256.slice(0, 12)}; regenerate`);
  }
  return p;
}

export const populationMarker = (pop) =>
  `[population: ${pop.count} synthetic determinations, seed ${pop.seed}, parameters sha256 ${pop.parameters_sha256.slice(0, 12)} from ${pop.$generator_label ?? 'generate-determinations.mjs'} header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history]`;

export function figure(k, n, pop) {
  if (pop === undefined || pop === null) throw new Error(`figure ${k}/${n} built without a population`);
  if (n !== pop.count) throw new Error(`figure ${k}/${n}: the denominator is not the population's count ${pop.count}`);
  return { k, n, pct: (100 * k) / n, population: pop };
}

export function renderFigure(f, { marker = true } = {}) {
  if (f === undefined || f === null || typeof f !== 'object' || !('k' in f) || !('n' in f)) {
    throw new Error('renderFigure: not a figure; build it with figure(k, n, population)');
  }
  const pop = f.population;
  if (pop === undefined || pop === null) throw new Error(`renderFigure: figure ${f.k}/${f.n} carries no population; refusing to render it bare`);
  const live = parametersFromGeneratorHeader(pop.$register ? dirOfRegister(pop.$register) : HERE);
  if (pop.parameters_sha256 !== live.sha256) {
    throw new Error(`renderFigure: figure ${f.k}/${f.n} carries a stale population digest; refusing`);
  }
  const s = `${f.k}/${f.n} (${f.pct.toFixed(1)}%)`;
  return marker ? `${s} ${populationMarker(pop)}` : s;
}

export const populationBlock = (pop) =>
  `POPULATION (the source is the header of generate-determinations.mjs; this copy's sha256 ${pop.parameters_sha256.slice(0, 12)} is checked against it at render time)\n${pop.parameters_text}`;
