#!/usr/bin/env node
/**
 * WRITES evaluation.json. The evaluation layer is authored HERE, as expression trees built from a
 * small set of named shapes, and projected to the JSON the interpreter reads. The JSON is derived:
 * edit this file and re-run, never the JSON. One authored source, one projection (the nywc
 * register's projector pattern), so that eighty hand-written copies of one guard shape cannot drift
 * from each other.
 *
 * The shapes, and why each guard exists:
 *   pres(p)          field_present over a fact path, as a strict boolean. Probes the ARGUMENT, so an
 *                    unsupplied fact marks a `fact` waiting origin.
 *   gb(p, T, F)      a recorded boolean rendered into two tokens, UNDETERMINED when unsupplied.
 *                    A bare `eq(fact, true)` reads an unsupplied fact as `false`, which is E30's
 *                    defect (deciding on absence); every boolean fact read goes through this or gr.
 *   gr(p)            the same, as a requirement value: true | false | undetermined.
 *   jr(p)            a held judgment as a requirement value; not_assessed is undetermined.
 *   cr(guards, pre, req)  conditional_requirement, with the PRECONDITION's facts guarded so that a
 *                    missing precondition fact is undetermined rather than `not_applicable`.
 *   tier(compute)    the Telco tier gate: a remap over 7.7's result, so `not_sms` is not_applicable,
 *                    an undetermined 7.7 is undetermined, and only `sms` evaluates the compute.
 *                    A remap rather than applicability_gate because the gate needs a strict
 *                    boolean and would decide on an undetermined 7.7 (R17's reason, inverted).
 *   fails_then_holds(fails, holds, F, T)   `F` if any failing condition is established, else `T`
 *                    only if every holding condition is established, else undetermined. The
 *                    composition rule for every derived duty: a breach decides against an
 *                    undetermined sibling, a discharge needs every sibling affirmative.
 */
import { writeFileSync } from 'node:fs';

const C = (value) => ({ op: 'const', value });
const F = (path) => ({ op: 'fact', path });
const CL = (id) => ({ op: 'clause', id });
const B = (name) => ({ op: 'binding', name });
const RES = (name) => ({ op: 'resolution', name });
const eq = (left, right) => ({ op: 'eq', left, right });
const not = (operand) => ({ op: 'not', operand });
const and = (...operands) => ({ op: 'and', operands });
const or = (...operands) => ({ op: 'or', operands });
const cond = (i, t, e) => ({ op: 'cond', if: i, then: t, else: e });
const prim = (name, ...args) => ({ op: 'primitive', name, args });
const guard = (usable, compute) => ({ op: 'guard_on_unresolved', usable, compute });
const remap = (value, mapping) => ({ op: 'remap_result_domain', value, mapping });
const list = (...items) => ({ op: 'list', items });
const conj = (...results) => ({ op: 'conjunction_over_results', results: list(...results), undetermined_is: 'undetermined' });   // undetermined DOMINATES; never 'fail'
const disj = (...results) => ({ op: 'disjunction_over_results', results: list(...results) });
const emit = (result, note, extra) => ({ op: 'emit', result, ...(note === undefined ? {} : { note: C(note) }), ...(extra === undefined ? {} : { extra }) });

const pres = (p) => eq(prim('field_present', F(p)), C('present'));
const isTrue = (p) => eq(F(p), C(true));
const gb = (p, T, Fv) => guard(pres(p), cond(isTrue(p), C(T), C(Fv)));
const gr = (p) => guard(pres(p), isTrue(p));
const grFalse = (p) => guard(pres(p), eq(F(p), C(false)));
const JMAP = { affirmed: C(true), denied: C(false), not_assessed: C('undetermined'), $unmapped: C('undetermined') };
const jr = (p) => remap(prim('held_judgment', F(p)), JMAP);
const judgmentDomain = (id) => remap(CL(id), { affirmed: C('affirmed'), denied: C('denied'), not_assessed: C('undetermined'), $unmapped: C('undetermined') });   // a JUDGMENT clause onto a closed table domain
const jrc = (id) => remap(CL(id), JMAP);   // a JUDGMENT clause's result, as a requirement value
const cr = (guards, pre, req) => guard(guards.length === 1 ? guards[0] : and(...guards), prim('conditional_requirement', pre, req));
const undet = (x) => eq(x, C('undetermined'));
const failsThenHolds = (fails, holds, Fv, T) => cond(or(...fails), C(Fv), guard(and(...holds), C(T)));
// a requirement value from several requirement values: false if any false, true if all true
const allReq = (...rs) => failsThenHolds(rs.map((r) => eq(r, C(false))), rs.map((r) => eq(r, C(true))), false, true);
const tier = (compute) => remap(CL('srf/7.7/perpetrated-through-sms'), { not_sms: C('not_applicable'), undetermined: C('undetermined'), sms: compute });
const CR5 = ['satisfied', 'breached', 'not_applicable', 'outstanding', 'undetermined'];
// total remaps over the conditional_requirement domain
const dutyOk = (id, naValue) => remap(CL(id), { satisfied: C(true), breached: C(false), not_applicable: naValue, outstanding: C('undetermined'), undetermined: C('undetermined') });
const dutyBreach = (id) => remap(CL(id), { breached: C(true), satisfied: C(false), not_applicable: C(false), outstanding: C('undetermined'), undetermined: C('undetermined') });
const COMMENCEMENT = '2025-06-16T00:00:00+08:00';
const commencement = () => remap(prim('ordered_before', F('transaction.executed_at'), C(COMMENCEMENT)), {
  before: C('not_yet_in_force'), after: C('in_force'), simultaneous: C('in_force'), missing_operand: C('missing_operand'),
});
const fromCommencement = (id, compute) => remap(CL(id), { not_yet_in_force: C('not_applicable'), missing_operand: C('undetermined'), in_force: compute });

