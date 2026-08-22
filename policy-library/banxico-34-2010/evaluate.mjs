#!/usr/bin/env node
/**
 * A standalone evaluator for the clause register in clauses.json.
 *
 * No engine integration, no signing, no attestation. It takes a facts object and returns a result
 * per clause, built from the shapes in primitives.json.
 *
 * ─── IT DOES NOT RESOLVE AMBIGUITIES ─────────────────────────────────────────────────────────
 *
 * The six entries in ambiguities.json are institutional decisions. This evaluator takes them as an
 * explicit `resolutions` argument and returns `undetermined` for any clause whose answer depends on
 * one that was not supplied. Defaulting them would be the evaluator deciding a question the source
 * leaves open, which is the failure the register exists to prevent.
 *
 * ─── AND IT DOES NOT CONCLUDE CONFORMANCE FROM THE ELEMENT LIST ──────────────────────────────
 *
 * `por lo menos` makes the list a floor. `floor_met` is the strongest thing this can return about
 * the elements, and it is not the same as a conforming dictamen.
 */

// ─── the firmeza decision table, loaded from the register ───────────────────────────────────────
//
// This file used to import nothing at all, and that was worth something: it was auditable in
// isolation. It now reads clauses.json, because the seventh paragraph's logic IS the table there
// and driving it from anywhere else would be a second representation of the same rule. The trade is
// deliberate. See ../_primitives/INVENTORY-AUDIT.md, STEP 3 of the follow-up.
import { readFileSync } from 'node:fs';

const FIRMEZA_TABLE = JSON.parse(readFileSync(new URL('./clauses.json', import.meta.url), 'utf8'))
  .clauses.find((c) => c.id === '34-2010/3.6/p7/firmeza').decision_table;

// ─── primitives, exactly as inventoried ─────────────────────────────────────────────────────────
const DAY_MS = 86400000;

// PARAMETERISED 2026-08-22, closing REUSE-LOG E1. Gains a `now` operand and two result values.
//
// The old three-value domain could not say whether an absent end event was LATE or NOT YET DUE,
// because nothing in evaluation knew what time it was. That is not a distinction a composition rule
// can restore: it was never derived. So the clock becomes an explicit fact, and when it is absent
// this returns the same `no_end_event` it always did rather than assuming one.
const withinLimit = (s, e, limit, unit) => {
  if (unit === 'calendar_days') return (e - s) <= limit * DAY_MS;
  if (unit === 'business_days') {
    // Counted by walking days and skipping Saturday and Sunday. A real deployment substitutes the
    // CNBV calendar; the shape is unchanged by that substitution.
    let n = 0;
    for (let t = s + DAY_MS; t <= e; t += DAY_MS) {
      const d = new Date(t).getUTCDay();
      if (d !== 0 && d !== 6) n++;
    }
    return n <= limit;
  }
  throw new Error(`unknown calendar unit: ${unit}`);
};

const elapsed_within = (start, end, limit, unit, now) => {
  const s = Date.parse(start);
  if (end === null || end === undefined) {
    if (now === null || now === undefined) return 'no_end_event';   // no clock: cannot tell, and says so
    const t = Date.parse(now);
    if (Number.isNaN(s) || Number.isNaN(t)) return 'no_end_event';
    // THE SAME PREDICATE decides both vocabularies, so `not_yet_due` and `within` can never
    // disagree about where the boundary is.
    return withinLimit(s, t, limit, unit) ? 'not_yet_due' : 'overdue';
  }
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return 'no_end_event';
  return withinLimit(s, e, limit, unit) ? 'within' : 'exceeded';
};

const select_parameter_by_predicate = (p, ifTrue, ifFalse) => (p ? ifTrue : ifFalse);
const field_present = (v) => (v === null || v === undefined || v === '' ? 'absent' : 'present');
const all_present = (vs) => (vs.every((v) => field_present(v) === 'present') ? 'all_present' : 'some_absent');
const any_present = (alts) => (alts.some((v) => field_present(v) === 'present') ? 'one_present' : 'none_present');
// WIDENED 2026-08-22, closing REUSE-LOG E1. The second operand was a boolean, which forced every
// multi-valued result through two states at the call site. It now takes a CLOSED four-token
// vocabulary and throws on anything else, so a caller that invents a fifth state fails loudly
// instead of being silently read as `false`.
//
// It is deliberately NOT coupled to elapsed_within's tokens. Mapping a primitive's result domain
// into these four is the clause's reading, so it stays at the call site next to the clause note
// rather than being buried in a shared shape.
const conditional_requirement = (pre, result) => {
  if (!pre) return 'not_applicable';
  if (result === true) return 'satisfied';
  if (result === false) return 'breached';
  if (result === 'outstanding') return 'outstanding';
  if (result === 'undetermined') return 'undetermined';
  throw new Error(`conditional_requirement: unrecognised requirement result ${JSON.stringify(result)}`);
};
const member_of_register = (c, reg) => (field_present(c) === 'absent' ? 'no_candidate' : (reg.includes(c) ? 'member' : 'not_member'));
const member_of_enumeration = (v, en) => (en.includes(v) ? 'member' : 'not_member');
const distinct_members_at_least = (items, min, independent) => {
  const kept = [];
  for (const it of items) if (kept.every((k) => independent(k, it))) kept.push(it);
  return kept.length >= min ? 'met' : 'not_met';
};
const none_of_class_present = (items, prohibited) =>
  (items.some((i) => prohibited.includes(i)) ? 'prohibited_present' : 'clear');
