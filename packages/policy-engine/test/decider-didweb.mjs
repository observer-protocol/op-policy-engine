// did:web DECIDERS: opt-in by resolver, unresolvable escalates rather than denies.
//
// THE RULING THIS ENCODES, so a later reader does not relitigate it. An unreachable STATUS LIST fails
// closed because the unknown is adverse: the credential MAY have been revoked. An unreachable DECIDER
// DOCUMENT is not that shape — the unknown is WHO SIGNED, and an attestation is evidence carried
// alongside a payment rather than the authority for it. The mandate authorises the payment. So an
// unresolvable decider lands in `cited-unresolvable`, the payment escalates carrying a citation marked
// unverified, and a decider's DNS outage is not a payment outage. Never fail-open: an unresolved
// decider must never render as `attested`.
import { verifyDecisionAttestation, issueDecisionAttestation, ed25519Verify, base58Decode, base58Encode } from '../dist/index.mjs';
import { generateKeyPairSync, sign as nodeSign } from 'node:crypto';

let pass = 0, fail = 0;
const failures = [];
const assert = (n, ok, d = '') => { if (ok) { pass++; console.log(`  ✓ ${n}`); } else { fail++; failures.push(n); console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`); } };

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const RAW = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
const DIDKEY = `did:key:z${base58Encode(Buffer.concat([Buffer.from([0xed, 0x01]), RAW]))}`;
const DIDWEB = 'did:web:insurer.example';

const verifyAdapter = (m, s, k) => ed25519Verify(k, Buffer.from(m, 'utf8'), s);
const decodeDidKey = (did) => { try { return base58Decode(did.slice('did:key:z'.length)); } catch { return undefined; } };

const mk = (deciderDid) => ({
  deciderDid: async () => deciderDid,
  sign: async (p) => nodeSign(null, Buffer.from(p, 'utf8'), privateKey).toString('base64'),
  assurance: () => 'self-declared',
});
const INPUT = {
  decisionId: 'CLM-1', subject: 'claimant:1', outcome: 'denied',
  policyRef: { id: 'https://insurer.example/policy/v7', hash: 'sha256:p', hashMethod: 'sha256' },
  vocabularyRef: { id: 'https://insurer.example/vocab/v1', version: '1.0.0', hash: 'sha256:v', hashMethod: 'sha256', source: 'client-defined' },
  deciderArtifactDigest: { state: 'digest', value: 'sha256:letter' },
  inputsDigest: 'sha256:file', decidedAt: '2026-08-04T09:00:00.000Z', resolvableUntil: '2033-01-01T00:00:00.000Z',
};
const web = await issueDecisionAttestation(INPUT, mk(DIDWEB));
const key = await issueDecisionAttestation(INPUT, mk(DIDKEY));
const V = (doc, sig, resolver) => verifyDecisionAttestation('CLM-1', doc, sig, verifyAdapter, decodeDidKey, resolver);

console.log('\n── no resolver: did:web is refused, exactly as before ──');
{
  const b = V(web.attestation, web.signature);
  assert('a did:web decider is cited-unresolvable when no resolver is supplied', b.state === 'cited-unresolvable', JSON.stringify(b).slice(0, 120));
  assert('...and the reason says it is opt-in rather than impossible', /OPT-IN|opt-in/.test(b.reason));
  // MUST STILL PASS: did:key needs no resolver and is unaffected by any of this.
  assert('a did:key decider still verifies with no resolver', V(key.attestation, key.signature).state === 'attested');
}

console.log('\n── with a resolver: did:web verifies, and the artifact is checked just as hard ──');
{
  const resolver = (did) => (did === DIDWEB ? new Uint8Array(RAW) : undefined);
  const b = V(web.attestation, web.signature, resolver);
  assert('a resolved did:web decider is ATTESTED', b.state === 'attested', JSON.stringify(b).slice(0, 160));
  assert('...carrying the decider it resolved, not one the caller asserted', b.decider === DIDWEB);

  // THE SAME CHECKS, NOT A WEAKER PATH. Resolution establishes WHOSE key; it buys the artifact nothing.
  const tampered = { ...web.attestation, outcome: 'approved' };
  assert('a tampered document does NOT verify even with a good resolver', V(tampered, web.signature, resolver).state === 'cited-invalid');
  const wrongKey = () => new Uint8Array(generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' }).subarray(-32));
  assert('a resolver returning the WRONG key yields cited-invalid, not attested',
    V(web.attestation, web.signature, wrongKey).state === 'cited-invalid');
}

console.log('\n── unresolvable is cited-unresolvable, NEVER a denial and NEVER attested ──');
{
  const absent = () => undefined;
  const b = V(web.attestation, web.signature, absent);
  assert('a resolver that establishes nothing yields cited-unresolvable', b.state === 'cited-unresolvable', JSON.stringify(b).slice(0, 140));
  assert('...and says it is an inability to establish WHO, not a failed check', /who signed/i.test(b.reason));
  assert('...and never attested, so nothing fails open', b.state !== 'attested');

  // A THROW IS A DELIBERATE REFUSAL, and its reason survives rather than being flattened to "unavailable".
  const guarded = () => { throw new Error('[url-guard] refusing to fetch https://10.0.0.1/.well-known/did.json: private RFC1918'); };
  const g = V(web.attestation, web.signature, guarded);
  assert('a resolver that THROWS is cited-unresolvable with its own reason', g.state === 'cited-unresolvable');
  assert('...naming the refusal rather than reporting an outage', /url-guard|refused rather than fetched/.test(g.reason), g.reason);

  // A WRONG-LENGTH KEY IS NOT A KEY. Accepting it would hand a malformed buffer to the verifier and
  // report the result as a bad signature, which is the false-negative-reads-as-forgery shape.
  const short = () => new Uint8Array(31);
  assert('a resolver returning a wrong-length key is unresolvable, not a bad signature',
    V(web.attestation, web.signature, short).state === 'cited-unresolvable');
}

console.log('\n── an unsupported method is still refused ──');
{
  const other = await issueDecisionAttestation(INPUT, mk('did:example:123'));
  const b = V(other.attestation, other.signature, () => new Uint8Array(RAW));
  assert('did:example is cited-unresolvable even with a resolver present', b.state === 'cited-unresolvable');
  assert('...and the reason names both supported methods', /did:key and did:web/.test(b.reason), b.reason);
}

console.log(`\ndecider-didweb: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('\nFAILURES:'); failures.forEach(f => console.error('  ✗ ' + f)); process.exit(1); }