// ─── bindings ───────────────────────────────────────────────────────────────────────────────────
const bindings = {
  is_psp: eq(F('account.issuer_type'), C('relevant_psp')),
  sms_tier: eq(CL('srf/7.7/perpetrated-through-sms'), C('sms')),
  sms_known: not(undet(CL('srf/7.7/perpetrated-through-sms'))),
  scope_known: not(undet(CL('srf/7.1.1/relevant-claim'))),
  // 4.2.1: both halves of the cooling-off requirement, as one requirement value
  cooling_off_ok: allReq(jr('fi.cooling_off.at_least_12h_imposed'), jr('fi.cooling_off.high_risk_prevented')),
  // the 4.2.1 / 4.2.2(ii) precondition: PSP-issued AND a new-device login
  psp_new_device_login: and(B('is_psp'), isTrue('fi.events.new_device_login')),
  // guards for reading fi.events.new_device_login only where the issuer is a PSP
  new_device_guard: and(pres('account.issuer_type'), or(not(B('is_psp')), pres('fi.events.new_device_login'))),
  // A3: what a never-arisen duty counts as, for 6.4(a). Unresolved: undetermined. NO DEFAULT.
  a3_not_applicable_duty: guard(not(eq(RES('A3_not_applicable_duty'), { op: 'absent' })), remap(RES('A3_not_applicable_duty'), {
    counts_as_complied: C(true), not_a_compliance_finding: C('undetermined'), $unmapped: C('undetermined'),
  })),
  ok_4_2_1: dutyOk('srf/4.2.1/cooling-off', B('a3_not_applicable_duty')),
  ok_4_2_2: dutyOk('srf/4.2.2/alerts', B('a3_not_applicable_duty')),
  ok_4_2_3: dutyOk('srf/4.2.3/outgoing-transaction-notification', B('a3_not_applicable_duty')),
  ok_4_2_4: dutyOk('srf/4.2.4/duty', B('a3_not_applicable_duty')),
  ok_4_2_5: dutyOk('srf/4.2.5/duty', B('a3_not_applicable_duty')),
  breach_4_2_1: dutyBreach('srf/4.2.1/cooling-off'),
  breach_4_2_2: dutyBreach('srf/4.2.2/alerts'),
  breach_4_2_3: dutyBreach('srf/4.2.3/outgoing-transaction-notification'),
  breach_4_2_4: dutyBreach('srf/4.2.4/duty'),
  breach_4_2_5: dutyBreach('srf/4.2.5/duty'),
  // footnote 8 as a requirement-shaped value
  rapid_drain: jrc('srf/4.2.5/fn8/rapid-drain'),
  // 5.2.1 / 5.2.2: was the SMS received from an authorised aggregator? true | false | undetermined
  sms_from_authorised: guard(and(pres('sms.received_from'), or(eq(F('sms.received_from'), C('other_source')), pres('telco.authorised_aggregators'))),
    cond(eq(F('sms.received_from'), C('aggregator')),
      remap(prim('member_of_register', F('sms.aggregator'), F('telco.authorised_aggregators')), { member: C(true), not_member: C(false), no_candidate: C('undetermined') }),
      C(false))),
  sender_id_sms: eq(F('sms.sender_id_type'), C('alphanumeric_sender_id')),
  breach_5_2_1: dutyBreach('srf/5.2.1/deliver-only-from-authorised-aggregators'),
  breach_5_2_2: dutyBreach('srf/5.2.2/block-unauthorised-sender-id'),
  breach_5_2_3: dutyBreach('srf/5.2.3/duty'),
  // 5.2.3 compositions under A5's two readings
  filter_fails: or(eq(CL('srf/5.2.3/filter-implemented'), C('not_implemented')), eq(CL('srf/5.2.3/designated-database'), C('not_designated')), eq(CL('srf/5.2.3/designated-database'), C('not_designated_on_supplied_meaning'))),
  filter_holds: and(eq(CL('srf/5.2.3/filter-implemented'), C('implemented')), or(eq(CL('srf/5.2.3/designated-database'), C('designated')), eq(CL('srf/5.2.3/designated-database'), C('designated_on_supplied_meaning')))),
  fi_complied_all_ok: remap(CL('srf/6.4/a/fi-complied-all'), { satisfied: C(true), not_satisfied: C(false), undetermined: C('undetermined') }),
  telco_causation: jrc('srf/6.4/loss-arises-from-telco-noncompliance'),
  six_six_ok: remap(CL('srf/6.6/subscriber-not-account-holder'), { satisfied: C(true), not_applicable: C(true), breached: C(false), outstanding: C('undetermined'), undetermined: C('undetermined') }),
  // 7.1.1 scope members as requirement values
  scope_fi: remap(CL('srf/1.1/a/responsible-fi'), { member: C(true), not_member: C(false), undetermined: C('undetermined') }),
  scope_card: remap(CL('srf/1.1/fn1/card-exclusion'), { not_excluded: C(true), excluded: C(false), undetermined: C('undetermined') }),
  scope_pa: remap(CL('srf/2.1/protected-account'), { satisfied: C(true), not_satisfied: C(false), undetermined: C('undetermined') }),
  scope_sat: remap(CL('srf/2.1/seemingly-authorised'), { satisfied: C(true), not_satisfied: C(false), undetermined: C('undetermined') }),
  // above-threshold, as the 4.2.3 precondition
  above_threshold: or(eq(CL('srf/4.2.3/above-threshold'), C('above')), eq(CL('srf/4.2.3/above-threshold'), C('above_on_supplied_meaning'))),
  report_late: or(eq(CL('srf/7.3/report-within-30-days'), C('exceeded')), eq(CL('srf/7.3/report-within-30-days'), C('overdue'))),
};

