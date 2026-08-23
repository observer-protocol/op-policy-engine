#!/usr/bin/env node
/**
 * Assembles `<domain>/register.json` from the domain's existing registers plus the authored
 * evaluation layer.
 *
 * THE DESCRIPTIVE HALF IS DERIVED, NOT RETYPED. Clause text, assertion, basis, source locator,
 * disposition, ambiguities, defined and undefined terms and the firmeza decision table are read out
 * of the published artifacts. Nothing here writes a sentence a published register already contains,
 * so the register cannot disagree with the encoding it was built from, and a correction to the
 * published one propagates by rebuilding rather than by remembering.
 *
 * THE DIRECTION REVERSES LATER. When the register becomes the source of truth, clauses.json is
 * generated from it rather than the other way round. That is a Phase 1 decision and this script is
 * written so it is a decision rather than a rewrite.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const LIB = new URL('..', import.meta.url).pathname;
const REGISTER_VERSION = '0.1.0';
const FACT_SCHEMA_VERSION = '0.1.0';

// The five categories that have a result domain, and the two that do not. Held here rather than in
// each domain's file because it is a property of the schema, not of a document.
const WITH_RESULT_DOMAIN = ['MECHANICAL', 'JUDGMENT', 'CONDITIONAL', 'DERIVED', 'EVIDENTIAL'];

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const maybe = (p) => (existsSync(p) ? read(p) : null);

const DOMAINS = [
  { name: 'banxico', dir: 'banxico-34-2010', text_field: 'text_es', source_field: 'source_locator' },
  { name: 'psr', dir: 'psr-2017-752', text_field: 'text_en', source_field: 'source' },
  { name: 'feca', dir: 'feca-2-0805', text_field: 'text', source_field: 'source_locator' },
];

const only = process.argv[2];

for (const d of DOMAINS) {
  if (only && only !== d.name) continue;
  const base = `${LIB}/${d.dir}`;
  const ev = read(`${base}/evaluation.json`);
  const cj = read(`${base}/clauses.json`);
  const amb = maybe(`${base}/ambiguities.json`);
  const facts = maybe(`${base}/facts.json`);
  const prims = maybe(`${base}/primitives.json`);
  const defined = maybe(`${base}/defined-terms.json`);
  const undefinedTerms = maybe(`${base}/undefined-terms.json`);

  const byId = Object.fromEntries(cj.clauses.map((c) => [c.id, c]));

  // ── clause order: the emit order IS the register order ──────────────────────────────────────
  const evaluated = ev.emit_order;
  const rest = cj.clauses.filter((c) => !evaluated.includes(c.id)).map((c) => c.id);
  const order = [...evaluated, ...rest];
  const missing = cj.clauses.map((c) => c.id).filter((id) => !order.includes(id));
  if (missing.length) throw new Error(`${d.name}: clauses in clauses.json absent from the register order: ${missing.join(', ')}`);
  const unknown = evaluated.filter((id) => byId[id] === undefined);
  if (unknown.length) throw new Error(`${d.name}: emit_order names clauses that clauses.json does not have: ${unknown.join(', ')}`);

  const clauses = order.map((id) => {
    const c = byId[id];
    const out = {
      id: c.id,
      source_locator: c[d.source_field] ?? null,
      text: c[d.text_field],
      text_language: d.text_field === 'text_es' ? 'es' : 'en',
      assertion: c.assertion ?? null,
      disposition: c.disposition,
      disposition_basis: c.disposition_basis ?? null,
      in_force_from: c.in_force_from ?? null,
      depends_on: c.depends_on ?? null,
      reads: c.reads ?? null,
      operative_weight: c.operative_weight ?? null,
      rests_on_ungrounded_term: c.rests_on_ungrounded_term ?? null,
      evidential_role: c.evidential_role ?? null,
      governs: c.governs ?? null,
    };
    const e = ev.clauses[id];
    if (e !== undefined) {
      if (e.op === 'decision_table') {
        // The table is COPIED from clauses.json, not transcribed. Row shape is converted to the
        // interpreter's match form; no cell value is written here.
        const t = c.decision_table;
        if (t === undefined) throw new Error(`${d.name}: ${id} declares a decision_table and clauses.json carries none`);
        const inputNames = e.inputs.map((i) => i.name);
        const subtables = {};
        for (const [key, inputExpr] of Object.entries(e.subtable_inputs ?? {})) {
          const st = t[key];
          if (st === undefined) throw new Error(`${d.name}: ${id} names subtable ${key} and clauses.json carries none`);
          const matchKey = Object.keys(st.rows[0]).find((k) => k !== 'outcome' && k !== 'note');
          subtables[key] = {
            $from: `clauses.json decision_table.${key}`,
            input: inputExpr,
            match_on: matchKey,
            declared_domain: st.domain ?? null,
            rows: st.rows.map((r) => (r.note === undefined
              ? { match: r[matchKey], outcome: r.outcome }
              : { match: r[matchKey], outcome: r.outcome, note: r.note })),
          };
        }
        out.evaluate = {
          op: 'decision_table',
          $from: 'clauses.json decision_table on this clause',
          inputs: e.inputs.map((i) => ({
            name: i.name,
            expr: i.expr,
            declared_domain: (t.inputs ?? []).find((x) => x.name === i.name)?.domain ?? null,
          })),
          cross_product: t.cross_product ?? null,
          rows: t.rows.map((r) => {
            const match = Object.fromEntries(inputNames.map((n) => [n, r[n]]));
            const row = { match };
            if (r.outcome_from !== undefined) row.outcome_from = r.outcome_from;
            else { row.outcome = r.outcome; if (r.note !== undefined) row.note = r.note; }
            if (r.reading !== undefined) row.reading = r.reading;
            return row;
          }),
          subtables,
        };
      } else if (e.op === 'ungrounded') {
        // THE TERM IS INJECTED FROM clauses.json, never written in the evaluation layer. A term
        // written in two places is a term that can disagree with itself, and the register's own
        // `rests_on_ungrounded_term` is the one the category was defined against.
        if (c.rests_on_ungrounded_term === undefined) throw new Error(`${d.name}: ${id} carries an ungrounded evaluation and clauses.json declares no rests_on_ungrounded_term`);
        out.evaluate = { op: 'ungrounded', term: c.rests_on_ungrounded_term, $term_from: 'clauses.json rests_on_ungrounded_term', applies: e.applies, compute: e.compute };
      } else {
        out.evaluate = e;
      }
    }
    return out;
  });

  // ── ambiguities. THE FIELD NAMES DISAGREE ACROSS THE THREE and are reconciled here under one
  //    name, with the disagreement recorded rather than smoothed away.
  const ambSection = amb === null ? null : {
    $source_field_name: d.name === 'banxico' ? 'competing_readings' : d.name === 'psr' ? 'readings' : 'NONE',
    entries: amb.ambiguities.map((a) => ({
      id: a.id,
      clause_id: a.clause_id,
      question: a.question,
      competing_readings: a.competing_readings ?? a.readings ?? null,
      textual_basis: a.textual_basis,
      materiality: a.materiality,
      required_resolution: a.required_resolution ?? null,
      // The key by which a resolution is supplied. NOT PRESENT IN ANY PUBLISHED REGISTER; it exists
      // today only as a string literal in evaluate.mjs. Supplied by the evaluation layer.
      resolution_key: (ev.resolution_keys ?? {})[a.id] ?? null,
    })),
  };

  const register = {
    $note: 'A clause register that an interpreter evaluates. Assembled by _phase0/build-register.mjs from the domain\'s published registers plus evaluation.json. Do not edit by hand.',
    register_version: REGISTER_VERSION,
    domain: d.name,
    source: {
      $schema_note: cj.$schema_note ?? null,
      decomposition_note: cj.decomposition_note ?? cj.scope_note ?? null,
    },
    dispositions: {
      $declared_in_source_register: cj.$dispositions ?? null,
      with_result_domain: WITH_RESULT_DOMAIN,
      no_result_emission: ev.no_result_emission ?? {},
    },
    primitives: prims === null
      ? { $state: `NOT_FOUND: ${d.dir} carries no primitives.json. Looked, and there is no primitive register for this domain to derive from.`, entries: null }
      : { $from: `${d.dir}/primitives.json`, entries: prims.primitives },
    facts: {
      // PRE-RULED: the fact schema is part of the register, under its own top-level key with its own
      // version field, so it can be split out later without a rewrite. The boundary is not yet known.
      version: FACT_SCHEMA_VERSION,
      $state: facts === null
        ? `NOT_FOUND: ${d.dir} carries no facts.json. The fact vocabulary this domain evaluates against exists only as paths inside its evaluation. Absent is recorded as a state, not as an omitted key.`
        : 'derived from the domain fact register',
      fields: facts === null ? null : facts.fields,
    },
    ambiguities: ambSection,
    defined_terms: defined === null ? null : { $from: `${d.dir}/defined-terms.json`, terms: defined.terms },
    undefined_terms: undefinedTerms === null ? null : { $from: `${d.dir}/undefined-terms.json`, $how_the_evaluator_must_treat_it: undefinedTerms.$how_the_evaluator_must_treat_it, terms: undefinedTerms.terms },
    ungrounded_terms: ev.ungrounded_terms ?? null,
    bindings: ev.bindings ?? {},
    clauses,
  };

  writeFileSync(`${base}/register.json`, JSON.stringify(register, null, 1));
  const withEval = clauses.filter((c) => c.evaluate !== undefined).length;
  console.log(`${d.name.padEnd(9)} ${clauses.length} clauses, ${withEval} carrying an evaluation, ${clauses.length - withEval} with no result domain -> ${d.dir}/register.json`);
}
