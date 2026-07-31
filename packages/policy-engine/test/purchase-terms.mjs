// requiredPurchaseTerms: the gap between a field and a control, closed.
//
// On a payout rail this is the ONLY real constraint. allowList cannot bound a claims payout at all,
// because a third-party administrator's payees are the customer's customers: thousands of claimants
// unknown when the mandate is issued, and allowList matches identities by equality.
import { evaluateMandate } from '../dist/index.mjs';

let pass = 0, fail = 0;
const a = (n, ok, d='') => { if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n}  <<< ${d}`); } };

const CONFIG = { rails: { 'eip155:84532': { family: 'evm' } }, counterpartyAddressMap: {} };
const cred = (accepted) => ({ credentialSubject: { actionScope: accepted ? { requiredPurchaseTerms: accepted } : {} } });
const ctx = (pt) => ({
  chain_id: 'eip155:84532', wallet_id: 'w', api_key_id: 'k',
  transaction: {}, timestamp: '2026-07-30T00:00:00Z',
  ...(pt ? { purchase_terms: pt } : {}),
});
const run = (accepted, pt) => evaluateMandate(ctx(pt), cred(accepted), CONFIG, { notes: [] });
// THE RESULT SHAPE IS { ok, reason, notes }. An earlier version of this predicate checked
// , neither of which this engine returns, so it
// ALWAYS returned false. The three deny cases failed loudly. The two must-still-pass cases passed
// FOR THE WRONG REASON, because !denied() was vacuously true. Fourth false pass caught by having
// written the positive case at all.
const denied = (r) => r.ok === false;
const why = (r) => JSON.stringify(r).slice(0, 200);

console.log('\n── absent is not empty ──');
{
  const r = run(['payor-adjudication'], undefined);
  a('a mandate requiring terms, with none presented, DENIES', denied(r), why(r));
  a('...saying the agent would be asserting unchallenged what the other party wanted',
    /unchallenged/.test(JSON.stringify(r)));
}

console.log('\n── an artifact is not evidence of itself ──');
{
  const r = run(['payor-adjudication'], { type: 'payor-adjudication', verified: false });
  a('an UNVERIFIED artifact denies, rather than being accepted on its shape', denied(r), why(r));
  a('...and says so', /evidence of itself/.test(JSON.stringify(r)));
}

console.log('\n── the accepted set is honoured, in both directions ──');
{
  const wrong = run(['payor-adjudication'], { type: 'signed-invoice', verified: true });
  a('a verified artifact of the WRONG type denies', denied(wrong), why(wrong));
  // BOTH OUTCOMES: the right type must pass, or the three denials above prove only that
  // everything denies.
  const right = run(['payor-adjudication'], { type: 'payor-adjudication', verified: true });
  a('...while the accepted type passes this check', !denied(right), why(right));
}

console.log('\n── an open vocabulary is not an open door ──');
{
  const r = run(['some-scheme-we-never-heard-of'], { type: 'some-scheme-we-never-heard-of', verified: true });
  a('a mandate naming a type this engine cannot evaluate DENIES', denied(r), why(r));
  a('...because a type we cannot evaluate is a control we cannot perform',
    /control we cannot perform/.test(JSON.stringify(r)));
}

console.log('\n── a mandate that requires nothing is unaffected ──');
{
  // The field is optional. A mandate not carrying it must not start denying because this check
  // exists, which is the regression a new gate most easily causes.
  const r = run(undefined, undefined);
  a('a mandate with no requiredPurchaseTerms is not denied by this check',
    !/purchase-terms/.test(JSON.stringify(r)), why(r));
}

console.log(`\npurchase-terms: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
