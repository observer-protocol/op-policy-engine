#!/usr/bin/env node
/**
 * SYNTHETIC BILL DETERMINATIONS for 12 NYCRR 325-1.25. No real claims, providers, names or scraped
 * records. Every value is drawn from the fact schema's declared kind (versions/regulation/facts.json)
 * or from a population parameter stated here. No value is chosen to reach a result.
 *
 * POPULATION PARAMETERS (choices, stated so a reader can discount them):
 *   N                        600 determinations, seed 20260825 (seeded PRNG; rerunning reproduces);
 *                            a different N or seed is a different population with a different digest
 *   provider class           uniform over the eleven declared classes; hospital outpatient 10%
 *   dates                    care rendered on a ladder; submitted 0 to 130 days after care on a
 *                            ladder around the 120-day limit; received 0 to 6 days after submission
 *                            (NY25-A1 is only visible when they differ); clock.now on a ladder
 *   carrier action           paid_full 35% / paid_partial 15% / objected 35% / none 15%; action day
 *                            on a ladder around 45 (10, 30, 40, 44, 45, 46, 60, 100) from receipt
 *   objections               kinds drawn 1 to 3 from legal/valuation/mtg; grounds uniform over the
 *                            declared enumerations including `other` and `s25a_liability`; forms
 *                            uniform over C-8.1B / C-8.4 / EOB / other; recipients: the full set 60%,
 *                            provider+board 25%, provider only 15%; simultaneous 80%
 *   award request            present on 45% of bills not paid in full; request day on a ladder
 *                            around 45 and 120; certifications each true 85%; complete 90%;
 *                            eCase match 85%; Board-file match 85%; prior request 10%
 *   legal issues / decisions on 30% of bills with a legal or MTG objection; dates laddered around 30
 *   report elements          each present 80%; narrative table applied by layer A only
 *   meanings                 four ungrounded terms; for EACH, independently, supplied 50% / unsupplied
 *                            50%. authorized true 90%; prescribed format true 80%; report legally
 *                            defective true 30%; fee schedule: scheduled and maximum amounts drawn by
 *                            type, conforms true 80%. Not chosen to land any rate
 *   optional facts           each unsupplied (undefined) 5% of the time
 *
 *   node generate-determinations.mjs [N] -> determinations.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parametersFromGeneratorHeader } from '../nywc-12nycrr-fee/figure.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const N = Number(process.argv[2] ?? 600);
const SEED = 20260825;
let s = SEED >>> 0;
const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const chance = (p) => rnd() < p;
const weighted = (pairs) => { const r = rnd(); let acc = 0; for (const [v, w] of pairs) { acc += w; if (r < acc) return v; } return pairs[pairs.length - 1][0]; };
const maybe = (v) => (chance(0.05) ? undefined : v);
const facts = JSON.parse(readFileSync(`${HERE}/versions/regulation/facts.json`, 'utf8'));
const enumOf = (f) => facts.fields.find((x) => x.field === f).domain.values;
const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10) + 'T00:00:00Z';
const plus = (isoDate, days) => iso(Date.parse(isoDate) + days * DAY);
const money = (cents) => ({ amountRaw: String(cents), decimals: '2', currency: 'USD' });
const AMOUNTS = [4000, 8500, 12000, 15000, 22500, 31000, 48000, 75000, 120000];
const CARE = ['2019-11-15T00:00:00Z', '2025-06-10T00:00:00Z', '2025-09-02T00:00:00Z', '2026-01-20T00:00:00Z', '2026-03-02T00:00:00Z', '2026-05-15T00:00:00Z'];

const determinations = [];
for (let i = 1; i <= N; i++) {
  const care = pick(CARE);
  const submitted = plus(care, pick([5, 30, 90, 119, 120, 121, 150]));
  const received = plus(submitted, pick([0, 0, 1, 3, 6]));
  const action = weighted([['paid_full', 0.35], ['paid_partial', 0.15], ['objected', 0.35], ['none', 0.15]]);
  const actionAt = action === 'none' ? undefined : plus(received, pick([10, 30, 40, 44, 45, 46, 60, 100]));
  const amount = pick(AMOUNTS);
  const f = {
    bill: { care_rendered_at: maybe(care), care_last_day_at: care, submitted_at: submitted, received_at: maybe(received), format_per_325_1_3: maybe(chance(0.85)), electronic: maybe(chance(0.8)), matches_cms1500_matrix: maybe(chance(0.8)), hospital_outpatient: chance(0.1), uds_format: maybe(chance(0.8)), amount: money(amount), provider_class: pick(enumOf('bill.provider_class')) },
    claim: { accepted_or_established: maybe(chance(0.75)), body_part_mtg_covered: maybe(chance(0.6)), medically_necessary: maybe(pick(enumOf('claim.medically_necessary'))) },
    care: { within_mtg_criteria: maybe(pick(enumOf('care.within_mtg_criteria'))), provided_promptly: maybe(pick(enumOf('care.provided_promptly'))), variance_proper_324_3: maybe(chance(0.2)), authorized_325_1_4_or_441: maybe(chance(0.3)), agreed_by_carrier: maybe(chance(0.2)), ordered_by_board: maybe(chance(0.1)), agreed_amount: chance(0.2) ? money(pick(AMOUNTS)) : undefined },
    carrier: { action, action_at: actionAt, paid_amount: action === 'paid_full' ? money(amount) : action === 'paid_partial' ? money(Math.round(amount / 2)) : undefined, notice_reasons_stated: maybe(chance(0.85)), notice_recipients: undefined, notice_deadline_at: plus(received, 45), uncontested_portion_paid_within_45: maybe(chance(0.7)) },
    claimant: { has_attorney: maybe(chance(0.5)) },
    objection: {}, par: {}, report: { work_status_present: maybe(chance(0.8)), causal_relationship_present: maybe(chance(0.8)), temporary_impairment_present: maybe(chance(0.8)) },
    request: {}, chair: {}, legal_issues: {}, proposed_award: {}, arbitration: {}, decision: {},
    clock: { now: pick(['2026-04-01T00:00:00Z', '2026-06-01T00:00:00Z', '2026-08-25T00:00:00Z', '2026-12-31T00:00:00Z']) },
  };
  if (action === 'objected' || action === 'paid_partial') {
    f.carrier.notice_recipients = maybe(weighted([[['provider', 'claimant', 'claimant_attorney', 'board'], 0.6], [['provider', 'board'], 0.25], [['provider'], 0.15]]));
    const kinds = []; for (const k of ['legal', 'valuation', 'mtg']) if (chance(0.45)) kinds.push(k); if (!kinds.length) kinds.push(pick(['legal', 'valuation', 'mtg']));
    f.objection = { kinds: maybe(kinds), made_at_list: maybe(chance(0.8) || kinds.length < 2 ? [actionAt] : [actionAt, plus(actionAt, 7)]),
      legal_ground: kinds.includes('legal') ? maybe(pick(enumOf('objection.legal_ground'))) : undefined, valuation_ground: kinds.includes('valuation') ? maybe(pick(enumOf('objection.valuation_ground'))) : undefined, mtg_ground: kinds.includes('mtg') ? maybe(pick(enumOf('objection.mtg_ground'))) : undefined,
      legal_form: kinds.includes('legal') ? maybe(pick(enumOf('objection.legal_form'))) : undefined, valuation_form: kinds.includes('valuation') ? maybe(pick(enumOf('objection.valuation_form'))) : undefined, mtg_form: kinds.includes('mtg') ? maybe(pick(enumOf('objection.mtg_form'))) : undefined,
      only_fee_schedule_excess: maybe(kinds.length === 1 && kinds[0] === 'valuation' && chance(0.5)), eob_filed: maybe(chance(0.4)), basis_stated: maybe(chance(0.8)) };
    f.par = { applicable: maybe(chance(0.3)), objection_raised_in_response: maybe(chance(0.7)), denial_attached: maybe(chance(0.7)) };
    if ((kinds.includes('legal') || kinds.includes('mtg')) && chance(0.3)) {
      f.legal_issues = { timely_raised: maybe(chance(0.8)), finally_determined_adversely_at: maybe(chance(0.7) ? plus(actionAt, pick([20, 60, 120])) : undefined) };
      f.decision = { found_for_provider: maybe(chance(0.6)), filed_at: plus(actionAt, 90), carrier_paid_at: maybe(chance(0.7) ? plus(actionAt, 90 + pick([10, 29, 30, 31, 60])) : undefined), simultaneous_valuation_objection: maybe(kinds.includes('valuation') && chance(0.7)), review_application_filed: maybe(chance(0.3)), wclj_decision_filed_at: maybe(chance(0.5) ? plus(actionAt, 150) : undefined) };
    }
    if (kinds.includes('valuation')) f.arbitration = { parties_agree_on_value: maybe(chance(0.3)), request_submitted_at: maybe(chance(0.4) ? plus(actionAt, pick([20, 60])) : undefined) };
  }
  if (action !== 'paid_full' && chance(0.45)) {
    const reqAt = plus(submitted, pick([30, 44, 45, 46, 100, 160, 200]));
    f.request = { submitted_at: reqAt, nonpayment_notice_received_at: maybe(actionAt), liability_decision_at: maybe(chance(0.3) ? plus(submitted, 60) : undefined), prior_request_same_dos: maybe(chance(0.1)), complete: maybe(chance(0.9)), info_matches_ecase: maybe(chance(0.85)), bill_matches_board_file: maybe(chance(0.85)),
      cert_timely_not_returned: maybe(chance(0.85)), cert_no_payment_45_or_30: maybe(chance(0.85)), cert_no_valuation_issues: maybe(chance(0.85)), cert_format: maybe(chance(0.85)), written_application_for_delay: maybe(chance(0.2)) };
    f.chair = { good_cause_found: maybe(pick(enumOf('chair.good_cause_found'))) };
    if (chance(0.5)) f.proposed_award = { date: plus(reqAt, 30), filing_date: plus(reqAt, 30 + pick([20, 29, 30, 31, 45])), objection_received_at: maybe(chance(0.3) ? plus(reqAt, 30 + pick([10, 35])) : undefined), award_made: maybe(chance(0.7)), interest_paid_per_300_19: maybe(chance(0.8)) };
  } else { f.request = { written_application_for_delay: maybe(chance(0.1)) }; f.chair = { good_cause_found: maybe(pick(enumOf('chair.good_cause_found'))) }; }

  const meanings = {};
  if (chance(0.5)) meanings['authorized'] = { provider_authorized: chance(0.9) };
  if (chance(0.5)) meanings['format prescribed by the Chair for such purpose'] = { notice_in_prescribed_format: chance(0.8) };
  if (chance(0.5)) meanings['applicable fee schedule'] = { scheduled_amount: money(pick(AMOUNTS)), maximum_amount: money(pick(AMOUNTS)), bill_conforms: chance(0.8) };
  if (chance(0.5)) meanings['legally defective'] = { report_legally_defective: chance(0.3) };
  determinations.push({ id: `NY325-SYN-${String(i).padStart(4, '0')}`, facts: f, resolutions: Object.keys(meanings).length ? { ungrounded_terms: meanings } : {} });
}
const params = parametersFromGeneratorHeader(HERE);
const population = { $source: 'the POPULATION PARAMETERS block of this generator, one copy; this is a derived copy checked by digest', $generator_label: 'nywc-325-1-25/generate-determinations.mjs', seed: SEED, count: N, parameters_sha256: params.sha256, parameters_text: params.text };
writeFileSync(`${HERE}/determinations.json`, JSON.stringify({ $note: 'SYNTHETIC bill determinations for 12 NYCRR 325-1.25; see the generator header. Results are never stored beside the facts.', seed: SEED, count: N, population, determinations }) + '\n');
const tally = {}; for (const d of determinations) tally[d.facts.carrier.action] = (tally[d.facts.carrier.action] ?? 0) + 1;
console.log(`generated ${N} synthetic determinations (seed ${SEED}) -> determinations.json; by carrier action ${JSON.stringify(tally)}; with an award request ${determinations.filter((d) => d.facts.request.submitted_at).length}`);