// ─── the clauses, in emit order ─────────────────────────────────────────────────────────────────
const clauses = {};
const order = [];
const put = (id, node) => { if (clauses[id]) throw new Error(`duplicate ${id}`); clauses[id] = node; order.push(id); };
const noResult = (id) => order.push(id);

// SCOPE
put('srf/1.1/a/responsible-fi', emit(guard(pres('account.issuer_type'), prim('member_of_enumeration', F('account.issuer_type'), C(['bank', 'relevant_psp'])))));
put('srf/1.1/b/responsible-telco', emit(guard(pres('telco.operator_type'), prim('member_of_enumeration', F('telco.operator_type'), C(['mno']))),
  'not_member for an MVNO subscriber (A18). Recorded beside the Telco tier; the tier gates on 7.7, not on this.'));
put('srf/1.1/fn1/card-exclusion', emit(gb('account.card_transaction', 'excluded', 'not_excluded')));
noResult('srf/1.4/read-with-legislation');
put('srf/2.1/protected-account/a/individuals', emit(guard(pres('account.holder_type'), prim('member_of_enumeration', F('account.holder_type'), C(['individual']))),
  'The SRF\'s limb: individuals only. A sole proprietor is not_member here and a member under the EUPG (A1).'));
put('srf/2.1/protected-account/b/balance-or-credit', emit(remap(disj(gr('account.balance_capable_over_1000_sgd'), gr('account.credit_facility')), { true: C('met'), false: C('not_met'), undetermined: C('undetermined') })));
put('srf/2.1/protected-account/c/electronic', emit(gb('account.electronic_payments_capable', 'met', 'not_met')));
put('srf/2.1/protected-account/d/psp-emoney', emit(cr([pres('account.issuer_type')], B('is_psp'), gr('account.stores_specified_emoney')),
  'not_applicable means the issuer is not a relevant payment service provider, where limb (d) never arises.'));
put('srf/2.1/protected-account', emit(failsThenHolds(
  [eq(CL('srf/2.1/protected-account/a/individuals'), C('not_member')), eq(CL('srf/2.1/protected-account/b/balance-or-credit'), C('not_met')), eq(CL('srf/2.1/protected-account/c/electronic'), C('not_met')), eq(CL('srf/2.1/protected-account/d/psp-emoney'), C('breached'))],
  [eq(CL('srf/2.1/protected-account/a/individuals'), C('member')), eq(CL('srf/2.1/protected-account/b/balance-or-credit'), C('met')), eq(CL('srf/2.1/protected-account/c/electronic'), C('met')), or(eq(CL('srf/2.1/protected-account/d/psp-emoney'), C('satisfied')), eq(CL('srf/2.1/protected-account/d/psp-emoney'), C('not_applicable')))],
  'not_satisfied', 'satisfied'),
  'One failing limb decides not_satisfied; satisfied needs all four affirmative (limb (d) may be not_applicable by its own words).'));
put('srf/2.1/seemingly-authorised/a/impersonation', emit(guard(pres('scam.impersonated_entity_type'), prim('member_of_enumeration', F('scam.impersonated_entity_type'), C(['sg_government_agency', 'sg_incorporated_entity', 'foreign_entity_serving_sg_residents'])))));
put('srf/2.1/seemingly-authorised/b/digital-messaging', emit(guard(pres('scam.contact_platform'), prim('member_of_enumeration', F('scam.contact_platform'), C(['sms', 'email', 'whatsapp', 'social_media', 'other_digital'])))));
put('srf/2.1/seemingly-authorised/c/fabricated-platform', emit(gb('scam.credentials_entered_on_fabricated_platform', 'met', 'not_met')));
put('srf/2.1/seemingly-authorised/d/unintended', emit(prim('held_judgment', F('scam.transactions_unintended')), 'affirmed means the account user did not intend the transactions. not_assessed is a person\'s absence, not a finding.'));
put('srf/2.1/seemingly-authorised', emit(failsThenHolds(
  [eq(CL('srf/2.1/seemingly-authorised/a/impersonation'), C('not_member')), eq(CL('srf/2.1/seemingly-authorised/b/digital-messaging'), C('not_member')), eq(CL('srf/2.1/seemingly-authorised/c/fabricated-platform'), C('not_met')), eq(jrc('srf/2.1/seemingly-authorised/d/unintended'), C(false))],
  [eq(CL('srf/2.1/seemingly-authorised/a/impersonation'), C('member')), eq(CL('srf/2.1/seemingly-authorised/b/digital-messaging'), C('member')), eq(CL('srf/2.1/seemingly-authorised/c/fabricated-platform'), C('met')), eq(jrc('srf/2.1/seemingly-authorised/d/unintended'), C(true))],
  'not_satisfied', 'satisfied')));
