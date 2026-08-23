#!/usr/bin/env node
/**
 * ONE INTERPRETER. It reads a register and evaluates it. There is no per-domain code in this file
 * and no domain name appears in it.
 *
 * ═══ THE ONE PLACE OPERANDS ARE FORCED ══════════════════════════════════════════════════════════
 *
 * `force(node, ctx)` below is the ONLY site in this file where an expression is evaluated. Every
 * primitive and every shape receives its operands as UNEVALUATED NODES and decides, in its own
 * definition, which of them to force and in what order. Nothing else in this file may call a
 * handler directly, and no handler may evaluate a node except by calling `force`.
 *
 * THE RULE STATED HERE, which is what REUSE-LOG E17 asks for:
 *
 *     An operand is forced at this site and nowhere else. Whether a shape forces an operand at all
 *     is a property of that shape's definition, never of the order its arguments happen to appear
 *     in a call. A shape whose closed arm must not see an operand states that by not forcing it.
 *
 * WHY THAT MATTERS AND WHAT IT COSTS IF IT IS LOST. E17's defect was `attribute_to_supplied_meaning`
 * being gated on a lexical read: three call sites passed thunks to `applicability_gate`, so their
 * meaning was unreachable until the gate held, and a fourth passed a VALUE to
 * `conditional_requirement`, whose arguments JavaScript evaluates eagerly. The meaning was read
 * before the precondition was tested, and the run reported `not_applicable_on_supplied_meaning`: an
 * institution's supplied meaning marked as having borne on a determination it did not bear on.
 *
 * A generic interpreter written the obvious way REPRODUCES THAT DEFECT EXACTLY, because
 * `handler(force(a), force(b))` is the same eager evaluation one level up. It is avoided here only
 * because handlers take nodes rather than values. `_phase0/show-e17.mjs` counts the forcing sites
 * in this file and shows the E17 case coming out `not_applicable` on both rows.
 *
 * ═══ WHAT IT DOES NOT DO ════════════════════════════════════════════════════════════════════════
 *
 * It resolves no ambiguity and supplies no meaning for an ungrounded term. Both arrive as explicit
 * inputs and a clause that depends on one that was not supplied returns `undetermined`. It never
 * reads a clock: `clock.now` is a fact, absent by default, never `Date.now()`.
 */
import { readFileSync } from 'node:fs';

