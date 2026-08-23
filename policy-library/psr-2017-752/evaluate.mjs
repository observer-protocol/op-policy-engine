#!/usr/bin/env node
/**
 * SI 2017/752, regulation 76 and dependencies. Standalone. No engine integration, no signing.
 *
 * Primitives are the Banxico set, imported by copy rather than by reference because there is no
 * shared package yet. Two are NEW and are marked. Ambiguities are inputs, never defaults: a clause
 * whose answer depends on one that was not supplied returns `undetermined`.
 */
// THIS FILE NOW READS ONE FILE, its own register.json, for the lane stamp below. It read nothing
// at all before 2026-08-24, and the inventory audit relied on that; the trade is the same one
// banxico made for the firmeza table: the alternative is a second copy of register data.
import { readFileSync } from 'node:fs';
const DAY = 86400000;

// ─── the record opening: v2, lane, lane_from, from THIS DOMAIN'S register.json ──────────────────
//
// The lane lookup and any per-clause overrides live in the register, one copy, built by
// _phase0/build-register.mjs. This file reads them rather than restating them. The no-lane and
// same-lane-override rulings are stated once at _interpreter/interpret.mjs and REUSE-LOG E30/R14;
// this reader enforces the same two throws so the two implementations cannot disagree silently.
const __REG = JSON.parse(readFileSync(new URL('./register.json', import.meta.url), 'utf8'));
const LANE_STAMP = Object.fromEntries(__REG.clauses.map((c) => {
  const e = __REG.lanes.lookup[c.disposition];
  if (e === undefined) throw new Error(`${c.id}: disposition ${c.disposition} has no lane lookup entry`);
  if (e.no_lane !== undefined) {
    if (c.lane_override) throw new Error(`${c.id}: lane_override on a laneless disposition`);
    return [c.id, { v: 4, lane: 'none', lane_from: 'lookup' }];
  }
  if (c.lane_override) {
    if (c.lane_override === e.lane) throw new Error(`${c.id}: lane_override restates the lookup's lane; R14`);
    return [c.id, { v: 4, lane: c.lane_override, lane_from: 'override' }];
  }
  return [c.id, { v: 4, lane: e.lane, lane_from: 'lookup' }];
}));

// ─── the waiting axis: independent tracking against the register's one-copy vocabulary ──────────
//
// Origins accumulate between put() calls (arguments evaluate before the call, so everything a
// clause's evaluation touched is in the set when put runs), and reset after each emission. The
// record store is proxied so a read of another clause's record marks a clause origin when that
// record is itself waiting. Classification rules are the interpreter's, stated in
// _interpreter/interpret.mjs; this is a second implementation of them, compared by parity on
// every record.
const __W = __REG.waiting;
const __READS_FACTS = (() => {
  const m = {};
  const walk = (n, acc, seen) => {
    if (n === null || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const x of n) walk(x, acc, seen); return; }
    if (n.op === 'fact') acc.found = true;
    if (n.op === 'binding' && !seen.has(n.name)) { seen.add(n.name); walk(__REG.bindings[n.name], acc, seen); }
    for (const [k, v] of Object.entries(n)) if (k !== 'op') walk(v, acc, seen);
  };
  for (const c of __REG.clauses) { const acc = { found: false }; if (c.evaluate) walk(c.evaluate, acc, new Set()); m[c.id] = acc.found; }
  return m;
})();
let __origins = new Set();
let __meaning = false;
const __trackToken = (fn) => (...a) => {
  const r = fn(...a);
  const cls = __W.absence_result_tokens[r];
  if (cls !== undefined && cls !== '$composite') __origins.add(cls);
  return r;
};
const __trackArg = (fn) => (...a) => {
  const a0 = a[0];
  if (a0 === undefined || (Array.isArray(a0) && a0.some((v) => v === undefined))) __origins.add('fact');
  return fn(...a);
};
const __classify = (id, finalToken) => {
  if (__meaning) return 'meaning';
  const over = __W.decided_overrides[finalToken];
  if (over !== undefined) return over;
  const pri = __W.priority.filter((v) => __origins.has(v));
  const cls = __W.absence_result_tokens[finalToken];
  if (cls !== undefined) {
    if (pri.length) return pri[0];
    if (cls !== '$composite') return cls;
    return __READS_FACTS[id] ? 'fact' : 'clause';
  }
  return pri.length ? pri[0] : 'none';
};
const __trackStore = (o) => new Proxy(o, {
  get(t, k) { const r = t[k]; if (r && typeof r === 'object' && r.waiting !== 'none') __origins.add(r.waiting); return r; },
});



