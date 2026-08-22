#!/usr/bin/env node
/**
 * SI 2017/752, regulation 76 and dependencies. Standalone. No engine integration, no signing.
 *
 * Primitives are the Banxico set, imported by copy rather than by reference because there is no
 * shared package yet. Two are NEW and are marked. Ambiguities are inputs, never defaults: a clause
 * whose answer depends on one that was not supplied returns `undetermined`.
 */
const DAY = 86400000;

// ─── reused unchanged from the Banxico set ──────────────────────────────────────────────────────
const field_present = (v) => (v === null || v === undefined || v === '' ? 'absent' : 'present');
const any_present = (alts) => (alts.some((v) => field_present(v) === 'present') ? 'one_present' : 'none_present');
// WIDENED 2026-08-22, closing REUSE-LOG E1, identically to the Banxico copy. A closed four-token
// vocabulary, throwing on anything else. Mapping a primitive's result domain into these four is the
// clause's reading and stays at the call site.
const conditional_requirement = (pre, res) => {
  if (!pre) return 'not_applicable';
  if (res === true) return 'satisfied';
  if (res === false) return 'breached';
  if (res === 'outstanding') return 'outstanding';
  if (res === 'undetermined') return 'undetermined';
  throw new Error(`conditional_requirement: unrecognised requirement result ${JSON.stringify(res)}`);
};
const member_of_register = (c, reg) => (field_present(c) === 'absent' ? 'no_candidate' : (reg.includes(c) ? 'member' : 'not_member'));
const held_judgment = (a) => (a === undefined || a === null ? 'not_assessed' : a);
const conjunction_over_results = (rs, undeterminedIs) => {
  if (rs.includes('undetermined')) return undeterminedIs === 'fail' ? 'not_satisfied' : 'undetermined';
  return rs.every((r) => r === true || r === 'satisfied') ? 'satisfied' : 'not_satisfied';
};

// ─── PARAMETERISED: `months`, and a clock ───────────────────────────────────────────────────────
// Banxico needed calendar_days and business_days. 13 months is not a fixed multiple of either, so
// the unit is added rather than approximated as 395 days.
//
// The `now` operand and the two extra result values were added 2026-08-22, closing REUSE-LOG E1, in
// step with the Banxico copy. Without a clock an absent end event cannot be told from a late one,
// and no composition rule can restore a distinction that was never derived.
const withinLimit = (s, e, limit, unit) => {
  if (unit === 'calendar_days') return (e - s) <= limit * DAY;
  if (unit === 'business_days') {
    let n = 0;
    for (let t = s.getTime() + DAY; t <= e.getTime(); t += DAY) {
      const d = new Date(t).getUTCDay();
      if (d !== 0 && d !== 6) n++;
    }
    return n <= limit;
  }
  if (unit === 'months') {
    const cap = new Date(s); cap.setUTCMonth(cap.getUTCMonth() + limit);
    return e <= cap;
  }
  throw new Error(`unknown unit: ${unit}`);
};

const elapsed_within = (start, end, limit, unit, now) => {
  if (start === null || start === undefined) return 'no_end_event';
  const s = new Date(start);
  if (isNaN(s)) return 'no_end_event';
  if (end === null || end === undefined) {
    if (now === null || now === undefined) return 'no_end_event';   // no clock: cannot tell, and says so
    const t = new Date(now);
    if (isNaN(t)) return 'no_end_event';
    return withinLimit(s, t, limit, unit) ? 'not_yet_due' : 'overdue';
  }
  const e = new Date(end);
  if (isNaN(e)) return 'no_end_event';
  return withinLimit(s, e, limit, unit) ? 'within' : 'exceeded';
};

// ─── PARAMETERISED: open_set_floor at arity one ─────────────────────────────────────────────────
// Same shape as `por lo menos`: what is enumerated is necessary and the rule declines to make it
// sufficient. Banxico passed a list of element results; reg 75(3) passes a single evidence item.
const open_set_floor = (results) =>
  (results.every((r) => r === true) ? 'floor_met' : 'floor_not_met');