/**
 * ─── RECORD FORMAT VERSION ──────────────────────────────────────────────────────────────────────
 *
 * Every record opens `v, lane, lane_from, waiting`. VERSION 6 names the current shape, the union:
 *
 *   { v, lane, lane_from, waiting, result, note?, ...extras }   a determination
 *   { v, lane, lane_from, waiting, result, determined }         a determination on an AGENT-routed
 *                                                               clause; `determined: "person"` says
 *                                                               whose it is, because agents never
 *                                                               determine (see route.mjs)
 *   { v, lane, lane_from, waiting, awaiting }                   routed to a lane that has not produced one
 *   { v, lane, lane_from, waiting, awaiting, assessment }       agent-routed: the agent's assessment,
 *                                                               carried NOT TAKEN while the clause
 *                                                               awaits a person
 *   { v, lane, lane_from, waiting, result, determined,
 *     assessment, adoption }                                    ADOPTED: the person took the
 *                                                               identified assessment; the value is
 *                                                               DERIVED from it and the route is in
 *                                                               the result token,
 *                                                               `<value>_on_agent_assessment`
 *   { v, lane, lane_from, waiting, result, determined,
 *     rejected }                                                REJECTED: the person declined the
 *                                                               identified assessment and their own
 *                                                               judgment, arrived as a fact, decides
 *   { v, lane, lane_from, waiting, no_result, supplies }        DEFINITIONAL
 *   { v, lane, lane_from, waiting, refused, why }               INSTRUCTION, ILLUSTRATIVE
 *
 * Version 5 was the union without the adoption and rejection shapes; 4 without the agent shapes;
 * 3 without `waiting`; 2 without the awaiting shape; 1 without lanes.
 *
 * THE LANE'S SEMANTICS AT v5, amended by extension: `lane` names the lane the register ROUTES the
 * clause to. For every record v4 could emit, routing and ownership coincide, so no v4 byte
 * differs; the two diverge only on agent-routed records, where the ROUTE is the agent and the
 * DETERMINATION is always a person's, which is the item-2 ruling of 2026-08-24: an agent
 * assessment does not satisfy a clause; it is carried, not taken, until a person adopts it. A
 * determination adopted from an agent assessment carries that IN THE RESULT TOKEN, as
 * `<token>_on_agent_assessment`, following the supplied-meaning precedent; that state is ruled
 * and named here, and is reachable only when a person surface exists, which none does.
 *
 * ─── THE WAITING AXIS ───────────────────────────────────────────────────────────────────────────
 *
 * `waiting` says what THIS RUN of the clause is waiting on: `fact`, `judgment`, `meaning`,
 * `clause`, or `none`. `none` is explicit and never absent (E30). It is computed at emission from
 * the emitter kind and the absence origins tracked during evaluation, per run, never stored. The
 * vocabulary is register data (`register.waiting`), one authored copy; the tracking is
 * per-implementation and parity compares it on every record.
 *
 * WHAT `waiting: "fact"` DOES AND DOES NOT ESTABLISH, stated here because a reader meets it on the
 * record, not in a log. It establishes that a fact the clause reads was NEVER SUPPLIED in this
 * run's inputs. It does NOT establish that anyone asked for the fact, that a request went
 * unanswered, or that the counterparty withheld it. psr-2017/75/3 is the standing example: reg
 * 75(3) allocates a burden, silence counts against the burden-bearer, so `floor_not_met` is a
 * CORRECT determination carrying `waiting: "fact"`; the record cannot distinguish a provider who
 * was asked and produced nothing from a provider nobody asked, and a reader who takes
 * `waiting: "fact"` as evidence that a request was made has read something the record does not
 * say. Distinguishing those needs an ask-state fact in the fact schema (the shape
 * `expediente.requested` already has), which no clause of 75(3)'s kind yet carries.
 *
 * Two further stated limits: an unresolved AMBIGUITY RESOLUTION (A1, P1) is not expressible in the
 * five values and falls to `fact` through the fallback, documented rather than absorbed; and a
 * judgment RECORDED as the literal `not_assessed` is indistinguishable from one nobody made
 * (E30's second granularity at held_judgment).
 * The `awaiting` shape is emitted only by the router (route.mjs), never by evaluation, and it is
 * in THIS union because the version names the format: a v2 reader meeting an awaiting record would
 * meet a shape v2 never declared, which is the drift the version field exists to prevent.
 *
 * THE LANE'S SEMANTICS AT v3, amended by extension: `lane` names the lane that OWNS the clause's
 * determination, and whether one EXISTS is carried by the discriminant key (`result` against
 * `awaiting`). At v2 the ruling was `what produced it`; for every record v2 could emit the owner
 * IS the producer, so no v2 byte would have differed, and the amendment only becomes visible on
 * the shape v2 could not express. `lane: "none"` keeps its v2 meaning exactly: no lane owns it and
 * none ever will, which is why an unproduced person record is NOT `none` — the routing is the fact
 * the record exists to carry, and `none` would erase it.
 *
 * THE LANE ON THE RECORD. `lane` is one of the four lane tokens, or `none`. `lane_from` says
 * whether it came from the register's disposition lookup (`lookup`) or a per-clause override
 * (`override`). NOTHING DISPATCHES ON IT YET; the determination states which lane produced it and
 * the record carries it, which is the property that makes the record interrogable.
 *
 * THE NO-LANE RULING, in the code rather than left to a reader. A record for a clause whose
 * disposition has no lane says `lane: "none"`, and it says so whether the clause REFUSES
 * (INSTRUCTION, ILLUSTRATIVE) or SUPPLIES A MEANING instead of a result (DEFINITIONAL). It is
 * deliberately NOT `engine`, although this machinery emitted the record: a lane names what
 * produced a DETERMINATION, and none of these records is one; stamping `engine` would let a
 * refusal read as an engine determination. ONE TOKEN for both kinds of laneless record is
 * acceptable because the conflation exists only on the lane axis and the record's own
 * discriminant, `no_result` against `refused`, carries the difference one key away. On the lane
 * axis the two really do share one fact: nothing was routed and nothing was decided.
 *
 * TWO RULINGS, IN THE CODE RATHER THAN LEFT TO A READER:
 *
 *   1. REFUSAL RECORDS CARRY THE SAME FIELD, SAME VALUE. The version names the record FORMAT, the
 *      union above, not the happy path. A separate refusal version would let the two halves drift
 *      independently, and a format change to refusals could then hide under an unchanged result
 *      version. A refusal read apart from its oracle must state what it is exactly as a result must.
 *
 *   2. AN ABSENT `v` IS UNVERSIONED, NOT VERSION 0. One statement of the property, three
 *      granularities, and the enforcement sites: REUSE-LOG E30. `recordVersion` below is this
 *      granularity's enforcement: it THROWS on an absent version, the same discipline as `resultOf`.
 */
export const RECORD_VERSION = 6;
export const KNOWN_RECORD_VERSIONS = new Set([1, 2, 3, 4, 5, 6]);

