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

// credentialIntegrity: credentialStatus as a bare OBJECT rather than an array.
//
// The array is canonical: delegation schemas v2.4-v2.6 all type credentialStatus
// as `type: array`, and validateStructure rejects anything else. This fixture is
// NOT schema-conformant and is not meant to be. It reproduces what the deployed
// clause-zero issuer emits (observer-protocol-api/demo_clause_zero.py), which
// reaches the revocation check through verifyCredentialCrypto — the path that
// skips validateStructure. Same status list index (7) as the base credential, so
// status-revoked.json marks THIS credential revoked too.
credentials['object-status'] = sign(base({ top: {
  credentialStatus: { id: `${STATUS_URL}#7`, type: 'BitstringStatusListEntry', statusPurpose: 'revocation', statusListIndex: '7', statusListCredential: STATUS_URL },
} }));

// credentialIntegrity: credentialStatus that is neither array nor object. Nothing
// can be checked against it, so the only correct outcome is a refusal — never the
// silent "no status entry, carry on" that a truthy non-array value used to take.
credentials['scalar-status'] = sign(base({ top: { credentialStatus: 'revoked' } }));

// Cross-rail: all four synthetic rails in allowed_rails so the same credential works on any test rail
const ALL_TEST_RAILS = ['test-rail', 'test:1', 'wdk-rail', 'test:wdk', 'mppx-rail', 'test:mppx', 'l402-rail', 'test:l402'];

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

// ── Cross-rail generalizes credentials ───────────────────────────────────────
// These credentials have allowed_rails covering all four synthetic rails so
// the same credential can be tested on wdk/mppx/l402-configured verifiers.

// velocity: daily cap 200 TUNIT, all rails
credentials['cr-velocity'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500, velocity: { dailyVolumeCap: 200 } },
} }));

// temporal: 09:00-17:00 UTC, all rails
credentials['cr-temporal'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500, temporal: { allowedTimeWindows: [{ start: '09:00', end: '17:00', timezone: 'UTC' }] } },
} }));

// counterparty: requireIssuerClassIn (fail-closed), all rails
credentials['cr-require-issuer-class'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS },
  tradingMandate: { counterparty: { requireIssuerClassIn: ['op_first_party'] } },
} }));

// geographic: allowedJurisdictionsOnly (fail-closed), all rails
credentials['cr-geo-allow-only'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500, geographic: { allowedJurisdictionsOnly: ['US'] } },
} }));

// geographic: blockedJurisdictions only (fail-open, advisory), all rails
credentials['cr-blocked-geo'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500, geographic: { blockedJurisdictions: ['IR'] } },
} }));

// ── Cross-rail rail-specific credentials ─────────────────────────────────────

// operationClassification: allowed_transaction_categories (universal via shared core)
credentials['cr-txcat-swap'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS, allowed_transaction_categories: ['swap'] },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500 },
} }));

credentials['cr-txcat-transfer'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS, allowed_transaction_categories: ['transfer'] },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500 },
} }));

// advisory-only actionScope fields (cumulative_budget, geographic_restriction)
// Note: allowed_counterparty_types is NOT advisory — it is fail-closed (unknown-rule DENY).
// Tested separately via fc-allowed-cpty-types below.
credentials['cr-advisory-fields'] = sign(base({ subject: {
  actionScope: {
    allowed_rails: ALL_TEST_RAILS,
    cumulative_budget: { amount: '1000', currency: 'TUNIT', window: '30d' },
    geographic_restriction: { type: 'advisory_only' },
  },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500 },
} }));

// fail-closed: allowed_counterparty_types is no longer advisory — it has no enforcement path,
// naming it "allowed" implies enforcement. Any mandate that sets it DENIES, tagged
// [unenforceable] rather than [unknown-rule]: the published schemas accept the property,
// so "unrecognized" would be a false statement about a schema-valid credential.
credentials['fc-allowed-cpty-types'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS, allowed_counterparty_types: ['merchant'] },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500 },
} }));

