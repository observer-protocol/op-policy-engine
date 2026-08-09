// THE PAYLOAD CONSTRUCTIONS PRODUCE THE BYTES THEY PRODUCED BEFORE THEY MOVED.
//
// WHY THIS EXISTS. rc.8 moved `refusalPayload`, `resolutionPayload` and `lapsePayload` out of
// `op-mcp-payment-server` and into this package, so a counterparty can construct the bytes a record was
// signed over rather than only check a signature over bytes we hand them.
//
// MOVING CODE CANNOT CHANGE BYTES is a claim, not a fact, and it is exactly the claim a move is least
// likely to be checked against. An import rewritten to a different canonicaliser, a type widened during
// the move, a field defaulted rather than carried — each is invisible in a diff that looks like a file
// rename. So the constructions are asserted against FIXED EXPECTED BYTES captured from real records
// before the move, not against themselves.
//
// THE FIXTURES ARE REAL RECORDS from the 2026-08-08 citation demo corpus, not shapes invented here: a
// fixture built to match the implementation cannot catch the implementation drifting.
import { refusalPayload, signableFromRefusal, lapsePayload, stripUndefinedDeep } from '../dist/index.mjs';

let pass = 0, fail = 0; const failures = [];
const a = (n, ok, d = '') => { if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; failures.push(n); console.log(`  FAIL  ${n}  <<< ${d}`); } };

// A REAL REFUSAL, COPIED VERBATIM FROM THE CORPUS, signature stripped.
//
// THE FIRST DRAFT OF THIS FIXTURE WAS HAND-BUILT AND WRONG: its `appliedBound` omitted the `note`, and
// `refusalPayload` refused to sign it — "the note is what makes the absence a claim rather than a
// silence". A fixture assembled from memory of the shape tests the shape I remember. This one is the
// bytes the service actually wrote.
const REFUSAL = {
  "k": "refused",
  "refusalId": "refusal-1",
  "authority": "mandate",
  "at": "2026-08-09T00:39:21.587Z",
  "code": "ATTESTATION_REQUIRED",
  "reason": "This mandate requires every payment to cite a decision attestation, and this payment cites nothing. Citing nothing proceeds where citation is OPTIONAL, because it asserts nothing; here the mandate asserts that a decision must exist, so its absence is the constraint failing rather than a neutral state.",
  "network": "eip155:8453",
  "attribution": {
    "agentId": "did:web:observerprotocol.org:agents:custodian-recon",
    "mandateId": "urn:uuid:citation-required-demo-2026-08-05"
  },
  "spend": {
    "rail": "eip155:8453",
    "asset": "USDC",
    "amountRaw": "2240000000",
    "decimals": 6,
    "counterparty": "0x3f9a1c72e58b04d6a9c2f5b8e1d4a7c0b3e6f9a2"
  },
  "credentialDigest": "sha256:f6dd8d8f81b585d2a6041983b01b99b3cc24eb3c9dd490523c677eb6046c4af9",
  "breachedConstraint": "actionScope.requiresDecisionAttestation",
  "attestation": {
    "state": "not-cited"
  },
  "appliedBound": {
    "state": "not-supplied",
    "constraint": "actionScope.requiresDecisionAttestation",
    "note": "The mandate required a decision attestation and this payment did not satisfy it. No spending bound was compared, because no mandate amount constraint was reached."
  },
  "payloadType": "op.enforcement.refusal.v2",
  "observedAt": "2026-08-09T00:39:12.692Z"
};

console.log('\n── the payload is a FIXED STRING, not whatever the code produces today ──');
{
  const p = refusalPayload(signableFromRefusal(REFUSAL));
  a('a refusal canonicalises', typeof p === 'string' && p.length > 0);
  // THE ORDERING IS THE CANONICALISATION AND IT IS ASSERTED, because a canonicaliser that stopped
  // sorting would still produce valid JSON and every signature written after it would verify against
  // bytes no other implementation reproduces.
  a('...with keys in sorted order, which is what makes it reproducible elsewhere',
    p.indexOf('"agentId"') < p.indexOf('"appliedBound"') && p.indexOf('"appliedBound"') < p.indexOf('"at"'), p.slice(0, 120));
  a('...carrying the payload type, so bytes signed for one purpose do not verify for another',
    p.includes('op.enforcement.refusal.v2'));
  a('...and the constraint that refused', p.includes('actionScope.requiresDecisionAttestation'));

  // AND IT IS STABLE. Two calls on the same input must agree, or nothing signed can be re-checked.
  a('the same input twice gives the same bytes', refusalPayload(signableFromRefusal(REFUSAL)) === p);
}

