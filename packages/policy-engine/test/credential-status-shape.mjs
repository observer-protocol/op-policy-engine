// credentialStatus SHAPE conformance.
//
// The array is canonical. Delegation schemas v2.4, v2.5 and v2.6 all type
// `credentialStatus` as `type: array`, and validateStructure enforces that. An
// issuer emitting a bare object is the defect, not the schema.
//
// But the revocation check does not sit behind validateStructure on every path.
// verifyCredentialCrypto deliberately skips the structure gate — its documented
// role is verifying credentials whose shape is gated by other means — and the
// policy sidecar (policy-core-impl/src/gate.ts) casts an arbitrary inbound
// credential straight into it. On that path the old guard was:
//
//     if (cred.credentialStatus && cred.credentialStatus.length > 0)
//
// `.length` on an object is undefined and `undefined > 0` is false, so an
// object-shaped credentialStatus fell to the else branch, recorded
// `revocation: 'status-absent'` with a note saying revocation was not checkable,
// and ALLOWED. A revoked credential verified as valid, silently, in the
// direction that grants authority. This is the same array-read-as-dict defect
// the Python verifier already found and fixed in
// observer-protocol-api/delegation_routes.py.
//
// What each case here pins:
//   1-2. the object form is CHECKED, not skipped — revoked denies, clean allows
//        and says so in checks.revocation
//   3.   a scalar credentialStatus refuses rather than falling through
//   4.   the absent case still allows, and still says revocation was unchecked
//   5-6. tolerance stays on the crypto path — validateStructure keeps rejecting
//        the object form, so the array remains canonical for anything that has
//        a shape gate
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCredentialCrypto, verifyCredentialObject } from '../dist/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'fixtures', 'out');

const { configTemplate } = JSON.parse(readFileSync(join(OUT, 'config.json'), 'utf8'));
const NOW = Date.parse('2026-06-25T12:00:00Z');

let pass = 0, fail = 0;
const failures = [];
function assert(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

const cred = (name) => JSON.parse(readFileSync(join(OUT, `cred-${name}.json`), 'utf8'));
const cfg = (statusList) => ({
  ...configTemplate,
  offline: { ...configTemplate.offline, statusListPath: join(OUT, statusList) },
});

console.log('\n── credentialStatus shape ──');

// 1. THE DEFECT. Object-shaped status, credential revoked on the list.
//    Pre-fix this returns allow:true.
{
  const v = await verifyCredentialCrypto(cred('object-status'), cfg('status-revoked.json'), NOW);
  assert('object-shaped credentialStatus, revoked → deny',
    v.allow === false && (v.reason ?? '').toLowerCase().includes('revocation'),
    v.allow ? `expected DENY, got ALLOW (revocation=${v.checks?.revocation})` : `reason was "${v.reason}"`);
}

// 2. The other half of the same property: the object form must be genuinely
//    checked, not merely denied. An allow has to record that the status list was
//    read. Pre-fix this allows too, but with revocation:'status-absent' — which
//    is why asserting only on allow/deny would let the defect through.
{
  const v = await verifyCredentialCrypto(cred('object-status'), cfg('status-clean.json'), NOW);
  assert('object-shaped credentialStatus, not revoked → allow, and status was actually read',
    v.allow === true && v.checks?.revocation === 'not-revoked',
    v.allow ? `revocation check recorded "${v.checks?.revocation}", expected "not-revoked"` : v.reason);
}

// 3. Neither array nor object. Nothing is checkable, so this must refuse.
{
  const v = await verifyCredentialCrypto(cred('scalar-status'), cfg('status-clean.json'), NOW);
  assert('scalar credentialStatus → deny, never a silent pass',
    v.allow === false,
    `expected DENY, got ALLOW (revocation=${v.checks?.revocation})`);
}

// 4. Regression guard. A credential that genuinely carries no status entry keeps
//    its existing behaviour: allowed, and honest about not having checked.
{
  const v = await verifyCredentialCrypto(cred('no-status'), cfg('status-clean.json'), NOW);
  assert('absent credentialStatus → allow, recorded as status-absent',
    v.allow === true && v.checks?.revocation === 'status-absent',
    v.allow ? `revocation recorded "${v.checks?.revocation}"` : v.reason);
}

// 5. The array form is unchanged by any of this.
{
  const v = await verifyCredentialCrypto(cred('valid'), cfg('status-revoked.json'), NOW);
  assert('array-shaped credentialStatus, revoked → deny (unchanged)',
    v.allow === false && (v.reason ?? '').toLowerCase().includes('revocation'),
    v.allow ? 'expected DENY, got ALLOW' : `reason was "${v.reason}"`);
}

// 6. Tolerance must NOT leak into the structure gate. verifyCredentialObject
//    still rejects the object form, so the array stays canonical everywhere a
//    shape gate exists. If this ever flips to allow, the compatibility shim has
//    quietly become the schema.
{
  const v = await verifyCredentialObject(cred('object-status'), cfg('status-clean.json'), NOW);
  assert('validateStructure still rejects the object form (array stays canonical)',
    v.allow === false && (v.reason ?? '').toLowerCase().includes('must be an array'),
    v.allow ? 'expected DENY at the schema gate, got ALLOW' : `reason was "${v.reason}"`);
}

console.log(`\ncredentialStatus shape: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error('\nFAILURES:');
  failures.forEach(f => console.error('  ✗ ' + f));
  process.exit(1);
}