// ── Fail-closed garbage-input credentials ────────────────────────────────────

// unknown rule: unrecognized actionScope field (must deny fail-closed)
credentials['fc-unknown-scope-rule'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS, dailyLimitBypassKey: 'secret' },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500 },
} }));

// unknown rule: unrecognized tradingMandate field
credentials['fc-unknown-tm-rule'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500, agentOverride: true },
} }));

// agent-supplied grant at credential-subject level (extra field — engine must not honor it)
credentials['fc-agent-grant-cred'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 100 },
  agentApproval: true,         // injected field — must be IGNORED (not a grant)
  trustLevel: 'ultimate',      // injected field — must be IGNORED
} }));

// amountLimits: currency mismatch (same-currency invariant)
credentials['wrong-currency'] = sign(base({ subject: { actionScope: { allowed_rails: ['test-rail', 'test:1'], per_transaction_ceiling: { amount: '100', currency: 'OUNIT' } }, tradingMandate: undefined } }));

// counterparty: allowList
credentials['allowlist'] = sign(base({ subject: { tradingMandate: { maxNotionalPerOrder: 100, unit: 'TUNIT', counterparty: { allowList: [MERCHANT_ADDR, OTHER_ADDR] } } } }));

// counterparty: requireIssuerClassIn (fail-closed)
credentials['require-issuer-class'] = sign(base({ subject: { tradingMandate: { counterparty: { requireIssuerClassIn: ['op_first_party'] } } } }));

// velocity: dailyVolumeCap
credentials['velocity'] = sign(base({ subject: { tradingMandate: { unit: 'TUNIT', velocity: { dailyVolumeCap: 200 }, maxNotionalPerOrder: 100 } } }));

// velocity: BOTH caps. Daily 200, monthly 1000. The monthly cap is what the
// pre-fix engine compared against the DAILY counter, so a month's budget only
// tripped if one rolling-24h window exceeded it.
credentials['velocity-monthly'] = sign(base({ subject: { tradingMandate: { unit: 'TUNIT', velocity: { dailyVolumeCap: 100, monthlyVolumeCap: 1000 }, maxNotionalPerOrder: 100 } } }));

// Counterparty entries in the TYPED form. Both are live: the bare string must keep
// working (cr-allowlist / allowlist above) and the typed form must work alongside it.
credentials['cpty-typed'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500,
    counterparty: { allowList: [{ kind: 'address', value: MERCHANT_ADDR }] } },
} }));

// A kind the SCHEMA accepts (open vocabulary) and this ENGINE cannot match.
// Must deny, not be skipped: a skipped entry means an allowList that matched nothing.
credentials['cpty-unknown-kind'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500,
    counterparty: { allowList: [{ kind: 'merchant-descriptor', value: 'ACME SUPPLIES' }] } },
} }));

// Mixed: one matchable address plus one unrecognized kind. Must still deny, because
// the unrecognized entry means the list is not fully readable.
credentials['cpty-mixed-kind'] = sign(base({ subject: {
  actionScope: { allowed_rails: ALL_TEST_RAILS },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500,
    // NOT an MCC. A merchant category code is a CLASS, and a class in an identity
    // list would mean "any merchant in this category" while reading like a named
    // counterparty. acquirer-ref is a genuine identifier this engine cannot yet match.
    counterparty: { allowList: [MERCHANT_ADDR, { kind: 'acquirer-ref', value: 'ACQ-99182' }] } },
} }));

// authorizationConfig.policy.escalation_threshold at its OLD location. Issuable
// against v2.1/v2.3/v2.4 and, until now, a note rather than a deny.
credentials['old-escalation'] = sign(base({ subject: {
  authorizationLevel: 'policy',
  authorizationConfig: { policy: { policy_id: 'p1', rail_preference: ALL_TEST_RAILS, escalation_threshold: { amount: '50', currency: 'TUNIT' } } },
  actionScope: { allowed_rails: ALL_TEST_RAILS },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500 },
} }));

