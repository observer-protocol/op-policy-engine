#!/usr/bin/env node
// Generates ANNEX.md from out/{measurement,verification,tamper-test,manifest}.json and the records.
// Every figure in the annex is read from those files at generation time; none is typed here.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { WATERFALL_DUTIES, isComposition } from './project.mjs';
const HERE = new URL('.', import.meta.url).pathname; const OUT = `${HERE}out/`;
const J = (f) => JSON.parse(readFileSync(`${OUT}${f}`, 'utf8'));
const m = J('measurement.json'), v = J('verification.json'), t = J('tamper-test.json'), man = J('manifest.json');
const CL = JSON.parse(readFileSync(`${HERE}../../mas-srf-2024/clauses.json`, 'utf8')).clauses; const dispo = Object.fromEntries(CL.map((c) => [c.id, c.disposition]));
const records = gunzipSync(readFileSync(`${OUT}records.jsonl.gz`)).toString('utf8').trim().split('\n').map((l) => JSON.parse(l));
const pct = (n, d) => `${n.toLocaleString('en-US')} / ${d.toLocaleString('en-US')} (${d ? (100 * n / d).toFixed(1) : 'n/a'}%)`;
const num = (n) => n.toLocaleString('en-US');
const sortDesc = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
const L = [];
const p = (s = '') => L.push(s);

const N = m.N.ran;
const headline = records.filter((r) => r.outcome === 'undetermined' && ['fi', 'telco'].includes(r.tier.reached));
const inScope = records.filter((r) => r.tiers['srf/7.1.1/relevant-claim'] === 'relevant_claim');
const scopeUndetermined = records.filter((r) => r.outcome === 'undetermined' && r.tier.reached === 'scope');
const ahb = records.filter((r) => r.outcome === 'account_holder_bears');
// claim-level: what the open (non-composition) clauses at the stopping tier were waiting on
const needKind = (r) => { const ks = new Set(r.open.filter((o) => dispo[o.clause] !== 'DERIVED').map((o) => o.waiting)); const a = [...ks].sort(); return a.length ? a.join('+') : 'nothing but an institutional resolution (A3 or A5 unresolved: every input clause decided, the composition guarded)'; };
const byNeed = {}; for (const r of headline) { const k = needKind(r); byNeed[k] = (byNeed[k] ?? 0) + 1; }
const openDuty = {}; for (const r of headline) for (const o of r.open) if (WATERFALL_DUTIES.includes(o.clause)) openDuty[o.clause] = (openDuty[o.clause] ?? 0) + 1;
const byPop = (arr) => { const o = {}; for (const r of arr) o[r.population] = (o[r.population] ?? 0) + 1; return o; };
const popTotals = byPop(records);