put('srf/7.1.1/relevant-claim', emit(failsThenHolds(
  [eq(B('scope_fi'), C(false)), eq(B('scope_card'), C(false)), eq(B('scope_pa'), C(false)), eq(B('scope_sat'), C(false))],
  [eq(B('scope_fi'), C(true)), eq(B('scope_card'), C(true)), eq(B('scope_pa'), C(true)), eq(B('scope_sat'), C(true))],
  'not_relevant', 'relevant_claim'),
  'One affirmative scope failure is not_relevant whatever the others; relevant_claim needs all four affirmative.'));
noResult('srf/2.1/high-risk-activities');
noResult('srf/2.1/money');
noResult('srf/2.1/sms');
noResult('srf/2.1/sender-id-sms');
noResult('srf/2.1/subscriber');
noResult('srf/2.2/undefined-expressions');
noResult('eupg/2.1/unauthorised-transaction');
noResult('eupg/2.1/access-code');
noResult('eupg/2.1/protected-account/a/sole-proprietors');

// FI TIER
noResult('srf/4.1/eupg-s4-applies');
put('srf/4.2.1/cooling-off', emit(cr([pres('fi.events.token_activated'), B('new_device_guard')], or(isTrue('fi.events.token_activated'), B('psp_new_device_login')), B('cooling_off_ok')),
  'The 12-hour floor and the block on high-risk activities are the FI\'s recorded assessments (F-05). not_applicable: no token activated and no PSP new-device login.'));
noResult('srf/4.2.1/fn5/non-stp-activation');
put('srf/4.2.2/i/token-activation-alert', emit(cr([pres('fi.events.token_activated')], isTrue('fi.events.token_activated'), jr('fi.alerts.token_activation_real_time'))));
put('srf/4.2.2/ii/new-device-login-alert', emit(cr([B('new_device_guard')], B('psp_new_device_login'), jr('fi.alerts.new_device_login_real_time')),
  'not_applicable for a bank-issued account, or a PSP-issued account with no new-device login.'));
put('srf/4.2.2/iii/high-risk-activity-alert', emit(cr([pres('fi.events.high_risk_activity')], isTrue('fi.events.high_risk_activity'), jr('fi.alerts.high_risk_activity_real_time'))));
{
  const ids = ['srf/4.2.2/i/token-activation-alert', 'srf/4.2.2/ii/new-device-login-alert', 'srf/4.2.2/iii/high-risk-activity-alert'];
  put('srf/4.2.2/alerts', emit(cond(or(...ids.map((i) => eq(CL(i), C('breached')))), C('breached'),
    { op: 'applicability_gate', applies: not(and(...ids.map((i) => eq(CL(i), C('not_applicable'))))),
      compute: guard(and(...ids.map((i) => or(eq(CL(i), C('satisfied')), eq(CL(i), C('not_applicable'))))), C('satisfied')) }),
    'breached if any limb was; not_applicable only if all three never arose; satisfied needs every limb satisfied or never arisen; else undetermined.'));
}
put('eupg/3.1/instructed-notifications', emit(gb('holder.instructed_transaction_notifications', 'instructed', 'not_instructed')));
put('eupg/2.1/transaction-notification-threshold/a/holder-set', emit(cr([pres('holder.notification_threshold_set')], isTrue('holder.notification_threshold_set'), jr('transaction.above_holder_threshold'))));
clauses['eupg/2.1/transaction-notification-threshold/b/industry-baseline'] = {
  op: 'ungrounded',
  applies: or(eq(F('holder.notification_threshold_set'), C(false)), not(pres('holder.notification_threshold_set'))),
  compute: guard(and(pres('holder.notification_threshold_set'), eq(prim('field_present', { op: 'meaning', key: 'baseline_sgd' }), C('present'))),
    remap(prim('held_judgment', F('transaction.above_baseline_threshold')), { affirmed: C('above'), denied: C('not_above'), not_assessed: C('undetermined'), $unmapped: C('undetermined') })),
};
order.push('eupg/2.1/transaction-notification-threshold/b/industry-baseline');
put('srf/4.2.3/above-threshold', emit(guard(pres('holder.notification_threshold_set'),
  cond(isTrue('holder.notification_threshold_set'),
    remap(CL('eupg/2.1/transaction-notification-threshold/a/holder-set'), { satisfied: C('above'), breached: C('not_above'), not_applicable: C('undetermined'), outstanding: C('undetermined'), undetermined: C('undetermined') }),
    remap(CL('eupg/2.1/transaction-notification-threshold/b/industry-baseline'), { above: C('above'), not_above: C('not_above'), above_on_supplied_meaning: C('above_on_supplied_meaning'), not_above_on_supplied_meaning: C('not_above_on_supplied_meaning'), not_applicable: C('undetermined'), undetermined: C('undetermined') }))),
  'Selects the limb by whether the holder set a threshold. The _on_supplied_meaning tokens are carried, not laundered (F-08: the attribution stops at 4.2.3).'));
put('srf/4.2.3/outgoing-transaction-notification', emit(cr([not(undet(CL('eupg/3.1/instructed-notifications'))), not(undet(CL('srf/4.2.3/above-threshold')))],
  and(eq(CL('eupg/3.1/instructed-notifications'), C('instructed')), B('above_threshold')), jr('fi.alerts.outgoing_transaction_real_time')),
  'not_applicable: the holder did not instruct notifications, or the transaction was below the applicable threshold (A20). Whether the threshold rested on a supplied meaning is visible on srf/4.2.3/above-threshold, not here (F-08).'));
