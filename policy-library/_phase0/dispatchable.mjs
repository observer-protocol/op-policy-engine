#!/usr/bin/env node
/**
 * ADDENDUM A.5's FIRST QUESTION, MEASURED: are the registers' fact requirements specific enough to
 * dispatch an evidence agent against? They were written to be evaluated, not to be requested, and
 * the handoff says to check before assuming.
 *
 * METHOD. Interpret each register over the EMPTY fact set with no resolutions. Every clause whose
 * result is one of the cannot-decide tokens is classified by what would move it, derived from the
 * register rather than asserted:
 *
 *   MEANING    the emitter is `ungrounded`: it waits on a meaning the document never gave, which is
 *              an institution ruling and not a thing an evidence agent can fetch.
 *   JUDGMENT   the result is `not_assessed`: it waits on an assessment nobody has made, which is a
 *              person or the agent tier.
 *   CLAUSE     the evaluation reads no fact of its own (DERIVED): it waits on other clauses and
 *              moves only when they do.
 *   FACT       everything else: it waits on a fact or record nobody supplied. THIS is the
 *              evidence-agent population.
 *
 * For each stuck clause the single-fact probe then asks: does any ONE declared fact, at any value
 * the fact space declares for it, move the clause off its stuck token? A clause moved by no single
 * fact needs a SET, which shapes the dispatch interface.
 *
 * The cannot-decide tokens are taken from the primitives' own declared domains: `undetermined`,
 * `no_end_event`, `missing_operand`, `not_assessed`, `no_candidate`.
 *
 * ONE STATED LIMIT. The FACT bucket is an upper bound on gatherable clauses: a composition can put
 * a clause there whose real inputs are judgments, by mapping `not_assessed` into `undetermined` one
 * level down. psr-2017/75/1/provider-burden is that case and the output marks it.
 */
import { interpret, loadRegister } from '../_interpreter/interpret.mjs';
import { BX_FIELDS, PSR_FIELDS, FECA_FIELDS } from '../_corpus/space.mjs';

const LIB = new URL('..', import.meta.url).pathname;
const DOMAINS = [
  ['banxico', 'banxico-34-2010', BX_FIELDS],
  ['psr', 'psr-2017-752', PSR_FIELDS],
  ['feca', 'feca-2-0805', FECA_FIELDS],
];
const STUCK = new Set(['undetermined', 'no_end_event', 'missing_operand', 'not_assessed', 'no_candidate']);

const setPath = (o, p, v) => { const q = p.split('.'); let c = o; for (let i = 0; i < q.length - 1; i++) c = (c[q[i]] ??= {}); c[q[q.length - 1]] = v; };
const collect = (n, reg, acc, seen) => {
  if (n === null || typeof n !== 'object') return acc;
  if (Array.isArray(n)) { for (const x of n) collect(x, reg, acc, seen); return acc; }
  if (n.op === 'fact') acc.add(n.path);
  if (n.op === 'binding' && !seen.has(n.name)) { seen.add(n.name); collect(reg.bindings[n.name], reg, acc, seen); }
  for (const [k, v] of Object.entries(n)) if (k !== 'op') collect(v, reg, acc, seen);
  return acc;
};

const buckets = { FACT: [], JUDGMENT: [], MEANING: [], CLAUSE: [] };
let evaluated = 0;
for (const [name, dir, FIELDS] of DOMAINS) {
  const reg = loadRegister(`${LIB}/${dir}/register.json`);
  const base = interpret(reg, {}, {});
  console.log(`\n${name.toUpperCase()}`);
  for (const c of reg.clauses) {
    if (c.evaluate === undefined) continue;
    evaluated++;
    const r = base[c.id]?.result;
    if (!STUCK.has(r)) continue;
    const reads = collect(c.evaluate, reg, new Set(), new Set());

    let bucket;
    if (c.evaluate.op === 'ungrounded') bucket = 'MEANING';
    else if (r === 'not_assessed') bucket = 'JUDGMENT';
    else if (reads.size === 0) bucket = 'CLAUSE';
    else bucket = 'FACT';

    // the single-fact probe, over the fact space's own declared values
    const movers = new Set();
    for (const p of reads) {
      const owner = Object.keys(FIELDS).find((q) => q === p || p.startsWith(`${q}.`));
      if (owner === undefined) continue;
      for (const v of FIELDS[owner]) {
        if (v === undefined) continue;
        const f = {}; setPath(f, owner, v);
        let out; try { out = interpret(reg, f, {}); } catch { continue; }
        if (out[c.id]?.result !== r) { movers.add(p); break; }
      }
    }
    buckets[bucket].push({ id: c.id, token: r, reads: reads.size, movers: movers.size });
    const caveat = c.id === 'psr-2017/75/1/provider-burden'
      ? '   <- IN THE FACT BUCKET BY COMPOSITION ONLY: four not_assessed judgments mapped into undetermined' : '';
    console.log(`  ${bucket.padEnd(9)} ${c.id.padEnd(42)} ${String(r).padEnd(16)} reads ${String(reads.size).padStart(2)}   moved by a single fact: ${movers.size > 0 ? 'yes (' + movers.size + ')' : 'NO'}${caveat}`);
  }
}

const stuck = Object.values(buckets).reduce((a, b) => a + b.length, 0);
console.log(`\nACROSS THE THREE REGISTERS  (population: the ${evaluated} clauses carrying an evaluation, interpreted over the empty fact set)`);
console.log(`  cannot decide on no facts                                   ${stuck}`);
console.log(`  JUDGMENT  waiting on an assessment nobody made              ${buckets.JUDGMENT.length}`);
console.log(`  FACT      waiting on a fact or record nobody supplied       ${buckets.FACT.length}   <- the evidence-agent population`);
console.log(`  MEANING   waiting on a meaning the document never gave      ${buckets.MEANING.length}`);
console.log(`  CLAUSE    DERIVED, waiting on other clauses                 ${buckets.CLAUSE.length}`);
const noSingle = buckets.FACT.filter((x) => x.movers === 0);
console.log(`\n  FACT clauses moved by NO single declared fact               ${noSingle.length} of ${buckets.FACT.length}`);
for (const x of noSingle) console.log(`     ${x.id}`);
console.log(`  A dispatch target for these is a SET of facts, not a fact: their operators`);
console.log(`  (ordered_before, elapsed_within, amounts_equal) need both operands.`);
console.log(`\n  Every FACT-bucket clause names its read set in the register: ${buckets.FACT.every((x) => x.reads > 0) ? 'YES' : 'NO'}`);
