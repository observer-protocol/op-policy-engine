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

console.log(`\npublic-exports: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('\nFAILURES:'); failures.forEach(f => console.error('  ✗ ' + f)); process.exit(1); }