/** The absent-version ruling, enforced. Unversioned is a state, not version 0: REUSE-LOG E30.
 *  Accepts 1 and 2; a version outside the known set throws, because a reader that passes an
 *  unknown version through has decided it understands a construction nobody has named yet. */
export function recordVersion(rec) {
  if (rec === undefined || rec === null) throw new Error('recordVersion: no record');
  if (!('v' in rec)) throw new Error('recordVersion: the record carries no version. It is UNVERSIONED, which is not version 0; decide from its provenance, not from a default.');
  if (!KNOWN_RECORD_VERSIONS.has(rec.v)) throw new Error(`recordVersion: unknown record version ${JSON.stringify(rec.v)}; known: ${[...KNOWN_RECORD_VERSIONS].join(', ')}`);
  return rec.v;
}

/** The record opening, computed once per clause from the register's lanes section. Exported for
 *  the router, which stamps the same opening on the awaiting shape. */
export function laneStampOf(register, c) {
  const lookup = register.lanes?.lookup;
  if (lookup === undefined) throw new Error('the register declares no lanes.lookup; rebuild it');
  const e = lookup[c.disposition];
  if (e === undefined) throw new Error(`${c.id}: disposition ${c.disposition} has no lane lookup entry`);
  if (e.no_lane !== undefined) {
    if (c.lane_override !== null && c.lane_override !== undefined) throw new Error(`${c.id}: lane_override on a laneless disposition`);
    return { v: RECORD_VERSION, lane: 'none', lane_from: 'lookup' };
  }
  if (c.lane_override !== null && c.lane_override !== undefined) {
    if (c.lane_override === e.lane) throw new Error(`${c.id}: lane_override restates the lookup's lane; R14`);
    return { v: RECORD_VERSION, lane: c.lane_override, lane_from: 'override' };
  }
  return { v: RECORD_VERSION, lane: e.lane, lane_from: 'lookup' };
}

const DAY_MS = 86400000;

// ════════════════════════════════════════════════════════════════════════════════════════════════
// PRIMITIVES. One definition each, serving every domain. These are the estate's primitive set with
// the two copies collapsed: `elapsed_within` here is the union of the two, which differed only in
// PSR's `months` unit, declared as a sanctioned difference, and in whether an instant was carried as
// a number or a Date, which is not a difference in behaviour. REUSE-LOG E5 is the entry that says a
// correction has to land twice; here there is one place for it to land.
// ════════════════════════════════════════════════════════════════════════════════════════════════

const withinLimit = (s, e, limit, unit) => {
  if (unit === 'calendar_days') return (e - s) <= limit * DAY_MS;
  if (unit === 'business_days') {
    // Counted by walking days and skipping Saturday and Sunday. A real deployment substitutes the
    // supervisor's calendar; the shape is unchanged by that substitution.
    let n = 0;
    for (let t = s + DAY_MS; t <= e; t += DAY_MS) {
      const d = new Date(t).getUTCDay();
      if (d !== 0 && d !== 6) n++;
    }
    return n <= limit;
  }
  if (unit === 'months') {
    const cap = new Date(s); cap.setUTCMonth(cap.getUTCMonth() + limit);
    return e <= cap.getTime();
  }
  throw new Error(`unknown calendar unit: ${unit}`);
};

