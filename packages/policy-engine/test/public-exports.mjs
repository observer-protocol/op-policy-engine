// WHAT THE PACKAGE ENTRY POINT ACTUALLY EXPOSES.
//
// An export is a claim that a consumer can reach something. This asserts it from the entry point a
// consumer imports, not from the module that defines it, because those are different facts: a
// function can exist, be correct, be tested, and still be unreachable from outside the package.
// `ed25519Verify` was exactly that until 2026-08-04 — present in core/crypto.ts, unexported, and
// therefore something a consumer had to hand-roll instead.
import { ed25519Verify, sha256, jcsBytes, verifyEddsaJcs2022, base58Decode } from '../dist/index.mjs';
import { generateKeyPairSync, sign as nodeSign } from 'node:crypto';

let pass = 0, fail = 0;
const failures = [];
const assert = (n, ok, d = '') => { if (ok) { pass++; console.log(`  ✓ ${n}`); } else { fail++; failures.push(n); console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`); } };

console.log('\n── the entry point exposes what verification needs ──');
for (const [name, fn] of [['ed25519Verify', ed25519Verify], ['sha256', sha256], ['jcsBytes', jcsBytes],
                          ['verifyEddsaJcs2022', verifyEddsaJcs2022], ['base58Decode', base58Decode]]) {
  assert(`${name} is reachable from the package entry point`, typeof fn === 'function');
}

console.log('\n── ed25519Verify, both outcomes ──');
{
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  const msg = Buffer.from('{"a":"b"}', 'utf8');
  const sig = nodeSign(null, msg, privateKey);

  assert('a good signature verifies', ed25519Verify(raw, msg, sig) === true);
  // MUST STILL FAIL: a verifier that returns true unconditionally proves nothing.
  assert('a tampered message does NOT verify',
    ed25519Verify(raw, Buffer.from('{"a":"c"}', 'utf8'), sig) === false);
  const otherKey = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  assert('a different key does NOT verify', ed25519Verify(otherKey, msg, sig) === false);
  // THE LENGTH GUARD, which is the thing a hand-rolled SPKI wrap gets wrong: a 31- or 33-byte key
  // wrapped without checking produces a key object that fails to verify, which reads as a bad
  // signature rather than a bad key.
  let threw = null;
  try { ed25519Verify(raw.subarray(0, 31), msg, sig); } catch (e) { threw = e; }
  assert('a wrong-length key THROWS rather than reporting a bad signature', threw !== null,
    'a false negative here is indistinguishable from a forgery');
}

// ── THE DECISION-ATTESTATION SURFACE, ASSERTED BY NAME ──────────────────────────────────────────
//
// `checkPaymentBinding` was defined in core/attestation.ts, correct, and covered by tests in the
// OTHER copy of that file, while being unreachable from the package entry point. Nothing failed,
// because nothing asserted the surface. This list is what turns "it exists" into "a consumer can
// reach it".
//
// THE LIST IS THE COVERAGE, and it is a hand-written list, so it is the weak kind of control: a
// name added to core/attestation.ts and not added here is invisible again. The STRONG control is
// downstream — op-mcp-payment-server imports these from the package and has deleted its own copy,
// so its build fails if any of them stops being exported. This list catches the gap earlier; that
// one cannot be forgotten.
console.log('\n── the decision-attestation surface is reachable from the entry point ──');
{
  const mod = await import('../dist/index.mjs');
  const REQUIRED = [
    'issueDecisionAttestation', 'verifyDecisionAttestation', 'acceptDecisionAttestation',
    'checkDecisionRefs', 'checkDeciderArtifactRef', 'checkOutcomeInVocabulary',
    'checkPaymentBinding',
    'assertNoObservation', 'ObservationRefused',
  ];
  for (const name of REQUIRED) {
    assert(`${name} is reachable from the package entry point`, typeof mod[name] === 'function',
      `typeof was ${typeof mod[name]}`);
  }
  // Value exports, which are not functions and would pass a typeof-function check vacuously.
  assert('FORBIDDEN_ATTESTATION_FIELDS is reachable', mod.FORBIDDEN_ATTESTATION_FIELDS !== undefined);
  assert('ATTESTATION_ESTABLISHES is reachable', mod.ATTESTATION_ESTABLISHES !== undefined);
  // ─── THE policyRef CONVENTION, WHOSE WHOLE DEFECT WAS THAT IT DID NOT REACH THE ISSUER ─────────
  //
  // This one belongs on this list more than anything else on it. The convention existed, was correct,
  // and was reachable only from the READING side in another repository — so a decider producing an
  // attestation never met it. An export is a claim that a consumer can reach something, and the
  // consumer here is the party the guidance instructs. Reachability IS the fix.
  assert('POLICY_REF_CONVENTION is reachable', mod.POLICY_REF_CONVENTION instanceof Map);
  assert('...and carries entries, not an empty map', mod.POLICY_REF_CONVENTION?.size > 0);
  assert('POLICY_REF_FIELDS_GO_INSIDE_POLICY_REF is reachable', mod.POLICY_REF_FIELDS_GO_INSIDE_POLICY_REF === true);

  // ─── THE PAYLOAD BUILDERS, WHICH ARE THE WHOLE REASON A COUNTERPARTY IMPORTS THIS PACKAGE ──────
  //
  // ADDED 2026-08-09 WITH `evaluationVerdictPayload`, AND THE OTHER THREE WERE MISSING FROM THIS LIST.
  // `refusalPayload` moved here at rc.8 so a counterparty could rebuild the bytes a refusal was signed
  // over, and its reachability — the entire point of the move — was asserted nowhere. The list is the
  // coverage, and it did not cover the exports the package exists to provide.
  assert('evaluationVerdictPayload is reachable', typeof mod.evaluationVerdictPayload === 'function');
  assert('refusalPayload is reachable', typeof mod.refusalPayload === 'function');
  assert('signableFromRefusal is reachable', typeof mod.signableFromRefusal === 'function');
  assert('lapsePayload is reachable', typeof mod.lapsePayload === 'function');
  assert('stripUndefinedDeep is reachable', typeof mod.stripUndefinedDeep === 'function');

  // THE DOMAIN SEPARATORS, BY VALUE. A renamed constant is survivable; a changed VALUE invalidates
  // every signature already written over it, so the value is pinned here rather than the name alone.
  //
  // ─── REPINNED v3 → v4 AT rc.18, WHICH IS WHAT THIS GATE IS FOR ────────────────────────────────
  //
  // The pin is not "never change this". It is "changing this cannot happen quietly". The value moved
  // because the SIGNED FIELD SET moved — an escalate now signs `remainingAfterApproval` — and a
  // discriminator that stayed at v3 would leave one string covering two constructions, which is the
  // condition a verifier cannot resolve.
  //
  // WHAT MUST ACCOMPANY A MOVE, AND DID: consumers stamp the construction on each stored record
  // (`op-mcp-payment-server`, 2026-08-15) BEFORE the bump, so v4 records say what they are and
  // earlier ones read as not-recorded rather than being backfilled with a guess. A bump landing
  // without that would make every stored signature a signature over an unstated construction.
  assert('EVALUATION_VERDICT_PAYLOAD_TYPE is reachable AND pinned',
    mod.EVALUATION_VERDICT_PAYLOAD_TYPE === 'op.evaluation.verdict.v4', mod.EVALUATION_VERDICT_PAYLOAD_TYPE);
  assert('REFUSAL_PAYLOAD_TYPE is reachable', mod.REFUSAL_PAYLOAD_TYPE !== undefined);
  assert('LAPSE_PAYLOAD_TYPE is reachable', mod.LAPSE_PAYLOAD_TYPE !== undefined);

  // ─── `resolutionPayload` RETURNS AT rc.13, AND THIS ASSERTION IS INVERTED, NOT DELETED ──────────
  //
  // IT PREVIOUSLY PINNED THE OPPOSITE, and failing when the ruling changed is what it is for: "still
  // NOT exported, which is a ruling rather than an omission — withdrawn at rc.9". That check was
  // correct and it did its job. Ruled by Boyd 2026-08-12; the rc.9 objections are answered in
  // `core/records/resolution.ts` rather than routed around.
  //
  // IT IS NOT WEAKENED TO A PRESENCE CHECK. The rc.9 objection was that the actor's `assurance` would
  // enter the surface as a SECOND meaning of a name this package already uses, so the assertion that
  // matters is not "the function is reachable" but "the type it carries is the one already exported".
  assert('resolutionPayload is exported at rc.13', typeof mod.resolutionPayload === 'function');
  assert('...and RESOLUTION_PAYLOAD_TYPE is the payment server\'s string, NOT renamed to op.enforcement.*',
    mod.RESOLUTION_PAYLOAD_TYPE === 'op.approval.resolution.v1', mod.RESOLUTION_PAYLOAD_TYPE);
  assert('...and RequiredKeyCustody is still the ONE assurance vocabulary this package exports',
    Array.isArray(mod.REQUIRED_KEY_CUSTODY) && mod.ApprovalAssurance === undefined,
    `REQUIRED_KEY_CUSTODY=${JSON.stringify(mod.REQUIRED_KEY_CUSTODY)}`);
  // THE FUNCTION REFUSES RATHER THAN SIGNING A RECORD THAT DOES NOT SAY WHAT IT SEEMS TO. Asserted
  // here because a reachable constructor that silently accepts a missing actor would be worse than an
  // absent one: a counterparty would rebuild bytes that verify against nothing and blame the signature.
  let refused = false;
  try { mod.resolutionPayload({ handleId: 'h', how: 'approved', at: '2026-01-01T00:00:00.000Z' }); }
  catch { refused = true; }
  assert('...and it refuses to build a payload with no actor', refused);

  // AND IT DISCRIMINATES: a name that is not exported must fail this check, or the loop above is
  // measuring nothing. Without this, a broken import would make every assertion above pass as
  // `typeof undefined === 'undefined'`... which is exactly what the loop tests for, so prove the
  // negative case reports absence rather than presence.
  assert('a name the package does NOT export is reported absent',
    typeof mod.canonicalise !== 'function',
    'canonicalise is deliberately withheld; if this passes as a function the check is inverted');
}

console.log(`\npublic-exports: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('\nFAILURES:'); failures.forEach(f => console.error('  ✗ ' + f)); process.exit(1); }
