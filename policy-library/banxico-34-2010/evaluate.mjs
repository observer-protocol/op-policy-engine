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
    return [c.id, { v: 6, lane: 'none', lane_from: 'lookup' }];
  }
  if (c.lane_override) {
    if (c.lane_override === e.lane) throw new Error(`${c.id}: lane_override restates the lookup's lane; R14`);
    return [c.id, { v: 6, lane: c.lane_override, lane_from: 'override' }];
  }
  return [c.id, { v: 6, lane: e.lane, lane_from: 'lookup' }];
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

const __elapsed_within = (start, end, limit, unit, now) => {
  const s = Date.parse(start);
  if (end === null || end === undefined) {
    if (now === null || now === undefined) return 'no_end_event';   // no clock: cannot tell, and says so
    const t = Date.parse(now);
    if (Number.isNaN(s) || Number.isNaN(t)) return 'no_end_event';
    if (t < s) return 'out_of_order';   // the clock precedes the event that starts the period
    // THE SAME PREDICATE decides both vocabularies, so `not_yet_due` and `within` can never
    // disagree about where the boundary is.
    return withinLimit(s, t, limit, unit) ? 'not_yet_due' : 'overdue';
  }
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return 'no_end_event';
  // AN END EVENT CANNOT PRECEDE THE EVENT THAT TRIGGERS IT. Added 2026-08-22. A negative interval is
  // under every limit, so this returned `within` for a dictamen dated before the aviso answering it,
  // and firmeza read `not_attached` off an incoherent record. Tested INSIDE the primitive rather than
  // at the call sites: all four sites in the two domains measure an end event that must follow its
  // start, so they do not differ, and a call-site guard would be forgotten on the fifth.
  if (e < s) return 'out_of_order';
  return withinLimit(s, e, limit, unit) ? 'within' : 'exceeded';
};

const select_parameter_by_predicate = (p, ifTrue, ifFalse) => (p ? ifTrue : ifFalse);
const __field_present = (v) => (v === null || v === undefined || v === '' ? 'absent' : 'present');
const __all_present = (vs) => (vs.every((v) => field_present(v) === 'present') ? 'all_present' : 'some_absent');
const __any_present = (alts) => (alts.some((v) => field_present(v) === 'present') ? 'one_present' : 'none_present');
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
const __member_of_register = (c, reg) => (field_present(c) === 'absent' ? 'no_candidate' : (reg.includes(c) ? 'member' : 'not_member'));
const member_of_enumeration = (v, en) => (en.includes(v) ? 'member' : 'not_member');
const distinct_members_at_least = (items, min, independent) => {
  const kept = [];
  for (const it of items) if (kept.every((k) => independent(k, it))) kept.push(it);
  return kept.length >= min ? 'met' : 'not_met';
};
const none_of_class_present = (items, prohibited) =>
  (items.some((i) => prohibited.includes(i)) ? 'prohibited_present' : 'clear');