const PRIMITIVES = {
  field_present: (v) => (v === null || v === undefined || v === '' ? 'absent' : 'present'),
  all_present: (vs) => (vs.every((v) => PRIMITIVES.field_present(v) === 'present') ? 'all_present' : 'some_absent'),
  any_present: (alts) => (alts.some((v) => PRIMITIVES.field_present(v) === 'present') ? 'one_present' : 'none_present'),
  member_of_enumeration: (v, en) => (en.includes(v) ? 'member' : 'not_member'),

  // ADDED IN PHASE 0. See REUSE-LOG E19 for the source text that forced it. It reports whether every
  // item in a list is a member of a declared enumeration. That sentence mentions neither syntax nor
  // return type, which is E10's test, and it is the list lift of `member_of_enumeration` exactly as
  // `all_present` is the list lift of `field_present`, which is the argument that it belongs to this
  // layer rather than being a clause's own logic.
  all_members_of_enumeration: (items, en) => (items.every((i) => en.includes(i)) ? 'all_members' : 'some_not_member'),
  member_of_register: (c, reg) => (PRIMITIVES.field_present(c) === 'absent' ? 'no_candidate' : (reg.includes(c) ? 'member' : 'not_member')),
  none_of_class_present: (items, prohibited) => (items.some((i) => prohibited.includes(i)) ? 'prohibited_present' : 'clear'),
  open_set_floor: (results) => (results.every((r) => r === true) ? 'floor_met' : 'floor_not_met'),
  held_judgment: (a) => (a === undefined || a === null ? 'not_assessed' : a),

  // The independence relation is a CLOSED TOKEN rather than a function, because a register is data
  // and a function is not. `distinct_values` is the only relation any clause in the estate asks for,
  // and primitives.json already types this parameter `equivalence_relation`, so the token is the
  // shape that declaration was written for.
  distinct_members_at_least: (items, min, relation) => {
    if (relation !== 'distinct_values') throw new Error(`distinct_members_at_least: unregistered independence relation ${JSON.stringify(relation)}`);
    const kept = [];
    for (const it of items) if (kept.every((k) => k !== it)) kept.push(it);
    return kept.length >= min ? 'met' : 'not_met';
  },

  // PARAMETERISED with `now`, closing E1. Without a clock an absent end event cannot be told from a
  // late one, and no composition rule restores a distinction that was never derived. The SAME
  // predicate decides `within` and `not_yet_due`, so the two vocabularies cannot disagree about
  // where the boundary is.
  elapsed_within: (start, end, limit, unit, now) => {
    if (start === null || start === undefined) return 'no_end_event';
    const s = Date.parse(start);
    if (Number.isNaN(s)) return 'no_end_event';
    if (end === null || end === undefined) {
      if (now === null || now === undefined) return 'no_end_event';   // no clock: cannot tell, and says so
      const t = Date.parse(now);
      if (Number.isNaN(t)) return 'no_end_event';
      if (t < s) return 'out_of_order';                               // the clock precedes the start event
      return withinLimit(s, t, limit, unit) ? 'not_yet_due' : 'overdue';
    }
    const e = Date.parse(end);
    if (Number.isNaN(e)) return 'no_end_event';
    if (e < s) return 'out_of_order';                                 // an end event cannot precede its trigger
    return withinLimit(s, e, limit, unit) ? 'within' : 'exceeded';
  },

  ordered_before: (a, b) => {
    if (a === null || a === undefined || b === null || b === undefined) return 'missing_operand';
    const x = Date.parse(a), y = Date.parse(b);
    if (Number.isNaN(x) || Number.isNaN(y)) return 'missing_operand';
    return x < y ? 'before' : x > y ? 'after' : 'simultaneous';
  },

  amounts_equal: (a, b) => {
    if (!a || !b) return 'missing_operand';
    if (a.currency !== b.currency) return 'incomparable_currency';
    const scale = (v) => BigInt(v.amountRaw) * (10n ** BigInt(6 - Number(v.decimals)));
    return scale(a) === scale(b) ? 'equal' : 'not_equal';
  },

  // A CLOSED FOUR-TOKEN VOCABULARY that throws on anything else, so a register that invents a fifth
  // state fails loudly instead of being read as `false`. Deliberately NOT coupled to any other
  // primitive's tokens: mapping a result domain into these four is the clause's reading and belongs
  // at the clause, which is where `remap_result_domain` puts it.
  conditional_requirement: (pre, result) => {
    if (!pre) return 'not_applicable';
    if (result === true) return 'satisfied';
    if (result === false) return 'breached';
    if (result === 'outstanding') return 'outstanding';
    if (result === 'undetermined') return 'undetermined';
    throw new Error(`conditional_requirement: unrecognised requirement result ${JSON.stringify(result)}`);
  },
};

export const PRIMITIVE_NAMES = Object.keys(PRIMITIVES).sort();

const CONJUNCTION_TOKENS = new Set([true, false, 'satisfied', 'undetermined']);

// ════════════════════════════════════════════════════════════════════════════════════════════════
// THE FORCING SITE. Read the header before adding a case.
// ════════════════════════════════════════════════════════════════════════════════════════════════

function force(node, ctx) {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    throw new Error(`expression node must be an object, got ${JSON.stringify(node)}`);
  }
  const h = OPS[node.op];
  if (h === undefined) throw new Error(`unregistered expression op ${JSON.stringify(node.op)}`);
  return h(node, ctx);
}

const strictBoolean = (v, where) => {
  if (v === true || v === false) return v;
  throw new Error(`${where}: expected a strict boolean, got ${JSON.stringify(v)}`);
};

// Whether a clause's evaluation reads any fact of its own, computed once per register and cached.
// The `undetermined` fallback needs it: with no tracked origin, a fact-reading clause waits on a
// fact and a clause reading only other clauses waits on them.
const STATIC_READS_FACTS = new WeakMap();
function readsFactsOf(register) {
  let m = STATIC_READS_FACTS.get(register);
  if (m !== undefined) return m;
  m = {};
  const walk = (n, acc, seen) => {
    if (n === null || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const x of n) walk(x, acc, seen); return; }
    if (n.op === 'fact') acc.found = true;
    if (n.op === 'binding' && !seen.has(n.name)) { seen.add(n.name); walk(register.bindings[n.name], acc, seen); }
    for (const [k, v] of Object.entries(n)) if (k !== 'op') walk(v, acc, seen);
  };
  for (const c of register.clauses) {
    const acc = { found: false };
    if (c.evaluate !== undefined) walk(c.evaluate, acc, new Set());
    m[c.id] = acc.found;
  }
  STATIC_READS_FACTS.set(register, m);
  return m;
}

