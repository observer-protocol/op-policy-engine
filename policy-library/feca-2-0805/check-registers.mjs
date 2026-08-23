#!/usr/bin/env node
/**
 * Do the registers in this directory refer to things that exist?
 *
 * Written 2026-08-23 after the re-derivation left two ambiguities pointing at first-pass clause ids
 * that no longer existed. Nothing caught it: the ids were plausible, the JSON was valid, and a
 * reader would have followed them to nowhere. This is the same class as `used_by` in the Banxico
 * register, which is why it is a check rather than a convention.
 *
 * It asserts REFERENTIAL INTEGRITY ONLY. It says nothing about whether a disposition is right.
 */
import { readFileSync, existsSync } from 'node:fs';
// Takes a domain directory so it can be run against any of them. Registers a domain does not have
// are SKIPPED and reported as skipped, never treated as empty: absent and empty are different states
// and a check that conflates them reports a clean pass over nothing.
const DIR = process.argv[2] ? new URL(process.argv[2] + '/', `file://${process.cwd()}/`) : new URL('./', import.meta.url);
const has = (f) => existsSync(new URL(f, DIR));
const r = (f) => JSON.parse(readFileSync(new URL(f, DIR), 'utf8'));
const skipped = [];
let pass = 0, fail = 0;
const a = (n, ok, d = '') => { if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n}${d ? '  <<< ' + d : ''}`); } };

const clauses = r('./clauses.json').clauses;
const ids = new Set(clauses.map((c) => c.id));
const opt = (f, pick, label) => { if (has(f)) return pick(r(f)); skipped.push(label); return null; };
const ungrounded = new Set(opt('./undefined-terms.json', (x) => x.terms.map((t) => t.term), 'undefined-terms') || []);
const defined = new Set(opt('./defined-terms.json', (x) => x.terms.map((t) => t.term), 'defined-terms') || []);
const ambiguities = opt('./ambiguities.json', (x) => x.ambiguities, 'ambiguities') || [];
console.log(`\nregisters read from ${DIR.pathname.split('/').filter(Boolean).pop()}`);

console.log('\n── every reference resolves ──');
const dangling = ambiguities.filter((x) => !ids.has(x.clause_id)).map((x) => `${x.id} -> ${x.clause_id}`);
a('every ambiguity names a clause that exists', dangling.length === 0, dangling.join(', '));

const badTerm = clauses.filter((c) => c.rests_on_ungrounded_term && !ungrounded.has(c.rests_on_ungrounded_term))
  .map((c) => `${c.id} -> ${c.rests_on_ungrounded_term}`);
a('every rests_on_ungrounded_term names a registered term', badTerm.length === 0, badTerm.join(', '));

console.log('\n── the two term registers are disjoint ──');
const both = [...ungrounded].filter((t) => defined.has(t));
a('no term is both defined and ungrounded', both.length === 0, both.join(', '));

console.log('\n── ids are unique ──');
a('no clause id appears twice', ids.size === clauses.length, `${clauses.length} clauses, ${ids.size} distinct ids`);

console.log('\n── every clause carries a disposition the schema knows ──');
// EVIDENTIAL added 2026-08-23. This check flagged the four PSR clauses the moment they were
// recategorised, before the schema set was updated, which is the check working rather than failing.
const SCHEMA = new Set(['MECHANICAL', 'JUDGMENT', 'CONDITIONAL', 'DERIVED', 'DEFINITIONAL', 'INSTRUCTION', 'EVIDENTIAL']);
const outside = clauses.filter((c) => !SCHEMA.has(c.disposition));
// Fitting none is a FINDING, not a failure. It fails only if it exceeds the threshold the brief set.
const share = outside.length / clauses.length;
a(`clauses fitting no category stay under 10 percent (${outside.length}/${clauses.length})`,
  share <= 0.10, outside.map((c) => `${c.id} [${c.disposition}]`).join(', '));

if (skipped.length) console.log(`\n  SKIPPED, this domain has no such register: ${skipped.join(', ')}`);
console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}: ${pass} passed, ${fail} failed${skipped.length ? `, ${skipped.length} skipped` : ''}.`);
process.exit(fail === 0 ? 0 : 1);
