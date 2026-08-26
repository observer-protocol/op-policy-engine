#!/usr/bin/env node
/**
 * SYNTHETIC CLAIM CORPUS over the SRF duty matrix (mas-srf-2024, register accepted at tag
 * srf-register-accepted-v1). Session CORPUS-SRF-SCALE, 2026-08-25.
 *
 * EVERY CLAIM IS SYNTHETIC. No individual, account, bank, Telco, incident or claimant is behind any
 * fact here; every value is drawn from the declared domain of a fact field (facts.json, as
 * _corpus/space.mjs SRF_FIELDS lays it out) or authored in cases.mjs from clause text.
 *
 * FACTS FIRST. No fact is chosen to reach an outcome. The brief's classes (discharged / breached /
 * unevaluable) are LABELS THE ENGINE ASSIGNS after the run; the construction only decides WHICH
 * FACT PATHS VARY and over WHAT DOMAIN, both derived from the register: the paths a clause reads
 * are collected from its evaluation tree (transitively through bindings and clause references), the
 * domain per path is the field's declared kind. A class a duty never reaches is a finding, not a
 * reason to move a fact.
 *
 * POPULATIONS (each claim carries its population and, where one clause was varied, which):
 *   single-clause   for each clause with duty_holder fi or telco and an evaluation: the FULL product
 *                   of its read paths' domains, other facts held at cases.mjs `base` and resolutions
 *                   at `resolved`; where the product exceeds the cap the claim set is a seeded sample
 *                   of that size and the manifest says so per clause (no silent caps).
 *   scope           the four scope limbs' read paths: every single-path variation, plus a seeded
 *                   sample of the product.
 *   resolutions     the 4 x 4 x 4 grid of A3, A5 and the two ungrounded meanings on `base`.
 *   pairwise        for the eight waterfall duties: one witness fact-delta per result each reached
 *                   in single-clause, then every pair of duties crossed (witness x witness).
 *   random          a seeded sample over EVERY declared field and resolution from scratch (no base),
 *                   the same construction _corpus/build.mjs uses.
 *
 * THE ENGINE is the interpreter over register.json, projected through the router (route.mjs): the
 * v7 record set. The hand evaluator (evaluate.mjs) runs beside it on every claim as a parity
 * control; a disagreement halts the run (STOP: engine behaviour diverging from register semantics).
 *
 * SIGNING (D1, approved by Boyd 2026-08-25): an ephemeral Ed25519 key generated in this process,
 * labelled SYNTHETIC and DEMONSTRATION-KEY, the public half published in the manifest as did:key,
 * the private half never written anywhere and released at process end (ledger "SCALE signing",
 * 2026-08-25). Proofs are eddsa-jcs-2022 DataIntegrityProof, so the published engine's
 * verifyEddsaJcs2022 checks them without anything from this file.
 *
 *   node build.mjs --created <ISO instant>    (the clock is supplied by the caller, never read)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { generateKeyPairSync, sign as edSign } from 'node:crypto';
import { jcs, sha256hex, didKeyFromRawEd25519, eddsaJcs2022HashData, mulberry32, setPath, clone, applyDelta } from './lib.mjs';
import { interpret, loadRegister, RECORD_VERSION } from '../../_interpreter/interpret.mjs';
import { route } from '../../_interpreter/route.mjs';
import { SRF_FIELDS, SRF_RESOLUTIONS } from '../space.mjs';
import { gzipSync } from 'node:zlib';
import { SCOPE, FI_TIER, TELCO_TIER, OUTCOME, FI_ALL, TIER_CLOSERS, WATERFALL_DUTIES, TIER_JUDGMENT_PATHS, isComposition, STATUS, STATUS_NOTES, dutySets, projectClaim } from './project.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const DOMAIN_DIR = `${HERE}../../mas-srf-2024/`;
const OUT = `${HERE}out/`;
const argv = process.argv.slice(2);
const created = argv[argv.indexOf('--created') + 1];
if (!argv.includes('--created') || !created || Number.isNaN(Date.parse(created))) { console.error('usage: node build.mjs --created <ISO instant>; the clock is supplied by the caller'); process.exit(2); }
const SEED = 20260825;
const CAP_DUTY = 5000;      // clauses in the fi and telco tiers that are not Section 6 compositions
const CAP_OTHER = 1000;     // Section 6 compositions and process-tier clauses
const SCOPE_SAMPLE = 1000;
const RANDOM_SAMPLE = 2000;

// ─── inputs, pinned ─────────────────────────────────────────────────────────────────────────────
const registerBytes = readFileSync(`${DOMAIN_DIR}register.json`);
const R = JSON.parse(registerBytes);
const clausesBytes = readFileSync(`${DOMAIN_DIR}clauses.json`);
const CL = JSON.parse(clausesBytes).clauses;
const byMeta = Object.fromEntries(CL.map((c) => [c.id, c]));
const byReg = Object.fromEntries(R.clauses.map((c) => [c.id, c]));
const silent = console.log; console.log = () => {};
const { base, resolved } = await import(`${DOMAIN_DIR}cases.mjs`);
const { evaluate: handEvaluate } = await import(`${DOMAIN_DIR}evaluate.mjs`);
console.log = silent;
const baseDigest = sha256hex(jcs(base));

// ─── the read paths of a clause, derived from the register, never listed by hand ────────────────
function collect(node, acc, seenB, seenC) {
  if (node === null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { for (const x of node) collect(x, acc, seenB, seenC); return acc; }
  if (node.op === 'fact') acc.add(node.path);
  if (node.op === 'clause' && !seenC.has(node.id)) { seenC.add(node.id); const c = byReg[node.id]; if (c?.evaluate) collect(c.evaluate, acc, seenB, seenC); }
  if (node.op === 'binding' && !seenB.has(node.name)) { seenB.add(node.name); collect(R.bindings[node.name], acc, seenB, seenC); }
  for (const [k, v] of Object.entries(node)) if (k !== 'op') collect(v, acc, seenB, seenC);
  return acc;
}
const readPaths = (id) => [...collect(byReg[id].evaluate, new Set(), new Set(), new Set([id]))].sort();
const domainOf = (path) => {
  const f = Object.keys(SRF_FIELDS).find((q) => q === path || path.startsWith(`${q}.`));
  if (!f) throw new Error(`no declared domain for fact path ${path}; _corpus/space.mjs SRF_FIELDS does not vary it`);
  return SRF_FIELDS[f];
};

// ─── enumeration ────────────────────────────────────────────────────────────────────────────────
const rnd = mulberry32(SEED);
function* fullProduct(paths) {
  const doms = paths.map(domainOf); const idx = paths.map(() => 0);
  while (true) {
    yield idx.slice();
    let i = idx.length - 1;
    while (i >= 0) { idx[i]++; if (idx[i] < doms[i].length) break; idx[i] = 0; i--; }
    if (i < 0) return;
  }
}
function sampledProduct(paths, n) {
  const doms = paths.map(domainOf); const seen = new Set(); const out = [];
  while (out.length < n) {
    const idx = doms.map((d) => Math.floor(rnd() * d.length)); const k = idx.join(',');
    if (seen.has(k)) continue; seen.add(k); out.push(idx);
  }
  return out;
}
const deltaFor = (paths, idx) => {
  const set = {}; const unset = [];
  paths.forEach((p, i) => { const v = domainOf(p)[idx[i]]; if (v === undefined) unset.push(p); else set[p] = v; });
  return { set, unset };
};
const mergeDelta = (a, b) => {
  const set = { ...a.set }; for (const p of b.unset) delete set[p]; Object.assign(set, b.set);
  const unset = [...new Set([...a.unset.filter((p) => !(p in b.set)), ...b.unset])];
  return { set, unset };
};

// ─── the duty matrix, read from clauses.json (F-03: register.json does not carry it) ────────────
const { DUTY_HOLDER_CLAUSES, TIER_LEVEL, DUTY_CLAUSES } = dutySets(CL, byReg);
const sets = { DUTY_HOLDER_CLAUSES, TIER_LEVEL, DUTY_CLAUSES };
for (const id of WATERFALL_DUTIES) if (!DUTY_CLAUSES.includes(id)) throw new Error(`waterfall duty ${id} is not a duty clause of the register`);

// ─── construction ───────────────────────────────────────────────────────────────────────────────
const claims = []; const construction = { single_clause: [], scope: {}, resolutions: {}, pairwise: {}, random: {} };
const push = (c) => { c.claimId = `SRF-SCALE-SYN-${String(claims.length + 1).padStart(6, '0')}`; claims.push(c); };
const witnesses = {}; // waterfall duty -> Map(result -> delta), filled after the run

for (const id of DUTY_HOLDER_CLAUSES) {
  const paths = readPaths(id);
  const product = paths.reduce((a, p) => a * domainOf(p).length, 1);
  const cap = (byMeta[id].tier === 'fi' || byMeta[id].tier === 'telco') && !isComposition(id) ? CAP_DUTY : CAP_OTHER;
  const full = product <= cap;
  const tuples = full ? [...fullProduct(paths)] : sampledProduct(paths, cap);
  construction.single_clause.push({ clause: id, duty_holder: byMeta[id].duty_holder, tier: byMeta[id].tier, disposition: byMeta[id].disposition, read_paths: paths, product, method: full ? 'full product' : `seeded sample of ${cap} distinct tuples (cap ${cap})`, claims: tuples.length });
  for (const idx of tuples) push({ population: 'single-clause', variedClause: id, base: 'cases.mjs#base', delta: deltaFor(paths, idx), resolutions: clone(resolved) });
}
{
  const paths = readPaths(SCOPE); const product = paths.reduce((a, p) => a * domainOf(p).length, 1);
  let singles = 0;
  for (const p of paths) for (const v of domainOf(p)) { push({ population: 'scope', variedClause: SCOPE, base: 'cases.mjs#base', delta: v === undefined ? { set: {}, unset: [p] } : { set: { [p]: v }, unset: [] }, resolutions: clone(resolved) }); singles++; }
  for (const idx of sampledProduct(paths, SCOPE_SAMPLE)) push({ population: 'scope', variedClause: SCOPE, base: 'cases.mjs#base', delta: deltaFor(paths, idx), resolutions: clone(resolved) });
  construction.scope = { read_paths: paths, product, single_path_variations: singles, sampled_from_product: SCOPE_SAMPLE };
}
{
  const keys = Object.keys(SRF_RESOLUTIONS); let n = 0;
  for (const a of SRF_RESOLUTIONS.A3_not_applicable_duty) for (const b of SRF_RESOLUTIONS.A5_filter_duty_reading) for (const u of SRF_RESOLUTIONS.ungrounded_terms) {
    const res = {}; if (a !== undefined) res.A3_not_applicable_duty = a; if (b !== undefined) res.A5_filter_duty_reading = b; if (u !== undefined) res.ungrounded_terms = clone(u);
    push({ population: 'resolutions', base: 'cases.mjs#base', delta: { set: {}, unset: [] }, resolutions: res }); n++;
  }
  construction.resolutions = { axes: keys, grid: n };
}
const pairwiseStart = claims.length; // filled after single-clause results exist
{
  let n = 0; const facts = {}; const fields = Object.keys(SRF_FIELDS);
  for (let i = 0; i < RANDOM_SAMPLE; i++) {
    const f = {}; for (const p of fields) { const d = SRF_FIELDS[p]; const v = d[Math.floor(rnd() * d.length)]; if (v !== undefined) setPath(f, p, v); }
    const res = {}; for (const [k, vals] of Object.entries(SRF_RESOLUTIONS)) { const v = vals[Math.floor(rnd() * vals.length)]; if (v !== undefined) res[k] = clone(v); }
    push({ population: 'random', base: null, facts: f, resolutions: res }); n++;
  }
  construction.random = { fields_varied: fields.length, resolutions_varied: Object.keys(SRF_RESOLUTIONS).length, sample: n, seed: SEED };
}

// ─── the key (D1) ───────────────────────────────────────────────────────────────────────────────
let keyPair = generateKeyPairSync('ed25519');
const rawPub = keyPair.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
const key = didKeyFromRawEd25519(rawPub);
const KEY_LABELS = ['SYNTHETIC', 'DEMONSTRATION-KEY'];
function signDocument(doc) {
  const proofConfig = { type: 'DataIntegrityProof', cryptosuite: 'eddsa-jcs-2022', created, verificationMethod: key.verificationMethod, proofPurpose: 'assertionMethod' };
  const sig = edSign(null, eddsaJcs2022HashData(doc, proofConfig), keyPair.privateKey);
  return { ...doc, proof: { ...proofConfig, proofValue: 'z' + base58(sig) } };
}
import { base58Encode as base58 } from './lib.mjs';

// ─── the run ────────────────────────────────────────────────────────────────────────────────────
mkdirSync(`${OUT}exhibits`, { recursive: true });
const registerRef = { domain: R.domain, version: R.register_version, sha256: sha256hex(registerBytes), clauses_json_sha256: sha256hex(clausesBytes), accepted_tag: 'srf-register-accepted-v1' };
const PAYLOAD_TYPE = 'op.policy.claim-determination.mas-srf-2024.scale.v1';
const stats = { parity_disagreements: [], throws: {}, invariant_failures: [], consumer_bears_with_undetermined_duty: [], consumer_bears_with_established_breach: [] };
const exhibits = new Map();
const corpusLines = []; const recordLines = [];
function runClaim(c) {
  const facts = c.base === null ? c.facts : applyDelta(base, c.delta);
  let out, interp, hand;
  try { interp = interpret(R, facts, c.resolutions); out = route(R, facts, c.resolutions); }
  catch (e) { const k = e.message.replace(/".*?"/g, '"…"').slice(0, 120); (stats.throws[k] ??= { count: 0, first: c.claimId }).count++; return null; }
  try { hand = handEvaluate(facts, c.resolutions); } catch (e) { stats.parity_disagreements.push({ claimId: c.claimId, hand_threw: e.message.slice(0, 160) }); return null; }
  if (JSON.stringify(interp) !== JSON.stringify(hand)) {
    const diff = Object.keys(interp).filter((id) => JSON.stringify(interp[id]) !== JSON.stringify(hand[id]));
    stats.parity_disagreements.push({ claimId: c.claimId, clauses: diff });
  }
  const { wf, duties, tiers, body } = projectClaim({ out, facts, resolutions: c.resolutions, claim: c, sets, byMeta, registerRef, recordVersion: RECORD_VERSION, jcs, sha256hex });
  // I1, THE REGISTER'S OWN PROPERTY 2 (FINDINGS.md): account_holder_bears only on scope relevant_claim,
  // the FI tier fi_not_liable and the Telco tier telco_not_liable or not_applicable. A first draft of
  // this invariant also required fi-complied-all satisfied; that was STRICTER THAN THE REGISTER (6.2's
  // "breach established, causation denied" row), fired on 690 claims, and is now MEASURED below instead.
  if (wf.outcome === 'account_holder_bears') {
    const ok = tiers[SCOPE] === 'relevant_claim' && tiers[FI_TIER] === 'fi_not_liable' && ['telco_not_liable', 'not_applicable'].includes(tiers[TELCO_TIER]);
    if (!ok) stats.invariant_failures.push({ claimId: c.claimId, invariant: 'I1 account_holder_bears on affirmative tier findings only', tiers });
    const dutyStatuses = WATERFALL_DUTIES.map((d) => duties[d]);
    if (dutyStatuses.includes('undetermined') || tiers[FI_ALL] === 'undetermined') stats.consumer_bears_with_undetermined_duty.push(c.claimId);
    if (dutyStatuses.includes('breach')) stats.consumer_bears_with_established_breach.push(c.claimId);
  }
  if (wf.outcome === 'undetermined' && wf.stoppedAt === null) stats.invariant_failures.push({ claimId: c.claimId, invariant: 'I2 undetermined outcome names an undetermined tier', tiers });
  const record = signDocument(body);
  const exKey = `${wf.outcome}|${wf.stoppedAt ?? wf.closedBy}`;
  if (!exhibits.has(exKey)) exhibits.set(exKey, signDocument({ payloadType: 'op.policy.determination.mas-srf-2024.scale-exhibit.v1', labels: KEY_LABELS, synthetic: true, claimId: c.claimId, population: c.population, register: registerRef, recordVersion: RECORD_VERSION, facts, resolutions: c.resolutions, records: out, mapping: wf }));
  return { out, wf, duties, tiers, record, facts };
}
const results = [];
let i = 0;
for (const c of claims) { results.push(runClaim(c)); if (++i % 5000 === 0) process.stderr.write(`  ${i}/${claims.length}\n`); }
// pairwise: witnesses from single-clause results, then crossed
for (const d of WATERFALL_DUTIES) witnesses[d] = new Map();
claims.forEach((c, k) => { const r = results[k]; if (!r || c.population !== 'single-clause' || !WATERFALL_DUTIES.includes(c.variedClause)) return; const tok = r.out[c.variedClause].result; if (!witnesses[c.variedClause].has(tok)) witnesses[c.variedClause].set(tok, c.delta); });
let pairs = 0, pairClaims = 0;
for (let a = 0; a < WATERFALL_DUTIES.length; a++) for (let b = a + 1; b < WATERFALL_DUTIES.length; b++) {
  pairs++;
  for (const [ta, da] of witnesses[WATERFALL_DUTIES[a]]) for (const [tb, db] of witnesses[WATERFALL_DUTIES[b]]) {
    push({ population: 'pairwise', variedClause: `${WATERFALL_DUTIES[a]} x ${WATERFALL_DUTIES[b]}`, witnessOf: { [WATERFALL_DUTIES[a]]: ta, [WATERFALL_DUTIES[b]]: tb }, base: 'cases.mjs#base', delta: mergeDelta(da, db), resolutions: clone(resolved) }); pairClaims++;
  }
}
// tier-judgments: the held judgments the waterfall reads beside the duties, varied against every
// waterfall-duty witness: each judgment path through its domain (single), and the two causation
// judgments crossed. Without this the outcome telco_bears was reached 0 times in 39,834 claims,
// because base holds every causation `denied` and no other population varies them.
let tjSingle = 0, tjCross = 0;
const allWitnesses = WATERFALL_DUTIES.flatMap((d) => [...witnesses[d]].map(([tok, delta]) => ({ d, tok, delta })));
for (const w of allWitnesses) {
  for (const p of TIER_JUDGMENT_PATHS) for (const v of domainOf(p)) {
    push({ population: 'tier-judgments', variedClause: `${w.d} x ${p}`, witnessOf: { [w.d]: w.tok }, base: 'cases.mjs#base', delta: mergeDelta(w.delta, v === undefined ? { set: {}, unset: [p] } : { set: { [p]: v }, unset: [] }), resolutions: clone(resolved) }); tjSingle++;
  }
  for (const fv of domainOf('fi.loss_arises_from_noncompliance')) for (const tv of domainOf('telco.loss_arises_from_noncompliance')) {
    const d2 = { set: {}, unset: [] }; for (const [p, v] of [['fi.loss_arises_from_noncompliance', fv], ['telco.loss_arises_from_noncompliance', tv]]) { if (v === undefined) d2.unset.push(p); else d2.set[p] = v; }
    push({ population: 'tier-judgments', variedClause: `${w.d} x fi.loss_arises_from_noncompliance x telco.loss_arises_from_noncompliance`, witnessOf: { [w.d]: w.tok }, base: 'cases.mjs#base', delta: mergeDelta(w.delta, d2), resolutions: clone(resolved) }); tjCross++;
  }
}
construction.tier_judgments = { paths: TIER_JUDGMENT_PATHS, witnesses: allWitnesses.length, single_path_claims: tjSingle, causation_cross_claims: tjCross };
for (let k = results.length; k < claims.length; k++) results.push(runClaim(claims[k]));
// credits: srf/7.13 and 7.14 (the FI or Telco credits the loss) arise only on fi_bears / telco_bears,
// which no single-clause sample of their 48 read paths reached, so `affirmative` was never reached
// anywhere for them on the second full run. Every claim so far whose outcome attaches the loss is
// re-run with the crediting flag through its domain.
let creditClaims = 0;
claims.slice().forEach((c, k) => {
  const r = results[k]; if (!r || c.base === null) return;
  const path = r.wf.outcome === 'fi_bears' ? 'fi.credited_total_loss' : r.wf.outcome === 'telco_bears' ? 'telco.credited_total_loss' : null;
  if (!path) return;
  for (const v of domainOf(path)) { push({ population: 'credits', variedClause: `${r.wf.outcome} x ${path}`, base: 'cases.mjs#base', delta: mergeDelta(c.delta, v === undefined ? { set: {}, unset: [path] } : { set: { [path]: v }, unset: [] }), resolutions: clone(c.resolutions) }); creditClaims++; }
});
construction.credits = { rule: 'every claim of an earlier population whose outcome is fi_bears or telco_bears, with the crediting flag of that party varied over its domain', claims: creditClaims };
for (let k = results.length; k < claims.length; k++) results.push(runClaim(claims[k]));
construction.pairwise = { duties: WATERFALL_DUTIES, witnesses_per_duty: Object.fromEntries(WATERFALL_DUTIES.map((d) => [d, [...witnesses[d].keys()]])), pairs, claims: pairClaims, merge_rule: 'the second duty\'s witness delta is applied after the first; on a shared path the second wins' };

// ─── outputs ────────────────────────────────────────────────────────────────────────────────────
claims.forEach((c, k) => {
  const r = results[k];
  corpusLines.push(JSON.stringify({ claimId: c.claimId, population: c.population, ...(c.variedClause ? { variedClause: c.variedClause } : {}), ...(c.witnessOf ? { witnessOf: c.witnessOf } : {}), base: c.base, ...(c.base === null ? { facts: c.facts } : { delta: c.delta }), resolutions: c.resolutions, ran: r !== null }));
  if (r) recordLines.push(JSON.stringify(r.record));
});
const header = JSON.stringify({ $note: 'SYNTHETIC claim corpus over the SRF register. One claim per line; facts are a delta over cases.mjs `base` (pinned by sha256 below) or, for population random, stated in full. No fact was chosen to reach an outcome.', labels: KEY_LABELS, register: registerRef, base_sha256: baseDigest, seed: SEED, created, N: claims.length });
const corpusBytes = Buffer.from(header + '\n' + corpusLines.join('\n') + '\n');
const recordsBytes = Buffer.from(recordLines.join('\n') + '\n');
writeFileSync(`${OUT}corpus.jsonl.gz`, gzipSync(corpusBytes, { level: 9 }));
writeFileSync(`${OUT}records.jsonl.gz`, gzipSync(recordsBytes, { level: 9 }));
for (const [k, ex] of exhibits) writeFileSync(`${OUT}exhibits/${ex.claimId}.json`, JSON.stringify(ex, null, 1) + '\n');

// measurements, derived here from the results and written as data for the annex to read
const ran = results.filter(Boolean);
const count = (arr, f) => { const m = {}; for (const x of arr) { const k = f(x); m[k] = (m[k] ?? 0) + 1; } return m; };
const inScope = ran.filter((r) => r.tiers[SCOPE] === 'relevant_claim');
const notClosedByBreach = inScope.filter((r) => !['fi_bears', 'telco_bears'].includes(r.wf.outcome));
const headline = ran.filter((r) => r.wf.outcome === 'undetermined' && ['fi', 'telco'].includes(r.wf.tier));
const perDuty = {};
for (const id of DUTY_CLAUSES) perDuty[id] = { duty_holder: byMeta[id].duty_holder, tier: byMeta[id].tier, all: count(ran, (r) => r.duties[id]), single_clause: count(ran.filter((r, k) => claims[results.indexOf(r)]?.variedClause === id), (r) => r.duties[id]) };
const perDutySingle = {};
claims.forEach((c, k) => { const r = results[k]; if (!r || c.population !== 'single-clause') return; const id = c.variedClause; (perDutySingle[id] ??= {}); const st = TIER_LEVEL.has(id) ? r.tiers[id] : r.duties[id]; perDutySingle[id][st] = (perDutySingle[id][st] ?? 0) + 1; });
const reachable = {};
for (const id of DUTY_HOLDER_CLAUSES) reachable[id] = Object.keys(perDutySingle[id] ?? {}).sort();
const measurement = {
  $note: 'Derived by build.mjs from the run; every count names its population. SYNTHETIC.',
  created, seed: SEED, register: registerRef, recordVersion: RECORD_VERSION,
  N: { constructed: claims.length, ran: ran.length, did_not_run: claims.length - ran.length },
  by_population: count(claims, (c) => c.population),
  by_population_ran: count(claims.filter((c, k) => results[k]), (c) => c.population),
  construction,
  outcome: { all: count(ran, (r) => r.wf.outcome), in_scope: count(inScope, (r) => r.wf.outcome), by_population: Object.fromEntries(Object.keys(measurement_populations()).map((p) => [p, count(ran.filter((r, k) => claims[results.indexOf(r)].population === p), (r) => r.wf.outcome)])) },
  tier: { stopped_or_closed: count(ran, (r) => `${r.wf.outcome}@${r.wf.stoppedAt ?? r.wf.closedBy}`) },
  headline: {
    definition: 'claims whose outcome is undetermined with the waterfall stopped at the FI or Telco tier: the consumer-bears outcome (account_holder_bears) requires affirmative non-liability findings on both tiers, and one was not computable',
    numerator: headline.length,
    denominators: { all_claims_ran: ran.length, in_scope: inScope.length, in_scope_not_closed_by_breach: notClosedByBreach.length },
    by_tier: count(headline, (r) => r.wf.tier),
    by_waiting: count(headline.flatMap((r) => r.wf.open.map((o) => o.waiting)), (w) => w),
    open_clauses: count(headline.flatMap((r) => r.wf.open.map((o) => o.clause)), (c) => c),
    by_population: count(headline.map((r) => claims[results.indexOf(r)].population), (p) => p),
  },
  duty_status_vocabulary: { ...STATUS, not_evaluated: ['(record carries no result: refused, no result domain, or awaiting a person)'], note: 'not_applicable is carried as its own class: a duty that never arose is neither discharged nor breached (register: CONDITIONAL), and the brief\'s four classes have no slot for it.' },
  per_duty_single_clause: perDutySingle,
  per_duty_all_claims: Object.fromEntries(DUTY_CLAUSES.map((id) => [id, count(ran, (r) => r.duties[id])])),
  results_reached_single_clause: reachable,
  consumer_bears_resting_on_non_affirmative_duty_state: {
    definition: 'account_holder_bears outcomes issued while a waterfall duty (or fi-complied-all) was undetermined, or while a duty breach was established (6.2 row: breach, causation denied). Both are the register\'s encoded semantics (parity 0), measured in the dangerous direction.',
    with_undetermined_duty: { count: stats.consumer_bears_with_undetermined_duty.length, of_account_holder_bears: ran.filter((r) => r.wf.outcome === 'account_holder_bears').length, of_all: ran.length, claimIds_first_10: stats.consumer_bears_with_undetermined_duty.slice(0, 10) },
    with_established_breach: { count: stats.consumer_bears_with_established_breach.length, of_account_holder_bears: ran.filter((r) => r.wf.outcome === 'account_holder_bears').length, of_all: ran.length, claimIds_first_10: stats.consumer_bears_with_established_breach.slice(0, 10) },
  },
  duty_status_notes: STATUS_NOTES,
  parity: { compared: ran.length + stats.parity_disagreements.filter((d) => d.hand_threw).length, disagreements: stats.parity_disagreements },
  throws: stats.throws,
  invariant_failures: stats.invariant_failures,
  exhibits: [...exhibits.values()].map((e) => ({ claimId: e.claimId, outcome: e.mapping.outcome, at: e.mapping.stoppedAt ?? e.mapping.closedBy })),
};
function measurement_populations() { return count(claims, (c) => c.population); }
writeFileSync(`${OUT}measurement.json`, JSON.stringify(measurement, null, 1) + '\n');

// key destruction (D1): the private half lived only in this process; release the reference and record it
keyPair = null;
const destroyed_at = new Date().toISOString();   // the one clock read here: the moment of destruction, which is an event of this process, not a fact of any claim
const manifest = {
  $note: 'SYNTHETIC corpus manifest. The signing key is ephemeral; its private half was never written and was released before this manifest was written.',
  labels: KEY_LABELS, created, register: registerRef, recordVersion: RECORD_VERSION, seed: SEED,
  key: { did: key.did, verificationMethod: key.verificationMethod, publicKeyMultibase: key.publicKeyMultibase, algorithm: 'Ed25519', cryptosuite: 'eddsa-jcs-2022', labels: KEY_LABELS, custody: 'ephemeral, in-process; no production custody contact', ledger: 'SCALE signing, 2026-08-25', private_half: { written_to_disk: false, released: true, destroyed_at } },
  files: { 'corpus.jsonl (uncompressed bytes)': sha256hex(corpusBytes), 'corpus.jsonl.gz': sha256hex(readFileSync(`${OUT}corpus.jsonl.gz`)), 'records.jsonl (uncompressed bytes)': sha256hex(recordsBytes), 'records.jsonl.gz': sha256hex(readFileSync(`${OUT}records.jsonl.gz`)), 'measurement.json': sha256hex(readFileSync(`${OUT}measurement.json`)) }, bytes: { corpus_jsonl: corpusBytes.length, records_jsonl: recordsBytes.length },
  counts: { claims: claims.length, records: recordLines.length, exhibits: exhibits.size },
};
writeFileSync(`${OUT}manifest.json`, JSON.stringify(manifest, null, 1) + '\n');
console.log(`claims ${claims.length}, ran ${ran.length}, records ${recordLines.length}, exhibits ${exhibits.size}`);
console.log(`outcomes`, measurement.outcome.all);
console.log(`headline ${headline.length} / ${ran.length} all, / ${inScope.length} in scope, / ${notClosedByBreach.length} in scope not closed by breach`);
console.log(`parity disagreements ${stats.parity_disagreements.length}; throws ${Object.keys(stats.throws).length} classes; invariant failures ${stats.invariant_failures.length}`);
if (stats.parity_disagreements.length || stats.invariant_failures.length) { console.error('STOP: engine behaviour diverges from register semantics; see measurement.json'); process.exit(1); }