put('srf/4.2.4/reporting-channel', emit(gb('fi.reporting_channel.available_at_all_times', 'available', 'not_available')));
put('srf/4.2.4/kill-switch', emit(guard(and(pres('fi.kill_switch.self_service'), pres('fi.kill_switch.blocks_mobile_and_online')),
  cond(and(isTrue('fi.kill_switch.self_service'), isTrue('fi.kill_switch.blocks_mobile_and_online')), C('provided'), C('not_provided')))));
put('srf/4.2.4/duty', emit(failsThenHolds(
  [eq(CL('srf/4.2.4/reporting-channel'), C('not_available')), eq(CL('srf/4.2.4/kill-switch'), C('not_provided'))],
  [eq(CL('srf/4.2.4/reporting-channel'), C('available')), eq(CL('srf/4.2.4/kill-switch'), C('provided'))],
  'breached', 'satisfied'), 'No precondition: this duty is never not_applicable.'));
put('srf/4.4/fraud-surveillance-commencement', emit(commencement(), 'in_force when the transaction executed on or after 16 June 2025 (Singapore time). missing_operand: no execution instant recorded.'));
put('srf/4.2.5/fn8/rapid-drain', emit(prim('held_judgment', F('fi.surveillance.rapid_drain_criteria_met')), 'Footnote 8, held rather than measured (F-05).'));
put('srf/4.2.5/surveillance-in-place', emit(gb('fi.surveillance.real_time_in_place', 'in_place', 'not_in_place')));
put('srf/4.2.5/response', emit(cr([not(undet(B('rapid_drain')))], eq(B('rapid_drain'), C(true)),
  guard(pres('fi.surveillance.response'), remap(prim('member_of_enumeration', F('fi.surveillance.response'), C(['blocked_until_verified', 'notified_and_held_24h'])), { member: C(true), not_member: C(false) }))),
  'not_applicable: the account was not rapidly drained of a material sum. undetermined: nobody assessed whether it was.'));
put('srf/4.2.5/duty', emit(fromCommencement('srf/4.4/fraud-surveillance-commencement', failsThenHolds(
  [eq(CL('srf/4.2.5/surveillance-in-place'), C('not_in_place')), eq(CL('srf/4.2.5/response'), C('breached'))],
  [eq(CL('srf/4.2.5/surveillance-in-place'), C('in_place')), or(eq(CL('srf/4.2.5/response'), C('satisfied')), eq(CL('srf/4.2.5/response'), C('not_applicable')))],
  'breached', 'satisfied')),
  'not_applicable before 16 June 2025 (4.4). From commencement: surveillance in place is unconditional and the response is required only on a rapid drain.'));
noResult('srf/4.3/scheduled-downtime');
put('srf/6.4/a/fi-complied-all', emit(conj(B('ok_4_2_1'), B('ok_4_2_2'), B('ok_4_2_3'), B('ok_4_2_4'), B('ok_4_2_5')),
  'satisfied only on five affirmative results; a never-arisen duty composes under A3\'s supplied resolution and blocks the tier unresolved.'));
put('srf/6.2/any-fi-breach', emit(disj(B('breach_4_2_1'), B('breach_4_2_2'), B('breach_4_2_3'), B('breach_4_2_4'), B('breach_4_2_5')),
  'true on one established breach whatever the others; false only on five affirmative non-breach results.'));
put('srf/6.2/loss-arises-from-fi-noncompliance', emit(prim('held_judgment', F('fi.loss_arises_from_noncompliance'))));
clauses['srf/6.2/fi-bears'] = { op: 'decision_table', inputs: [
  { name: 'any_breach', expr: CL('srf/6.2/any-fi-breach') },
  { name: 'causation', expr: judgmentDomain('srf/6.2/loss-arises-from-fi-noncompliance') },
] };
order.push('srf/6.2/fi-bears');
put('eupg/5.5/a/fraud-or-negligence', emit(prim('held_judgment', F('fi.fraud_or_negligence'))));
put('eupg/5.5/b/mas-requirement-noncompliance', emit(prim('held_judgment', F('fi.mas_requirement_noncompliance'))));
noResult('eupg/5.5/c/section-4-duties');
put('srf/6.3/loss-arises-from-action-or-omission', emit(prim('held_judgment', F('fi.loss_arises_from_action_or_omission'))));
put('srf/6.3/fi-responsible-notwithstanding', emit(conj(disj(jrc('eupg/5.5/a/fraud-or-negligence'), jrc('eupg/5.5/b/mas-requirement-noncompliance')), jrc('srf/6.3/loss-arises-from-action-or-omission')),
  'satisfied: 5.5(a) or (b) affirmed AND the loss arose from it. not_satisfied on an affirmative denial of both, or of causation.'));
clauses['srf/6/fi-tier'] = { op: 'decision_table', inputs: [
  { name: 'under_6_2', expr: CL('srf/6.2/fi-bears') },
  { name: 'under_6_3', expr: CL('srf/6.3/fi-responsible-notwithstanding') },
] };
order.push('srf/6/fi-tier');

// TELCO TIER
put('srf/7.7/perpetrated-through-sms', emit(guard(pres('scam.contact_platform'), cond(eq(F('scam.contact_platform'), C('sms')), C('sms'), C('not_sms'))),
  'The Telco tier arises only on `sms`. An OTT message is not_sms (2.1 `SMS`).'));
