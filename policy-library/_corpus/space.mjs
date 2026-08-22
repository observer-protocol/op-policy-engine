// Candidate values per fact field, derived FROM THE FIELD'S DECLARED KIND, never from an outcome.
//
// Timestamps are laddered against the PERIODS THE REGISTER DECLARES (45 and 180 days from the aviso;
// 45 from delivery; 13 months; 1 business day), not against any intended result. Knowing that a
// clause measures a 45 day period is structural. Knowing which side of it you want to land on would
// be outcome-first, and is exactly what the old generator did at generate-banxico-corpus.mjs:391.

const T = (iso) => iso;
export const BX_ANCHOR = '2026-05-04T09:12:00Z';       // notice.received_at in the register's own example

// A ladder around each declared period boundary, plus the absent and malformed states.
export const INSTANTS = [
  '2026-04-28T19:41:00Z',   // before the aviso
  '2026-05-04T09:12:00Z',   // at the aviso
  '2026-05-20T00:00:00Z',   // inside 45 days
  '2026-06-02T11:00:00Z',   // inside 45 days
  '2026-06-18T09:12:00Z',   // 45 days exactly
  '2026-06-19T09:12:00Z',   // just past 45 days
  '2026-08-20T00:00:00Z',   // past 45, inside 180
  '2026-10-31T09:12:00Z',   // 180 days exactly
  '2026-11-20T11:00:00Z',   // past 180
  '2027-09-01T00:00:00Z',   // past 13 months
  null, undefined, 'not-a-timestamp',
];

export const BX_FIELDS = {
  'notice.type':                          ['robo_o_extravio', 'reclamacion_cargo_no_reconocido', 'algo_mas', null, undefined],
  'notice.reference':                     ['AV-1', '', null, undefined],
  'notice.received_at':                   INSTANTS,
  'operation.executed_abroad':            [true, false, null, undefined],
  'operation.occurred_at':                INSTANTS,
  'operation.acquirer_name':              ['Adq', '', null, undefined],
  'operation.merchant_name':              ['Com', '', null, undefined],
  'operation.auth_factors':               [[], ['2.6.a.i_knowledge'], ['2.6.a.i_knowledge','2.6.a.ii_device_or_chip'],
                                           ['2.6.a.i_knowledge','2.6.a.i_knowledge'],
                                           ['2.6.a.iii_biometric','2.6.a.iv_authorised_other'],
                                           ['2.6.a.i_knowledge','no_such_kind'], ['no_such_kind'], null, undefined],
  'dictamen.made_available_at':           INSTANTS,
  'dictamen.channel':                     ['sucursal', 'medio_convenido', 'otro', null, undefined],
  'cardholder.channel_election':          ['sucursal', 'medio_convenido', 'otro', null, undefined],
  'dictamen.signatory_id':                ['emp-0042', 'emp-9999', '', null, undefined],
  'issuer.authorised_signatories':        [[], ['emp-0042'], ['emp-0042','emp-0117'], null, undefined],
  // BOTH vocabularies: the three the register declares, and the two the evaluator actually consumes.
  'dictamen.language_is_plain':           ['yes', 'no', 'not_assessed', 'affirmed', 'denied', null, undefined],
  'dictamen.evidence_of_factors_present': [true, false, null, undefined],
  'dictamen.verification_method_stated':  [true, false, null, undefined],
  'dictamen.device_address':              [{physical_address:'Av 100', ip_address:'10.0.0.1'}, {physical_address:'Av 100', ip_address:null},
                                           {physical_address:null, ip_address:'10.0.0.1'}, {physical_address:null, ip_address:null}, {}, null, undefined],
  'issuer.holds_device_address':          [true, false, null, undefined],
  'expediente.requested':                 [true, false, null, undefined],
  'expediente.delivered_at':              INSTANTS,
  'account.charges_posted':               [[], ['interes_ordinario'], ['interes_moratorio'], ['accesorio_otro'], ['interes_ordinario','interes_moratorio'], null, undefined],
  'charge.derived_from_2_6_a_operation':  ['demonstrated', 'not_demonstrated', 'not_assessed', 'affirmed', 'denied', null, undefined],
  'clock.now':                            INSTANTS,
};
export const BX_RESOLUTIONS = {
  A1_dias_unit:          ['calendar_days', 'business_days', undefined],
  A2_terminos_senalados: ['timing_only', 'timing_and_content', undefined],
};

// PSR HAS NO FACT REGISTER. These domains were read off the evaluator, which is a weaker source
// than Banxico's declared kinds and is recorded as such.
const JUDG = ['affirmed', 'denied', 'not_assessed', null, undefined];
const MONEY = [{amountRaw:'45000',decimals:'2',currency:'GBP'}, {amountRaw:'45000',decimals:'2',currency:'EUR'},
               {amountRaw:'99999',decimals:'2',currency:'GBP'}, {amountRaw:'4500000',decimals:'4',currency:'GBP'}, null, undefined];
export const PSR_FIELDS = {
  'transaction.debit_date':                        INSTANTS,
  'transaction.amount':                            MONEY,
  'transaction.via_pisp':                          [true, false, null, undefined],
  'consent.to_transaction':                        ['sig-1', '', null, undefined],
  'consent.to_series':                             ['sig-2', '', null, undefined],
  'consent.form':                                  ['online-banking-2fa', 'branch-signature', 'shouted-it', null, undefined],
  'consent.given_after_execution':                 [true, false, null, undefined],
  'consent.withdrawn_at':                          INSTANTS,
  'consent.series_withdrawn_at':                   INSTANTS,
  'agreement.agreed_forms':                        [[], ['online-banking-2fa'], ['online-banking-2fa','branch-signature'], null, undefined],
  'agreement.post_execution_consent_agreed':       [true, false, null, undefined],
  'notification.given_at':                         INSTANTS,
  'notification.without_undue_delay':              JUDG,
  'provider.part6_information_failure':            [true, false, null, undefined],
  'provider.became_aware_at':                      INSTANTS,
  'provider.reasonable_grounds_to_suspect_fraud':  [true, false, null, undefined],
  'provider.poca_notification_in_writing':         ['ref/POCA/1', '', null, undefined],
  'provider.claims_fraud_or_gross_negligence':     [true, false, null, undefined],
  'provider.burden':                               [{}, {authenticated:'affirmed',accurately_recorded:'affirmed',entered_in_accounts:'affirmed',no_technical_deficiency:'affirmed'},
                                                    {authenticated:'denied',accurately_recorded:'affirmed',entered_in_accounts:'affirmed',no_technical_deficiency:'affirmed'},
                                                    {authenticated:'affirmed'}, null, undefined],
  'evidence.instrument_use_record':                ['log-1', '', null, undefined],
  'evidence.supporting_evidence_given_to_payer':   ['doc-1', '', null, undefined],
  'refund.amount':                                 MONEY,
  'refund.provided_at':                            INSTANTS,
  'refund.credit_value_date':                      INSTANTS,
  'refund.as_soon_as_practicable':                 JUDG,
  'account.restoration_applicable':                [true, false, null, undefined],
  'account.restored_to_prior_state':               JUDG,
  'pisp.burden_discharged':                        JUDG,
  'pisp.liable':                                   [true, false, null, undefined],
  'pisp.compensated':                              [true, false, null, undefined],
  'aspsp.compensation_requested':                  [true, false, null, undefined],
  'order.irrevocable_from':                        INSTANTS,
  'clock.now':                                     INSTANTS,
};
export const PSR_RESOLUTIONS = {
  P1_carveout_scope: ['deadline_only', 'obligation_suspended', undefined],
};
