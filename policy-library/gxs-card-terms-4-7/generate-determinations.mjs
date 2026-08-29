#!/usr/bin/env node
/**
 * POPULATION PARAMETERS
 * count: 6
 * seed: enumerated-not-random
 * cases: informed×path (2×3), notice-level facts fixed
 * informed: [set, unset]
 * help path: [all four steps, none, partial]
 * notice.credit.stance: always "may" (the verb on the page)
 * notice.citations.srf: never supplied (WIRED absence)
 *
 * SYNTHETIC. REPOSITORY-INTERNAL. Not a finding about GXS.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash, createPrivateKey, sign as cryptoSign, createPublicKey } from 'node:crypto';
import { interpret, loadRegister, RECORD_VERSION } from '../_interpreter/interpret.mjs';
import { parametersFromGeneratorHeader, populationOf } from './figure.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const sha = (s) => createHash('sha256').update(typeof s === 'string' ? s : s).digest('hex');

function jcs(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('JCS: non-finite');
    if (value === undefined) throw new Error('JCS: undefined');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map((v) => jcs(v === undefined ? null : v)).join(',') + ']';
  const keys = Object.keys(value).sort();
  const parts = [];
  for (const k of keys) {
    if (value[k] === undefined) continue;
    parts.push(JSON.stringify(k) + ':' + jcs(value[k]));
  }
  return '{' + parts.join(',') + '}';
}

const R = loadRegister(`${HERE}register.json`);
const registerBytes = readFileSync(`${HERE}register.json`);
const live = parametersFromGeneratorHeader(HERE);

const CASES = [
  { id: 'GXS-SYN-2026-0001', name: 'informed, full in-app path', informed_at: '2026-08-29T12:00:00Z', path: [true, true, true, true] },
  { id: 'GXS-SYN-2026-0002', name: 'informed, no in-app path', informed_at: '2026-08-29T12:00:00Z', path: [undefined, undefined, undefined, undefined] },
  { id: 'GXS-SYN-2026-0003', name: 'informed, partial in-app path', informed_at: '2026-08-29T12:00:00Z', path: [true, true, undefined, undefined] },
  { id: 'GXS-SYN-2026-0004', name: 'not informed, full in-app path', informed_at: undefined, path: [true, true, true, true] },
  { id: 'GXS-SYN-2026-0005', name: 'not informed, no in-app path', informed_at: undefined, path: [undefined, undefined, undefined, undefined] },
  { id: 'GXS-SYN-2026-0006', name: 'not informed, partial in-app path', informed_at: undefined, path: [true, undefined, true, undefined] },
];
if (CASES.length !== 6) throw new Error('population count is the CASE list length; do not invent it');

const key = JSON.parse(readFileSync(`${HERE}source/synthetic-ed25519.json`, 'utf8'));
const priv = createPrivateKey({ key: Buffer.from(key.privateKeyPkcs8DerHex, 'hex'), format: 'der', type: 'pkcs8' });
const pub = createPublicKey({ key: Buffer.from(key.publicKeySpkiDerHex, 'hex'), format: 'der', type: 'spki' });

function factsOf(c) {
  return {
    notice: { credit: { stance: 'may' } },
    dispute: { informed_at: c.informed_at },
    help: {
      path: {
        flexicredit_tile: c.path[0],
        specific_transaction: c.path[1],
        get_help: c.path[2],
        raising_card_transaction_dispute: c.path[3],
      },
    },
  };
}

const population = {
  count: CASES.length,
  seed: 'enumerated-not-random',
  parameters_text: live.text,
  parameters_sha256: live.sha256,
  $generator_label: 'generate-determinations.mjs',
};

mkdirSync(`${HERE}out/records`, { recursive: true });
const determinations = [];
const index = [];

for (const c of CASES) {
  const facts = factsOf(c);
  const records = interpret(R, facts, {});
  const payload = {
    payloadType: 'op.policy.determination.gxs-card-terms-4-7.v1',
    recordVersion: RECORD_VERSION,
    synthetic: true,
    $label: 'SYNTHETIC',
    $not_a_finding_about: 'GXS',
    register: { domain: R.domain, version: R.register_version, sha256: sha(registerBytes) },
    source: R.source,
    claimId: c.id,
    scenario: c.name,
    facts,
    records,
  };
  const digest = sha(jcs(payload));
  const signature = cryptoSign(null, Buffer.from(digest, 'hex'), priv).toString('hex');
  const artifact = {
    ...payload,
    signature: {
      state: 'signed',
      alg: 'Ed25519',
      over: 'sha256(jcs(payload without signature))',
      digest,
      publicKeySpkiDerHex: key.publicKeySpkiDerHex,
      value: signature,
      $label: 'SYNTHETIC',
    },
  };
  const bytes = JSON.stringify(artifact, null, 1) + '\n';
  writeFileSync(`${HERE}out/records/${c.id}.json`, bytes);
  determinations.push({ id: c.id, scenario: c.name, facts, records });
  index.push({ claimId: c.id, scenario: c.name, sha256: sha(bytes), signature_digest: digest });
}

const detDoc = {
  $label: 'SYNTHETIC',
  $not_a_finding_about: 'GXS',
  population,
  determinations,
};
writeFileSync(`${HERE}out/determinations.json`, JSON.stringify(detDoc, null, 1) + '\n');
writeFileSync(`${HERE}out/records/INDEX.json`, JSON.stringify({
  $note: 'SYNTHETIC signed sample records. REPOSITORY-INTERNAL. Not a finding about GXS.',
  recordVersion: RECORD_VERSION,
  register_sha256: sha(registerBytes),
  population,
  artifacts: index,
}, null, 1) + '\n');

populationOf(detDoc, HERE);
console.log(`wrote ${CASES.length}/${CASES.length} SYNTHETIC determinations; register sha256 ${sha(registerBytes).slice(0, 12)}`);
void pub;
