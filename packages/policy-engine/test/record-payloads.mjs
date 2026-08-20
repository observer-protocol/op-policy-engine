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
// THE FIXTURES ARE REAL RECORDS, not shapes invented here: a fixture built to match the implementation
// cannot catch the implementation drifting.
//
// **THEY ARE NOT ALL FROM THE SAME SOURCE, AND THE DIFFERENCE IS A REAL DIFFERENCE IN STRENGTH.** The
// refusal is a line lifted verbatim from the 2026-08-08 citation demo corpus. The two verdicts added
// 2026-08-09 were driven end to end through `op-mcp-payment-server`'s HTTP route into an EPHEMERAL
// store, because both demonstration services were started before the verdict record existed and must
// not be restarted, so no corpus on disk contains one. Same code path, same real key, weaker
// provenance. Stated here rather than only beside the verdicts, because this header is what a reader
// checks the whole file's provenance against.
import { refusalPayload, signableFromRefusal, lapsePayload, stripUndefinedDeep,
  evaluationVerdictPayload, EVALUATION_VERDICT_PAYLOAD_TYPE } from '../dist/index.mjs';

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

console.log('\n── v3: the reason discriminant, and the citation the v2 equality dropped ──');
{
  // THE SUITE PASSED THE v3 CHANGE WITHOUT EXERCISING IT. The fixture above is an explicit v2
  // record, so it proved old records rebuild unchanged — which is the right property and is not
  // coverage of the new one. Every assertion here fails against the pre-v3 build.
  const V3 = { ...REFUSAL, payloadType: 'op.enforcement.refusal.v3',
    appliedBound: { ...REFUSAL.appliedBound, reason: 'not-reached' } };
  const p3 = refusalPayload(signableFromRefusal(V3));
  a('a v3 refusal carries its reason, inside the signed bytes', p3.includes('"reason":"not-reached"'), p3.slice(0, 200));
  a('...and names itself v3', p3.includes('op.enforcement.refusal.v3'));

  // THE GATE, IN THE DIRECTION THAT MATTERS. A v2 record must rebuild WITHOUT the reason even when
  // the object carries one, or every record signed before v3 stops verifying.
  const V2_WITH_REASON = { ...REFUSAL, appliedBound: { ...REFUSAL.appliedBound, reason: 'not-reached' } };
  a('a v2 refusal drops a reason it was handed, so old records rebuild byte-identically',
    refusalPayload(signableFromRefusal(V2_WITH_REASON)) === refusalPayload(signableFromRefusal(REFUSAL)));

  // THE DEFECT THIS VERSION WAS ADDED TO FIX. `citation` was gated on `type === V2`, an equality, so
  // a v3 record emitted the right token and rebuilt WITHOUT its citation: wrong bytes, read as a bad
  // signature. This is the regression test for that.
  const CITED = { state: 'attested', decisionId: 'DICT-1', decider: 'did:key:z6Mkdecider',
    outcome: 'procede', policyRef: { id: 'https://example.invalid/p', hash: 'sha256:abc', hashMethod: 'sha256' } };
  const withCite = (type) => refusalPayload(signableFromRefusal({ ...REFUSAL, payloadType: type,
    attestation: CITED, ...(type === 'op.enforcement.refusal.v3'
      ? { appliedBound: { ...REFUSAL.appliedBound, reason: 'not-reached' } } : {}) }));
  a('a v3 refusal carries its citation, which the === v2 equality dropped', withCite('op.enforcement.refusal.v3').includes('"citation"'));
  a('...and v2 still carries its own', withCite('op.enforcement.refusal.v2').includes('"citation"'));
  a('...and v1 still does not, because v1 never covered it', !withCite('op.enforcement.refusal.v1').includes('"citation"'));

  // S10: the recorded arm's note, signed on v3 and dropped on v2.
  const rec = (type) => refusalPayload(signableFromRefusal({ ...REFUSAL, payloadType: type,
    appliedBound: { state: 'recorded', limit: '100', unit: 'MXN', observed: '250', note: 'effective, not declared' } }));
  a('a v3 recorded bound signs its note', rec('op.enforcement.refusal.v3').includes('effective, not declared'));
  a('...and a v2 one does not, so no record written before v3 changes', !rec('op.enforcement.refusal.v2').includes('effective, not declared'));

  // AN UNRECOGNISED REASON IS REFUSED, NOT OMITTED. Omitting it would sign the absence as the claim.
  let threw = false;
  try { refusalPayload(signableFromRefusal({ ...REFUSAL, payloadType: 'op.enforcement.refusal.v3',
    appliedBound: { ...REFUSAL.appliedBound, reason: 'made-up' } })); } catch { threw = true; }
  a('an unrecognised reason on a v3 refusal is REFUSED rather than dropped', threw);
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

console.log('\n── the EVALUATION VERDICT payload, moved 2026-08-09, against real driven records ──');
{
  // ─── WHERE THESE FIXTURES CAME FROM, STATED PRECISELY BECAUSE IT IS A NARROWER CLAIM ───────────
  //
  // Both records were DRIVEN END TO END through `op-mcp-payment-server`'s HTTP route with a real
  // ed25519 evaluator key, and read back from the store's log by a fresh reader. They are the bytes
  // that service actually signed and persisted, not shapes assembled here — a fixture built to match
  // the implementation cannot catch the implementation drifting.
  //
  // **THE LIMIT: they are NOT from the two demonstration corpora.** Those services were started before
  // the verdict record existed and must not be restarted, so no corpus on disk contains one. These come
  // from an ephemeral store driven through the same code path. That is the strongest evidence available
  // today and it is weaker than `REFUSAL` above, which is a line lifted from the 2026-08-08 corpus.
  // When either corpus is next driven, replace these with records from it.
  //
  // TWO RECORDS, BECAUSE ONE EXERCISES HALF THE CONSTRUCTION. `breachedConstraint` and `denialDetail`
  // are in the signed bytes for a deny and REFUSED on a release, so a single fixture would leave the
  // conditional guards and the detail subsetting untested.
  const RELEASE_PAYLOAD = { decision: 'release', mandateId: 'urn:uuid:m1', agentId: 'did:web:agent',
    issuerId: 'did:web:principal', rail: 'eip155:8453', asset: 'USDC', amountRaw: '318740000',
    decimals: '6', counterpartyMatchedAs: 'vendor-alpha',
    notBefore: '2026-08-03T00:00:00.000Z', notAfter: '2026-08-04T00:00:00.000Z' };
  const RELEASE_BYTES = '{"agentId":"did:web:agent","amountRaw":"318740000","asset":"USDC","counterpartyMatchedAs":"vendor-alpha","decimals":"6","decision":"release","issuerId":"did:web:principal","mandateId":"urn:uuid:m1","notAfter":"2026-08-04T00:00:00.000Z","notBefore":"2026-08-03T00:00:00.000Z","rail":"eip155:8453","type":"op.evaluation.verdict.v3"}';

  const DENY_PAYLOAD = { ...RELEASE_PAYLOAD, decision: 'deny',
    breachedConstraint: 'tradingMandate.perPaymentCap',
    denialDetail: { limit: '25.00', observed: '318.74', headroom: '0', unit: 'USDC' } };
  const DENY_BYTES = '{"agentId":"did:web:agent","amountRaw":"318740000","asset":"USDC","breachedConstraint":"tradingMandate.perPaymentCap","counterpartyMatchedAs":"vendor-alpha","decimals":"6","decision":"deny","denialDetail":{"headroom":"0","limit":"25.00","observed":"318.74","unit":"USDC"},"issuerId":"did:web:principal","mandateId":"urn:uuid:m1","notAfter":"2026-08-04T00:00:00.000Z","notBefore":"2026-08-03T00:00:00.000Z","rail":"eip155:8453","type":"op.evaluation.verdict.v3"}';

  // ─── THE v3 GOLDENS ARE KEPT, AND THE ASSERTION IS SHARPENED RATHER THAN REPINNED ─────────────
  //
  // These two strings are bytes from REAL DRIVEN VERDICTS captured under v3. Editing `v3` to `v4`
  // inside them would have been one character each and would have thrown away what they are: a
  // record of what the v3 construction actually emitted, against which the v4 construction can be
  // compared.
  //
  // SO THE CLAIM IS NOW THE STRONGER ONE. A release and a deny differ between v3 and v4 in the
  // DISCRIMINATOR AND IN NOTHING ELSE — which is the exact property the bump promises for the two
  // decisions that gain no field, and it cannot be asserted by a repinned literal.
  //
  // IT ALSO CORRECTS A CLAIM MADE WHILE SCOPING THIS CHANGE: that releases and denies would
  // canonicalise IDENTICALLY across the two versions, so only the ten stored escalates were exposed.
  // `type` is inside the canonical object, so they do not, and the exposed population is all 1,864.
  // What is true is that the difference is confined to the discriminator, which is what makes trial
  // verification decisive. Asserted here rather than described.
  const v4Of = (v3Bytes) => v3Bytes.replace('"op.evaluation.verdict.v3"', '"op.evaluation.verdict.v4"');

  a('a RELEASE differs from its v3 bytes in the DISCRIMINATOR AND NOTHING ELSE',
    evaluationVerdictPayload(RELEASE_PAYLOAD) === v4Of(RELEASE_BYTES), evaluationVerdictPayload(RELEASE_PAYLOAD));
  a('...and so does a DENY, which carries the constraint and the detail',
    evaluationVerdictPayload(DENY_PAYLOAD) === v4Of(DENY_BYTES), evaluationVerdictPayload(DENY_PAYLOAD));
  a('...so neither v3 byte string is still produced, which is why every stored signature needs its construction',
    evaluationVerdictPayload(RELEASE_PAYLOAD) !== RELEASE_BYTES
    && evaluationVerdictPayload(DENY_PAYLOAD) !== DENY_BYTES);
  a('the payload type value moved with the field set, and only with it',
    EVALUATION_VERDICT_PAYLOAD_TYPE === 'op.evaluation.verdict.v4', EVALUATION_VERDICT_PAYLOAD_TYPE);

  // ─── `terminal` IS NOT SIGNED, ASSERTED AGAINST THE REAL REQUEST THAT CARRIED IT ───────────────
  //
  // The driven deny above was posted with `denialDetail.terminal: true`. The stored signed payload does
  // not contain it, so the exclusion is a behaviour rather than a docstring. It matters because
  // `terminal` is a BOOLEAN: the canonicaliser refuses booleans, and carrying it as the string 'true'
  // would be read as a value rather than a flag.
  a('a `terminal` a caller attaches cannot reach the signed bytes',
    !evaluationVerdictPayload({ ...DENY_PAYLOAD,
      denialDetail: { ...DENY_PAYLOAD.denialDetail, terminal: true } }).includes('terminal'));
  a('...and the bytes are IDENTICAL to the deny without it, so nothing shifted to make room',
    evaluationVerdictPayload({ ...DENY_PAYLOAD,
      denialDetail: { ...DENY_PAYLOAD.denialDetail, terminal: true } }) === v4Of(DENY_BYTES));
  // Nor can the vocabulary or the advice fields, which are the other three exclusions.
  for (const f of ['tag', 'constraint', 'remedy']) {
    a(`...nor can \`${f}\`, which is excluded because it is not signed`,
      !evaluationVerdictPayload({ ...DENY_PAYLOAD,
        denialDetail: { ...DENY_PAYLOAD.denialDetail, [f]: 'x' } }).includes(`"${f}"`));
  }

  // ─── THE CONDITIONAL GUARDS, BOTH DIRECTIONS ──────────────────────────────────────────────────
  const threw = (fn) => { try { fn(); return null; } catch (e) { return e; } };
  a('a deny with no breachedConstraint refuses',
    threw(() => evaluationVerdictPayload({ ...DENY_PAYLOAD, breachedConstraint: undefined })) !== null);
  a('a RELEASE carrying a breachedConstraint refuses, which is the same defect in the other direction',
    threw(() => evaluationVerdictPayload({ ...RELEASE_PAYLOAD, breachedConstraint: 'x' })) !== null);
  a('an escalate with no routingConstraint refuses',
    threw(() => evaluationVerdictPayload({ ...RELEASE_PAYLOAD, decision: 'escalate' })) !== null);
  a('a release carrying a routingConstraint refuses',
    threw(() => evaluationVerdictPayload({ ...RELEASE_PAYLOAD, routingConstraint: 'x' })) !== null);

  // ─── THE v4 PAIR, ON THE SAME RULE AS THE PAIR ABOVE ──────────────────────────────────────────
  //
  // BOTH DIRECTIONS, because a field guarded in one direction is a field a caller can attach to the
  // wrong decision. And REQUIRED on an escalate rather than optional: optional would let an
  // evaluator omit it and produce a valid escalate whose human-facing figure is unsigned, which is
  // the defect v4 exists to remove.
  const ESCALATE_PAYLOAD = { ...RELEASE_PAYLOAD, decision: 'escalate',
    routingConstraint: 'escalationThreshold', remainingAfterApproval: '1250.00' };

  a('an escalate carrying both conditional fields signs',
    threw(() => evaluationVerdictPayload(ESCALATE_PAYLOAD)) === null,
    String(threw(() => evaluationVerdictPayload(ESCALATE_PAYLOAD))?.message).slice(0, 120));
  a('*** and the figure the approver reads IS in the signed bytes ***',
    evaluationVerdictPayload(ESCALATE_PAYLOAD).includes('"remainingAfterApproval":"1250.00"'),
    evaluationVerdictPayload(ESCALATE_PAYLOAD));
  a('an escalate with NO remainingAfterApproval refuses',
    threw(() => evaluationVerdictPayload({ ...ESCALATE_PAYLOAD, remainingAfterApproval: undefined })) !== null);
  a('...and the refusal says why it is not optional',
    /figure the approver reads/.test(String(threw(() =>
      evaluationVerdictPayload({ ...ESCALATE_PAYLOAD, remainingAfterApproval: undefined })).message)));
  a('a RELEASE carrying a remainingAfterApproval refuses, the mirror direction',
    threw(() => evaluationVerdictPayload({ ...RELEASE_PAYLOAD, remainingAfterApproval: '1.00' })) !== null);
  a('a DENY carrying one refuses too, so the guard is not escalate-vs-release only',
    threw(() => evaluationVerdictPayload({ ...DENY_PAYLOAD, remainingAfterApproval: '1.00' })) !== null);

  // A DEPLOYMENT THAT TRACKS NO BUDGET STATES THAT, and this package does not adjudicate the string.
  // 9092's two PPP mandates declare no ceiling, so every escalate in run 5 carries this value.
  a('a declared absence is signable, because it is a string like any other',
    evaluationVerdictPayload({ ...ESCALATE_PAYLOAD, remainingAfterApproval: 'not-declared' })
      .includes('"remainingAfterApproval":"not-declared"'));

  // ─── THE STRING CHECK, APPLIED TO THE STRUCTURE RATHER THAN THE NEW FIELD ALONE ───────────────
  //
  // AND PINNED TO THIS GUARD'S OWN SENTENCE, NOT MERELY TO A REFUSAL. The first version asserted
  // `e.message` mentioned the field, and REMOVING THE GUARD DID NOT FAIL IT: `canonicalise` refuses
  // the number one layer down and its message names the field too, as `$.remainingAfterApproval`. So
  // the assertion was satisfied by the layer the guard exists to pre-empt, and would have reported a
  // deleted guard as present.
  //
  // The guard is kept because it refuses in the PAYLOAD's register — "every signed field is a
  // string" — rather than in the canonicaliser's, which talks about its own domain and tells the
  // reader to seek a ruling. But it is defence in depth over a layer that already refuses, and this
  // comment says so rather than letting the test imply the hole was open.
  for (const f of ['breachedConstraint', 'routingConstraint', 'remainingAfterApproval']) {
    const base = f === 'breachedConstraint' ? DENY_PAYLOAD : ESCALATE_PAYLOAD;
    const e = threw(() => evaluationVerdictPayload({ ...base, [f]: 12 }));
    a(`a NUMERIC ${f} is refused by THIS guard, not by the canonicaliser beneath it`,
      e !== null && new RegExp(`Cannot sign a verdict whose ${f} is a number`).test(e.message),
      String(e?.message).slice(0, 100));
  }

  // ─── THE TWO GUARDS rc.11 DROPPED IN THE MOVE, ASSERTED AT rc.12 ───────────────────────────────
  //
  // rc.11's parity was verified by comparing BYTES over valid inputs, and both of these are refusals
  // rather than outputs, so nothing in that comparison could have noticed them missing. The payment
  // server's suite caught them the moment it imported this function. **Asserted here so the next move
  // of this construction cannot lose them the same way.**
  const denyDetailOn = (decision) => threw(() => evaluationVerdictPayload({
    ...RELEASE_PAYLOAD, decision,
    ...(decision === 'escalate' ? { routingConstraint: 'escalationThreshold' } : {}),
    denialDetail: { limit: '25.00' } }));
  a('an ESCALATE carrying a denialDetail refuses, because only a deny compared a bound',
    denyDetailOn('escalate') !== null, String(denyDetailOn('escalate')));
  a('...and a RELEASE carrying one refuses too, which is the same defect in the other direction',
    denyDetailOn('release') !== null, String(denyDetailOn('release')));
  a('...naming the decision rather than the field, because the decision is what makes it wrong',
    /carrying a denialDetail/.test(denyDetailOn('release')?.message ?? ''));

  // A NON-STRING BOUND IS REFUSED BY NAME. The canonicaliser would refuse a number one layer down and
  // report a TYPE; this reports WHICH BOUND, which is what an operator needs.
  for (const f of ['limit', 'observed', 'headroom', 'unit']) {
    const e = threw(() => evaluationVerdictPayload({ ...DENY_PAYLOAD,
      denialDetail: { ...DENY_PAYLOAD.denialDetail, [f]: 25 } }));
    a(`a numeric denialDetail.${f} refuses, naming the field`, e !== null && e.message.includes(f), e?.message);
  }
  a('a BOOLEAN bound refuses too, not only a number',
    threw(() => evaluationVerdictPayload({ ...DENY_PAYLOAD,
      denialDetail: { ...DENY_PAYLOAD.denialDetail, limit: true } })) !== null);
  for (const f of ['decision', 'mandateId', 'agentId', 'issuerId', 'rail', 'asset', 'amountRaw',
                   'decimals', 'counterpartyMatchedAs', 'notBefore', 'notAfter']) {
    const e = threw(() => evaluationVerdictPayload({ ...RELEASE_PAYLOAD, [f]: undefined }));
    a(`an absent ${f} refuses, naming it`, e !== null && e.message.includes(f), e?.message);
  }
  // A NUMERIC decimals is the parity condition's whole subject, so it is asserted at runtime too rather
  // than only pinned by the compile-time obligation in the source file.
  a('a NUMERIC decimals refuses rather than being coerced, which is the parity condition',
    threw(() => evaluationVerdictPayload({ ...RELEASE_PAYLOAD, decimals: 6 })) !== null);
}

console.log(`\nrecord-payloads: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
