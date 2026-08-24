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
// and THE ASSESSMENT IS NOT A RESULT: ruled 2026-08-23 (the commit's date; the written date was invented, not observed), argued from the category's own definition
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

// ─── ADOPTION, the act that completes a JUDGMENT clause ─────────────────────────────────────────
//
// RULED 2026-08-23 (the commit's date; the written date was invented, not observed): adopting an assessment is a DISTINCT ACT from supplying a judgment directly,
// with a distinct record. Review falls as agreement is measured, and agreement between agent and
// person is measurable only if the record distinguishes a person who RATIFIED from a person who
// ASSESSED COLD; record adoption as a plain judgment and that measurement is impossible. The
// determination rests on the assessment, so it carries `_on_agent_assessment` IN THE RESULT TOKEN
// (the supplied-meaning precedent, unchanged by this ruling), with `adoption: {of, by, at}` as the
// provenance beside it, and the VALUE IS DERIVED FROM THE IDENTIFIED ASSESSMENT, never restated:
// a restated value is a second representation that diverges silently.
//
// THE ASSESSMENT IS IDENTIFIED BY DIGEST: sha256 over this process's serialisation of the carried
// assessment object, first 16 hex, computed by the router on both sides and compared before
// anything else (compare the digest before comparing any figure). An adoption whose `of` does not
// match the carried assessment is refused, not defaulted.
//
// THREE ACTS, THREE RECORDS: adopt (result `<value>_on_agent_assessment`, determined person,
// adoption key); reject-and-determine-otherwise (the person's own value ARRIVES AS A FACT, the
// judgment channel, plus `rejected: {of, by, at}`); determine cold (the existing
// determined-person record, no assessment involved). A rejection without the person's own
// determination is refused: rejecting is not deciding. An adoption alongside a direct judgment
// fact is refused: one determination, one route.
//
// TWICE, AND REVOCATION, ruled: within a run, adopting twice is impossible by construction, one
// adoption object per clause id; across runs each record stands alone and re-adopting the same
// assessment restates the same determination, legal and idempotent by derivation. REVOCATION DOES
// NOT EXIST AS AN ACT: nothing here persists an adoption to revoke; a later run without the
// adoption is awaiting again, a later run with a rejection is the rejection act, and a `revokes`
// key is refused as unknown.
// `factsDigest` IS PART OF THE ASSESSMENT, echoed from the brief, NOT re-stamped by the router:
// the first version stamped the current run's digest, and the demonstration's rejection leg caught
// it on first run: the person's judgment enters the facts, the re-stamp silently claims the agent
// assessed facts it never saw, and the digest moves under the act that references it. Provenance
// belongs to the moment of production. The router still verifies: an ADOPTION of an assessment
// whose factsDigest differs from the adopting run's facts is refused as stale, because adopting an
// assessment of other facts is deciding on evidence nobody is looking at; a REJECTION tolerates
// the difference, because the person's own judgment IS a changed fact and their determination
// overrides the assessment anyway.
// ─── THE RATIONALE, RULED BY BOYD 2026-08-23: the assessment record carries it ──────────────────
//
// The agent lane was opened on the property that a competent reader can check the assessment
// afterwards, and a record with no slot for the rationale cannot deliver that. FORM, ruled:
// STRUCTURED AGAINST THE CLAUSE'S OWN TEST, not free text, because free text can only be read and
// structure can be checked. The structure:
//
//   rationale: {
//     observations: [ { of: <a fact path THE BRIEF CARRIED>, saw: <the value at that path>,
//                       noted: <what the agent took from it> } ... ],
//     application:  <how the observations meet or fail the clause's standard>
//   }
//
// The checkable half is mechanical and CHECKED HERE: every observation must cite a path present in
// the briefed facts, and `saw` must equal the value actually at that path, so an agent citing
// facts it was never shown, or misquoting ones it was, refuses at the record rather than
// surviving to a reviewer. The application is prose and is the judgment's irreducible part.
//
// SIGNED BY DIGEST, ruled with both sides argued: the rationale is the thing a challenger would
// dispute, which argues for signing it; it is model-authored prose, which the estate's
// refusal-signing precedent keeps out of signed bytes (a sentence inside a signature is a claim
// being attested). Both are honoured: the carried assessment holds rationaleDigest (sha256, this
// process's serialisation, E11), the full rationale rides BESIDE the record, outside any signed
// payload, and a swapped rationale breaks the digest without a signature ever attesting prose.
const ASSESSMENT_KEYS = ['value', 'by', 'at', 'factsDigest', 'rationale'];

const getPath = (root, path) => { let c = root; for (const k of String(path).split('.')) { if (c === null || c === undefined) return undefined; c = c[k]; } return c; };