noResult('srf/5.1/imda-directions-prevail');
put('srf/5.2.1/deliver-only-from-authorised-aggregators', emit(tier(cr([pres('sms.sender_id_type')], B('sender_id_sms'), B('sms_from_authorised'))),
  'not_applicable: not perpetrated through SMS, or the SMS carried a telephone number rather than a Sender ID.'));
put('srf/5.2.2/block-unauthorised-sender-id', emit(tier(cr([pres('sms.sender_id_type'), not(undet(B('sms_from_authorised')))], and(B('sender_id_sms'), eq(B('sms_from_authorised'), C(false))), grFalse('sms.delivered_to_subscriber'))),
  'Arises only for a Sender ID SMS from an unauthorised source; breached when it was delivered. One unauthorised delivery breaches 5.2.1 and 5.2.2 together (A25).'));
put('srf/5.2.3/filter-implemented', emit(tier(gb('telco.filter.implemented_for_all_sms', 'implemented', 'not_implemented'))));
clauses['srf/5.2.3/designated-database'] = {
  op: 'ungrounded',
  applies: or(eq(CL('srf/5.2.3/filter-implemented'), C('implemented')), undet(CL('srf/5.2.3/filter-implemented'))),
  compute: guard(and(eq(CL('srf/5.2.3/filter-implemented'), C('implemented')), pres('telco.filter.database')),
    remap(prim('member_of_enumeration', F('telco.filter.database'), { op: 'meaning', key: 'designated_databases' }), { member: C('designated'), not_member: C('not_designated') })),
};
order.push('srf/5.2.3/designated-database');
put('srf/5.2.3/this-sms-blocked', emit(tier(cr([not(undet(jr('sms.url_listed_at_delivery')))], eq(jr('sms.url_listed_at_delivery'), C(true)), grFalse('sms.delivered_to_subscriber'))),
  'A5\'s second reading, as its own record. not_applicable: the URL was not listed at delivery (A6).'));
put('srf/5.2.3/duty', emit(tier(guard(not(eq(RES('A5_filter_duty_reading'), { op: 'absent' })), remap(RES('A5_filter_duty_reading'), {
  filter_in_place: cond(B('filter_fails'), C('breached'), guard(B('filter_holds'), C('satisfied'))),
  specific_sms_blocked: cond(or(B('filter_fails'), eq(CL('srf/5.2.3/this-sms-blocked'), C('breached'))), C('breached'),
    guard(and(B('filter_holds'), or(eq(CL('srf/5.2.3/this-sms-blocked'), C('satisfied')), eq(CL('srf/5.2.3/this-sms-blocked'), C('not_applicable')))), C('satisfied'))),
  $unmapped: C('undetermined'),
}))), 'Guarded on A5; unresolved, undetermined. `designated` on a supplied meaning composes as designated (the attribution is on srf/5.2.3/designated-database; F-08).'));
put('srf/6.4/b/any-telco-breach', emit(disj(B('breach_5_2_1'), B('breach_5_2_2'), B('breach_5_2_3')), 'Outside the Telco tier every input is not_applicable and this is false; srf/6.4/telco-bears gates on 7.7 before reading it.'));
put('srf/6.4/loss-arises-from-telco-noncompliance', emit(prim('held_judgment', F('telco.loss_arises_from_noncompliance'))));
put('srf/6.6/subscriber-not-account-holder', emit(cr([pres('telco.subscriber_is_account_holder')], eq(F('telco.subscriber_is_account_holder'), C(false)),
  allReq(gr('telco.number_designated_for_notifications'), gr('telco.number_received_phishing_sms'))),
  'not_applicable: the subscriber is the account holder. breached: the subscriber differs and (a) or (b) fails, so the Telco does not bear under 6.6.'));
// THE DUTY QUESTION IS DECIDED BEFORE CAUSATION OR 6.6 IS READ. An undetermined 5.2 duty blocks the
// tier (the brief's rule: undetermined on any duty blocks the waterfall from advancing past that
// tier), so an affirmative denial of causation cannot close the tier while a duty is open. 6.4(a)
// failing (the FI did not comply with all of 4.2) closes it first: 6.5 puts the loss on the FI.
put('srf/6.4/telco-bears', emit(tier(cond(eq(B('fi_complied_all_ok'), C(false)), C('telco_not_liable'),
  guard(and(eq(B('fi_complied_all_ok'), C(true)), not(undet(CL('srf/6.4/b/any-telco-breach')))),
    cond(eq(CL('srf/6.4/b/any-telco-breach'), C(false)), C('telco_not_liable'),
      failsThenHolds([eq(B('telco_causation'), C(false)), eq(B('six_six_ok'), C(false))], [eq(B('telco_causation'), C(true)), eq(B('six_six_ok'), C(true))], 'telco_not_liable', 'telco_bears'))))),
  'not_applicable: not perpetrated through SMS. telco_not_liable when the FI did not comply with all of 4.2 (6.5), or on five affirmative non-breach findings, or on an affirmative denial of causation or of 6.6 AFTER a breach is established. An undetermined 5.2 duty blocks the tier before causation is read. telco_bears on affirmative findings only.'));

