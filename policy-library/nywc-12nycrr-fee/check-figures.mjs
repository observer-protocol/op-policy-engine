#!/usr/bin/env node
/**
 * NO SURFACE IN THIS DIRECTORY MAY CARRY A POPULATION FIGURE BARE.
 *
 * The figures are DERIVED, not guessed: every `k/n` and `(p.p%)` string that defensibility.mjs and
 * compare.mjs produced (out/defensibility.json, out/divergence.json) is a figure, and so is the
 * `k of n` phrasing of the same numbers. Every file under this directory except the raw runs is
 * scanned (Markdown, JSON, source): each occurrence must have the population marker
 * `[population: ... sha256 <digest> ...]` in the same section (between two Markdown headings, or
 * within 25 lines for non-Markdown), and the digest in the marker must equal the LIVE digest of the
 * generator's header. A bare figure, or a figure beside a stale marker, is a failure naming the
 * file and line. Exit 1 on any failure.
 *
 * Also run by report.mjs at the end of rendering, so a bare figure fails the render.
 *
 *   node check-figures.mjs [--demo <extra-file>]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { parametersFromGeneratorHeader } from './figure.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const rd = (f) => JSON.parse(readFileSync(`${HERE}/${f}`, 'utf8'));
const df = rd('out/defensibility.json'), dv = rd('out/divergence.json');
const live = parametersFromGeneratorHeader().sha256.slice(0, 12);
const n = df.denominator;

// ── the figure strings, derived from the reports ────────────────────────────────────────────────
const counts = new Set([df.no_applied_bound, df.cites_version_not_in_force.union, df.cites_version_not_in_force.cites_other_register_version, df.cites_version_not_in_force.edition_not_in_force_on_dos, df.cites_version_not_in_force.both, df.dos_undetermined, df.no_edition_cited, dv.determinationsDiverging, dv.determinationsDivergingOnToken]);
for (const c of Object.values(dv.byClause)) { if (c.diverge) counts.add(c.diverge); if (c.absent_right) counts.add(c.absent_right); if (c.absent_left) counts.add(c.absent_left); }
const patterns = [];
for (const k of counts) {
  patterns.push(new RegExp(`(?<![\\d.])${k}/${n}(?!\\d)`));
  patterns.push(new RegExp(`(?<![\\d.])${k} of ${n}(?!\\d)`));
  patterns.push(new RegExp(`\\(${((100 * k) / n).toFixed(1)}%\\)`));
}
const MARKER = /\[population: \d+ synthetic determinations, seed \d+, parameters sha256 ([0-9a-f]{12}) from generate-determinations\.mjs header\]/;

// ── the surfaces ────────────────────────────────────────────────────────────────────────────────
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = `${d}/${f}`; if (statSync(p).isDirectory()) { if (f !== 'source' && f !== 'versions') walk(p); } else if (!p.endsWith('.jsonl') && !p.endsWith('.pdf') && !p.endsWith('.txt')) files.push(p); } };
walk(HERE);
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
    if (!patterns.some((re) => re.test(lines[i]))) continue;
    if (path.endsWith('check-figures.mjs') || path.endsWith('figure.mjs')) continue;   // the instruments name no figure
    occurrences++;
    // the section: from the previous heading to the next, or +-25 lines
    let lo = i, hi = i;
    if (isMd) { while (lo > 0 && !headingAt[lo]) lo--; hi = i + 1; while (hi < lines.length && !headingAt[hi]) hi++; }
    else { lo = Math.max(0, i - 25); hi = Math.min(lines.length, i + 26); }
    const section = lines.slice(lo, hi).join('\n');
    const m = section.match(MARKER);
    const rel = path.replace(HERE, '');
    if (!m) failures.push(`${rel}:${i + 1}: figure rendered BARE, no population marker in its section: ${lines[i].trim().slice(0, 120)}`);
    else if (m[1] !== live) failures.push(`${rel}:${i + 1}: figure beside a STALE population marker (${m[1]}; live ${live}): ${lines[i].trim().slice(0, 120)}`);
  }
}
console.log(`check-figures: ${patterns.length / 3} figure values over ${n}, ${occurrences} occurrence(s) scanned in ${files.length} file(s), live parameters sha256 ${live}`);
for (const f of failures) console.log(`  FAIL  ${f}`);
console.log(failures.length ? `RESULT: ${failures.length} bare or stale figure(s). [exit 1]` : 'RESULT: every figure carries its population. [exit 0]');
process.exit(failures.length ? 1 : 0);