function validateRationale(clauseId, r, facts) {
  if (r === null || typeof r !== 'object' || Array.isArray(r)) throw new Error(`route: assessment for ${clauseId} refused: the rationale is required and must be structured {observations, application}; it is never defaulted (E30), because an assessment nobody can check is a second opinion with provenance, which A.1 rejects`);
  if (!Array.isArray(r.observations) || r.observations.length === 0) throw new Error(`route: assessment for ${clauseId} refused: the rationale carries no observations; the checkable half of a rationale is what anchors it to the briefed facts`);
  for (const [i, o] of r.observations.entries()) {
    if (typeof o?.of !== 'string' || typeof o?.noted !== 'string' || o.noted === '') throw new Error(`route: assessment for ${clauseId} refused: observation ${i} must carry of (a briefed fact path) and noted (what was taken from it)`);
    const actual = getPath(facts, o.of);
    if (actual === undefined) throw new Error(`route: assessment for ${clauseId} refused: observation ${i} cites ${JSON.stringify(o.of)}, which the briefed facts do not carry. An assessment resting on facts the agent was never shown refuses at the record.`);
    if (JSON.stringify(o.saw) !== JSON.stringify(actual)) throw new Error(`route: assessment for ${clauseId} refused: observation ${i} says it saw ${JSON.stringify(o.saw)} at ${o.of}, and the briefed facts hold ${JSON.stringify(actual)}. A misquoted fact refuses at the record.`);
  }
  if (typeof r.application !== 'string' || r.application === '') throw new Error(`route: assessment for ${clauseId} refused: the rationale carries no application; the observations alone do not say how they meet or fail the standard`);
}
const ADOPTION_KEYS = ['of', 'by', 'at'];
const REJECTION_KEYS = ['rejects', 'by', 'at'];

const assessmentDigest = (a) => createHash('sha256').update(JSON.stringify(a)).digest('hex').slice(0, 16);

function validateActRecord(clauseId, r, keys, what) {
  for (const k of Object.keys(r)) {
    if (!keys.includes(k)) throw new Error(`route: ${what} for ${clauseId} refused: unknown key ${JSON.stringify(k)}; ${what === 'adoption' ? 'an adoption carries exactly of, by, at, and revocation does not exist as an act' : `a ${what} carries exactly ${keys.join(', ')}`}`);
  }
  for (const k of keys) {
    if (typeof r[k] !== 'string' || r[k] === '') throw new Error(`route: ${what} for ${clauseId} refused: ${k} is required and absent. Provenance is part of the ${what}, and absent is not a default (E30).`);
  }
}
const REFUSE_KEYS = [
  [/^facts?$|^fact_/, 'an agent must not supply a fact: facts belong to the fact channel and its source systems'],
  [/^resolutions?$|^resolution_/, 'an agent must not resolve an ambiguity: a resolution is the institution\'s, supplied in `resolutions`'],
  [/^meanings?$|^ungrounded/, 'an agent must not supply a meaning: a meaning is the institution\'s, supplied in `resolutions.ungrounded_terms`'],
];

function validateAssessment(clauseId, a, facts) {
  for (const [re, why] of REFUSE_KEYS) {
    for (const k of Object.keys(a)) if (re.test(k)) throw new Error(`route: assessment for ${clauseId} refused: ${why} (offending key ${JSON.stringify(k)})`);
  }
  for (const k of Object.keys(a)) {
    if (!ASSESSMENT_KEYS.includes(k)) throw new Error(`route: assessment for ${clauseId} refused: unknown key ${JSON.stringify(k)}; an assessment carries exactly value, by, at`);
  }
  for (const k of ['value', 'by', 'at', 'factsDigest']) {
    if (typeof a[k] !== 'string' || a[k] === '') throw new Error(`route: assessment for ${clauseId} refused: ${k} is required and absent. Provenance is part of the assessment, and absent is not a default (E30).`);
  }
  validateRationale(clauseId, a.rationale, facts);
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
      factsDigest: createHash('sha256').update(JSON.stringify(facts)).digest('hex').slice(0, 16),
    });
  }
  return briefs;
}

