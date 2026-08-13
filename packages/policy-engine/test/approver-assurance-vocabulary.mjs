// THE VOCABULARY THIS PACKAGE PUBLISHES MATCHES THE VOCABULARY THE SCHEMA PUBLISHES.
//
// ─── WHY THIS EXISTS, AND WHY IT IS IN THIS REPOSITORY ───────────────────────────────────────────
//
// `RequiredKeyCustody` is exported for one reason, stated in its own comment: a counterparty
// reading an `actionScope.approvers` entry needs the vocabulary. It is published AS vocabulary.
//
// It was two schema versions stale and nobody could have noticed. `approvers.keys.assurance` entered
// `delegation` at v2.5 as `operator-held | device-bound`, gained `org-attested` at **v2.6**, and this
// package still carried v2.5's two values at rc.9. **A counterparty validating with the published
// type would have rejected an `org-attested` approver key that the current schema permits** — the
// exact failure the export exists to prevent.
//
// THE ONE CHECK THAT COULD HAVE SEEN IT WAS CORRECTLY CONFIGURED NOT TO LOOK.
// `op-mcp-payment-server/test/schema-conformance.mjs` compares that server's runtime types against
// the served schema, and it lists `approvers.keys.assurance` in its `NOT_READ` table — rightly, that
// server does not branch on the field — and `NOT_READ` entries are checked for presence, never for
// values. So the change was invisible to the estate's only cross-repo schema check, by a decision
// that is correct for that server and left THIS package uncovered.
//
// Hence: the comparison belongs wherever it can read the published schema AND holds the type. That is
// here. RULED 2026-08-08.
//
// ─── WHAT IT DOES NOT DO ─────────────────────────────────────────────────────────────────────────
//
// It does not assert that the two ideas named `RequiredKeyCustody` and `ApprovalAssurance` are the
// same, and widening one to match the other is explicitly ruled against in `records/types.ts`. This
// compares the engine's union to THE SCHEMA, which is the only thing either union answers to.
import { REQUIRED_KEY_CUSTODY, REQUIRED_KEY_CUSTODY_SCHEMA_VERSION } from '../dist/index.mjs';

const SCHEMA_URL = `https://observerprotocol.org/schemas/delegation/${REQUIRED_KEY_CUSTODY_SCHEMA_VERSION}.json`;

let pass = 0, fail = 0;
const failures = [];
const a = (n, ok, d = '') => {
  if (ok) { pass++; console.log(`  PASS  ${n}`); }
  else { fail++; failures.push(`${n}${d ? ': ' + d : ''}`); console.log(`  FAIL  ${n}  <<< ${d}`); }
};

console.log('\n── the version is declared, and the URL is built FROM the declaration ──');
{
  // If the constant were decorative the check could pass while comparing against a document the type
  // does not claim to mirror. The URL is derived from it, so they cannot drift apart.
  a('the package declares which schema version it mirrors',
    typeof REQUIRED_KEY_CUSTODY_SCHEMA_VERSION === 'string' && /^v\d+\.\d+$/.test(REQUIRED_KEY_CUSTODY_SCHEMA_VERSION),
    JSON.stringify(REQUIRED_KEY_CUSTODY_SCHEMA_VERSION));
  a('...and the vocabulary is exported as values, not only as a type',
    Array.isArray(REQUIRED_KEY_CUSTODY) && REQUIRED_KEY_CUSTODY.length > 0,
    JSON.stringify(REQUIRED_KEY_CUSTODY));
}

