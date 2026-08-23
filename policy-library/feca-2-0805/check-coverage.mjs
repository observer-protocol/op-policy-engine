#!/usr/bin/env node
/**
 * Does the evaluator emit what the register says it should, and REFUSE what the register says has no
 * result domain?
 *
 * ─── THE REGISTER TELLS THE CHECK, NOT THE OTHER WAY ROUND ──────────────────────────────────────
 *
 * The Banxico and PSR copies of this check compare id sets by equality, which is right for a domain
 * where every clause produces a result. This domain has 24 that do not: 12 DEFINITIONAL, 11
 * INSTRUCTION and 1 ILLUSTRATIVE. A set-equality check would report all 24 MISSING and exit 1.
 *
 * A CHECK THAT FAILS FOR A CORRECT REASON GETS SUPPRESSED, and a suppressed check is worse than no
 * check, because its green is still read as evidence. So this reads each clause's declared category
 * and expects an emitted result EXACTLY where a result domain exists.
 *
 * The categories are not hard-coded from the schema doc; they are read from the register.
 */
import { readFileSync } from 'node:fs';
import { evaluate } from './evaluate.mjs';
const REGISTER = JSON.parse(readFileSync(new URL('./clauses.json', import.meta.url), 'utf8')).clauses;
// EVIDENTIAL HAS a result domain, and that is what separates it from DEFINITIONAL and INSTRUCTION.
// A fact does make it true or false: whether the party bearing the burden discharged it. What differs
// is what the result is ABOUT, and that is a consumption discipline rather than a refusal.
const HAS_RESULT_DOMAIN = new Set(['MECHANICAL', 'JUDGMENT', 'CONDITIONAL', 'DERIVED', 'EVIDENTIAL']);

let pass = 0, fail = 0;
const a = (n, ok, d = '') => { if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n}${d ? '\n          ' + d : ''}`); } };

const out = evaluate({}, {});                       // the empty run: no fact decides membership here
const emitted = new Set(Object.keys(out));
const registered = new Set(REGISTER.map((c) => c.id));

console.log('\n── every registered clause is emitted, and nothing else ──');
const missing = [...registered].filter((i) => !emitted.has(i));
const extra = [...emitted].filter((i) => !registered.has(i));
a(`the evaluator emits exactly the register (${registered.size})`, missing.length === 0 && extra.length === 0,
  [missing.length ? `MISSING: ${missing.join(', ')}` : '', extra.length ? `EXTRA: ${extra.join(', ')}` : ''].filter(Boolean).join(' | '));

console.log('\n── a result appears exactly where a result domain exists ──');
const shouldHave = REGISTER.filter((c) => HAS_RESULT_DOMAIN.has(c.disposition));
const shouldNot = REGISTER.filter((c) => !HAS_RESULT_DOMAIN.has(c.disposition));
const noResult = shouldHave.filter((c) => !(out[c.id] && 'result' in out[c.id])).map((c) => `${c.id} [${c.disposition}]`);
a(`all ${shouldHave.length} clauses WITH a result domain produced one`, noResult.length === 0, noResult.join(', '));

const gotResult = shouldNot.filter((c) => out[c.id] && 'result' in out[c.id]).map((c) => `${c.id} [${c.disposition}]`);
a(`all ${shouldNot.length} clauses WITHOUT a result domain produced none`, gotResult.length === 0, gotResult.join(', '));

console.log('\n── the refusal carries its reason ──');
const silent = shouldNot.filter((c) => { const e = out[c.id]; return !(e && (e.refused || e.no_result)); }).map((c) => c.id);
a('every clause with no result domain says which category refused it', silent.length === 0, silent.join(', '));

const breakdown = {};
for (const c of shouldNot) breakdown[c.disposition] = (breakdown[c.disposition] || 0) + 1;
console.log(`          correct absences: ${Object.entries(breakdown).map(([k, v]) => `${v} ${k}`).join(', ')}`);

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}: ${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
