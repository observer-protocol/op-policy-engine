#!/usr/bin/env node
/**
 * WHAT EACH CLAUSE READS, DERIVED FROM THE REGISTER, compared against what the register SAYS it
 * reads.
 *
 * E13's finding was that `check-claimed-effects.mjs` decides whether a basis claims a composition by
 * MATCHING PHRASING, so a basis that states its read in plain English is reported as silent. Its
 * stated fix was to make the claim a datum and compare a declared list against a traced one.
 *
 * The datum now exists for every clause without anyone declaring it: a clause's `evaluate` tree
 * names every clause result and every fact path it reads, and a binding is followed through. So this
 * derives the graph statically, with no run and no fixtures, and compares it against `depends_on`.
 *
 * IT IS A STATIC READ OF THE TREE, WHICH IS AN UPPER BOUND. A short-circuited operand is in the tree
 * and may never be forced on given facts. That is the honest direction for a dependency claim: it
 * can report a declared dependency that is not in the tree at all, which is what a false effect
 * looks like.
 */
import { readFileSync } from 'node:fs';
import { BX_FIELDS, PSR_FIELDS, FECA_FIELDS, SRF_FIELDS } from '../_corpus/space.mjs';

const LIB = new URL('..', import.meta.url).pathname;
const DOMAINS = [['banxico', 'banxico-34-2010', BX_FIELDS], ['psr', 'psr-2017-752', PSR_FIELDS], ['feca', 'feca-2-0805', FECA_FIELDS], ['srf', 'mas-srf-2024', SRF_FIELDS]];

const collect = (node, reg, acc, seenBindings) => {
  if (node === null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { for (const x of node) collect(x, reg, acc, seenBindings); return acc; }
  if (node.op === 'clause') acc.clauses.add(node.id);
  if (node.op === 'fact') acc.facts.add(node.path);
  if (node.op === 'binding' && !seenBindings.has(node.name)) {
    seenBindings.add(node.name);
    collect(reg.bindings[node.name], reg, acc, seenBindings);
  }
  for (const [k, v] of Object.entries(node)) if (k !== 'op') collect(v, reg, acc, seenBindings);
  return acc;
};

const totals = { agree: 0, declaredNotRead: 0, readNotDeclared: 0, noDeclaration: 0, evaluated: 0 };
for (const [name, dir] of DOMAINS) {
  const reg = JSON.parse(readFileSync(`${LIB}/${dir}/register.json`, 'utf8'));
  console.log(`\n${name.toUpperCase()}`);
  const evaluated = reg.clauses.filter((c) => c.evaluate !== undefined);
  const withDecl = evaluated.filter((c) => c.depends_on !== null);
  console.log(`  clauses with an evaluation           ${evaluated.length}`);
  console.log(`  carrying a depends_on declaration    ${withDecl.length}`);
  totals.evaluated += evaluated.length;
  let nodecl = 0;
  for (const c of evaluated) {
    const acc = collect(c.evaluate, reg, { clauses: new Set(), facts: new Set() }, new Set());
    const read = [...acc.clauses].sort();
    if (c.depends_on === null) { nodecl++; totals.noDeclaration++; continue; }
    const dnr = c.depends_on.filter((x) => !read.includes(x));
    const rnd = read.filter((x) => !c.depends_on.includes(x));
    if (dnr.length === 0 && rnd.length === 0) { totals.agree++; continue; }
    if (dnr.length) totals.declaredNotRead++;
    if (rnd.length) totals.readNotDeclared++;
    console.log(`  DISAGREES  ${c.id}`);
    if (dnr.length) console.log(`             declares and does not read:  ${dnr.join(', ')}`);
    if (rnd.length) console.log(`             reads and does not declare:  ${rnd.join(', ')}`);
  }
  if (nodecl) console.log(`  ${nodecl} clause(s) carry no depends_on at all, so nothing is compared for them`);
}
console.log('\nACROSS THE THREE REGISTERS');
console.log(`  clauses with an evaluation                    ${totals.evaluated}`);
console.log(`  depends_on agrees with the derived graph      ${totals.agree}`);
console.log(`  declares a dependency the tree does not have  ${totals.declaredNotRead}`);
console.log(`  reads a clause it does not declare            ${totals.readNotDeclared}`);
console.log(`  carries no depends_on to compare              ${totals.noDeclaration}`);

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DOES THE POPULATION PARITY WAS TAKEN OVER ACTUALLY REACH EVERY FACT THE REGISTER READS?
//
// Parity feeds both sides the same inputs, so it cannot be defeated by a fact set. It CAN be
// defeated by a fact the population never varies: a register reading a path nothing ever fills gets
// `undefined` on every record, the hand-written evaluator gets `undefined` too, and the two agree
// for a reason that has nothing to do with either being right. This is the check for that, and it
// runs in the direction that matters as well as the easy one.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nFACT-PATH COVERAGE OF THE SAMPLED POPULATION');
let uncovered = 0;
for (const [name, dir, FIELDS] of DOMAINS) {
  const reg = JSON.parse(readFileSync(`${LIB}/${dir}/register.json`, 'utf8'));
  const paths = new Set();
  for (const c of reg.clauses) if (c.evaluate !== undefined) collect(c.evaluate, reg, { clauses: new Set(), facts: paths }, new Set());
  for (const b of Object.values(reg.bindings)) collect(b, reg, { clauses: new Set(), facts: paths }, new Set());
  const space = Object.keys(FIELDS);
  // a register path is exercised if the space varies it, OR varies an ancestor object that carries it
  const notVaried = [...paths].filter((p) => !space.some((q) => q === p || p.startsWith(`${q}.`))).sort();
  const notRead = space.filter((q) => ![...paths].some((p) => p === q || p.startsWith(`${q}.`))).sort();
  uncovered += notVaried.length;
  console.log(`  ${name.padEnd(9)} register reads ${String(paths.size).padStart(3)} fact paths; _corpus/space.mjs declares ${String(space.length).padStart(3)} fields`);
  console.log(`             register path the population NEVER VARIES: ${notVaried.length ? notVaried.join(', ') : 'NONE'}`);
  console.log(`             population field no clause reads:          ${notRead.length ? notRead.join(', ') : 'NONE'}`);
}
console.log(uncovered === 0
  ? '  Every fact path the three registers read is varied by the population parity was taken over.'
  : `  ${uncovered} register fact path(s) are never varied, so parity over them establishes nothing.`);
// THE DEPENDENCY DISAGREEMENTS DO NOT FAIL THIS. They are a recorded finding about registers that
// are published on main and that this block does not modify; see REUSE-LOG E27. The fact-path
// coverage DOES fail it, because it bounds what the parity claim is worth.
process.exit(uncovered === 0 ? 0 : 1);