// Same shape WITHOUT the field: must still allow. The must-still-pass half.
credentials['policy-no-escalation'] = sign(base({ subject: {
  authorizationLevel: 'policy',
  authorizationConfig: { policy: { policy_id: 'p1', rail_preference: ALL_TEST_RAILS } },
  actionScope: { allowed_rails: ALL_TEST_RAILS },
  tradingMandate: { unit: 'TUNIT', maxNotionalPerOrder: 500 },
} }));

// temporal: allowedTimeWindows
credentials['temporal'] = sign(base({ subject: { tradingMandate: { temporal: { allowedTimeWindows: [{ start: '09:00', end: '17:00', timezone: 'UTC' }] } } } }));

// geographic: allowedJurisdictionsOnly (fail-closed)
credentials['geo-allow-only'] = sign(base({ subject: { tradingMandate: { geographic: { allowedJurisdictionsOnly: ['US'] } } } }));

// ── Step 3 fixtures: signer-boundary + did:key dev-mode ──────────────────────

// Agent's own key — used to sign the agent-self-issued credential.
// Proves the signer-boundary check: a mandate signed by agentDid must DENY.
const agentKey = newIssuerKeys();
const AGENT_VM = `${AGENT}#key-1`;
const agentDidDoc = makeDidDocument(AGENT, [
  { fragment: 'key-1', multikey: agentKey.multikey, assertion: true },
]);
writeFileSync(join(OUT, 'agent-did.json'), JSON.stringify(agentDidDoc, null, 2));

// Agent self-issues a credential: issuer = AGENT, signed by agentKey.
// No credentialStatus (status list is signed by ISSUER not AGENT; remove to avoid mismatch).
// With config { issuerDid: AGENT, agentDid: AGENT } this must DENY [signer-boundary].
credentials['agent-self-issued'] = signEddsaJcs2022((() => {
  const c = base();
  c.issuer = AGENT;
  delete c.credentialStatus;
  return c;
})(), agentKey.privateKey, AGENT_VM);

// did:key dev-mode: operator issues credential using a did:key principal (no OP in the loop).
// The DID document is derived in-memory from the key — no offline file or network needed.
const operatorKey = newIssuerKeys();
const OPERATOR_DID = `did:key:${operatorKey.multikey}`;
const OPERATOR_VM = `${OPERATOR_DID}#${operatorKey.multikey}`;

// No credentialStatus (would need OPERATOR-signed status list; omit for test clarity).
credentials['dev-operator'] = signEddsaJcs2022((() => {
  const c = base();
  c.issuer = OPERATOR_DID;
  delete c.credentialStatus;
  return c;
})(), operatorKey.privateKey, OPERATOR_VM);

for (const [name, cred] of Object.entries(credentials)) {
  writeFileSync(join(OUT, `cred-${name}.json`), JSON.stringify(cred, null, 2));
}

// ── Step 4 fixtures: WalletBindingCredential (WBC) ──────────────────────────
// Tests the BIND→LINK→AUTHORIZE gate in runRuntimeAdapter.
// WBCs are not ObserverDelegationCredentials, so they're written separately.

const TEST_WALLET_ADDR = '0xABCD000000000000000000000000000000001234';

// wbc-valid: OPERATOR_DID issues, binding TEST_WALLET_ADDR to itself.
// Paired with cred-dev-operator.json (mandate.issuer = OPERATOR_DID).
// LINK (dev): wbc.issuer === mandate.issuer → pass.
const wbcValid = signEddsaJcs2022({
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  id: `urn:uuid:${crypto.randomUUID()}`,
  type: ['VerifiableCredential', 'WalletBindingCredential'],
  issuer: OPERATOR_DID,
  validFrom: '2026-01-01T00:00:00Z',
  validUntil: '2027-01-01T00:00:00Z',
  credentialSubject: {
    id: OPERATOR_DID,
    walletAddress: TEST_WALLET_ADDR,
    rail: 'test-rail',
    issuanceMode: 'dev',
  },
}, operatorKey.privateKey, OPERATOR_VM);
writeFileSync(join(OUT, 'wbc-valid.json'), JSON.stringify(wbcValid, null, 2));

