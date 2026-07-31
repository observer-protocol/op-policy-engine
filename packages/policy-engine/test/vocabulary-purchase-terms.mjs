import { KNOWN_PURCHASE_TERMS_TYPES, DECLARED_UNENFORCEABLE } from '../src/core/vocabulary.ts';
let pass = 0, fail = 0;
const a = (n, ok, d='') => { if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n}  <<< ${d}`); } };

console.log('\n── every recognized type names its SIGNER, because one contradicts the frozen prose ──');
for (const [type, v] of KNOWN_PURCHASE_TERMS_TYPES) {
  a(`${type} names a signer`, typeof v.signer === 'string' && v.signer.length > 0);
  a(`${type} says why`, typeof v.why === 'string' && v.why.length > 40);
}
// The entry the walkthrough produced, and the one v2.5's description excludes.
a('payor-adjudication is signed by a party that is NOT the counterparty',
  /NOT the counterparty/.test(KNOWN_PURCHASE_TERMS_TYPES.get('payor-adjudication').signer));
a('...and at least one OTHER type IS counterparty-signed, so the contrast is real',
  [...KNOWN_PURCHASE_TERMS_TYPES.values()].some((v) => v.signer === 'counterparty'));
// BOTH OUTCOMES: a map where every signer were identical would pass the loop above and carry no
// information, which is the whole point of naming them.
a('the signers are not all the same value',
  new Set([...KNOWN_PURCHASE_TERMS_TYPES.values()].map((v) => v.signer)).size > 1);

console.log('\n── the withdrawn class field stays withdrawn ──');
a('allowed_counterparty_types is still declared unenforceable',
  DECLARED_UNENFORCEABLE.some((d) => d.property === 'allowed_counterparty_types'));
a('...and payor-adjudication does NOT reintroduce it as a class kind',
  !/class/i.test(KNOWN_PURCHASE_TERMS_TYPES.get('payor-adjudication').why));

console.log(`\nvocabulary-purchase-terms: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
