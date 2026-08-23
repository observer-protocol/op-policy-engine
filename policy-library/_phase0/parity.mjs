#!/usr/bin/env node
/**
 * PARITY. Compares a candidate implementation's output against the frozen oracle, BYTE FOR BYTE.
 *
 *   node parity.mjs --candidate=hand          the hand-written evaluators. An identity check: it
 *                                             establishes that the frozen bytes reproduce and that
 *                                             the replay path feeds the same inputs. It is not a
 *                                             test of anything else and must not be reported as one.
 *   node parity.mjs --candidate=interpreter   the generic interpreter reading each register.
 *
 * ─── WHAT IDENTICAL MEANS HERE ──────────────────────────────────────────────────────────────────
 *
 * `JSON.stringify(candidate) === frozen line`. That compares the clause set, the key order, every
 * result token, every note string and every extra field. A candidate that computes every result
 * correctly and emits the clauses in a different order FAILS, and that is deliberate: the register
 * fixes the order in which a determination is reported and a reader compares rows by position.
 *
 * ─── THREE FAILURES THAT ARE NOT PARITY FAILURES, AND ARE REPORTED SEPARATELY ───────────────────
 *
 *   POPULATION MOVED     the sampled input stream no longer digests to what was frozen, so the
 *                        candidate and the oracle were not asked the same question. Reported as a
 *                        refusal to state a parity result, never as a pass and never as a failure.
 *   ORACLE ALTERED       a frozen file no longer matches its manifest digest.
 *   ORACLE UNREPRODUCIBLE  on a wide-population mismatch the hand-written evaluator is re-run for
 *                        that record and its digest checked against the frozen one. If THAT
 *                        disagrees, the evaluator has moved since the freeze and no statement about
 *                        the candidate is made for that record.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DOMAINS, SEED, LIB, sampledInputs, corpusInputs, sha } from './populations.mjs';

const ORACLE = new URL('./oracle/', import.meta.url).pathname;
const M = JSON.parse(readFileSync(ORACLE + 'MANIFEST.json', 'utf8'));
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=').slice(1).join('=');
const CANDIDATE = arg('candidate', 'hand');
const ONLY = arg('domain', '');

let failures = 0, refusals = 0, compared = 0;
const say = (s) => console.log(s);
const FAIL = (s) => { failures++; console.log(s); };

// ─── locating a divergence inside two output strings ────────────────────────────────────────────
function describeDivergence(oracleLine, candLine) {
  const lines = [];
  let a, b;
  try { a = JSON.parse(oracleLine); } catch { return ['      oracle line is not parseable JSON; the divergence is in the bytes themselves']; }
  try { b = JSON.parse(candLine); } catch { return ['      candidate line is not parseable JSON']; }
  const ka = Object.keys(a), kb = Object.keys(b);
  const missing = ka.filter((k) => !kb.includes(k));
  const extra = kb.filter((k) => !ka.includes(k));
  if (missing.length) lines.push(`      clauses the candidate did not emit: ${missing.join(', ')}`);
  if (extra.length) lines.push(`      clauses the candidate emitted and the oracle does not have: ${extra.join(', ')}`);
  for (const k of ka) {
    if (!kb.includes(k)) continue;
    const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
    if (x !== y) {
      lines.push(`      FIRST DIVERGING CLAUSE  ${k}`);
      lines.push(`        oracle    ${x}`);
      lines.push(`        candidate ${y}`);
      return lines;
    }
  }
  if (!missing.length && !extra.length) {
    const posA = ka.join(','), posB = kb.join(',');
    if (posA !== posB) {
      const i = ka.findIndex((k, n) => kb[n] !== k);
      lines.push(`      every clause value agrees; THE KEY ORDER DIFFERS, first at position ${i}`);
      lines.push(`        oracle    ${ka[i]}`);
      lines.push(`        candidate ${kb[i]}`);
    } else {
      lines.push('      values and key order agree; the difference is in the serialised bytes only');
    }
  }
  return lines;
}

function reportMismatch(domain, population, index, input, oracleLine, candLine, oracleProvenance) {
  FAIL(`  FAIL  ${population}: record ${index} diverges`);
  say(`      oracle value provenance: ${oracleProvenance}`);
  for (const l of describeDivergence(oracleLine, candLine)) say(l);
  say(`      input facts       ${JSON.stringify(input.facts)}`);
  say(`      input resolutions ${JSON.stringify(input.resolutions)}`);
  say(`      oracle line    (${oracleLine.length} bytes) ${oracleLine.slice(0, 220)}${oracleLine.length > 220 ? '…' : ''}`);
  say(`      candidate line (${candLine.length} bytes) ${candLine.slice(0, 220)}${candLine.length > 220 ? '…' : ''}`);
}

// ─── candidates ─────────────────────────────────────────────────────────────────────────────────
async function loadCandidate(d) {
  if (CANDIDATE === 'hand') {
    const ev = (await import(`${LIB}/${d.dir}/evaluate.mjs`)).evaluate;
    return (f, r) => ev(f, r);
  }
  // A HARNESS SELF-TEST FACILITY, not a candidate anyone would ship. It is the hand-written
  // evaluator with exactly one result token rewritten, and it exists so that the deep half of the
  // sampled population, where the frozen side is a digest rather than bytes, is shown catching a
  // real divergence before anything is asserted on the strength of it passing.
  if (CANDIDATE === 'mutant') {
    const spec = arg('mutate', '');
    const [clause, from, to] = spec.split(':');
    if (!clause || from === undefined || to === undefined) throw new Error('--candidate=mutant needs --mutate=<clauseId>:<from>:<to>');
    const ev = (await import(`${LIB}/${d.dir}/evaluate.mjs`)).evaluate;
    return (f, r) => {
      const o = ev(f, r);
      if (o[clause] !== undefined && o[clause].result === from) o[clause] = { ...o[clause], result: to };
      return o;
    };
  }
  if (CANDIDATE === 'interpreter') {
    const { interpret, loadRegister } = await import(`${LIB}/_interpreter/interpret.mjs`);
    const reg = loadRegister(`${LIB}/${d.dir}/register.json`);
    return (f, r) => interpret(reg, f, r);
  }
  throw new Error(`unknown candidate: ${CANDIDATE}`);
}

// ─── file integrity, reported and NOT allowed to pre-empt the record comparison ────────────────
say(`\nORACLE  commit ${M.captured_at_commit}  branch ${M.captured_on_branch}`);
say(`CANDIDATE  ${CANDIDATE}\n`);
const altered = [];
for (const [name, meta] of Object.entries(M.files)) {
  const got = sha(readFileSync(ORACLE + name));
  if (got !== meta.sha256) altered.push(name);
}
if (altered.length) {
  failures++;
  say(`ORACLE ALTERED SINCE CAPTURE: ${altered.length} file(s) no longer match the manifest digest`);
  for (const f of altered) say(`  ${f}`);
  say('  The record comparison below still runs, because a frozen file that was edited must be');
  say('  caught by the comparison it feeds, not only by a digest beside it.\n');
}

for (const d of DOMAINS) {
  if (ONLY && ONLY !== d.name) continue;
  const run = await loadCandidate(d);
  const dm = M.domains[d.name];
  say(`${d.name.toUpperCase()}  (${dm.clauses} clauses)`);

  // ── fixtures ────────────────────────────────────────────────────────────────────────────────
  {
    const inputs = JSON.parse(readFileSync(`${ORACLE}${d.name}.fixtures.inputs.json`, 'utf8'));
    const oracle = readFileSync(`${ORACLE}${d.name}.fixtures.out.jsonl`, 'utf8').split('\n').filter(Boolean);
    let bad = 0;
    for (let i = 0; i < oracle.length; i++) {
      compared++;
      let line;
      try { line = JSON.stringify(run(inputs[i].facts, inputs[i].resolutions)); }
      catch (e) { line = `<<THREW: ${e.message}>>`; }
      if (line !== oracle[i]) { if (bad === 0) reportMismatch(d.name, 'fixtures', i, inputs[i], oracle[i], line, `frozen bytes, ${d.name}.fixtures.out.jsonl line ${i + 1}`); bad++; }
    }
    if (!bad) say(`  PASS  fixtures      ${oracle.length} records identical`);
    else say(`  FAIL  fixtures      ${bad} of ${oracle.length} records diverge`);
  }

  // ── corpus ──────────────────────────────────────────────────────────────────────────────────
  if (d.corpusKey === null) {
    say(`  ----  corpus        no population. ${dm.populations.corpus.source}`);
  } else {
    const inputs = corpusInputs(d.corpusKey);
    const oracle = readFileSync(`${ORACLE}${d.name}.corpus.out.jsonl`, 'utf8').split('\n').filter(Boolean);
    let bad = 0;
    for (let i = 0; i < oracle.length; i++) {
      compared++;
      let line;
      try { line = JSON.stringify(run(inputs[i].facts, inputs[i].resolutions)); }
      catch (e) { line = `<<THREW: ${e.message}>>`; }
      if (line !== oracle[i]) { if (bad === 0) reportMismatch(d.name, 'corpus', i, inputs[i], oracle[i], line, `frozen bytes, ${d.name}.corpus.out.jsonl line ${i + 1}`); bad++; }
    }
    if (!bad) say(`  PASS  corpus        ${oracle.length} records identical`);
    else say(`  FAIL  corpus        ${bad} of ${oracle.length} records diverge`);
  }

  // ── sample ──────────────────────────────────────────────────────────────────────────────────
  {
    const full = readFileSync(`${ORACLE}${d.name}.sample.out.jsonl`, 'utf8').split('\n').filter(Boolean);
    const digestBlob = readFileSync(`${ORACLE}${d.name}.sample.digests.txt`, 'utf8');
    const wideN = dm.populations['sample-wide'].records;
    const frozenInputHash = dm.populations['sample-wide'].input_stream_sha256;

    const inputHash = createHash('sha256');
    const inputs = [];
    for (const inp of sampledInputs(d.fields, d.resolutions, wideN, SEED)) { inputHash.update(JSON.stringify(inp)); inputs.push(inp); }
    if (inputHash.digest('hex') !== frozenInputHash) {
      refusals++;
      say(`  ????  sample        POPULATION MOVED. The seeded input stream no longer digests to what was`);
      say(`                      frozen, so no parity result is stated for this population.`);
    } else {
      let badFull = 0, badWide = 0, unreproducible = 0;
      const handEv = (await import(`${LIB}/${d.dir}/evaluate.mjs`)).evaluate;
      for (let i = 0; i < wideN; i++) {
        compared++;
        let line;
        try { line = JSON.stringify(run(inputs[i].facts, inputs[i].resolutions)); }
        catch (e) { line = `<<THREW: ${e.message}>>`; }
        if (i < full.length) {
          if (line !== full[i]) { if (badFull === 0) reportMismatch(d.name, 'sample-full', i, inputs[i], full[i], line, `frozen bytes, ${d.name}.sample.out.jsonl line ${i + 1}`); badFull++; }
        }
        const frozen = digestBlob.slice(i * 16, i * 16 + 16);
        const got = createHash('sha256').update(line).digest('hex').slice(0, 16);
        if (got !== frozen) {
          badWide++;
          if (badWide === 1 && i >= full.length) {
            // The frozen side is a digest. Re-derive the bytes, and CHECK them against the digest
            // before printing them as the oracle value.
            const rerun = JSON.stringify(handEv(inputs[i].facts, inputs[i].resolutions));
            const rerunDigest = createHash('sha256').update(rerun).digest('hex').slice(0, 16);
            if (rerunDigest === frozen) {
              reportMismatch(d.name, 'sample-wide', i, inputs[i], rerun, line,
                `re-run of the hand-written evaluator, CHECKED against the frozen digest ${frozen}`);
            } else {
              unreproducible++;
              FAIL(`  FAIL  sample-wide: record ${i} diverges AND the oracle is unreproducible`);
              say(`      frozen digest        ${frozen}`);
              say(`      re-run digest        ${rerunDigest}`);
              say(`      The hand-written evaluator has moved since the capture. No statement is made`);
              say(`      about the candidate for this record.`);
            }
          }
        }
      }
      if (!badFull) say(`  PASS  sample-full   ${full.length} records identical`);
      else say(`  FAIL  sample-full   ${badFull} of ${full.length} records diverge`);
      if (!badWide) say(`  PASS  sample-wide   ${wideN} records identical by digest of the exact bytes`);
      else say(`  FAIL  sample-wide   ${badWide} of ${wideN} records diverge${unreproducible ? `, ${unreproducible} with an unreproducible oracle` : ''}`);
    }
  }
  say('');
}

say(`${compared} record comparisons over ${ONLY || 'three'} domain(s).`);
if (refusals) say(`${refusals} population(s) NOT STATED: the input stream moved.`);
say(failures === 0 && refusals === 0 ? 'PARITY: IDENTICAL.' : `PARITY: NOT ESTABLISHED. ${failures} failing population(s).`);
process.exit(failures === 0 && refusals === 0 ? 0 : 1);
