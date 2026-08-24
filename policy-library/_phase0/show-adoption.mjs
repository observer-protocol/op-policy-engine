#!/usr/bin/env node
/**
 * ONE DETERMINATION, END TO END, on a JUDGMENT clause: facts in, routed to the agent, assessed,
 * adopted by a supplied person decision, a signed record out. The first determination in the
 * estate that completes on a judgment clause, and the shape the Molina run needs.
 *
 * The clause: 34-2010/3.6/p4/language (JUDGMENT: is the dictamen in simple and clear language?),
 * routed to the agent by an in-memory override, because no committed register routes any clause to
 * the agent: that is a tier-assignment ruling, not this script's.
 *
 * THE SIGNATURE IS DEMONSTRATION-GRADE AND SAYS SO: an ephemeral ed25519 keypair generated for
 * this run, discarded with the process, no custody claim, no identity claim. What it demonstrates
 * is the SHAPE: which bytes are signed (this process's serialisation of the record, stated per
 * E11: a digest or signature over a non-canonical serialisation pins this process's bytes, not a
 * document), and that the chain ends in something a verifier can check against a public key. A
 * deployment substitutes a held key and a canonical form; the shape is unchanged.
 *
 * Every refusal on the adoption path is also shown firing here, so the gate keeps them firing.
 */
import { generateKeyPairSync, sign, verify, createHash } from 'node:crypto';
import { route, agentBriefs } from '../_interpreter/route.mjs';
import { loadRegister } from '../_interpreter/interpret.mjs';

const LIB = new URL('..', import.meta.url).pathname;
const CLAUSE = '34-2010/3.6/p4/language';
const reg = JSON.parse(JSON.stringify(loadRegister(`${LIB}/banxico-34-2010/register.json`)));
reg.clauses.find((c) => c.id === CLAUSE).lane_override = 'agent';

