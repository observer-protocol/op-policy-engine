#!/usr/bin/env node
/**
 * TAMPER TEST (block 4). Takes signed records, modifies each in one field after signing, and runs
 * the same published verifier over the original and the tampered copy. The verifier must pass the
 * original and fail the copy; a verifier that cannot be shown failing is not trusted. Three tamper
 * shapes: the outcome token, one duty status, and the claim id. The exhibits are written beside the
 * corpus so a reader can rerun the check.  SYNTHETIC records throughout.
 *   node tamper.mjs --engine <package dir>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const HERE = new URL('.', import.meta.url).pathname; const OUT = `${HERE}out/`;
const argv = process.argv.slice(2); const engineDir = argv[argv.indexOf('--engine') + 1];
const req = createRequire(`${engineDir.replace(/\/$/, '')}/`); const engine = req(engineDir); const enginePkg = req('./package.json');
const manifest = JSON.parse(readFileSync(`${OUT}manifest.json`, 'utf8'));
const rawPub = Buffer.from(engine.decodeEd25519DidKey(manifest.key.did).publicKey);
const lines = gunzipSync(readFileSync(`${OUT}records.jsonl.gz`)).toString('utf8').trim().split('\n');
const sha = (o) => createHash('sha256').update(engine.jcsBytes(o)).digest('hex');
const pick = (pred) => lines.map((l) => JSON.parse(l)).find(pred);
const cases = [
  { name: 'outcome token changed', record: pick((r) => r.outcome === 'account_holder_bears'), mutate: (r) => { r.outcome = 'fi_bears'; r.tier = { reached: 'fi', state: 'closed', closer: 'srf/6/fi-tier' }; } },
  { name: 'one duty status changed', record: pick((r) => r.duties['srf/4.2.1/cooling-off'] === 'breach'), mutate: (r) => { r.duties['srf/4.2.1/cooling-off'] = 'affirmative'; } },
  { name: 'claim id changed', record: pick((r) => r.population === 'random'), mutate: (r) => { r.claimId = 'SRF-SCALE-SYN-999999'; } },
  { name: 'proofValue altered by one character', record: pick((r) => r.outcome === 'undetermined'), mutate: (r) => { const p = r.proof.proofValue; r.proof.proofValue = p.slice(0, -1) + (p.endsWith('1') ? '2' : '1'); } },
];
const results = [];
for (const c of cases) {
  const before = engine.verifyEddsaJcs2022(c.record, rawPub);
  const tampered = JSON.parse(JSON.stringify(c.record)); c.mutate(tampered);
  const after = engine.verifyEddsaJcs2022(tampered, rawPub);
  results.push({ tamper: c.name, claimId: c.record.claimId, original: { digest: sha(c.record), verifies: before.ok, reason: before.reason }, tampered: { digest: sha(tampered), verifies: after.ok, reason: after.reason }, outcome_as_expected: before.ok === true && after.ok === false, tampered_record: tampered });
}
const report = { $note: 'SYNTHETIC. Post-signing modification of one field per case; the published verifier must pass the original and fail the copy.', verifier: { package: enginePkg.name, version: enginePkg.version }, key: manifest.key.did, cases: results.map(({ tampered_record, ...r }) => r), verdict: results.every((r) => r.outcome_as_expected) ? `ALL ${results.length} TAMPERED COPIES FAIL VERIFICATION; ALL ${results.length} ORIGINALS PASS` : 'A TAMPERED COPY VERIFIED OR AN ORIGINAL FAILED: FINDING' };
writeFileSync(`${OUT}tamper-test.json`, JSON.stringify(report, null, 1) + '\n');
writeFileSync(`${OUT}exhibits/TAMPERED-records.json`, JSON.stringify({ $note: 'TAMPERED COPIES, SYNTHETIC. These records are deliberately altered after signing and must NOT verify.', cases: results.map((r) => ({ tamper: r.tamper, record: r.tampered_record })) }, null, 1) + '\n');
console.log(JSON.stringify(report.cases.map((c) => ({ tamper: c.tamper, original: c.original.verifies, tampered: c.tampered.verifies, reason: c.tampered.reason })), null, 1)); console.log(report.verdict);
process.exit(report.cases.every((c) => c.outcome_as_expected) ? 0 : 1);
