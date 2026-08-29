#!/usr/bin/env node
/**
 * POPULATION PARAMETERS
 * count: 8
 * seed: enumerated-not-random
 * cases: 8 named rows (not a generated cross-product count)
 * notice.recall.stance: always "not_guaranteed"
 * notice.refund.stance: always "not_guaranteed"
 * notice.loss.stance: always "sender_responsible_if_completed"
 * notice.citations.psr_app: never supplied (WIRED absence)
 * notice.redirects_to_card_fraud_article: always true (the page points away; that page is not encoded)
 *
 * SYNTHETIC. REPOSITORY-INTERNAL. Not a finding about Wise.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash, createPrivateKey, sign as cryptoSign } from 'node:crypto';
import { interpret, loadRegister, RECORD_VERSION } from '../_interpreter/interpret.mjs';
import { parametersFromGeneratorHeader, populationOf } from './figure.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const sha = (s) => createHash('sha256').update(s).digest('hex');

function jcs(value) {
  if (value === null || typeof value !== 'object') {
    if (value === undefined) throw new Error('JCS: undefined');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map((v) => jcs(v === undefined ? null : v)).join(',') + ']';
  return '{' + Object.keys(value).sort().filter((k) => value[k] !== undefined).map((k) => JSON.stringify(k) + ':' + jcs(value[k])).join(',') + '}';
}

const R = loadRegister(`${HERE}register.json`);
const registerBytes = readFileSync(`${HERE}register.json`);
const live = parametersFromGeneratorHeader(HERE);

const CASES = [
  { id: 'WISE-SYN-2026-0001', name: 'authorised scam, web form and police', authorised: true, card: false, account: false, web: true, app: undefined, police: true, contact: undefined },
  { id: 'WISE-SYN-2026-0002', name: 'authorised scam, app and police', authorised: true, card: false, account: false, web: undefined, app: true, police: true, contact: undefined },
  { id: 'WISE-SYN-2026-0003', name: 'authorised scam, web form only', authorised: true, card: false, account: false, web: true, app: undefined, police: undefined, contact: undefined },
  { id: 'WISE-SYN-2026-0004', name: 'authorised scam, neither report', authorised: true, card: false, account: false, web: undefined, app: undefined, police: undefined, contact: undefined },
  { id: 'WISE-SYN-2026-0005', name: 'card without permission (redirect, page not encoded)', authorised: false, card: true, account: false, web: undefined, app: undefined, police: undefined, contact: undefined },
  { id: 'WISE-SYN-2026-0006', name: 'account without permission, contacted', authorised: false, card: false, account: true, web: undefined, app: undefined, police: undefined, contact: '2026-08-29T12:00:00Z' },
  { id: 'WISE-SYN-2026-0007', name: 'account without permission, not contacted', authorised: false, card: false, account: true, web: undefined, app: undefined, police: undefined, contact: undefined },
  { id: 'WISE-SYN-2026-0008', name: 'authorised scam, both Wise channels, no police', authorised: true, card: false, account: false, web: true, app: true, police: undefined, contact: undefined },
];
if (CASES.length !== 8) throw new Error('population count is the CASE list length; do not invent it');

const key = JSON.parse(readFileSync(`${HERE}source/synthetic-ed25519.json`, 'utf8'));
const priv = createPrivateKey({ key: Buffer.from(key.privateKeyPkcs8DerHex, 'hex'), format: 'der', type: 'pkcs8' });

function factsOf(c) {
  return {
    payment: {
      authorised_to_scammer: c.authorised,
      card_without_permission: c.card,
      account_without_permission: c.account,
    },
    notice: {
      recall: { stance: 'not_guaranteed' },
      refund: { stance: 'not_guaranteed' },
      loss: { stance: 'sender_responsible_if_completed' },
      redirects_to_card_fraud_article: true,
    },
    report: { wise_web_form: c.web, wise_app: c.app, police: c.police },
    contact: { immediate: c.contact },
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
    payloadType: 'op.policy.determination.wise-help-2978048.v1',
    recordVersion: RECORD_VERSION,
    synthetic: true,
    $label: 'SYNTHETIC',
    $not_a_finding_about: 'Wise',
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

const detDoc = { $label: 'SYNTHETIC', $not_a_finding_about: 'Wise', population, determinations };
writeFileSync(`${HERE}out/determinations.json`, JSON.stringify(detDoc, null, 1) + '\n');
writeFileSync(`${HERE}out/records/INDEX.json`, JSON.stringify({
  $note: 'SYNTHETIC signed sample records. REPOSITORY-INTERNAL. Not a finding about Wise.',
  recordVersion: RECORD_VERSION,
  register_sha256: sha(registerBytes),
  population,
  artifacts: index,
}, null, 1) + '\n');
populationOf(detDoc, HERE);
console.log(`wrote ${CASES.length}/${CASES.length} SYNTHETIC determinations; register sha256 ${sha(registerBytes).slice(0, 12)}`);
