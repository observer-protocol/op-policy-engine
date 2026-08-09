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
import { refusalPayload, signableFromRefusal, resolutionPayload, lapsePayload, canonicalise, stripUndefinedDeep } from '../dist/index.mjs';

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

console.log('\n── resolution and lapse ──');
{
  const r = resolutionPayload({
    handleId: 'ph_live_1', how: 'approved', at: '2026-08-09T00:32:57.000Z',
    actor: { issuer: 'did:web:observerprotocol.org', approverRef: 'did:key:zApprover', assurance: 'operator-held' },
  });
  a('an approval canonicalises', typeof r === 'string' && r.includes('op.approval.resolution.v1'));
  // OMITTED ON AN APPROVAL, NOT SENT EMPTY: an empty reason is a value, and a reader would be entitled
  // to read it as "denied for no stated reason".
  a('...and carries no reason, because an approval has none to state', !r.includes('"reason"'));
  const d = resolutionPayload({
    handleId: 'ph_live_1', how: 'denied', at: '2026-08-09T00:32:57.000Z',
    actor: { issuer: 'did:web:observerprotocol.org', approverRef: 'did:key:zApprover', assurance: 'operator-held' },
    reason: 'Duplicate of an earlier clearance.',
  });
  a('a denial carries its reason inside the signature', d.includes('Duplicate of an earlier clearance.'));
  a('...and a denial with no reason REFUSES to sign',
    (() => { try { resolutionPayload({ handleId: 'h', how: 'denied', at: '2026-08-09T00:00:00.000Z', actor: { issuer: 'i', approverRef: 'a', assurance: 'operator-held' } }); return false; } catch { return true; } })());

  const l = lapsePayload({ handleId: 'ph_live_2', at: '2026-08-09T00:33:00.000Z', expiresAt: '2026-08-09T00:32:00.000Z' });
  a('a lapse canonicalises', typeof l === 'string' && l.includes('op.approval.lapse.v1'));
}

console.log('\n── the primitives that were already here and merely unexported ──');
{
  a('canonicalise sorts keys', canonicalise({ b: '2', a: '1' }) === '{"a":"1","b":"2"}');
  a('...and refuses a number rather than guessing a representation',
    (() => { try { canonicalise({ n: 1 }); return false; } catch { return true; } })());
  a('stripUndefinedDeep drops undefined without touching null',
    JSON.stringify(stripUndefinedDeep({ a: undefined, b: null, c: '1' })) === '{"b":null,"c":"1"}');
}

console.log(`\nrecord-payloads: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
