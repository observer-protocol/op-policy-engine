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

// ─── THE LANE LOOKUP, one authored copy, written into every register ────────────────────────────
//
// Four lanes, named now and read by nothing: engine, agent, panel, person. The routing key is the
// clause's disposition, assigned once at conversion, not a confidence score guessed at runtime.
//
// The defaults, with the reason each is what it is:
//   engine  for every disposition whose evaluation is mechanical over its inputs. EVIDENTIAL is
//           here deliberately: its INPUTS are held judgments, but the clause's own evaluation
//           composes them mechanically, and the judgment lanes belong to the clauses that hold
//           the judgments.
//   person  for JUDGMENT, because review starts high and falls as agreement is measured, and the
//           agent tier does not exist yet. Moving a clause to `agent` is a per-clause override
//           made when there is an agent to move it to.
//   no_lane for the dispositions with no result domain. A lane names what produces a
//           DETERMINATION; a clause that refuses one, or supplies a meaning instead of one, has
//           nothing to route. The state is explicit, never an absent key.
// ─── THE WAITING VOCABULARY, one authored copy, written into every register ─────────────────────
//
// The second axis beside lane: what a clause's determination is waiting on, per run. Values are
// closed; `none` is explicit and never absent (E30). Both implementations read this from their
// register and implement the tracking independently; the vocabulary has one copy, the tracking is
// what parity compares.
const WAITING = {
  values: ['fact', 'judgment', 'meaning', 'clause', 'none'],
  // Mixed origins resolve by this order: gather before judging (Addendum A.3's own sequence), a
  // meaning is prior to both because nothing moves until the term has one, and clause is
  // derivative of the others.
  priority: ['meaning', 'fact', 'judgment', 'clause'],
  // Result tokens that ARE absence, and what each is absence OF. `undetermined` is $composite:
  // it names no origin, and classification falls to the origins tracked during evaluation.
  absence_result_tokens: {
    not_assessed: 'judgment',
    no_end_event: 'fact',
    missing_operand: 'fact',
    no_candidate: 'fact',
    undetermined: '$composite',
  },
  // Presence-family primitives probe their ARGUMENT: strictly undefined means the fact was never
  // supplied and marks a fact origin; a recorded null, empty string or false is someone's answer
  // and marks nothing. E30's field granularity, applied to the axis.
  unsupplied_argument_probes: ['field_present', 'all_present', 'any_present'],
  // Every declared non-absence token of every primitive, so the classifier's map is TOTAL over
  // each primitive's declared result domain (the R7 extension). A token in neither list fails
  // validation rather than silently classifying as not-waiting.
  non_absence_result_tokens: [
    'within', 'exceeded', 'not_yet_due', 'overdue', 'out_of_order',
    'present', 'absent', 'all_present', 'some_absent', 'one_present', 'none_present',
    'member', 'not_member', 'all_members', 'some_not_member',
    'clear', 'prohibited_present', 'floor_met', 'floor_not_met', 'met', 'not_met',
    'satisfied', 'breached', 'outstanding', 'not_applicable',
    'before', 'after', 'simultaneous', 'equal', 'not_equal', 'incomparable_currency',
  ],
  // A record whose final result is `not_applicable` waits on NOTHING, whatever origins evaluation
  // touched: the obligation never arose, and conditional_requirement's eagerly-evaluated value
  // operand would otherwise mark never-arisen obligations as waiting.
  decided_overrides: { not_applicable: 'none' },
  // The R13 extension: an entry per emitter kind, no-result records explicitly none.
  by_emitter: { emit: 'computed', decision_table: 'computed', ungrounded: 'computed', no_result: 'none', awaiting: 'judgment', assessment: 'judgment', adoption: 'none', rejection: 'none' },
};

const LANES = ['engine', 'agent', 'panel', 'person'];
const LANE_DEFAULTS = {
  MECHANICAL: { lane: 'engine' },
  CONDITIONAL: { lane: 'engine' },
  DERIVED: { lane: 'engine' },
  EVIDENTIAL: { lane: 'engine' },
  JUDGMENT: { lane: 'person' },
  DEFINITIONAL: { no_lane: 'supplies a meaning; produces no determination to route' },
  INSTRUCTION: { no_lane: 'refuses; produces no determination to route' },
  ILLUSTRATIVE: { no_lane: 'refuses; produces no determination to route' },
  INCORPORATED_BY_REFERENCE: { no_lane: 'the operative rule is stated in a document the register does not hold; produces no determination to route' },
};

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const maybe = (p) => (existsSync(p) ? read(p) : null);