// ─── the served definition ───────────────────────────────────────────────────
//
// UNREACHABLE IS A FAILURE AND NOT A SKIP, and it is reported as ITSELF. Same split as
// op-mcp-payment-server: a vocabulary check that passes offline asserts nothing, and "the origin did
// not answer" is not a finding about this package's types. Exit 3 means unreachable; exit 1 means the
// vocabulary has diverged. Deliberately emits no "N passed, M failed" line on the unreachable path.
let served;
{
  let lastError = 'no attempt made';
  for (let i = 0; i < 3 && !served; i++) {
    if (i) await new Promise((r) => setTimeout(r, i * 750));
    try {
      const res = await fetch(SCHEMA_URL, {
        headers: { 'User-Agent': 'policy-engine approver-assurance-vocabulary' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      served = await res.json();
    } catch (e) { lastError = e?.message ?? String(e); }
  }
  if (!served) {
    console.log('\napprover-assurance-vocabulary: NOT RUN — the schema was never read, so nothing was compared');
    console.log(`\n  UNREACHABLE  ${SCHEMA_URL}`);
    console.log(`  3 attempts, last error: ${lastError}`);
    console.log('\n  A FAILURE, NOT A SKIP, and NOT a finding about this package. Exit 3 is unreachable;');
    console.log('  exit 1 is the published vocabulary having diverged from the served schema.');
    process.exit(3);
  }
}

/** Every enum in the served schema's actionScope, by dotted path. Walks rather than indexes: a
 * hardcoded path returns a reassuring `undefined` the day the schema nests it one level deeper, and
 * an absent enum would then read as "nothing to compare". */
function enumsIn(obj, prefix = '') {
  const found = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (!v || typeof v !== 'object') continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v.enum)) found[path] = v.enum;
    if (v.properties) Object.assign(found, enumsIn(v.properties, path));
    if (v.items?.properties) Object.assign(found, enumsIn(v.items.properties, path));
  }
  return found;
}

const PATH = 'approvers.keys.assurance';
const servedEnums = enumsIn(served.properties?.credentialSubject?.properties?.actionScope?.properties);
const servedValues = servedEnums[PATH];

console.log(`\n── ${PATH} is present in the served schema at all ──`);
{
  // AN ABSENT ENUM MUST FAIL. Without this the comparison below succeeds vacuously the moment the
  // schema moves the field, and a check that passes because it found nothing is the failure mode this
  // whole entry exists to close.
  a(`the served ${REQUIRED_KEY_CUSTODY_SCHEMA_VERSION} schema defines ${PATH}`,
    Array.isArray(servedValues) && servedValues.length > 0,
    `found paths: ${Object.keys(servedEnums).join(', ') || '(none)'}`);
}

if (Array.isArray(servedValues) && servedValues.length > 0) {
  console.log('\n── the published union and the served enum admit EXACTLY the same values ──');
  const mine = [...REQUIRED_KEY_CUSTODY].sort();
  const theirs = [...servedValues].sort();

  const missing = theirs.filter((v) => !mine.includes(v));
  const extra = mine.filter((v) => !theirs.includes(v));

  // TOO NARROW is the defect that occurred: a counterparty rejects a value the schema permits.
  a('nothing the schema permits is missing from the published union', missing.length === 0,
    missing.length ? `the schema permits ${JSON.stringify(missing)} and this package would reject it` : '');

  // TOO WIDE is the opposite defect and is not harmless: it tells a counterparty a value is valid
  // when no issuer can sign it.
  a('the published union claims nothing the schema does not permit', extra.length === 0,
    extra.length ? `this package publishes ${JSON.stringify(extra)}, which the schema does not permit` : '');

  a('...so the two agree exactly', JSON.stringify(mine) === JSON.stringify(theirs),
    `published ${JSON.stringify(mine)} vs served ${JSON.stringify(theirs)}`);
  console.log(`         -> ${JSON.stringify(theirs)}`);
}

console.log('\n── the check can FAIL, so a passing run means something ──');
{
  // THE COMPARISON IS THE SUBJECT, so it is exercised against values that are not the real ones. A
  // check whose only evidence is that it passed on the live data cannot distinguish "they agree" from
  // "the comparison is a no-op".
  const cmp = (mine, theirs) => {
    const m = [...mine].sort(), t = [...theirs].sort();
    return t.filter((v) => !m.includes(v)).length === 0 && m.filter((v) => !t.includes(v)).length === 0;
  };
  a('a union MISSING a served value is caught', !cmp(['operator-held', 'device-bound'], ['org-attested', 'operator-held', 'device-bound']));
  a('a union with an EXTRA value is caught', !cmp(['org-attested', 'operator-held', 'device-bound', 'invented'], ['org-attested', 'operator-held', 'device-bound']));
  a('identical sets in a different order are NOT caught', cmp(['device-bound', 'org-attested', 'operator-held'], ['org-attested', 'operator-held', 'device-bound']));
  a('...and the real rc.9 union would have failed this check', !cmp(['operator-held', 'device-bound'], servedValues ?? []));
}

console.log(`\napprover-assurance-vocabulary: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
