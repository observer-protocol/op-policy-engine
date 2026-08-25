#!/usr/bin/env node
/**
 * TALLY WITH BOTH DENOMINATORS (pre-ruled 6). For each comparison (regulation vs layer A; regulation
 * vs layer B) and each clause: divergence over ALL determinations, and over the determinations the
 * clause REACHES under the regulation (its result is not not_applicable, and it is not an
 * undetermined the ungrounded emitter returned before testing applicability). The reach predicate
 * for ungrounded clauses is the applicability expression evaluated on the facts alone; for every
 * other clause, reach = result !== not_applicable. Also the waiting axis per version and the
 * ungrounded split. Writes out/tally.json (with `figures` for the scanner) and prints.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { figure, renderFigure, populationOf, populationBlock, populationMarker } from '../nywc-12nycrr-fee/figure.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const DET = JSON.parse(readFileSync(`${HERE}/determinations.json`, 'utf8')); const det = DET.determinations; const pop = populationOf(DET, HERE); const n = det.length;
const rd = (p) => readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const runs = { regulation: rd(`${HERE}/out/regulation.jsonl`), 'layer-a-wcb': rd(`${HERE}/out/layer-a-wcb.jsonl`), 'layer-b-daisybill': rd(`${HERE}/out/layer-b-daisybill.jsonl`) };
const REG = JSON.parse(readFileSync(`${HERE}/versions/regulation/register.json`, 'utf8'));
const has = (d, path) => path.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), d.facts) !== undefined;
const inKinds = (d, k) => (d.facts.objection?.kinds ?? []).includes(k);
// applicability on the facts alone, for the clauses whose emitter refuses an unsupplied meaning first
const APPLIES = {
  '325-1.25/a/2/amount-fee-schedule-or-agreed': (d, r) => r['325-1.25/a/2/obligation-to-pay']?.result === 'obligated',
  '325-1.25/b/1/format-prescribed': (d) => has(d, 'bill.submitted_at'),
  '325-1.25/c/1/pay-or-notify-45': (d) => has(d, 'bill.received_at'),
  '325-1.25/c/1/legal-objection-format': (d) => inKinds(d, 'legal'), '325-1.25/c/1/valuation-objection-format': (d) => inKinds(d, 'valuation'), '325-1.25/c/1/mtg-objection-format': (d) => inKinds(d, 'mtg'),
  '325-1.25/c/3/no-timely-objection-liable-full': (d) => true,
  '325-1.25/c/6/legally-defective-report': (d) => inKinds(d, 'legal') && d.facts.objection?.legal_ground === 'report_untimely_or_defective',
  '325-1.25/d/1/award-availability': (d) => has(d, 'bill.submitted_at'), '325-1.25/d/4/certifications': (d) => has(d, 'request.submitted_at'),
  '325-1.25/f/1/adjudication-of-legal-mtg': (d) => inKinds(d, 'legal') || inKinds(d, 'mtg'),
};
const ung = new Set(REG.clauses.filter((c) => c.evaluate?.op === 'ungrounded').map((c) => c.id));
const tokenOf = (rec) => (rec === undefined ? undefined : (rec.result ?? rec.no_result ?? rec.refused));
const reaches = (id, i) => { const rec = runs.regulation[i].records[id]; if (rec === undefined || !('result' in rec)) return false; if (rec.result === 'not_applicable') return false; if (ung.has(id) && rec.result === 'undetermined' && !APPLIES[id](det[i], runs.regulation[i].records)) return false; return true; };
const out = { $derived_by: 'tally.mjs', population: pop, denominator: n, versions: {}, comparisons: {} };
const figs = new Set([0, n]);
const pairs = [];   // [k, denominator] over population-level denominators (records, with-result, the split): both scanner rules
const local = [];   // [k, denominator] over a clause's reached count or the clause count: the bare rule only (small denominators collide)
const lines = [`TALLY over ${n} synthetic determinations ${populationMarker(pop)}`, populationBlock(pop)];
for (const [vid, run] of Object.entries(runs)) {
  const waiting = {}, perClause = {}; let records = 0, withResult = 0;
  for (const r of run) for (const [id, rec] of Object.entries(r.records)) { records++; waiting[rec.waiting] = (waiting[rec.waiting] ?? 0) + 1; if (!('result' in rec)) continue; withResult++; (perClause[id] ??= {})[rec.result] = (perClause[id][rec.result] ?? 0) + 1; }
  const withMeaning = run.filter((r) => Object.values(r.records).some((x) => x.waiting === 'meaning')).length;
  out.versions[vid] = { records, with_result: withResult, waiting, meaning_rate_all_records: (waiting.meaning ?? 0) / records, determinations_with_a_record_waiting_on_a_meaning: withMeaning, per_clause: perClause };
  figs.add(withMeaning); for (const t of Object.values(perClause)) for (const k of Object.values(t)) figs.add(k);
  for (const w of Object.values(waiting)) pairs.push([w, records], [w, withResult]); pairs.push([waiting.meaning ?? 0, records], [withResult, records], [withMeaning, n]);
  lines.push(`\n${vid}: ${records} records (${withResult} with a result domain); waiting ${JSON.stringify(waiting)}; meaning-waiting ${waiting.meaning ?? 0} of ${records} (${(100 * (waiting.meaning ?? 0) / records).toFixed(2)}%), determinations with one ${renderFigure(figure(withMeaning, n, pop), { marker: false })}`);
}
// reach, per regulation clause; the ungrounded split with the decomposition
const reach = {}; for (const c of REG.clauses) if (c.evaluate) reach[c.id] = det.map((_, i) => reaches(c.id, i)).filter(Boolean).length;
const split = { decided: 0, undetermined_reached: 0, undetermined_refused_before_applicability: 0, on_supplied_meaning: 0, not_applicable: 0 };
for (const id of ung) for (let i = 0; i < n; i++) { const t = runs.regulation[i].records[id].result; if (t === 'not_applicable') split.not_applicable++; else if (t === 'undetermined') { if (APPLIES[id](det[i], runs.regulation[i].records)) split.undetermined_reached++; else split.undetermined_refused_before_applicability++; } else if (t.endsWith('_on_supplied_meaning')) split.on_supplied_meaning++; else split.decided++; }
out.ungrounded_split = { clauses: [...ung], denominator: ung.size * n, ...split }; for (const v of Object.values(split)) { figs.add(v); pairs.push([v, ung.size * n]); }
lines.push(`\nungrounded split (regulation), ${ung.size} clauses x ${n} = ${ung.size * n} records: ${JSON.stringify(split)}`);
// the two comparisons, both denominators
for (const [vid, label] of [['layer-a-wcb', 'A'], ['layer-b-daisybill', 'B']]) {
  const rows = {};
  const ids = new Set([...Object.keys(runs.regulation[0].records), ...Object.keys(runs[vid][0].records)]);
  for (const id of ids) {
    // WHAT TURNS ON THE DIFFERENCE, in four classes: regulation_waiting (the regulation is undetermined,
    // waiting on a meaning or a fact, and the restatement decides), attribution_only (the same decision,
    // the regulation's attributed to a supplied meaning), applicability (one side says the obligation
    // never arose), decision (both decide, differently).
    const row = { agree: 0, diverge: 0, absent_in_restatement: 0, added_by_restatement: 0, reached: reach[id] ?? 0, diverge_reached: 0, classes: { regulation_waiting: 0, attribution_only: 0, applicability: 0, decision: 0 }, decision_reached: 0, transitions: {} };
    for (let i = 0; i < n; i++) {
      const a = tokenOf(runs.regulation[i].records[id]), b = tokenOf(runs[vid][i].records[id]);
      if (a === undefined) { row.added_by_restatement++; continue; }
      if (b === undefined) { row.absent_in_restatement++; continue; }
      if (a === b) { row.agree++; continue; }
      row.diverge++; const rch = reaches(id, i); if (rch) row.diverge_reached++;
      const strip = (x) => x.replace(/_on_supplied_meaning$/, '');
      const cls = a === 'undetermined' ? 'regulation_waiting' : strip(a) === strip(b) ? 'attribution_only' : (a === 'not_applicable' || b === 'not_applicable') ? 'applicability' : 'decision';
      row.classes[cls]++; if (cls === 'decision' && rch) row.decision_reached++;
      const t = `${a} -> ${b}`; row.transitions[t] = (row.transitions[t] ?? 0) + 1;
    }
    rows[id] = row; for (const k of ['agree', 'diverge', 'absent_in_restatement', 'added_by_restatement', 'reached', 'diverge_reached', 'decision_reached']) figs.add(row[k]); for (const v of Object.values(row.classes)) figs.add(v);
    local.push([row.diverge_reached, row.reached], [row.decision_reached, row.reached]);
  }
  const stated = Object.entries(rows).filter(([, r]) => r.absent_in_restatement === 0 && r.added_by_restatement === 0);
  const diverging = stated.filter(([, r]) => r.diverge > 0), decisionDiverging = stated.filter(([, r]) => r.classes.decision > 0);
  out.comparisons[vid] = { label, clauses_stated_by_restatement: stated.length, clauses_diverging: diverging.length, clauses_diverging_on_a_decision: decisionDiverging.length, rows };
  lines.push(`\nREGULATION vs LAYER ${label} (${vid}) ${populationMarker(pop)}\n  restatement states ${stated.length} of ${REG.clauses.length} regulation clauses; ${diverging.length} of those diverge on at least one determination; ${decisionDiverging.length} on a DECISION (both sides decided, differently)`);
  for (const [id, r] of stated.sort()) {
    const pctAll = ((100 * r.diverge) / n).toFixed(1), pctReach = r.reached ? ((100 * r.diverge_reached) / r.reached).toFixed(1) : 'n/a';
    lines.push(`  ${id.padEnd(50)} diverge ${String(r.diverge).padStart(3)}/${n} (${pctAll}%) over all; ${String(r.diverge_reached).padStart(3)}/${String(r.reached).padStart(3)} (${pctReach}%) over reached; agree ${r.agree}/${n}`);
    if (r.diverge) lines.push(`      of which: regulation waiting ${r.classes.regulation_waiting}, attribution only ${r.classes.attribution_only}, applicability ${r.classes.applicability}, DECISION ${r.classes.decision} (${r.decision_reached}/${r.reached} over reached)`);
    for (const [t, k] of Object.entries(r.transitions).sort((a, b) => b[1] - a[1]).slice(0, 4)) lines.push(`      ${String(k).padStart(4)}  ${t}`);
  }
  const added = Object.entries(rows).filter(([, r]) => r.added_by_restatement > 0).map(([id]) => id);
  if (added.length) lines.push(`  added by the restatement (no regulation clause): ${added.join(', ')}`);
}
out.figures = [...figs].sort((a, b) => a - b);
out.figure_pairs = pairs; out.figure_pairs_local = local;
out.rendered = lines.join('\n');
writeFileSync(`${HERE}/out/tally.json`, JSON.stringify(out, null, 1) + '\n');
console.log(out.rendered);
