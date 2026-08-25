#!/usr/bin/env node
/**
 * THE COMPARATOR. Two replay outputs over the SAME determination set, compared clause by clause.
 * A determination is one record per clause per run; the token compared is the record's result,
 * or its no-result marker for the dispositions that have none. A clause present in one run and
 * absent from the other is a divergence of its own category, attached to that clause.
 *
 * EVERY DIVERGENCE IS ATTACHED TO A CLAUSE BY CONSTRUCTION. There is no record-level "differs"
 * that does not name the clause it differs on.
 *
 * Exit status: 0 when no determination diverges on any clause, 1 otherwise. That status is what
 * the harness self-check trusts, so it must be shown to go nonzero on a known mutation before any
 * divergence figure from this file is read as evidence.
 *
 *   node compare.mjs <left.jsonl> <right.jsonl> [--json <report.json>] [--label-left X --label-right Y]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const tokenOf = (rec) => (rec === undefined ? undefined : (rec.result ?? rec.no_result ?? rec.refused));

export function compareRuns(left, right, labels = { left: 'left', right: 'right' }) {
  if (left.length !== right.length) throw new Error(`the two runs cover different determination counts: ${left.length} vs ${right.length}`);
  const byClause = {};
  const perDetermination = [];
  const clauseIds = new Set();
  for (const r of left) for (const id of Object.keys(r.records)) clauseIds.add(id);
  for (const r of right) for (const id of Object.keys(r.records)) clauseIds.add(id);
  for (const id of clauseIds) byClause[id] = { agree: 0, diverge: 0, absent_left: 0, absent_right: 0, transitions: {} };
  for (let i = 0; i < left.length; i++) {
    const L = left[i], R = right[i];
    if (L.id !== R.id) throw new Error(`determination order differs at ${i}: ${L.id} vs ${R.id}`);
    const diverging = [];
    for (const id of clauseIds) {
      const a = tokenOf(L.records[id]), b = tokenOf(R.records[id]);
      const c = byClause[id];
      if (a === undefined && b === undefined) continue;
      if (a === undefined) { c.absent_left++; diverging.push({ clause: id, kind: 'absent_left' }); continue; }
      if (b === undefined) { c.absent_right++; diverging.push({ clause: id, kind: 'absent_right' }); continue; }
      if (a === b) { c.agree++; continue; }
      c.diverge++;
      const t = `${a} -> ${b}`;
      c.transitions[t] = (c.transitions[t] ?? 0) + 1;
      diverging.push({ clause: id, kind: 'token', left: a, right: b });
    }
    perDetermination.push({ id: L.id, diverging });
  }
  const n = left.length;
  const determinationsDiverging = perDetermination.filter((d) => d.diverging.length > 0).length;
  const determinationsDivergingOnToken = perDetermination.filter((d) => d.diverging.some((x) => x.kind === 'token')).length;
  return { labels, denominator: n, clauses: clauseIds.size, byClause, perDetermination, determinationsDiverging, determinationsDivergingOnToken };
}

export function render(rep) {
  const out = [];
  const { labels: { left, right }, denominator: n } = rep;
  out.push(`COMPARE  ${left}  vs  ${right}`);
  out.push(`denominator: ${n} determinations; ${rep.clauses} clauses in the union of both runs`);
  const rows = Object.entries(rep.byClause).sort();
  const changed = rows.filter(([, c]) => c.diverge || c.absent_left || c.absent_right);
  out.push(`clauses on which at least one determination diverges: ${changed.length} of ${rep.clauses}`);
  out.push(`determinations diverging on at least one clause: ${rep.determinationsDiverging} of ${n} (on a result token: ${rep.determinationsDivergingOnToken} of ${n}; the rest only on clause absence)`);
  for (const [id, c] of changed) {
    const parts = [];
    if (c.diverge) parts.push(`diverge ${c.diverge}/${n}`);
    if (c.absent_left) parts.push(`absent in ${left} ${c.absent_left}/${n}`);
    if (c.absent_right) parts.push(`absent in ${right} ${c.absent_right}/${n}`);
    parts.push(`agree ${c.agree}/${n}`);
    out.push(`  ${id.padEnd(52)} ${parts.join('; ')}`);
    for (const [t, k] of Object.entries(c.transitions).sort((a, b) => b[1] - a[1])) out.push(`      ${String(k).padStart(4)}  ${t}`);
  }
  out.push(changed.length === 0 ? 'RESULT: IDENTICAL on every clause of every determination. [exit 0]' : `RESULT: DIVERGENT. [exit 1]`);
  return out.join('\n');
}

const readJsonl = (p) => readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const [lp, rp] = args.filter((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--')));
  const rep = compareRuns(readJsonl(lp), readJsonl(rp), { left: opt('--label-left') ?? lp, right: opt('--label-right') ?? rp });
  const text = render(rep);
  console.log(text);
  if (opt('--json')) writeFileSync(opt('--json'), JSON.stringify({ $derived_by: 'compare.mjs', ...rep, perDetermination: undefined, rendered: text }, null, 1) + '\n');
  const anyDiverge = Object.values(rep.byClause).some((c) => c.diverge || c.absent_left || c.absent_right);
  process.exit(anyDiverge ? 1 : 0);
}
