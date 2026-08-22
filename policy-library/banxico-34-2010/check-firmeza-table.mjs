#!/usr/bin/env node
/**
 * Does the firmeza decision table cover the cross-product of its input domains?
 *
 * ─── IT DOES NOT ASK THE TABLE WHAT IT COVERS ───────────────────────────────────────────────────
 *
 * `cross_product: 12` and `$gaps: NONE` are the table's own statements about itself and are checked
 * by nothing. This derives the input domains from elsewhere and then EXECUTES the evaluator once per
 * combination. A combination with no row throws inside `evaluate`, so coverage is established by the
 * evaluator refusing to run, not by a set comparison against the very list under test.
 *
 * This is the property the if/else chain could not have had. A chain's `else` arm answers every
 * combination nobody thought of, so there is nothing for a check to catch.
 */
import { readFileSync } from 'node:fs';
import { evaluate } from './evaluate.mjs';

const read = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
const TABLE = read('./clauses.json').clauses.find((c) => c.id === '34-2010/3.6/p7/firmeza').decision_table;

let pass = 0, fail = 0;
const a = (n, ok, d = '') => { if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n}${d ? '  <<< ' + d : ''}`); } };

const base = () => ({
  notice: { type: 'reclamacion_cargo_no_reconocido', reference: 'R', received_at: '2026-05-04T09:12:00Z' },
  operation: { executed_abroad: false, occurred_at: '2026-04-28T19:41:00Z', acquirer_name: 'A', merchant_name: 'M',
               auth_factors: ['2.6.a.i_knowledge', '2.6.a.ii_device_or_chip'] },
  dictamen: { made_available_at: '2026-06-02T11:00:00Z', channel: 'c', signatory_id: 's',
              language_is_plain: 'affirmed', evidence_of_factors_present: true, verification_method_stated: true,
              device_address: { physical_address: 'x', ip_address: null } },
  cardholder: { channel_election: 'c' }, issuer: { authorised_signatories: ['s'], holds_device_address: true },
  account: { charges_posted: [] }, charge: { derived_from_2_6_a_operation: 'demonstrated' },
  expediente: { requested: false, delivered_at: null },
});

// ── input domain 1: DERIVED BY RUNNING, then cross-checked against a different declaration ───────
const PROBES = {
  undetermined: [(f) => f, {}],
  within:       [(f) => f, { A1_dias_unit: 'calendar_days' }],
  exceeded:     [(f) => { f.dictamen.made_available_at = '2026-11-20T11:00:00Z'; return f; }, { A1_dias_unit: 'calendar_days' }],
  no_end_event: [(f) => { f.dictamen.made_available_at = null; return f; }, { A1_dias_unit: 'calendar_days' }],
};
console.log('\n── input domain 1: the deadline result, observed from live runs ──');
const observed = new Set();
for (const [, [mut, res]] of Object.entries(PROBES)) {
  observed.add(evaluate(mut(base()), res)['34-2010/3.6/p4/deadline'].result);
}
console.log(`  observed: ${JSON.stringify([...observed].sort())}`);

// The probe set could be too narrow to produce a value the clause can actually return, which would
// hide a missing row. So it is reconciled against elapsed_within's OWN declared result domain in
// primitives.json, which is a different artifact written by a different mechanism.
const ew = read('./primitives.json').primitives.find((p) => p.name === 'elapsed_within').result_domain;
const expected = new Set([...ew, 'undetermined']);
a('the probes produce every value the deadline clause can return',
  observed.size === expected.size && [...expected].every((v) => observed.has(v)),
  `expected ${JSON.stringify([...expected].sort())}, observed ${JSON.stringify([...observed].sort())}`);

// ── input domain 2: from the AMBIGUITY REGISTER, not from the table ──────────────────────────────
console.log('\n── input domain 2: the A2 resolution, from ambiguities.json ──');
const A2 = read('./ambiguities.json').ambiguities.find((x) => x.id === 'A2');
const readings = A2.competing_readings.length;
const a2Domain = ['(unresolved)', 'timing_only', 'timing_and_content'];
a('the register carries one token per competing reading, plus the unresolved state',
  a2Domain.length === readings + 1, `${readings} readings, ${a2Domain.length} tokens`);

// ── coverage, by EXECUTION ───────────────────────────────────────────────────────────────────────
console.log('\n── every combination executes, or the evaluator refuses ──');
const OUTCOMES = new Set(['attached', 'not_attached', 'undetermined']);
const missing = [];
for (const d of [...observed].sort()) {
  for (const s of a2Domain) {
    const [mut, res] = PROBES[d];
    const r = { ...res, ...(s === '(unresolved)' ? {} : { A2_terminos_senalados: s }) };
    try {
      const got = evaluate(mut(base()), r)['34-2010/3.6/p7/firmeza'].result;
      if (!OUTCOMES.has(got)) missing.push(`${d}/${s} returned ${got}, outside the outcome set`);
    } catch (e) {
      missing.push(`${d}/${s}: ${e.message}`);
    }
  }
}
a(`all ${observed.size * a2Domain.length} combinations of the two input domains are covered`,
  missing.length === 0, missing.join(' | '));

// ── the sub-table, over its own input's domain ───────────────────────────────────────────────────
console.log('\n── the conformance sub-test covers its input domain ──');
const cj = read('./primitives.json').primitives.find((p) => p.name === 'conjunction_over_results').result_domain;
const subCovered = cj.filter((v) => TABLE.conformance_subtest.rows.some((r) => r.conformance === v));
a('a sub-row exists for every value conjunction_over_results declares',
  subCovered.length === cj.length, `covers ${JSON.stringify(subCovered)} of ${JSON.stringify(cj)}`);

// ── every row states the reading it rests on ─────────────────────────────────────────────────────
console.log('\n── every row carries its reading ──');
const noReading = TABLE.rows.filter((r) => typeof r.reading !== 'string' || r.reading.length < 20).map((r) => `${r.deadline}/${r.a2}`);
a('no row asserts an outcome without stating what it rests on', noReading.length === 0, noReading.join(', '));

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}: ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
