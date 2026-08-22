// For every fact a predicate reads: does making it ABSENT produce a DECIDED clause result?
// A decided result asserts something about the world. An unanswerable one declines to.
const LIB = new URL('..', import.meta.url).pathname;
const bx = (await import(`${LIB}/banxico-34-2010/evaluate.mjs`)).evaluate;
const psr = (await import(`${LIB}/psr-2017-752/evaluate.mjs`)).evaluate;
const UNANSWERABLE = new Set(['not_applicable', 'undetermined', 'no_end_event', 'missing_operand',
  'no_candidate', 'not_assessed', 'outstanding', 'not_yet_due', 'out_of_order', 'not_yet_attached']);

const bxBase = () => ({
  notice: { type: 'reclamacion_cargo_no_reconocido', reference: 'R', received_at: '2026-05-04T09:12:00Z' },
  operation: { executed_abroad: false, occurred_at: '2026-04-28T19:41:00Z', acquirer_name: 'A', merchant_name: 'M',
               auth_factors: ['2.6.a.i_knowledge', '2.6.a.ii_device_or_chip'] },
  dictamen: { made_available_at: '2026-09-01T11:00:00Z', channel: 'sucursal', signatory_id: 's',
              language_is_plain: 'affirmed', evidence_of_factors_present: true, verification_method_stated: true,
              device_address: { physical_address: 'x', ip_address: null } },
  cardholder: { channel_election: 'sucursal' }, issuer: { authorised_signatories: ['s'], holds_device_address: true },
  account: { charges_posted: [] }, charge: { derived_from_2_6_a_operation: 'demonstrated' },
  expediente: { requested: true, delivered_at: '2026-09-20T11:00:00Z' },
});
const psrBase = () => ({
  transaction: { debit_date: '2026-03-02T10:00:00Z', amount: { amountRaw:'1', decimals:'2', currency:'GBP' }, via_pisp: true },
  consent: { to_transaction: 'sig', form: 'f', given_after_execution: false },
  agreement: { agreed_forms: ['f'], post_execution_consent_agreed: true },
  notification: { given_at: '2026-03-05T09:00:00Z', without_undue_delay: 'affirmed' },
  provider: { part6_information_failure: true, became_aware_at: '2026-03-05T09:00:00Z',
              reasonable_grounds_to_suspect_fraud: false, poca_notification_in_writing: null,
              claims_fraud_or_gross_negligence: true,
              burden: { authenticated:'affirmed', accurately_recorded:'affirmed', entered_in_accounts:'affirmed', no_technical_deficiency:'affirmed' } },
  evidence: { instrument_use_record: 'log', supporting_evidence_given_to_payer: 'doc' },
  refund: { amount: { amountRaw:'1', decimals:'2', currency:'GBP' }, provided_at: '2026-03-06T16:00:00Z', credit_value_date: '2026-03-02T10:00:00Z', as_soon_as_practicable: 'affirmed' },
  account: { restoration_applicable: true, restored_to_prior_state: 'affirmed' },
  pisp: { burden_discharged: 'affirmed', liable: true, compensated: true }, aspsp: { compensation_requested: true },
  order: { irrevocable_from: '2026-03-02T09:00:00Z' },
});
// the predicate-bearing facts, read off the call sites
const BX = ['operation.executed_abroad','operation.auth_factors','issuer.holds_device_address',
            'expediente.requested','cardholder.channel_election','dictamen.evidence_of_factors_present',
            'dictamen.verification_method_stated'];
const PSR = ['transaction.via_pisp','consent.given_after_execution','provider.part6_information_failure',
             'provider.claims_fraud_or_gross_negligence','account.restoration_applicable',
             'provider.reasonable_grounds_to_suspect_fraud','pisp.liable','aspsp.compensation_requested'];

const del = (o, path) => { const p = path.split('.'); let c = o; for (let i=0;i<p.length-1;i++) c = c[p[i]]; delete c[p[p.length-1]]; return o; };
// A clause DEPENDS on a field if its result differs between the field's two recorded values. Then the
// question is what ABSENT gives for those clauses.
//
// The first version of this sweep compared absent against recorded-false and skipped anything that
// matched. That is exactly the pair E9 says are indistinguishable, so the sweep silently skipped the
// defect it was written to find. Recorded rather than quietly repaired.
const setP = (o, path, v) => { const p = path.split('.'); let c = o; for (let i=0;i<p.length-1;i++) c = (c[p[i]] ??= {}); c[p[p.length-1]] = v; return o; };
const ALT = { 'operation.auth_factors': [['2.6.a.i_knowledge','2.6.a.ii_device_or_chip'], []],
              'cardholder.channel_election': ['sucursal', 'medio_convenido'] };
const run = (name, base, ev, fields, res) => {
  console.log(`\n${name}`);
  const hits = [];
  for (const f of fields) {
    const [vA, vB] = ALT[f] || [true, false];
    const A = ev(setP(base(), f, vA), res);
    const B = ev(setP(base(), f, vB), res);
    const absent = ev(del(base(), f), res);
    for (const id of Object.keys(A)) {
      if (A[id].result === B[id].result) continue;            // this clause does not depend on the field
      if (!UNANSWERABLE.has(absent[id].result)) {
        hits.push({ field: f, clause: id, a: A[id].result, b: B[id].result, absent: absent[id].result });
      }
    }
  }
  for (const h of hits) console.log(`  DECIDED ON ABSENCE: ${h.field.padEnd(38)} ${h.clause.padEnd(36)} recorded gives ${h.a}/${h.b}, absent gives ${h.absent}`);
  if (!hits.length) console.log('  none');
  return hits;
};
const a = run('BANXICO', bxBase, bx, BX, { A1_dias_unit:'calendar_days', A2_terminos_senalados:'timing_only' });
const b = run('PSR', psrBase, psr, PSR, {});
console.log(`\ntotal: ${a.length + b.length} clause results decided on an absent fact`);
console.log(`distinct facts implicated: ${new Set([...a,...b].map(h=>h.field)).size}`);
