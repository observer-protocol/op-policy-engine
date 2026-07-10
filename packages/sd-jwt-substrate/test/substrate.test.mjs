// Substrate acceptance: RFC 9901 SD-JWT VC round-trips in the AP2 profile
// (ES256, sha-256, cnf key binding), pass AND fail sides per surface.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateES256KeyPair,
  issueSdJwtVc,
  presentSdJwtVc,
  verifySdJwtVc,
  AP2_VCT,
} from '../dist/index.mjs';

const ISS = 'https://observerprotocol.org';

async function issuerAndHolder() {
  const issuer = await generateES256KeyPair();
  const holder = await generateES256KeyPair();
  const trust = (jwk) => (iss) => (iss === ISS ? jwk : undefined);
  return { issuer, holder, trust };
}

test('round-trip: issue -> verify (issuer signature, vct, window)', async () => {
  const { issuer, trust } = await issuerAndHolder();
  const token = await issueSdJwtVc({
    payload: { iss: ISS, vct: AP2_VCT.payment, transaction_id: 'txhash', payee: { id: 'm1', name: 'Merchant' }, payment_amount: { amount: 250, currency: 'USD' }, payment_instrument: { id: 'pi1', type: 'card' }, iat: Math.floor(Date.now() / 1000) },
    issuerPrivateJwk: issuer.privateJwk,
    kid: issuer.kid,
  });
  const r = await verifySdJwtVc({ token, resolveIssuerJwk: trust(issuer.publicJwk), expectedVct: AP2_VCT.payment });
  assert.equal(r.ok, true, r.ok ? '' : r.reason);
  assert.equal(r.payload.transaction_id, 'txhash');
  assert.equal(r.payload.payment_amount.amount, 250);
});

test('selective disclosure: undisclosed claims are absent, disclosed present', async () => {
  const { issuer, trust } = await issuerAndHolder();
  const token = await issueSdJwtVc({
    payload: { iss: ISS, vct: AP2_VCT.payment, transaction_id: 't', payee: { id: 'm1', name: 'M' }, payment_amount: { amount: 1, currency: 'USD' }, payment_instrument: { id: 'p', type: 'card' }, risk_data: { score: 12 } },
    disclosureFrame: { _sd: ['risk_data', 'payment_instrument'] },
    issuerPrivateJwk: issuer.privateJwk,
  });
  // present only payment_instrument; risk_data stays undisclosed
  const presented = await presentSdJwtVc({ token, presentationFrame: { payment_instrument: true } });
  const r = await verifySdJwtVc({ token: presented, resolveIssuerJwk: trust(issuer.publicJwk) });
  assert.equal(r.ok, true, r.ok ? '' : r.reason);
  assert.deepEqual(r.payload.payment_instrument, { id: 'p', type: 'card' });
  assert.equal(r.payload.risk_data, undefined, 'undisclosed claim must be absent');
});

test('cnf key binding: holder PoP verifies with exact aud+nonce', async () => {
  const { issuer, holder, trust } = await issuerAndHolder();
  const { d: _d, ...holderPub } = holder.privateJwk;
  const token = await issueSdJwtVc({
    payload: { iss: ISS, vct: AP2_VCT.paymentOpen, cnf: { jwk: holderPub }, constraints: [{ type: 'payment.reference', conditional_transaction_id: 'occhash' }, { type: 'payment.amount_range', currency: 'USD', max: 5000 }] },
    issuerPrivateJwk: issuer.privateJwk,
  });
  const presented = await presentSdJwtVc({ token, holderPrivateJwk: holder.privateJwk, kb: { aud: 'verifier.example', nonce: 'n-123' } });
  const r = await verifySdJwtVc({ token: presented, resolveIssuerJwk: trust(issuer.publicJwk), expectedVct: AP2_VCT.paymentOpen, requireKeyBinding: { aud: 'verifier.example', nonce: 'n-123' } });
  assert.equal(r.ok, true, r.ok ? '' : r.reason);
  assert.equal(r.kb.nonce, 'n-123');
});

test('fail-closed: KB-JWT signed by the WRONG holder key is rejected', async () => {
  const { issuer, holder, trust } = await issuerAndHolder();
  const mallory = await generateES256KeyPair();
  const { d: _d, ...holderPub } = holder.privateJwk;
  const token = await issueSdJwtVc({
    payload: { iss: ISS, vct: AP2_VCT.paymentOpen, cnf: { jwk: holderPub }, constraints: [] },
    issuerPrivateJwk: issuer.privateJwk,
  });
  const presented = await presentSdJwtVc({ token, holderPrivateJwk: mallory.privateJwk, kb: { aud: 'v', nonce: 'n' } });
  const r = await verifySdJwtVc({ token: presented, resolveIssuerJwk: trust(issuer.publicJwk), requireKeyBinding: { aud: 'v', nonce: 'n' } });
  assert.equal(r.ok, false);
});

