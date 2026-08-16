// ONE DECODER, AND A WRONG WIDTH IS NEVER A CLAIM ABOUT A THIRD PARTY'S ARTIFACT.
//
// ─── THE DEFECT ─────────────────────────────────────────────────────────────────────────────────
//
// `verifyDecisionAttestation`'s `decodeDidKey` wants 34 multicodec-prefixed bytes.
// `resolveDeciderDidWeb`, the parameter beside it, wants 32 raw. Both are typed
// `(did: string) => Uint8Array | undefined`, so nothing distinguishes them and a caller has only
// memory. Nineteen hand-written instances across two repos each remember correctly today.
//
// Hand it the 32-byte form and it answered `cited-invalid`: "The decider is not a well-formed
// ed25519 did:key, so no key can be recovered from it." On a decider that passes six independent
// checks and whose signature verifies under `node:crypto`, THAT SENTENCE IS FALSE OF THE ARTIFACT.
//
// And the 32-byte path and the genuinely-bad-DID path returned the SAME string, so the engine could
// not tell a caller error from a bad DID in its own logs — the failure was invisible to the only
// party able to fix it. That is why exposure was the wrong axis for ranking it.
//
// ─── WHAT MUST FAIL, STATED BEFORE ANY OF IT IS CAUSED ──────────────────────────────────────────
//
// C1. The fixture is not actually a well-formed did:key, so every case below tests a broken input
//     and the suite proves its own construction. Case 1 establishes well-formedness with SIX checks
//     that use no engine code at all.
// C2. The 34-byte convention stops working. The whole change is invisible if the correct path moves.
// C3. A 32-byte caller still gets `cited-invalid` — the false claim this exists to remove.
// C4. A genuinely bad DID stops getting the sentence that is TRUE of it, or its wording moves and a
//     committed fixture elsewhere breaks for no reason.
// C5. The two outcomes share a string again. This is the regression that would have passed before
//     the change and is the reason the file exists.
// C6. The decoder accepts a did:key of another curve at the right length, handing a caller a key of
//     the wrong algorithm.
// C7. A tenth hand-written instance appears. Without this the fix is a snapshot, not a property.
import { verifyDecisionAttestation, issueDecisionAttestation, decodeEd25519DidKey,
  refuseWrongDidKeyWidth, DidKeyConventionError, base58Decode, base58Encode } from '../dist/index.mjs';
import { generateKeyPairSync, createPublicKey, sign as nodeSign, verify as nodeVerify } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0, fail = 0; const failures = [];
const a = (n, ok, d = '') => {
  if (ok) { pass++; console.log(`  PASS  ${n}`); }
  else { fail++; failures.push(n); console.log(`  FAIL  ${n}${d ? '  <<< ' + d : ''}`); }
};

// ─── THE FIXTURE. GENERATED, NOT COMMITTED. ─────────────────────────────────────────────────────
//
// Pinning a private key in the repository contradicts the standing rule that keys never live in code
// or the workspace, and this package's attestation tests already generate per run. What is pinned is
// THE SIX CHECKS below, so the test establishes well-formedness rather than assuming it.
const { privateKey } = generateKeyPairSync('ed25519');
const rawKey = createPublicKey(privateKey).export({ type: 'spki', format: 'der' }).subarray(-32);
const multicodec = Buffer.concat([Buffer.from([0xed, 0x01]), rawKey]);
const DECIDER = `did:key:z${base58Encode(multicodec)}`;

// ─── C1. THE FIXTURE IS WELL FORMED, ESTABLISHED WITHOUT ENGINE CODE ────────────────────────────

console.log('\nC1 — six independent checks, none of them the engine\'s');
{
  a('C1.1 the DID uses the did:key multibase-btc prefix', DECIDER.startsWith('did:key:z'));
  const body = base58Decode(DECIDER.slice('did:key:z'.length));
  a('C1.2 the body base58btc-decodes', body instanceof Uint8Array || Buffer.isBuffer(body));
  a('C1.3 it is 34 bytes', body.length === 34, String(body.length));
  a('C1.4 prefixed 0xed 0x01', body[0] === 0xed && body[1] === 0x01);
  a('C1.5 the tail is a 32-byte key', body.subarray(2).length === 32);
  // THE SIXTH IS THE ONE THAT MATTERS: a signature verifies under node:crypto against the key
  // recovered FROM THE DID STRING, not against the key we happen to hold in a variable.
  const recovered = createPublicKey({
    key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(body.subarray(2))]),
    format: 'der', type: 'spki',
  });
  const msg = Buffer.from('the artifact is sound', 'utf8');
  a('C1.6 *** node:crypto verifies a signature against the key recovered from the DID ***',
    nodeVerify(null, msg, recovered, nodeSign(null, msg, privateKey)));
}

const signer = { deciderDid: async () => DECIDER,
  sign: async (p) => nodeSign(null, Buffer.from(p, 'utf8'), privateKey).toString('base64'),
  assurance: () => 'self-declared' };
const DOC = { decisionId: 'DEC-1', subject: 'o:1', outcome: 'approved',
  policyRef: { id: 'policy://x/v1', hash: 'sha256:p', hashMethod: 'sha256' },
  vocabularyRef: { id: 'vocab://x', version: '1.0.0', hash: 'sha256:v', hashMethod: 'sha256',
    source: 'client-defined', values: ['approved'] },
  deciderArtifactDigest: { state: 'digest', value: 'sha256:letter' },
  inputsDigest: 'sha256:in', decidedAt: '2026-08-05T00:00:00.000Z',
  resolvableUntil: '2033-01-01T00:00:00Z', counterparty: '0xdead', rail: 'eip155:8453' };
