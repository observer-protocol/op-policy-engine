#!/usr/bin/env node
/**
 * FECA PM 2-0805, Causal Relationship. Standalone, no engine integration.
 *
 * ─── THREE CATEGORIES THAT DO NOT PRODUCE A RESULT ──────────────────────────────────────────────
 *
 * DEFINITIONAL clauses supply a meaning other clauses consume. They are EMITTED WITHOUT A `result`
 * KEY, and the clauses that consumed one record which definition applied.
 *
 * INSTRUCTION clauses direct an act. They are REFUSED: emitted with no `result` key and a stated
 * reason. They are emitted rather than omitted so that coverage by set equality still holds, and
 * they carry no `result` so that nothing downstream can read one. `resultOf()` throws if asked for
 * one, because an accessor returning `undefined` is the silent failure this estate keeps finding.
 *
 * ILLUSTRATIVE is not in the schema. The one clause carrying it is refused the same way.
 *
 * ─── AND ONE THAT CANNOT BE ANSWERED FROM THE DOCUMENT ──────────────────────────────────────────
 *
 * A clause whose operative requirement is an UNGROUNDED term returns `undetermined` unless a meaning
 * is supplied in `resolutions.ungrounded_terms`. THE EVALUATOR NEVER SUPPLIES ONE. A run that used a
 * supplied meaning records `depended_on_supplied_meaning`, kept distinct from an ambiguity
 * resolution: choosing between two readings a text permits is interpretation, and supplying a
 * meaning a text never gave is closer to legislating. The record should not call them the same.
 */
import { readFileSync } from 'node:fs';
const REGISTER = JSON.parse(readFileSync(new URL('./clauses.json', import.meta.url), 'utf8')).clauses;

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


const BY_ID = Object.fromEntries(REGISTER.map((c) => [c.id, c]));
// EVIDENTIAL HAS a result domain, and that is what separates it from DEFINITIONAL and INSTRUCTION.
// A fact does make it true or false: whether the party bearing the burden discharged it. What differs
// is what the result is ABOUT, and that is a consumption discipline rather than a refusal.
const HAS_RESULT_DOMAIN = new Set(['MECHANICAL', 'JUDGMENT', 'CONDITIONAL', 'DERIVED', 'EVIDENTIAL']);

// ─── primitives, from the two regulation domains, unchanged ─────────────────────────────────────
const __field_present = (v) => (v === null || v === undefined || v === '' ? 'absent' : 'present');
const __all_present = (vs) => ((vs ?? [undefined]).every((v) => field_present(v) === 'present') ? 'all_present' : 'some_absent');   // unsupplied list: E30 at the list type
const __any_present = (alts) => ((alts ?? [undefined]).some((v) => field_present(v) === 'present') ? 'one_present' : 'none_present');   // unsupplied list: E30 at the list type
const member_of_enumeration = (v, en) => (en.includes(v) ? 'member' : 'not_member');
const none_of_class_present = (items, prohibited) =>
  (items.some((i) => prohibited.includes(i)) ? 'prohibited_present' : 'clear');
const __held_judgment = (a) => (a === undefined || a === null ? 'not_assessed' : a);
const __ordered_before = (a, b) => {
  if (a === null || a === undefined || b === null || b === undefined) return 'missing_operand';
  const x = new Date(a), y = new Date(b);
  if (isNaN(x) || isNaN(y)) return 'missing_operand';
  return x < y ? 'before' : x > y ? 'after' : 'simultaneous';
};
const CONJUNCTION_TOKENS = new Set([true, false, 'satisfied', 'undetermined']);
const conjunction_over_results = (rs, undeterminedIs) => {
  for (const r of rs) if (!CONJUNCTION_TOKENS.has(r)) throw new Error(`conjunction_over_results: unrecognised result ${JSON.stringify(r)}`);
  if (rs.includes('undetermined')) return undeterminedIs === 'fail' ? 'not_satisfied' : 'undetermined';
  return rs.every((r) => r === true || r === 'satisfied') ? 'satisfied' : 'not_satisfied';
};
const conditional_requirement = (pre, result) => {
  if (!pre) return 'not_applicable';
  if (result === true) return 'satisfied';
  if (result === false) return 'breached';
  if (result === 'outstanding') return 'outstanding';
  if (result === 'undetermined') return 'undetermined';
  throw new Error(`conditional_requirement: unrecognised requirement result ${JSON.stringify(result)}`);
};
// ─── the four named composition shapes, unchanged ───────────────────────────────────────────────
const strictBoolean = (v, where) => {
  if (v === true || v === false) return v;
  throw new Error(`${where}: expected a strict boolean, got ${JSON.stringify(v)}`);
};
const applicability_gate = (applies, compute) =>
  (strictBoolean(applies, 'applicability_gate') ? compute() : 'not_applicable');
