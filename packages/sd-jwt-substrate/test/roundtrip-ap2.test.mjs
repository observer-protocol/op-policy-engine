// THE INTEROP GATE: round-trip against the AP2 reference SDK (Python
// MandateClient), both directions. This is the honest proof that our tokens
// are AP2-valid — self-consistency (substrate.test.mjs) is not.
//
// Requires the oracle env (set by the runner):
//   AP2_PY        path to a python with jwcrypto/pydantic/sd-jwt installed
//   AP2_SDK_PATH  path to ap2-ref/code/sdk/python
// Skips loudly when absent so `npm test` stays hermetic; run explicitly for
// the gate.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateES256KeyPair, issueAp2MandateToken, verifyAp2MandateToken } from '../dist/index.mjs';

const AP2_PY = process.env.AP2_PY;
const AP2_SDK_PATH = process.env.AP2_SDK_PATH;
const oracleReady = Boolean(AP2_PY && AP2_SDK_PATH);
const helper = join(dirname(fileURLToPath(import.meta.url)), 'rt_helper.py');

function oracle(req) {
  const res = spawnSync(AP2_PY, [helper], {
    input: JSON.stringify(req),
    encoding: 'utf8',
    env: { ...process.env, PYTHONPATH: AP2_SDK_PATH },
    timeout: 60_000,
  });
  if (res.status !== 0) throw new Error(`oracle exited ${res.status}: ${res.stderr}`);
  return JSON.parse(res.stdout.trim().split('\n').at(-1));
}

test('direction A: OUR issued mandate verifies in the AP2 reference SDK', { skip: !oracleReady && 'AP2_PY/AP2_SDK_PATH not set — interop gate not run' }, async () => {
  const issuer = await generateES256KeyPair();
  const agent = await generateES256KeyPair();
  const token = await issueAp2MandateToken({
    mandate: {
      vct: 'mandate.payment.open.1',
      constraints: [
        { type: 'payment.amount_range', currency: 'USD', max: 5000 },
        { type: 'payment.reference', conditional_transaction_id: 'occ-digest' },
      ],
      cnf: { jwk: agent.publicJwk },
    },
    issuerPrivateJwk: issuer.privateJwk,
    kid: issuer.kid,
  });
  const { d: _d, ...issuerPub } = issuer.privateJwk;
  const r = oracle({ mode: 'verify', token, issuer_public_jwk: issuerPub });
  assert.equal(r.ok, true, `AP2 SDK rejected our token: ${r.error}`);
  const flat = JSON.stringify(r.payloads);
  assert.match(flat, /mandate\.payment\.open\.1/, 'verified payloads must carry our vct');
  assert.match(flat, /payment\.amount_range/, 'verified payloads must carry our constraints');
});

test('direction B: an AP2-SDK-created mandate verifies in OUR substrate', { skip: !oracleReady && 'AP2_PY/AP2_SDK_PATH not set — interop gate not run' }, async () => {
  const issuer = await generateES256KeyPair();
  const agent = await generateES256KeyPair();
  const { d: _d, ...agentPub } = agent.privateJwk;
  const created = oracle({
    mode: 'create',
    issuer_private_jwk: issuer.privateJwk,
    agent_public_jwk: agentPub,
    constraints: [],
  });
  assert.equal(created.ok, true, `AP2 SDK create failed: ${created.error}`);

  const { d: _d2, ...issuerPub } = issuer.privateJwk;
  const r = await verifyAp2MandateToken(created.token, issuerPub);
  assert.equal(r.ok, true, r.ok ? '' : r.reason);
  assert.equal(r.mandate.vct, 'mandate.payment.open.1');
  assert.deepEqual(r.mandate.cnf, { jwk: agentPub }, 'agent cnf must survive the round-trip');

  // fail side: same token, wrong issuer key
  const stranger = await generateES256KeyPair();
  const bad = await verifyAp2MandateToken(created.token, stranger.publicJwk);
  assert.equal(bad.ok, false, 'wrong issuer key must not verify');
});
