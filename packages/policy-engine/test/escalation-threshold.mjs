// actionScope.escalationThreshold: THE THIRD STATE.
//
// Until 2026-08-01 this key was not in KNOWN_SCOPE_KEYS, so a credential declaring an escalation
// threshold was REFUSED by the unknown-rule catch-all. That was fail-closed and was the correct half of
// an earlier fix: the v2.1-lineage authorizationConfig.policy.escalation_threshold emitted a NOTE and
// silently auto-approved everything between the threshold and the ceiling. Relocating it to an
// enumerated surface turned that silent auto-approval into a refusal. THE RELOCATION HAPPENED AND THE
// REGISTRATION DID NOT.
import { evaluateMandate, KNOWN_SCOPE_KEYS } from '../dist/index.mjs';

let pass = 0, fail = 0; const failures = [];
const a = (n, ok, d = '') => { if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; failures.push(n); console.log(`  FAIL  ${n}  <<< ${d}`); } };

const CONFIG = { rails: { 'eip155:84532': { family: 'evm', decimals: 6, symbol: 'USDC' } }, counterpartyAddressMap: {} };
const scope = (over = {}) => ({ credentialSubject: { actionScope: {
  escalationThreshold: { amount: '50', currency: 'USDC' },
  approvers: ['did:web:approver.example'],
  per_transaction_ceiling: { amount: '100', currency: 'USDC' },
  ...over } } });
const ctx = () => ({ chain_id: 'eip155:84532', wallet_id: 'w', api_key_id: 'k', transaction: {}, timestamp: '2026-08-01T00:00:00Z' });
// A ResolvedTransfer, which is what the engine actually consumes: raw units plus the asset symbol.
// The first version of this harness passed { amount, currency, decimals } and every ceiling check
// answered "the transfer asset could not be established" — a test failing for a harness reason reads
// exactly like the code being wrong.
const resolved = (amount) => ({
  kind: 'evm-token', assetSymbol: 'USDC', decimals: 6,
  amount: BigInt(Math.round(Number(amount) * 1e6)),
  recipient: '0x000000000000000000000000000000000000dEaD', recipientKind: 'wallet', notes: [],
});
const run = (amount, over = {}) => evaluateMandate(ctx(), scope(over), CONFIG, resolved(amount));
const why = (r) => JSON.stringify(r).slice(0, 200);

console.log('\n── the three states, each with its twin ──');
{
  // BELOW the threshold: proceeds with no human.
  const below = run('10');
  a('below the threshold ALLOWS', below.ok === true, why(below));
  a('...and carries no escalation', below.escalation === undefined);

  // AT OR ABOVE the threshold, at or below the ceiling: ESCALATES.
  // THIS IS THE BAND THE v2.1 DEFECT AUTO-APPROVED. Reproducing it is the test.
  const band = run('80');
  a('IN THE BAND [threshold, ceiling] it ESCALATES rather than allowing', band.escalation !== undefined, why(band));
  a('...and ok is FALSE, so an unaware consumer denies rather than proceeding', band.ok === false);
  a('...carrying the threshold that was crossed', band.escalation?.threshold?.amount === '50');
  a('...what was requested', band.escalation?.requested?.amount === '80');
  a('...and who may approve, so the band has somewhere to route', band.escalation?.approvers?.length === 1);
  a('...saying a human approver must authorise it', /human approver must authorise/.test(band.reason));

  // ABOVE the ceiling: still DENIES, and is NOT offered to a human.
  const over = run('150');
  a('above the ceiling still DENIES', over.ok === false, why(over));
  a('...and is NOT an escalation, because nobody may authorise it', over.escalation === undefined);
  a('...naming the ceiling rather than the threshold', /per_transaction_ceiling/.test(over.reason));
}

console.log('\n── the boundary, which is where an off-by-one would live ──');
{
  a('exactly AT the threshold escalates', run('50').escalation !== undefined);
  a('a hair below it allows', run('49.999999').ok === true);
  a('exactly AT the ceiling escalates rather than denying', run('100').escalation !== undefined);
  a('a hair above the ceiling denies', run('100.000001').ok === false && run('100.000001').escalation === undefined);
}

