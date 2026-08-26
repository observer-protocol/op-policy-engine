#!/usr/bin/env node
/**
 * MAS/IMDA Shared Responsibility Framework (Guidelines of 24 October 2024, effective 16 December
 * 2024) with the EUPG paragraphs it incorporates. Standalone hand evaluator: the second
 * implementation the parity harness compares against the interpreter's reading of register.json.
 * No engine integration, no signing.
 *
 * WHAT THIS FILE IS FOR. author-evaluation.mjs writes the expression trees the interpreter runs;
 * this file re-expresses every clause as plain functions, written from the clause text and the
 * fact vocabulary rather than from the trees. Where the two disagree on a record, parity says so,
 * and the disagreement is the finding. The evaluation ORDER is the same (the register's emit order),
 * because a clause reads only clauses emitted before it (R3).
 *
 * Primitives are the estate's set, implemented here by copy (there is no shared package for the
 * hand side by design: two implementations, one vocabulary). Ambiguities are inputs, never
 * defaults: a clause whose answer depends on one that was not supplied returns `undetermined`.
 * Ungrounded terms are the same: the evaluator never supplies a meaning.
 *
 * THE NO-DEFAULT RULE, stated once: every boolean fact is read through a presence guard, so an
 * unsupplied fact is `undetermined` and never `false`; every precondition's facts are guarded
 * before conditional_requirement can answer `not_applicable`; and the consumer outcome (6.7) is
 * reached only through affirmative non-liability findings on both prior tiers.
 */
import { readFileSync } from 'node:fs';
const DAY = 86400000;

// ─── the record opening: v7, lane, lane_from, from THIS DOMAIN'S register.json ──────────────────
// The lane lookup lives in the register, one copy, built by _phase0/build-register.mjs. The no-lane
// and same-lane-override throws are the interpreter's (R14, E30), enforced here identically.
const __REG = JSON.parse(readFileSync(new URL('./register.json', import.meta.url), 'utf8'));
const BY_ID = Object.fromEntries(__REG.clauses.map((c) => [c.id, c]));
const LANE_STAMP = Object.fromEntries(__REG.clauses.map((c) => {
  const e = __REG.lanes.lookup[c.disposition];
  if (e === undefined) throw new Error(`${c.id}: disposition ${c.disposition} has no lane lookup entry`);
  if (e.no_lane !== undefined) {
    if (c.lane_override) throw new Error(`${c.id}: lane_override on a laneless disposition`);
    return [c.id, { v: 7, lane: 'none', lane_from: 'lookup' }];
  }
  if (c.lane_override) {
    if (c.lane_override === e.lane) throw new Error(`${c.id}: lane_override restates the lookup's lane; R14`);
    return [c.id, { v: 7, lane: c.lane_override, lane_from: 'override' }];
  }
  return [c.id, { v: 7, lane: e.lane, lane_from: 'lookup' }];
}));

// ─── the waiting axis: independent tracking against the register's one-copy vocabulary ──────────
// Origins accumulate between put() calls and reset after each emission; the record store is proxied
// so a read of another clause's record marks that record's class when it is itself waiting.
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

// ─── primitives, by copy ────────────────────────────────────────────────────────────────────────
const __field_present = (v) => (v === null || v === undefined || v === '' ? 'absent' : 'present');
const __member_of_enumeration = (v, en) => (en.includes(v) ? 'member' : 'not_member');
const __member_of_register = (c, reg) => (__field_present(c) === 'absent' ? 'no_candidate' : (reg.includes(c) ? 'member' : 'not_member'));
const __held_judgment = (a) => (a === undefined || a === null ? 'not_assessed' : a);
const withinLimit = (s, e, limit, unit) => {
  if (unit === 'calendar_days') return (e - s) <= limit * DAY;
  if (unit === 'business_days') {
    let n = 0;
    for (let t = s + DAY; t <= e; t += DAY) { const d = new Date(t).getUTCDay(); if (d !== 0 && d !== 6) n++; }
    return n <= limit;
  }
  throw new Error(`unknown calendar unit: ${unit}`);
};
const __elapsed_within = (start, end, limit, unit, now) => {
  if (start === null || start === undefined) return 'no_end_event';
  const s = Date.parse(start);
  if (Number.isNaN(s)) return 'no_end_event';
  if (end === null || end === undefined) {
    if (now === null || now === undefined) return 'no_end_event';
    const t = Date.parse(now);
    if (Number.isNaN(t)) return 'no_end_event';
    if (t < s) return 'out_of_order';
    return withinLimit(s, t, limit, unit) ? 'not_yet_due' : 'overdue';
  }
  const e = Date.parse(end);
  if (Number.isNaN(e)) return 'no_end_event';
  if (e < s) return 'out_of_order';
  return withinLimit(s, e, limit, unit) ? 'within' : 'exceeded';
};
const __ordered_before = (a, b) => {
  if (a === null || a === undefined || b === null || b === undefined) return 'missing_operand';
  const x = Date.parse(a), y = Date.parse(b);
  if (Number.isNaN(x) || Number.isNaN(y)) return 'missing_operand';
  return x < y ? 'before' : x > y ? 'after' : 'simultaneous';
};
const conditional_requirement = (pre, res) => {
  if (!pre) return 'not_applicable';
  if (res === true) return 'satisfied';
  if (res === false) return 'breached';
  if (res === 'outstanding') return 'outstanding';
  if (res === 'undetermined') return 'undetermined';
  throw new Error(`conditional_requirement: unrecognised requirement result ${JSON.stringify(res)}`);
};
const CONJ = new Set([true, false, 'satisfied', 'undetermined']);
const conjunction_over_results = (rs) => {
  for (const r of rs) if (!CONJ.has(r)) throw new Error(`conjunction_over_results: unrecognised result ${JSON.stringify(r)}`);
  if (rs.includes('undetermined')) return 'undetermined';
  return rs.every((r) => r === true || r === 'satisfied') ? 'satisfied' : 'not_satisfied';
};
const disjunction_over_results = (rs) => {
  for (const r of rs) if (!CONJ.has(r)) throw new Error(`disjunction_over_results: unrecognised result ${JSON.stringify(r)}`);
  if (rs.some((r) => r === true || r === 'satisfied')) return true;
  if (rs.includes('undetermined')) return 'undetermined';
  return false;
};
const strictBoolean = (v, where) => { if (v === true || v === false) return v; throw new Error(`${where}: expected a strict boolean, got ${JSON.stringify(v)}`); };
const applicability_gate = (applies, compute) => (strictBoolean(applies, 'applicability_gate') ? compute() : 'not_applicable');
const guard_on_unresolved = (usable, compute) => (strictBoolean(usable, 'guard_on_unresolved') ? compute() : 'undetermined');
const remap_result_domain = (value, mapping) => {
  const key = typeof value === 'string' ? value : JSON.stringify(value);
  if (Object.prototype.hasOwnProperty.call(mapping, key)) return mapping[key];
  if (Object.prototype.hasOwnProperty.call(mapping, '$unmapped')) return mapping.$unmapped;
  throw new Error(`remap_result_domain: no mapping for ${JSON.stringify(value)}`);
};

