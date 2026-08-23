#!/usr/bin/env node
/**
 * REGISTER VALIDATOR. Checks a register against register.schema.json plus the structural rules a
 * schema document cannot express. NOT PUBLISHED, and neither is the schema.
 *
 * THE VOCABULARIES ARE READ FROM THE SCHEMA, not restated here, so there is one copy of each
 * enumeration. R12 derives a third copy from the interpreter's own implementation and compares, so
 * a vocabulary that has drifted from the code is reported rather than believed.
 *
 * Every failure names the rule it failed, and the rule text comes from the schema.
 *
 * Run: node validate.mjs <path-to-register.json> [...]
 */
import { readFileSync } from 'node:fs';
import { PRIMITIVE_NAMES } from './interpret.mjs';

const SCHEMA = JSON.parse(readFileSync(new URL('./register.schema.json', import.meta.url), 'utf8'));
const OPS = SCHEMA.expression_ops;
const EMITTERS = SCHEMA.emitters;
const PRIMS = Object.fromEntries(Object.entries(SCHEMA.primitives).filter(([k]) => !k.startsWith('$')));
const WITH_RESULT = Object.keys(SCHEMA.dispositions.with_result_domain);
const WITHOUT_RESULT = Object.keys(SCHEMA.dispositions.without_result_domain);