// wbc-mislinked: a different did:key (WRONG_OPERATOR_DID) issues the WBC.
// Paired with cred-dev-operator.json (mandate.issuer = OPERATOR_DID).
// LINK (dev): wbc.issuer (WRONG_OPERATOR_DID) !== mandate.issuer (OPERATOR_DID) → deny [issuer-linkage].
const wrongOperatorKey = newIssuerKeys();
const WRONG_OPERATOR_DID = `did:key:${wrongOperatorKey.multikey}`;
const WRONG_OPERATOR_VM = `${WRONG_OPERATOR_DID}#${wrongOperatorKey.multikey}`;

const wbcMislinked = signEddsaJcs2022({
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  id: `urn:uuid:${crypto.randomUUID()}`,
  type: ['VerifiableCredential', 'WalletBindingCredential'],
  issuer: WRONG_OPERATOR_DID,
  validFrom: '2026-01-01T00:00:00Z',
  validUntil: '2027-01-01T00:00:00Z',
  credentialSubject: {
    id: WRONG_OPERATOR_DID,
    walletAddress: TEST_WALLET_ADDR,
    rail: 'test-rail',
    issuanceMode: 'dev',
  },
}, wrongOperatorKey.privateKey, WRONG_OPERATOR_VM);
writeFileSync(join(OUT, 'wbc-mislinked.json'), JSON.stringify(wbcMislinked, null, 2));

// ── Config export ─────────────────────────────────────────────────────────────
const BASE_CFG = {
  issuerDid: ISSUER,
  schemaAllowlist: [SCHEMA_URL],
  agentDid: AGENT,
  revocation: { maxStalenessHours: 24, onUnreachable: 'cache-then-deny', fetchTimeoutMs: 1500 },
  didCache: { maxStalenessHours: 24 },
  cacheDir: join(OUT, 'cache'),
  auditLog: join(OUT, 'audit.jsonl'),
  offline: { didDocumentPath: join(OUT, 'issuer-did.json'), statusListPath: join(OUT, 'status-clean.json') },
};

// Single-rail config (existing tests)
const configTemplate = {
  ...BASE_CFG,
  credentialPath: join(OUT, 'cred-valid.json'),
  rails: { 'test:1': { rail: 'test-rail', currency: 'TUNIT', decimals: 0, family: 'other' } },
};

// Multi-rail config: four synthetic rails modelling wdk/mppx/ows/l402 rail families.
// The shared core is rail-agnostic — rail:family only affects allowContractCalls fallback.
const multiRailConfig = {
  ...BASE_CFG,
  credentialPath: join(OUT, 'cred-valid.json'),
  rails: {
    'test:1':    { rail: 'test-rail',  currency: 'TUNIT', decimals: 0, family: 'other' },
    'test:wdk':  { rail: 'wdk-rail',   currency: 'TUNIT', decimals: 0, family: 'evm'   },
    'test:mppx': { rail: 'mppx-rail',  currency: 'TUNIT', decimals: 0, family: 'other' },
    'test:l402': { rail: 'l402-rail',  currency: 'TUNIT', decimals: 0, family: 'other' },
  },
};

writeFileSync(join(OUT, 'config.json'), JSON.stringify({ configTemplate, multiRailConfig, ISSUER, AGENT, MERCHANT_ADDR, OTHER_ADDR, BLOCKED_ADDR, SCHEMA_URL, OPERATOR_DID, TEST_WALLET_ADDR }, null, 2));

console.log(`fixtures written: ${Object.keys(credentials).length} credentials → ${OUT}`);
