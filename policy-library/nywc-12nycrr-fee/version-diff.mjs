#!/usr/bin/env node
/**
 * WHICH CLAUSES DIFFER BETWEEN THE TWO REGISTER VERSIONS, AND HOW. Derived from the projected
 * registers, never listed by hand: a clause differs if its text or operative weight differs, if
 * its evaluation reads a binding whose definition differs between versions, or if one version
 * does not carry it. Prints the table and writes out/version-diff.json.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { bindingsRead } from './project-versions.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const A = 'in-force', B = 'proposed-2026-01-14';
const ra = read(`${HERE}/versions/${A}/register.json`), rb = read(`${HERE}/versions/${B}/register.json`);
const ev = read(`${HERE}/evaluation.json`);
const changedBindings = new Set(Object.keys(ev.bindings_by_version[A]).filter((k) => JSON.stringify(ev.bindings_by_version[A][k]) !== JSON.stringify(ev.bindings_by_version[B][k])));
const byId = (r) => Object.fromEntries(r.clauses.map((c) => [c.id, c]));
const ca = byId(ra), cb = byId(rb);
const rows = [];
for (const c of ra.clauses) {
  const p = cb[c.id];
  if (p === undefined) { rows.push({ id: c.id, disposition: c.disposition, change: 'absent_in_proposed', detail: 'the proposal\'s restatement does not carry it (NY-A7)' }); continue; }
  const how = [];
  if (c.text !== p.text) how.push('text');
  if (c.operative_weight !== p.operative_weight) how.push('operative_weight');
  if (c.evaluate !== undefined) {
    const reads = [...bindingsRead(c.evaluate, ra.bindings)].filter((b) => changedBindings.has(b)).sort();
    if (reads.length) how.push(`evaluation_data:${reads.join('+')}`);
  }
  rows.push({ id: c.id, disposition: c.disposition, change: how.length ? 'changed' : 'unchanged', detail: how.join(', ') || null });
}
for (const c of rb.clauses) if (ca[c.id] === undefined) rows.push({ id: c.id, disposition: c.disposition, change: 'added_in_proposed', detail: null });
const tally = {};
for (const r of rows) tally[r.change] = (tally[r.change] ?? 0) + 1;
console.log(`VERSION DIFF  ${A} (${ra.clauses.length} clauses)  ->  ${B} (${rb.clauses.length} clauses)`);
console.log(`per-version bindings whose definition differs: ${[...changedBindings].sort().join(', ')}`);
console.log(JSON.stringify(tally));
for (const r of rows.filter((r) => r.change !== 'unchanged')) console.log(`  ${r.change.padEnd(20)} ${r.disposition.padEnd(26)} ${r.id}${r.detail ? '  [' + r.detail + ']' : ''}`);
mkdirSync(`${HERE}/out`, { recursive: true });
writeFileSync(`${HERE}/out/version-diff.json`, JSON.stringify({ $derived_by: 'version-diff.mjs', from: A, to: B, changed_bindings: [...changedBindings].sort(), tally, rows }, null, 1) + '\n');
