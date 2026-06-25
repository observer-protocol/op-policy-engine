// Standalone fixture generator for the @observer-protocol/policy-engine test suite.
// Produces credentials and config covering all four universal rule categories:
// credentialIntegrity, amountLimits, counterparty, failClosed.
//
// All keys are generated fresh. Nothing here derives from production credentials.
// The test rail is synthetic ('test:1') with TUNIT (decimals=0).
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  newIssuerKeys, signEddsaJcs2022, makeDidDocument, makeStatusList,
} from './lib.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'cache'), { recursive: true });

// ── Issuer identity ───────────────────────────────────────────────────────────
const ISSUER = 'did:web:issuer.example';
const AGENT = 'did:web:issuer.example:agents:test-agent';
const MERCHANT_ADDR = '0xA11CE00000000000000000000000000000000001';
const OTHER_ADDR   = '0xB0B0000000000000000000000000000000000002';
const BLOCKED_ADDR = '0xBAD0000000000000000000000000000000000003';
const SCHEMA_URL   = 'https://observerprotocol.org/schemas/delegation/v2.1.json';
const STATUS_URL   = 'https://issuer.example/status/1';

const key1 = newIssuerKeys();  // assertionMethod-valid
const key2 = newIssuerKeys();  // present but NOT in assertionMethod
const evilKey = newIssuerKeys(); // completely separate issuer

const didDoc = makeDidDocument(ISSUER, [
  { fragment: 'key-1', multikey: key1.multikey, assertion: true },
  { fragment: 'key-2', multikey: key2.multikey, assertion: false },
]);
writeFileSync(join(OUT, 'issuer-did.json'), JSON.stringify(didDoc, null, 2));

const EVIL_ISSUER = 'did:web:evil.example';
const evilDidDoc = makeDidDocument(EVIL_ISSUER, [
  { fragment: 'key-1', multikey: evilKey.multikey, assertion: true },
]);
writeFileSync(join(OUT, 'evil-did.json'), JSON.stringify(evilDidDoc, null, 2));

const VM1 = `${ISSUER}#key-1`;
const VM2 = `${ISSUER}#key-2`;

const statusClean = makeStatusList({ issuer: ISSUER, privateKey: key1.privateKey, verificationMethod: VM1, setBits: [], url: STATUS_URL });
const statusRevoked = makeStatusList({ issuer: ISSUER, privateKey: key1.privateKey, verificationMethod: VM1, setBits: [7], url: STATUS_URL });
writeFileSync(join(OUT, 'status-clean.json'), JSON.stringify(statusClean, null, 2));
writeFileSync(join(OUT, 'status-revoked.json'), JSON.stringify(statusRevoked, null, 2));

// ── Base credential builder ───────────────────────────────────────────────────
function base(overrides = {}) {
  const { subject = {}, top = {} } = overrides;
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    id: `urn:uuid:${crypto.randomUUID()}`,
    type: ['VerifiableCredential', 'ObserverDelegationCredential'],
    issuer: ISSUER,
    validFrom: '2026-01-01T00:00:00Z',
    validUntil: '2027-01-01T00:00:00Z',
    credentialSchema: { id: SCHEMA_URL, type: 'JsonSchema' },
    credentialStatus: [{ id: `${STATUS_URL}#7`, type: 'BitstringStatusListEntry', statusPurpose: 'revocation', statusListIndex: '7', statusListCredential: STATUS_URL }],
    ...top,
    credentialSubject: {
      id: AGENT,
      authorizationLevel: 'policy',
      authorizationConfig: { policy: { policy_id: 'pe-test-001', rail_preference: ['test-rail'] } },
      actionScope: { allowed_rails: ['test-rail', 'test:1'], per_transaction_ceiling: { amount: '100', currency: 'TUNIT' } },
      delegationScope: { may_delegate_further: false },
      enforcementMode: 'pre_transaction_check',
      tradingMandate: { maxNotionalPerOrder: 100, unit: 'TUNIT', counterparty: { blockList: [BLOCKED_ADDR] } },
      ...subject,
    },
  };
}

const sign = (cred, k = key1.privateKey, vm = VM1) => signEddsaJcs2022(cred, k, vm);

// ── Credential variants ───────────────────────────────────────────────────────
const credentials = {};

// credentialIntegrity: valid baseline
credentials['valid'] = sign(base());

// credentialIntegrity: expired
credentials['expired'] = sign(base({ top: { validUntil: '2026-01-02T00:00:00Z' } }));

// credentialIntegrity: not-yet-valid
credentials['not-yet-valid'] = sign(base({ top: { validFrom: '2026-12-31T00:00:00Z' } }));

// credentialIntegrity: tampered (valid signature, then mutate a field)
const tampered = JSON.parse(JSON.stringify(credentials['valid']));
tampered.credentialSubject.tradingMandate.maxNotionalPerOrder = 999999;
credentials['tampered'] = tampered;

