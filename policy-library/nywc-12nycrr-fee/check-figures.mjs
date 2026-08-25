#!/usr/bin/env node
/**
 * NO SURFACE IN THIS DIRECTORY MAY CARRY A POPULATION FIGURE BARE.
 *
 * The figures are DERIVED, not guessed: every `k/n` and `(p.p%)` string that defensibility.mjs and
 * compare.mjs produced (out/defensibility.json, out/divergence.json) is a figure, and so is the
 * `k of n` phrasing of the same numbers. Every file under this directory except the raw runs is
 * scanned (Markdown, JSON, source): each occurrence must have the population marker
 * `[population: ... sha256 <digest> ...; REPOSITORY-INTERNAL: ...]` (the restriction is part of the marker) in the same section (between two Markdown headings, or
 * within 25 lines for non-Markdown), and the digest in the marker must equal the LIVE digest of the
 * generator's header. A bare figure, or a figure beside a stale marker, is a failure naming the
 * file and line. Exit 1 on any failure.
 *
 * Also run by report.mjs at the end of rendering, so a bare figure fails the render.
 *
 *   node check-figures.mjs [--dir <register directory>] [--demo <extra-file>]
 *   Figure sets come from `figures` / `headline_figures` arrays in <dir>/out/*.json, and `figure_pairs`
 *   ([k, denominator]) for figures over a population-level denominator other than the determination
 *   count (records, records with a result domain, the ungrounded split), which carry both rules; and
 *   `figure_pairs_local` for figures over a clause's reached count or the clause count, which carry
 *   the bare rule only, because small denominators collide (60 is one clause's reach and another
 *   register's clause count). Added 2026-08-25:
 *   before that the scanner matched figures over the determination count only, and a typed
 *   "3,470 (9.80%)" over 35,400 records stood beside a derived 3,979 unnoticed.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { parametersFromGeneratorHeader } from './figure.mjs';
const SELF = new URL('.', import.meta.url).pathname;
const argDir = process.argv.indexOf('--dir') >= 0 ? process.argv[process.argv.indexOf('--dir') + 1] : null;
const HERE = (argDir ? (argDir.endsWith('/') ? argDir : argDir + '/') : SELF);
const rd = (f) => JSON.parse(readFileSync(`${HERE}/${f}`, 'utf8'));
const live = parametersFromGeneratorHeader(HERE).sha256.slice(0, 12);

// ── the figure strings, derived from the reports: every out/*.json carrying a `figures` array (all
//    counts over the denominator it rendered) and a `headline_figures` array (the ones whose bare
//    percentage is also matched). Nothing is typed here.
const counts = new Set([0]), headline = new Set();
const pairs = new Map();   // denominator -> Set(k): population-level denominators, both rules
const local = new Map();   // denominator -> Set(k): per-clause and clause-count denominators, the bare rule only
const addTo = (m) => (k, d) => { if (!m.has(d)) m.set(d, new Set()); m.get(d).add(k); };
const addPair = addTo(pairs), addLocal = addTo(local);
let n = null;
for (const f of readdirSync(`${HERE}/out`)) {
  if (!f.endsWith('.json')) continue;
  const j = rd(`out/${f}`);
  if (j.denominator !== undefined) { if (n !== null && n !== j.denominator) throw new Error(`out/${f}: denominator ${j.denominator} disagrees with ${n}`); n = j.denominator; }
  for (const k of j.figures ?? []) counts.add(k);
  for (const k of j.headline_figures ?? []) { counts.add(k); headline.add(k); }
  for (const [k, d] of j.figure_pairs ?? []) addPair(k, d);
  for (const [k, d] of j.figure_pairs_local ?? []) addLocal(k, d);
}
if (n === null) throw new Error('no report under out/ declares a denominator');
counts.add(n);
for (const k of counts) addPair(k, n);
// a number as written: 3979 or 3,979
const alt = (x) => { const s = String(x), c = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return s === c ? s : `(?:${s}|${c})`; };
const patterns = [];
// every figure over every declared denominator, in the k/n and "k of n" forms
for (const m of [pairs, local]) for (const [d, ks] of m) if (d !== n) for (const k of ks) { patterns.push(new RegExp(`(?<![\\d.,])${alt(k)}/${alt(d)}(?![\\d,])`)); patterns.push(new RegExp(`(?<![\\d.,])${alt(k)} of ${alt(d)}(?![\\d,])`)); }
// the "count (p.pp%)" form: a count followed by its own percentage is a figure whatever its denominator
const COUNT_PCT = /(?<![\w.,]|\/\s*|of )(\d[\d,]*) \((\d+\.\d+)%\)/g;
const producedAs = (k, pct) => { for (const m of [pairs, local]) for (const [d, ks] of m) if (ks.has(k) && ((100 * k) / d).toFixed(pct.split('.')[1].length) === pct) return true; return false; };
for (const k of counts) {
  patterns.push(new RegExp(`(?<![\\d.])${k}/${n}(?!\\d)`));
  patterns.push(new RegExp(`(?<![\\d.])${k} of ${n}(?!\\d)`));
}
// A percentage on its own is the figure that travels furthest. Matched only for the HEADLINE
// figures, because per-clause percentages collide with unrelated numbers (Molina's 2.8% matched
// 17/600 on the first run).
for (const k of headline) patterns.push(new RegExp(`(?<![\\d.])${((100 * k) / n).toFixed(1)}%`));
const MARKER = /\[population: \d+ synthetic determinations, seed \d+, parameters sha256 ([0-9a-f]{12}) from (?:[\w./-]+\/)?generate-determinations\.mjs header; REPOSITORY-INTERNAL: does not leave op-policy-engine in any form until an equivalent is computed over a real history\]/;

// ── the surfaces ────────────────────────────────────────────────────────────────────────────────
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = `${d}/${f}`; if (statSync(p).isDirectory()) { if (f !== 'source' && f !== 'versions') walk(p); } else if (!p.endsWith('.jsonl') && !p.endsWith('.pdf') && !p.endsWith('.txt')) files.push(p); } };
walk(HERE.replace(/\/$/, ''));
const demo = process.argv.indexOf('--demo') >= 0 ? process.argv[process.argv.indexOf('--demo') + 1] : null;
if (demo && !files.includes(demo)) files.push(demo);

const failures = [];
let occurrences = 0;
for (const path of files) {
  const lines = readFileSync(path, 'utf8').split('\n');
  const isMd = path.endsWith('.md');
  // section boundaries: heading lines for Markdown
  const headingAt = lines.map((l) => (isMd && /^#{1,6} /.test(l)));
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(>\s*)?RETIRED:/.test(lines[i])) continue;   // a figure named to retire it is not a figure rendered
    if (!patterns.some((re) => re.test(lines[i]))) continue;
    if (path.endsWith('check-figures.mjs') || path.endsWith('figure.mjs')) continue;
    occurrences++;
    // the section: from the previous heading to the next, or +-25 lines
    let lo = i, hi = i;
    if (isMd) { while (lo > 0 && !headingAt[lo]) lo--; hi = i + 1; while (hi < lines.length && !headingAt[hi]) hi++; }
    else { lo = Math.max(0, i - 25); hi = Math.min(lines.length, i + 26); }
    const section = lines.slice(lo, hi).join('\n');
    const m = section.match(MARKER);
    const rel = path.replace(HERE.replace(/\/$/, ''), '');
    if (!m) failures.push(`${rel}:${i + 1}: figure rendered BARE, no population marker in its section: ${lines[i].trim().slice(0, 120)}`);
    else if (m[1] !== live) failures.push(`${rel}:${i + 1}: figure beside a STALE population marker (${m[1]}; live ${live}): ${lines[i].trim().slice(0, 120)}`);
  }
  // SECOND RULE: inside a marked section, a count over ANY declared denominator that is NOT one the
  // current reports produced is a figure from a previous run, left standing beside a mechanism that
  // no longer produces it. A stale number under a fresh marker is worse than a bare one.
  const rel2 = path.replace(HERE.replace(/\/$/, ''), '');
  for (let i = 0; i < lines.length; i++) {
    if (path.endsWith('check-figures.mjs') || path.endsWith('figure.mjs')) continue;
    if (/^\s*(>\s*)?RETIRED:/.test(lines[i])) continue;
    let lo = i; if (isMd) { while (lo > 0 && !headingAt[lo]) lo--; }
    const section = lines.slice(isMd ? lo : Math.max(0, i - 25), isMd ? i + 1 : i + 1).join('\n');
    for (const [d, ks] of pairs) {
      for (const mm of lines[i].matchAll(new RegExp(`(?<![\\d.,])(\\d[\\d,]*)(?:/| of )${alt(d)}(?![\\d,])`, 'g'))) {
        const k = Number(mm[1].replace(/,/g, ''));
        if (ks.has(k)) continue;
        if (MARKER.test(section)) failures.push(`${rel2}:${i + 1}: STALE figure ${k}/${d}: no current report produces it, yet it sits under a live marker: ${lines[i].trim().slice(0, 120)}`);
      }
    }
    // THIRD RULE: a count with its own percentage beside it, "3,470 (9.80%)", is a figure in the
    // estate's own rendering; if no report produced that count at that percentage over any declared
    // denominator, it is stale or typed, marker or no marker.
    for (const mm of lines[i].matchAll(COUNT_PCT)) {
      const k = Number(mm[1].replace(/,/g, ''));
      if (producedAs(k, mm[2])) continue;
      failures.push(`${rel2}:${i + 1}: STALE or TYPED figure ${mm[1]} (${mm[2]}%): no current report produces that count at that percentage over any declared denominator: ${lines[i].trim().slice(0, 120)}`);
    }
  }
}
console.log(`check-figures: ${counts.size} figure values over ${n}, ${pairs.size - 1} other population denominator(s) under both rules, ${local.size} local denominator(s) under the bare rule only; ${occurrences} occurrence(s) scanned in ${files.length} file(s), live parameters sha256 ${live}`);
// What a green does NOT cover, printed every run (recorded 2026-08-25, open, not fixed): the
// patterns are k/n, "k of n", and the headline percentages to one decimal, inside this directory.
console.log('LIMITS: not covered: a percentage written without its decimal; a figure spelled in words; any file outside this directory (the scan is per register directory, not per repository); staleness of a figure over a per-clause or clause-count denominator (bare rule only, because small denominators collide).');
for (const f of failures) console.log(`  FAIL  ${f}`);
console.log(failures.length ? `RESULT: ${failures.length} bare or stale figure(s). [exit 1]` : 'RESULT: every figure carries its population. [exit 0]');
process.exit(failures.length ? 1 : 0);