export function validate(register, label) {
  const fail = [];
  const note = [];
  const bad = (rule, where, detail) => fail.push({ rule, where, detail });

  // ── R12: the schema's primitive vocabulary against the interpreter's, both directions ─────────
  const declared = Object.keys(PRIMS).sort();
  const implemented = [...PRIMITIVE_NAMES].sort();
  for (const n of declared) if (!implemented.includes(n)) bad('R12', 'schema', `declares primitive ${n}, which the interpreter does not implement`);
  for (const n of implemented) if (!declared.includes(n)) bad('R12', 'interpreter', `implements primitive ${n}, which the schema does not declare`);

  // ── R1 / R11 ──────────────────────────────────────────────────────────────────────────────────
  const ids = register.clauses.map((c) => c.id);
  const seen = new Set();
  for (const id of ids) { if (seen.has(id)) bad('R1', id, 'duplicate clause id'); seen.add(id); }
  const position = new Map(ids.map((id, i) => [id, i]));

  for (const c of register.clauses) {
    if (!WITH_RESULT.includes(c.disposition) && !WITHOUT_RESULT.includes(c.disposition)) {
      bad('R11', c.id, `disposition ${JSON.stringify(c.disposition)} is not declared by the schema`);
    }
    if (WITHOUT_RESULT.includes(c.disposition) && register.dispositions.no_result_emission[c.disposition] === undefined) {
      bad('R11', c.id, `disposition ${c.disposition} has no result domain and the register declares no emission for it`);
    }
    // ── R2 ────────────────────────────────────────────────────────────────────────────────────
    const hasResult = WITH_RESULT.includes(c.disposition);
    if (hasResult && c.evaluate === undefined) bad('R2', c.id, `${c.disposition} carries no evaluation`);
    if (!hasResult && c.evaluate !== undefined) bad('R2', c.id, `${c.disposition} has no result domain and carries an evaluation`);
  }

  // ── R4: bindings resolve and do not cycle ────────────────────────────────────────────────────
  const bindings = register.bindings ?? {};
  const walkBindingRefs = (node, acc) => {
    if (node === null || typeof node !== 'object') return acc;
    if (Array.isArray(node)) { for (const x of node) walkBindingRefs(x, acc); return acc; }
    if (node.op === 'binding') acc.add(node.name);
    for (const [k, v] of Object.entries(node)) { if (k !== 'op') walkBindingRefs(v, acc); }
    return acc;
  };
  const bindingDeps = Object.fromEntries(Object.entries(bindings).map(([k, v]) => [k, [...walkBindingRefs(v, new Set())]]));
  for (const [k, deps] of Object.entries(bindingDeps)) {
    for (const d of deps) if (bindings[d] === undefined) bad('R4', `binding ${k}`, `references unregistered binding ${d}`);
  }
  const colour = {};
  const cycle = (k, stack) => {
    if (colour[k] === 'done') return;
    if (colour[k] === 'open') { bad('R4', `binding ${k}`, `binding cycle: ${[...stack, k].join(' -> ')}`); return; }
    colour[k] = 'open';
    for (const d of bindingDeps[k] ?? []) cycle(d, [...stack, k]);
    colour[k] = 'done';
  };
  for (const k of Object.keys(bindings)) cycle(k, []);

  // ── expression walk ──────────────────────────────────────────────────────────────────────────
  // `ctx.inUngrounded` and `ctx.inResult` are the two pieces of position R9 and R8 need. They are
  // carried down the walk rather than recovered afterwards, because a rule about WHERE a node sits
  // cannot be checked from the node alone.
  const walk = (node, where, ctx) => {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) { bad('SCHEMA', where, `expression node must be an object, got ${JSON.stringify(node)}`); return; }
    const spec = OPS[node.op];
    if (spec === undefined) { bad('SCHEMA', where, `unregistered expression op ${JSON.stringify(node.op)}`); return; }
    for (const r of spec.required) if (node[r] === undefined) bad('SCHEMA', where, `op ${node.op} requires field ${r}`);

    // R9
    if (spec.only_inside === 'ungrounded' && !ctx.inUngrounded) bad('R9', where, `${node.op} appears outside an ungrounded emission`);

    // R3
    if (node.op === 'clause') {
      if (!position.has(node.id)) bad('R3', where, `references clause ${node.id}, which this register does not have`);
      else if (ctx.clausePosition !== null && position.get(node.id) >= ctx.clausePosition) {
        bad('R3', where, `reads ${node.id}, which is emitted at position ${position.get(node.id)}, at or after this clause's own position ${ctx.clausePosition}`);
      }
    }
    if (node.op === 'binding' && bindings[node.name] === undefined) bad('R4', where, `references unregistered binding ${node.name}`);

    // R5 / R6
    if (node.op === 'primitive') {
      const p = PRIMS[node.name];
      if (p === undefined) bad('R5', where, `unregistered primitive ${JSON.stringify(node.name)}`);
      else {
        if (node.args.length !== p.parameters.length) bad('R5', where, `${node.name} takes ${p.parameters.length} arguments and is called with ${node.args.length}`);
        const ca = p.closed_argument;
        if (ca !== undefined) {
          const a = node.args[ca.index];
          if (a !== undefined && a.op === 'const' && !ca.tokens.some((t) => t === a.value)) {
            bad('R6', where, `${node.name} argument ${ca.index} is ${JSON.stringify(a.value)}, which is not one of ${JSON.stringify(ca.tokens)}`);
          }
        }
      }
    }

    // R7: totality of a remap over a source whose result domain is closed
    if (node.op === 'remap_result_domain') {
      const keys = Object.keys(node.mapping).filter((k) => k !== '$unmapped');
      const hasUnmapped = Object.prototype.hasOwnProperty.call(node.mapping, '$unmapped');
      const src = node.value;
      let domain = null, open = false;
      if (src.op === 'primitive' && PRIMS[src.name] !== undefined) {
        if (PRIMS[src.name].result_domain_open) open = true; else domain = PRIMS[src.name].result_domain;
      }
      if (domain !== null) {
        const missed = domain.filter((t) => !keys.includes(String(t)));
        if (missed.length && !hasUnmapped) bad('R7', where, `remap over ${src.name} does not map ${missed.join(', ')} and declares no $unmapped`);
        const extra = keys.filter((t) => !domain.map(String).includes(t));
        if (extra.length) note.push({ rule: 'R7', where, detail: `remap over ${src.name} maps ${extra.join(', ')}, which is not in its declared result domain` });
      } else if (open && !hasUnmapped) {
        bad('R7', where, `remap over ${src.op === 'primitive' ? src.name : src.op}, whose result domain is open, declares no $unmapped`);
      } else if (domain === null && !open && !hasUnmapped) {
        note.push({ rule: 'R7', where, detail: `remap over a ${src.op} source: the schema cannot resolve its result domain, and no $unmapped is declared, so totality is UNCHECKED here` });
      }
    }

    // R8
    if (node.op === 'cond' && ctx.inResult) {
      for (const arm of ['then', 'else']) {
        const a = node[arm];
        if (a && a.op === 'const' && (a.value === 'not_applicable' || a.value === 'undetermined')) {
          bad('R8', where, `cond ${arm} arm is the bare literal ${JSON.stringify(a.value)}; use ${a.value === 'not_applicable' ? 'applicability_gate' : 'guard_on_unresolved'}`);
        }
      }
    }

    for (const k of spec.children ?? []) if (node[k] !== undefined) walk(node[k], `${where}.${k}`, ctx);
    for (const k of spec.child_lists ?? []) for (const [i, v] of (node[k] ?? []).entries()) walk(v, `${where}.${k}[${i}]`, ctx);
    for (const k of spec.child_maps ?? []) for (const [mk, v] of Object.entries(node[k] ?? {})) walk(v, `${where}.${k}.${mk}`, ctx);
  };

  // ── clause evaluations ───────────────────────────────────────────────────────────────────────
  register.clauses.forEach((c, i) => {
    if (c.evaluate === undefined) return;
    const e = c.evaluate;
    const spec = EMITTERS[e.op];
    if (spec === undefined) { bad('SCHEMA', c.id, `unregistered emitter ${JSON.stringify(e.op)}`); return; }
    for (const r of spec.required) if (e[r] === undefined) bad('SCHEMA', c.id, `emitter ${e.op} requires field ${r}`);
    const ctx = { clausePosition: i, inUngrounded: e.op === 'ungrounded', inResult: true };

    if (e.op === 'emit') {
      walk(e.result, `${c.id}.result`, ctx);
      if (e.note !== undefined) walk(e.note, `${c.id}.note`, { ...ctx, inResult: false });
      for (const [k, v] of Object.entries(e.extra ?? {})) walk(v, `${c.id}.extra.${k}`, { ...ctx, inResult: false });
    } else if (e.op === 'ungrounded') {
      walk(e.applies, `${c.id}.applies`, { ...ctx, inUngrounded: false });   // the gate must not read the meaning
      walk(e.compute, `${c.id}.compute`, ctx);
      if (c.rests_on_ungrounded_term !== e.term) bad('R9', c.id, `evaluation term ${JSON.stringify(e.term)} disagrees with the clause's rests_on_ungrounded_term ${JSON.stringify(c.rests_on_ungrounded_term)}`);
    } else if (e.op === 'decision_table') {
      // ── R10 ────────────────────────────────────────────────────────────────────────────────
      const names = e.inputs.map((x) => x.name);
      for (const inp of e.inputs) walk(inp.expr, `${c.id}.input.${inp.name}`, ctx);
      const combos = new Set();
      for (const [ri, row] of e.rows.entries()) {
        const mk = Object.keys(row.match);
        if (mk.length !== names.length || !names.every((n) => mk.includes(n))) bad('R10', `${c.id}.rows[${ri}]`, `matches on ${mk.join(', ')} and the declared inputs are ${names.join(', ')}`);
        const key = names.map((n) => String(row.match[n])).join('|');
        if (combos.has(key)) bad('R10', `${c.id}.rows[${ri}]`, `duplicate combination ${key}`);
        combos.add(key);
        if (row.outcome === undefined && row.outcome_from === undefined) bad('R10', `${c.id}.rows[${ri}]`, 'row states neither an outcome nor an outcome_from');
        if (row.outcome_from !== undefined && (e.subtables ?? {})[row.outcome_from] === undefined) bad('R10', `${c.id}.rows[${ri}]`, `names subtable ${row.outcome_from}, which the table does not declare`);
      }
      const domains = e.inputs.map((x) => x.declared_domain);
      if (domains.every((d) => Array.isArray(d))) {
        const product = domains.reduce((a, d) => a * d.length, 1);
        if (product !== e.rows.length) bad('R10', c.id, `the declared input domains give ${product} combinations and the table has ${e.rows.length} rows`);
        if (e.cross_product !== null && e.cross_product !== undefined && e.cross_product !== e.rows.length) {
          bad('R10', c.id, `the table states cross_product ${e.cross_product} and carries ${e.rows.length} rows`);
        }
        // completeness over the declared domains, enumerated rather than counted
        const enumerate = (i, acc) => { if (i === domains.length) { if (!combos.has(acc.join('|'))) bad('R10', c.id, `no row for ${names.map((n, j) => `${n}=${acc[j]}`).join(', ')}`); return; } for (const v of domains[i]) enumerate(i + 1, [...acc, String(v)]); };
        enumerate(0, []);
      } else {
        note.push({ rule: 'R10', where: c.id, detail: 'at least one input declares no domain, so completeness is UNCHECKED for this table' });
      }
      for (const [k, st] of Object.entries(e.subtables ?? {})) {
        walk(st.input, `${c.id}.subtable.${k}.input`, ctx);
        if (Array.isArray(st.declared_domain)) {
          const covered = st.rows.map((r) => String(r.match));
          for (const t of st.declared_domain) if (!covered.includes(String(t))) bad('R10', `${c.id}.${k}`, `no row for ${t}`);
        } else note.push({ rule: 'R10', where: `${c.id}.${k}`, detail: 'subtable declares no domain, so completeness is UNCHECKED' });
      }
    }
  });

  // ── the per-disposition no-result emissions ──────────────────────────────────────────────────
  for (const [disp, shape] of Object.entries(register.dispositions.no_result_emission)) {
    if (disp.startsWith('$')) continue;
    for (const [k, v] of Object.entries(shape)) {
      if (k.startsWith('$')) continue;
      walk(v, `no_result_emission.${disp}.${k}`, { clausePosition: null, inUngrounded: false, inResult: false });
    }
  }
  for (const [k, v] of Object.entries(register.ungrounded_terms ?? {})) {
    if (k.startsWith('$')) continue;
    if (k === 'attribution') { for (const [ak, av] of Object.entries(v)) walk(av, `ungrounded_terms.attribution.${ak}`, { clausePosition: null, inUngrounded: true, inResult: false }); }
    else walk(v, `ungrounded_terms.${k}`, { clausePosition: null, inUngrounded: true, inResult: false });
  }
  for (const [k, v] of Object.entries(bindings)) walk(v, `binding.${k}`, { clausePosition: null, inUngrounded: false, inResult: false });

  return { label, failures: fail, notes: note };
}

