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
  // MOVED v3 -> v4 ON 2026-08-10, AND THE MOVE IS THE ONLY REASON THIS LINE CHANGED. This assertion did
  // its job: it failed the moment the separator moved, which is exactly what it exists for. It was
  // retargeted rather than relaxed, because the guard is against an ACCIDENTAL rename and this was a
  // ruled one — v4 binds `reservationId` to close a replay that let a captured verdict authorise a
  // second identical payment inside its window.
  //
  // IF YOU ARE HERE BECAUSE THIS FAILED AGAIN, the question is not "what is the new value". It is
  // whether somebody decided to move it and what happens to the signatures already written over the
  // old one. Answer that first; the population was 63 records when it moved to v4, and it was safe to
  // break because all of them were about to be re-driven. That is unlikely to be true a second time.
  assert('EVALUATION_VERDICT_PAYLOAD_TYPE is reachable AND unchanged',
    mod.EVALUATION_VERDICT_PAYLOAD_TYPE === 'op.evaluation.verdict.v4', mod.EVALUATION_VERDICT_PAYLOAD_TYPE);
  assert('REFUSAL_PAYLOAD_TYPE is reachable', mod.REFUSAL_PAYLOAD_TYPE !== undefined);
  assert('LAPSE_PAYLOAD_TYPE is reachable', mod.LAPSE_PAYLOAD_TYPE !== undefined);

  // AND `resolutionPayload` MUST STAY ABSENT. Withdrawn at rc.9 for a recorded reason, so its absence
  // is a DECISION and needs a check like any other. A second negative control beside `canonicalise`,
  // pointed at the export whose return would be the easiest to justify by adjacency to the verdict one.
  assert('resolutionPayload is still NOT exported, which is a ruling rather than an omission',
    mod.resolutionPayload === undefined,
    'withdrawn at rc.9: a resolution actor is a payment-server concept and its assurance field collided');

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
