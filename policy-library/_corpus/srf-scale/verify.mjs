#!/usr/bin/env node
/**
 * EXTERNAL VERIFICATION of every signed record in out/records.jsonl.gz and out/exhibits/.
 *
 * Two checks, and what each establishes:
 *   signature  verifyEddsaJcs2022 from the PUBLISHED @observer-protocol/policy-engine (the package
 *              is named on the command line so the version verifying is a fact of the run, not of
 *              this file), against the did:key in manifest.json. Establishes that the bytes were
 *              signed by the run key and are unchanged. Nothing from build.mjs or lib.mjs is used.
 *   rebuild    the claim's facts are reconstructed from corpus.jsonl.gz, the engine at this tree is
 *              run again, the record body is re-projected (project.mjs, SHARED with build.mjs and
 *              stated as such) and compared canonically to the signed body. Establishes that the
 *              record is REPRODUCIBLE from corpus + engine; not independence of the projection.
 * A failure of either on any record is a numbered finding, never a footnote.
 *
 *   node verify.mjs --engine <dir of the installed @observer-protocol/policy-engine package>
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { interpret, loadRegister, RECORD_VERSION } from '../../_interpreter/interpret.mjs';
import { route } from '../../_interpreter/route.mjs';
import { dutySets, projectClaim } from './project.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const OUT = `${HERE}out/`;
const argv = process.argv.slice(2);
const engineDir = argv[argv.indexOf('--engine') + 1];
if (!argv.includes('--engine') || !engineDir) { console.error('usage: node verify.mjs --engine <package dir>'); process.exit(2); }
const req = createRequire(`${engineDir.replace(/\/$/, '')}/`);
const enginePkg = req('./package.json');
const engine = req(engineDir);
const { verifyEddsaJcs2022, decodeEd25519DidKey, jcsBytes } = engine;
const sha256hex = (s) => createHash('sha256').update(s).digest('hex');
const jcs = (v) => jcsBytes(v).toString('utf8');   // the PACKAGE's canonicalisation, for the rebuild comparison too

const manifest = JSON.parse(readFileSync(`${OUT}manifest.json`, 'utf8'));
const key = decodeEd25519DidKey(manifest.key.did);
if (!key) throw new Error(`manifest key ${manifest.key.did} is not a decodable Ed25519 did:key`);
const rawPub = Buffer.from(key.publicKey);
const recordsBytes = gunzipSync(readFileSync(`${OUT}records.jsonl.gz`));
const corpusBytes = gunzipSync(readFileSync(`${OUT}corpus.jsonl.gz`));
const findings = [];
const F = (what, detail) => findings.push({ n: findings.length + 1, what, ...detail });
// the manifest's digests over the uncompressed bytes
for (const [name, bytes] of [['records.jsonl (uncompressed bytes)', recordsBytes], ['corpus.jsonl (uncompressed bytes)', corpusBytes]]) {
  if (manifest.files[name] !== sha256hex(bytes)) F('manifest digest mismatch', { file: name, manifest: manifest.files[name], measured: sha256hex(bytes) });
}
const records = recordsBytes.toString('utf8').trim().split('\n').map((l) => JSON.parse(l));
const corpusLines = corpusBytes.toString('utf8').trim().split('\n');
const corpusHeader = JSON.parse(corpusLines[0]);
const claims = new Map(corpusLines.slice(1).map((l) => JSON.parse(l)).map((c) => [c.claimId, c]));

// engine at this tree
const registerBytes = readFileSync(`${HERE}../../mas-srf-2024/register.json`);
const R = JSON.parse(registerBytes);
const CL = JSON.parse(readFileSync(`${HERE}../../mas-srf-2024/clauses.json`, 'utf8')).clauses;
const byMeta = Object.fromEntries(CL.map((c) => [c.id, c]));
const byReg = Object.fromEntries(R.clauses.map((c) => [c.id, c]));
const sets = dutySets(CL, byReg);
const silent = console.log; console.log = () => {};
const { base } = await import(`${HERE}../../mas-srf-2024/cases.mjs`);
console.log = silent;
if (corpusHeader.base_sha256 !== sha256hex(jcs(base))) F('corpus base digest mismatch', { header: corpusHeader.base_sha256, measured: sha256hex(jcs(base)) });
if (corpusHeader.register.sha256 !== sha256hex(registerBytes)) F('corpus register digest mismatch', { header: corpusHeader.register.sha256, measured: sha256hex(registerBytes) });
const setPath = (o, path, v) => { const ks = path.split('.'); let c = o; for (let i = 0; i < ks.length - 1; i++) c = (c[ks[i]] ??= {}); if (v === undefined) delete c[ks[ks.length - 1]]; else c[ks[ks.length - 1]] = v; };
const rebuildFacts = (c) => { if (c.base === null) return c.facts; const f = JSON.parse(JSON.stringify(base)); for (const [p, v] of Object.entries(c.delta.set)) setPath(f, p, v); for (const p of c.delta.unset) setPath(f, p, undefined); return f; };

const counts = { records: records.length, signature_ok: 0, signature_failed: 0, rebuild_ok: 0, rebuild_failed: 0, claim_missing_from_corpus: 0, exhibits: 0, exhibit_signature_ok: 0, exhibit_rebuild_ok: 0, exhibit_failed: 0, distinct_verification_methods: new Set() };
let i = 0;
for (const rec of records) {
  counts.distinct_verification_methods.add(rec.proof?.verificationMethod);
  if (rec.proof?.verificationMethod !== manifest.key.verificationMethod) F('record signed by a key other than the manifest key', { claimId: rec.claimId, verificationMethod: rec.proof?.verificationMethod });
  const sig = verifyEddsaJcs2022(rec, rawPub);
  if (sig.ok) counts.signature_ok++; else { counts.signature_failed++; F('signature does not verify', { claimId: rec.claimId, reason: sig.reason }); }
  const c = claims.get(rec.claimId);
  if (!c) { counts.claim_missing_from_corpus++; F('signed record has no corpus line', { claimId: rec.claimId }); continue; }
  const facts = rebuildFacts(c);
  const out = route(R, facts, c.resolutions);
  const { body } = projectClaim({ out, facts, resolutions: c.resolutions, claim: c, sets, byMeta, registerRef: rec.register, recordVersion: RECORD_VERSION, jcs, sha256hex });
  const { proof, ...signedBody } = rec;
  if (jcs(body) === jcs(signedBody)) counts.rebuild_ok++; else { counts.rebuild_failed++; F('rebuilt record differs from signed record', { claimId: rec.claimId, differing_keys: Object.keys(body).filter((k) => jcs(body[k]) !== jcs(signedBody[k])) }); }
  if (++i % 10000 === 0) process.stderr.write(`  ${i}/${records.length}\n`);
}
const recordById = new Map(records.map((r) => [r.claimId, r]));
for (const f of readdirSync(`${OUT}exhibits`).filter((f) => f.endsWith('.json'))) {
  counts.exhibits++;
  const ex = JSON.parse(readFileSync(`${OUT}exhibits/${f}`, 'utf8'));
  const sig = verifyEddsaJcs2022(ex, rawPub);
  if (sig.ok) counts.exhibit_signature_ok++; else { counts.exhibit_failed++; F('exhibit signature does not verify', { file: f, reason: sig.reason }); continue; }
  const rec = recordById.get(ex.claimId);
  const out = route(R, ex.facts, ex.resolutions);
  const ok = rec && sha256hex(JSON.stringify(out)) === rec.recordSetSha256 && JSON.stringify(out) === JSON.stringify(ex.records) && sha256hex(jcs(ex.facts)) === rec.factsDigest;
  if (ok) counts.exhibit_rebuild_ok++; else { counts.exhibit_failed++; F('exhibit does not rebuild to its claim record', { file: f, claimId: ex.claimId }); }
}
counts.distinct_verification_methods = [...counts.distinct_verification_methods];
const report = {
  $note: 'External verification of the SYNTHETIC SRF SCALE corpus records. Every failure is a numbered finding.',
  verifier: { package: enginePkg.name, version: enginePkg.version, functions: ['verifyEddsaJcs2022', 'decodeEd25519DidKey', 'jcsBytes'], dir: engineDir },
  engine_rerun: { register_sha256: sha256hex(registerBytes), recordVersion: RECORD_VERSION },
  key: manifest.key.did,
  counts, findings,
  verdict: findings.length === 0 ? `ALL ${records.length} RECORDS AND ${counts.exhibits} EXHIBITS VERIFY AND REBUILD` : `${findings.length} FINDING(S)`,
};
writeFileSync(`${OUT}verification.json`, JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({ verifier: report.verifier.version, counts, findings: findings.length, verdict: report.verdict }, null, 1));
process.exit(findings.length === 0 ? 0 : 1);
