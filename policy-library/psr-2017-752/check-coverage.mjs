#!/usr/bin/env node
/**
 * Does every clause in the register actually get evaluated?
 *
 * ─── WHY THIS REPLACED A CHECK THAT PASSED WHILE BROKEN ──────────────────────────────────────
 *
 * primitives.json carried a stored field, `clauses_no_primitive_serves`, computed at generation
 * time by asking whether each clause id appeared in some primitive's `used_by` list. It reported
 * complete coverage while `34-2010/3.6/p5/expediente-copy` was declared under TWO primitives and
 * invoked by NEITHER. Every case table printed 18 rows against a 19 clause register for as long as
 * the tables existed, and the check said nothing.
 *
 * A `used_by` list is an author's statement of intent. It is written by hand, it is never executed,
 * and nothing makes it true. A declaration cannot satisfy this check: the only input it accepts is
 * the set of ids a LIVE EVALUATOR RUN actually emitted.
 *
 * MISSING AND EXTRA ARE REPORTED SEPARATELY because they are different defects. Missing means a
 * clause is in the register and nothing evaluates it, which is what happened. Extra means the
 * evaluator emits an id the register does not define, which would mean a result nobody can trace to
 * a clause.
 *
 *   node check-coverage.mjs
 */
import { readFileSync } from 'node:fs';
import { evaluate } from './evaluate.mjs';

const register = JSON.parse(readFileSync(new URL('./clauses.json', import.meta.url), 'utf8')).clauses;
const registerIds = new Set(register.map((c) => c.id));

// A DELIBERATELY EMPTY FACTS OBJECT. Coverage is about which clauses the evaluator REACHES, not
// about what they conclude. Driving it with rich fixtures would let a clause that is only emitted
// on some inputs pass, which is the same hole one layer down.
const emptyRun = await evaluate({}, {});
const emittedIds = new Set(Object.keys(emptyRun));

const missing = [...registerIds].filter((id) => !emittedIds.has(id)).sort();
const extra = [...emittedIds].filter((id) => !registerIds.has(id)).sort();

console.log(`register: ${registerIds.size} clause(s)`);
console.log(`emitted on a live run with empty facts: ${emittedIds.size} id(s)`);
console.log('');

if (missing.length === 0 && extra.length === 0) {
  console.log('PASS: the register and the evaluator emit the same set of clause ids.');
  console.log('      Compared by set equality against a live run. No `used_by` list was consulted.');
  process.exit(0);
}
if (missing.length) {
  console.error(`MISSING (${missing.length}): in the register, never emitted. Nothing evaluates these.`);
  for (const id of missing) console.error(`  ${id}`);
}
if (extra.length) {
  console.error(`EXTRA (${extra.length}): emitted, not in the register. A result no clause defines.`);
  for (const id of extra) console.error(`  ${id}`);
}
process.exit(1);
