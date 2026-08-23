#!/usr/bin/env node
import { evaluate } from './evaluate.mjs';
const clone = (o) => JSON.parse(JSON.stringify(o));

const base = {
  transaction: { debit_date: '2026-03-02T10:00:00Z', amount: { amountRaw: '45000', decimals: '2', currency: 'GBP' }, via_pisp: false },
  consent: { to_transaction: null, to_series: null, form: null, given_after_execution: false, withdrawn_at: null, series_withdrawn_at: null },
  agreement: { agreed_forms: ['online-banking-2fa', 'branch-signature'], post_execution_consent_agreed: false },
  notification: { given_at: '2026-03-05T09:00:00Z', without_undue_delay: 'affirmed' },
  provider: { part6_information_failure: false, became_aware_at: '2026-03-05T09:00:00Z',
              reasonable_grounds_to_suspect_fraud: false, poca_notification_in_writing: null,
              claims_fraud_or_gross_negligence: false,
              burden: { authenticated: 'denied', accurately_recorded: 'affirmed', entered_in_accounts: 'affirmed', no_technical_deficiency: 'affirmed' } },
  evidence: { instrument_use_record: 'card-present-chip-log-88213', supporting_evidence_given_to_payer: null },
  refund: { amount: { amountRaw: '45000', decimals: '2', currency: 'GBP' }, provided_at: '2026-03-06T16:00:00Z',
            credit_value_date: '2026-03-02T10:00:00Z', as_soon_as_practicable: 'affirmed' },
  account: { restoration_applicable: false, restored_to_prior_state: null },
  pisp: {}, aspsp: {}, order: { irrevocable_from: '2026-03-02T09:00:00Z' },
};

// 1. Unauthorised, notified in time, refunded next business day at the right value date.
// REVISED 2026-08-23 against what the corpus reported unreached, not by adding a case.
//
// Reg 76 has two limbs the fixtures never exercised: paragraph (1)(b), restoring the account, and
// the whole of paragraph (5), where a payment initiation service provider initiated the transaction.
// Both are limbs of the provision this case already demonstrates, so they deepen it rather than
// changing what it is about: an unauthorised transaction refunded properly, now PISP-initiated and
// with the account restored.
const f1 = clone(base);
f1.transaction.via_pisp = true;
f1.account.restoration_applicable = true;
f1.account.restored_to_prior_state = 'affirmed';
f1.pisp = { burden_discharged: 'affirmed', liable: true, compensated: true };
f1.aspsp = { compensation_requested: true };
const c1 = { name: 'Unauthorised PISP-initiated transaction, refunded and the account restored', facts: f1, res: {} };

// 2. Notified at 14 months. The bar bites, and no information failure saves it.
const c2f = clone(base);
c2f.notification.given_at = '2027-05-10T09:00:00Z';
c2f.provider.became_aware_at = '2027-05-10T09:00:00Z';
c2f.refund.provided_at = '2027-05-11T12:00:00Z';
const c2 = { name: 'Notified at 14 months, no information failure', facts: c2f, res: {} };

// 3. Fraud carve-out engaged, P1 left unresolved. Also a value date after the debit date.
const c3f = clone(base);
c3f.provider.reasonable_grounds_to_suspect_fraud = true;
c3f.provider.poca_notification_in_writing = 'ref/POCA/2026/00417';
c3f.provider.claims_fraud_or_gross_negligence = true;
c3f.evidence.supporting_evidence_given_to_payer = null;
c3f.refund.provided_at = null;
c3f.refund.credit_value_date = '2026-03-09T10:00:00Z';
c3f.refund.as_soon_as_practicable = undefined;
const c3 = { name: 'Fraud carve-out engaged, P1 unresolved', facts: c3f, res: {} };

const pad = (s, n) => String(s).padEnd(n);
for (const c of [c1, c2, c3]) {
  console.log('\n' + '='.repeat(94));
  console.log(c.name);
  console.log('  ambiguity resolutions supplied: ' + (Object.keys(c.res).length ? JSON.stringify(c.res) : 'NONE'));
  console.log('='.repeat(94));
  const r = evaluate(c.facts, c.res);
  for (const [id, v] of Object.entries(r)) console.log('  ' + pad(id, 40) + v.result);
}
console.log('');
