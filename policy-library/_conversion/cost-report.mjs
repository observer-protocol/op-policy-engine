#!/usr/bin/env node
/**
 * WHAT A CONVERSION COSTS, in units this repository can count, measured retrospectively from the
 * artifacts and logs of the three converted domains. Not wall clock, which measures a session's
 * verbosity, and not sessions, which nothing logged.
 *
 * THE UNIT THAT MATTERS IS HUMAN RULINGS REQUIRED, because it is the one that does not fall with
 * tooling. Its count here is a LOWER BOUND with a stated instrument limit: it counts documented
 * ruling markers (RULED, RULING <n>, "Ruled") in the domain's own artifacts, which is prose-keyed
 * (E13's class: the marker list is where its author has been), and an undocumented ruling is
 * invisible to it. The per-domain attribution of estate-log rulings is NOT_RECOVERABLE: REUSE-LOG
 * entries are estate-wide and several rule across domains at once.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const LIB = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(p, 'utf8');
const j = (p) => JSON.parse(read(p));

const DOMAINS = [
  { name: 'banxico', dir: 'banxico-34-2010', cov: 'banxico',
    prims: { new: 0, basis: 'the 13-primitive baseline was DERIVED FROM this domain; new-vs-reused is meaningless for the domain that defined the set (authored, from primitives.json + REUSE-LOG)' } },
  { name: 'psr', dir: 'psr-2017-752', cov: 'psr',
    prims: { new: 2, basis: 'ordered_before and amounts_equal (REUSE-LOG E2, corrected by INVENTORY-AUDIT: amounts_equal is PARAMETERISED over an undeclared Banxico operation), plus the months unit and open_set_floor at arity one as parameterisations' } },
  { name: 'feca', dir: 'feca-2-0805', cov: 'feca',
    prims: { new: 0, basis: 'ten operations served all 35 evaluable clauses with nothing added (REUSE-LOG, the FECA claim; a statement about FECA, not the inventory)' } },
];

const coverage = j(`${LIB}/_corpus/coverage.json`);
console.log('CONVERSION COST, retrospective, per domain. Every figure names its source; absent means NOT_RECOVERABLE.\n');
for (const d of DOMAINS) {
  const cj = j(`${LIB}/${d.dir}/clauses.json`);
  const amb = j(`${LIB}/${d.dir}/ambiguities.json`).ambiguities.length;
  const undef_ = existsSync(`${LIB}/${d.dir}/undefined-terms.json`) ? j(`${LIB}/${d.dir}/undefined-terms.json`).terms.length : 0;
  // Counted from the run loop's own list, not by declaration pattern: a declaration-pattern count
  // matched fixture-clone consts and overcounted on first run (a count that changes when you fix
  // the matcher). The loop list is what executes.
  const runList = read(`${LIB}/${d.dir}/cases.mjs`).match(/for \(const c of \[([^\]]+)\]/);
  const cases = runList ? runList[1].split(',').length : 0;
  const cov = coverage[d.cov];
  // ruling markers in the domain's own artifacts
  let markers = 0;
  for (const f of readdirSync(`${LIB}/${d.dir}`)) {
    if (!/\.(mjs|json|md)$/.test(f)) continue;
    markers += (read(`${LIB}/${d.dir}/${f}`).match(/RULED|RULING [0-9]|\bRuled\b/g) ?? []).length;
  }
  console.log(`${d.name.toUpperCase()}`);
  console.log(`  units decomposed                 ${cj.clauses.length}   (clauses.json)`);
  console.log(`  ambiguities registered           ${amb}   (ambiguities.json; each is a question only an institution can close)`);
  console.log(`  undefined terms registered       ${undef_}   ${undef_ ? '(undefined-terms.json)' : '(none registered; absence of a register, not evidence of absence of terms)'}`);
  console.log(`  primitives NEW                   ${d.prims.new}   (${d.prims.basis})`);
  console.log(`  worked cases authored            ${cases}   (cases.mjs, counted from the run loop)`);
  console.log(`  coverage, fixture over register  ${cov.reached} of ${cov.reachable} reachable results (coverage.json, seeded sampler; its population caveat travels with it, and the denominator is a lower bound BLIND to structurally unreachable declared tokens, E33: 37 such instances across the three registers appear in neither reachable nor missed)`);
  console.log(`  documented ruling markers        ${markers}   (LOWER BOUND, prose-keyed; the instrument limit is stated in this file's header)`);
  console.log(`  clauses without a ruling marker  NOT_RECOVERABLE as a distinct figure: markers attach to files and log entries, not to clauses, and nothing recorded per-clause ruling demand`);
  console.log('');
}
console.log('NOT_RECOVERABLE for all three, and why: wall clock and session count (nothing logged them);');
console.log('per-domain attribution of estate-wide REUSE-LOG rulings (several rule across domains at once);');
console.log('and the cost of the FIRST pass separately from the re-derivation for FECA (one log, one price).');