// CONSUMER OUTCOME
noResult('srf/6.5/fi-first');
clauses['srf/6.7/outcome'] = { op: 'decision_table', inputs: [
  { name: 'scope', expr: CL('srf/7.1.1/relevant-claim') },
  { name: 'fi_tier', expr: CL('srf/6/fi-tier') },
  { name: 'telco_tier', expr: CL('srf/6.4/telco-bears') },
] };
order.push('srf/6.7/outcome');
noResult('srf/6.1/fn11/loss-excludes-consequential');
noResult('srf/6.8/redress');
noResult('srf/6.9/joint-accounts');
put('srf/3.1/official-sources', emit(prim('held_judgment', F('user.referred_to_official_sources')), 'Not read by Section 6 (A19).'));
put('srf/3.1/no-links', emit(prim('held_judgment', F('user.clicked_unexpected_link')), 'affirmed means the user clicked an unexpected link. Not read by Section 6 (A19).'));
put('eupg/3.17/kill-switch-activated-promptly', emit(prim('held_judgment', F('holder.kill_switch_activated_promptly')), 'Not read by Section 6 (A19).'));
put('eupg/5.2/recklessness', emit(prim('held_judgment', F('holder.recklessness_primary_cause')), 'EUPG liability, not SRF allocation. Not read by Section 6 (A19).'));

// PROCESS
noResult('srf/7.1/four-stage-workflow');
put('srf/7.2/explain-workflow', emit(gb('fi.workflow_explained_at_report', 'explained', 'not_explained')));
put('srf/7.3/report-within-30-days', emit(prim('elapsed_within', F('fi.alerts.first_sent_at'), F('claim.reported_at'), C(30), C('calendar_days'), F('clock.now')),
  'The SRF clock: from the FI sending the first alert (A8a). No Section 6 consequence is encoded (A8).'));
put('srf/7.3/fn14/reasons-for-delay', emit(cr([not(eq(CL('srf/7.3/report-within-30-days'), C('no_end_event'))), pres('fi.requested_delay_reasons')],
  and(B('report_late'), isTrue('fi.requested_delay_reasons')), gr('claim.delay_reasons_provided')),
  'not_applicable: the report was in time, or the FI did not ask.'));
put('srf/7.3/email-and-information-within-3-days', emit(guard(pres('claim.email_provided'), cond(isTrue('claim.email_provided'),
  prim('elapsed_within', F('claim.reported_at'), F('claim.submission_at'), C(3), C('calendar_days'), F('clock.now')), C('no_email'))),
  'no_email: no valid email address was furnished. Otherwise elapsed_within\'s tokens over the 3 days from the report.'));
put('srf/7.4/communication-records', emit(failsThenHolds(
  [eq(jr('claim.records.show_impersonation'), C(false)), eq(jr('claim.records.show_credential_intent'), C(false)), eq(jr('claim.records.show_platform_direction'), C(false))],
  [eq(jr('claim.records.show_impersonation'), C(true)), eq(jr('claim.records.show_credential_intent'), C(true)), eq(jr('claim.records.show_platform_direction'), C(true))],
  'not_demonstrated', 'demonstrated'), 'Not read by 7.1.1 (A26).'));
put('srf/7.4/fn15/telco-details', emit(tier(guard(and(pres('claim.telco_named'), pres('claim.mobile_number_provided'), pres('claim.sms_details_provided')),
  cond(and(isTrue('claim.telco_named'), isTrue('claim.mobile_number_provided'), isTrue('claim.sms_details_provided')), C('supplied'), C('not_supplied'))))));
put('srf/7.5/transaction-information-on-enquiry', emit(cr([pres('claim.holder_enquired')], isTrue('claim.holder_enquired'), gr('fi.provided_transaction_information'))));
put('srf/7.6/out-of-scope-route', emit(cr([B('scope_known')], eq(CL('srf/7.1.1/relevant-claim'), C('not_relevant')), gr('fi.communicated_out_of_scope_assessment')),
  'not_applicable: a relevant claim, which Section 6 allocates.'));
put('srf/7.7/inform-telco', emit(cr([B('sms_known'), B('scope_known')], and(B('sms_tier'), eq(CL('srf/7.1.1/relevant-claim'), C('relevant_claim'))), gr('fi.informed_telco'))));
noResult('srf/7.7.1/concurrent-investigation');
put('srf/7.8/fi-independent-governance', emit(gb('fi.governance.independent', 'independent', 'not_independent')));
put('srf/7.8/telco-independent-governance', emit(cr([B('sms_known')], B('sms_tier'), gr('telco.governance.independent'))));
put('srf/7.9/investigation-timeline', emit(guard(pres('fi.investigation.complexity'),
  prim('elapsed_within', F('claim.reported_at'), F('fi.investigation.completed_at'), cond(eq(F('fi.investigation.complexity'), C('complex')), C(45), C(21)), C('business_days'), F('clock.now'))),
  'The limit is selected by the FI\'s recorded classification; unrecorded is undetermined, never 21. Weekdays only (A28).'));
noResult('srf/7.9/fn16/retention');
put('srf/7.10/written-outcome', emit(guard(and(pres('fi.outcome.written_reply_given'), pres('fi.outcome.acknowledgement_sought')),
  cond(and(isTrue('fi.outcome.written_reply_given'), isTrue('fi.outcome.acknowledgement_sought')), C('given'), C('not_given')))));
