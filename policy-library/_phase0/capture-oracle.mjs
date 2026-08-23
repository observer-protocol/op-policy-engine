#!/usr/bin/env node
/**
 * BASELINE CAPTURE. Runs the three hand-written evaluators over four populations and freezes what
 * they emit, byte for byte, at a named commit.
 *
 * The frozen bytes are `JSON.stringify(output)` exactly as the evaluator produced it. Key order is
 * insertion order and is part of the oracle: an interpreter that emits the same clauses in a
 * different order is not byte-identical and must not be reported as passing.
 *
 * ─── FOUR POPULATIONS, EACH NAMED ───────────────────────────────────────────────────────────────
 *
 *   fixtures     the committed worked cases in each domain's cases.mjs, read through a spy so the
 *                fact sets are the committed ones and not a transcription. 3 + 3 + 4 runs.
 *   corpus       every fact set in _corpus/corpus.json. Banxico and PSR only; FECA has none, and
 *                that absence is reported rather than filled.
 *   sample-full  the first PHASE0_FULL records of the seeded fact-space stream, frozen VERBATIM.
 *   sample-wide  PHASE0_N records of the same stream, frozen as a 64-bit digest of the exact output
 *                bytes. The digest is a compaction of the bytes, not a summary of them: on a
 *                mismatch the harness re-runs the evaluator for that one record, CHECKS the re-run
 *                against the frozen digest, and only then prints it as the oracle value.
 *
 * ─── WHAT IS NOT FROZEN, AND WHY ────────────────────────────────────────────────────────────────
 *
 * The sampled inputs are not stored. They are regenerated from `_corpus/space.mjs` and the seed.
 * A digest of the input stream IS stored, so a change to the fact space is reported as the
 * population having moved, which is a different failure from a parity failure and must not be able
 * to disguise itself as one.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { DOMAINS, SEED, SAMPLE_N, LIB, sampledInputs, corpusInputs, fixtureRuns, sha } from './populations.mjs';

const FULL_N = Number(process.env.PHASE0_FULL || 250);
const OUT = new URL('./oracle/', import.meta.url).pathname;

const ROOT = `${LIB}/..`;
const commit = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT }).toString().trim();

// ─── A DIRTY TREE REFUSES THE FREEZE ────────────────────────────────────────────────────────────
//
// The first oracle was frozen from a dirty tree and the manifest merely recorded that. Recording is
// not a control: the freeze proceeded, and the freeze's soundness then had to be established after
// the fact by a read-trace. Now it refuses: a dirty tree under the scope exits non-zero and writes
// no manifest and no oracle.
//
// THE SCOPE IS policy-library, WITH IGNORED FILES COUNTED, and the choice is argued rather than
// assumed:
//
//   - policy-library because it is what the freeze reads. The whole gate was traced (see
//     fs-trace.cjs): 40 distinct paths, every one under policy-library. A dirty file elsewhere
//     cannot change the bytes this freeze writes TODAY.
//   - ignored files counted (--ignored=matching) because ignoring is how a file hides from a scoped
//     status. A .gitignore edited at the repository root sits OUTSIDE a policy-library pathspec and
//     could hide a file INSIDE it; so could .git/info/exclude or a global excludes file, which are
//     not in the worktree at all. Counting ignored files closes every variant of that vector at
//     once, at the cost that editor and Finder noise under policy-library refuses a freeze. For an
//     instrument run a handful of times per phase, that is the right side of the trade.
//
//   What a file OUTSIDE the scope can still do, named rather than implied: it cannot change the
//   frozen bytes today (the traced read set bounds that), and it cannot hide a file inside the
//   scope (ignored files are counted). What remains is tomorrow: if this script or its imports ever
//   grow a read outside policy-library, this refusal will not see that file. The scope is a claim
//   about the current read set, and the read-trace is the instrument that re-establishes it.
//
// PATHSPEC RESOLVES RELATIVE TO cwd. The first version of the status line ran with cwd=LIB, which
// IS policy-library, so the pathspec matched nothing and the check reported clean unconditionally.
// It is the estate's own class: a check that returns green for a reason unrelated to its subject.
// It runs from the repository root.
const DIRTY_CMD = 'git status --porcelain=v1 -uall --ignored=matching -- policy-library';
const dirty = execSync(DIRTY_CMD, { cwd: ROOT }).toString().trim();
const OVERRIDE = process.argv.includes('--allow-dirty');
if (dirty !== '' && !OVERRIDE) {
  console.error('FREEZE REFUSED: the tree is dirty under policy-library, ignored files included.');
  console.error('Nothing was written: no manifest, no oracle files.');
  console.error('');
  for (const l of dirty.split('\n')) console.error('  ' + l);
  console.error('');
  console.error('A deliberate freeze from a dirty tree is legitimate; a silent one is not.');
  console.error('Re-run with --allow-dirty to freeze anyway. The override and the dirty paths as of');
  console.error('that moment are recorded in the manifest.');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const manifest = {
  $note: 'Frozen output of the three hand-written evaluators. This file records WHAT was frozen and OVER WHICH POPULATION. It is not the oracle; the .out.jsonl and .digests.txt files are.',
  captured_at_commit: commit,
  captured_on_branch: branch,
  freeze_discipline: {
    scope: 'policy-library, ignored files included',
    status_command: DIRTY_CMD,
    refuses_when_dirty: true,
    override_used: OVERRIDE && dirty !== '',
  },
  worktree_clean_under_policy_library: dirty === '',
  worktree_dirty_paths: dirty === '' ? [] : dirty.split('\n').map((l) => l.slice(3)),
  seed: SEED,
  sample_wide_n: SAMPLE_N,
  sample_full_n: FULL_N,
  domains: {},
  files: {},
};

const write = (name, content) => {
  writeFileSync(OUT + name, content);
  manifest.files[name] = { bytes: Buffer.byteLength(content), sha256: sha(content) };
};

for (const d of DOMAINS) {
  const mod = await import(`${LIB}/${d.dir}/evaluate.mjs`);
  const ev = mod.evaluate;
  const rec = { clauses: null, populations: {} };

  // ── fixtures ────────────────────────────────────────────────────────────────────────────────
  const runs = await fixtureRuns(d.dir, d.name);
  const fxInputs = runs.map((r) => ({ facts: r.facts, resolutions: r.resolutions }));
  const fxOut = runs.map((r) => JSON.stringify(r.output));
  rec.clauses = Object.keys(runs[0].output).length;

  // THE REPLAY CHECK. Every population except this one is replayed from JSON, so the harness feeds
  // the interpreter a JSON round-tripped fact set while this oracle was produced from the original
  // objects. A fact key whose value is `undefined` survives in the original and is dropped by JSON.
  // If that changed any result the whole replay would be unsound, so it is checked rather than
  // assumed, on the one population where the difference can exist.
  const replayMismatches = [];
  runs.forEach((r, i) => {
    const rt = JSON.parse(JSON.stringify({ f: r.facts, r: r.resolutions }));
    const again = JSON.stringify(ev(rt.f, rt.r));
    if (again !== fxOut[i]) replayMismatches.push(i);
  });

  write(`${d.name}.fixtures.inputs.json`, JSON.stringify(fxInputs, null, 1));
  write(`${d.name}.fixtures.out.jsonl`, fxOut.join('\n') + '\n');
  rec.populations.fixtures = {
    records: runs.length,
    source: `policy-library/${d.dir}/cases.mjs, read through a spy`,
    json_replay_mismatches: replayMismatches,
  };

  // ── corpus ──────────────────────────────────────────────────────────────────────────────────
  const cor = corpusInputs(d.corpusKey);
  if (d.corpusKey === null) {
    rec.populations.corpus = { records: 0, source: 'NOT_FOUND: _corpus/corpus.json carries banxico and psr only. Looked, and there is no FECA slice to freeze.' };
  } else {
    const corOut = cor.map((c) => JSON.stringify(ev(c.facts, c.resolutions)));
    write(`${d.name}.corpus.out.jsonl`, corOut.join('\n') + '\n');
    // The corpus stores a result-token map per case. Reconciled here because it is free and because
    // a corpus that no longer reproduces is not evidence.
    const stored = JSON.parse(readFileSync(`${LIB}/_corpus/corpus.json`, 'utf8'))[d.corpusKey];
    const drift = [];
    cor.forEach((c, i) => {
      const now = Object.fromEntries(Object.entries(ev(c.facts, c.resolutions)).map(([k, v]) => [k, v.result]));
      if (JSON.stringify(now) !== JSON.stringify(stored[i].results)) drift.push(i);
    });
    rec.populations.corpus = {
      records: cor.length,
      source: 'policy-library/_corpus/corpus.json',
      cases_whose_stored_result_map_no_longer_reproduces: drift,
    };
  }

  // ── sample ──────────────────────────────────────────────────────────────────────────────────
  const full = [];
  const digests = [];
  const inputHash = createHash('sha256');
  let i = 0;
  for (const inp of sampledInputs(d.fields, d.resolutions, SAMPLE_N, SEED)) {
    inputHash.update(JSON.stringify(inp));
    const line = JSON.stringify(ev(inp.facts, inp.resolutions));
    if (i < FULL_N) full.push(line);
    digests.push(createHash('sha256').update(line).digest('hex').slice(0, 16));
    i++;
  }
  write(`${d.name}.sample.out.jsonl`, full.join('\n') + '\n');
  write(`${d.name}.sample.digests.txt`, digests.join(''));
  rec.populations['sample-full'] = { records: full.length, source: `_corpus/space.mjs, seed ${SEED}, records 0..${FULL_N - 1}`, frozen_as: 'the exact output bytes' };
  rec.populations['sample-wide'] = {
    records: digests.length,
    source: `_corpus/space.mjs, seed ${SEED}, records 0..${SAMPLE_N - 1}`,
    frozen_as: 'sha256 of the exact output bytes, first 16 hex characters',
    input_stream_sha256: inputHash.digest('hex'),
  };

  manifest.domains[d.name] = rec;
  console.log(`${d.name.padEnd(9)} clauses ${String(rec.clauses).padStart(3)}   fixtures ${runs.length}   corpus ${cor.length}   sample-full ${full.length}   sample-wide ${digests.length}`);
}

writeFileSync(OUT + 'MANIFEST.json', JSON.stringify(manifest, null, 1));
console.log(`\nfrozen at commit ${commit} on branch ${branch}`);
console.log(`worktree clean under policy-library: ${dirty === ''}`);
console.log(`written: ${OUT}`);