// credentialIntegrity: legacy proof suite
const legacy = JSON.parse(JSON.stringify(credentials['valid']));
legacy.proof = { type: 'Ed25519Signature2026', created: '2026-06-01T00:00:00Z', verificationMethod: VM1, proofPurpose: 'assertionMethod', proofValue: legacy.proof.proofValue.slice(1) };
credentials['legacy-suite'] = legacy;

// credentialIntegrity: wrong issuer
const wrongIssuerCred = base(); wrongIssuerCred.issuer = EVIL_ISSUER;
credentials['wrong-issuer'] = signEddsaJcs2022(wrongIssuerCred, evilKey.privateKey, `${EVIL_ISSUER}#key-1`);

// credentialIntegrity: schema not in allowlist
credentials['bad-schema'] = sign(base({ top: { credentialSchema: { id: 'https://observerprotocol.org/schemas/delegation/v2.json', type: 'JsonSchema' } } }));

// credentialIntegrity: signed with key2 (not in assertionMethod)
credentials['key2-signed'] = sign(base(), key2.privateKey, VM2);

// credentialIntegrity: no credentialStatus (noted, not fatal)
credentials['no-status'] = sign((() => { const c = base(); delete c.credentialStatus; return c; })());

// amountLimits: wide ceiling (allow large amounts) — override actionScope to clear the 100-TUNIT base ceiling
credentials['wide-ceiling'] = sign(base({ subject: {
  actionScope: { allowed_rails: ['test-rail', 'test:1'] },    // no per_transaction_ceiling
  tradingMandate: { maxNotionalPerOrder: 1000, unit: 'TUNIT' }, // wide mandate ceiling
} }));

// failClosed: no binding amount/counterparty constraints (identity-only mandate)
credentials['no-constraint'] = sign(base({ subject: {
  actionScope: { allowed_rails: ['test-rail', 'test:1'] },
  tradingMandate: undefined,
} }));

// amountLimits: currency mismatch (same-currency invariant)
credentials['wrong-currency'] = sign(base({ subject: { actionScope: { allowed_rails: ['test-rail', 'test:1'], per_transaction_ceiling: { amount: '100', currency: 'OUNIT' } }, tradingMandate: undefined } }));

// counterparty: allowList
credentials['allowlist'] = sign(base({ subject: { tradingMandate: { maxNotionalPerOrder: 100, unit: 'TUNIT', counterparty: { allowList: [MERCHANT_ADDR, OTHER_ADDR] } } } }));

// counterparty: requireIssuerClassIn (fail-closed)
credentials['require-issuer-class'] = sign(base({ subject: { tradingMandate: { counterparty: { requireIssuerClassIn: ['op_first_party'] } } } }));

// velocity: dailyVolumeCap
credentials['velocity'] = sign(base({ subject: { tradingMandate: { unit: 'TUNIT', velocity: { dailyVolumeCap: 200 }, maxNotionalPerOrder: 100 } } }));

// temporal: allowedTimeWindows
credentials['temporal'] = sign(base({ subject: { tradingMandate: { temporal: { allowedTimeWindows: [{ start: '09:00', end: '17:00', timezone: 'UTC' }] } } } }));

// geographic: allowedJurisdictionsOnly (fail-closed)
credentials['geo-allow-only'] = sign(base({ subject: { tradingMandate: { geographic: { allowedJurisdictionsOnly: ['US'] } } } }));

for (const [name, cred] of Object.entries(credentials)) {
  writeFileSync(join(OUT, `cred-${name}.json`), JSON.stringify(cred, null, 2));
}

// ── Config export ─────────────────────────────────────────────────────────────
// Write a config template tests can import and customize
const configTemplate = {
  credentialPath: join(OUT, 'cred-valid.json'),
  issuerDid: ISSUER,
  schemaAllowlist: [SCHEMA_URL],
  agentDid: AGENT,
  rails: { 'test:1': { rail: 'test-rail', currency: 'TUNIT', decimals: 0, family: 'other' } },
  revocation: { maxStalenessHours: 24, onUnreachable: 'cache-then-deny', fetchTimeoutMs: 1500 },
  didCache: { maxStalenessHours: 24 },
  cacheDir: join(OUT, 'cache'),
  auditLog: join(OUT, 'audit.jsonl'),
  offline: { didDocumentPath: join(OUT, 'issuer-did.json'), statusListPath: join(OUT, 'status-clean.json') },
};
writeFileSync(join(OUT, 'config.json'), JSON.stringify({ configTemplate, ISSUER, AGENT, MERCHANT_ADDR, OTHER_ADDR, BLOCKED_ADDR, SCHEMA_URL }, null, 2));

console.log(`fixtures written: ${Object.keys(credentials).length} credentials → ${OUT}`);