// ─── reused unchanged from the Banxico set ──────────────────────────────────────────────────────
const __field_present = (v) => (v === null || v === undefined || v === '' ? 'absent' : 'present');
const __any_present = (alts) => (alts.some((v) => field_present(v) === 'present') ? 'one_present' : 'none_present');
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
const __member_of_register = (c, reg) => (field_present(c) === 'absent' ? 'no_candidate' : (reg.includes(c) ? 'member' : 'not_member'));
const __held_judgment = (a) => (a === undefined || a === null ? 'not_assessed' : a);
// CLOSED 2026-08-22, identically to the Banxico copy. It read every unrecognised value as failure.
const CONJUNCTION_TOKENS = new Set([true, false, 'satisfied', 'undetermined']);
const conjunction_over_results = (rs, undeterminedIs) => {
  for (const r of rs) {
    if (!CONJUNCTION_TOKENS.has(r)) {
      throw new Error(`conjunction_over_results: unrecognised result ${JSON.stringify(r)}`);
    }
  }
  if (rs.includes('undetermined')) return undeterminedIs === 'fail' ? 'not_satisfied' : 'undetermined';
  return rs.every((r) => r === true || r === 'satisfied') ? 'satisfied' : 'not_satisfied';
};

// ─── composition shapes ─────────────────────────────────────────────────────────────────────────
//
// Named 2026-08-22. These were inline in both evaluators, which is where 11 of 40 clause results
// took their outermost operation. Each validates its own input and THROWS on anything unregistered,
// and each carries `undetermined` rather than collapsing it: a shape that decides on an undetermined
// operand reintroduces E1 one layer up.
//
// None is coupled to a primitive's tokens. `remap_result_domain` takes its mapping FROM THE CALL
// SITE, because which of a primitive's results a clause treats as failure is the clause's reading.

const strictBoolean = (v, where) => {
  if (v === true || v === false) return v;
  throw new Error(`${where}: expected a strict boolean, got ${JSON.stringify(v)}`);
};

// The obligation did not arise. THE CLOSED ARM IS ALWAYS `not_applicable` AND IS NOT A PARAMETER.
// A token parameter would let "the requirement failed" and "the requirement never applied" share one
// shape name and look like agreement, which is exactly how the two domains diverged.
const applicability_gate = (applies, compute) =>
  (strictBoolean(applies, 'applicability_gate') ? compute() : 'not_applicable');

// An input the clause needs cannot be USED: an ambiguity nobody resolved, a value nothing can
// classify. Its closed arm is always `undetermined`, and the distinction from applicability_gate is
// the point of having two shapes rather than one parameterised one.
const guard_on_unresolved = (usable, compute) =>
  (strictBoolean(usable, 'guard_on_unresolved') ? compute() : 'undetermined');