const readPath = (root, path) => {
  let c = root;
  for (const k of path.split('.')) {
    if (c === null || c === undefined) return undefined;
    c = c[k];
  }
  return c;
};

// Every handler takes the NODE and forces what it needs. None of them receives a value.
const OPS = {
  // ── leaves ────────────────────────────────────────────────────────────────────────────────────
  const: (n) => n.value,
  absent: () => undefined,
  fact: (n, ctx) => readPath(ctx.facts, n.path),
  resolution: (n, ctx) => (ctx.resolutions === null || ctx.resolutions === undefined ? undefined : ctx.resolutions[n.name]),
  clause_field: (n, ctx) => ctx.clause[n.name],
  ungrounded_term: (n, ctx) => {
    if (ctx.ungroundedTerm === null || ctx.ungroundedTerm === undefined) throw new Error('ungrounded_term is readable only inside an `ungrounded` emission');
    return ctx.ungroundedTerm;
  },

  // A clause result. It throws rather than returning `undefined` for a clause that has no result
  // domain, which is the accessor discipline the register's INSTRUCTION and DEFINITIONAL categories
  // exist to enforce, applied at the one place a clause result can be read.
  clause: (n, ctx) => {
    const e = ctx.out[n.id];
    if (e === undefined) throw new Error(`clause ${n.id} was read before it was emitted`);
    if (!('result' in e)) throw new Error(`clause ${n.id} is ${e.refused ?? e.no_result} and has no result`);
    // An input clause that is itself waiting PROPAGATES ITS CLASS, not a generic marker: the run
    // is waiting on whatever the input waits on, and a generic 'clause' would make the value
    // depend on how expressions happen to be shared, which differs between implementations by
    // construction (found by parity on p4/deadline, first run). 'clause' survives as the
    // no-origin fallback for a derived clause stuck on an unclassifiable input.
    if (e.waiting !== 'none') ctx.waitOrigins.add(e.waiting);
    return e.result;
  },

  // Bindings are NOT memoised. They are pure in (facts, resolutions, results emitted so far), and a
  // cached value would be a value taken at one point in the emission order and read at another.
  binding: (n, ctx) => {
    const b = ctx.register.bindings?.[n.name];
    if (b === undefined) throw new Error(`unregistered binding ${JSON.stringify(n.name)}`);
    return force(b, ctx);
  },

  // Reading the supplied meaning MARKS IT CONSULTED, and it is reachable only inside an `ungrounded`
  // compute, which is the structural half of E17's closure.
  meaning: (n, ctx) => {
    const fr = ctx.meaningFrame;
    if (fr === null) throw new Error('meaning is readable only inside an `ungrounded` compute');
    fr.used = true;
    return fr.supplied[n.key];
  },

  // ── operators ─────────────────────────────────────────────────────────────────────────────────
  eq: (n, ctx) => force(n.left, ctx) === force(n.right, ctx),
  not: (n, ctx) => strictBoolean(force(n.operand, ctx), 'not') === false,

  // JAVASCRIPT TRUTHINESS, AND IT IS DELIBERATELY NOT A PRIMITIVE. `INVENTORY-AUDIT.md` ruled that
  // rendering a boolean into two of a clause's own result tokens belongs to the primitive layer and
  // should stay unnamed, because naming it adds inventory without adding reuse. This op is the
  // COERCION, at the same layer as `eq` and `and`, not the rendering.
  //
  // IT READS A RECORDED `false` AND AN UNFILLED FIELD THE SAME WAY. That is not an oversight: a
  // standing ruling of 2026-08-21 holds it correct for the two Banxico clauses that use it, because
  // `evidence_of_factors_present` is a boolean assertion about the world rather than a container
  // whose fill state is the question, and `field_present` would rule a dictamen stating that no
  // evidence is present as conforming.
  truthy: (n, ctx) => Boolean(force(n.value, ctx)),
  and: (n, ctx) => {
    for (const o of n.operands) if (strictBoolean(force(o, ctx), 'and') === false) return false;   // SHORT-CIRCUITS
    return true;
  },
  or: (n, ctx) => {
    for (const o of n.operands) if (strictBoolean(force(o, ctx), 'or') === true) return true;      // SHORT-CIRCUITS
    return false;
  },
  cond: (n, ctx) => (strictBoolean(force(n.if, ctx), 'cond') ? force(n.then, ctx) : force(n.else, ctx)),
  coalesce: (n, ctx) => { const v = force(n.value, ctx); return v === null || v === undefined ? force(n.fallback, ctx) : v; },
  concat: (n, ctx) => n.parts.map((p) => String(force(p, ctx))).join(''),
  list: (n, ctx) => n.items.map((i) => force(i, ctx)),

  // ── primitives ────────────────────────────────────────────────────────────────────────────────
  primitive: (n, ctx) => {
    const f = PRIMITIVES[n.name];
    if (f === undefined) throw new Error(`unregistered primitive ${JSON.stringify(n.name)}`);
    const args = n.args.map((a) => force(a, ctx));
    const r = f(...args);
    // ── waiting origins. A token that IS absence names what it is absence of; the presence family
    //    additionally probes its ARGUMENT: strictly undefined was never supplied, while a recorded
    //    null, '' or false is someone's answer and marks nothing (E30's field granularity).
    const W = ctx.register.waiting;
    const cls = W.absence_result_tokens[r];
    if (cls !== undefined && cls !== '$composite') ctx.waitOrigins.add(cls);
    if (W.unsupplied_argument_probes.includes(n.name)) {
      const a0 = args[0];
      if (a0 === undefined || (Array.isArray(a0) && a0.some((v) => v === undefined))) ctx.waitOrigins.add('fact');
    }
    return r;
  },

  // ── composition shapes ────────────────────────────────────────────────────────────────────────
  //
  // TWO GATES, NOT ONE PARAMETERISED GATE. `applicability_gate`'s closed arm is always
  // `not_applicable` and `guard_on_unresolved`'s is always `undetermined`, hard-coded here, so that
  // `the requirement failed` and `the requirement never applied` cannot share a shape name and look
  // like agreement. Ruling 2. A register cannot supply either token as a parameter.
  applicability_gate: (n, ctx) => (strictBoolean(force(n.applies, ctx), 'applicability_gate') ? force(n.compute, ctx) : 'not_applicable'),
  guard_on_unresolved: (n, ctx) => (strictBoolean(force(n.usable, ctx), 'guard_on_unresolved') ? force(n.compute, ctx) : 'undetermined'),

  // THE MAPPING MUST BE TOTAL over the source domain. An unlisted token throws rather than falling
  // into an else arm, which is where two hand-written copies of one remap silently disagreed about
  // `denied` (E6). A source domain that is genuinely open declares `$unmapped` explicitly.
  remap_result_domain: (n, ctx) => {
    const v = force(n.value, ctx);
    const key = typeof v === 'string' ? v : JSON.stringify(v);
    if (Object.prototype.hasOwnProperty.call(n.mapping, key)) return force(n.mapping[key], ctx);
    if (Object.prototype.hasOwnProperty.call(n.mapping, '$unmapped')) return force(n.mapping.$unmapped, ctx);
    throw new Error(`remap_result_domain: no mapping for ${JSON.stringify(v)}`);
  },

  conjunction_over_results: (n, ctx) => {
    const rs = force(n.results, ctx);
    for (const r of rs) if (!CONJUNCTION_TOKENS.has(r)) throw new Error(`conjunction_over_results: unrecognised result ${JSON.stringify(r)}`);
    if (rs.includes('undetermined')) return n.undetermined_is === 'fail' ? 'not_satisfied' : 'undetermined';
    return rs.every((r) => r === true || r === 'satisfied') ? 'satisfied' : 'not_satisfied';
  },

  // NAMED IN THIS BLOCK. See REUSE-LOG E18 for the source text that forced it. `true` dominates,
  // then `undetermined`, then `false`: a limb that HOLDS makes the disjunction hold whatever is
  // unknown about the other, and that is not the dual of `conjunction_over_results`, in which
  // `undetermined` dominates instead.
  disjunction_over_results: (n, ctx) => {
    const rs = force(n.results, ctx);
    for (const r of rs) if (!CONJUNCTION_TOKENS.has(r)) throw new Error(`disjunction_over_results: unrecognised result ${JSON.stringify(r)}`);
    if (rs.some((r) => r === true || r === 'satisfied')) return true;
    if (rs.includes('undetermined')) return 'undetermined';
    return false;
  },
};