// ── the disagreement report between the schema and a domain's own primitive register ────────────
export function comparePrimitiveRegister(path) {
  const p = JSON.parse(readFileSync(path, 'utf8'));
  const out = [];
  for (const e of p.primitives) {
    const s = PRIMS[e.name];
    if (s === undefined) { out.push(`${e.name}: declared in ${path.split('/').slice(-2).join('/')} and NOT in the schema, and the interpreter does not implement it`); continue; }
    if (s.result_domain_open) { out.push(`${e.name}: the register declares the closed domain [${e.result_domain.join(', ')}]; the implementation PASSES THROUGH anything recorded, so its domain is open`); continue; }
    const a = [...e.result_domain].sort().join(','), b = [...s.result_domain].sort().join(',');
    if (a !== b) out.push(`${e.name}: register [${e.result_domain.join(', ')}] vs schema [${s.result_domain.join(', ')}]`);
    if (e.parameters.length !== s.parameters.length) out.push(`${e.name}: register declares ${e.parameters.length} parameters, schema ${s.parameters.length}`);
  }
  for (const n of Object.keys(PRIMS)) if (!p.primitives.some((e) => e.name === n)) out.push(`${n}: implemented and in the schema, and ${path.split('/').slice(-2).join('/')} does not declare it`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let bad = 0;
  for (const path of process.argv.slice(2)) {
    const r = validate(JSON.parse(readFileSync(path, 'utf8')), path);
    console.log(`\n${path}`);
    if (r.failures.length === 0) console.log('  PASS  no rule failed');
    for (const f of r.failures) { bad++; console.log(`  FAIL  ${f.rule}  ${f.where}\n        ${f.detail}\n        rule: ${SCHEMA.rules[f.rule] ?? '(schema shape)'}`); }
    for (const n of r.notes) console.log(`  NOTE  ${n.rule}  ${n.where}\n        ${n.detail}`);
  }
  process.exit(bad === 0 ? 0 : 1);
}