let failures = 0;
const assertEq = (label, got, want) => { if (got !== want) { failures++; console.log(`  *** ${label}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); } };
const show = (label, x) => { console.log(`── ${label} ──`); console.log(JSON.stringify(x, null, 1)); console.log(''); };

// 1. FACTS IN. The world's record; the dictamen exists, nobody has judged its language.
const facts = {
  notice: { type: 'reclamacion_cargo_no_reconocido', reference: 'AV-2026-0031', received_at: '2026-05-04T09:12:00Z' },
  dictamen: { made_available_at: '2026-06-02T11:00:00Z', signatory_id: 'emp-0042' },
  issuer: { authorised_signatories: ['emp-0042'] },
};

// 2. ROUTED. The clause awaits a person; the brief is what the agent is dispatched against.
const before = route(reg, facts, {});
show('record 1: routed, awaiting, nothing assessed', before[CLAUSE]);
assertEq('awaiting', before[CLAUSE].awaiting, 'person');
const brief = agentBriefs(reg, facts).find((b) => b.clauseId === CLAUSE);
show('record 2: the brief the agent is dispatched against', { ...brief, facts: '(the facts above, verbatim)' });

// 3. ASSESSED. The agent's output, carried NOT TAKEN. (`at` is caller-supplied, never invented here.)
const rationale = {
  observations: [
    { of: 'dictamen.made_available_at', saw: '2026-06-02T11:00:00Z', noted: 'a dictamen exists to be read; the language standard has a subject' },
    { of: 'dictamen.signatory_id', saw: 'emp-0042', noted: 'issued by an authorised signatory, so the text is the issuer\'s own register of language' },
  ],
  application: 'Read in full, the dictamen states the finding, the factors relied on and the outcome in declarative sentences without defined-term chains; under the clause\'s standard of lenguaje simple y claro that is affirmed.',
};
const assessment = { value: 'affirmed', by: 'agent-tier-demo-1', at: '2026-08-23T20:00:00Z', factsDigest: brief.factsDigest, rationale };
const assessed = route(reg, facts, {}, { assessments: { [CLAUSE]: assessment } });
show('record 3: assessed, carried, still awaiting the person', assessed[CLAUSE]);
assertEq('still awaiting', assessed[CLAUSE].awaiting, 'person');
const digest = createHash('sha256').update(JSON.stringify(assessed[CLAUSE].assessment)).digest('hex').slice(0, 16);

// 4. ADOPTED. The person's decision arrives the way a fact arrives: an input identifying the
//    assessment by digest. The value is DERIVED from the assessment, not restated.
const adoption = { of: digest, by: 'reviewer-boyd-demo', at: '2026-08-23T21:30:00Z' };
const adopted = route(reg, facts, {}, { assessments: { [CLAUSE]: assessment }, adoptions: { [CLAUSE]: adoption } });
show('record 4: ADOPTED, the determination', adopted[CLAUSE]);
assertEq('the route is in the result token', adopted[CLAUSE].result, 'affirmed_on_agent_assessment');
assertEq('determined by', adopted[CLAUSE].determined, 'person');
assertEq('no longer waiting', adopted[CLAUSE].waiting, 'none');

// 5. SIGNED RECORD OUT. Ephemeral key, demonstration-grade, stated above.
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
// THE RATIONALE RIDES OUTSIDE THE SIGNED PAYLOAD, per the digest ruling: no model-authored prose
// is attested; assessment.rationaleDigest inside the payload binds the text beside it.
const { rationale: rationaleBeside, ...signedRecord } = adopted[CLAUSE];
const payload = JSON.stringify({ type: 'op.policy.determination.demo.v1', clause: CLAUSE, record: signedRecord });
const signature = sign(null, Buffer.from(payload), privateKey).toString('base64');
const signed = { payloadType: 'op.policy.determination.demo.v1', payload: JSON.parse(payload), rationale_beside_not_signed: rationaleBeside, signature, publicKey: publicKey.export({ type: 'spki', format: 'pem' }).trim(), $key: 'EPHEMERAL, generated for this run, no custody or identity claim' };
show('record 5: the signed record (rationale beside, digest inside)', { ...signed, rationale_beside_not_signed: '(the rationale above, verbatim)', publicKey: signed.publicKey.split('\n')[1].slice(0, 32) + '…', signature: signature.slice(0, 32) + '…' });
assertEq('the signature verifies', verify(null, Buffer.from(payload), publicKey, Buffer.from(signature, 'base64')), true);
assertEq('the beside-rationale matches the signed digest',
  createHash('sha256').update(JSON.stringify(rationaleBeside)).digest('hex').slice(0, 16), adopted[CLAUSE].assessment.rationaleDigest);

// ── the adoption path's refusals, kept firing ───────────────────────────────────────────────────
const expectThrow = (label, f, needle) => {
  try { f(); failures++; console.log(`  *** NO REFUSAL: ${label}`); }
  catch (e) { if (!e.message.includes(needle)) { failures++; console.log(`  *** WRONG REFUSAL: ${label}: ${e.message}`); } else console.log(`  FIRES  ${label}`); }
};
console.log('── the refusals ──');
expectThrow('an adoption identifying no carried assessment', () => route(reg, facts, {}, { adoptions: { [CLAUSE]: adoption } }), 'identifies nothing');
expectThrow('an adoption whose digest mismatches', () => route(reg, facts, {}, { assessments: { [CLAUSE]: assessment }, adoptions: { [CLAUSE]: { ...adoption, of: 'deadbeefdeadbeef' } } }), 'cannot be identified');
expectThrow('an adoption beside a direct judgment', () => route(reg, { ...facts, dictamen: { ...facts.dictamen, language_is_plain: 'denied' } }, {}, { assessments: { [CLAUSE]: assessment }, adoptions: { [CLAUSE]: adoption } }), 'One determination, one route');
expectThrow('a rejection with no determination of their own', () => route(reg, facts, {}, { assessments: { [CLAUSE]: assessment }, adoptions: { [CLAUSE]: { rejects: digest, by: 'r', at: 't' } } }), 'rejecting is not deciding');
expectThrow('a revocation, which does not exist as an act', () => route(reg, facts, {}, { assessments: { [CLAUSE]: assessment }, adoptions: { [CLAUSE]: { revokes: digest, by: 'r', at: 't' } } }), 'unknown key');
expectThrow('adoption provenance absent', () => route(reg, facts, {}, { assessments: { [CLAUSE]: assessment }, adoptions: { [CLAUSE]: { of: digest, by: 'reviewer' } } }), 'absent is not a default');
expectThrow('an assessment with NO rationale', () => { const { rationale: _, ...bare } = assessment; route(reg, facts, {}, { assessments: { [CLAUSE]: bare } }); }, 'second opinion with provenance');
expectThrow('a rationale citing a fact the brief never carried', () => route(reg, facts, {}, { assessments: { [CLAUSE]: { ...assessment, rationale: { ...rationale, observations: [{ of: 'dictamen.language_grade', saw: 'x', noted: 'n' }] } } } }), 'never shown');
expectThrow('a rationale misquoting a briefed fact', () => route(reg, facts, {}, { assessments: { [CLAUSE]: { ...assessment, rationale: { ...rationale, observations: [{ of: 'dictamen.signatory_id', saw: 'emp-9999', noted: 'n' }] } } } }), 'misquoted');
expectThrow('adopting an assessment made over OTHER facts (stale)', () => {
  const moved = { ...facts, account: { charges_posted: ['interes_ordinario'] } };
  route(reg, moved, {}, { assessments: { [CLAUSE]: assessment }, adoptions: { [CLAUSE]: adoption } });
}, 'other facts');

// and the rejection act, working:
const rejFacts = { ...facts, dictamen: { ...facts.dictamen, language_is_plain: 'denied' } };
const rejected = route(reg, rejFacts, {}, { assessments: { [CLAUSE]: assessment }, adoptions: { [CLAUSE]: { rejects: digest, by: 'reviewer-boyd-demo', at: '2026-08-23T21:40:00Z' } } });
show('record 6: REJECTED, the person determined otherwise', rejected[CLAUSE]);
assertEq('their own value decides', rejected[CLAUSE].result, 'denied');
assertEq('the declined assessment is identified', rejected[CLAUSE].rejected.of, digest);

// ── the ungrounded predicate, closed, and the E34 meaning refusals ──────────────────────────────
const freg = JSON.parse(JSON.stringify(loadRegister(`${LIB}/feca-2-0805/register.json`)));
freg.clauses.find((c) => c.id === 'feca/2-0805/7/b/chain').lane_override = 'agent';
const chain = route(freg, { intervening: { claimed: true } }, {})['feca/2-0805/7/b/chain'];
show('the previously-slipping shape, now: 7/b/chain agent-routed, no meaning', chain);
assertEq('no invented person determination', chain.determined, undefined);
assertEq('the truth passes through', chain.waiting, 'meaning');
console.log('── the ungrounded and meaning refusals ──');
expectThrow('assessing an ungrounded clause', () => route(freg, { intervening: { claimed: true } }, {}, { assessments: { 'feca/2-0805/7/b/chain': assessment } }), 'no lane assesses or adopts it');
expectThrow('a meaning supplied with the value undefined (E34 a)', () => route(freg, { intervening: { claimed: true } }, { ungrounded_terms: { 'chain of causation': undefined } }), 'neither a meaning nor an absence');
expectThrow('a supplied meaning missing its consulted key (E34 b)', () => route(freg, { intervening: { claimed: true } }, { ungrounded_terms: { 'chain of causation': {} } }), 'missing "breaks"');
const okMeaning = route(freg, { intervening: { claimed: true, chain_status: 'intact' } }, { ungrounded_terms: { 'chain of causation': { breaks: ['broken'] } } })['feca/2-0805/7/b/chain'];
assertEq('a well-shaped meaning still evaluates', okMeaning.result, 'satisfied_on_supplied_meaning');

console.log(failures === 0 ? 'THE CHAIN COMPLETES AND EVERY REFUSAL FIRES.' : `${failures} FAILURE(S).`);
process.exit(failures === 0 ? 0 : 1);
