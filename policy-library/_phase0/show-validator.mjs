#!/usr/bin/env node
/**
 * THE VALIDATOR SHOWN FAILING ON EVERY RULE IT DECLARES.
 *
 * A rule that has only ever passed is not yet a check. Each case below takes a real register,
 * breaks exactly one thing, and asserts that the rule written for it fires. A case that does NOT
 * fire is reported as a FAILURE OF THIS SCRIPT, because a silent rule is worse than no rule.
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { validate } from '../_interpreter/validate.mjs';

const LIB = new URL('..', import.meta.url).pathname;
const SCRATCH = process.env.PHASE0_SCRATCH || '/tmp';
const SCHEMA = JSON.parse(readFileSync(`${LIB}/_interpreter/register.schema.json`, 'utf8'));
const load = (d) => JSON.parse(readFileSync(`${LIB}/${d}/register.json`, 'utf8'));
const BX = () => load('banxico-34-2010');
const FE = () => load('feca-2-0805');
const clause = (r, id) => r.clauses.find((c) => c.id === id);

let bad = 0;
function check(rule, description, mutate, registerFn = BX) {
  const r = registerFn();
  mutate(r);
  const res = validate(r, rule);
  const hit = res.failures.filter((f) => f.rule === rule);
  if (hit.length === 0) {
    bad++;
    console.log(`  DID NOT FIRE  ${rule}  ${description}`);
    if (res.failures.length) console.log(`                other rules fired: ${[...new Set(res.failures.map((f) => f.rule))].join(', ')}`);
    return;
  }
  console.log(`  FIRES  ${rule}  ${description}`);
  console.log(`         ${hit[0].where}`);
  console.log(`         ${hit[0].detail}`);
}

console.log('\nEACH CASE BREAKS EXACTLY ONE THING AND NAMES THE RULE THAT MUST CATCH IT.\n');

check('R1', 'the same clause id twice', (r) => { r.clauses.push({ ...clause(r, '34-2010/3.6/b/time') }); });

check('R2', 'a clause with a result domain and no evaluation', (r) => { delete clause(r, '34-2010/3.6/b/time').evaluate; });
check('R2', 'an INSTRUCTION clause carrying an evaluation',
  (r) => { const c = r.clauses.find((x) => x.disposition === 'INSTRUCTION'); c.evaluate = { op: 'emit', result: { op: 'const', value: 'satisfied' } }; }, FE);

check('R3', 'a clause reading a result emitted after it',
  (r) => { clause(r, '34-2010/3.6/b/time').evaluate = { op: 'emit', result: { op: 'clause', id: '34-2010/3.6/p7/firmeza' } }; });
check('R3', 'a clause reading an id this register does not have',
  (r) => { clause(r, '34-2010/3.6/b/time').evaluate = { op: 'emit', result: { op: 'clause', id: '34-2010/9.9/invented' } }; });

check('R4', 'a reference to an unregistered binding', (r) => { r.bindings.abroad = { op: 'binding', name: 'no_such_binding' }; });
check('R4', 'a binding cycle', (r) => { r.bindings.abroad = { op: 'binding', name: 'abroad_recorded' }; r.bindings.abroad_recorded = { op: 'binding', name: 'abroad' }; });

check('R5', 'a primitive the interpreter does not implement',
  (r) => { clause(r, '34-2010/3.6/b/time').evaluate.result = { op: 'primitive', name: 'reasonableness_of', args: [{ op: 'const', value: 1 }] }; });
check('R5', 'a primitive called with the wrong number of arguments',
  (r) => { clause(r, '34-2010/3.6/b/time').evaluate.result.args.push({ op: 'const', value: 'extra' }); });

check('R6', 'a calendar unit outside the declared closed set',
  (r) => { clause(r, '34-2010/3.6/p4/deadline').evaluate.result.compute.args[3] = { op: 'const', value: 'fortnights' }; });

check('R7', 'a remap over a closed result domain that misses a token',
  (r) => { delete clause(r, '34-2010/3.6/p5/expediente-copy').evaluate.result.args[1].mapping.out_of_order;
           clause(r, '34-2010/3.6/p5/expediente-copy').evaluate.result.args[1].value = { op: 'primitive', name: 'elapsed_within', args: [{ op: 'absent' }, { op: 'absent' }, { op: 'const', value: 45 }, { op: 'const', value: 'calendar_days' }, { op: 'absent' }] }; });
check('R7', 'a remap over held_judgment, whose domain is open, with no $unmapped',
  (r) => { clause(r, '34-2010/3.6/a/explanation').evaluate.result = { op: 'remap_result_domain', value: { op: 'primitive', name: 'held_judgment', args: [{ op: 'fact', path: 'dictamen.language_is_plain' }] }, mapping: { affirmed: { op: 'const', value: true }, denied: { op: 'const', value: false }, not_assessed: { op: 'const', value: 'undetermined' } } }; });

check('R8', 'a cond in a result whose else arm is the bare literal not_applicable',
  (r) => { clause(r, '34-2010/3.6/b/time').evaluate.result = { op: 'cond', if: { op: 'const', value: true }, then: { op: 'const', value: 'present' }, else: { op: 'const', value: 'not_applicable' } }; });
check('R8', 'a cond in a result whose else arm is the bare literal undetermined',
  (r) => { clause(r, '34-2010/3.6/b/time').evaluate.result = { op: 'cond', if: { op: 'const', value: true }, then: { op: 'const', value: 'present' }, else: { op: 'const', value: 'undetermined' } }; });

check('R9', 'a meaning read outside an ungrounded emission',
  (r) => { clause(r, '34-2010/3.6/b/time').evaluate.result = { op: 'meaning', key: 'accepts' }; });
check('R9', 'a meaning read by the GATE rather than by the compute',
  (r) => { clause(r, 'feca/2-0805/3/e/differentiate').evaluate.applies = { op: 'eq', left: { op: 'meaning', key: 'accepts' }, right: { op: 'const', value: true } }; }, FE);
check('R9', 'an ungrounded term disagreeing with the clause it sits on',
  (r) => { clause(r, 'feca/2-0805/7/b/chain').evaluate.term = 'some other term'; }, FE);

check('R10', 'a decision table missing one row of its declared cross product',
  (r) => { clause(r, '34-2010/3.6/p7/firmeza').evaluate.rows.splice(7, 1); });
check('R10', 'a decision table listing one combination twice',
  (r) => { const t = clause(r, '34-2010/3.6/p7/firmeza').evaluate; t.rows[8] = JSON.parse(JSON.stringify(t.rows[7])); });
check('R10', 'a subtable missing a value of its declared domain',
  (r) => { clause(r, '34-2010/3.6/p7/firmeza').evaluate.subtables.conformance_subtest.rows.pop(); });

check('R11', 'a disposition the schema does not declare',
  (r) => { clause(r, '34-2010/3.6/b/time').disposition = 'ADVISORY'; });
check('R11', 'a no-result disposition with no declared emission',
  (r) => { delete r.dispositions.no_result_emission.INSTRUCTION; }, FE);

check('R13', 'a disposition in use with no lookup entry',
  (r) => { delete r.lanes.lookup.MECHANICAL; });
check('R13', 'a no-result disposition mapped to a lane instead of no_lane',
  (r) => { r.lanes.lookup.INSTRUCTION = { lane: 'engine' }; }, FE);
check('R13', 'a with-result disposition mapped to no_lane',
  (r) => { r.lanes.lookup.JUDGMENT = { no_lane: 'wrongly' }; });

check('R14', 'an override naming a lane that does not exist',
  (r) => { clause(r, '34-2010/3.6/p4/language').lane_override = 'oracle'; });
check('R14', 'an override on a clause whose disposition has no lane',
  (r) => { r.clauses.find((x) => x.disposition === 'INSTRUCTION').lane_override = 'person'; }, FE);
check('R14', 'an override RESTATING the lane the lookup already gives',
  (r) => { clause(r, '34-2010/3.6/p4/language').lane_override = 'person'; });
check('R7', 'a primitive result token classified by NEITHER list (waiting classifier not total)',
  (r) => { r.waiting.non_absence_result_tokens = r.waiting.non_absence_result_tokens.filter((t) => t !== 'exceeded'); });
check('R7', 'a token classified as BOTH absence and non-absence',
  (r) => { r.waiting.absence_result_tokens.exceeded = 'fact'; });
check('R13', 'a missing waiting entry for an emitter kind',
  (r) => { delete r.waiting.by_emitter.decision_table; });
check('R13', 'a no-result emission whose waiting entry is not the explicit none',
  (r) => { r.waiting.by_emitter.no_result = 'fact'; }, FE);

// ── R12 does not depend on the register, so it is perturbed at the schema instead ───────────────
console.log('\n  R12 compares the schema against the interpreter and cannot be broken from a register.');
console.log('  Perturbed at the schema instead, in a copy under the scratch directory:');
{
  const dir = `${SCRATCH}/phase0-r12`;
  mkdirSync(dir, { recursive: true });
  cpSync(`${LIB}/_interpreter`, `${dir}/_interpreter`, { recursive: true });
  const s = JSON.parse(readFileSync(`${dir}/_interpreter/register.schema.json`, 'utf8'));
  delete s.primitives.ordered_before;
  s.primitives.reasonableness_of = { parameters: ['opinion'], result_domain: ['reasonable', 'unreasonable'] };
  writeFileSync(`${dir}/_interpreter/register.schema.json`, JSON.stringify(s, null, 1));
  const { validate: v2 } = await import(`${dir}/_interpreter/validate.mjs`);
  const res = v2(BX(), 'R12');
  const hit = res.failures.filter((f) => f.rule === 'R12');
  if (hit.length === 0) { bad++; console.log('  DID NOT FIRE  R12'); }
  else { console.log(`  FIRES  R12  a schema whose primitive vocabulary has drifted from the interpreter`);
         for (const h of hit) console.log(`         ${h.where}: ${h.detail}`); }
}

// ── the legal waiting counter-case: an intact classifier must fire NEITHER extension ────────────
{
  const res = validate(BX(), 'waiting-legal');
  const hit = res.failures.filter((f) => (f.rule === 'R7' || f.rule === 'R13') && String(f.where).startsWith('waiting'));
  if (hit.length) { bad++; console.log('  FIRED WRONGLY  waiting extensions on an intact register'); }
  else console.log('  SILENT  R7/R13 waiting extensions correctly do not fire on the intact register');
}

// ── the legal-override counter-case: a differing override must NOT fire R14 ─────────────────────
{
  const r = BX();
  r.clauses.find((c) => c.id === '34-2010/3.6/p4/language').lane_override = 'agent';
  const res = validate(r, 'R14-legal');
  const hit = res.failures.filter((f) => f.rule === 'R14');
  if (hit.length) { bad++; console.log('  FIRED WRONGLY  R14 on a differing override, which is legal'); }
  else console.log('  SILENT  R14  a differing override (person -> agent) is legal, and the rule correctly does not fire');
}

console.log(`\n${Object.keys(SCHEMA.rules).length} rules declared; every one shown firing.`);
console.log(bad === 0 ? 'EVERY RULE FIRED ON THE CASE WRITTEN FOR IT.' : `${bad} RULE(S) DID NOT FIRE.`);
process.exit(bad === 0 ? 0 : 1);