// tracked rebindings: the wrapped names are what the clause set calls
const field_present = __trackArg(__field_present);
const member_of_enumeration = __trackToken(__member_of_enumeration);
const member_of_register = __trackToken(__member_of_register);
const held_judgment = __trackToken(__held_judgment);
const elapsed_within = __trackToken(__elapsed_within);
const ordered_before = __trackToken(__ordered_before);

// ─── the reading shapes, as functions ───────────────────────────────────────────────────────────
// pres probes the ARGUMENT (an unsupplied fact marks a fact origin); every boolean fact is read
// through gb/gr/grFalse so that absence is undetermined and never false.
const pres = (v) => field_present(v) === 'present';
const gb = (v, T, F) => guard_on_unresolved(pres(v), () => (v === true ? T : F));
const gr = (v) => guard_on_unresolved(pres(v), () => v === true);
const grFalse = (v) => guard_on_unresolved(pres(v), () => v === false);
const JMAP = { affirmed: true, denied: false, not_assessed: 'undetermined', $unmapped: 'undetermined' };
const jr = (v) => remap_result_domain(held_judgment(v), JMAP);
// a conditional requirement whose precondition facts are guarded: usable is computed by the caller
// with the same short-circuit as the register's `and`; pre and req are both evaluated (the
// interpreter forces primitive arguments eagerly), pre first.
const cr = (usable, pre, req) => guard_on_unresolved(usable, () => { const p = pre(); const r = req(); return conditional_requirement(p, r); });
// F if any failing condition holds (in order, short-circuit), else T if every holding condition
// holds (in order, short-circuit), else undetermined.
const failsThenHolds = (fails, holds, F, T) => (fails.some((f) => f()) ? F : guard_on_unresolved(holds.every((h) => h()), () => T));
// LAZY, in the register's order: `or` stops at the first failing requirement, so a second judgment
// is never consulted (and never marks a waiting origin) once the first has denied. Found by parity.
const allReq = (...thunks) => failsThenHolds(thunks.map((t) => () => t() === false), thunks.map((t) => () => t() === true), false, true);
const COMMENCEMENT = '2025-06-16T00:00:00+08:00';
const commencementOf = (executedAt) => remap_result_domain(ordered_before(executedAt, COMMENCEMENT), { before: 'not_yet_in_force', after: 'in_force', simultaneous: 'in_force', missing_operand: 'missing_operand' });