// One result domain onto another. The mapping must be TOTAL over the source domain: an unlisted
// token throws rather than falling into an else arm, which is where the two domains silently
// disagreed about `denied` until the versions were laid side by side (REUSE-LOG E6). A source domain
// that is genuinely open declares `$unmapped` explicitly, so that decision is written down rather
// than implied by the shape of a ternary.
const remap_result_domain = (value, mapping) => {
  if (Object.prototype.hasOwnProperty.call(mapping, value)) return mapping[value];
  if (Object.prototype.hasOwnProperty.call(mapping, '$unmapped')) return mapping.$unmapped;
  throw new Error(`remap_result_domain: no mapping for ${JSON.stringify(value)}`);
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

const __elapsed_within = (start, end, limit, unit, now) => {
  if (start === null || start === undefined) return 'no_end_event';
  const s = new Date(start);
  if (isNaN(s)) return 'no_end_event';
  if (end === null || end === undefined) {
    if (now === null || now === undefined) return 'no_end_event';   // no clock: cannot tell, and says so
    const t = new Date(now);
    if (isNaN(t)) return 'no_end_event';
    if (t < s) return 'out_of_order';   // the clock precedes the event that starts the period
    return withinLimit(s, t, limit, unit) ? 'not_yet_due' : 'overdue';
  }
  const e = new Date(end);
  if (isNaN(e)) return 'no_end_event';
  // AN END EVENT CANNOT PRECEDE THE EVENT THAT TRIGGERS IT. Added 2026-08-22, in step with the
  // Banxico copy. A negative interval is under every limit, so this returned `within` for a refund
  // value-dated before the debit it answers. Tested INSIDE the primitive: all four call sites in the
  // two domains measure an end event that must follow its start, so they do not differ, and a
  // call-site guard would be forgotten on the fifth.
  if (e < s) return 'out_of_order';
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
const __ordered_before = (a, b) => {
  if (a === null || a === undefined || b === null || b === undefined) return 'missing_operand';
  const x = new Date(a), y = new Date(b);
  if (isNaN(x) || isNaN(y)) return 'missing_operand';
  return x < y ? 'before' : x > y ? 'after' : 'simultaneous';
};

// ─── NEW: amounts_equal ─────────────────────────────────────────────────────────────────────────
// The existing set has no numeric comparison at all. Banxico's ceiling test lived inside the
// engine's mandate evaluator and was never lifted into a primitive, so this is the first time an
// amount has had to be compared here.
const __amounts_equal = (a, b) => {
  if (!a || !b) return 'missing_operand';
  if (a.currency !== b.currency) return 'incomparable_currency';
  const scale = (v) => BigInt(v.amountRaw) * (10n ** BigInt(6 - Number(v.decimals)));
  return scale(a) === scale(b) ? 'equal' : 'not_equal';
};

// tracked rebindings: the wrapped names are what the clause set calls
const field_present = __trackArg((v) => __field_present(v));
const any_present = __trackArg(__any_present);
const member_of_register = __trackToken(__member_of_register);
const held_judgment = __trackToken(__held_judgment);
const elapsed_within = __trackToken(__elapsed_within);
const ordered_before = __trackToken(__ordered_before);
const amounts_equal = __trackToken(__amounts_equal);

export function evaluate(facts, resolutions = {}) {
  // ENTRY reset, not only per-put: a consumer reading the returned store after the run (a
  // stringify, a resultOf) fires the tracking proxy, and state left by those reads must not leak
  // into the next run's first emission window. Found by the cross-implementation sweep: run N's
  // serialisation polluted run N+1's first clause.
  __origins = new Set(); __meaning = false;
  const o = __trackStore({});
  // The record opens v, lane, lane_from, waiting, identically to the Banxico copy.
  const put = (id, result, note) => {
    const waiting = __classify(id, result);
    o[id] = note === undefined ? { ...LANE_STAMP[id], waiting, result } : { ...LANE_STAMP[id], waiting, result, note };
    __origins = new Set(); __meaning = false;
  };
  const f = facts;

  // reg 67
  // reg 67(4) VERBATIM: `Subject to regulation 83(3) to (5), the payer may withdraw its consent to
  // the execution of a series of payment transactions at any time WITH THE EFFECT THAT ANY FUTURE
  // PAYMENT TRANSACTIONS ARE NOT REGARDED AS AUTHORISED for the purposes of this Part.`
  //
  // FIXED 2026-08-23. This clause used to emit a result nothing consumed, so the encoding stated the
  // provision and did not give it effect: a series whose consent had been withdrawn still returned
  // `one_present` from 67(1) and the refund trigger was unchanged. Found by TRACING consumption, not
  // by reading the register, whose own basis asserted that it `changes the authorisation result for
  // later transactions`. It did not.
  //
  // `FUTURE` is relative to the withdrawal, so the operation is an ordering, not a presence test.
  //
  // STATED LIMITATION: 67(4) opens `Subject to regulation 83(3) to (5)`, which bounds when a
  // withdrawal is EFFECTIVE. Regulation 83 is outside this encoding's scope, two hops from reg 76,
  // so a recorded withdrawal is treated here as an effective one. That is an assumption about
  // availability, not about effect: the effect is stated without qualification.
  put('psr-2017/67/4/series-withdrawal',
    applicability_gate(field_present(f.consent?.series_withdrawn_at) === 'present',
      () => remap_result_domain(ordered_before(f.consent?.series_withdrawn_at, f.transaction?.debit_date), {
        before: 'defeated',            // the withdrawal precedes the transaction: it is a future one
        simultaneous: 'not_defeated',  // not future
        after: 'not_defeated',         // the transaction preceded the withdrawal
        missing_operand: 'undetermined',
      })),
    'A withdrawal defeats the series limb of 67(1)(b) only for transactions FUTURE to it.');

  // reg 67(1): authorised only on consent to the transaction, or to a series of which it forms part.
  // The series limb is defeated by an effective withdrawal under 67(4), which is why 67/4 is computed
  // first and consumed here.
  // THUNKS, NOT CONSTS, since the waiting axis landed: an eager const's presence-probe fires in
  // whatever emission window evaluates it, while the interpreter forces the same expression only
  // on the branch that needs it. Same short-circuit shape as the register's cond, so the two
  // implementations probe the same members of the same run.
  const seriesLimb = () => remap_result_domain(o['psr-2017/67/4/series-withdrawal'].result, {
    not_applicable: true,   // no withdrawal recorded: the series limb stands
    not_defeated: true,     // a withdrawal exists but this transaction is not future to it
    defeated: false,        // 67(4): not regarded as authorised
    undetermined: 'undetermined',
  });
  const txConsent = () => field_present(f.consent?.to_transaction) === 'present';
  const seriesConsent = () => field_present(f.consent?.to_series) === 'present';
  put('psr-2017/67/1/consent',
    txConsent() ? 'one_present'
      : !seriesConsent() ? 'none_present'
        : seriesLimb() === true ? 'one_present'
          : seriesLimb() === false ? 'none_present'
            : 'undetermined',
    seriesConsent() && seriesLimb() === false
      ? 'Series consent was given and withdrawn before this transaction, so 67(4) defeats it.' : undefined);

  put('psr-2017/67/2/b/form', member_of_register(f.consent?.form, f.agreement?.agreed_forms ?? []));
  put('psr-2017/67/2/a/timing',
    conditional_requirement(f.consent?.given_after_execution === true,
      f.agreement?.post_execution_consent_agreed === true),
    'not_applicable means consent was given before execution, where no agreement is needed.');
  put('psr-2017/67/3/withdrawal',
    ordered_before(f.consent?.withdrawn_at, f.order?.irrevocable_from),
    'NEW primitive ordered_before. missing_operand where no withdrawal was made.');

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
      .map((r) => remap_result_domain(r, {
        affirmed: true, denied: false, not_assessed: 'undetermined', $unmapped: 'undetermined',
      })), 'undetermined'));
  put('psr-2017/75/2/pisp-burden',
    applicability_gate(f.transaction?.via_pisp === true, () => held_judgment(f.pisp?.burden_discharged)));
  put('psr-2017/75/3/instrument-not-sufficient',
    open_set_floor([field_present(f.evidence?.instrument_use_record) === 'present']),
    'PARAMETERISED: open_set_floor at arity one. floor_met means the record exists. It does NOT mean authorisation is proved, which is exactly what 75(3) says.');
  put('psr-2017/75/4/supporting-evidence',
    conditional_requirement(f.provider?.claims_fraud_or_gross_negligence === true,
      field_present(f.evidence?.supporting_evidence_given_to_payer) === 'present'));

  // reg 76
  // RULING 3, 2026-08-22. This was a two-valued `||`, so `no_end_event` (nobody notified and no
  // clock, meaning we cannot tell whether the bar bit) became `false` and the refund duty reported
  // as not triggered on facts that establish nothing. Three-valued now: true dominates, then
  // undetermined, then false.
  //
  // DELIBERATELY NOT NAMED as a shape. One instance, one domain, so under E4 it waits. Recorded as
  // REUSE-LOG E7.
  const inTime = remap_result_domain(o['psr-2017/74/1/thirteen-months'].result, {
    within: true,
    exceeded: false,
    overdue: false,
    not_yet_due: 'undetermined',    // not notified, still in time: the bar has not bitten and may not
    no_end_event: 'undetermined',   // not notified and no clock: nothing is established
    out_of_order: 'undetermined',   // notified before the debit it complains of
  });
  const barLifted = remap_result_domain(o['psr-2017/74/2/information-failure'].result, {
    satisfied: true, not_applicable: false, breached: false,
    outstanding: 'undetermined', undetermined: 'undetermined',
  });
  const notBarred = (inTime === true || barLifted === true) ? true
    : (inTime === 'undetermined' || barLifted === 'undetermined') ? 'undetermined'
      : false;
  // 67(1) can now return `undetermined`, so this must be three-valued. A boolean projection would
  // read `we cannot tell whether it was authorised` as `it was authorised`, which is E1's class.
  const unauthorised = remap_result_domain(o['psr-2017/67/1/consent'].result, {
    none_present: true, one_present: false, undetermined: 'undetermined',
  });
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
      remap_result_domain(restored, {
        affirmed: true, denied: false, not_assessed: 'undetermined', $unmapped: 'undetermined',
      })),
    '`undetermined` means restoration was required and nobody has assessed whether it happened.');
  put('psr-2017/76/2/practicable', held_judgment(f.refund?.as_soon_as_practicable));

  put('psr-2017/76/3/fraud-carveout',
    conditional_requirement(f.provider?.reasonable_grounds_to_suspect_fraud === true,
      field_present(f.provider?.poca_notification_in_writing) === 'present'),
    'The carve-out requires BOTH the suspicion and the written notification.');
  // MOVED BELOW 76/3, 2026-08-24, when the waiting axis landed: this const's only consumer is
  // 76/2/deadline, and a shared const's presence-probe fires in the emission window where the
  // const is EVALUATED, not where it is used. Above 76/3 it marked the wrong clause's window and
  // the two implementations disagreed about 76/2/deadline's waiting. A pure reorder; no result
  // moves.
  const carve = f.provider?.reasonable_grounds_to_suspect_fraud === true
    && field_present(f.provider?.poca_notification_in_writing) === 'present';
  const scope = resolutions.P1_carveout_scope;   // 'deadline_only' | 'obligation_suspended' | undefined
  put('psr-2017/76/2/deadline',
    carve
      ? guard_on_unresolved(scope !== undefined, () => remap_result_domain(scope, {
          deadline_only: 'not_applicable_deadline_removed',
          obligation_suspended: 'not_applicable_obligation_suspended',
        }))
      : elapsed_within(f.provider?.became_aware_at, f.refund?.provided_at, 1, 'business_days', f.clock?.now),
    carve && scope === undefined ? 'P1 unresolved: the carve-out disapplies paragraph (2) and the text does not say whether paragraph (1) survives.' : undefined);

  put('psr-2017/76/4/value-date',
    remap_result_domain(ordered_before(f.refund?.credit_value_date, f.transaction?.debit_date), {
      after: 'breached',
      before: 'satisfied',
      simultaneous: 'satisfied',      // `no later than` admits simultaneous
      missing_operand: 'missing_operand',
    }),
    'NEW primitive ordered_before, second user. `no later than` admits simultaneous.');
  put('psr-2017/76/5/a/aspsp-complies',
    applicability_gate(f.transaction?.via_pisp === true,
      () => conjunction_over_results([o['psr-2017/76/1/a/refund'].result === 'equal'], 'undetermined')));
  put('psr-2017/76/5/b/pisp-compensates',
    conditional_requirement(f.pisp?.liable === true && f.aspsp?.compensation_requested === true,
      f.pisp?.compensated === true));
  return o;
}
