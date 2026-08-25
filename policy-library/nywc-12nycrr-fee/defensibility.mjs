#!/usr/bin/env node
/**
 * THE DEFENSIBILITY FIGURE over the synthetic set, computed AFTER the fact from the determinations
 * and the in-force replay, never from anything the generator intended.
 *
 * Two counts, one denominator (the determination count):
 *   NO APPLIED BOUND        the determination carries no applied_bound.amount (and no code): it
 *                           applied no scheduled amount it can be checked against.
 *   CITES A VERSION NOT IN FORCE   either of two independent facts about the determination:
 *     (a) its `cites.register_version_id` is not the in-force register version;
 *     (b) the in-force replay's date-of-service clause for its service kind says the edition it
 *         cites is not the one in force on the date of service (`cited_edition_not_the_one_in_force`
 *         or `dos_precedes_edition_effect`). (b) is read off the replay, so it inherits every
 *         limit the replay states: a PT/OT determination whose NY-A1 resolution is unsupplied is
 *         `undetermined` on both date-of-service clauses and is counted under neither.
 *   The union is reported with both parts, and the overlap.
 *
 *   node defensibility.mjs out/in-force.jsonl
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { figure, renderFigure, populationBlock, populationOf } from './figure.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const DET = JSON.parse(readFileSync(`${HERE}/determinations.json`, 'utf8'));
const det = DET.determinations;
const pop = populationOf(DET);
const run = readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const IN_FORCE = 'in-force';
const DOS_CLAUSES = ['12nycrr/329-1.1/schedule-in-effect-on-dos', '12nycrr/329-4.1/a/acupuncture-dos', '12nycrr/329-4.1/b/pt-ot-dos', '12nycrr/333.1/psychology-dos', '12nycrr/343.1/podiatry-dos', '12nycrr/348.1/chiropractic-dos'];
const NOT_IN_FORCE_TOKENS = new Set(['cited_edition_not_the_one_in_force', 'dos_precedes_edition_effect']);

let noBound = 0, citesOtherVersion = 0, editionNotInForce = 0, union = 0, both = 0, dosUndetermined = 0, noEdition = 0;
const rows = [];
for (let i = 0; i < det.length; i++) {
  const d = det[i], r = run[i];
  if (d.id !== r.id) throw new Error(`order mismatch at ${i}`);
  const a = d.facts.applied_bound?.amount === undefined && d.facts.applied_bound?.code === undefined;
  const v = d.cites.register_version_id !== IN_FORCE;
  const dosTokens = DOS_CLAUSES.map((c) => r.records[c]?.result).filter((t) => t !== undefined && t !== 'not_applicable');
  const e = dosTokens.some((t) => NOT_IN_FORCE_TOKENS.has(t));
  if (dosTokens.length && dosTokens.every((t) => t === 'undetermined')) dosUndetermined++;
  if (dosTokens.some((t) => t === 'no_edition_cited')) noEdition++;
  if (a) noBound++;
  if (v) citesOtherVersion++;
  if (e) editionNotInForce++;
  if (v || e) union++;
  if (v && e) both++;
  rows.push({ id: d.id, no_applied_bound: a, cites_register_version: d.cites.register_version_id, edition_not_in_force_on_dos: e, dos_tokens: dosTokens });
}
const n = det.length;
const pct = (k) => renderFigure(figure(k, n, pop));   // REFUSES without the population; the marker rides with every figure
const text = [
  `DEFENSIBILITY over ${n} synthetic determinations (denominator ${n}; in-force register, replay ${process.argv[2].split('/').slice(-1)[0]})`,
  populationBlock(pop),
  `  carry NO APPLIED BOUND:                         ${pct(noBound)}`,
  `  CITE A VERSION NOT IN FORCE (union):            ${pct(union)}`,
  `    (a) cite a register version other than in-force: ${pct(citesOtherVersion)}`,
  `    (b) cite a schedule edition not in force on DOS:  ${pct(editionNotInForce)}   [read off the replay's date-of-service clauses]`,
  `    both (a) and (b):                                 ${pct(both)}`,
  `  date-of-service clauses undetermined (NY-A1/NY-A2 unresolved, or DOS unsupplied): ${pct(dosUndetermined)}  [counted under neither]`,
  `  no edition cited at all:                         ${pct(noEdition)}  [counted under neither; it is a missing citation, not a wrong one]`,
].join('\n');
console.log(text);
writeFileSync(`${HERE}/out/defensibility.json`, JSON.stringify({ $derived_by: 'defensibility.mjs', population: pop, denominator: n, no_applied_bound: noBound, cites_version_not_in_force: { union, cites_other_register_version: citesOtherVersion, edition_not_in_force_on_dos: editionNotInForce, both }, dos_undetermined: dosUndetermined, no_edition_cited: noEdition, rendered: text, rows }, null, 1) + '\n');
