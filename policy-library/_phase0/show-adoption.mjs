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
const assessment = { value: 'affirmed', by: 'agent-tier-demo-1', at: '2026-08-23T20:00:00Z', factsDigest: brief.factsDigest };
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
const payload = JSON.stringify({ type: 'op.policy.determination.demo.v1', clause: CLAUSE, record: adopted[CLAUSE] });
const signature = sign(null, Buffer.from(payload), privateKey).toString('base64');
const signed = { payloadType: 'op.policy.determination.demo.v1', payload: JSON.parse(payload), signature, publicKey: publicKey.export({ type: 'spki', format: 'pem' }).trim(), $key: 'EPHEMERAL, generated for this run, no custody or identity claim' };
show('record 5: the signed record', { ...signed, publicKey: signed.publicKey.split('\n')[1].slice(0, 32) + '…', signature: signature.slice(0, 32) + '…' });
assertEq('the signature verifies', verify(null, Buffer.from(payload), publicKey, Buffer.from(signature, 'base64')), true);

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

console.log(failures === 0 ? 'THE CHAIN COMPLETES AND EVERY REFUSAL FIRES.' : `${failures} FAILURE(S).`);
process.exit(failures === 0 ? 0 : 1);
