// THE policyRef CONVENTION, ASSERTED FROM THE ENTRY POINT AN ISSUER IMPORTS.
//
// The convention lived in `op-mcp-payment-server` and reached only the READING side, so a decider
// PRODUCING an attestation never met it. This file asserts the two things that makes true: the
// convention is reachable from this package, and the shape PERMITS it.
//
// EVERYTHING IMPORTS FROM `dist`, deliberately. The convention is guidance for a consumer, and a
// consumer reaches `dist`. Asserting it against `src` would prove it exists and not that anyone can
// reach it — the distinction `checkPaymentBinding` was on the wrong side of for a full release.
import {
  issueDecisionAttestation, verifyDecisionAttestation, checkDecisionRefs, assertNoObservation,
  POLICY_REF_CONVENTION, POLICY_REF_FIELDS_GO_INSIDE_POLICY_REF,
  OBSERVATION_BOUNDARY_DOES_NOT_INSPECT_POLICY_REF,
  ed25519Verify, base58Decode, base58Encode, decodeEd25519DidKey } from '../dist/index.mjs';
import { generateKeyPairSync, sign as nodeSign } from 'node:crypto';

let pass = 0, fail = 0;
const failures = [];
const assert = (n, ok, d = '') => {
  if (ok) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; failures.push(n); console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`); }
};

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const raw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
const DIDKEY = `did:key:z${base58Encode(Buffer.concat([Buffer.from([0xed, 0x01]), raw]))}`;
const verifyAdapter = (message, signature, pk) => ed25519Verify(pk, Buffer.from(message, 'utf8'), signature);
// THE SHARED DECODER, NOT A HAND-WRITTEN SLICE. `decodeDidKey` wants the 34-byte multicodec form
// and `resolveDeciderDidWeb` beside it wants 32 raw; both are typed alike, so the width is
// selected by FIELD here rather than by remembered arithmetic. See `core/did-key.ts`.
const decodeDidKey = (did) => decodeEd25519DidKey(did)?.multicodec;
const signer = {
  deciderDid: async () => DIDKEY,
  sign: async (payload) => nodeSign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64'),
  assurance: () => 'self-declared',
};

/** An attestation that is valid in every respect EXCEPT the policyRef under test, so a refusal below
 * can only be about policyRef. */
const base = (policyRef, extra = {}) => ({
  decisionId: 'CLM-1', subject: 'claimant:1', outcome: 'denied',
  policyRef,
  vocabularyRef: {
    id: 'https://insurer.example/vocab/claims-disposition', version: '1.0.0',
    hash: 'sha256:v0cab', hashMethod: 'sha256', source: 'client-defined',
    values: ['approved', 'denied', 'referred'],
  },
  deciderArtifactDigest: { state: 'digest', value: 'sha256:determination-letter' },
  inputsDigest: 'sha256:claims-file', decidedAt: '2026-08-14T09:00:00.000Z',
  resolvableUntil: '2033-01-01T00:00:00.000Z',
  counterparty: '0x9999999999999999999999999999999999999999', rail: 'eip155:8453',
  ...extra,
});

const REQUIRED_ONLY = { id: 'https://insurer.example/policy/v7', hash: 'sha256:p0licy', hashMethod: 'sha256' };
const WITH_CONVENTION = {
  ...REQUIRED_ONLY,
  clauses: ['III.4.e', '4.2'],
  version: '2026.3',
  publisherId: 'did:web:payor.example',
  retrievedFrom: 'https://payor.example/policies/v7.pdf',
};

console.log('\n── the convention is reachable by the party it instructs ──');
{
  // A GUARD ON THE LOOPS BELOW. If this import ever yields an empty map, every `for` over it passes
  // vacuously and the file reports success while asserting nothing.
  assert('POLICY_REF_CONVENTION is reachable from the package entry point', POLICY_REF_CONVENTION instanceof Map);
  assert('...and is not empty', POLICY_REF_CONVENTION.size > 0, `size was ${POLICY_REF_CONVENTION?.size}`);
}

console.log('\n── THE NAMES, WHICH ARE THE PART THAT CANNOT BE CORRECTED LATER ──');
{
  // A RENAME IS THE UNRECOVERABLE FAILURE, NOT A COSMETIC ONE. These four keys are reconciled against
  // the reading side in `op-mcp-payment-server`. An issuer writing a different spelling produces a
  // record the reader never looks at — and `clauses` and `retrievedFrom` are facts about what was read
  // at the moment of deciding, so those records can never be reissued correctly. So the spelling is
  // pinned by value here rather than left to the type.
  const expected = ['clauses', 'version', 'publisherId', 'retrievedFrom'];
  assert('the convention names EXACTLY the four reconciled fields',
    JSON.stringify([...POLICY_REF_CONVENTION.keys()].sort()) === JSON.stringify([...expected].sort()),
    JSON.stringify([...POLICY_REF_CONVENTION.keys()]));
  // AND THE CHECK DISCRIMINATES: a plausible near-miss must be reported absent, or the assertion
  // above is measuring the existence of a map rather than its contents.
  for (const near of ['clauseLocators', 'clause_locators', 'publisher', 'retrieved_from']) {
    assert(`a plausible near-miss spelling '${near}' is NOT the convention`, !POLICY_REF_CONVENTION.has(near));
  }
}

console.log('\n── every entry states what it carries AND why ──');
{
  for (const [field, v] of POLICY_REF_CONVENTION) {
    assert(`${field} says what it carries`, typeof v.carries === 'string' && v.carries.length > 20);
    // A REASON, NOT A LABEL. The length floor is what separates "why" from a restatement of the name;
    // the same discipline as the purchase-terms vocabulary one file over.
    assert(`${field} says WHY`, typeof v.why === 'string' && v.why.length > 80);
    assert(`${field} states whether it can be captured later`, typeof v.capturableLater === 'boolean');
  }
  // BOTH OUTCOMES ON THE FLAG ITSELF. A `capturableLater` that were uniformly true, or uniformly
  // false, would pass every assertion above and carry no information at all.
  assert('capturableLater is not all one value, so it discriminates',
    new Set([...POLICY_REF_CONVENTION.values()].map((v) => v.capturableLater)).size === 2);
  // AND THE SPECIFIC CLAIM, not merely that the flag varies. These two are facts about WHAT WAS READ,
  // which is why the convention is worth adopting before anything enforces it.
  assert('clauses cannot be captured later', POLICY_REF_CONVENTION.get('clauses').capturableLater === false);
  assert('retrievedFrom cannot be captured later', POLICY_REF_CONVENTION.get('retrievedFrom').capturableLater === false);
  // THE RULE THAT WOULD BE SOFTENED FIRST. A locator into a rendering we chose is a fact about our
  // rendering, and the guidance has to say so where an issuer reads it.
  assert("clauses guidance names the PUBLISHER'S scheme and refuses a coordinate into ours",
    /PUBLISHER'S OWN addressing scheme/.test(POLICY_REF_CONVENTION.get('clauses').carries)
    && /NEVER A BYTE OFFSET OR A COORDINATE INTO A RENDERING/.test(POLICY_REF_CONVENTION.get('clauses').why));
}

console.log('\n── THE CONVENTION IS EXPRESSIBLE: an issuer can meet it, and it survives to a reader ──');
{
  const issued = await issueDecisionAttestation(base(WITH_CONVENTION), signer);
  assert('an attestation carrying all four convention fields ISSUES',
    issued.kind === 'issued', issued.kind === 'refused' ? issued.reason.slice(0, 160) : '');
  if (issued.kind === 'issued') {
    const b = verifyDecisionAttestation('CLM-1', issued.attestation, issued.signature, verifyAdapter, decodeDidKey);
    assert('...and VERIFIES', b.state === 'attested', JSON.stringify(b).slice(0, 160));
    // THE POINT OF THE PLACEMENT RULE. policyRef is carried whole, so every key an issuer wrote
    // reaches the party reading the verified block.
    for (const f of ['clauses', 'version', 'publisherId', 'retrievedFrom']) {
      assert(`...and ${f} arrives in the VERIFIED block`, b.state === 'attested' && b.policyRef[f] !== undefined);
    }
    assert('...with the clause locators intact, in the publisher\'s own scheme',
      JSON.stringify(b.policyRef.clauses) === JSON.stringify(['III.4.e', '4.2']));
  }
}

console.log('\n── AND IT IS A CONVENTION, NOT A CONSTRAINT ──');
{
  // THE 446-RECORD RULING, ASSERTED. Every constraint adding meaning to policyRef refuses 100% of
  // existing traffic, so the ruling was convention plus adoption measurement. If this ever fails,
  // something turned the guidance into enforcement and the estate's existing records stopped issuing.
  const issued = await issueDecisionAttestation(base(REQUIRED_ONLY), signer);
  assert('a policyRef with ONLY id, hash and hashMethod still ISSUES',
    issued.kind === 'issued', issued.kind === 'refused' ? issued.reason.slice(0, 160) : '');
  if (issued.kind === 'issued') {
    const b = verifyDecisionAttestation('CLM-1', issued.attestation, issued.signature, verifyAdapter, decodeDidKey);
    assert('...and VERIFIES, so nothing downstream requires the convention either', b.state === 'attested');
  }
  assert('checkDecisionRefs accepts a policyRef carrying none of the four',
    checkDecisionRefs(REQUIRED_ONLY, base(REQUIRED_ONLY).vocabularyRef) === null);
}

console.log('\n── PLACEMENT: inside is carried, top level is signed and DROPPED ──');
{
  assert('the placement rule is stated as a value', POLICY_REF_FIELDS_GO_INSIDE_POLICY_REF === true);
  // BOTH DIRECTIONS, BECAUSE THE GUIDANCE IS ONLY WORTH GIVING IF THE ASYMMETRY IS REAL. Asserting
  // only that inside-works would leave "top level also works" untested, and the whole reason to
  // instruct an issuer is that the second one loses data while looking like success.
  const issued = await issueDecisionAttestation(base(REQUIRED_ONLY, { clauses: ['III.4.e'] }), signer);
  assert('a top-level convention field does not prevent issuance', issued.kind === 'issued',
    issued.kind === 'refused' ? issued.reason.slice(0, 160) : '');
  if (issued.kind === 'issued') {
    // IT IS INSIDE THE SIGNATURE. This is what makes the loss deceptive rather than obvious.
    assert('...and IS signed: it is present on the issued document', 'clauses' in issued.attestation);
    const b = verifyDecisionAttestation('CLM-1', issued.attestation, issued.signature, verifyAdapter, decodeDidKey);
    assert('...and the document VERIFIES', b.state === 'attested');
    assert('...but the top-level field is DROPPED from the verified block', !('clauses' in b));
    assert('...and did NOT leak into policyRef instead', b.state === 'attested' && b.policyRef.clauses === undefined);
  }
}

console.log('\n── THE HOLE RECORDED BESIDE THE CONVENTION, PINNED AS THE CURRENT STATE ──');
{
  // THIS ASSERTS A GAP, WHICH IS AN UNUSUAL THING FOR A TEST TO DO, SO THE REASON IS WRITTEN DOWN.
  //
  // `assertNoObservation` tests TOP-LEVEL keys only, so a forbidden name nested inside policyRef is
  // not seen. The note in `core/attestation.ts` says so, and a note whose claim is never checked is
  // the kind of statement that stays on the page after it stops being true.
  //
  // SO THIS IS WRITTEN TO FAIL WHEN THE HOLE IS CLOSED. That is the point: closing it is a deliberate
  // decision about refusing a shape at issuance, and whoever makes it should be sent here to delete
  // both this block and the note, rather than leaving a stale claim standing beside live guidance.
  assert('the gap is declared as a value beside the convention',
    OBSERVATION_BOUNDARY_DOES_NOT_INSPECT_POLICY_REF === true);
  let threw = null;
  try { assertNoObservation(base({ ...REQUIRED_ONLY, rationale: 'because clause 4.2' })); } catch (e) { threw = e; }
  assert('assertNoObservation does NOT see a rationale nested in policyRef (STILL OPEN)', threw === null);
  // MUST STILL PASS: the boundary works at the level it actually inspects. Without this, the
  // assertion above would also pass if the check had been broken outright.
  let threwTop = null;
  try { assertNoObservation(base(REQUIRED_ONLY, { rationale: 'because clause 4.2' })); } catch (e) { threwTop = e; }
  assert('...while a TOP-LEVEL rationale is still refused, so the boundary itself is intact',
    threwTop !== null && threwTop.constructor.name === 'ObservationRefused');
  const issued = await issueDecisionAttestation(base({ ...REQUIRED_ONLY, rationale: 'because clause 4.2' }), signer);
  assert('...and issuance does not refuse it either (STILL OPEN)', issued.kind === 'issued');
}

console.log(`\npolicy-ref-convention: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('\nFAILURES:'); failures.forEach((f) => console.error('  ✗ ' + f)); process.exit(1); }
