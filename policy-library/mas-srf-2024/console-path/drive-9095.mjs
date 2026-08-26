#!/usr/bin/env node
/**
 * THE CONSOLE PATH, server side. Takes the six determination artifacts in ../out/determinations,
 * issues one signed decision attestation per artifact (outcome = the artifact's srf/6.7/outcome
 * record; deciderArtifactDigest = sha256 of the committed artifact bytes; inputsDigest over its
 * facts and resolutions), posts each to POST /v1/determinations of an op-mcp-payment-server
 * instance, then posts one payment per claim citing it, so the store holds what the :3300 console
 * reads (/v1/refusals, /v1/fleet, /v1/reserved, /v1/reconciliation, /v1/resolutions, /v1/verdicts,
 * /v1/pending) plus /v1/determinations.
 *
 * Runs against a SCRATCH instance only (loopback; a fresh store; keys outside every repository).
 * It never touches 9094 (the Molina store) or any other live instance. Everything it produces is
 * SYNTHETIC and no figure from it is a measurement.
 *
 * Imports op-mcp-payment-server's src by path (OP_MCP_REPO), read-only: the attestation issuer is
 * the engine's; verdictPayload/signableFromRequest are the server's own, so the verdict is signed
 * over exactly the bytes the server rebuilds. Env: OP_MCP_REPO, SRF_SCRATCH (keys/ and
 * credential.json), SRF_BASE (default http://127.0.0.1:9095).
 */
import { createHash, createPrivateKey, createPublicKey, sign as nodeSign } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const REPO = process.env.OP_MCP_REPO ?? '/Users/agentic/Desktop/OP_AT/op-mcp-payment-server';
const SRF = process.env.SRF_SCRATCH;
const BASE = process.env.SRF_BASE ?? 'http://127.0.0.1:9095';
if (!SRF) { console.error('SRF_SCRATCH (the scratch directory holding keys/ and credential.json) is required.'); process.exit(2); }
if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(BASE)) { console.error(`SRF_BASE must be loopback; got ${BASE}`); process.exit(2); }
const HERE = new URL('.', import.meta.url).pathname;
const DET = join(HERE, '..', 'out', 'determinations');
const OUT = join(HERE, '..', 'out', 'console-path');
mkdirSync(OUT, { recursive: true });

const { issueDecisionAttestation } = await import(`${REPO}/node_modules/@observer-protocol/policy-engine/dist/index.mjs`);
const { verdictPayload, signableFromRequest } = await import(`${REPO}/src/evaluator-verdict.ts`);
const { encodeDidKeyEd25519 } = await import(`${REPO}/src/resolution-signature.ts`);
const { base58 } = createRequire(`${REPO}/package.json`)('@scure/base');

const sha = (b) => createHash('sha256').update(b).digest('hex');
const refuse = (m) => { console.error(`\nREFUSED. ${m}\n`); process.exit(2); };
const didOf = (k) => { const spki = createPublicKey(k).export({ format: 'der', type: 'spki' }); return encodeDidKeyEd25519(Uint8Array.prototype.slice.call(spki, spki.length - 32), (b) => base58.encode(b)); };
const loadKey = (n) => createPrivateKey(readFileSync(join(SRF, 'keys', `${n}.pem`), 'utf8'));
const deciderKey = loadKey('decider'), evaluatorKey = loadKey('evaluator');
const DECIDER = didOf(deciderKey), EVALUATOR = didOf(evaluatorKey);

const CRED = JSON.parse(readFileSync(join(SRF, 'credential.json'), 'utf8'));
const SCOPE = CRED.credentialSubject.actionScope;
const REQ = SCOPE.requiresDecisionAttestation;
const MANDATE = CRED.id, RAIL = SCOPE.allowed_rails[0], ASSET = SCOPE.per_transaction_ceiling.currency, DECIMALS = 2;
if (!REQ.acceptableDeciders.includes(DECIDER)) refuse(`the decider key signs as ${DECIDER}; the mandate accepts [${REQ.acceptableDeciders.join(', ')}]`);
const registerBytes = readFileSync(join(HERE, '..', 'register.json'));
if (REQ.policyRef.hash !== `sha256:${sha(registerBytes)}`) refuse(`the credential pins ${REQ.policyRef.hash}; register.json in hand is sha256:${sha(registerBytes)}. POLICY_MISMATCH on every payment is the mandate working and is not the run.`);

// THE VOCABULARY: the result domain of srf/6.7/outcome, from the register's decision table, never
// typed here. Hash = sha256 of the pipe-joined values (the Molina generator's construction).
const register = JSON.parse(registerBytes);
const outcomeClause = register.clauses.find((c) => c.id === 'srf/6.7/outcome');
const OUTCOMES = [...new Set(outcomeClause.evaluate.rows.map((r) => r.outcome))].sort();
const VOCAB = { id: 'urn:op:vocab:mas-srf-2024:srf-6.7-outcome', version: register.register_version, hashMethod: 'sha256', source: 'client-defined', values: OUTCOMES };
VOCAB.hash = `sha256:${sha(OUTCOMES.join('|'))}`;
for (const o of REQ.authorizingOutcomes) if (!OUTCOMES.includes(o)) refuse(`the mandate authorises ${o}, which srf/6.7/outcome never produces`);

