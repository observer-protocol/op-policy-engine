#!/usr/bin/env node
/**
 * Six synthetic claim scenarios over the SRF register, one per outcome the Section 6 waterfall can
 * reach plus the two undetermined tiers and the out-of-scope route. SYNTHETIC: every fact is
 * authored; no bank's, Telco's or account holder's record is behind any of them, and no figure from
 * this file is a measurement of anything.
 *
 * Facts are authored FROM THE CLAUSE TEXT (which facts each clause reads), never from the outcome
 * wanted: the outcome is what the evaluator says, and the scenario's name is checked against it
 * after the run (a name that disagrees with the result is a defect in the scenario, reported, not
 * a reason to move a fact).
 */
import { evaluate } from './evaluate.mjs';
const clone = (o) => JSON.parse(JSON.stringify(o));

// A relevant claim, perpetrated through SMS, every FI and Telco duty discharged where it arose.
export const base = {
  account: { holder_type: 'individual', issuer_type: 'bank', card_transaction: false, balance_capable_over_1000_sgd: true, credit_facility: false, electronic_payments_capable: true, stores_specified_emoney: false },
  scam: { impersonated_entity_type: 'sg_incorporated_entity', contact_platform: 'sms', credentials_entered_on_fabricated_platform: true, transactions_unintended: 'affirmed' },
  transaction: { executed_at: '2026-03-02T10:00:00+08:00', above_holder_threshold: null, above_baseline_threshold: 'affirmed' },
  telco: { operator_type: 'mno', authorised_aggregators: ['agg-alpha', 'agg-beta'], filter: { implemented_for_all_sms: true, database: 'sg-scamshield-url-db' },
           loss_arises_from_noncompliance: 'denied', subscriber_is_account_holder: true, number_designated_for_notifications: null, number_received_phishing_sms: null,
           governance: { independent: true }, credited_total_loss: false },
  sms: { sender_id_type: 'alphanumeric_sender_id', received_from: 'aggregator', aggregator: 'agg-alpha', delivered_to_subscriber: true, url_listed_at_delivery: 'denied' },
  fi: { events: { token_activated: true, new_device_login: false, high_risk_activity: true },
        cooling_off: { at_least_12h_imposed: 'affirmed', high_risk_prevented: 'affirmed' },
        alerts: { token_activation_real_time: 'affirmed', new_device_login_real_time: null, high_risk_activity_real_time: 'affirmed', outgoing_transaction_real_time: 'affirmed', first_sent_at: '2026-03-02T10:01:00+08:00' },
        reporting_channel: { available_at_all_times: true },
        kill_switch: { self_service: true, blocks_mobile_and_online: true, disallows_non_biller_transfers: true, terminates_sessions: true, prominent: true },
        surveillance: { real_time_in_place: true, rapid_drain_criteria_met: 'denied', response: 'none' },
        loss_arises_from_noncompliance: 'denied', fraud_or_negligence: 'denied', mas_requirement_noncompliance: 'denied', loss_arises_from_action_or_omission: 'denied',
        requested_delay_reasons: false, provided_transaction_information: true, communicated_out_of_scope_assessment: false, informed_telco: true, workflow_explained_at_report: true,
        governance: { independent: true }, investigation: { completed_at: '2026-03-20T15:00:00+08:00', complexity: 'straightforward' },
        outcome: { written_reply_given: true, acknowledgement_sought: true }, charges_withheld: true, credited_total_loss: false,
        requested_3_18_information: true, police_report_requested: true, police_report_requested_at: '2026-03-03T10:00:00+08:00',
        report_acknowledged_in_writing: true, report_fee_charged: false, detection: { capability_at_all_times: true, annual_review: true } },
  holder: { instructed_transaction_notifications: true, notification_threshold_set: false, first_alert_received_at: '2026-03-02T10:01:00+08:00',
            provided_3_18_information_in_reasonable_time: 'affirmed', police_report_furnished_at: '2026-03-04T09:00:00+08:00', recklessness_primary_cause: 'denied', kill_switch_activated_promptly: 'affirmed' },
  user: { referred_to_official_sources: 'denied', clicked_unexpected_link: 'affirmed' },
  claim: { reported_at: '2026-03-03T09:00:00+08:00', submission_at: '2026-03-04T09:00:00+08:00', email_provided: true, delay_reasons_provided: null,
           records: { show_impersonation: 'affirmed', show_credential_intent: 'affirmed', show_platform_direction: 'affirmed' },
           telco_named: true, mobile_number_provided: true, sms_details_provided: true, holder_enquired: true },
  clock: { now: '2026-04-01T09:00:00+08:00' },
};
// The resolutions and meanings a clean run needs. Every one is an INSTITUTIONAL input the register
// refuses to default: without them the waterfall stops at the FI tier (A3) or the Telco tier (A5).
export const resolved = {
  A3_not_applicable_duty: 'counts_as_complied',
  A5_filter_duty_reading: 'filter_in_place',
  ungrounded_terms: {
    'designated database': { designated_databases: ['sg-scamshield-url-db'] },
    'default industry-baseline transaction notification threshold': { baseline_sgd: 0.01 },
  },
};