// ─── THE WAITING CLASSIFIER, at emission ────────────────────────────────────────────────────────
//
// From the final token and the origins the forcing site tracked. Decisions ruled and stated:
//   - not_applicable is ALWAYS none: the obligation never arose, and conditional_requirement's
//     eagerly-evaluated value operand would otherwise mark never-arisen obligations as waiting.
//   - mixed origins resolve by register.waiting.priority: gather before judging (A.3's sequence),
//     meaning prior to both, clause derivative.
//   - a DECIDED result can carry waiting: a burden clause decides on silence and is still waiting
//     on the fact nobody supplied. See the header's 75/3 statement.
//   - an absence-token result with NO tracked origin falls back by the clause's static reads:
//     a fact-reading clause waits on a fact, a clause reading only clauses waits on them. An
//     unresolved ambiguity resolution lands here and reads as `fact`: a stated limit of the
//     five-value vocabulary, not a claim that a resolution is gatherable.
function classifyWaiting(ctx, finalToken) {
  const W = ctx.register.waiting;
  if (ctx.waitMeaning) return 'meaning';
  const over = W.decided_overrides[finalToken];
  if (over !== undefined) return over;
  const pri = W.priority.filter((v) => ctx.waitOrigins.has(v));
  const cls = W.absence_result_tokens[finalToken];
  if (cls !== undefined) {                                  // the result itself is absence
    if (pri.length) return pri[0];
    if (cls !== '$composite') return cls;
    return readsFactsOf(ctx.register)[ctx.clause.id] ? 'fact' : 'clause';
  }
  return pri.length ? pri[0] : 'none';                      // decided, possibly still waiting
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// RECORD-PRODUCING NODES. A clause's `evaluate` is one of these. They are separated from the
// expression ops because a clause emits a RECORD, and a record is not a value another clause can
// compose.
// ════════════════════════════════════════════════════════════════════════════════════════════════

const EMITTERS = {
  // The ordinary emission. `note` and any `extra` entry whose expression yields `undefined` is
  // OMITTED rather than emitted as null, because a clause carrying `note: undefined` and a clause
  // carrying no note are the same statement and must serialise the same way.
  emit: (n, ctx) => {
    // The note and extras are forced BEFORE classification: their evaluation can touch absent
    // inputs, and the hand implementations evaluate every argument before emitting, so a
    // classifier that ran first would see fewer origins than the oracle's. Found by the
    // cross-implementation sweep on 67/1's note.
    const result = force(n.result, ctx);
    const note = n.note !== undefined ? force(n.note, ctx) : undefined;
    const extras = [];
    for (const [k, e] of Object.entries(n.extra ?? {})) { const v = force(e, ctx); if (v !== undefined) extras.push([k, v]); }
    const rec = { ...ctx.laneStamp, waiting: classifyWaiting(ctx, result), result };
    if (note !== undefined) rec.note = note;
    for (const [k, v] of extras) rec[k] = v;
    return rec;
  },

  // A DERIVED clause whose inputs form a small closed cross-product. A table is data: enumerable,
  // checkable for completeness over its input domains, diffable when an institution changes its
  // reading, and every row states what it rests on. A MISSING ROW IS A DEFECT, NEVER A DEFAULT: it
  // throws, which is the property an `else` arm cannot have.
  decision_table: (n, ctx) => {
    const values = {};
    for (const inp of n.inputs) values[inp.name] = force(inp.expr, ctx);
    const row = n.rows.find((r) => n.inputs.every((inp) => r.match[inp.name] === values[inp.name]));
    if (row === undefined) {
      throw new Error(`decision_table: no row for ${n.inputs.map((i) => `${i.name}=${values[i.name]}`).join(', ')}`);
    }
    if (row.outcome_from !== undefined) {
      const sub = n.subtables[row.outcome_from];
      if (sub === undefined) throw new Error(`decision_table: unregistered subtable ${JSON.stringify(row.outcome_from)}`);
      const sv = force(sub.input, ctx);
      const srow = sub.rows.find((r) => r.match === sv);
      if (srow === undefined) throw new Error(`decision_table: no ${row.outcome_from} row for ${JSON.stringify(sv)}`);
      const sw = classifyWaiting(ctx, srow.outcome);
      return srow.note === undefined ? { ...ctx.laneStamp, waiting: sw, result: srow.outcome } : { ...ctx.laneStamp, waiting: sw, result: srow.outcome, note: srow.note };
    }
    const rw = classifyWaiting(ctx, row.outcome);
    return row.note === undefined ? { ...ctx.laneStamp, waiting: rw, result: row.outcome } : { ...ctx.laneStamp, waiting: rw, result: row.outcome, note: row.note };
  },

  // ═══ THE UNGROUNDED SHAPE ══════════════════════════════════════════════════════════════════════
  //
  // A term the document decides outcomes with and supplies no meaning for. The evaluator NEVER
  // supplies one. Where the institution has, the determination rests on the institution rather than
  // on the document, and that is carried IN THE RESULT TOKEN rather than only in a provenance field,
  // so a composition over it must map both tokens and cannot launder one into the other.
  //
  // THE GATE IS AN ARGUMENT OF THIS SHAPE AND NOT SOMETHING A REGISTER MAY PUT INSIDE `compute`.
  // When it does not hold, `compute` is never forced, so the meaning is never reached and the
  // attribution cannot be made. That is E17's closure carried across into the interpreter, and it
  // holds for the same reason it held in the evaluator: the arm is not evaluated, rather than
  // evaluated and discarded.
  //
  // WHAT `USE` MEANS, chosen and stated: CONSULTED ON THE PATH WHERE THE CLAUSE ACTUALLY DECIDES.
  // Not `a meaning that changed the result`, which needs a counterfactual against some other meaning
  // and is not well defined, because without a meaning the result is `undetermined` and every
  // decided result would count as changed.
  ungrounded: (n, ctx) => {
    const decl = ctx.register.ungrounded_terms;
    if (decl === undefined) throw new Error('a clause rests on an ungrounded term and the register declares no `ungrounded_terms` section');
    const savedTerm = ctx.ungroundedTerm;
    ctx.ungroundedTerm = n.term;
    try {
      const supplied = (ctx.resolutions?.ungrounded_terms ?? {})[n.term];
      if (supplied === undefined) {
        // THE EVALUATOR NEVER SUPPLIES A MEANING. The sentence is declared once for the domain, not
        // once per clause, because four copies of one sentence is four places for it to drift.
        ctx.waitMeaning = true;
        return { ...ctx.laneStamp, waiting: 'meaning', result: 'undetermined', undetermined_because: force(decl.undetermined_because, ctx) };
      }
      if (strictBoolean(force(n.applies, ctx), `ungrounded(${n.term})`) === false) {
        return { ...ctx.laneStamp, waiting: 'none', result: 'not_applicable' };   // the meaning is never even reached; nothing waits
      }
      const frame = { term: n.term, supplied, used: false };
      const saved = ctx.meaningFrame;
      ctx.meaningFrame = frame;
      let value;
      try { value = force(n.compute, ctx); } finally { ctx.meaningFrame = saved; }
      if (!frame.used) return { ...ctx.laneStamp, waiting: classifyWaiting(ctx, value), result: value };
      const rec = { ...ctx.laneStamp, waiting: classifyWaiting(ctx, value), result: `${value}_on_supplied_meaning` };
      for (const [k, e] of Object.entries(decl.attribution)) rec[k] = force(e, ctx);
      return rec;
    } finally { ctx.ungroundedTerm = savedTerm; }
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════════

export function loadRegister(path) {
  const r = JSON.parse(readFileSync(path, 'utf8'));
  return r;
}

export function interpret(register, facts, resolutions = {}) {
  const out = {};
  const ctx = { facts, resolutions, out, register, clause: null, meaningFrame: null, ungroundedTerm: null, laneStamp: null, waitOrigins: new Set(), waitMeaning: false };
  const hasResult = new Set(register.dispositions.with_result_domain);

  if (register.waiting === undefined) throw new Error('the register declares no waiting vocabulary; rebuild it');
  for (const c of register.clauses) {
    ctx.clause = c;
    ctx.laneStamp = laneStampOf(register, c);
    ctx.waitOrigins = new Set();
    ctx.waitMeaning = false;
    if (hasResult.has(c.disposition)) {
      if (c.evaluate === undefined) throw new Error(`${c.id} is ${c.disposition} and carries no evaluation`);
      const e = EMITTERS[c.evaluate.op];
      if (e === undefined) throw new Error(`${c.id}: unregistered emitter ${JSON.stringify(c.evaluate.op)}`);
      out[c.id] = e(c.evaluate, ctx);
    } else {
      // NO RESULT DOMAIN. It is EMITTED rather than omitted so that coverage by set equality still
      // holds, and it carries no `result` key so nothing downstream can read one. The emission is
      // declared per disposition in the register, not written per clause, so a category cannot
      // acquire a result by a clause author forgetting.
      const shape = register.dispositions.no_result_emission[c.disposition];
      if (shape === undefined) throw new Error(`${c.id}: ${c.disposition} has neither a result domain nor a declared no-result emission`);
      if (c.evaluate !== undefined) throw new Error(`${c.id} is ${c.disposition} and has no result domain; it must not carry an evaluation`);
      // A clause that will never produce a determination is not waiting for one: none, explicitly.
      const rec = { ...ctx.laneStamp, waiting: 'none' };
      for (const [k, e] of Object.entries(shape)) rec[k] = force(e, ctx);
      out[c.id] = rec;
    }
  }
  ctx.clause = null;
  return out;
}

/** Reading a result from a clause that has none is the silent failure. This refuses instead. */
export function resultOf(out, id) {
  const e = out[id];
  if (e === undefined) throw new Error(`resultOf: ${id} was not emitted`);
  if (!('result' in e)) throw new Error(`resultOf: ${id} is ${e.refused ?? e.no_result} and has no result`);
  return e.result;
}
