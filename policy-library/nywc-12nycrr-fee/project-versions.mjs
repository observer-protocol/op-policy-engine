#!/usr/bin/env node
/**
 * PROJECTS ONE AUTHORED SOURCE INTO TWO REGISTER VERSIONS.
 *
 * Reads clauses.json, evaluation.json, ambiguities.json and facts.json (the authored files) and
 * writes, per register version, versions/<id>/{clauses,evaluation,ambiguities,facts}.json in the
 * exact shape _phase0/build-register.mjs assembles a domain from. Nothing under versions/ is edited
 * by hand: a correction lands in the authored file and propagates by re-running this.
 *
 * WHAT VARIES BY VERSION, AND WHERE IT LIVES:
 *   - a clause's TEXT (text_by_version), its operative_weight, or its ABSENCE (absent_in_versions):
 *     clauses.json;
 *   - the DATA an evaluation reads that differs between versions (edition identity, publisher,
 *     effective date, required code source): evaluation.json bindings_by_version;
 *   - which ambiguities a version carries: ambiguities.json `versions`.
 *   The evaluation TREES are one copy. A clause whose tree reads a per-version binding is a
 *   clause that can decide differently between versions; version-diff.mjs derives that set.
 *
 * TWO REFUSALS ON THE FACT SCHEMA, so the schema and the trees cannot drift apart silently:
 *   - an evaluation reads a fact path facts.json does not declare -> throw;
 *   - facts.json declares a field no clause of ANY version reads and the field carries no
 *     `$read_by_no_clause_because` -> throw. `read_by` is DERIVED here, per version, never typed.
 *     A field read in one version and not another is a fact ABOUT THE VERSION (the proposed text
 *     lacks the clauses that read it) and is recorded on the projected field as
 *     `$unread_in_this_version`, not refused: the first run of this script refused it, and the
 *     refusal was wrong about what it was looking at.
 *
 * THE PROVENANCE GATE'S KNOWN HOLE, STATED WHERE THE GATE LIVES. checkVersionProvenance below
 * checks the FORM of a verification record: that every agent claim carries verified: true, a
 * named primary source, a method and a verified_value. It cannot check that the verification
 * happened. A well-formed false verification passes it. What carries the weight is not this
 * gate but the practice it enforces the recording of: retrieval BY THE LANDING SESSION, digests
 * computed here, counts recomputed here, and the agent's own value kept beside the verified one.
 * THE FAILURE MODE, NAMED: a future session accepting a verified_value it did not compute itself,
 * because the row was already well formed when it arrived. A verified_value is a value THIS
 * session computed; one inherited from a previous entry, a previous session, or the agent, is a
 * claim wearing the field name of a verification. STEP-6-ATLAS-VERIFICATION.md carries the same.
 *
 *   node project-versions.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const HERE = new URL('.', import.meta.url).pathname;
const read = (f) => JSON.parse(readFileSync(`${HERE}/${f}`, 'utf8'));
const cj = read('clauses.json'), ev = read('evaluation.json'), amb = read('ambiguities.json'), facts = read('facts.json');
const VERSIONS = Object.keys(cj.register_versions).filter((k) => !k.startsWith("$"));

// ── the walk every derivation below shares ──────────────────────────────────────────────────────
const walk = (n, fn) => {
  if (n === null || typeof n !== 'object') return;
  if (Array.isArray(n)) { for (const x of n) walk(x, fn); return; }
  fn(n);
  for (const [k, v] of Object.entries(n)) if (k !== 'op') walk(v, fn);
};
// Facts read by a tree, following bindings transitively against a given binding table.
const factsRead = (tree, bindings) => {
  const out = new Set(), seen = new Set();
  const go = (t) => walk(t, (n) => {
    if (n.op === 'fact') out.add(n.path);
    if (n.op === 'binding' && !seen.has(n.name)) { seen.add(n.name); if (bindings[n.name] === undefined) throw new Error(`unregistered binding ${n.name}`); go(bindings[n.name]); }
  });
  go(tree);
  return out;
};
export const bindingsRead = (tree, bindings) => {
  const out = new Set();
  const go = (t) => walk(t, (n) => { if (n.op === 'binding' && !out.has(n.name)) { out.add(n.name); go(bindings[n.name]); } });
  go(tree);
  return out;
};

// ── THE PROVENANCE GATE ON A REGISTER VERSION ───────────────────────────────────────────────────
//
// A register version may carry `provenance.agent_claims`: the claims an agent (Atlas) made about the
// document it returned. EVERY such claim must have been verified against a primary source by the
// session that lands the entry, and the entry records how. A claim with `verified` anything other
// than `true`, or without `verified_against` and `method`, makes the WHOLE VERSION invalid: the
// projector throws and writes nothing for it. An unverified agent claim is not a pending entry; it
// is not an entry. Exported so the refusal can be shown on a mock entry without writing files.
export function checkVersionProvenance(vid, meta) {
  const prov = meta.provenance;
  if (prov === undefined) return { vid, agent_claims: 0 };
  const claims = prov.agent_claims;
  if (!Array.isArray(claims)) throw new Error(`${vid}: provenance.agent_claims must be an array (empty when no agent supplied anything)`);
  const problems = [];
  claims.forEach((c, i) => {
    const where = `${vid}: agent_claims[${i}] (${JSON.stringify(c.claim ?? '?')})`;
    if (c.verified !== true) problems.push(`${where}: verified is ${JSON.stringify(c.verified)}, not true`);
    if (typeof c.verified_against !== 'string' || c.verified_against.length === 0) problems.push(`${where}: no verified_against (the primary source the claim was checked against)`);
    if (typeof c.method !== 'string' || c.method.length === 0) problems.push(`${where}: no method (how it was checked)`);
    if (c.verified === true && c.verified_value === undefined) problems.push(`${where}: verified but no verified_value recorded (the value the primary source actually carries)`);
  });
  if (problems.length) throw new Error(`REFUSED register version ${vid}: ${problems.length} agent claim(s) not verified. An unverified agent claim is not an entry.\n  ${problems.join('\n  ')}`);
  return { vid, agent_claims: claims.length };
}
if (import.meta.url === `file://${process.argv[1]}`) for (const vid of VERSIONS) checkVersionProvenance(vid, cj.register_versions[vid]);

// ── pass 1: which facts each version reads, so the unread refusal can be stated over ALL versions ──
if (import.meta.url === `file://${process.argv[1]}`) {
const presentIn = (vid) => new Set(cj.clauses.filter((c) => !(c.absent_in_versions ?? []).includes(vid)).map((c) => c.id));
const readByIn = {};
for (const vid of VERSIONS) {
  const present = presentIn(vid);
  const bindings = { ...ev.bindings, ...ev.bindings_by_version[vid] };
  readByIn[vid] = {};
  for (const [id, tree] of Object.entries(ev.clauses)) if (present.has(id)) for (const p of factsRead(tree, bindings)) (readByIn[vid][p] ??= []).push(id);
}
const readAnywhere = new Set(VERSIONS.flatMap((v) => Object.keys(readByIn[v])));
for (const f of facts.fields) if (!readAnywhere.has(f.field) && f.$read_by_no_clause_because === undefined) throw new Error(`facts.json declares ${f.field} and no clause of any version reads it`);

for (const vid of VERSIONS) {
  const meta = cj.register_versions[vid];
  const dir = `${HERE}/versions/${vid}`;
  mkdirSync(dir, { recursive: true });
  const projected = { $projected: `PROJECTED by project-versions.mjs from ../../clauses.json for register version ${vid}. DO NOT EDIT. The authored source is the parent directory.` };

  // ── clauses ───────────────────────────────────────────────────────────────────────────────
  const clauses = cj.clauses.filter((c) => !(c.absent_in_versions ?? []).includes(vid)).map((c) => {
    const o = {};
    for (const [k, v] of Object.entries(c)) {
      if (k.endsWith('_by_version') || k === 'absent_in_versions' || k === '$absent_because') continue;
      o[k] = v;
    }
    for (const [k, v] of Object.entries(c)) {
      if (!k.endsWith('_by_version')) continue;
      const base = k.slice(0, -'_by_version'.length);
      if (v[vid] !== undefined) { o[base] = v[vid]; o[`$${base}_differs_from_in_force`] = true; }
    }
    o.register_version_id = vid;
    return o;
  });
  const present = new Set(clauses.map((c) => c.id));
  writeFileSync(`${dir}/clauses.json`, JSON.stringify({
    ...projected,
    $schema_note: cj.$schema_note, $licensing_constraint: cj.$licensing_constraint, $dispositions: cj.$dispositions, scope_note: cj.scope_note,
    register_version: { id: vid, ...meta },
    clauses,
  }, null, 1) + '\n');

  // ── evaluation ────────────────────────────────────────────────────────────────────────────
  const bindings = { ...ev.bindings, ...ev.bindings_by_version[vid] };
  const emit_order = cj.clauses.map((c) => c.id).filter((id) => present.has(id));
  const evClauses = Object.fromEntries(Object.entries(ev.clauses).filter(([id]) => present.has(id)));
  for (const id of Object.keys(ev.clauses)) if (!cj.clauses.some((c) => c.id === id)) throw new Error(`evaluation.json evaluates ${id}, which clauses.json does not carry`);
  // R3 at projection time: a clause read must be present in this version and emitted earlier.
  for (const [id, tree] of Object.entries(evClauses)) walk(tree, (n) => {
    if (n.op === 'clause' && !present.has(n.id)) throw new Error(`${vid}: ${id} reads ${n.id}, which this version does not carry`);
  });
  writeFileSync(`${dir}/evaluation.json`, JSON.stringify({
    ...projected, $note: ev.$note, evaluation_version: ev.evaluation_version, $emit_order_note: ev.$emit_order_note,
    register_version_id: vid, emit_order, resolution_keys: ev.resolution_keys, no_result_emission: ev.no_result_emission,
    ungrounded_terms: ev.ungrounded_terms ?? null,
    $bindings_from_version: Object.keys(ev.bindings_by_version[vid]).sort(), bindings, clauses: evClauses,
  }, null, 1) + '\n');

  // ── ambiguities ───────────────────────────────────────────────────────────────────────────
  const ambiguities = amb.ambiguities.filter((a) => (a.versions ?? VERSIONS).includes(vid));
  for (const a of ambiguities) if (!present.has(a.clause_id)) throw new Error(`${vid}: ambiguity ${a.id} names ${a.clause_id}, which this version does not carry`);
  writeFileSync(`${dir}/ambiguities.json`, JSON.stringify({ ...projected, $schema_note: amb.$schema_note, $method_note: amb.$method_note, register_version_id: vid, ambiguities }, null, 1) + '\n');

  // ── facts, read_by DERIVED ────────────────────────────────────────────────────────────────
  const declared = new Set(facts.fields.map((f) => f.field));
  const readBy = {};
  for (const [id, tree] of Object.entries(evClauses)) for (const p of factsRead(tree, bindings)) {
    if (!declared.has(p)) throw new Error(`${vid}: ${id} reads fact ${p}, which facts.json does not declare`);
    (readBy[p] ??= []).push(id);
  }
  // no-result emissions read clause fields, never facts; the resolutions are checked by name.
  const resolutionsRead = new Set();
  for (const tree of [...Object.values(evClauses), ...Object.values(bindings)]) walk(tree, (n) => { if (n.op === 'resolution') resolutionsRead.add(n.name); });
  for (const r of resolutionsRead) if (!facts.resolutions.some((x) => x.key === r)) throw new Error(`${vid}: evaluation reads resolution ${r}, which facts.json does not declare`);
  // ── meanings: the keys facts.json declares per ungrounded term against the keys the evaluation
  //    trees consult, BOTH DIRECTIONS, so a meaning nobody consults and a consulted key nobody
  //    declares are both refused. The term on each clause must match clauses.json.
  const consulted = {};
  for (const [id, tree] of Object.entries(evClauses)) {
    if (tree.op !== 'ungrounded') continue;
    const term = cj.clauses.find((c) => c.id === id).rests_on_ungrounded_term;
    if (term === undefined || term === null) throw new Error(`${vid}: ${id} carries an ungrounded evaluation and clauses.json declares no rests_on_ungrounded_term`);
    const keys = consulted[term] ??= new Set();
    walk(tree.compute, (n) => { if (n.op === 'meaning') keys.add(n.key); });
    const decl = (facts.meanings ?? []).find((m) => m.term === term);
    if (decl === undefined) throw new Error(`${vid}: ${id} rests on ${JSON.stringify(term)}, which facts.json declares no meaning for`);
    if (!decl.clauses.includes(id)) throw new Error(`${vid}: facts.json meaning ${JSON.stringify(term)} does not list ${id} among its clauses`);
  }
  for (const m of facts.meanings ?? []) {
    if (!m.clauses.some((id) => present.has(id))) continue;   // the term's clauses are absent from this version
    const have = new Set(Object.keys(m.keys)), used = consulted[m.term] ?? new Set();
    for (const k of have) if (!used.has(k)) throw new Error(`${vid}: facts.json declares meaning key ${m.term}.${k} and no clause consults it`);
    for (const k of used) if (!have.has(k)) throw new Error(`${vid}: a clause consults meaning key ${m.term}.${k}, which facts.json does not declare`);
  }
  const fields = facts.fields.map((f) => {
    const rb = (readBy[f.field] ?? []).sort();
    const o = { ...f, read_by: rb, $read_by_derived: 'by project-versions.mjs from the evaluation trees of this version' };
    if (rb.length === 0 && f.$read_by_no_clause_because === undefined) o.$unread_in_this_version = `read by ${VERSIONS.filter((v) => readByIn[v][f.field]).join(', ')} and by no clause this version carries`;
    return o;
  });
  const unread = fields.filter((f) => f.$unread_in_this_version !== undefined).map((f) => f.field);
  writeFileSync(`${dir}/facts.json`, JSON.stringify({ ...projected, $schema_note: facts.$schema_note, $what_a_determination_is: facts.$what_a_determination_is, $amendment_2026_08_24: facts.$amendment_2026_08_24, register_version_id: vid, fields, resolutions: facts.resolutions, meanings: (facts.meanings ?? []).filter((m) => m.clauses.some((id) => present.has(id))).map((m) => ({ ...m, clauses: m.clauses.filter((id) => present.has(id)), $keys_checked: 'against the meaning leaves of this version\'s evaluation trees, both directions, by project-versions.mjs' })) }, null, 1) + '\n');

  const split = {};
  for (const c of clauses) split[c.disposition] = (split[c.disposition] ?? 0) + 1;
  console.log(`${vid.padEnd(22)} ${clauses.length} clauses  ${JSON.stringify(split)}  ${Object.keys(consulted).length} ungrounded terms on ${Object.values(evClauses).filter((t) => t.op === 'ungrounded').length} clauses  ${ambiguities.length} ambiguities  ${fields.length} fields, ${Object.keys(readBy).length} read${unread.length ? `, ${unread.length} unread in this version: ${unread.join(', ')}` : ''}`);
}
}