console.log('\n── a mandate with NO threshold is unchanged ──');
{
  // MUST STILL PASS: registering a key must not change a credential that does not use it.
  const r = evaluateMandate(ctx(), { credentialSubject: { actionScope: { per_transaction_ceiling: { amount: '100', currency: 'USDC' } } } },
    CONFIG, resolved('80'));
  a('no threshold declared: an 80 payment still ALLOWS', r.ok === true, why(r));
  a('...with no escalation', r.escalation === undefined);
}

console.log('\n── the catch-all is NOT weakened for any other key ──');
{
  // BOTH OUTCOMES ON THE REGISTRATION ITSELF. Registering one key must not open the surface.
  const unknown = evaluateMandate(ctx(), { credentialSubject: { actionScope: { escalationThreshold: { amount: '50', currency: 'USDC' }, somethingNobodyRegistered: true } } },
    CONFIG, resolved('10'));
  a('a still-unknown scope key is STILL REFUSED', unknown.ok === false, why(unknown));
  a('...by the unknown-rule catch-all, fail-closed', /unknown-rule/.test(unknown.reason));
  a('...even alongside a now-registered key', /somethingNobodyRegistered/.test(unknown.reason));

  // AND THE v2.1-LINEAGE FIELD STAYS REFUSED.
  const legacy = evaluateMandate(ctx(), { credentialSubject: { actionScope: {}, authorizationConfig: { policy: { escalation_threshold: 50 } } } },
    CONFIG, resolved('10'));
  a('the v2.1-lineage escalation_threshold is not silently honoured by this change', legacy.escalation === undefined);
}

console.log('\n── same currency only. No FX inside a policy decision ──');
{
  const r = run('80', { escalationThreshold: { amount: '50', currency: 'EUR' } });
  a('a threshold in another currency DENIES rather than converting', r.ok === false, why(r));
  a('...and is not treated as an escalation', r.escalation === undefined);
}

console.log('\n── THE ESCALATION NAMES THE RULE THAT ROUTED IT ──');
{
  // WHY THIS EXISTS. The escalation said a human must authorise the payment and never said which rule
  // decided that, so three consecutive downstream fixes in op-mcp-payment-server each supplied the name
  // themselves: a hardcoded default, then a refusal to default, then a proposal to assert it under a
  // better field name. All three were this omission. A consumer can only pass the name through if the
  // engine says it.
  const r = run('80', { escalationThreshold: { amount: '50', currency: 'USDC' } });
  a('an escalation carries a constraint', typeof r.escalation?.constraint === 'string' && r.escalation.constraint.length > 0, why(r));
  a('...naming the actionScope rule that routed it', r.escalation?.constraint === 'actionScope.escalationThreshold', r.escalation?.constraint);

  // THE KEY IS REGISTERED, so the path cannot name a rule this engine does not recognise. Without this
  // the constraint could name a key the unknown-rule catch-all would have refused.
  const key = r.escalation?.constraint?.replace(/^actionScope\./, '');
  a('...and that key is in the engine vocabulary', KNOWN_SCOPE_KEYS.has(key), key);

  // NOT A BREACH, AND THE DISTINCTION IS THE WHOLE POINT. Nothing was breached: a threshold was crossed
  // and a person decides. An escalation carrying a DenialDetail would be the category error this field
  // was added to avoid, one level out.
  a('an escalation is NOT a denial and carries no denial detail', r.detail === undefined, JSON.stringify(r.detail));

  // A DENIAL STILL NAMES ITS CONSTRAINT THE OTHER WAY. The two vocabularies stay separate.
  const denied = run('80', { per_transaction_ceiling: { amount: '50', currency: 'USDC' } });
  a('a ceiling breach still DENIES rather than escalating', denied.ok === false && denied.escalation === undefined, why(denied));
  a('...and names its constraint on detail, not on an escalation', denied.detail?.constraint === 'actionScope.per_transaction_ceiling', JSON.stringify(denied.detail));
}

console.log(`\nescalation-threshold: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); for (const f of failures) console.log(`  ✗ ${f}`); process.exit(1); }