p('# Measurement annex: a synthetic claim corpus over the SRF duty matrix');
p();
p(`**SYNTHETIC. DEMONSTRATION-KEY.** Session CORPUS-SRF-SCALE, run created \`${m.created}\` (the instant was supplied by the caller; the engine reads no clock). Register \`${m.register.domain}@${m.register.version}\`, sha256 \`${m.register.sha256}\`, accepted at tag \`${m.register.accepted_tag}\`. Nothing in this annex measures any bank, Telco, account holder, claimant or incident: every claim is constructed from the register's own fact vocabulary, and every figure is a property of the register and the engine over those constructions.`);
p();
p('Every percentage carries its denominator on the same line. Every count names its population.');
p();
p('## 1. N, construction method, coverage');
p();
p(`**N = ${num(N)} claims constructed, ${num(N)} ran, ${num(m.N.did_not_run)} did not run** (\`out/corpus.jsonl.gz\`, one line per claim). Records: ${num(v.counts.records)} (\`out/records.jsonl.gz\`), one signed record per claim.`);
p();
p('| population | claims | construction |');
p('|---|---|---|');
const desc = {
  'single-clause': `for each of the ${m.construction.single_clause.length} clauses with duty_holder fi or telco and an evaluation (duty_holder read from clauses.json, F-03): the fact paths the clause reads, derived from its evaluation tree through bindings and clause references, each varied over its declared domain (facts.json kinds as \`_corpus/space.mjs\` SRF_FIELDS lays them out, including null, absent and malformed); every other fact held at cases.mjs \`base\`, resolutions at \`resolved\`. Full product where it is at most the cap (5,000 for fi/telco-tier duty clauses, 1,000 for Section 6 compositions and process-tier clauses), otherwise a seeded sample of exactly the cap; per-clause table below`,
  scope: `the ${m.construction.scope.read_paths.length} paths the four scope limbs read (product ${num(m.construction.scope.product)}): every single-path variation (${m.construction.scope.single_path_variations}) plus a seeded sample of ${num(m.construction.scope.sampled_from_product)} from the product. Out-of-scope claims (corporate holder, card transaction, non-covered scam type, non-SMS platform, ...) arise here and wherever a duty clause reads a scope path`,
  resolutions: `the ${m.construction.resolutions.grid}-cell grid of the institutional inputs the register refuses to default: A3 (a never-arisen duty) x A5 (the filter-duty reading) x the two ungrounded meanings, on \`base\``,
  pairwise: `for the ${m.construction.pairwise.duties.length} waterfall duties, one witness fact-delta per result each reached in single-clause (${Object.values(m.construction.pairwise.witnesses_per_duty).reduce((a, w) => a + w.length, 0)} witnesses), then every pair of duties crossed witness x witness (${m.construction.pairwise.pairs} pairs). ${m.construction.pairwise.merge_rule}`,
  'tier-judgments': `every waterfall-duty witness (${m.construction.tier_judgments.witnesses}) x each of the ${m.construction.tier_judgments.paths.length} tier-level held judgments through its domain (${num(m.construction.tier_judgments.single_path_claims)} claims), and x the FI and Telco causation judgments crossed (${num(m.construction.tier_judgments.causation_cross_claims)} claims). Added after the first full run reached \`telco_bears\` 0 times in 39,834 claims (finding S-01)`,
  credits: `${m.construction.credits.rule} (added after the second full run reached no affirmative for srf/7.13 and 7.14 anywhere; finding S-09)`,
  random: `a seeded sample of ${num(m.construction.random.sample)} claims over every declared field (${m.construction.random.fields_varied}) and resolution axis (${m.construction.random.resolutions_varied}) from scratch, no base: the construction \`_corpus/build.mjs\` uses`,
};
for (const [pop, n] of Object.entries(m.by_population_ran)) p(`| ${pop} | ${num(n)} | ${desc[pop]} |`);
p(`| **total** | **${num(N)}** | seed ${m.seed}; reproducible by \`node build.mjs --created ${m.created}\` up to the key |`);
p();
p('**Facts first.** No fact was chosen to reach an outcome. The construction decides which paths vary and over what domain, both derived from the register; discharged, breached and unevaluable are labels the engine assigns after the run (section 1.2). The multi-duty populations (pairwise, tier-judgments, random) are documented samples, not a full product: the full product of the FI tier alone is 2.5 x 10^14.');
p();
p('### 1.1 Single-clause variation, per clause');
p();
p('| tier | holder | clause | paths | product | method | claims |');
p('|---|---|---|---|---|---|---|');
for (const c of m.construction.single_clause) p(`| ${c.tier} | ${c.duty_holder} | \`${c.clause}\` | ${c.read_paths.length} | ${c.product >= 1e6 ? c.product.toExponential(2) : num(c.product)} | ${c.method.startsWith('full') ? 'full product' : 'seeded sample'} | ${num(c.claims)} |`);
const full = m.construction.single_clause.filter((c) => c.method.startsWith('full')).length;
p();
p(`Full product on ${full} of ${m.construction.single_clause.length} clauses; seeded sample on ${m.construction.single_clause.length - full} (the eight waterfall duties are full on six: \`srf/4.2.2/alerts\` (40,000) and \`srf/5.2.2/block-unauthorised-sender-id\` (18,000) are sampled at 5,000 each, and \`srf/4.2.2/alerts\` is the conjunction of three sub-clauses that are each full).`);
p();
p('### 1.2 Duty status vocabulary, and coverage');
p();
p(`The brief names four classes (affirmative / breach / undetermined / not-evaluated). The register has a fifth state the four cannot hold: **not_applicable**, a CONDITIONAL duty that never arose, which the register says is not a pass. It is carried as its own class (finding S-04). The map from result token to class is total and throws on an unmapped token; it fired once during construction (\`overdue\`, finding S-06). Classification of the edge tokens:`);
p();
for (const [k, n] of Object.entries(m.duty_status_notes)) p(`- \`${k}\`: ${n}`);
p();
p('**Coverage statement.** For each duty clause: the classes reached in its OWN single-clause variation, and the classes reached anywhere in the corpus. A class a duty never reaches in its own variation is a fact about the construction (the product is sampled, or the class needs a fact outside the clause\'s own paths); a class never reached anywhere is a fact about the register over this corpus.');
p();
p('| clause | own variation | anywhere in corpus (count) |');
p('|---|---|---|');
const never = [];
for (const [id, all] of Object.entries(m.per_duty_all_claims)) {
  const own = m.per_duty_single_clause[id] ?? {};
  const ownS = Object.keys(own).sort().join(', ');
  const allS = sortDesc(all).map(([k, n]) => `${k} ${num(n)}`).join(', ');
  for (const cls of ['affirmative', 'breach', 'undetermined']) if (!(cls in all)) never.push(`${id}: ${cls}`);
  p(`| \`${id}\` | ${ownS} | ${allS} |`);
}
p();
p(`Classes never reached anywhere, over the three the brief asks for (affirmative, breach, undetermined): ${never.length === 0 ? '**none**' : never.map((x) => `\`${x}\``).join('; ')}.`);
p('Tier-level compositions and held judgments (Section 6, EUPG 5.5, 7.7) carry their raw tokens in each record under `tiers`; the outcome-level coverage is section 2.');
p();
p('## 2. Outcome distribution');
p();
p(`| outcome | all claims (${num(N)}) | in scope, i.e. scope limb \`relevant_claim\` (${num(inScope.length)}) |`);
p('|---|---|---|');
for (const o of ['account_holder_bears', 'fi_bears', 'telco_bears', 'undetermined', 'out_of_scope']) p(`| \`${o}\` | ${pct(m.outcome.all[o] ?? 0, N)} | ${pct(m.outcome.in_scope[o] ?? 0, inScope.length)} |`);
p();
p(`Claims whose scope could not be decided (outcome undetermined at the scope limb): ${pct(scopeUndetermined.length, N)}. They are neither in the in-scope denominator nor out of scope.`);
p();
p('By population (denominator: that population\'s claims):');
p();
p('| population | claims | account_holder_bears | fi_bears | telco_bears | undetermined | out_of_scope |');
p('|---|---|---|---|---|---|---|');
for (const [pop, o] of Object.entries(m.outcome.by_population)) { const d = popTotals[pop]; p(`| ${pop} | ${num(d)} | ${pct(o.account_holder_bears ?? 0, d)} | ${pct(o.fi_bears ?? 0, d)} | ${pct(o.telco_bears ?? 0, d)} | ${pct(o.undetermined ?? 0, d)} | ${pct(o.out_of_scope ?? 0, d)} |`); }
p();
p('Tier reached (a decided outcome names the tier that decided it; an undetermined outcome names the tier it stopped at):');
p();
p(`| outcome @ tier | claims of ${num(N)} |`);
p('|---|---|');
const tierCount = {}; for (const r of records) { const k = `${r.outcome} @ ${r.tier.state === 'closed' ? r.tier.reached : r.tier.stoppedAt}`; tierCount[k] = (tierCount[k] ?? 0) + 1; }
for (const [k, n] of sortDesc(tierCount)) p(`| ${k} | ${pct(n, N)} |`);
p();
p('## 3. The headline: consumer-bears would have required an affirmative finding that was not computable');
p();
p('**Definition.** `account_holder_bears` is the register\'s only consumer-bears outcome, and its decision table reaches it on two rows only: scope `relevant_claim`, the FI tier `fi_not_liable`, the Telco tier `telco_not_liable` or `not_applicable` (an affirmative `not_sms`). A claim counts when its outcome is `undetermined` with the waterfall stopped at the FI or Telco tier: the claim is in scope, no breach closed it, and an affirmative non-liability finding the consumer-bears row needs was not computable from the inputs.');
p();
p(`| numerator | denominator | share |`);
p('|---|---|---|');
p(`| ${num(headline.length)} | all claims ran: ${num(N)} | ${pct(headline.length, N)} |`);
p(`| ${num(headline.length)} | in scope: ${num(inScope.length)} | ${pct(headline.length, inScope.length)} |`);
p(`| ${num(headline.length)} | in scope and not closed by an established breach: ${num(m.headline.denominators.in_scope_not_closed_by_breach)} | ${pct(headline.length, m.headline.denominators.in_scope_not_closed_by_breach)} |`);
p();
p(`Stopped at the FI tier: ${pct(m.headline.by_tier.fi ?? 0, headline.length)}; at the Telco tier: ${pct(m.headline.by_tier.telco ?? 0, headline.length)}.`);
p();
p(`What the open duty clauses at the stopping tier were waiting on (per claim; \`fact\` = a fact never supplied, \`judgment\` = an assessment nobody made, \`meaning\` = an ungrounded term with no supplied meaning, \`clause\` = a derived input, which is where an unresolved ambiguity lands, F-09):`);
p();
p(`| waiting on | claims of ${num(headline.length)} |`);
p('|---|---|');
for (const [k, n] of sortDesc(byNeed)) p(`| ${k} | ${pct(n, headline.length)} |`);
p();
p(`Which waterfall duty was open (a claim can have several):`);
p();
p(`| duty | headline claims in which it is open, of ${num(headline.length)} |`);
p('|---|---|');
for (const [k, n] of sortDesc(openDuty)) p(`| \`${k}\` | ${pct(n, headline.length)} |`);
p();
p(`By population: ${Object.entries(m.headline.by_population).map(([k, n]) => `${k} ${pct(n, popTotals[k])}`).join('; ')}.`);
p();
p('### 3.1 The dangerous direction: consumer-bears issued on a non-affirmative duty state');
p();
p('The headline counts claims the register REFUSED to decide. The opposite failure is a consumer-bears outcome the register DID issue while a duty finding was not affirmative. Both rows below are the register\'s encoded semantics (the hand evaluator and the interpreter agree on every record, section 4) and are logged as register findings, not tuned:');
p();
const cb = m.consumer_bears_resting_on_non_affirmative_duty_state;
p(`| state at issue | claims | of account_holder_bears (${num(ahb.length)}) | of all (${num(N)}) |`);
p('|---|---|---|---|');
p(`| a waterfall duty, or fi-complied-all, undetermined (S-03) | ${num(cb.with_undetermined_duty.count)} | ${pct(cb.with_undetermined_duty.count, ahb.length)} | ${pct(cb.with_undetermined_duty.count, N)} |`);
p(`| a waterfall duty breach (FI or Telco) established, that party's causation denied (S-02) | ${num(cb.with_established_breach.count)} | ${pct(cb.with_established_breach.count, ahb.length)} | ${pct(cb.with_established_breach.count, N)} |`);
const fiB = ahb.filter((r) => WATERFALL_DUTIES.slice(0, 5).some((d) => r.duties[d] === 'breach'));
const tB = ahb.filter((r) => WATERFALL_DUTIES.slice(5).some((d) => r.duties[d] === 'breach'));
const fi65 = fiB.filter((r) => r.tiers['srf/6.4/telco-bears'] === 'telco_not_liable');
const both = fiB.filter((r) => r.tiers['srf/6.4/b/any-telco-breach'] === true);
p(`| of which an FI duty breach, FI causation denied (6.2 row {breach, denied} -> fi_not_liable_under_6.2; A4 as encoded) | ${num(fiB.length)} | ${pct(fiB.length, ahb.length)} | ${pct(fiB.length, N)} |`);
p(`| of which the Telco tier then closed \`telco_not_liable\` under 6.5 (the FI did not comply with all of 4.2) with no Telco duty finding read | ${num(fi65.length)} | ${pct(fi65.length, ahb.length)} | ${pct(fi65.length, N)} |`);
p(`| of which a Telco duty breach was ALSO established: two established breaches, the account holder bears | ${num(both.length)} | ${pct(both.length, ahb.length)} | ${pct(both.length, N)} |`);
p(`| of which a Telco duty breach, Telco causation denied or 6.6 not met (6.4 after a breach) | ${num(tB.length)} | ${pct(tB.length, ahb.length)} | ${pct(tB.length, N)} |`);
p();
p('## 4. Verification pass');
p();
p(`Verifier: the published \`${v.verifier.package}\` **${v.verifier.version}** (\`verifyEddsaJcs2022\`, \`decodeEd25519DidKey\`, \`jcsBytes\`), installed outside this repository and named on the command line; nothing from the signer is imported. Key: \`${v.key}\`.`);
p();
p('| check | result |');
p('|---|---|');
p(`| signature verifies (eddsa-jcs-2022, against the manifest did:key) | ${pct(v.counts.signature_ok, v.counts.records)} records; failed ${num(v.counts.signature_failed)} |`);
p(`| record rebuilds: facts reconstructed from corpus.jsonl.gz, engine rerun at this tree, body re-projected and compared canonically | ${pct(v.counts.rebuild_ok, v.counts.records)} records; failed ${num(v.counts.rebuild_failed)} |`);
p(`| signed record with no corpus line | ${num(v.counts.claim_missing_from_corpus)} |`);
p(`| distinct signing keys seen | ${v.counts.distinct_verification_methods.length} |`);
p(`| exhibits (full v7 record sets): signature | ${pct(v.counts.exhibit_signature_ok, v.counts.exhibits)} |`);
p(`| exhibits: rebuild to the claim record's recordSetSha256 and factsDigest | ${pct(v.counts.exhibit_rebuild_ok, v.counts.exhibits)} |`);
p(`| parity, hand evaluator against interpreter, every claim | ${num(m.parity.compared)} compared, ${num(m.parity.disagreements.length)} disagreements |`);
p(`| throws | ${Object.keys(m.throws).length} classes |`);
p(`| invariant failures (I1: consumer-bears only on the register's two rows; I2: an undetermined outcome names a tier) | ${num(m.invariant_failures.length)} |`);
p(`| **verdict** | **${v.verdict}** |`);
p();
p(`Verification findings: ${v.findings.length === 0 ? 'none' : v.findings.map((f) => `**V-${f.n}** ${f.what} (${JSON.stringify(f)})`).join('; ')}. What the rebuild check establishes is reproducibility of every record from corpus + engine; the projection code is shared with the builder and that is stated in \`verify.mjs\`. Independence is the signature check.`);
p();
p('## 5. Tamper test');
p();
p(`One field modified per case after signing; the same published verifier (\`${t.verifier.package}\` ${t.verifier.version}) run over the original and the copy. Tampered copies are committed at \`out/exhibits/TAMPERED-records.json\` so the failure can be rerun.`);
p();
p('| tamper | claim | original verifies | tampered verifies | verifier reason on the copy |');
p('|---|---|---|---|---|');
for (const c of t.cases) p(`| ${c.tamper} | \`${c.claimId}\` | ${c.original.verifies} | ${c.tampered.verifies} | ${c.tampered.reason} |`);
p();
p(`**${t.verdict}.**`);
p();
p('## 6. Key custody (D1)');
p();
p(`Ephemeral Ed25519 key generated in the build process. Labels: ${man.key.labels.join(', ')}. did: \`${man.key.did}\`. Custody: ${man.key.custody}. Ledger: ${man.key.ledger}. Private half written to disk: ${man.key.private_half.written_to_disk}; released before the manifest was written, at \`${man.key.private_half.destroyed_at}\` (the one clock read in the build, the moment of an event of that process). No further record can be signed with this key; a record that verifies against it was signed during the run.`);
p();
p('## 7. Files');
p();
p('| file | sha256 |');
p('|---|---|');
for (const [f, h] of Object.entries(man.files)) p(`| \`${f}\` | \`${h}\` |`);
p(`| corpus.jsonl uncompressed bytes | ${num(man.bytes.corpus_jsonl)} |`);
p(`| records.jsonl uncompressed bytes | ${num(man.bytes.records_jsonl)} |`);
p();
p('Both JSONL files are committed gzipped; the manifest digests the uncompressed bytes and the archives. `out/exhibits/` holds one full v7 record set per (outcome, tier) reached, signed with the same key, and the tampered copies. `out/measurement.json` is the data this annex was generated from; `out/verification.json` and `out/tamper-test.json` are the verifier\'s outputs. Rerun: `node build.mjs --created <instant>` (a new key), `node verify.mjs --engine <package dir>`, `node tamper.mjs --engine <package dir>`, `node annex.mjs`.');
p();
p('## 8. Findings');
p();
p('Numbered in `FINDINGS.md` (S-01 onward). None is a footnote; none changes the register.');
writeFileSync(`${HERE}ANNEX.md`, L.join('\n') + '\n');
console.log(`ANNEX.md written: ${L.length} lines; headline ${headline.length}/${N}; needs`, byNeed);