export function evaluate(facts, resolutions = {}) {
  __origins = new Set(); __meaning = false;
  const o = __trackStore({});
  const put = (id, result, note, extra) => {
    const waiting = __classify(id, result);
    o[id] = { ...LANE_STAMP[id], waiting, result, ...(note === undefined ? {} : { note }), ...(extra ?? {}) };
    __origins = new Set(); __meaning = false;
  };
  const noResult = (id) => {
    const c = BY_ID[id];
    const rec = { ...LANE_STAMP[id], waiting: 'none' };
    if (c.disposition === 'DEFINITIONAL') { rec.no_result = 'DEFINITIONAL'; rec.supplies = c.operative_weight ?? 'a meaning other clauses consume'; }
    else if (c.disposition === 'INSTRUCTION') { rec.refused = 'INSTRUCTION'; rec.why = 'directs an act; no fact of the claim makes it true or false, so it has no result domain'; }
    else throw new Error(`${id}: ${c.disposition} has no result domain and no declared emission`);
    o[id] = rec;
    __origins = new Set(); __meaning = false;
  };
  const res = (id) => o[id].result;   // through the proxy: a waiting input propagates its class
  const f = facts;
  const r = resolutions;
  const A = f.account ?? {}, S = f.scam ?? {}, T = f.transaction ?? {}, FI = f.fi ?? {}, H = f.holder ?? {}, TC = f.telco ?? {}, SM = f.sms ?? {}, CLM = f.claim ?? {}, U = f.user ?? {};
  const FE = FI.events ?? {}, FCO = FI.cooling_off ?? {}, FAL = FI.alerts ?? {}, FKS = FI.kill_switch ?? {}, FSV = FI.surveillance ?? {}, FINV = FI.investigation ?? {}, FOUT = FI.outcome ?? {}, FDET = FI.detection ?? {}, TF = TC.filter ?? {}, CREC = CLM.records ?? {};
  const NOW = f.clock?.now;

  // ─── the ungrounded shape (the interpreter's order: meaning first, then applies, then compute) ──
  const ungrounded = (id, applies, compute) => {
    const t = BY_ID[id].rests_on_ungrounded_term;
    const terms = r.ungrounded_terms ?? {};
    if (Object.prototype.hasOwnProperty.call(terms, t) && terms[t] === undefined) {
      throw new Error(`ungrounded(${t}): the meaning is SUPPLIED WITH THE VALUE undefined, which is neither a meaning nor an absence. Supply the meaning or omit the key; E30, E34.`);
    }
    const supplied = terms[t];
    if (supplied !== undefined) {
      for (const k of (__REG.ungrounded_terms?.shapes?.[t] ?? [])) {
        if (supplied[k] === undefined) throw new Error(`ungrounded(${t}): the supplied meaning is missing ${JSON.stringify(k)}, which the clause's own evaluation consults. The required keys are derived from the register (ungrounded_terms.shapes), not hand-written; E34.`);
      }
    }
    if (supplied === undefined) {
      __meaning = true;
      put(id, 'undetermined', undefined, { undetermined_because: `the operative term \`${t}\` is ungrounded: neither the SRF Guidelines nor the EUPG defines it or points to what does` });
      return;
    }
    if (strictBoolean(applies(), `ungrounded(${id})`) === false) { put(id, 'not_applicable'); return; }
    let used = false;
    const meaning = (key) => { used = true; return supplied[key]; };
    const value = compute(meaning);
    if (!used) { put(id, value); return; }
    put(id, `${value}_on_supplied_meaning`, undefined, { rests_on: 'a meaning supplied by the institution, not by the Guidelines', term: t });
  };
  const table = (id, inputs) => {
    const t = BY_ID[id].evaluate;
    const row = t.rows.find((rw) => t.inputs.every((inp) => rw.match[inp.name] === inputs[inp.name]));
    if (row === undefined) throw new Error(`${id}: no row for ${JSON.stringify(inputs)}`);
    put(id, row.outcome, row.note);
  };
  const undet = (x) => x === 'undetermined';

  // ═══ SCOPE ════════════════════════════════════════════════════════════════════════════════════
  put('srf/1.1/a/responsible-fi', guard_on_unresolved(pres(A.issuer_type), () => member_of_enumeration(A.issuer_type, ['bank', 'relevant_psp'])));
  put('srf/1.1/b/responsible-telco', guard_on_unresolved(pres(TC.operator_type), () => member_of_enumeration(TC.operator_type, ['mno'])),
    'not_member for an MVNO subscriber (A18). Recorded beside the Telco tier; the tier gates on 7.7, not on this.');
  put('srf/1.1/fn1/card-exclusion', gb(A.card_transaction, 'excluded', 'not_excluded'));
  noResult('srf/1.4/read-with-legislation');
  put('srf/2.1/protected-account/a/individuals', guard_on_unresolved(pres(A.holder_type), () => member_of_enumeration(A.holder_type, ['individual'])),
    'The SRF\'s limb: individuals only. A sole proprietor is not_member here and a member under the EUPG (A1).');
  put('srf/2.1/protected-account/b/balance-or-credit', remap_result_domain(disjunction_over_results([gr(A.balance_capable_over_1000_sgd), gr(A.credit_facility)]), { true: 'met', false: 'not_met', undetermined: 'undetermined' }));
  put('srf/2.1/protected-account/c/electronic', gb(A.electronic_payments_capable, 'met', 'not_met'));
  const isPsp = () => A.issuer_type === 'relevant_psp';
  put('srf/2.1/protected-account/d/psp-emoney', cr(pres(A.issuer_type), isPsp, () => gr(A.stores_specified_emoney)),
    'not_applicable means the issuer is not a relevant payment service provider, where limb (d) never arises.');
  put('srf/2.1/protected-account', failsThenHolds(
    [() => res('srf/2.1/protected-account/a/individuals') === 'not_member', () => res('srf/2.1/protected-account/b/balance-or-credit') === 'not_met', () => res('srf/2.1/protected-account/c/electronic') === 'not_met', () => res('srf/2.1/protected-account/d/psp-emoney') === 'breached'],
    [() => res('srf/2.1/protected-account/a/individuals') === 'member', () => res('srf/2.1/protected-account/b/balance-or-credit') === 'met', () => res('srf/2.1/protected-account/c/electronic') === 'met', () => ['satisfied', 'not_applicable'].includes(res('srf/2.1/protected-account/d/psp-emoney'))],
    'not_satisfied', 'satisfied'),
    'One failing limb decides not_satisfied; satisfied needs all four affirmative (limb (d) may be not_applicable by its own words).');
  put('srf/2.1/seemingly-authorised/a/impersonation', guard_on_unresolved(pres(S.impersonated_entity_type), () => member_of_enumeration(S.impersonated_entity_type, ['sg_government_agency', 'sg_incorporated_entity', 'foreign_entity_serving_sg_residents'])));
  put('srf/2.1/seemingly-authorised/b/digital-messaging', guard_on_unresolved(pres(S.contact_platform), () => member_of_enumeration(S.contact_platform, ['sms', 'email', 'whatsapp', 'social_media', 'other_digital'])));
  put('srf/2.1/seemingly-authorised/c/fabricated-platform', gb(S.credentials_entered_on_fabricated_platform, 'met', 'not_met'));
  put('srf/2.1/seemingly-authorised/d/unintended', held_judgment(S.transactions_unintended), 'affirmed means the account user did not intend the transactions. not_assessed is a person\'s absence, not a finding.');
  const unintended = () => remap_result_domain(res('srf/2.1/seemingly-authorised/d/unintended'), JMAP);
  put('srf/2.1/seemingly-authorised', failsThenHolds(
    [() => res('srf/2.1/seemingly-authorised/a/impersonation') === 'not_member', () => res('srf/2.1/seemingly-authorised/b/digital-messaging') === 'not_member', () => res('srf/2.1/seemingly-authorised/c/fabricated-platform') === 'not_met', () => unintended() === false],
    [() => res('srf/2.1/seemingly-authorised/a/impersonation') === 'member', () => res('srf/2.1/seemingly-authorised/b/digital-messaging') === 'member', () => res('srf/2.1/seemingly-authorised/c/fabricated-platform') === 'met', () => unintended() === true],
    'not_satisfied', 'satisfied'));
  const scopeFi = () => remap_result_domain(res('srf/1.1/a/responsible-fi'), { member: true, not_member: false, undetermined: 'undetermined' });
  const scopeCard = () => remap_result_domain(res('srf/1.1/fn1/card-exclusion'), { not_excluded: true, excluded: false, undetermined: 'undetermined' });
  const scopePa = () => remap_result_domain(res('srf/2.1/protected-account'), { satisfied: true, not_satisfied: false, undetermined: 'undetermined' });
  const scopeSat = () => remap_result_domain(res('srf/2.1/seemingly-authorised'), { satisfied: true, not_satisfied: false, undetermined: 'undetermined' });
  put('srf/7.1.1/relevant-claim', failsThenHolds(
    [() => scopeFi() === false, () => scopeCard() === false, () => scopePa() === false, () => scopeSat() === false],
    [() => scopeFi() === true, () => scopeCard() === true, () => scopePa() === true, () => scopeSat() === true],
    'not_relevant', 'relevant_claim'),
    'One affirmative scope failure is not_relevant whatever the others; relevant_claim needs all four affirmative.');
  for (const id of ['srf/2.1/high-risk-activities', 'srf/2.1/money', 'srf/2.1/sms', 'srf/2.1/sender-id-sms', 'srf/2.1/subscriber', 'srf/2.2/undefined-expressions', 'eupg/2.1/unauthorised-transaction', 'eupg/2.1/access-code', 'eupg/2.1/protected-account/a/sole-proprietors']) noResult(id);

  // ═══ FI TIER ══════════════════════════════════════════════════════════════════════════════════
  noResult('srf/4.1/eupg-s4-applies');
  // guards for reading fi.events.new_device_login only where the issuer is a PSP (register's `and`/`or` short-circuit)
  const newDeviceGuard = () => pres(A.issuer_type) && (!isPsp() || pres(FE.new_device_login));
  const pspNewDeviceLogin = () => isPsp() && FE.new_device_login === true;
  put('srf/4.2.1/cooling-off', cr(pres(FE.token_activated) && newDeviceGuard(), () => FE.token_activated === true || pspNewDeviceLogin(),
    () => allReq(() => jr(FCO.at_least_12h_imposed), () => jr(FCO.high_risk_prevented))),
    'The 12-hour floor and the block on high-risk activities are the FI\'s recorded assessments (F-05). not_applicable: no token activated and no PSP new-device login.');
  noResult('srf/4.2.1/fn5/non-stp-activation');
  put('srf/4.2.2/i/token-activation-alert', cr(pres(FE.token_activated), () => FE.token_activated === true, () => jr(FAL.token_activation_real_time)));
  put('srf/4.2.2/ii/new-device-login-alert', cr(newDeviceGuard(), pspNewDeviceLogin, () => jr(FAL.new_device_login_real_time)),
    'not_applicable for a bank-issued account, or a PSP-issued account with no new-device login.');
  put('srf/4.2.2/iii/high-risk-activity-alert', cr(pres(FE.high_risk_activity), () => FE.high_risk_activity === true, () => jr(FAL.high_risk_activity_real_time)));
  {
    const ids = ['srf/4.2.2/i/token-activation-alert', 'srf/4.2.2/ii/new-device-login-alert', 'srf/4.2.2/iii/high-risk-activity-alert'];
    put('srf/4.2.2/alerts', ids.some((i) => res(i) === 'breached') ? 'breached'
      : applicability_gate(!ids.every((i) => res(i) === 'not_applicable'),
        () => guard_on_unresolved(ids.every((i) => ['satisfied', 'not_applicable'].includes(res(i))), () => 'satisfied')),
      'breached if any limb was; not_applicable only if all three never arose; satisfied needs every limb satisfied or never arisen; else undetermined.');
  }
  put('eupg/3.1/instructed-notifications', gb(H.instructed_transaction_notifications, 'instructed', 'not_instructed'));
  put('eupg/2.1/transaction-notification-threshold/a/holder-set', cr(pres(H.notification_threshold_set), () => H.notification_threshold_set === true, () => jr(T.above_holder_threshold)));
  ungrounded('eupg/2.1/transaction-notification-threshold/b/industry-baseline',
    () => H.notification_threshold_set === false || !pres(H.notification_threshold_set),
    (meaning) => guard_on_unresolved(pres(H.notification_threshold_set) && field_present(meaning('baseline_sgd')) === 'present',
      () => remap_result_domain(held_judgment(T.above_baseline_threshold), { affirmed: 'above', denied: 'not_above', not_assessed: 'undetermined', $unmapped: 'undetermined' })));
  put('srf/4.2.3/above-threshold', guard_on_unresolved(pres(H.notification_threshold_set), () => (H.notification_threshold_set === true
    ? remap_result_domain(res('eupg/2.1/transaction-notification-threshold/a/holder-set'), { satisfied: 'above', breached: 'not_above', not_applicable: 'undetermined', outstanding: 'undetermined', undetermined: 'undetermined' })
    : remap_result_domain(res('eupg/2.1/transaction-notification-threshold/b/industry-baseline'), { above: 'above', not_above: 'not_above', above_on_supplied_meaning: 'above_on_supplied_meaning', not_above_on_supplied_meaning: 'not_above_on_supplied_meaning', not_applicable: 'undetermined', undetermined: 'undetermined' }))),
    'Selects the limb by whether the holder set a threshold. The _on_supplied_meaning tokens are carried, not laundered (F-08: the attribution stops at 4.2.3).');
  const aboveThreshold = () => ['above', 'above_on_supplied_meaning'].includes(res('srf/4.2.3/above-threshold'));
  put('srf/4.2.3/outgoing-transaction-notification', cr(!undet(res('eupg/3.1/instructed-notifications')) && !undet(res('srf/4.2.3/above-threshold')),
    () => res('eupg/3.1/instructed-notifications') === 'instructed' && aboveThreshold(), () => jr(FAL.outgoing_transaction_real_time)),
    'not_applicable: the holder did not instruct notifications, or the transaction was below the applicable threshold (A20). Whether the threshold rested on a supplied meaning is visible on srf/4.2.3/above-threshold, not here (F-08).');
  put('srf/4.2.4/reporting-channel', gb(FI.reporting_channel?.available_at_all_times, 'available', 'not_available'));
  put('srf/4.2.4/kill-switch', guard_on_unresolved(pres(FKS.self_service) && pres(FKS.blocks_mobile_and_online), () => (FKS.self_service === true && FKS.blocks_mobile_and_online === true ? 'provided' : 'not_provided')));
  put('srf/4.2.4/duty', failsThenHolds(
    [() => res('srf/4.2.4/reporting-channel') === 'not_available', () => res('srf/4.2.4/kill-switch') === 'not_provided'],
    [() => res('srf/4.2.4/reporting-channel') === 'available', () => res('srf/4.2.4/kill-switch') === 'provided'],
    'breached', 'satisfied'), 'No precondition: this duty is never not_applicable.');
  put('srf/4.4/fraud-surveillance-commencement', commencementOf(T.executed_at), 'in_force when the transaction executed on or after 16 June 2025 (Singapore time). missing_operand: no execution instant recorded.');
  put('srf/4.2.5/fn8/rapid-drain', held_judgment(FSV.rapid_drain_criteria_met), 'Footnote 8, held rather than measured (F-05).');
  put('srf/4.2.5/surveillance-in-place', gb(FSV.real_time_in_place, 'in_place', 'not_in_place'));
  const rapidDrain = () => remap_result_domain(res('srf/4.2.5/fn8/rapid-drain'), JMAP);
  put('srf/4.2.5/response', cr(!undet(rapidDrain()), () => rapidDrain() === true,
    () => guard_on_unresolved(pres(FSV.response), () => remap_result_domain(member_of_enumeration(FSV.response, ['blocked_until_verified', 'notified_and_held_24h']), { member: true, not_member: false }))),
    'not_applicable: the account was not rapidly drained of a material sum. undetermined: nobody assessed whether it was.');
  const fromCommencement = (id, compute) => { const c = res(id); if (c === 'not_yet_in_force') return 'not_applicable'; if (c === 'missing_operand') return 'undetermined'; if (c === 'in_force') return compute(); throw new Error(`${id}: ${c}`); };
  put('srf/4.2.5/duty', fromCommencement('srf/4.4/fraud-surveillance-commencement', () => failsThenHolds(
    [() => res('srf/4.2.5/surveillance-in-place') === 'not_in_place', () => res('srf/4.2.5/response') === 'breached'],
    [() => res('srf/4.2.5/surveillance-in-place') === 'in_place', () => ['satisfied', 'not_applicable'].includes(res('srf/4.2.5/response'))],
    'breached', 'satisfied')),
    'not_applicable before 16 June 2025 (4.4). From commencement: surveillance in place is unconditional and the response is required only on a rapid drain.');
  noResult('srf/4.3/scheduled-downtime');
  const DUTIES = ['srf/4.2.1/cooling-off', 'srf/4.2.2/alerts', 'srf/4.2.3/outgoing-transaction-notification', 'srf/4.2.4/duty', 'srf/4.2.5/duty'];
  // A3: what a never-arisen duty counts as. Unresolved: undetermined. NO DEFAULT.
  const a3 = () => guard_on_unresolved(r.A3_not_applicable_duty !== undefined, () => remap_result_domain(r.A3_not_applicable_duty, { counts_as_complied: true, not_a_compliance_finding: 'undetermined', $unmapped: 'undetermined' }));
  const dutyOk = (id) => { const v = res(id); if (v === 'satisfied') return true; if (v === 'breached') return false; if (v === 'not_applicable') return a3(); if (v === 'outstanding' || v === 'undetermined') return 'undetermined'; throw new Error(`${id}: ${v}`); };
  const dutyBreach = (id) => remap_result_domain(res(id), { breached: true, satisfied: false, not_applicable: false, outstanding: 'undetermined', undetermined: 'undetermined' });
  put('srf/6.4/a/fi-complied-all', conjunction_over_results(DUTIES.map(dutyOk)),
    'satisfied only on five affirmative results; a never-arisen duty composes under A3\'s supplied resolution and blocks the tier unresolved.');
  put('srf/6.2/any-fi-breach', disjunction_over_results(DUTIES.map(dutyBreach)),
    'true on one established breach whatever the others; false only on five affirmative non-breach results.');
  put('srf/6.2/loss-arises-from-fi-noncompliance', held_judgment(FI.loss_arises_from_noncompliance));
  const JDOM = { affirmed: 'affirmed', denied: 'denied', not_assessed: 'undetermined', $unmapped: 'undetermined' };
  table('srf/6.2/fi-bears', { any_breach: res('srf/6.2/any-fi-breach'), causation: remap_result_domain(res('srf/6.2/loss-arises-from-fi-noncompliance'), JDOM) });
  put('eupg/5.5/a/fraud-or-negligence', held_judgment(FI.fraud_or_negligence));
  put('eupg/5.5/b/mas-requirement-noncompliance', held_judgment(FI.mas_requirement_noncompliance));
  noResult('eupg/5.5/c/section-4-duties');
  put('srf/6.3/loss-arises-from-action-or-omission', held_judgment(FI.loss_arises_from_action_or_omission));
  put('srf/6.3/fi-responsible-notwithstanding', conjunction_over_results([
    disjunction_over_results([remap_result_domain(res('eupg/5.5/a/fraud-or-negligence'), JMAP), remap_result_domain(res('eupg/5.5/b/mas-requirement-noncompliance'), JMAP)]),
    remap_result_domain(res('srf/6.3/loss-arises-from-action-or-omission'), JMAP)]),
    'satisfied: 5.5(a) or (b) affirmed AND the loss arose from it. not_satisfied on an affirmative denial of both, or of causation.');
  table('srf/6/fi-tier', { under_6_2: res('srf/6.2/fi-bears'), under_6_3: res('srf/6.3/fi-responsible-notwithstanding') });

  // ═══ TELCO TIER ═══════════════════════════════════════════════════════════════════════════════
  put('srf/7.7/perpetrated-through-sms', guard_on_unresolved(pres(S.contact_platform), () => (S.contact_platform === 'sms' ? 'sms' : 'not_sms')),
    'The Telco tier arises only on `sms`. An OTT message is not_sms (2.1 `SMS`).');
  noResult('srf/5.1/imda-directions-prevail');
  const tier = (compute) => { const t = res('srf/7.7/perpetrated-through-sms'); if (t === 'not_sms') return 'not_applicable'; if (t === 'undetermined') return 'undetermined'; if (t === 'sms') return compute(); throw new Error(`7.7: ${t}`); };
  const senderIdSms = () => SM.sender_id_type === 'alphanumeric_sender_id';
  const smsFromAuthorised = () => guard_on_unresolved(pres(SM.received_from) && (SM.received_from === 'other_source' || pres(TC.authorised_aggregators)),
    () => (SM.received_from === 'aggregator'
      ? remap_result_domain(member_of_register(SM.aggregator, TC.authorised_aggregators), { member: true, not_member: false, no_candidate: 'undetermined' })
      : false));
  put('srf/5.2.1/deliver-only-from-authorised-aggregators', tier(() => cr(pres(SM.sender_id_type), senderIdSms, smsFromAuthorised)),
    'not_applicable: not perpetrated through SMS, or the SMS carried a telephone number rather than a Sender ID.');
  put('srf/5.2.2/block-unauthorised-sender-id', tier(() => cr(pres(SM.sender_id_type) && !undet(smsFromAuthorised()), () => senderIdSms() && smsFromAuthorised() === false, () => grFalse(SM.delivered_to_subscriber))),
    'Arises only for a Sender ID SMS from an unauthorised source; breached when it was delivered. One unauthorised delivery breaches 5.2.1 and 5.2.2 together (A25).');
  put('srf/5.2.3/filter-implemented', tier(() => gb(TF.implemented_for_all_sms, 'implemented', 'not_implemented')));
  ungrounded('srf/5.2.3/designated-database',
    () => res('srf/5.2.3/filter-implemented') === 'implemented' || undet(res('srf/5.2.3/filter-implemented')),
    (meaning) => guard_on_unresolved(res('srf/5.2.3/filter-implemented') === 'implemented' && pres(TF.database),
      () => remap_result_domain(member_of_enumeration(TF.database, meaning('designated_databases')), { member: 'designated', not_member: 'not_designated' })));
  put('srf/5.2.3/this-sms-blocked', tier(() => cr(!undet(jr(SM.url_listed_at_delivery)), () => jr(SM.url_listed_at_delivery) === true, () => grFalse(SM.delivered_to_subscriber))),
    'A5\'s second reading, as its own record. not_applicable: the URL was not listed at delivery (A6).');
  const filterFails = () => res('srf/5.2.3/filter-implemented') === 'not_implemented' || ['not_designated', 'not_designated_on_supplied_meaning'].includes(res('srf/5.2.3/designated-database'));
  const filterHolds = () => res('srf/5.2.3/filter-implemented') === 'implemented' && ['designated', 'designated_on_supplied_meaning'].includes(res('srf/5.2.3/designated-database'));
  put('srf/5.2.3/duty', tier(() => guard_on_unresolved(r.A5_filter_duty_reading !== undefined, () => {
    const reading = r.A5_filter_duty_reading;
    if (reading === 'filter_in_place') return filterFails() ? 'breached' : guard_on_unresolved(filterHolds(), () => 'satisfied');
    if (reading === 'specific_sms_blocked') return (filterFails() || res('srf/5.2.3/this-sms-blocked') === 'breached') ? 'breached'
      : guard_on_unresolved(filterHolds() && ['satisfied', 'not_applicable'].includes(res('srf/5.2.3/this-sms-blocked')), () => 'satisfied');
    return 'undetermined';
  })), 'Guarded on A5; unresolved, undetermined. `designated` on a supplied meaning composes as designated (the attribution is on srf/5.2.3/designated-database; F-08).');
  put('srf/6.4/b/any-telco-breach', disjunction_over_results(['srf/5.2.1/deliver-only-from-authorised-aggregators', 'srf/5.2.2/block-unauthorised-sender-id', 'srf/5.2.3/duty'].map(dutyBreach)),
    'Outside the Telco tier every input is not_applicable and this is false; srf/6.4/telco-bears gates on 7.7 before reading it.');
  put('srf/6.4/loss-arises-from-telco-noncompliance', held_judgment(TC.loss_arises_from_noncompliance));
  put('srf/6.6/subscriber-not-account-holder', cr(pres(TC.subscriber_is_account_holder), () => TC.subscriber_is_account_holder === false,
    () => allReq(() => gr(TC.number_designated_for_notifications), () => gr(TC.number_received_phishing_sms))),
    'not_applicable: the subscriber is the account holder. breached: the subscriber differs and (a) or (b) fails, so the Telco does not bear under 6.6.');
  const fiCompliedAllOk = () => remap_result_domain(res('srf/6.4/a/fi-complied-all'), { satisfied: true, not_satisfied: false, undetermined: 'undetermined' });
  const telcoCausation = () => remap_result_domain(res('srf/6.4/loss-arises-from-telco-noncompliance'), JMAP);
  const sixSixOk = () => remap_result_domain(res('srf/6.6/subscriber-not-account-holder'), { satisfied: true, not_applicable: true, breached: false, outstanding: 'undetermined', undetermined: 'undetermined' });
  // The duty question is decided before causation or 6.6 is read: an undetermined 5.2 duty blocks
  // the tier; 6.4(a) failing closes it first (6.5).
  put('srf/6.4/telco-bears', tier(() => (fiCompliedAllOk() === false ? 'telco_not_liable'
    : guard_on_unresolved(fiCompliedAllOk() === true && !undet(res('srf/6.4/b/any-telco-breach')), () => (res('srf/6.4/b/any-telco-breach') === false ? 'telco_not_liable'
      : failsThenHolds([() => telcoCausation() === false, () => sixSixOk() === false], [() => telcoCausation() === true, () => sixSixOk() === true], 'telco_not_liable', 'telco_bears'))))),
    'not_applicable: not perpetrated through SMS. telco_not_liable when the FI did not comply with all of 4.2 (6.5), or on five affirmative non-breach findings, or on an affirmative denial of causation or of 6.6 AFTER a breach is established. An undetermined 5.2 duty blocks the tier before causation is read. telco_bears on affirmative findings only.');

  // ═══ CONSUMER OUTCOME ═════════════════════════════════════════════════════════════════════════
  noResult('srf/6.5/fi-first');
  table('srf/6.7/outcome', { scope: res('srf/7.1.1/relevant-claim'), fi_tier: res('srf/6/fi-tier'), telco_tier: res('srf/6.4/telco-bears') });
  for (const id of ['srf/6.1/fn11/loss-excludes-consequential', 'srf/6.8/redress', 'srf/6.9/joint-accounts']) noResult(id);
  put('srf/3.1/official-sources', held_judgment(U.referred_to_official_sources), 'Not read by Section 6 (A19).');
  put('srf/3.1/no-links', held_judgment(U.clicked_unexpected_link), 'affirmed means the user clicked an unexpected link. Not read by Section 6 (A19).');
  put('eupg/3.17/kill-switch-activated-promptly', held_judgment(H.kill_switch_activated_promptly), 'Not read by Section 6 (A19).');
  put('eupg/5.2/recklessness', held_judgment(H.recklessness_primary_cause), 'EUPG liability, not SRF allocation. Not read by Section 6 (A19).');

  // ═══ PROCESS ══════════════════════════════════════════════════════════════════════════════════
  noResult('srf/7.1/four-stage-workflow');
  put('srf/7.2/explain-workflow', gb(FI.workflow_explained_at_report, 'explained', 'not_explained'));
  put('srf/7.3/report-within-30-days', elapsed_within(FAL.first_sent_at, CLM.reported_at, 30, 'calendar_days', NOW),
    'The SRF clock: from the FI sending the first alert (A8a). No Section 6 consequence is encoded (A8).');
  const reportLate = () => ['exceeded', 'overdue'].includes(res('srf/7.3/report-within-30-days'));
  put('srf/7.3/fn14/reasons-for-delay', cr(res('srf/7.3/report-within-30-days') !== 'no_end_event' && pres(FI.requested_delay_reasons), () => reportLate() && FI.requested_delay_reasons === true, () => gr(CLM.delay_reasons_provided)),
    'not_applicable: the report was in time, or the FI did not ask.');
  put('srf/7.3/email-and-information-within-3-days', guard_on_unresolved(pres(CLM.email_provided), () => (CLM.email_provided === true ? elapsed_within(CLM.reported_at, CLM.submission_at, 3, 'calendar_days', NOW) : 'no_email')),
    'no_email: no valid email address was furnished. Otherwise elapsed_within\'s tokens over the 3 days from the report.');
  put('srf/7.4/communication-records', failsThenHolds(
    [() => jr(CREC.show_impersonation) === false, () => jr(CREC.show_credential_intent) === false, () => jr(CREC.show_platform_direction) === false],
    [() => jr(CREC.show_impersonation) === true, () => jr(CREC.show_credential_intent) === true, () => jr(CREC.show_platform_direction) === true],
    'not_demonstrated', 'demonstrated'), 'Not read by 7.1.1 (A26).');
  put('srf/7.4/fn15/telco-details', tier(() => guard_on_unresolved(pres(CLM.telco_named) && pres(CLM.mobile_number_provided) && pres(CLM.sms_details_provided),
    () => (CLM.telco_named === true && CLM.mobile_number_provided === true && CLM.sms_details_provided === true ? 'supplied' : 'not_supplied'))));
  put('srf/7.5/transaction-information-on-enquiry', cr(pres(CLM.holder_enquired), () => CLM.holder_enquired === true, () => gr(FI.provided_transaction_information)));
  const scopeKnown = () => !undet(res('srf/7.1.1/relevant-claim'));
  const smsKnown = () => !undet(res('srf/7.7/perpetrated-through-sms'));
  const smsTier = () => res('srf/7.7/perpetrated-through-sms') === 'sms';
  put('srf/7.6/out-of-scope-route', cr(scopeKnown(), () => res('srf/7.1.1/relevant-claim') === 'not_relevant', () => gr(FI.communicated_out_of_scope_assessment)),
    'not_applicable: a relevant claim, which Section 6 allocates.');
  put('srf/7.7/inform-telco', cr(smsKnown() && scopeKnown(), () => smsTier() && res('srf/7.1.1/relevant-claim') === 'relevant_claim', () => gr(FI.informed_telco)));
  noResult('srf/7.7.1/concurrent-investigation');
  put('srf/7.8/fi-independent-governance', gb(FI.governance?.independent, 'independent', 'not_independent'));
  put('srf/7.8/telco-independent-governance', cr(smsKnown(), smsTier, () => gr(TC.governance?.independent)));
  put('srf/7.9/investigation-timeline', guard_on_unresolved(pres(FINV.complexity), () => elapsed_within(CLM.reported_at, FINV.completed_at, FINV.complexity === 'complex' ? 45 : 21, 'business_days', NOW)),
    'The limit is selected by the FI\'s recorded classification; unrecorded is undetermined, never 21. Weekdays only (A28).');
  noResult('srf/7.9/fn16/retention');
  put('srf/7.10/written-outcome', guard_on_unresolved(pres(FOUT.written_reply_given) && pres(FOUT.acknowledgement_sought), () => (FOUT.written_reply_given === true && FOUT.acknowledgement_sought === true ? 'given' : 'not_given')));
  noResult('srf/7.11/recourse');
  put('eupg/1.5/deferred-commencement', commencementOf(T.executed_at), 'in_force when the transaction executed on or after 16 June 2025 (Singapore time).');
  put('eupg/8.1/withhold-charges', fromCommencement('eupg/1.5/deferred-commencement', () => gb(FI.charges_withheld, 'withheld', 'not_withheld')), 'not_applicable before 16 June 2025 (EUPG 1.5).');
  put('srf/7.13/fi-credits', cr(!undet(res('srf/6.7/outcome')), () => res('srf/6.7/outcome') === 'fi_bears', () => gr(FI.credited_total_loss)), 'Arises only on an fi_bears outcome.');
  put('srf/7.14/telco-credits', cr(!undet(res('srf/6.7/outcome')), () => res('srf/6.7/outcome') === 'telco_bears', () => gr(TC.credited_total_loss)), 'Arises only on a telco_bears outcome.');
  put('eupg/3.14/report-within-30-days-of-receipt', elapsed_within(H.first_alert_received_at, CLM.reported_at, 30, 'calendar_days', NOW), 'The EUPG clock: from receipt (A8a).');
  put('eupg/3.18/information-on-request', cr(pres(FI.requested_3_18_information), () => FI.requested_3_18_information === true, () => jr(H.provided_3_18_information_in_reasonable_time)));
  put('eupg/3.20/police-report-within-3-days', cr(pres(FI.police_report_requested), () => FI.police_report_requested === true,
    () => remap_result_domain(elapsed_within(FI.police_report_requested_at, H.police_report_furnished_at, 3, 'calendar_days', NOW), { within: true, exceeded: false, overdue: false, not_yet_due: 'outstanding', out_of_order: true, no_end_event: 'undetermined' })),
    'outstanding: requested, not yet furnished, 3 days still running. out_of_order (furnished before the request) satisfies.');
  noResult('eupg/4.11/holder-preference');
  put('eupg/4.14/kill-switch-characteristics', guard_on_unresolved(pres(FKS.disallows_non_biller_transfers) && pres(FKS.terminates_sessions) && pres(FKS.prominent),
    () => (FKS.disallows_non_biller_transfers === true && FKS.terminates_sessions === true && FKS.prominent === true ? 'conforming' : 'not_conforming')), 'Not read by SRF 4.2.4 (A21).');
  put('eupg/4.20/reporting-channel-characteristics', guard_on_unresolved(pres(FI.report_acknowledged_in_writing) && pres(FI.report_fee_charged),
    () => (FI.report_acknowledged_in_writing === true && FI.report_fee_charged === false ? 'conforming' : 'not_conforming')), 'Not read by SRF 4.2.4 (A21).');
  put('eupg/4.21/detection-and-blocking', fromCommencement('eupg/1.5/deferred-commencement', () => guard_on_unresolved(pres(FDET.capability_at_all_times) && pres(FDET.annual_review),
    () => (FDET.capability_at_all_times === true && FDET.annual_review === true ? 'in_place' : 'not_in_place'))), 'Not read by SRF 4.2.5 (A21).');
  return o;
}