const DOMAINS = [
  { name: 'banxico', dir: 'banxico-34-2010', text_field: 'text_es', source_field: 'source_locator' },
  { name: 'psr', dir: 'psr-2017-752', text_field: 'text_en', source_field: 'source' },
  { name: 'feca', dir: 'feca-2-0805', text_field: 'text', source_field: 'source_locator' },
  // 12 NYCRR: ONE authored source, TWO projected versions. nywc-12nycrr-fee/project-versions.mjs writes
  // the per-version inputs; the assembler reads them exactly as it reads a hand-authored domain.
  { name: 'nywc-in-force', dir: 'nywc-12nycrr-fee/versions/in-force', text_field: 'text', source_field: 'source_locator', amb_field: 'competing_readings' },
  { name: 'nywc-proposed-2026-01-14', dir: 'nywc-12nycrr-fee/versions/proposed-2026-01-14', text_field: 'text', source_field: 'source_locator', amb_field: 'competing_readings' },
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
      lane_override: c.lane_override ?? null,
      evidential_role: c.evidential_role ?? null,
      governs: c.governs ?? null,
      // The document an INCORPORATED_BY_REFERENCE clause points at. Null on every other clause.
      incorporated_document: c.incorporated_document ?? null,
      register_version_id: c.register_version_id ?? null,
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
    $source_field_name: d.amb_field ?? (d.name === 'banxico' ? 'competing_readings' : d.name === 'psr' ? 'readings' : 'NONE'),
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

  // ── lanes: the lookup restricted to the dispositions this register actually uses, plus the
  //    per-clause overrides authored in evaluation.json. An override that restates the lookup's
  //    lane is an ERROR, enforced by the validator (R14): a same-value override is a second
  //    representation of one fact, it silently pins the old lane when the lookup changes, and it
  //    makes the population of genuinely overridden clauses unmeasurable.
  const inUse = [...new Set(clauses.map((c) => c.disposition))].sort();
  const lookup = {};
  for (const disp of inUse) {
    if (LANE_DEFAULTS[disp] === undefined) throw new Error(`${d.name}: disposition ${disp} has no lane default`);
    lookup[disp] = LANE_DEFAULTS[disp];
  }
  const overrides = ev.lane_overrides ?? {};
  for (const [cid, lane] of Object.entries(overrides)) {
    const c = clauses.find((x) => x.id === cid);
    if (c === undefined) throw new Error(`${d.name}: lane_overrides names ${cid}, which this register does not have`);
    c.lane_override = lane;
  }

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
    waiting: {
      $note: 'The second axis beside lane: what this run of the clause is waiting on. Computed at emission, per run, never stored. See _interpreter/WAITING-AXIS.md.',
      ...WAITING,
    },
    lanes: {
      $note: 'Dispositions become data, so the router is a lookup. Named now; NOTHING READS THEM YET. The lookup is total over the dispositions in use, with an explicit no_lane state: a lane names what produces a determination, and a clause that refuses one or supplies a meaning instead has nothing to route.',
      lanes: LANES,
      lookup,
    },
    ungrounded_terms: ev.ungrounded_terms === undefined || ev.ungrounded_terms === null ? null : {
      ...ev.ungrounded_terms,
      // THE MEANING SHAPES, DERIVED FROM THE EVALUATION TREES, NEVER HAND-WRITTEN (E34's ruling):
      // for each term, the meaning keys its clauses consult. A supplied meaning missing one of
      // these crashed both implementations mid-run on input-reachable data; now it refuses,
      // against this derived declaration, which cannot drift from the evaluations it is read from.
      shapes: (() => {
        const shapes = {};
        const collectMeaningKeys = (n, acc) => {
          if (n === null || typeof n !== 'object') return;
          if (Array.isArray(n)) { for (const x of n) collectMeaningKeys(x, acc); return; }
          if (n.op === 'meaning') acc.add(n.key);
          for (const [k, v] of Object.entries(n)) if (k !== 'op') collectMeaningKeys(v, acc);
        };
        for (const c of clauses) {
          if (c.evaluate?.op !== 'ungrounded') continue;
          const acc = shapes[c.evaluate.term] ??= new Set();
          collectMeaningKeys(c.evaluate.compute, acc);
        }
        return Object.fromEntries(Object.entries(shapes).map(([t, ks]) => [t, [...ks].sort()]));
      })(),
    },
    bindings: ev.bindings ?? {},
    clauses,
  };

  writeFileSync(`${base}/register.json`, JSON.stringify(register, null, 1));
  const withEval = clauses.filter((c) => c.evaluate !== undefined).length;
  console.log(`${d.name.padEnd(9)} ${clauses.length} clauses, ${withEval} carrying an evaluation, ${clauses.length - withEval} with no result domain -> ${d.dir}/register.json`);
}
