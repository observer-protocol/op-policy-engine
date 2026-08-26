#!/usr/bin/env node
/**
 * Runs the six synthetic scenarios of cases.mjs through the INTERPRETER over register.json and
 * writes one determination artifact per scenario to out/determinations/<id>.json: the v7 record
 * set (every clause's record), the claim-level reading of the waterfall (which tier closed it,
 * on which clause, waiting on what), the inputs, and the register's digest.
 *
 * The artifact shape follows the Molina corpus generator's (op-mcp-payment-server
 * scripts/generate-molina-corpus.mjs, branch session/molina-corpus): `records` are v7 as the
 * interpreter emits them; `mapping` is this script's reading of them and is OUTSIDE v7, which is
 * FINDINGS.md F-07. `recordVersion` is imported from the interpreter, never written here.
 *
 * SYNTHETIC. Nothing here is a determination on a real claim. Not signed: the policy-library run
 * path signs nothing (the SCALE session's finding); a signing key is a decision for Boyd.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { interpret, loadRegister, RECORD_VERSION } from '../_interpreter/interpret.mjs';
import { CASES } from './cases.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const sha = (s) => createHash('sha256').update(s).digest('hex');
const registerBytes = readFileSync(`${HERE}register.json`);
const R = JSON.parse(registerBytes);
const clausesById = Object.fromEntries(JSON.parse(readFileSync(`${HERE}clauses.json`, 'utf8')).clauses.map((c) => [c.id, c]));
const TIERS = ['scope', 'fi', 'telco', 'consumer'];
const OUTCOME = 'srf/6.7/outcome';
const TIER_CLOSERS = { scope: 'srf/7.1.1/relevant-claim', fi: 'srf/6/fi-tier', telco: 'srf/6.4/telco-bears', consumer: OUTCOME };

// The waterfall reading: walk the tiers in order and report the first whose closing clause did not
// close, with the duty records that left it open. `stoppedAt` names a clause; `tier` and
// `duty_holder` come from clauses.json because v7 does not carry them (F-03, F-07).
function readWaterfall(out) {
  const outcome = out[OUTCOME].result;
  for (const tier of TIERS) {
    const closer = TIER_CLOSERS[tier];
    const rec = out[closer];
    if (rec.result !== 'undetermined') continue;
    const open = Object.entries(out)
      .filter(([id, r]) => clausesById[id].tier === tier && 'result' in r && r.result === 'undetermined')
      .map(([id, r]) => ({ clause: id, duty_holder: clausesById[id].duty_holder, waiting: r.waiting, ...(r.undetermined_because ? { because: r.undetermined_because } : {}) }));
    return { outcome, stoppedAt: closer, tier, open };
  }
  // closed: name the tier whose closer decided the outcome
  const closedBy = outcome === 'out_of_scope' ? 'scope' : outcome === 'fi_bears' ? 'fi' : outcome === 'telco_bears' ? 'telco' : 'consumer';
  return { outcome, closedBy, closer: TIER_CLOSERS[closedBy], stoppedAt: null };
}

mkdirSync(`${HERE}out/determinations`, { recursive: true });
const index = [];
CASES.forEach((c, i) => {
  const out = interpret(R, c.facts, c.res);
  const id = `SRF-SYN-2026-${String(i + 1).padStart(4, '0')}`;
  const artifact = {
    payloadType: 'op.policy.determination.mas-srf-2024.v1',
    recordVersion: RECORD_VERSION,
    register: { domain: R.domain, version: R.register_version, sha256: sha(registerBytes) },
    source: {
      document: 'Guidelines on Shared Responsibility Framework, MAS/IMDA, issued 24 October 2024, effective 16 December 2024; with the E-Payments User Protection Guidelines as amended 24 October 2024',
      sha256: { srf_guidelines_pdf: 'bc5f937a1baffac0758532b3ae95c9f7cc4b7db5ba9d2c2d7b5a5124892af6a1', eupg_pdf: '384e962f206cae51b4e7899a621f2f151f004a0c6e4be7e5bf10ca3853fa0fd7' },
    },
    claimId: id,
    scenario: c.name,
    synthetic: true,
    facts: c.facts,
    resolutions: c.res,
    records: out,
    mapping: readWaterfall(out),
    signature: { state: 'unsigned', why: 'the policy-library run path signs nothing; a key is a decision not taken in this session' },
  };
  const bytes = JSON.stringify(artifact, null, 1) + '\n';
  writeFileSync(`${HERE}out/determinations/${id}.json`, bytes);
  const m = artifact.mapping;
  index.push({ claimId: id, scenario: c.name, outcome: m.outcome, stoppedAt: m.stoppedAt, tier: m.tier ?? m.closedBy, open: (m.open ?? []).length, sha256: sha(bytes) });
});
writeFileSync(`${HERE}out/determinations/INDEX.json`, JSON.stringify({ $note: 'One artifact per scenario; sha256 over the artifact bytes. SYNTHETIC, UNSIGNED.', recordVersion: RECORD_VERSION, register_sha256: sha(registerBytes), artifacts: index }, null, 1) + '\n');
for (const x of index) console.log(`${x.claimId}  ${x.outcome.padEnd(22)} ${(x.stoppedAt ?? 'closed at ' + x.tier).padEnd(36)} open ${x.open}  ${x.scenario}`);
