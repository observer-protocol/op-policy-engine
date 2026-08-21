#!/usr/bin/env node
// Three worked cases. Run: node cases.mjs
import { evaluate } from './evaluate.mjs';

const SIGNATORIES = ['emp-0042', 'emp-0117'];

const base = {
  notice: { type: 'reclamacion_cargo_no_reconocido', reference: 'AV-2026-0031', received_at: '2026-05-04T09:12:00Z' },
  operation: { executed_abroad: false, occurred_at: '2026-04-28T19:41:00Z',
               acquirer_name: 'Adquirente Demo', merchant_name: 'Establecimiento Demo 001',
               auth_factors: ['2.6.a.i_knowledge', '2.6.a.ii_device_or_chip'] },
  dictamen: { made_available_at: '2026-06-02T11:00:00Z', channel: 'sucursal',
              signatory_id: 'emp-0042', language_is_plain: 'affirmed',
              evidence_of_factors_present: true, verification_method_stated: true,
              device_address: { physical_address: 'Av. Reforma 100, CDMX', ip_address: null } },
  cardholder: { channel_election: 'sucursal' },
  issuer: { authorised_signatories: SIGNATORIES, holds_device_address: true },
  account: { charges_posted: ['interes_ordinario'] },
  charge: { derived_from_2_6_a_operation: 'demonstrated' },
  // The expediente copy right: requested, and provided 20 days after the dictamen was made
  // available. The period runs from DELIVERY OF THE DICTAMEN, not from the aviso.
  expediente: { requested: true, delivered_at: '2026-06-22T11:00:00Z' },
};

const clone = (o) => JSON.parse(JSON.stringify(o));

// CASE 1 — conforming, domestic, inside the period.
const case1 = { name: 'Conforming dictamen, domestic, day 29', facts: clone(base),
  resolutions: { A1_dias_unit: 'calendar_days', A2_terminos_senalados: 'timing_and_content' } };

// CASE 2 — inciso d) ABSENT AND NOT HELD, and 3.6(b) missing. Required by the brief.
const c2 = clone(base);
c2.issuer.holds_device_address = false;
c2.dictamen.device_address = { physical_address: null, ip_address: null };
c2.operation.occurred_at = null;                       // inciso b) missing
// NO COPY REQUESTED. The obligation never arose, so the clause returns not_applicable rather than
// satisfied or breached: the same third outcome inciso d) returns in this case, for the same
// reason. A fixture that simply omitted the fields would have produced the same value by accident
// rather than by statement, so the absence is written down.
c2.expediente = { requested: false, delivered_at: null };
const case2 = { name: 'Inciso d) absent and NOT HELD; inciso b) missing', facts: c2,
  resolutions: { A1_dias_unit: 'calendar_days', A2_terminos_senalados: 'timing_and_content' } };

// CASE 3 — foreign operation, delivered day 120, ambiguities left UNRESOLVED.
const c3 = clone(base);
c3.operation.executed_abroad = true;
c3.dictamen.made_available_at = '2026-09-01T11:00:00Z';   // day 120
c3.dictamen.language_is_plain = undefined;                 // not assessed
c3.charge.derived_from_2_6_a_operation = undefined;
// REQUESTED AND PROVIDED LATE: the dictamen was made available 2026-09-01 and the copy on
// 2026-11-05, which is 65 days, against a 45 `días naturales` period. `breached` is established on
// these facts.
//
// It was `delivered_at: null` first, which returned `breached` too, and that was not established:
// with no clock in the facts the evaluator cannot tell a copy that is outstanding and still in time
// from one that is late. `elapsed_within` distinguishes them and returns `no_end_event`, but
// `conditional_requirement` takes a boolean, so the distinction is collapsed at the call. Recorded
// as a limitation of this fixture set rather than worked around by adding a primitive.
c3.expediente = { requested: true, delivered_at: '2026-11-05T11:00:00Z' };
const case3 = { name: 'Foreign operation, day 120', facts: c3, resolutions: {} };

const pad = (s, n) => String(s).padEnd(n);
for (const c of [case1, case2, case3]) {
  console.log('\n' + '='.repeat(96));
  console.log(c.name);
  // ─── TWO KINDS OF INPUT, AND THEY ARE NOT THE SAME THING ────────────────────────────────────
  //
  // AMBIGUITY RESOLUTIONS are institutional readings of an undetermined text, decided once and
  // applied to every case. HUMAN AFFIRMATIONS are assessments of one document by one person on one
  // case. Case 3 was labelled `A1 and A2 left unresolved`, which named the first and hid the second,
  // so three clauses returning `not_assessed` looked like consequences of the unresolved ambiguities.
  // They are not: they are judgments nobody made.
  const judgmentFields = {
    'p1/recovery-right': c.facts.charge?.derived_from_2_6_a_operation,
    'p4/language and a/explanation': c.facts.dictamen?.language_is_plain,
  };
  const affirmed = Object.entries(judgmentFields).filter(([, v]) => v !== undefined && v !== null);
  console.log('  ambiguity resolutions supplied: ' + (Object.keys(c.resolutions).length ? JSON.stringify(c.resolutions) : 'NONE'));
  console.log('  human affirmations supplied:    ' + (affirmed.length ? affirmed.map(([k, v]) => `${k}=${v}`).join(', ') : 'NONE'));
  console.log('='.repeat(96));
  const r = evaluate(c.facts, c.resolutions);
  for (const [id, v] of Object.entries(r)) {
    console.log('  ' + pad(id, 40) + pad(v.result, 26) + (v.note ? '' : ''));
  }
  // STANDING CAVEATS, not explanations of this run's result. A note attached to a clause is true of
  // that clause on every case; printing it under a heading that implied otherwise would have it read
  // as a reason for the value above it.
  const notes = Object.entries(r).filter(([, v]) => v.note);
  if (notes.length) {
    console.log('  standing caveats on these clauses (true on every case, not read off this one):');
    for (const [id, v] of notes) console.log('    ' + id + ': ' + v.note);
  }
}
console.log('');

// ─── WHAT CASE 3 SHOWS, and it was not designed in ────────────────────────────────────────────
//
// Case 3 supplies NO resolutions, yet the deadline still returns `within`. That is correct and it
// is the useful finding: ambiguity A1 is about `cuarenta y cinco Días` in the FOURTH paragraph, and
// a foreign operation is governed by the fifth, which says `ciento ochenta días naturales`
// explicitly. So A1 does not bite on foreign cases at all.
//
// A naive encoding that applied 45 days to everything would call this dictamen late and make the
// credit final. The interval is 120 calendar days from the aviso, so a 45-day reading calls it 75
// days late.
//
// CORRECTED 2026-08-21: this comment and the console note below both read `51 days late`, which is
// wrong arithmetic on the dates in this file (120 minus 45 is 75). Caught by tracing the figure back
// to the fixture dates while assembling the client report. It had already propagated from here into
// that report before the trace caught it, which is the reason a figure repeated between documents is
// worth re-deriving rather than copying. The correct answer is that it was delivered inside the period, and whether
// finality attaches turns on A2, which nobody has decided.
console.log('CASE 3 NOTE: no resolutions were supplied, yet the deadline resolved. Ambiguity A1');
console.log('governs the fourth paragraph only, and a foreign operation is governed by the fifth,');
console.log('whose period is stated as `días naturales`. A1 does not bite on foreign cases.');
console.log('The interval is 120 calendar days, so a 45-day reading calls it 75 days late.');
console.log('');