const deciderSigner = { deciderDid: async () => DECIDER, sign: async (p) => nodeSign(null, Buffer.from(p, 'utf8'), deciderKey).toString('base64'), assurance: () => 'self-declared' };
const postJson = async (path, body, headers = {}) => {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = { kind: `NON_JSON_${res.status}`, text: text.slice(0, 200) }; }
  return { status: res.status, body: parsed };
};
const iso = (ms) => new Date(ms).toISOString();
const pad = (n, w) => String(n).padStart(w, '0');
// SYNTHETIC loss amounts, SGD, one per claim; drawn here, carried on nothing in the register.
const AMOUNTS = { 'SRF-SYN-2026-0001': '4200.00', 'SRF-SYN-2026-0002': '8800.00', 'SRF-SYN-2026-0003': '2500.00', 'SRF-SYN-2026-0004': '3100.00', 'SRF-SYN-2026-0005': '6600.00', 'SRF-SYN-2026-0006': '1900.00' };
const COUNTERPARTY = 'account-holder:demo-protected-account-0001';

const log = { base: BASE, decider: DECIDER, evaluator: EVALUATOR, mandate: MANDATE, vocabulary: VOCAB, determinations: [], payments: [] };
const files = readdirSync(DET).filter((f) => /^SRF-SYN-\d{4}-\d{4}\.json$/.test(f)).sort();
const carriage = new Map();
let n = 0;
for (const f of files) {
  n += 1;
  const bytes = readFileSync(join(DET, f));
  const art = JSON.parse(bytes);
  const outcome = art.records['srf/6.7/outcome'].result;
  const decisionId = `SRF-DET-2026-${pad(n, 4)}`;
  const amount = AMOUNTS[art.claimId] ?? refuse(`no amount for ${art.claimId}`);
  const amountRaw = amount.replace('.', '');
  const issued = await issueDecisionAttestation({
    decisionId, subject: `claim:${art.claimId}`, outcome,
    policyRef: REQ.policyRef, vocabularyRef: VOCAB,
    deciderArtifactDigest: { state: 'digest', value: `sha256:${sha(bytes)}` },
    inputsDigest: `sha256:${sha(JSON.stringify({ facts: art.facts, resolutions: art.resolutions }))}`,
    decidedAt: iso(Date.now() - 3600_000), resolvableUntil: '2033-01-01T00:00:00Z',
    counterparty: COUNTERPARTY, rail: RAIL,
    amount: { amountRaw, decimals: String(DECIMALS), asset: ASSET },
  }, deciderSigner);
  if (issued.kind !== 'issued') refuse(`${art.claimId} would not issue: ${issued.reason}`);
  const c = { citesDecisionId: decisionId, attestationDocument: issued.attestation, attestationSignature: issued.signature };
  carriage.set(art.claimId, { c, amount, amountRaw, outcome, decisionId, artifactDigest: `sha256:${sha(bytes)}` });
  const r = await postJson('/v1/determinations', { at: new Date().toISOString(), attestation: c });
  log.determinations.push({ claimId: art.claimId, scenario: art.scenario, decisionId, outcome, artifact: f, artifactDigest: `sha256:${sha(bytes)}`, http: r.status, response: r.body });
  console.log(`det ${decisionId} ${art.claimId} ${outcome.padEnd(22)} HTTP ${r.status} ${r.body?.kind}${r.body?.code ? '/' + r.body.code : ''} ${r.body?.determinationId ?? ''}`);
}
let seq = 0;
for (const [claimId, p] of carriage) {
  seq += 1;
  const at = new Date().toISOString();
  const notBefore = iso(Date.now() - 60_000), notAfter = iso(Date.now() + 3600_000);
  const req = {
    verdict: { decision: 'release', mandateId: MANDATE, agentId: CRED.credentialSubject.id, issuerId: CRED.issuer, counterpartyMatchedAs: COUNTERPARTY, amount: p.amount, asset: ASSET, rail: RAIL, recentApprovals: [], attestation: { state: 'not-cited' } },
    at, mandateId: MANDATE, network: RAIL,
    agentSupplied: { clientRef: claimId, obligationRef: p.decisionId, describedAs: `Credit the protected account for ${claimId} on determination ${p.decisionId} (SRF 7.13)`, requestedBy: 'srf-fi-credit-agent' },
    reservationId: `res-srf-${pad(seq, 4)}`,
    handle: { id: `h-srf-${pad(seq, 4)}`, expiresAt: iso(Date.now() + 7 * 86400000), awaiting: 'designated-approver', resolution: 'inbound-credential' },
    spend: { rail: RAIL, asset: ASSET, amountRaw: p.amountRaw, decimals: DECIMALS, counterparty: COUNTERPARTY },
    attestation: p.c,
  };
  const signature = nodeSign(null, Buffer.from(verdictPayload(signableFromRequest(req, { notBefore, notAfter })), 'utf8'), evaluatorKey).toString('base64');
  const x = await postJson('/v1/payments', req, { 'x-op-evaluator': EVALUATOR, 'x-op-verdict-signature': signature, 'x-op-verdict-not-before': notBefore, 'x-op-verdict-not-after': notAfter });
  log.payments.push({ claimId, decisionId: p.decisionId, outcome: p.outcome, amount: p.amount, asset: ASSET, http: x.status, response: x.body });
  console.log(`pay ${pad(seq, 3)} ${claimId} ${p.amount.padStart(9)} ${ASSET} ${p.outcome.padEnd(22)} HTTP ${x.status} ${x.body?.kind ?? ''}${x.body?.code ? '/' + x.body.code : ''}`);
}
writeFileSync(join(OUT, 'run-log.json'), JSON.stringify(log, null, 1) + '\n');
console.log(`wrote ${join(OUT, 'run-log.json')}`);