test('fail-closed: wrong aud and wrong nonce are each rejected', async () => {
  const { issuer, holder, trust } = await issuerAndHolder();
  const { d: _d, ...holderPub } = holder.privateJwk;
  const token = await issueSdJwtVc({ payload: { iss: ISS, vct: AP2_VCT.paymentOpen, cnf: { jwk: holderPub }, constraints: [] }, issuerPrivateJwk: issuer.privateJwk });
  const presented = await presentSdJwtVc({ token, holderPrivateJwk: holder.privateJwk, kb: { aud: 'v', nonce: 'n' } });
  const wrongAud = await verifySdJwtVc({ token: presented, resolveIssuerJwk: trust(issuer.publicJwk), requireKeyBinding: { aud: 'OTHER', nonce: 'n' } });
  assert.equal(wrongAud.ok, false);
  assert.match(wrongAud.reason, /aud/);
  const wrongNonce = await verifySdJwtVc({ token: presented, resolveIssuerJwk: trust(issuer.publicJwk), requireKeyBinding: { aud: 'v', nonce: 'REPLAY' } });
  assert.equal(wrongNonce.ok, false);
  assert.match(wrongNonce.reason, /nonce/);
});

test('fail-closed: tampered disclosure breaks verification', async () => {
  const { issuer, trust } = await issuerAndHolder();
  const token = await issueSdJwtVc({
    payload: { iss: ISS, vct: AP2_VCT.payment, transaction_id: 't', payee: { id: 'm', name: 'M' }, payment_amount: { amount: 100, currency: 'USD' }, payment_instrument: { id: 'p', type: 'card' } },
    disclosureFrame: { _sd: ['payment_amount'] },
    issuerPrivateJwk: issuer.privateJwk,
  });
  const parts = token.split('~');
  // decode disclosure [salt, name, value], inflate the amount, re-encode
  const disc = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  disc[2] = { amount: 999999, currency: 'USD' };
  parts[1] = Buffer.from(JSON.stringify(disc), 'utf8').toString('base64url');
  const r = await verifySdJwtVc({ token: parts.join('~'), resolveIssuerJwk: trust(issuer.publicJwk) });
  assert.equal(r.ok, false, 'tampered disclosure must not verify');
  assert.match(r.reason, /not referenced by any _sd digest/, 'rejection must name the unmatched disclosure');
});

test('fail-closed: untrusted issuer (resolver refuses) and wrong issuer key', async () => {
  const { issuer, trust } = await issuerAndHolder();
  const other = await generateES256KeyPair();
  const token = await issueSdJwtVc({ payload: { iss: ISS, vct: AP2_VCT.payment, transaction_id: 't', payee: { id: 'm', name: 'M' }, payment_amount: { amount: 1, currency: 'USD' }, payment_instrument: { id: 'p', type: 'c' } }, issuerPrivateJwk: issuer.privateJwk });
  const refused = await verifySdJwtVc({ token, resolveIssuerJwk: () => undefined });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /not trusted/);
  const wrongKey = await verifySdJwtVc({ token, resolveIssuerJwk: trust(other.publicJwk) });
  assert.equal(wrongKey.ok, false);
});

test('fail-closed: expired token and vct mismatch', async () => {
  const { issuer, trust } = await issuerAndHolder();
  const expired = await issueSdJwtVc({ payload: { iss: ISS, vct: AP2_VCT.payment, transaction_id: 't', payee: { id: 'm', name: 'M' }, payment_amount: { amount: 1, currency: 'USD' }, payment_instrument: { id: 'p', type: 'c' }, exp: 1000 }, issuerPrivateJwk: issuer.privateJwk });
  const r1 = await verifySdJwtVc({ token: expired, resolveIssuerJwk: trust(issuer.publicJwk) });
  assert.equal(r1.ok, false);
  assert.match(r1.reason, /expired/);
  const ok = await issueSdJwtVc({ payload: { iss: ISS, vct: AP2_VCT.checkout, checkout_jwt: 'x', checkout_hash: 'y' }, issuerPrivateJwk: issuer.privateJwk });
  const r2 = await verifySdJwtVc({ token: ok, resolveIssuerJwk: trust(issuer.publicJwk), expectedVct: AP2_VCT.payment });
  assert.equal(r2.ok, false);
  assert.match(r2.reason, /vct/);
});

test('fail-closed: non-ES256 alg is rejected before any trust decision', async () => {
  // hand-build a none-alg lookalike
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'vc+sd-jwt' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: ISS, vct: AP2_VCT.payment })).toString('base64url');
  const r = await verifySdJwtVc({ token: `${header}.${payload}.`, resolveIssuerJwk: () => { throw new Error('resolver must not be called for a rejected alg'); } });
  assert.equal(r.ok, false);
  assert.match(r.reason, /ES256/);
});