// 1. FI breach: the token was activated and no cooling-off period was imposed; the loss arose from it.
const f1 = clone(base);
f1.fi.cooling_off.at_least_12h_imposed = 'denied';
f1.fi.loss_arises_from_noncompliance = 'affirmed';
f1.fi.credited_total_loss = true;
const c1 = { name: 'FI breach: no 12-hour cooling-off after token activation', expect: 'fi_bears', facts: f1, res: clone(resolved) };

// 2. Telco breach: the FI discharged every duty; the Sender ID SMS came from an unregistered aggregator.
const f2 = clone(base);
f2.sms.aggregator = 'agg-rogue';
f2.telco.loss_arises_from_noncompliance = 'affirmed';
f2.telco.credited_total_loss = true;
const c2 = { name: 'Telco breach: Sender ID SMS delivered from an unauthorised aggregator', expect: 'telco_bears', facts: f2, res: clone(resolved) };

// 3. Clean waterfall: every duty discharged where it arose, on both tiers, with A3 and A5 resolved.
const c3 = { name: 'Clean waterfall: both tiers affirmatively not liable, the account holder bears', expect: 'account_holder_bears', facts: clone(base), res: clone(resolved) };

// 4. Undetermined at the FI tier: nobody assessed whether the cooling-off period was imposed.
const f4 = clone(base);
f4.fi.cooling_off.at_least_12h_imposed = 'not_assessed';
const c4 = { name: 'Undetermined at the FI tier: cooling-off not assessed', expect: 'undetermined', facts: f4, res: clone(resolved) };

// 5. Undetermined at the Telco tier: the FI tier closed not liable; A5 was not resolved, so 5.2.3 cannot close.
const c5 = { name: 'Undetermined at the Telco tier: A5 unresolved', expect: 'undetermined', facts: clone(base), res: { ...clone(resolved), A5_filter_duty_reading: undefined } };

// 6. Out of scope: a corporate account holder. Everything else as the clean case.
const f6 = clone(base);
f6.account.holder_type = 'corporate';
f6.fi.communicated_out_of_scope_assessment = true;
const c6 = { name: 'Out of scope: corporate account holder', expect: 'out_of_scope', facts: f6, res: clone(resolved) };

export const CASES = [c1, c2, c3, c4, c5, c6];

const pad = (s, n) => String(s).padEnd(n);
let disagreements = 0;
for (const c of [c1, c2, c3, c4, c5, c6]) {
  console.log('\n' + '='.repeat(100));
  console.log(c.name);
  console.log('  resolutions supplied: ' + JSON.stringify(c.res));
  console.log('='.repeat(100));
  const r = evaluate(c.facts, c.res);
  for (const [id, v] of Object.entries(r)) console.log('  ' + pad(id, 58) + pad(v.result ?? v.no_result ?? v.refused, 34) + v.waiting);
  const outcome = r['srf/6.7/outcome'].result;
  const ok = outcome === c.expect;
  if (!ok) disagreements++;
  console.log(`  OUTCOME ${outcome}  (scenario named for ${c.expect}: ${ok ? 'agrees' : 'DISAGREES'})`);
}
console.log(disagreements === 0 ? '\nEvery scenario\'s name agrees with its outcome.' : `\n${disagreements} scenario name(s) DISAGREE with the outcome; the scenario is wrong, not the register.`);
