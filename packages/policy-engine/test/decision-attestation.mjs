// THE EXTRACTION'S WHOLE CLAIM, ASSERTED: a decision-only consumer installs THIS PACKAGE and can
// issue and verify a decision attestation, with no Observer service present.
//
// Everything below imports from the built entry point. The only other import is `node:crypto`, which
// stands for the consumer's own key handling — issuance takes a signer, so their key never reaches us.
import {
  issueDecisionAttestation, verifyDecisionAttestation, checkDecisionRefs, checkDeciderArtifactRef,
  assertNoObservation, ed25519Verify, base58Decode, base58Encode,
} from '../dist/index.mjs';
import * as pkg from '../dist/index.mjs';
import { generateKeyPairSync, sign as nodeSign } from 'node:crypto';

let pass = 0, fail = 0;
const failures = [];
const assert = (n, ok, d = '') => { if (ok) { pass++; console.log(`  ✓ ${n}`); } else { fail++; failures.push(n); console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`); } };

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const raw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
const DIDKEY = `did:key:z${base58Encode(Buffer.concat([Buffer.from([0xed, 0x01]), raw]))}`;

// The two primitives verification needs, both from THIS package. Note the argument order differs
// between `ed25519Verify(publicKey, data, signature)` and the shape `verifyDecisionAttestation`
// injects, `(message, signature, publicKey)`, so the adapter below is the consumer's job today.
const verifyAdapter = (message, signature, publicKeyBuf) => ed25519Verify(publicKeyBuf, Buffer.from(message, 'utf8'), signature);
const decodeDidKey = (did) => { try { return base58Decode(did.slice('did:key:z'.length)); } catch { return undefined; } };

const signer = {
  deciderDid: async () => DIDKEY,
  sign: async (payload) => nodeSign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64'),
  assurance: () => 'self-declared',
};

const INPUT = {
  decisionId: 'CLM-1', subject: 'claimant:1', outcome: 'denied',
  policyRef: { id: 'https://insurer.example/policy/v7#4.2', hash: 'sha256:p0licy', hashMethod: 'sha256' },
  vocabularyRef: {
    id: 'https://insurer.example/vocab/claims-disposition', version: '1.0.0',
    hash: 'sha256:v0cab', hashMethod: 'sha256', source: 'client-defined',
    values: ['approved', 'denied', 'referred', 'ok', 'cleared', 'compensation_due', 'no_compensation_due', 'partial'],
  },
  deciderArtifactDigest: { state: 'digest', value: 'sha256:determination-letter' },
  inputsDigest: 'sha256:claims-file', decidedAt: '2026-08-04T09:00:00.000Z',
  resolvableUntil: '2033-01-01T00:00:00.000Z', counterparty: '0x9999999999999999999999999999999999999999', rail: 'eip155:8453',
};

console.log('\n── issue and verify, from this package alone ──');
const issued = await issueDecisionAttestation(INPUT, signer);
assert('a consumer can ISSUE with only their own signer', issued.kind === 'issued', JSON.stringify(issued).slice(0, 160));
{
  const b = verifyDecisionAttestation('CLM-1', issued.attestation, issued.signature, verifyAdapter, decodeDidKey);
  assert('...and VERIFY it with primitives from this package', b.state === 'attested', JSON.stringify(b).slice(0, 200));
  assert('...recovering the decision facts from the document', b.decisionId === 'CLM-1' && b.outcome === 'denied' && b.decider === DIDKEY);
  assert('...including the policy fixed by hash and the vocabulary it drew the outcome from',
    b.policyRef.hash === 'sha256:p0licy' && b.vocabularyRef.source === 'client-defined');
  assert('...and where the decider\'s reasons live', b.deciderArtifactDigest.state === 'digest');
}

console.log('\n── the controls, so a pass above means something ──');
{
  const tampered = { ...issued.attestation, outcome: 'approved' };
  const b = verifyDecisionAttestation('CLM-1', tampered, issued.signature, verifyAdapter, decodeDidKey);
  assert('a tampered outcome does NOT verify', b.state === 'cited-invalid', JSON.stringify(b).slice(0, 140));
  // Key order must NOT matter: that is what canonicalisation buys, and it is the property that was
  // broken here once already.
  const reordered = Object.fromEntries(Object.entries(issued.attestation).reverse());
  const c = verifyDecisionAttestation('CLM-1', reordered, issued.signature, verifyAdapter, decodeDidKey);
  assert('...but reordering every key DOES verify', c.state === 'attested', JSON.stringify(c).slice(0, 140));
  const d = verifyDecisionAttestation('OTHER', issued.attestation, issued.signature, verifyAdapter, decodeDidKey);
  assert('citing one decision and shipping another does NOT verify', d.state === 'cited-invalid');
}

console.log('\n── THE STATES ARE DISTINCT, AND COLLAPSING ANY TWO MUST BREAK SOMETHING ──');
{
  // ADDED 2026-08-07 BECAUSE A MUTATION SWEEP FOUND THEM UNHELD. `scripts/sweep-attestation-states.mjs`
  // collapsed each state into its neighbour and ran the suite: two of four SURVIVED, meaning the
  // distinction existed only in prose. Both are distinctions this estate states in writing —
  // aip/POLICY_ARTIFACT.md, the attestation source, and the refusal projection all say that an
  // INABILITY TO CHECK is a different fact from a FAILED CHECK.
  //
  // These assert the two that survived. Each names the state it must NOT be, because asserting only
  // the positive would pass under exactly the collapse being guarded against.

  // A1: NOTHING CITED is not the same as CITED AND UNOBTAINABLE.
  //
  // A payment that claims nothing has made no claim to check. Reporting that as
  // `cited-unresolvable` would say a citation existed and could not be reached, which invents a
  // claim on the payer's behalf and reads on a panel as a verification failure.
  const none = verifyDecisionAttestation(undefined, issued.attestation, issued.signature, verifyAdapter, decodeDidKey);
  assert('citing NOTHING yields not-cited', none.state === 'not-cited', JSON.stringify(none).slice(0, 140));
  assert('...and NOT cited-unresolvable, which would invent a claim nobody made',
    none.state !== 'cited-unresolvable');

  // A3: A MALFORMED DECIDER KEY IS A FAILED CHECK, not an inability to check.
  //
  // The did:key is present and this verifier can decode that method — it decoded it and the bytes
  // are wrong. That is a document that failed a check we ran. `cited-unresolvable` is for a decider
  // we could not reach or a method we do not support, and using it here would report hostility as
  // an outage.
  const badKey = { ...issued.attestation, decider: 'did:key:z6MkNOTAREALKEY' };
  const bad = verifyDecisionAttestation('CLM-1', badKey, issued.signature, verifyAdapter, decodeDidKey);
  assert('a malformed ed25519 did:key decider yields cited-invalid',
    bad.state === 'cited-invalid', JSON.stringify(bad).slice(0, 160));
  assert('...and NOT cited-unresolvable, which would report a failed check as an outage',
    bad.state !== 'cited-unresolvable');
}

console.log('\n── the restricted canonicaliser is NOT reachable ──');
{
  // THE HAZARD THIS ASSERTS AGAINST. This package now holds two canonicalisers that agree only
  // because every attestation field is a string. If the restricted one becomes reachable, a caller
  // can sign with the wrong one and produce bytes no other implementation reproduces.
  assert('canonicalise is not exported', pkg.canonicalise === undefined);
  assert('canonicalBytes is not exported', pkg.canonicalBytes === undefined);

  // ─── `stripUndefinedDeep` WAS ON THIS LIST AND LEFT THE MODULE IN rc.8 ─────────────────────────
  //
  // IT IS NOT AN EXEMPTION. The guard's subject is the restricted MODULE, and this helper is no longer
  // in it: it moved to `core/jcs.ts`, beside the public canonicaliser, and is exported from there.
  // Dropping the assertion because the name became public would have been the guard losing its subject
  // to stay convenient; the code moved so the guard did not have to.
  //
  // SO THE ASSERTION BECOMES THE OPPOSITE ONE, and it is stronger. It is public AND it does not
  // canonicalise, which is the property that made it safe to export at all. If someone later moves it
  // back, or gives it serialisation behaviour, this fails.
  assert('stripUndefinedDeep IS exported, from the public module', typeof pkg.stripUndefinedDeep === 'function');
  assert('...and it does not canonicalise: it strips undefined and returns an OBJECT, not bytes',
    (() => { const r = pkg.stripUndefinedDeep({ a: undefined, b: null, c: '1' });
             return typeof r === 'object' && r.b === null && r.c === '1' && !('a' in r); })());
  assert('...so it cannot be used to sign with the restricted canonicaliser',
    typeof pkg.stripUndefinedDeep({ x: '1' }) !== 'string');
  // MUST STILL PASS: the public canonicaliser IS reachable, so the three above are a deliberate
  // absence and not a broken build.
  assert('jcsBytes, the public canonicaliser, IS exported', typeof pkg.jcsBytes === 'function');
}

console.log('\n── the refusals travel with the code ──');
{
  const r = await issueDecisionAttestation({ ...INPUT, vocabularyRef: { ...INPUT.vocabularyRef, source: 'op-starter-set', values: ['approved', 'denied', 'referred', 'ok', 'cleared', 'compensation_due', 'no_compensation_due', 'partial'] } }, signer);
  assert('op-starter-set is refused, because no starter vocabulary is published', r.kind === 'refused');
  assert('checkDecisionRefs is usable standalone', checkDecisionRefs(INPUT.policyRef, INPUT.vocabularyRef) === null);
  assert('checkDeciderArtifactRef is usable standalone', checkDeciderArtifactRef(INPUT.deciderArtifactDigest) === null);
  let threw = null;
  try { assertNoObservation({ ...INPUT, rationale: 'because clause 4.2' }); } catch (e) { threw = e; }
  assert('the observation boundary refuses a rationale', threw !== null && threw.constructor.name === 'ObservationRefused');
}

console.log(`\ndecision-attestation: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('\nFAILURES:'); failures.forEach(f => console.error('  ✗ ' + f)); process.exit(1); }