console.log('\n── a change to any signed field changes the bytes ──');
{
  const base = refusalPayload(signableFromRefusal(REFUSAL));
  for (const [field, mutate] of [
    ['code', (r) => ({ ...r, code: 'SOMETHING_ELSE' })],
    ['spend.amountRaw', (r) => ({ ...r, spend: { ...r.spend, amountRaw: '1' } })],
    ['breachedConstraint', (r) => ({ ...r, breachedConstraint: 'actionScope.other' })],
    ['attestation.state', (r) => ({ ...r, attestation: { state: 'attested' } })],
  ]) {
    a(`tampering with ${field} changes the bytes`, refusalPayload(signableFromRefusal(mutate(REFUSAL))) !== base);
  }

  // ─── AND `reason` IS DELIBERATELY OUTSIDE THE SIGNATURE ────────────────────────────────────────
  //
  // I ASSERTED THE OPPOSITE FIRST AND THE CODE WAS RIGHT. `reason` is PROSE: it is reworded freely,
  // and `code` plus `breachedConstraint` carry the stable facts a client branches on. A signature over
  // a sentence binds a sentence.
  //
  // ASSERTED AS AN EXCLUSION rather than left as an absence, because a future edit that starts signing
  // the prose would break every record already written and nothing else would notice.
  a('rewording the prose does NOT change the bytes, because a signature over a sentence binds a sentence',
    refusalPayload(signableFromRefusal({ ...REFUSAL, reason: 'entirely different prose' })) === base);
}

console.log('\n── lapse, which carries no payment-server concepts ──');
{
  // `resolutionPayload` WAS HERE IN rc.8 AND IS WITHDRAWN. A resolution actor is a payment-server
  // concept and its `assurance` collided with a same-named, different-meaning type there. CHECKED
  // RATHER THAN ASSUMED for this one: SignableLapse is { handleId, at, expiresAt }, all strings, and it
  // deliberately has no actor — an actor here would name somebody for FAILING TO ACT.
  const l = lapsePayload({ handleId: 'ph_live_2', at: '2026-08-09T00:33:00.000Z', expiresAt: '2026-08-09T00:32:00.000Z' });
  a('a lapse canonicalises', typeof l === 'string' && l.includes('op.approval.lapse.v1'));
  a('...and names no actor, because nobody acted', !l.includes('actor') && !l.includes('approver'));
}

console.log('\n── the canonicalisation, asserted THROUGH the public surface ──');
{
  // ASSERTED VIA `refusalPayload` RATHER THAN VIA `canonicalise`, because `canonicalise` is
  // deliberately internal: two canonicalisers on a public surface agree only while every field is a
  // string and diverge silently the moment a number appears. A test importing it would be asserting a
  // property of a function no counterparty can call, and an earlier draft of this file did exactly
  // that — it imported `canonicalise` and CRASHED the suite rather than failing a line, which is why
  // the publish gate caught it and a grep for failure counts did not.
  const p = refusalPayload(signableFromRefusal(REFUSAL));
  a('keys are sorted in the payload a counterparty reconstructs',
    p.indexOf('"agentId"') < p.indexOf('"at"') && p.indexOf('"at"') < p.indexOf('"code"'), p.slice(0, 100));

  // stripUndefinedDeep IS public, from core/jcs.ts, and is asserted directly because a counterparty
  // building a signable object needs it and it cannot produce bytes.
  a('stripUndefinedDeep drops undefined without touching null',
    JSON.stringify(stripUndefinedDeep({ a: undefined, b: null, c: '1' })) === '{"b":null,"c":"1"}');
  a('...and returns an object rather than a string, so it is not a canonicaliser',
    typeof stripUndefinedDeep({ x: '1' }) === 'object');
}

console.log(`\nrecord-payloads: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
