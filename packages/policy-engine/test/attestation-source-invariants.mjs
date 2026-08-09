// INVARIANTS ASSERTED AGAINST THE SOURCE TEXT OF core/attestation.ts.
//
// MOVED HERE 2026-08-07 from op-mcp-payment-server, which held a second copy of this file and was
// deleting it. These assertions read the file as TEXT: declared field types, and prose that states a
// rule at the site the rule governs. They cannot live downstream of a published package, because a
// package ships `dist` and not `src`, so they had to follow the source rather than the consumer.
//
// WHY ASSERT PROSE AT ALL. Several rules here are boundaries a future change would cross by ADDING
// something reasonable, not by removing a check: an attestation embedded in a citation, a reasons
// field on a type that already exists. There is no runtime behaviour to assert against, because the
// violation is a shape nobody has written yet. What exists is a stated rule at the site, and a test
// that the statement is still there is the only thing standing between it and a quiet deletion.
//
// The weakness is honest: these break on rewording. That is the cost of the only control available
// for this class, and rewording is a deliberate act that reaches this test, which is the point.

import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const failures = [];
const assert = (n, ok, d = '') => {
  if (ok) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; failures.push(n); console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`); }
};

const src = readFileSync(new URL('../src/core/attestation.ts', import.meta.url), 'utf8');

// TWO HELPERS, BOTH FIXING A CLASS RATHER THAN AN ASSERTION.
//
// `fieldsOf` reads DECLARATIONS, not prose. The first version of the §7 structural check grepped the
// interface body for the word `DecisionAttestation` and failed on a doc comment that merely NAMED the
// type. Classify, then match. This form is also STRONGER, because it still catches an embedded field
// after someone scrubs the comment.
//
// `prose` strips the ` * ` gutter and collapses whitespace, so an assertion about what a document SAYS
// does not depend on where the line happened to wrap. Wrap-anchored assertions have broken here
// before, and every previous fix was per-assertion.
const fieldsOf = (name) => {
  const at = src.indexOf(`export interface ${name} {`);
  if (at < 0) return null;
  const body = src.slice(at, src.indexOf('\n}', at));
  return body.split('\n').filter((l) => /^\s{2}\w+\??:/.test(l)).map((l) => l.trim());
};
const prose = src.replace(/^\s*\*/gm, ' ').replace(/\s+/g, ' ');

// CODE ONLY, because this file DESCRIBES the defects it fixed and a regex over the whole source finds
// the description. Same trap: classify, then match. Without this, the assertions below pass only
// while nobody documents what was wrong.
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

console.log('\n── the file is the one we think it is ──');
{
  // A GUARD ON EVERY ASSERTION BELOW. All of them are regexes over a file read by path; if that read
  // ever returns something else, or something empty, every `!/.../.test()` assertion passes vacuously
  // and the negative ones are the majority here.
  assert('the source was read and is substantial', src.length > 20000, `length was ${src.length}`);
  assert('...and is the attestation module', /export interface DecisionAttestation \{/.test(src));
}

console.log('\n── §7: the attestation stands alone and a payment CITES it ──');
{
  // STRUCTURAL, NOT CONVENTIONAL. If a payment could carry an attestation, a denied claim would
  // produce no record, and the bias would be total rather than a tendency.
  const cite = fieldsOf('AttestationCitation');
  assert('AttestationCitation carries an ID, not an attestation',
    cite !== null && cite.some((f) => /^citesDecisionId: string;$/.test(f)));
  // THE STRUCTURAL ASSERTION, over DECLARED FIELD TYPES. A doc comment may name the type; a field may
  // not hold one. Mutation-checked below.
  assert('...and NO DECLARED FIELD could hold a DecisionAttestation',
    cite !== null && !cite.some((f) => /DecisionAttestation/.test(f)));
  // BOTH OUTCOMES ON THE CONTROL ITSELF: the check must FAIL on an inverted shape, or it is asserting
  // nothing. Run against a mutated copy rather than trusting that it would have caught it.
  {
    const inverted = src.replace('citesDecisionId: string;', 'attestation: DecisionAttestation;');
    const at = inverted.indexOf('export interface AttestationCitation {');
    const mutated = inverted.slice(at, inverted.indexOf('\n}', at)).split('\n')
      .filter((l) => /^\s{2}\w+\??:/.test(l)).map((l) => l.trim());
    assert('...and that check KILLS an embedded-attestation mutation',
      mutated.some((f) => /DecisionAttestation/.test(f)));
  }
  assert('DecisionAttestation exists as a credential in its own right',
    /export interface DecisionAttestation \{/.test(src));
  assert('...and does NOT carry a payment reference, which would be the inversion',
    !/paymentRef|paymentId|reservationId/.test(
      src.slice(src.indexOf('export interface DecisionAttestation'), src.indexOf('export interface AttestationCitation'))));
}

console.log('\n── §8: inputsDigest, not inputs ──');
{
  const att = src.slice(src.indexOf('export interface DecisionAttestation'), src.indexOf('export interface AttestationCitation'));
  assert('the attestation commits to inputs by DIGEST', /inputsDigest: string/.test(att));
  assert('...and carries no field holding the inputs themselves', !/\binputs:\s/.test(att));
  assert('...saying why: the customer holds them and none of it should be readable by us or a counterparty',
    /THE CUSTOMER HOLDS THE INPUTS AND THE ATTESTATION COMMITS TO THEM/.test(prose)
    && /none of it should be readable by us or by a counterparty/.test(prose));
  for (const f of ['decisionId', 'decider', 'subject', 'outcome', 'policyRef', 'decidedAt', 'assurance', 'resolvableUntil']) {
    assert(`${f} is present`, new RegExp(`^\\s{2}${f}\\??:`, 'm').test(att));
  }
  assert('observerRef is OPTIONAL, because its absence is the honest form under self-declared',
    /observerRef\?: string/.test(att));
}

console.log('\n── §5: the rows that carry their own reasoning ──');
{
  // THE ROW EASIEST TO GET BACKWARDS. The truth table itself is asserted at runtime in
  // decision-attestation.mjs; what is asserted here is that the reasoning stayed with it.
  assert('the absent-attestation row states that absence has more causes than presence',
    /absence has more causes than presence/.test(src));
  assert('...and names the exception that makes it useful: what the MANDATE required',
    /if the mandate REQUIRED an attestation/.test(prose)
    && /bounded by what the mandate demanded, not by what the record happens to contain/.test(prose));
}

console.log('\n── §4: two levels, one built, the other expressed and gated ──');
{
  assert('self-declared is a level', /'self-declared'/.test(src));
  assert('...honourable on day one, and said so', /HONOURABLE ON DAY ONE/.test(src));
  assert('independently-observed is expressed', /'independently-observed'/.test(src));
  assert('...and marked NOT BUILT rather than implied', /Expressed and NOT BUILT/.test(src));
  assert('...and capability-gated, declining rather than accepting unverifiable provenance',
    /DECLINES the\n   \* credential rather than accepting provenance it cannot check/.test(src));
}

console.log('\n── the observation boundary is stated AT the site, not in a note ──');
{
  assert('the hard line is stated in the file itself',
    /WE DO NOT OBSERVE THE DECISION BEING MADE/.test(src));
  // NAMING HOW IT GETS CROSSED IS THE PART A NOTE CANNOT DO. The crossing is a buyer asking why, and
  // the answer arriving as one field on a type that already exists.
  assert('...along with how it gets crossed, which is not by anyone deciding to',
    /framed as a small addition to something already built/.test(src));
  assert('...and the test a reader applies: WHAT was decided, or HOW',
    /describes WHAT was decided or HOW/.test(src));
  assert('...and where reasons DO belong, so the refusal has an alternative',
    /THIS IS WHERE REASONS BELONG/.test(src));
  // AN ENUMERATED REFUSAL CANNOT BE EXHAUSTIVE. The point is that a check exists, so adding an obvious
  // name is a deliberate act rather than an oversight.
  assert('the source says the forbidden list is not exhaustive', /not exhaustive and cannot be/.test(src));
  assert('...and that a field not on it describing HOW is still a violation', /still a violation/.test(src));
}

console.log('\n── defects that were fixed stay fixed, asserted over CODE not prose ──');
{
  // THE DEFECT, REPRODUCED. Issuance used to hand `assertNoObservation` a key named
  // `deciderArtifactDigest` whose value was `input.inputsDigest`. One is what the decider PRODUCED,
  // the other is what was put IN FRONT of it, and the alias made the wrong one look like the right one
  // at the exact site a reader would check.
  assert('issuance never aliases the artifact digest to the inputs digest',
    !/deciderArtifactDigest:\s*input\.inputsDigest/.test(code));
  // AND THE CHECK CAN FAIL, so a pass means the stripper left the code behind rather than everything.
  assert('...and that assertion is capable of failing',
    /deciderArtifactDigest:\s*input\.inputsDigest/.test(`${code}\ndeciderArtifactDigest: input.inputsDigest`));
  // THE DEAD SECOND SHAPE IS GONE. It declared the reasons rule on an interface nothing issued, which
  // reads as implemented when it was not.
  assert('DecisionAttestationInput no longer exists to carry the rule instead of the type',
    !/export interface DecisionAttestationInput/.test(src));
  // STILL A DECLARED VALUE, not a removed one. Keeping it in the type is what makes publishing a
  // starter set a code change rather than a change to a signed shape.
  assert('op-starter-set remains declared in the type',
    /source: 'op-starter-set' \| 'client-defined';/.test(code));
}

console.log(`\nattestation-source-invariants: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('\nFAILURES:'); failures.forEach((f) => console.error('  ✗ ' + f)); process.exit(1); }
