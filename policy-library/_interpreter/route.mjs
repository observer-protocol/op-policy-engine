#!/usr/bin/env node
/**
 * ─── THE ROUTER. Phase 1. ───────────────────────────────────────────────────────────────────────
 *
 * Dispositions are data, so this is a lookup: each clause routes to the lane its register's
 * `lanes` section gives it, with the per-clause override applied where present. The routing key is
 * the clause's disposition, assigned once at conversion, never a confidence score guessed at
 * runtime.
 *
 *   engine   dispatches to the interpreter. The record is the interpreter's record.
 *   person   dispatches to NOTHING: there is no person surface. A person's determination arrives
 *            AS A FACT (the held judgment), which is what JUDGMENT has meant since the first
 *            register: `evaluate, taking the judgment as an INPUT. Never inferred, never
 *            defaulted.` So a person-lane clause whose judgment is on the record IS a person
 *            determination, carried; one whose judgment nobody has made yields the AWAITING
 *            shape, which is a record saying the lane produced nothing, distinct from a refusal.
 *   agent, panel  reachable only by a register that names them, and no register does today. A
 *            determination arriving at either is an ERROR naming the clause and the lane. Not a
 *            stub, not a fallthrough to engine: a lane that silently degrades to engine would put
 *            an engine determination where a supervisor was told an agent's would be.
 *
 * ─── EVALUATION IS UNCHANGED UNDERNEATH ─────────────────────────────────────────────────────────
 *
 * The router runs the interpreter over the whole register first, because dependencies do not care
 * about lanes: firmeza (engine) composes p4/language (person), and the composition's semantics,
 * `not_assessed` carried as `undetermined` through a total remap, are the register's, ruled and
 * frozen. Routing is a RECORD-LEVEL projection on top of that evaluation. Parity is a claim about
 * interpret(), not about this file.
 *
 * ─── WHAT `UNPRODUCED` MEANS HERE, and its stated limit ─────────────────────────────────────────
 *
 * A person-lane record is unproduced when its result is `not_assessed`: every JUDGMENT clause in
 * the three registers evaluates as a bare `held_judgment` over one fact, measured, so the token is
 * currently exact. Two boundaries, stated rather than discovered later: a judgment RECORDED as the
 * literal string `not_assessed` is indistinguishable from one nobody made, which is E30's second
 * granularity at `held_judgment` and is not resolved here; and a future JUDGMENT clause whose
 * evaluation is not a bare held_judgment needs its own unproduced predicate, which this file will
 * throw into visibility only by mis-shaping its record, so the assumption is stated where the
 * next author will look.
 */
import { createHash } from 'node:crypto';
import { interpret, laneStampOf, RECORD_VERSION } from './interpret.mjs';

// ─── THE AGENT TIER, Phase 2 ────────────────────────────────────────────────────────────────────
//
// ONE AGENT, AGAINST JUDGMENT CLAUSES ONLY. Its input is what agentBriefs() returns: the clause
// text, the register's own statement of the clause, and the facts. Its output is an ASSESSMENT,
// and THE ASSESSMENT IS NOT A RESULT: ruled 2026-08-24, argued from the category's own definition
// (`JUDGMENT: taking the judgment as an INPUT. Never inferred, never defaulted`; an agent output
// adopted silently is an inferred judgment), from section 6's own words (`an assessment recorded
// as an assessment`), from the gathering rule with `assessor` substituted (the moment an assessor
// can settle a clause, the disposition system is bypassed), and from review starting high. The
// record CARRIES the assessment while the clause remains awaiting a person; a person adopting it
// produces `<token>_on_agent_assessment` in the result token, the supplied-meaning precedent, and
// no surface for adoption exists yet.
//
// WHAT THE AGENT CANNOT DO, each refusal enforced here and shown firing in the block that landed
// this: settle a clause the register did not route to it; supply a fact (facts belong to the fact
// channel and its source systems); resolve an ambiguity (a resolution is the institution's, in
// `resolutions`); supply a meaning (a meaning is the institution's, in
// `resolutions.ungrounded_terms`). And the tier serves JUDGMENT clauses only: an agent-routed
// clause of any other disposition refuses at the brief, before any agent runs.
//
// PROVENANCE IS PART OF THE ASSESSMENT: `by` (which agent) and `at` (when, CALLER-SUPPLIED, never
// a clock this code invents) are required and refused when absent; the router itself stamps
// `register` (domain@version) and `factsDigest` (sha256 over the run's serialised facts, first 16
// hex; a digest of THIS process's serialisation, not a canonical form, stated per E11's lesson).

const ASSESSMENT_KEYS = ['value', 'by', 'at'];
const REFUSE_KEYS = [
  [/^facts?$|^fact_/, 'an agent must not supply a fact: facts belong to the fact channel and its source systems'],
  [/^resolutions?$|^resolution_/, 'an agent must not resolve an ambiguity: a resolution is the institution\'s, supplied in `resolutions`'],
  [/^meanings?$|^ungrounded/, 'an agent must not supply a meaning: a meaning is the institution\'s, supplied in `resolutions.ungrounded_terms`'],
];