// ─── NEW: ordered_before ────────────────────────────────────────────────────────────────────────
// Two instants, no limit. elapsed_within measures an interval AGAINST A LIMIT and cannot express
// `before` without inventing one, which would put an arbitrary number inside a rule that has none.
const ordered_before = (a, b) => {
  if (a === null || a === undefined || b === null || b === undefined) return 'missing_operand';
  const x = new Date(a), y = new Date(b);
  if (isNaN(x) || isNaN(y)) return 'missing_operand';
  return x < y ? 'before' : x > y ? 'after' : 'simultaneous';
};

// ─── NEW: amounts_equal ─────────────────────────────────────────────────────────────────────────
// The existing set has no numeric comparison at all. Banxico's ceiling test lived inside the
// engine's mandate evaluator and was never lifted into a primitive, so this is the first time an
// amount has had to be compared here.
const amounts_equal = (a, b) => {
  if (!a || !b) return 'missing_operand';
  if (a.currency !== b.currency) return 'incomparable_currency';
  const scale = (v) => BigInt(v.amountRaw) * (10n ** BigInt(6 - Number(v.decimals)));
  return scale(a) === scale(b) ? 'equal' : 'not_equal';
};

export function evaluate(facts, resolutions = {}) {
  const o = {};
  const put = (id, result, note) => { o[id] = note === undefined ? { result } : { result, note }; };
  const f = facts;

  // reg 67
  put('psr-2017/67/1/consent', any_present([f.consent?.to_transaction, f.consent?.to_series]));
  put('psr-2017/67/2/b/form', member_of_register(f.consent?.form, f.agreement?.agreed_forms ?? []));
  put('psr-2017/67/2/a/timing',
    conditional_requirement(f.consent?.given_after_execution === true,
      f.agreement?.post_execution_consent_agreed === true),
    'not_applicable means consent was given before execution, where no agreement is needed.');
  put('psr-2017/67/3/withdrawal',
    ordered_before(f.consent?.withdrawn_at, f.order?.irrevocable_from),
    'NEW primitive ordered_before. missing_operand where no withdrawal was made.');
  // field_present, not truthiness: the operand is a TIMESTAMP, so the question really is whether a
  // withdrawal instant exists. This is the case where field_present genuinely applies, unlike the
  // two Banxico incisos that read a boolean assertion. Corrected 2026-08-21.
  //
  // MEASURED, because the first version of this comment overstated it: the two forms differ on `0`
  // ONLY, where a numeric epoch 1970-01-01 was read as no withdrawal at all and is now read as a
  // withdrawal. They AGREE on `''`, which field_present also calls absent. So this is a narrow fix
  // and it is worth saying so rather than implying it closed a class.
  put('psr-2017/67/4/series-withdrawal',
    field_present(f.consent?.series_withdrawn_at) === 'present'
      ? conjunction_over_results([false], 'undetermined') : 'not_applicable');

  // reg 74
  put('psr-2017/74/1/undue-delay', held_judgment(f.notification?.without_undue_delay));
  put('psr-2017/74/1/thirteen-months',
    elapsed_within(f.transaction?.debit_date, f.notification?.given_at, 13, 'months', f.clock?.now),
    'PARAMETERISED: elapsed_within with a months unit, which Banxico never needed.');
  put('psr-2017/74/2/information-failure',
    conditional_requirement(f.provider?.part6_information_failure === true, true),
    'not_applicable means no information failure, so the bar in 74(1) stands.');

  // reg 75
  const b = f.provider?.burden ?? {};
  put('psr-2017/75/1/provider-burden', conjunction_over_results(
    [held_judgment(b.authenticated), held_judgment(b.accurately_recorded),
     held_judgment(b.entered_in_accounts), held_judgment(b.no_technical_deficiency)]
      .map((r) => (r === 'affirmed' ? true : r === 'not_assessed' ? 'undetermined' : false)), 'undetermined'));
  put('psr-2017/75/2/pisp-burden',
    f.transaction?.via_pisp === true ? held_judgment(f.pisp?.burden_discharged) : 'not_applicable');
  put('psr-2017/75/3/instrument-not-sufficient',
    open_set_floor([field_present(f.evidence?.instrument_use_record) === 'present']),
    'PARAMETERISED: open_set_floor at arity one. floor_met means the record exists. It does NOT mean authorisation is proved, which is exactly what 75(3) says.');
  put('psr-2017/75/4/supporting-evidence',
    conditional_requirement(f.provider?.claims_fraud_or_gross_negligence === true,
      field_present(f.evidence?.supporting_evidence_given_to_payer) === 'present'));

  // reg 76
  const notBarred = o['psr-2017/74/1/thirteen-months'].result === 'within'
    || o['psr-2017/74/2/information-failure'].result === 'satisfied';
  const unauthorised = o['psr-2017/67/1/consent'].result === 'none_present';
  put('psr-2017/76/1/trigger',
    conjunction_over_results([unauthorised, notBarred], 'undetermined'),
    'Composes the 67 authorisation result with the 74 bar. Reads no fact directly.');
  put('psr-2017/76/1/a/refund',
    amounts_equal(f.refund?.amount, f.transaction?.amount),
    'NEW primitive amounts_equal.');
  // The estate's OTHER narrowing site, found by the E1 audit and fixed with it. This read
  // `held_judgment(...) === 'affirmed'`, so a restoration nobody had assessed came back `breached`,
  // which states a breach on the strength of an unanswered question.
  const restored = held_judgment(f.account?.restored_to_prior_state);
  put('psr-2017/76/1/b/restore',
    conditional_requirement(f.account?.restoration_applicable === true,
      restored === 'not_assessed' ? 'undetermined' : restored === 'affirmed'),
    '`undetermined` means restoration was required and nobody has assessed whether it happened.');
  put('psr-2017/76/2/practicable', held_judgment(f.refund?.as_soon_as_practicable));

  const carve = f.provider?.reasonable_grounds_to_suspect_fraud === true
    && field_present(f.provider?.poca_notification_in_writing) === 'present';
  put('psr-2017/76/3/fraud-carveout',
    conditional_requirement(f.provider?.reasonable_grounds_to_suspect_fraud === true,
      field_present(f.provider?.poca_notification_in_writing) === 'present'),
    'The carve-out requires BOTH the suspicion and the written notification.');
  const scope = resolutions.P1_carveout_scope;   // 'deadline_only' | 'obligation_suspended' | undefined
  put('psr-2017/76/2/deadline',
    carve
      ? (scope === undefined ? 'undetermined'
         : scope === 'deadline_only' ? 'not_applicable_deadline_removed' : 'not_applicable_obligation_suspended')
      : elapsed_within(f.provider?.became_aware_at, f.refund?.provided_at, 1, 'business_days', f.clock?.now),
    carve && scope === undefined ? 'P1 unresolved: the carve-out disapplies paragraph (2) and the text does not say whether paragraph (1) survives.' : undefined);

  put('psr-2017/76/4/value-date',
    (() => { const r = ordered_before(f.refund?.credit_value_date, f.transaction?.debit_date);
             return r === 'after' ? 'breached' : r === 'missing_operand' ? 'missing_operand' : 'satisfied'; })(),
    'NEW primitive ordered_before, second user. `no later than` admits simultaneous.');
  put('psr-2017/76/5/a/aspsp-complies',
    f.transaction?.via_pisp === true
      ? conjunction_over_results([o['psr-2017/76/1/a/refund'].result === 'equal'], 'undetermined')
      : 'not_applicable');
  put('psr-2017/76/5/b/pisp-compensates',
    conditional_requirement(f.pisp?.liable === true && f.aspsp?.compensation_requested === true,
      f.pisp?.compensated === true));
  return o;
}
