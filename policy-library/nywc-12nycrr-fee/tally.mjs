#!/usr/bin/env node
/**
 * PER-CLAUSE TALLIES AND THE WAITING AXIS over both replays, written to out/tally.json so that
 * every count over the population a document quotes exists in a derived report and
 * check-figures.mjs can vouch for it. Includes the ungrounded split (amendment 2026-08-24):
 * decided / undetermined / _on_supplied_meaning / not_applicable per clause resting on an
 * ungrounded term, and the decomposition of the undetermined into records where the clause would
 * have applied and records where the interpreter's ungrounded emitter returned undetermined before
 * testing applicability (its ruled order: an unsupplied meaning is refused first).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { figure, renderFigure, populationOf, populationBlock } from './figure.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const DET = JSON.parse(readFileSync(`${HERE}/determinations.json`, 'utf8'));
const det = DET.determinations, pop = populationOf(DET), n = det.length;
const rd = (p) => readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const out = { $derived_by: 'tally.mjs', population: pop, denominator: n, versions: {} };
const WOULD_APPLY = {
  '12nycrr/329-1.3/d/1/regional-fee': (d) => d.facts.applied_bound.code === '87635',
  '12nycrr/329-1.3/d/2/billable-basis': (d) => d.facts.applied_bound.code === '87635' && d.facts.covid?.claim_basis !== undefined,
  '12nycrr/329-1.3/c/6/scope-not-expanded': (d) => ['pta', 'ota'].includes(d.facts.provider.rendering_class),
  '12nycrr/329-1.3/c/supervision': (d) => ['pta', 'ota'].includes(d.facts.provider.rendering_class),
  '12nycrr/329-1.3/e/supervision': (d) => ['resident', 'fellow'].includes(d.facts.provider.rendering_class),
  '12nycrr/329-1.2/unit-fee-on-transfer': (d) => d.facts.proration?.transferred === true,
  '12nycrr/329-1.2/agreed-proration-separate-bills': (d) => d.facts.proration?.transferred === true && d.facts.proration?.physicians_agreed === true,
  '12nycrr/329-1.2/death-no-proration': (d) => d.facts.proration?.terminated_by === 'death',
};
const lines = [`TALLY over ${n} synthetic determinations`, populationBlock(pop)];
for (const vid of ['in-force', 'proposed-2026-01-14']) {
  const run = rd(`${HERE}/out/${vid}.jsonl`);
  const reg = JSON.parse(readFileSync(`${HERE}/versions/${vid}/register.json`, 'utf8'));
  const ung = reg.clauses.filter((c) => c.evaluate?.op === 'ungrounded').map((c) => c.id);
  const perClause = {}, waiting = {}; let records = 0, withResult = 0;
  for (const r of run) for (const [id, rec] of Object.entries(r.records)) {
    records++; waiting[rec.waiting] = (waiting[rec.waiting] ?? 0) + 1;
    if (!('result' in rec)) continue;
    withResult++;
    (perClause[id] ??= {})[rec.result] = (perClause[id][rec.result] ?? 0) + 1;
  }
  const split = { decided: 0, undetermined: 0, on_supplied_meaning: 0, not_applicable: 0 };
  const ungrounded = {};
  let undApplies = 0, undNever = 0;
  for (const id of ung) {
    const s = { decided: 0, undetermined: 0, on_supplied_meaning: 0, not_applicable: 0 };
    for (const [k, v] of Object.entries(perClause[id])) {
      if (k === 'undetermined') s.undetermined += v; else if (k === 'not_applicable') s.not_applicable += v; else if (k.endsWith('_on_supplied_meaning')) s.on_supplied_meaning += v; else s.decided += v;
    }
    for (const k of Object.keys(split)) split[k] += s[k];
    ungrounded[id] = { ...s, tokens: perClause[id] };
    for (let i = 0; i < run.length; i++) if (run[i].records[id].result === 'undetermined') { if (WOULD_APPLY[id](det[i])) undApplies++; else undNever++; }
  }
  const withMeaning = run.filter((r) => Object.values(r.records).some((x) => x.waiting === 'meaning')).length;
  const neverReached = Object.entries(perClause).filter(([, t]) => Object.keys(t).every((k) => k === 'not_applicable' || k === 'undetermined')).map(([id]) => id);
  out.versions[vid] = { records, with_result: withResult, waiting, meaning_rate_all_records: (waiting.meaning ?? 0) / records, meaning_rate_with_result: (waiting.meaning ?? 0) / withResult,
    ungrounded_clauses: ung, ungrounded_split: { ...split, denominator: ung.length * n }, undetermined_decomposition: { would_have_applied: undApplies, applicability_never_tested: undNever },
    determinations_with_a_record_waiting_on_a_meaning: withMeaning, clauses_never_reaching_a_decided_token: neverReached, per_clause: perClause };
  const F = (k) => renderFigure(figure(k, n, pop));
  lines.push(`\n${vid}: ${records} records (${withResult} with a result domain); waiting ${JSON.stringify(waiting)}`);
  lines.push(`  waiting on a meaning: ${waiting.meaning ?? 0} of ${records} records (${(100 * (waiting.meaning ?? 0) / records).toFixed(2)}%); of the ${withResult} with a result domain, ${(100 * (waiting.meaning ?? 0) / withResult).toFixed(2)}%`);
  lines.push(`  determinations with at least one record waiting on a meaning: ${F(withMeaning)}`);
  lines.push(`  ungrounded split over ${ung.length} clauses x ${n} = ${ung.length * n} records: ${JSON.stringify(split)}`);
  lines.push(`  of the undetermined: ${undApplies} on records where the clause would have applied; ${undNever} where the emitter refused the unsupplied meaning before testing applicability`);
  for (const id of ung) lines.push(`    ${id.padEnd(50)} ${JSON.stringify(ungrounded[id].tokens)}`);
  lines.push(`  clauses never reaching a decided token: ${neverReached.length ? neverReached.join(', ') : 'none'}`);
}
const figs = new Set();
for (const v of Object.values(out.versions)) { figs.add(v.determinations_with_a_record_waiting_on_a_meaning); for (const t of Object.values(v.per_clause)) for (const k of Object.values(t)) figs.add(k); for (const k of ['decided', 'undetermined', 'on_supplied_meaning', 'not_applicable']) figs.add(v.ungrounded_split[k]); figs.add(v.undetermined_decomposition.would_have_applied); figs.add(v.undetermined_decomposition.applicability_never_tested); }
out.figures = [...figs].sort((a, b) => a - b);
// [k, denominator] for every figure rendered over a denominator other than n; the scanner checks these too
const pairs = [];
for (const v of Object.values(out.versions)) {
  for (const w of Object.values(v.waiting)) pairs.push([w, v.records], [w, v.with_result]);
  pairs.push([v.with_result, v.records], [v.determinations_with_a_record_waiting_on_a_meaning, n]);
  const D = v.ungrounded_split.denominator;
  for (const k of ['decided', 'undetermined', 'on_supplied_meaning', 'not_applicable']) pairs.push([v.ungrounded_split[k], D]);
  pairs.push([v.undetermined_decomposition.would_have_applied, D], [v.undetermined_decomposition.applicability_never_tested, D]);
}
out.figure_pairs = pairs;
out.rendered = lines.join('\n');
writeFileSync(`${HERE}/out/tally.json`, JSON.stringify(out, null, 1) + '\n');
console.log(out.rendered);