const guard_on_unresolved = (usable, compute) =>
  (strictBoolean(usable, 'guard_on_unresolved') ? compute() : 'undetermined');
const remap_result_domain = (value, mapping) => {
  if (Object.prototype.hasOwnProperty.call(mapping, value)) return mapping[value];
  if (Object.prototype.hasOwnProperty.call(mapping, '$unmapped')) return mapping.$unmapped;
  throw new Error(`remap_result_domain: no mapping for ${JSON.stringify(value)}`);
};

const PHYSICIAN_CLASS = ['surgeon','osteopath','podiatrist','dentist','clinical_psychologist','optometrist','chiropractor'];
const NOT_PHYSICIAN  = ['registered_nurse','licensed_practical_nurse','physician_assistant','nurse_practitioner','certified_nursing_assistant','social_worker','physical_therapist'];

// tracked rebindings: the wrapped names are what the clause set calls
const field_present = __trackArg((v) => __field_present(v));
const all_present = __trackArg(__all_present);
const any_present = __trackArg(__any_present);
const held_judgment = __trackToken(__held_judgment);
const ordered_before = __trackToken(__ordered_before);

export function evaluate(facts, resolutions = {}) {
  // ENTRY reset, not only per-put: a consumer reading the returned store after the run (a
  // stringify, a resultOf) fires the tracking proxy, and state left by those reads must not leak
  // into the next run's first emission window. Found by the cross-implementation sweep: run N's
  // serialisation polluted run N+1's first clause.
  __origins = new Set(); __meaning = false;
  const out = __trackStore({});
  const terms = resolutions.ungrounded_terms ?? {};
  const put = (id, result, extra) => {
    const c = BY_ID[id];
    if (c === undefined) throw new Error(`evaluate: ${id} is not in the register`);
    if (!HAS_RESULT_DOMAIN.has(c.disposition)) {
      throw new Error(`evaluate: ${id} is ${c.disposition} and has no result domain; it must not be assigned a result`);
    }
    // The record opens v, lane, lane_from, waiting, REFUSALS INCLUDED (below). Absent v: E30.
    const waiting = __classify(id, result);
    out[id] = { ...LANE_STAMP[id], waiting, result, ...(extra ?? {}) };
    __origins = new Set(); __meaning = false;
  };
  // ─── attribute_to_supplied_meaning ────────────────────────────────────────────────────────────
  //
  // WHAT IT DOES: it marks a determination as resting on a meaning the institution supplied rather
  // than on the document. That sentence mentions neither syntax nor return type, which is E10's test.
  //
  // RULED 2026-08-23. Recording the fact only in a provenance field was not enough. Resolving an
  // ambiguity is an institution choosing between readings the source permits; supplying a meaning for
  // a term the source never defines is writing a rule the document does not contain. A bare
  // `satisfied` on the second makes the run look as though it applied the chapter when it applied the
  // institution, and a supervisor reading the row cannot tell.
  //
  // So the RESULT carries it. `satisfied` and `satisfied_on_supplied_meaning` are different tokens and
  // any composition over them must map both, which means a downstream clause cannot quietly launder
  // the second into the first.
  const attribute_to_supplied_meaning = (result, term) => `${result}_on_supplied_meaning`;

  // THE GATE IS AN ARGUMENT, NOT SOMETHING THE CALLER MAY PUT INSIDE `compute`. Corrected 2026-08-23,
  // REUSE-LOG E17.
  //
  // The first version took only `compute` and attributed wherever the meaning was READ. Three of the
  // four call sites passed a thunk to `applicability_gate`, so their meaning was unreachable until the
  // gate held and they attributed correctly. The fourth passed a VALUE to `conditional_requirement`,
  // which evaluates its arguments eagerly, so the meaning was read BEFORE the precondition was
  // tested. It produced `not_applicable_on_supplied_meaning`: a determination the institution's
  // meaning did not bear on, marked as though it had.
  //
  // WHAT `USE` MEANS HERE, chosen and stated. Not `a meaning that changed the result`, which needs a
  // counterfactual against some other meaning and is not well defined: without a meaning the result is
  // `undetermined`, so every decided result would count as changed. It is `CONSULTED ON THE PATH WHERE
  // THE CLAUSE ACTUALLY DECIDES`, and the gate is lifted into this signature so a call site cannot
  // reach the meaning before its precondition holds. The defect becomes unwritable rather than fixed
  // once.
  //
  // Exact for these four sites rather than guaranteed in general: a site could still read a meaning
  // and discard it inside `compute`. None does, and a short-circuit inside `compute` correctly leaves
  // it unread and unattributed.
  const ungrounded = (id, applies, compute) => {
    const t = BY_ID[id].rests_on_ungrounded_term;
    const supplied = terms[t];
    if (supplied === undefined) {
      __meaning = true;
      put(id, 'undetermined', { undetermined_because: `the operative term \`${t}\` is ungrounded: this chapter neither defines it nor points anywhere that does` });
      return;
    }
    if (strictBoolean(applies, `ungrounded(${id})`) === false) {
      put(id, 'not_applicable');            // the meaning is never even proxied
      return;
    }
    let used = false;
    const watched = new Proxy(supplied, { get(o, k) { used = true; return o[k]; } });
    const result = compute(watched);
    put(id, used ? attribute_to_supplied_meaning(result, t) : result,
      used ? { rests_on: 'a meaning supplied by the institution, not by the chapter', term: t } : undefined);
  };
  const f = facts;

  // ── paragraph 2 ────────────────────────────────────────────────────────────────────────────────
  put('feca/2-0805/2/a/occupational-rationale', held_judgment(f.opinion?.rationale_sufficient_for_class));
  put('feca/2-0805/2/b/diagnosed',
    conditional_requirement(f.claim?.type_claimed === 'aggravation',
      field_present(f.opinion?.aggravation_diagnosed_by) === 'present'),
    { definition_applied: 'feca/2-0805/2/b/aggravation' });
  put('feca/2-0805/2/b/lesser-diagnosis',
    applicability_gate(f.claim?.aggravation_issue_undeveloped === true,
      () => (field_present(f.opinion?.lesser_established_diagnosis) === 'present' ? 'satisfied' : 'not_satisfied')));
  put('feca/2-0805/2/b/unclear-duration',
    conditional_requirement(f.opinion?.aggravation_duration_clear === false,
      f.acceptance?.accepted_as === 'temporary_aggravation'),
    { definition_applied: 'feca/2-0805/2/b/1/temporary' });
  put('feca/2-0805/2/b/2/careful-evaluation', held_judgment(f.adjudicator?.all_evidence_carefully_evaluated));
  put('feca/2-0805/2/b/2/second-opinion', held_judgment(f.adjudicator?.second_opinion_appropriate));

  // ── paragraph 3 ────────────────────────────────────────────────────────────────────────────────
  const src = f.opinion?.source_class;
  put('feca/2-0805/3/medical-issue',
    all_present([f.opinion?.present, f.opinion?.examined_or_treated]) === 'all_present' ? 'satisfied' : 'not_satisfied',
    { definition_applied: 'feca/2-0805/3/a/physician' });
  put('feca/2-0805/3/a/1/countersigned',
    conditional_requirement(['physician_assistant', 'nurse_practitioner'].includes(src),
      field_present(f.opinion?.countersigned_by) === 'present'));
  put('feca/2-0805/3/a/3/chiropractor',
    conditional_requirement(src === 'chiropractor',
      all_present([f.opinion?.subluxation_diagnosed, f.opinion?.subluxation_xrays]) === 'all_present'),
    { definition_applied: 'feca/2-0805/3/a/physician' });
  put('feca/2-0805/3/b/report-contents',
    all_present([f.opinion?.diagnosis, f.opinion?.objective_findings, f.opinion?.relationship_opinion]));
  const waiver = conjunction_over_results([
    held_judgment(f.injury?.minor_and_lay_identifiable) === 'affirmed' ? true
      : held_judgment(f.injury?.minor_and_lay_identifiable) === 'not_assessed' ? 'undetermined' : false,
    f.injury?.witnessed_or_prompt === true && f.injury?.fact_disputed === false,
  ], 'undetermined');
  put('feca/2-0805/3/c/no-report', remap_result_domain(waiver, {
    satisfied: 'satisfied', not_satisfied: 'not_applicable', undetermined: 'undetermined',
  }));
  // THE ONE DERIVED CLAUSE. Reads no fact; composes 3c's result and gates the whole of 3d.
  put('feca/2-0805/3/d/applicability', remap_result_domain(out['feca/2-0805/3/c/no-report'].result, {
    satisfied: 'not_applicable',      // the waiver applies, so the opinion requirement does not
    not_applicable: 'satisfied',      // the waiver does not apply, so it does
    undetermined: 'undetermined',
  }));
  put('feca/2-0805/3/d/1/clear-cut', held_judgment(f.injury?.clear_cut_and_competent));
  ungrounded('feca/2-0805/3/d/2/rationalized',
    out['feca/2-0805/3/d/applicability'].result === 'satisfied',
    (meaning) => (member_of_enumeration(f.opinion?.rationale_grade, meaning.accepts) === 'member' ? 'satisfied' : 'breached'));
  put('feca/2-0805/3/d/3/a/hearing',
    conditional_requirement(f.claim?.condition_class === 'hearing_loss',
      f.opinion?.specialist_credential === 'board_certified_otolaryngology'));
  put('feca/2-0805/3/d/3/b/pulmonary',
    conditional_requirement(f.claim?.condition_class === 'pulmonary',
      remap_result_domain(ordered_before(f.opinion?.specialist_opinion_at, f.acceptance?.accepted_at), {
        before: true, simultaneous: true, after: false, missing_operand: 'undetermined',
      })));
  put('feca/2-0805/3/d/3/c/emotional', held_judgment(f.opinion?.psychiatrist_required_assessed));
  // WAS conditional_requirement, whose arguments evaluate eagerly, so the meaning was read before the
  // precondition was tested. The precondition is now the gate and the meaning is unreachable without it.
  ungrounded('feca/2-0805/3/e/differentiate',
    f.claim?.pre_existing_same_site === true,
    (meaning) => (f.opinion?.differentiates === true
      && member_of_enumeration(f.opinion?.rationale_grade, meaning.accepts) === 'member' ? 'satisfied' : 'breached'));

  // ── paragraph 4 ────────────────────────────────────────────────────────────────────────────────
  put('feca/2-0805/4/a/difficulty-factors', held_judgment(f.adjudicator?.difficulty_assessed));
  put('feca/2-0805/4/b/no-opinion',
    conditional_requirement(field_present(f.opinion?.relationship_opinion) === 'absent'
      && out['feca/2-0805/3/d/applicability'].result === 'satisfied',
      remap_result_domain(held_judgment(f.adjudicator?.development_complete), {
        affirmed: true, denied: false, not_assessed: 'undetermined', $unmapped: 'undetermined',
      })));
  put('feca/2-0805/4/c/negated',
    conditional_requirement(f.opinion?.negates_relationship === true && f.file?.contrary_evidence === false,
      remap_result_domain(held_judgment(f.adjudicator?.development_complete), {
        affirmed: true, denied: false, not_assessed: 'undetermined', $unmapped: 'undetermined',
      })));

  // ── paragraph 5 ────────────────────────────────────────────────────────────────────────────────
  put('feca/2-0805/5/necessity', held_judgment(f.adjudicator?.further_opinion_necessary));
  put('feca/2-0805/5/b/second-opinion', held_judgment(f.adjudicator?.adjudicable_on_present_opinion));
  put('feca/2-0805/5/c/conflict', held_judgment(f.adjudicator?.opinions_approximately_equal));

  // ── paragraph 6 ────────────────────────────────────────────────────────────────────────────────
  put('feca/2-0805/6/specialist-discussion', held_judgment(f.adjudicator?.specialist_discussion_sufficient));
  put('feca/2-0805/6/accept-while-developing',
    applicability_gate(f.claim?.physical_injury_established === true && f.claim?.graver_condition_undeveloped === true,
      () => (f.acceptance?.physical_injury_accepted === true ? 'satisfied' : 'not_satisfied')));
  put('feca/2-0805/6/no-preventive-payment',
    none_of_class_present(f.authorisation?.items ?? [], ['vaccine', 'inoculation']));
  put('feca/2-0805/6/a/1/known-carrier',
    conditional_requirement(f.exposure?.source_status === 'known_or_probable_carrier',
      f.acceptance?.physical_injury_accepted === true && f.authorisation?.prophylactic === true));
  put('feca/2-0805/6/a/2/unknown-source',
    conditional_requirement(f.exposure?.source_status === 'unidentified_or_unknown',
      f.acceptance?.physical_injury_accepted === true));
  put('feca/2-0805/6/b/1/known-carrier-test',
    conditional_requirement(f.exposure?.test_result === 'positive' && f.exposure?.source_status === 'known_or_probable_carrier',
      all_present([f.exposure?.no_prior_history, f.exposure?.no_outside_exposure]) === 'all_present'));
  put('feca/2-0805/6/b/2/prior-negative',
    conditional_requirement(f.exposure?.test_result === 'positive' && f.exposure?.prior_test === 'negative',
      f.acceptance?.physical_injury_accepted === true && f.exposure?.continuous_occupational_risk === true
        && f.exposure?.outside_factors_identified === false));
  put('feca/2-0805/6/b/2/weigh-probability', held_judgment(f.adjudicator?.relative_probability_weighed));

  // ── paragraph 7 ────────────────────────────────────────────────────────────────────────────────
  ungrounded('feca/2-0805/7/a/natural-consequence', f.claim?.consequential_claimed === true,
    (meaning) => (member_of_enumeration(f.consequential?.defeater_class, meaning.defeaters) === 'member' ? 'breached' : 'satisfied'));
  put('feca/2-0805/7/a/3/reasonable-time', held_judgment(f.adjudicator?.period_allowed_reasonable));
  ungrounded('feca/2-0805/7/b/chain', f.intervening?.claimed === true,
    (meaning) => (member_of_enumeration(f.intervening?.chain_status, meaning.breaks) === 'member' ? 'breached' : 'satisfied'));

  // ── the categories that produce no result, emitted so coverage still holds ─────────────────────
  for (const c of REGISTER) {
    if (HAS_RESULT_DOMAIN.has(c.disposition)) continue;
    out[c.id] = c.disposition === 'DEFINITIONAL'
      ? { ...LANE_STAMP[c.id], waiting: 'none', no_result: 'DEFINITIONAL', supplies: c.operative_weight ?? 'a meaning other clauses consume' }
      : { ...LANE_STAMP[c.id], waiting: 'none', refused: c.disposition, why: c.disposition === 'INSTRUCTION'
          ? 'directs an act; no fact of the claim makes it true or false, so it has no result domain'
          : 'carries no requirement; ILLUSTRATIVE is not in the schema' };
  }
  return out;
}

/** Reading a result from a clause that has none is the silent failure. This refuses instead. */
export function resultOf(out, id) {
  const e = out[id];
  if (e === undefined) throw new Error(`resultOf: ${id} was not emitted`);
  if (!('result' in e)) throw new Error(`resultOf: ${id} is ${e.refused ?? e.no_result} and has no result`);
  return e.result;
}