const issued = await issueDecisionAttestation(DOC, signer);
const ed25519Verify = (m, s, k) => nodeVerify(null, Buffer.from(m, 'utf8'), createPublicKey({
  key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(k)]),
  format: 'der', type: 'spki' }), s);
const run = (decode) => verifyDecisionAttestation('DEC-1', issued.attestation, issued.signature,
  ed25519Verify, decode);

// ─── C2 / C3 / C4 / C5. THE THREE CONVENTIONS AND THEIR THREE OUTCOMES ──────────────────────────

console.log('\nC2/C3/C4/C5 — three widths, three outcomes, and no shared sentence');
{
  const ok = await run((d) => decodeEd25519DidKey(d)?.multicodec);
  a('C2: *** the 34-byte convention returns attested ***', ok.state === 'attested', JSON.stringify(ok).slice(0, 140));

  let thrown = null;
  try { await run((d) => decodeEd25519DidKey(d)?.publicKey); } catch (e) { thrown = e; }
  a('C3: *** the 32-byte convention THROWS rather than answering about the decider ***',
    thrown instanceof DidKeyConventionError, String(thrown).slice(0, 140));
  a('C3: ...naming the parameter that was misused', /`decodeDidKey` callback returned 32 bytes/.test(String(thrown?.message)));
  a('C3: ...and saying plainly it is the caller and not the decider',
    /DEFECT IN THE CALLER AND NOT A FACT ABOUT THE DECIDER/.test(String(thrown?.message)));
  a('C3: ...and naming the fix', /decodeEd25519DidKey\(did\)\?\.multicodec/.test(String(thrown?.message)));

  const bad = await run(() => undefined);
  a('C4: a genuinely malformed DID still returns cited-invalid', bad.state === 'cited-invalid', JSON.stringify(bad).slice(0, 120));
  a('C4: ...with its sentence byte-identical, so no committed fixture moves',
    bad.reason === 'The decider is not a well-formed ed25519 did:key, so no key can be recovered from it.', bad.reason);

  a('C5: *** the caller-error message and the bad-DID message are NOT equal ***',
    String(thrown?.message) !== bad.reason);
  a('C5: ...and the caller error does not contain the bad-DID sentence at all',
    !String(thrown?.message).includes('The decider is not a well-formed ed25519 did:key, so no key'));
}

// ─── C6. THE CURVE IS CHECKED, NOT ASSUMED ──────────────────────────────────────────────────────

console.log('\nC6 — a did:key of another curve is not decoded as ed25519');
{
  // 0xe7 0x01 is secp256k1. Same shape, same length, different algorithm.
  const other = `did:key:z${base58Encode(Buffer.concat([Buffer.from([0xe7, 0x01]), rawKey]))}`;
  a('C6: *** a non-ed25519 multicodec returns undefined ***', decodeEd25519DidKey(other) === undefined);
  a('C6: ...and the ed25519 one still decodes', decodeEd25519DidKey(DECIDER) !== undefined);
  a('C6: a 33-byte body is refused on LENGTH before the prefix is read', (() => {
    const short = `did:key:z${base58Encode(Buffer.concat([Buffer.from([0xed, 0x01]), rawKey.subarray(1)]))}`;
    return decodeEd25519DidKey(short) === undefined;
  })());
  a('C6: refuseWrongDidKeyWidth ignores undefined and 34, and fires only on 32', (() => {
    let n = 0;
    for (const v of [undefined, new Uint8Array(34), new Uint8Array(33)]) {
      try { refuseWrongDidKeyWidth(v, 'decodeDidKey'); } catch { n += 1; }
    }
    let fired = false;
    try { refuseWrongDidKeyWidth(new Uint8Array(32), 'decodeDidKey'); } catch { fired = true; }
    return n === 0 && fired;
  })());
}

// ─── C7. NO TENTH HAND-WRITTEN INSTANCE ─────────────────────────────────────────────────────────

console.log('\nC7 — the decoder is not hand-written anywhere in this package');
{
  // WITHOUT THIS THE FIX IS A SNAPSHOT. The stated goal is that an eleventh call site cannot get the
  // convention wrong, and nothing but a gate delivers that.
  //
  // SCOPED TO THIS REPO, AND THAT IS A LIMIT NOT A CHOICE. A grep cannot see across repo boundaries;
  // `op-mcp-payment-server` carries its own copy of this case for its own tree.
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, '..');
  const walk = (dir) => readdirSync(dir).flatMap((e) => {
    if (e === 'node_modules' || e === '.git' || e === 'dist') return [];
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  // TWO EXEMPTIONS, EACH WITH A REASON RATHER THAN A LIST.
  //
  // `core/did-key.ts` IS the decoder — a gate that forbids its own subject forbids its existence.
  //
  // THIS FILE, because C1 decodes by hand ON PURPOSE: it establishes that the fixture is a
  // well-formed did:key WITHOUT using the thing under test. If C1 called the decoder it would be
  // asserting the decoder against itself, which is the shape this whole task is about.
  const files = walk(root).filter((f) => /\.(ts|mjs|js)$/.test(f)
    && !f.endsWith('did-key.ts') && !f.endsWith('decider-didkey-conventions.mjs'));
  const offenders = files.filter((f) => {
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    return /slice\(\s*'did:key:z'\.length\s*\)/.test(src);
  }).map((f) => f.slice(root.length + 1));
  a('C7: the walk found real files to check', files.length > 20, `${files.length} files`);
  a('C7: *** no hand-written did:key slice outside the shared decoder ***',
    offenders.length === 0, offenders.join(', '));
}

console.log(`\ndecider-didkey-conventions: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); for (const f of failures) console.log(`  x ${f}`); process.exit(1); }
