#!/usr/bin/env node
/**
 * E17 IS A CONDITION ON THE INTERPRETER, NOT A DEFECT ALREADY RETIRED.
 *
 * Eager argument evaluation with three call sites passing thunks and a fourth passing a value is a
 * property of JavaScript, not of hand-writing. `handler(force(a), force(b))` is the same eager
 * evaluation one level up, so a generic interpreter written the obvious way reproduces the defect
 * exactly. This shows the four things that have to hold, and the one that does not.
 */
import { readFileSync } from 'node:fs';
import { interpret, loadRegister } from '../_interpreter/interpret.mjs';

const LIB = new URL('..', import.meta.url).pathname;
const SRC = readFileSync(`${LIB}/_interpreter/interpret.mjs`, 'utf8');
const REG = loadRegister(`${LIB}/feca-2-0805/register.json`);
const MEANINGS = { ungrounded_terms: {
  'rationalized medical opinion': { accepts: ['detailed_rationale'] },
  'independent intervening cause': { defeaters: ['intentional_conduct'] },
  'chain of causation': { breaks: ['broken'] },
} };
const CLAUSE = 'feca/2-0805/3/e/differentiate';

const base = () => ({
  claim: { type_claimed: 'direct', condition_class: 'orthopaedic', pre_existing_same_site: false,
           aggravation_issue_undeveloped: false, consequential_claimed: false,
           physical_injury_established: true, graver_condition_undeveloped: false },
  injury: { clear_cut_and_competent: 'affirmed', minor_and_lay_identifiable: 'denied', witnessed_or_prompt: true, fact_disputed: false },
  opinion: { present: 'CA-20', examined_or_treated: true, source_class: 'surgeon', diagnosis: 'd',
             objective_findings: 'o', relationship_opinion: 'r', rationale_grade: 'detailed_rationale' },
  file: {}, adjudicator: {}, acceptance: {}, exposure: {}, intervening: {}, consequential: {}, authorisation: { items: [] },
});
const run = (mut, reg = REG) => { const f = base(); mut(f); return interpret(reg, f, MEANINGS)[CLAUSE]; };
const show = (label, rec) => console.log(`  ${label.padEnd(56)}${JSON.stringify(rec)}`);

let failures = 0;
const assert = (cond, msg) => { if (!cond) { failures++; console.log(`  *** FAILED: ${msg}`); } };

console.log('\n1. STRUCTURAL: how many places in the interpreter map a node to a value');
const opsDispatch = (SRC.match(/OPS\[/g) ?? []).length;
const emitDispatch = (SRC.match(/EMITTERS\[/g) ?? []).length;
const forceDecl = (SRC.match(/function force\(/g) ?? []).length;
console.log(`  expression dispatch sites  OPS[...]        ${opsDispatch}`);
console.log(`  clause dispatch sites      EMITTERS[...]   ${emitDispatch}`);
console.log(`  declarations of force()                    ${forceDecl}`);
assert(opsDispatch === 1, 'an operand must be forced at exactly one site');
assert(emitDispatch === 1, 'a clause emitter must be dispatched at exactly one site');
assert(forceDecl === 1, 'force() must be declared once');
console.log('  Every handler receives NODES and calls force(); none receives a value, so whether an');
console.log('  operand is forced at all is a property of the shape, not of argument order at a call.');

console.log('\n2. E17\'s OWN CASE. Precondition FALSE in both rows, a meaning supplied for the term.');
console.log('   Before E17 closed, the second row read `not_applicable_on_supplied_meaning`.');
const r1 = run((f) => { f.claim.pre_existing_same_site = false; delete f.opinion.differentiates; });
const r2 = run((f) => { f.claim.pre_existing_same_site = false; f.opinion.differentiates = true; });
show('`differentiates` absent', r1);
show('`differentiates` true, so the meaning WOULD be read', r2);
assert(r1.result === 'not_applicable' && r2.result === 'not_applicable', 'both rows must be a bare not_applicable');
assert(!('rests_on' in r1) && !('rests_on' in r2), 'neither row may be attributed');

console.log('\n3. THE SHORT CIRCUIT. Precondition TRUE, meaning supplied, `and` decides before the meaning.');
const r3 = run((f) => { f.claim.pre_existing_same_site = true; f.opinion.differentiates = false; });
const r4 = run((f) => { f.claim.pre_existing_same_site = true; f.opinion.differentiates = true; });
show('`differentiates` false, so `and` short-circuits', r3);
show('`differentiates` true, so the meaning decides', r4);
assert(r3.result === 'breached', 'a short-circuited conjunct must leave the meaning unread');
assert(r4.result === 'satisfied_on_supplied_meaning', 'a consulted meaning must be carried in the result token');

console.log('\n4. OVER THE WHOLE SAMPLED POPULATION: does the retired token exist anywhere?');
const { DOMAINS, SEED, sampledInputs } = await import('./populations.mjs');
const d = DOMAINS.find((x) => x.name === 'feca');
const counts = new Map();
let n = 0;
for (const inp of sampledInputs(d.fields, d.resolutions, 40000, SEED)) {
  n++;
  for (const v of Object.values(interpret(REG, inp.facts, inp.resolutions))) {
    if (typeof v.result === 'string' && v.result.endsWith('_on_supplied_meaning')) counts.set(v.result, (counts.get(v.result) ?? 0) + 1);
  }
}
console.log(`  population: ${n} sampled fact sets from _corpus/space.mjs, seed ${SEED}`);
for (const [k, v] of [...counts].sort()) console.log(`  ${k.padEnd(56)}${v}`);
assert(!counts.has('not_applicable_on_supplied_meaning'), 'not_applicable_on_supplied_meaning must not exist');
console.log(`  not_applicable_on_supplied_meaning                      ${counts.get('not_applicable_on_supplied_meaning') ?? 0}`);

console.log('\n5. WHAT THE INTERPRETER DOES NOT REMOVE, SHOWN RATHER THAN CLAIMED.');
console.log('   The gate being an argument of the shape makes the E17 defect unwritable. Operand ORDER');
console.log('   INSIDE `compute` is still an author\'s choice, and it still decides attribution.');
const swapped = JSON.parse(JSON.stringify(REG));
const cl = swapped.clauses.find((c) => c.id === CLAUSE);
cl.evaluate.compute.if.operands.reverse();          // the same predicate, the conjuncts written the other way round
const r5 = run((f) => { f.claim.pre_existing_same_site = true; f.opinion.differentiates = false; }, swapped);
show('same facts as row 3, conjuncts written in the other order', r5);
console.log('   The predicate is unchanged and the result token is not. A register author can still');
console.log('   attribute a determination to a meaning that did not bear on it, by ordering a');
console.log('   conjunction differently. Recorded as REUSE-LOG E20, not fixed here.');

console.log(`\n${failures === 0 ? 'ALL FOUR CONDITIONS HOLD.' : `${failures} CONDITION(S) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
