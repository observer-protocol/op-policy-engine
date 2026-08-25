// A SERVED ROW REBUILDS TO THE BYTES ITS SIGNATURE COVERS, and the signature is the oracle.
//
// WHY THIS EXISTS. rc.21 could rebuild a refusal only in its STORE shape. A counterparty holds the
// SERVED shape, and feeding that to `signableFromRefusal` threw on a v3 row and read a v3 row's
// version as v1. Two false negatives on the records v3 was introduced to describe, measured
// 2026-08-24 against the published rc.21 over the five vectors vendored under
// test/fixtures/served-rows/. Every assertion here runs against dist/, which is what ships.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { refusalPayload, signableFromRefusal, signableFromRefusalRow, isRefusalRow,
  decodeEd25519DidKey, ed25519Verify, REFUSAL_PAYLOAD_TYPE_V3 } from '../dist/index.mjs';

let pass = 0, fail = 0; const failures = [];
const a = (n, ok, d = '') => { if (ok) { pass++; console.log(`  ✓ ${n}`); } else { fail++; failures.push(n); console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`); } };

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'served-rows');
const load = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));

// ONE VERIFIER FOR BOTH SHAPES: the bytes, the signature value, and the key named on the record.
const verifies = (bytes, value, signedBy) =>
  ed25519Verify(Buffer.from(decodeEd25519DidKey(signedBy).publicKey), Buffer.from(bytes, 'utf8'), Buffer.from(value, 'base64'));
const servedBytes = (row) => refusalPayload(signableFromRefusal(signableFromRefusalRow(row)));
// A THROW IS A FAILURE WITH A NAME, NOT A CRASH. First negative control of this file: a rebuild
// letting nulls into the bound made `canonicalise` throw inside the tampering block, the process
// died with a stack trace and NO summary line, and a reader grepping for failures counted zero.
// Every section below runs under this so a broken rebuild is reported by the assertion it broke.
const section = (name, fn) => { try { fn(); } catch (e) { a(`${name}: completed without throwing`, false, e.message.slice(0, 140)); } };

// ─── THE POPULATION, DERIVED FROM THE DIRECTORY, NOT LISTED ──────────────────────────────────
const served = [], store = [];
for (const f of readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const j = load(f);
  const rows = Array.isArray(j.refusals) ? j.refusals : [j];
  for (const r of rows) (isRefusalRow(r) ? served : store).push({ f, r });
}
console.log(`\n── population: ${served.length} served rows, ${store.length} store records ──`);
a('the served population is not empty', served.length >= 3, 'a run over nothing establishes nothing');
a('the store population is not empty', store.length >= 3);

// ─── EVERY SIGNED SERVED ROW VERIFIES THROUGH THE PUBLISHED REBUILD ─────────────────────────
console.log('\n── served rows: rebuild and verify ──');
const versionsSeen = new Set();
for (const { f, r } of served) {
  if (r.signature.state === 'unsigned') continue;
  versionsSeen.add(r.signature.payloadType);
  let ok, why = '';
  try { ok = verifies(servedBytes(r), r.signature.value, r.signature.signedBy); }
  catch (e) { ok = false; why = e.message.slice(0, 120); }
  a(`${f} ${r.refusalId} ${r.code} [${r.signature.payloadType}, ${r.appliedBound?.state}] verifies`, ok === true, why);
}
a('the served population covers v3', versionsSeen.has(REFUSAL_PAYLOAD_TYPE_V3), [...versionsSeen].join(','));
a('...and a pre-v3 version, so the version comes from the row and not from this build',
  [...versionsSeen].some((v) => v !== REFUSAL_PAYLOAD_TYPE_V3), [...versionsSeen].join(','));
const v3Arms = new Set(served.filter((x) => x.r.signature.payloadType === REFUSAL_PAYLOAD_TYPE_V3).map((x) => x.r.appliedBound?.state));
a('the v3 served rows carry both bound arms', v3Arms.has('not-supplied') && v3Arms.has('recorded'), [...v3Arms].join(','));

// ─── THE REBUILD IS A CHECK, NOT AN AGREEMENT: one character moved and it fails ────────────
console.log('\n── tampering ──');
section('tampering', () => {
  const { r } = served.find((x) => x.r.signature.payloadType === REFUSAL_PAYLOAD_TYPE_V3);
  const bumped = { ...r, attempted: { ...r.attempted, amountRaw: String(BigInt(r.attempted.amountRaw) + 1n) } };
  a('one minor unit more on a served v3 row does NOT verify', verifies(servedBytes(bumped), r.signature.value, r.signature.signedBy) === false);
  const reasoned = { ...r, appliedBound: r.appliedBound.state === 'not-supplied'
    ? { ...r.appliedBound, reason: 'no-authority' } : { ...r.appliedBound, note: 'a note the signer never saw' } };
  a('a changed v3-only field (reason, or the recorded note) does NOT verify, so the v3 fields are inside the rebuilt bytes',
    verifies(servedBytes(reasoned), r.signature.value, r.signature.signedBy) === false);
});

// ─── THE STORE SHAPE STILL VERIFIES, AND THE TWO SHAPES OF ONE RECORD AGREE ──────────────────
console.log('\n── store records ──');
for (const { f, r } of store) {
  let ok, why = '';
  try { ok = verifies(refusalPayload(signableFromRefusal(r)), r.signature, r.signedBy); }
  catch (e) { ok = false; why = e.message.slice(0, 120); }
  a(`${f} ${r.refusalId} [${r.payloadType}, ${r.appliedBound?.state}] verifies as a store record`, ok === true, why);
}
section('projected recorded-with-note', () => {
  // THE ONE CELL NO DEPLOYMENT EMITS: a served row on the recorded arm WITH a note. Covered by
  // projecting the constructed store record to the served shape by hand and requiring the
  // enforcement point's own signature to verify over the rebuild. Stated on every run.
  const { r } = store.find((x) => x.r.appliedBound?.state === 'recorded' && x.r.appliedBound?.note !== undefined);
  const projected = {
    refusalId: r.refusalId, at: r.at, observedAt: r.observedAt ?? null,
    agentId: r.attribution?.agentId ?? null, mandateId: r.attribution?.mandateId ?? null,
    refusedBy: r.authority, code: r.code, constraint: r.breachedConstraint ?? null,
    attempted: { amountRaw: r.spend.amountRaw, decimals: r.spend.decimals, asset: r.spend.asset, rail: r.spend.rail, counterparty: r.spend.counterparty ?? null },
    appliedBound: { state: 'recorded', limit: r.appliedBound.limit, unit: r.appliedBound.unit ?? null, observed: r.appliedBound.observed ?? null, headroom: r.appliedBound.headroom ?? null, note: r.appliedBound.note },
    credential: signableFromRefusal(r).credential,
    attestation: r.attestation ?? { state: 'not-evaluated' },
    network: r.network ?? null,
    signature: { state: 'signed', value: r.signature, signedBy: r.signedBy, payloadType: r.payloadType },
  };
  a('recorded-arm-with-note, PROJECTED to the served shape (no deployment serves this cell yet), verifies over the rebuild',
    verifies(servedBytes(projected), r.signature, r.signedBy) === true);
  a('...and the projected row rebuilds to the same bytes as the store record it came from',
    servedBytes(projected) === refusalPayload(signableFromRefusal(r)));
});

// ─── NULL MEANS ABSENT ───────────────────────────────────────────────────────────────────────
console.log('\n── nulls become omitted keys ──');
section('nulls', () => {
  const { r } = served.find((x) => x.r.constraint === null) ?? served[0];
  const rebuilt = signableFromRefusalRow({ ...r, constraint: null, network: null, attestation: { state: 'not-evaluated' } });
  a('a null constraint is an OMITTED key, not a null', !('breachedConstraint' in rebuilt));
  a('a null network is an OMITTED key', !('network' in rebuilt));
  a('a not-evaluated attestation maps back to ABSENT', !('attestation' in rebuilt));
  const nb = signableFromRefusalRow({ ...r, appliedBound: { state: 'not-supplied', constraint: null, reason: null, note: 'n' } });
  a('a null reason inside the bound is omitted, so a pre-v3 row rebuilds without it', !('reason' in nb.appliedBound) && !('constraint' in nb.appliedBound));
  const un = signableFromRefusalRow({ ...r, signature: { state: 'unsigned', note: 'written before signing' } });
  a('an unsigned row rebuilds with NO payloadType, because a version describes a signature', un.payloadType === undefined);
});

// ─── THE WRONG SHAPE IS REFUSED BY NAME ──────────────────────────────────────────────────────
console.log('\n── shape ──');
section('shape', () => {
  const { r } = served[0];
  let msg = '';
  try { signableFromRefusal(r); } catch (e) { msg = e.message; }
  a('signableFromRefusal handed a served row names the served shape and the function to use',
    /SERVED/.test(msg) && /signableFromRefusalRow/.test(msg), msg.slice(0, 100));
  a('...rather than the rc.21 answer, "no agentId"', !/no agentId/.test(msg));
  a('isRefusalRow: served row', isRefusalRow(r) === true);
  a('isRefusalRow: store record', isRefusalRow(store[0].r) === false);
  a('isRefusalRow: not an object', isRefusalRow('{}') === false && isRefusalRow(null) === false);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log(failures.map((f) => `  - ${f}`).join('\n')); process.exit(1); }