function validateAssessment(clauseId, a) {
  for (const [re, why] of REFUSE_KEYS) {
    for (const k of Object.keys(a)) if (re.test(k)) throw new Error(`route: assessment for ${clauseId} refused: ${why} (offending key ${JSON.stringify(k)})`);
  }
  for (const k of Object.keys(a)) {
    if (!ASSESSMENT_KEYS.includes(k)) throw new Error(`route: assessment for ${clauseId} refused: unknown key ${JSON.stringify(k)}; an assessment carries exactly value, by, at`);
  }
  for (const k of ASSESSMENT_KEYS) {
    if (typeof a[k] !== 'string' || a[k] === '') throw new Error(`route: assessment for ${clauseId} refused: ${k} is required and absent. Provenance is part of the assessment, and absent is not a default (E30).`);
  }
}

/** What to dispatch the agent against: the register's own declaration, never a free-form
 *  instruction. One brief per agent-routed clause; refuses at the brief for any non-JUDGMENT
 *  disposition, before an agent runs. */
export function agentBriefs(register, facts) {
  const briefs = [];
  for (const c of register.clauses) {
    const stamp = laneStampOf(register, c);
    if (stamp.lane !== 'agent') continue;
    if (c.disposition !== 'JUDGMENT') {
      throw new Error(`agentBriefs: ${c.id} is ${c.disposition} and routed to the agent lane; the agent tier serves JUDGMENT clauses only`);
    }
    briefs.push({
      clauseId: c.id,
      text: c.text,
      assertion: c.assertion,
      disposition: c.disposition,
      register: `${register.domain}@${register.register_version}`,
      facts,
    });
  }
  return briefs;
}

export function route(register, facts, resolutions = {}, opts = {}) {
  const assessments = opts.assessments ?? {};
  // An assessment offered for a clause the register did not route to the agent refuses before
  // anything is evaluated: the register declares what a clause needs, and settling an unrouted
  // clause is the first thing the agent must not be able to do.
  for (const id of Object.keys(assessments)) {
    const c = register.clauses.find((x) => x.id === id);
    if (c === undefined) throw new Error(`route: assessment offered for ${id}, which this register does not have`);
    const lane = laneStampOf(register, c).lane;
    if (lane !== 'agent') throw new Error(`route: assessment for ${id} refused: the register routes it to lane ${JSON.stringify(lane)}, not to the agent; an agent must not settle a clause the register did not route to it`);
  }
  const evaluated = interpret(register, facts, resolutions);
  const factsDigest = createHash('sha256').update(JSON.stringify(facts)).digest('hex').slice(0, 16);
  const out = {};
  for (const c of register.clauses) {
    const stamp = laneStampOf(register, c);
    const rec = evaluated[c.id];
    switch (stamp.lane) {
      case 'engine':
      case 'none':
        out[c.id] = rec;
        break;
      case 'person':
        // The person's determination arrived as a fact, or it did not exist to arrive.
        out[c.id] = rec.result === 'not_assessed'
          ? { ...stamp, waiting: 'judgment', awaiting: 'person' }
          : rec;
        break;
      case 'agent': {
        if (c.disposition !== 'JUDGMENT') {
          throw new Error(`route: ${c.id} is ${c.disposition} and routed to the agent lane; the agent tier serves JUDGMENT clauses only`);
        }
        const a = assessments[c.id];
        if (rec.result !== 'not_assessed') {
          // The person's judgment arrived as a fact: the determination is theirs, said on the
          // record rather than left to an invariant a reader would have to know.
          if (a !== undefined) throw new Error(`route: assessment for ${c.id} refused: the person's judgment is on the facts and the determination is made; an assessment has nothing to attach to. Re-running the agent against a decided clause is not carrying, it is second-guessing.`);
          out[c.id] = { ...rec, determined: 'person' };
          break;
        }
        if (a === undefined) {
          out[c.id] = { ...stamp, waiting: 'judgment', awaiting: 'person' };
          break;
        }
        validateAssessment(c.id, a);
        out[c.id] = {
          ...stamp, waiting: 'judgment', awaiting: 'person',
          assessment: { value: a.value, by: a.by, at: a.at, register: `${register.domain}@${register.register_version}`, factsDigest },
        };
        break;
      }
      case 'panel':
        throw new Error(
          `route: ${c.id} is routed to lane ${JSON.stringify(stamp.lane)} (${stamp.lane_from}), ` +
          `which nothing serves. A determination cannot arrive here; this is an error, not a stub, ` +
          `and it does not fall through to engine.`);
      default:
        throw new Error(`route: ${c.id} carries unregistered lane ${JSON.stringify(stamp.lane)}`);
    }
  }
  return out;
}
