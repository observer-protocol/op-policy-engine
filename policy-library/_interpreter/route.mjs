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
import { interpret, laneStampOf, RECORD_VERSION } from './interpret.mjs';

export function route(register, facts, resolutions = {}) {
  const evaluated = interpret(register, facts, resolutions);
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
      case 'agent':
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