const open_set_floor = (results) => (results.every((r) => r === true) ? 'floor_met' : 'floor_not_met');
const held_judgment = (a) => (a === undefined || a === null ? 'not_assessed' : a);
const conjunction_over_results = (results, undeterminedIs) => {
  if (results.includes('undetermined')) return undeterminedIs === 'fail' ? 'not_satisfied' : 'undetermined';
  return results.every((r) => r === true || r === 'satisfied') ? 'satisfied' : 'not_satisfied';
};

// ─── the clause set ─────────────────────────────────────────────────────────────────────────────
const AUTH_FACTOR_KINDS = ['2.6.a.i_knowledge', '2.6.a.ii_device_or_chip', '2.6.a.iii_biometric', '2.6.a.iv_authorised_other'];

export function evaluate(facts, resolutions = {}) {
  const out = {};
  const put = (id, result, note) => { out[id] = note === undefined ? { result } : { result, note }; };

  // 2.6(a) — two INDEPENDENT elements from the enumeration.
  const factors = facts.operation?.auth_factors ?? [];
  const allKnown = factors.every((f) => member_of_enumeration(f, AUTH_FACTOR_KINDS) === 'member');
  put('34-2010/2.6/a/two-factor',
    !allKnown ? 'not_met' : distinct_members_at_least(factors, 2, (a, b) => a !== b),
    'Independence approximated as distinctness of kind. Two factors of one kind do not count as two.');

  // 3.3
  put('34-2010/3.3/p1/notice-types',
    member_of_enumeration(facts.notice?.type, ['robo_o_extravio', 'reclamacion_cargo_no_reconocido']));
  put('34-2010/3.3/p5/receipt-record',
    all_present([facts.notice?.reference, facts.notice?.received_at]));

  // 3.6 elements
  put('34-2010/3.6/a/evidence', facts.dictamen?.evidence_of_factors_present ? 'present' : 'absent');
  put('34-2010/3.6/a/explanation', held_judgment(facts.dictamen?.language_is_plain));
  put('34-2010/3.6/a/verification-method', facts.dictamen?.verification_method_stated ? 'present' : 'absent');
  put('34-2010/3.6/b/time', field_present(facts.operation?.occurred_at));
  put('34-2010/3.6/c/parties', all_present([facts.operation?.acquirer_name, facts.operation?.merchant_name]));

  // inciso d) — CONDITIONAL. Absence where nothing is held is not a breach.
  const addr = facts.dictamen?.device_address ?? {};
  put('34-2010/3.6/d/device-address',
    conditional_requirement(facts.issuer?.holds_device_address === true,
      any_present([addr.physical_address, addr.ip_address]) === 'one_present'),
    'not_applicable means the issuer holds no address, which the source treats as no breach.');

  // 3.6 chapeau
  put('34-2010/3.6/p4/language', held_judgment(facts.dictamen?.language_is_plain));
  put('34-2010/3.6/p4/signatory',
    member_of_register(facts.dictamen?.signatory_id, facts.issuer?.authorised_signatories ?? []));
  put('34-2010/3.6/p4/channel',
    conditional_requirement(field_present(facts.cardholder?.channel_election) === 'present',
      facts.dictamen?.channel === facts.cardholder?.channel_election),
    'not_applicable means no election is on record, so the requirement is not yet fixed.');

  // the deadline, and which one applies
  const abroad = facts.operation?.executed_abroad === true;
  const unitRes = resolutions.A1_dias_unit;            // 'business_days' | 'calendar_days' | undefined
  const period = select_parameter_by_predicate(abroad,
    { limit: 180, unit: 'calendar_days' },              // fifth paragraph, explicitly naturales
    { limit: 45, unit: unitRes });                      // fourth paragraph, unit UNRESOLVED
  put('34-2010/3.6/p5/foreign-deadline', abroad ? 'selected_180_calendar_days' : 'selected_fourth_paragraph');
  // THE ROW MUST SAY WHICH PERIOD IT APPLIED. The register defines this clause as the 45 `Días`
  // deadline, so a bare `within` at day 120 reads as a contradiction of the clause it sits on. What
  // actually happened is that p5/foreign-deadline selected the fifth paragraph's period and this
  // clause applied it. Stating the applied period on the row is what stops the table contradicting
  // the prose that explains it.
  const appliedPeriod = `${period.limit} ${period.unit ?? 'UNRESOLVED'}` +
    (abroad ? ', selected by p5/foreign-deadline (fifth paragraph)' : ', fourth paragraph');
  put('34-2010/3.6/p4/deadline',
    period.unit === undefined ? 'undetermined'
      : elapsed_within(facts.notice?.received_at, facts.dictamen?.made_available_at, period.limit, period.unit, facts.clock?.now),
    period.unit === undefined
      ? 'A1 unresolved: the unit of `cuarenta y cinco Días` was not supplied.'
      : `Period applied: ${appliedPeriod}.`);

  // the floor — necessary, never sufficient
  const elementResults = [
    out['34-2010/3.6/a/evidence'].result === 'present',
    out['34-2010/3.6/a/verification-method'].result === 'present',
    out['34-2010/3.6/b/time'].result === 'present',
    out['34-2010/3.6/c/parties'].result === 'all_present',
    out['34-2010/3.6/d/device-address'].result !== 'breached',
  ];
  put('34-2010/3.6/p4/floor', open_set_floor(elementResults),
    'floor_met means every enumerated minimum was met. It does NOT mean the dictamen conforms: `por lo menos` declines to make the list sufficient.');

  // 3.6 fifth paragraph, second rule: the expediente copy.
  //
  // ─── ADDED 2026-08-21. IT WAS DECLARED AND NEVER EMITTED ─────────────────────────────────────
  //
  // primitives.json listed this clause under `elapsed_within` and `conditional_requirement`, and
  // its integrity check reported every clause served. That check tests whether a clause id appears
  // in a primitive's `used_by` list. It does not test whether anything calls it. The clause was
  // declared served, never emitted, and the case tables printed 18 rows against a 19 clause
  // register for as long as they existed.
  //
  // TWO EXISTING PRIMITIVES, NO NEW ONE. The obligation arises only on request, which is
  // conditional_requirement; the period is elapsed_within. Its clock runs from DELIVERY OF THE
  // DICTAMEN, not from the aviso, and its unit is `días naturales` in the source, stated
  // explicitly, so ambiguity A1 does not reach it.
  const copyRun = elapsed_within(facts.dictamen?.made_available_at, facts.expediente?.delivered_at,
    45, 'calendar_days', facts.clock?.now);
  // THE MAPPING IS THE CLAUSE'S READING, so it sits here rather than inside conditional_requirement.
  // `not_yet_due` is the state this clause could not express before E1 was closed: the copy was
  // requested, has not arrived, and the period has not run, so nothing is breached and nothing is
  // satisfied either.
  put('34-2010/3.6/p5/expediente-copy',
    conditional_requirement(facts.expediente?.requested === true,
      copyRun === 'within' ? true
        : copyRun === 'not_yet_due' ? 'outstanding'
          : copyRun === 'no_end_event' ? 'undetermined'
            : false),
    'not_applicable means no copy was requested, which is not a breach. `outstanding` means requested, not yet delivered, and the period has not run. `undetermined` means not yet delivered and NO CLOCK was supplied, so late and outstanding cannot be told apart. The 45 day period runs from delivery of the dictamen and is stated as `días naturales`, so A1 does not reach it.');

  // 3.6 sixth paragraph
  put('34-2010/3.6/p6/no-moratory-interest',
    none_of_class_present(facts.account?.charges_posted ?? [], ['interes_moratorio', 'accesorio_otro']));

  // 3.6 first paragraph — a held judgment, never derived from the factor count
  put('34-2010/3.6/p1/recovery-right', held_judgment(facts.charge?.derived_from_2_6_a_operation),
    'Never inferred from 2.6(a) being met. See ambiguity A3.');

  // firmeza — DERIVED, and driven by the decision table in clauses.json rather than by a chain.
  //
  // The table is the reading. Every row carries the sentence of the seventh paragraph it rests on,
  // it is checkable for completeness over its input domains (check-firmeza-table.mjs), and it can be
  // diffed when an institution changes its reading. An if/else chain is none of those, and two of
  // its rows carry findings (F1, F2 in the table) that were not legible until the rows sat side by
  // side.
  const deadline = out['34-2010/3.6/p4/deadline'].result;
  const a2 = resolutions.A2_terminos_senalados ?? '(unresolved)';
  const row = FIRMEZA_TABLE.rows.find((r) => r.deadline === deadline && r.a2 === a2);
  // A missing row is a defect in the table, never a default. Failing loudly is the whole point of
  // moving this out of a chain, whose `else` arm silently absorbed every combination nobody listed.
  if (row === undefined) {
    throw new Error(`firmeza: no decision-table row for deadline=${deadline}, a2=${a2}`);
  }
  let firmeza, fnote;
  if (row.outcome_from === 'conformance_subtest') {
    const conforming = conjunction_over_results([
      out['34-2010/3.6/p4/floor'].result === 'floor_met',
      out['34-2010/3.6/p4/signatory'].result === 'member',
      out['34-2010/3.6/p4/language'].result === 'affirmed' ? true : 'undetermined',
    ], 'undetermined');
    const sub = FIRMEZA_TABLE.conformance_subtest.rows.find((r) => r.conformance === conforming);
    if (sub === undefined) {
      throw new Error(`firmeza: no conformance-subtest row for ${conforming}`);
    }
    firmeza = sub.outcome; fnote = sub.note;
  } else {
    firmeza = row.outcome; fnote = row.note;
  }
  put('34-2010/3.6/p7/firmeza', firmeza, fnote);

  return out;
}