export function route(register, facts, resolutions = {}, opts = {}) {
  const assessments = opts.assessments ?? {};
  const adoptions = opts.adoptions ?? {};
  for (const id of Object.keys(adoptions)) {
    const c = register.clauses.find((x) => x.id === id);
    if (c === undefined) throw new Error(`route: adoption offered for ${id}, which this register does not have`);
    if (laneStampOf(register, c).lane !== 'agent') throw new Error(`route: adoption for ${id} refused: the register does not route it to the agent, so there is no assessment there to adopt`);
  }
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
        // An ungrounded clause's determination rests on the institution's meaning, not the person:
        // the evaluated record passes through (the predicate fix of 2026-08-23; see the agent arm).
        if (c.evaluate?.op === 'ungrounded') { out[c.id] = rec; break; }
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
        const act = adoptions[c.id];
        // ─── the ungrounded predicate, closed 2026-08-23. PREDICTED BY THIS FILE'S OWN HEADER
        //     before it occurred: a JUDGMENT clause whose evaluation is not a bare held_judgment
        //     needed its own unproduced predicate. feca/2-0805/7/b/chain is `ungrounded`: with no
        //     meaning it evaluates `undetermined`, never `not_assessed`, and the old test read
        //     that as a person's determination. An ungrounded clause's determination rests on the
        //     institution's meaning, not on any lane: the evaluated record passes through, and an
        //     assessment or adoption offered for it refuses naming the owner.
        if (c.evaluate?.op === 'ungrounded') {
          if (a !== undefined || act !== undefined) throw new Error(`route: ${c.id} rests on an ungrounded term; its determination is the evaluation over the institution's supplied meaning, and no lane assesses or adopts it. Owner: resolutions.ungrounded_terms.`);
          out[c.id] = rec;
          break;
        }
        const carried = a === undefined ? undefined
          : (validateAssessment(c.id, a, facts),
             { value: a.value, by: a.by, at: a.at, register: `${register.domain}@${register.register_version}`, factsDigest: a.factsDigest,
               rationaleDigest: createHash('sha256').update(JSON.stringify(a.rationale)).digest('hex').slice(0, 16) });
        if (rec.result !== 'not_assessed') {
          // The person's judgment arrived as a fact: the determination is theirs.
          if (act !== undefined && act.of !== undefined) {
            throw new Error(`route: adoption for ${c.id} refused: a direct judgment is on the facts AND an adoption was supplied. One determination, one route.`);
          }
          if (act !== undefined && act.rejects !== undefined) {
            // THE REJECTION ACT: the person saw the assessment, declined it, and determined
            // otherwise; their determination is the judgment fact, and the record says what was
            // declined.
            if (carried === undefined) throw new Error(`route: rejection for ${c.id} refused: no assessment is carried, so there is nothing to reject`);
            validateActRecord(c.id, act, REJECTION_KEYS, 'rejection');
            const dg = assessmentDigest(carried);
            if (act.rejects !== dg) throw new Error(`route: rejection for ${c.id} refused: it identifies assessment ${act.rejects} and the carried assessment digests to ${dg}. A rejection whose assessment cannot be identified is refused, not defaulted.`);
            out[c.id] = { ...rec, determined: 'person', rejected: { of: dg, by: act.by, at: act.at } };
            break;
          }
          if (carried !== undefined) throw new Error(`route: assessment for ${c.id} refused: the person's judgment is on the facts and the determination is made. If the person REJECTED this assessment, say so: adoptions[id] = { rejects: <digest>, by, at } beside their judgment. Silent coexistence is refused because absence of a rejection is not a rejection (E30).`);
          out[c.id] = { ...rec, determined: 'person' };
          break;
        }
        // No direct judgment on the facts.
        if (act !== undefined) {
          if (act.rejects !== undefined) throw new Error(`route: rejection for ${c.id} refused: rejecting is not deciding. The person's own determination arrives the way a fact arrives, and none did.`);
          validateActRecord(c.id, act, ADOPTION_KEYS, 'adoption');
          if (carried === undefined) throw new Error(`route: adoption for ${c.id} refused: no assessment is carried in this run, so the adoption identifies nothing. An adoption whose assessment cannot be identified is refused, not defaulted.`);
          const dg = assessmentDigest(carried);
          if (act.of !== dg) throw new Error(`route: adoption for ${c.id} refused: it identifies assessment ${act.of} and the carried assessment digests to ${dg}. An adoption whose assessment cannot be identified is refused, not defaulted.`);
          if (carried.factsDigest !== factsDigest) throw new Error(`route: adoption for ${c.id} refused: the assessment was made over facts digesting ${carried.factsDigest} and this run's facts digest ${factsDigest}. Adopting an assessment of other facts is deciding on evidence nobody is looking at; re-assess, then adopt.`);
          // THE ADOPTED DETERMINATION: value DERIVED from the identified assessment, the route in
          // the result token, the act's provenance beside it.
          out[c.id] = {
            ...stamp, waiting: 'none',
            result: `${carried.value}_on_agent_assessment`,
            determined: 'person',
            assessment: carried,
            adoption: { of: dg, by: act.by, at: act.at },
            rationale: a.rationale,   // beside the record, outside any signed payload; the digest above binds it
          };
          break;
        }
        if (carried === undefined) {
          out[c.id] = { ...stamp, waiting: 'judgment', awaiting: 'person' };
          break;
        }
        out[c.id] = { ...stamp, waiting: 'judgment', awaiting: 'person', assessment: carried, rationale: a.rationale };
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