const open_set_floor = (results) => (results.every((r) => r === true) ? 'floor_met' : 'floor_not_met');
const __held_judgment = (a) => (a === undefined || a === null ? 'not_assessed' : a);
// CLOSED 2026-08-22. It accepted anything and read every unrecognised value as failure, so a caller
// passing a token nobody registered got a silent `not_satisfied` instead of an error.
const CONJUNCTION_TOKENS = new Set([true, false, 'satisfied', 'undetermined']);
const conjunction_over_results = (results, undeterminedIs) => {
  for (const r of results) {
    if (!CONJUNCTION_TOKENS.has(r)) {
      throw new Error(`conjunction_over_results: unrecognised result ${JSON.stringify(r)}`);
    }
  }
  if (results.includes('undetermined')) return undeterminedIs === 'fail' ? 'not_satisfied' : 'undetermined';
  return results.every((r) => r === true || r === 'satisfied') ? 'satisfied' : 'not_satisfied';
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


// tracked rebindings: the wrapped names are what the clause set calls
const field_present = __trackArg((v) => __field_present(v));
const all_present = __trackArg(__all_present);
const any_present = __trackArg(__any_present);
const elapsed_within = __trackToken(__elapsed_within);
const member_of_register = __trackToken(__member_of_register);
const held_judgment = __trackToken(__held_judgment);

// ─── the clause set ─────────────────────────────────────────────────────────────────────────────
const AUTH_FACTOR_KINDS = ['2.6.a.i_knowledge', '2.6.a.ii_device_or_chip', '2.6.a.iii_biometric', '2.6.a.iv_authorised_other'];

export function evaluate(facts, resolutions = {}) {
  // ENTRY reset, not only per-put: a consumer reading the returned store after the run (a
  // stringify, a resultOf) fires the tracking proxy, and state left by those reads must not leak
  // into the next run's first emission window. Found by the cross-implementation sweep: run N's
  // serialisation polluted run N+1's first clause.
  __origins = new Set(); __meaning = false;
  const out = __trackStore({});
  // The record opens v, lane, lane_from, waiting, from the register. Absent `v`: REUSE-LOG E30.
  const put = (id, result, note) => {
    const waiting = __classify(id, result);
    out[id] = note === undefined ? { ...LANE_STAMP[id], waiting, result } : { ...LANE_STAMP[id], waiting, result, note };
    __origins = new Set(); __meaning = false;
  };

  // 2.6(a) — two INDEPENDENT elements from the enumeration.
  // Found by the E9 sweep. An ABSENT factor list returned `not_met`, asserting the two-factor
  // requirement failed on a fact nobody supplied. A RECORDED EMPTY LIST still returns `not_met`,
  // which is right: it says no factors were used. `field_present` keeps the two apart, and an empty
  // array is present.
  const factorsRecorded = field_present(facts.operation?.auth_factors) === 'present';
  const factors = facts.operation?.auth_factors ?? [];
  const allKnown = factors.every((f) => member_of_enumeration(f, AUTH_FACTOR_KINDS) === 'member');
  // RULING 2, 2026-08-22. This returned `not_met` when a factor kind was unrecognised, which asserts
  // the element FAILED on evidence that establishes nothing. An unclassifiable fact is
  // `undetermined`. It is guard_on_unresolved rather than applicability_gate: the requirement
  // applies, its input cannot be used.
  put('34-2010/2.6/a/two-factor',
    guard_on_unresolved(factorsRecorded && allKnown,
      () => distinct_members_at_least(factors, 2, (a, b) => a !== b)),
    'Independence approximated as distinctness of kind. Two factors of one kind do not count as two. `undetermined` means a factor kind is not in the 2.6(a) enumeration and cannot be classified.');

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
  // E9, 2026-08-22. `=== true` normalised an ABSENT fact to `false`, so nobody recording where the
  // operation happened selected the fourth paragraph's 45 days, a dictamen on day 120 read `exceeded`
  // and firmeza attached. ABSENT IS NOT DOMESTIC: every operation happened somewhere, so the absence
  // of the fact is ignorance rather than a recorded negative. `field_present` separates the three,
  // because a recorded `false` is present and an absent field is not.
  const abroadRecorded = field_present(facts.operation?.executed_abroad) === 'present';
  const abroad = facts.operation?.executed_abroad === true;
  const unitRes = resolutions.A1_dias_unit;            // 'business_days' | 'calendar_days' | undefined
  // ROUTED THROUGH THE CLAUSE'S RESULT, 2026-08-23. The register defines this clause as the one that
  // selects which paragraph's period applies, and until now the selection was made by the shared
  // `abroad` variable while the clause merely reported it. The clause's stated effect was not its
  // actual effect, which is the defect psr-2017/67/4 had. The clause is emitted FIRST and the period
  // is derived FROM ITS RESULT, so the description is now true by construction rather than by
  // anyone remembering to keep it true.
  put('34-2010/3.6/p5/foreign-deadline',
    guard_on_unresolved(abroadRecorded,
      () => (abroad ? 'selected_180_calendar_days' : 'selected_fourth_paragraph')),
    '`undetermined` means whether the operation was executed abroad was not supplied, so neither the fourth nor the fifth paragraph can be selected.');
  const period = remap_result_domain(out['34-2010/3.6/p5/foreign-deadline'].result, {
    selected_180_calendar_days: { limit: 180, unit: 'calendar_days' },   // fifth paragraph, explicitly naturales
    selected_fourth_paragraph: { limit: 45, unit: unitRes },             // fourth paragraph, unit UNRESOLVED
    undetermined: { limit: undefined, unit: undefined },
  });
  // THE ROW MUST SAY WHICH PERIOD IT APPLIED. The register defines this clause as the 45 `Días`
  // deadline, so a bare `within` at day 120 reads as a contradiction of the clause it sits on. What
  // actually happened is that p5/foreign-deadline selected the fifth paragraph's period and this
  // clause applied it. Stating the applied period on the row is what stops the table contradicting
  // the prose that explains it.
  const appliedPeriod = `${period.limit} ${period.unit ?? 'UNRESOLVED'}` +
    (out['34-2010/3.6/p5/foreign-deadline'].result === 'selected_180_calendar_days'
      ? ', selected by p5/foreign-deadline (fifth paragraph)' : ', fourth paragraph');
  put('34-2010/3.6/p4/deadline',
    guard_on_unresolved(abroadRecorded && period.unit !== undefined,
      () => elapsed_within(facts.notice?.received_at, facts.dictamen?.made_available_at, period.limit, period.unit, facts.clock?.now)),
    !abroadRecorded
      ? 'Whether the operation was executed abroad was not supplied, so neither period can be selected.'
      : period.unit === undefined
        ? 'A1 unresolved: the unit of `cuarenta y cinco Días` was not supplied.'
        : `Period applied: ${appliedPeriod}.`);

  // the floor — necessary, never sufficient
  const elementResults = [
    out['34-2010/3.6/a/evidence'].result === 'present',
    out['34-2010/3.6/a/verification-method'].result === 'present',
    out['34-2010/3.6/b/time'].result === 'present',
    out['34-2010/3.6/c/parties'].result === 'all_present',
    // RULING 4, 2026-08-22. This was `!== 'breached'`, an open-ended negative test: every token that
    // was not `breached` counted as meeting the element. E1 widened conditional_requirement from
    // three outcomes to five, so `outstanding` and `undetermined` would have passed. Now total.
    remap_result_domain(out['34-2010/3.6/d/device-address'].result, {
      satisfied: true,
      not_applicable: true,      // the issuer holds no address, which the source treats as no breach
      breached: false,
      outstanding: false,
      undetermined: false,
    }),
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
      remap_result_domain(copyRun, {
        within: true,
        exceeded: false,
        overdue: false,
        not_yet_due: 'outstanding',
        no_end_event: 'undetermined',
        out_of_order: 'undetermined',   // the copy is dated before the dictamen it answers
      })),
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
      // RULING 1, 2026-08-22. This was `=== 'affirmed' ? true : 'undetermined'`, so an explicit
      // `denied` and an unanswered question reached firmeza identically. A denial is a person
      // having answered. held_judgment's domain is OPEN, so `$unmapped` is declared rather than
      // implied: a judgment token nobody registered cannot be used, which is undetermined.
      remap_result_domain(out['34-2010/3.6/p4/language'].result, {
        affirmed: true,
        denied: false,
        not_assessed: 'undetermined',
        $unmapped: 'undetermined',
      }),
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
