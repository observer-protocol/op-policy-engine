#!/usr/bin/env node
/**
 * MISFIT REPORTING AS A FIRST-CLASS OUTPUT of a conversion.
 *
 * A schema that cannot express a category SUPPRESSES the count while producing a plausible one:
 * the first FECA pass under-reported the chapter by more than a third and looked complete. So a
 * conversion harness reports, per domain: what the schema cannot express NOW, what it could not
 * express AT CONVERSION TIME, and the count's SENSITIVITY TO THE DECOMPOSITION SPLIT where two
 * splits of the same source exist on disk. Where a figure is not derivable from artifacts this
 * repository holds, it prints NOT_RECOVERABLE rather than a plausible number.
 *
 * A ZERO IS INTERROGATED, NOT REPORTED BARE: a domain the schema was derived from has a zero
 * misfit count BY CONSTRUCTION, and that zero measures nothing.
 */
import { readFileSync, existsSync } from 'node:fs';
const LIB = new URL('..', import.meta.url).pathname;
const SCHEMA = JSON.parse(readFileSync(`${LIB}/_interpreter/register.schema.json`, 'utf8'));
const IN_SCHEMA = new Set([...Object.keys(SCHEMA.dispositions.with_result_domain), 'DEFINITIONAL', 'INSTRUCTION']);
// ILLUSTRATIVE is deliberately NOT in this set: the schema lists it only to refuse it, and its own
// text says it is not a category. A clause carrying it is a standing misfit.

const DOMAINS = [
  { name: 'banxico', dir: 'banxico-34-2010',
    at_conversion: { count: 0, basis: 'ZERO BY CONSTRUCTION, NOT A MEASUREMENT: the four-category schema was derived from this domain (with PSR), so it could not misfit against itself. The zero says the derivation happened, nothing else.' } },
  { name: 'psr', dir: 'psr-2017-752',
    at_conversion: { count: 4, basis: 'AUTHORED FROM THE LOG, cited: the whole of reg 75 fit no category until EVIDENTIAL was added on its account (_primitives/EVIDENTIAL.md). Four clauses, one new category.' } },
  { name: 'feca', dir: 'feca-2-0805',
    at_conversion: { count: 24, basis: 'AUTHORED FROM THE ARTIFACTS, cited: 12 DEFINITIONAL + 11 INSTRUCTION + 1 ILLUSTRATIVE had no category until the extended schema; the first pass, made under the old schema, is on disk as clauses.first-pass.json.' } },
];

console.log('MISFITS, per domain. Population: the clauses of each committed register.\n');
for (const d of DOMAINS) {
  const cj = JSON.parse(readFileSync(`${LIB}/${d.dir}/clauses.json`, 'utf8'));
  const now = cj.clauses.filter((c) => !IN_SCHEMA.has(c.disposition));
  console.log(`${d.name.toUpperCase()}  (${cj.clauses.length} clauses)`);
  console.log(`  misfits NOW (disposition outside the schema's categories): ${now.length}${now.length ? '  [' + now.map((c) => `${c.id}: ${c.disposition}`).join('; ') + ']' : ''}`);
  console.log(`  misfits AT CONVERSION: ${d.at_conversion.count}`);
  console.log(`     basis: ${d.at_conversion.basis}`);
  const fp = `${LIB}/${d.dir}/clauses.first-pass.json`;
  if (existsSync(fp)) {
    const first = JSON.parse(readFileSync(fp, 'utf8'));
    const a = first.clauses.length, b = cj.clauses.length;
    console.log(`  SPLIT SENSITIVITY, measured (two splits of one source on disk): first pass ${a} units, re-derivation ${b} units; the coarser split suppressed ${b - a} units, ${(100 * (b - a) / b).toFixed(1)}% of the chapter, while producing a plausible distribution.`);
  } else {
    console.log('  SPLIT SENSITIVITY: NOT_RECOVERABLE. One split of this source exists on disk; nothing to compare against. A sensitivity requires two decompositions, and none was kept.');
  }
  console.log('');
}
