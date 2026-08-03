#!/usr/bin/env node
/**
 * Verify a real, published Observer Protocol delegation credential — offline.
 *
 * Fetches the credential and resolves everything it references over plain public HTTPS. No API key,
 * no bearer token, no call to any Observer endpoint that could refuse you.
 *
 *   npm install @observer-protocol/policy-engine
 *   node verify.mjs
 *
 * Exit code is 0 if the verdict was produced, 1 if the engine could not reach a verdict at all.
 * A DENY is a successful run: the point is to get a truthful answer, not a positive one.
 */
import { verifyCredentialObject } from '@observer-protocol/policy-engine';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CREDENTIAL_URL = 'https://observerprotocol.org/credentials/maxi-0001-trading-mandate.json';
// PINNED, NOT READ FROM THE CREDENTIAL. A verifier that trusts whoever the credential names as its
// issuer is not verifying anything — it is agreeing. This credential is issued by Bitcoin
// Singularity, not by Observer Protocol, which is a thing you only find out by pinning and being
// told you were wrong. The hosted verifier allowlists both DIDs for the same reason.
const ISSUER_DID = 'did:web:bitcoinsingularity.ai';

// The schema versions this deployment accepts. Same list the hosted verifier reports at
// https://verify.observerprotocol.org/health — kept explicit here rather than fetched, because a
// verifier that asks the thing it is verifying which schemas to trust is not verifying anything.
const SCHEMA_ALLOWLIST = [
  'https://observerprotocol.org/schemas/delegation/v2.1.json',
  'https://observerprotocol.org/schemas/delegation/v2.2.json',
  'https://observerprotocol.org/schemas/delegation/v2.3.json',
  'https://observerprotocol.org/schemas/delegation/v2.4.json',
  'https://observerprotocol.org/schemas/delegation/v2.5.json',
  'https://observerprotocol.org/schemas/delegation/v2.6.json',
];

const scratch = mkdtempSync(join(tmpdir(), 'op-verify-'));

/** @type {import('@observer-protocol/policy-engine').VerifierConfig} */
const config = {
  credentialPath: CREDENTIAL_URL,   // provenance label; the object is passed in directly below
  issuerDid: ISSUER_DID,
  schemaAllowlist: SCHEMA_ALLOWLIST,
  revocation: {
    maxStalenessHours: 24,
    // The only accepted value. If the status list cannot be reached, a cached answer is used and
    // then the payment is DENIED — never allowed through on a fetch failure.
    onUnreachable: 'cache-then-deny',
    fetchTimeoutMs: 5000,
  },
  didCache: { maxStalenessHours: 24 },
  cacheDir: scratch,
  auditLog: join(scratch, 'audit.log'),
  rails: {},
  allowContractCalls: false,
};

const res = await fetch(CREDENTIAL_URL);
if (!res.ok) {
  console.error(`Could not fetch the credential: HTTP ${res.status}`);
  process.exit(1);
}
const credential = await res.json();

console.log(`credential  ${CREDENTIAL_URL}`);
console.log(`issuer      ${credential.issuer?.id ?? credential.issuer}`);
console.log(`subject     ${credential.credentialSubject?.id}`);
console.log(`schema      ${credential.credentialSchema?.id ?? '(none cited)'}`);
console.log('');

const verdict = await verifyCredentialObject(credential, config, Date.now());

console.log(`ALLOW       ${verdict.allow}`);
console.log(`reason      ${verdict.reason}`);
if (verdict.notes?.length) for (const n of verdict.notes) console.log(`note        ${n}`);
if (verdict.checks) {
  console.log('checks');
  for (const [k, v] of Object.entries(verdict.checks)) {
    console.log(`  ${k.padEnd(22)} ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  }
}
console.log('');
console.log(verdict.allow
  ? 'Verified. Nothing above asked Observer Protocol for permission.'
  : 'Denied, and that is a real answer — the engine fails closed rather than passing on doubt.');

// ─── OPTIONAL CROSS-CHECK, AND THE WHOLE POINT OF PUBLISHING THE ENGINE ────────────────────────
//
// Ask the hosted verifier the same question and compare. If the two disagree, the offline answer is
// the one to trust: it is the one you ran. Skipped with SKIP_HOSTED=1, and a network failure here is
// not a verification failure — the verdict above already stands on its own.
if (!process.env.SKIP_HOSTED) {
  try {
    const r = await fetch('https://verify.observerprotocol.org/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentDid: credential.credentialSubject?.id, mandate: credential }),
      signal: AbortSignal.timeout(15000),
    });
    const hosted = await r.json();
    const hostedValid = hosted?.mandate?.valid;
    const hostedReason = hosted?.mandate?.reason ?? '(none)';
    console.log('');
    console.log('cross-check against verify.observerprotocol.org (no token required)');
    console.log(`  hosted ALLOW  ${hostedValid}`);
    console.log(`  hosted reason ${hostedReason}`);
    console.log(hostedValid === verdict.allow
      ? '  AGREE — the hosted endpoint reached the same verdict as the code you just ran.'
      : '  DISAGREE — trust the offline verdict; it is the one you ran. Please report this.');
  } catch (e) {
    console.log('');
    console.log(`cross-check skipped: ${e.message}`);
    console.log('  Not a verification failure. The offline verdict above needs nothing from us.');
  }
}