noResult('srf/7.11/recourse');
put('eupg/1.5/deferred-commencement', emit(commencement(), 'in_force when the transaction executed on or after 16 June 2025 (Singapore time).'));
put('eupg/8.1/withhold-charges', emit(fromCommencement('eupg/1.5/deferred-commencement', gb('fi.charges_withheld', 'withheld', 'not_withheld')), 'not_applicable before 16 June 2025 (EUPG 1.5).'));
put('srf/7.13/fi-credits', emit(cr([not(undet(CL('srf/6.7/outcome')))], eq(CL('srf/6.7/outcome'), C('fi_bears')), gr('fi.credited_total_loss')), 'Arises only on an fi_bears outcome.'));
put('srf/7.14/telco-credits', emit(cr([not(undet(CL('srf/6.7/outcome')))], eq(CL('srf/6.7/outcome'), C('telco_bears')), gr('telco.credited_total_loss')), 'Arises only on a telco_bears outcome.'));
put('eupg/3.14/report-within-30-days-of-receipt', emit(prim('elapsed_within', F('holder.first_alert_received_at'), F('claim.reported_at'), C(30), C('calendar_days'), F('clock.now')), 'The EUPG clock: from receipt (A8a).'));
put('eupg/3.18/information-on-request', emit(cr([pres('fi.requested_3_18_information')], isTrue('fi.requested_3_18_information'), jr('holder.provided_3_18_information_in_reasonable_time'))));
put('eupg/3.20/police-report-within-3-days', emit(cr([pres('fi.police_report_requested')], isTrue('fi.police_report_requested'),
  remap(prim('elapsed_within', F('fi.police_report_requested_at'), F('holder.police_report_furnished_at'), C(3), C('calendar_days'), F('clock.now')), {
    within: C(true), exceeded: C(false), overdue: C(false), not_yet_due: C('outstanding'), out_of_order: C(true), no_end_event: C('undetermined'),
  })), 'outstanding: requested, not yet furnished, 3 days still running. out_of_order (furnished before the request) satisfies.'));
noResult('eupg/4.11/holder-preference');
put('eupg/4.14/kill-switch-characteristics', emit(guard(and(pres('fi.kill_switch.disallows_non_biller_transfers'), pres('fi.kill_switch.terminates_sessions'), pres('fi.kill_switch.prominent')),
  cond(and(isTrue('fi.kill_switch.disallows_non_biller_transfers'), isTrue('fi.kill_switch.terminates_sessions'), isTrue('fi.kill_switch.prominent')), C('conforming'), C('not_conforming'))), 'Not read by SRF 4.2.4 (A21).'));
put('eupg/4.20/reporting-channel-characteristics', emit(guard(and(pres('fi.report_acknowledged_in_writing'), pres('fi.report_fee_charged')),
  cond(and(isTrue('fi.report_acknowledged_in_writing'), eq(F('fi.report_fee_charged'), C(false))), C('conforming'), C('not_conforming'))), 'Not read by SRF 4.2.4 (A21).'));
put('eupg/4.21/detection-and-blocking', emit(fromCommencement('eupg/1.5/deferred-commencement', guard(and(pres('fi.detection.capability_at_all_times'), pres('fi.detection.annual_review')),
  cond(and(isTrue('fi.detection.capability_at_all_times'), isTrue('fi.detection.annual_review')), C('in_place'), C('not_in_place')))), 'Not read by SRF 4.2.5 (A21).'));

// ─── assemble ───────────────────────────────────────────────────────────────────────────────────
const evaluation = {
  $note: 'The evaluation layer for the MAS/IMDA Shared Responsibility Framework register. GENERATED by author-evaluation.mjs from the shapes named there; do not edit by hand. The descriptive half is taken from clauses.json and ambiguities.json by _phase0/build-register.mjs and is not repeated here.',
  $generated_by: 'mas-srf-2024/author-evaluation.mjs',
  evaluation_version: '0.1.0',
  $emit_order_note: 'THE ORDER A DETERMINATION IS REPORTED IN, and the order of the Section 6 waterfall: scope, then the FI duties and tier, then 7.7 and the Telco duties and tier, then the consumer outcome, then the Section 7 workflow. Every clause reference resolves to a clause emitted earlier (R3). No-result clauses are placed beside the clauses that consume their meaning.',
  emit_order: order,
  $resolution_keys_note: 'The two ambiguities wired as guards. Supplied under resolutions.<key>; absent leaves the guarded clause undetermined.',
  resolution_keys: { A3: 'A3_not_applicable_duty', A5: 'A5_filter_duty_reading' },
  ungrounded_terms: {
    $note: 'Two terms the instruments decide outcomes with and supply no meaning for. The interpreter NEVER supplies one. Declared once for the domain.',
    undetermined_because: { op: 'concat', parts: [C('the operative term `'), { op: 'ungrounded_term' }, C('` is ungrounded: neither the SRF Guidelines nor the EUPG defines it or points to what does')] },
    attribution: { rests_on: C('a meaning supplied by the institution, not by the Guidelines'), term: { op: 'ungrounded_term' } },
  },
  no_result_emission: {
    $note: 'DECLARED PER DISPOSITION, NOT PER CLAUSE. The interpreter refuses to evaluate any clause in one of these categories and refuses to read a result from one.',
    DEFINITIONAL: { no_result: C('DEFINITIONAL'), supplies: { op: 'coalesce', value: { op: 'clause_field', name: 'operative_weight' }, fallback: C('a meaning other clauses consume') } },
    INSTRUCTION: { refused: C('INSTRUCTION'), why: C('directs an act; no fact of the claim makes it true or false, so it has no result domain') },
  },
  bindings,
  clauses,
};
const out = new URL('./evaluation.json', import.meta.url).pathname;
writeFileSync(out, JSON.stringify(evaluation, null, 1) + '\n');
console.log(`wrote evaluation.json: ${order.length} in emit order, ${Object.keys(clauses).length} carrying an evaluation`);
