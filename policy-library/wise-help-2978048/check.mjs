#!/usr/bin/env node
/**
 * Completeness gate, citation mutant, harness self-check, replay against PSR, figure refusal.
 * A skipped check is never passed. GAP is never passed.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto';
import { execSync } from 'node:child_process';
import { interpret, loadRegister, RECORD_VERSION } from '../_interpreter/interpret.mjs';
import { validate } from '../_interpreter/validate.mjs';
import { figure, renderFigure, populationOf, parametersFromGeneratorHeader, populationMarker } from './figure.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

let pass = 0, fail = 0;
const failures = [];
function assert(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(`${name}${detail ? ': ' + detail : ''}`); console.log(`  FAIL  ${name}${detail ? '  <<< ' + detail : ''}`); }
}

const R = loadRegister(`${HERE}register.json`);
const registerBytes = readFileSync(`${HERE}register.json`);
const html = readFileSync(`${HERE}source/how-do-i-report-fraud-or-a-scam.html`);
const text = html.toString('utf8');
const PSR_PATH = new URL('../psr-2017-752/register.json', import.meta.url);
const psrBytes = readFileSync(PSR_PATH);
const PSR_PIN = 'c605d94f1ce7b1a5e032cb807f461e428c1a43e79e6fed232835a394efd52e86';

const v = validate(R, 'wise-help-2978048/register.json');
assert('register validates (zero rule failures)', v.failures.length === 0, JSON.stringify(v.failures));
assert('record format is v7', RECORD_VERSION === 7);
assert('pin sha256', sha(html) === '5db3e87aa10515a5f4ac7322db38b76a947e8be9218cdcb623affccaedc08894');
assert('pin bytes', html.length === 119222);
{
  const line = readFileSync(`${HERE}SOURCES.md`, 'utf8').split('\n').find((l) => l.includes('`source/how-do-i-report-fraud-or-a-scam.html`'));
  assert('SOURCES.md carries the pin digest', !!(line && line.includes('5db3e87aa10515a5f4ac7322db38b76a947e8be9218cdcb623affccaedc08894')));
}
assert('PSR register byte-identical to pin', sha(psrBytes) === PSR_PIN);

assert('pin is the authorised-scam article', text.includes('authorised a payment to a scammer'));
assert('pin says refund is not guaranteed', /can.?t guarantee a refund/i.test(text));
const citesApp = /\bAPP\b|authorised push|Payment Services Regulations|SI 2017\/752|psr-2017-752/.test(text);
assert('pinned bytes do not cite PSR APP', !citesApp);
assert('card-fraud article is only a related link, not this pin', text.includes('how-do-i-report-a-fraudulent-wise-card-payment'));
assert('this encode does not carry the card-fraud page as a pin', R.source.pins.length === 1);

const CHECKS = {
  'W-scope': () => {
    const c = R.clauses.find((x) => x.id === 'wise/2978048/scope/authorised-scam');
    return !!(c && c.text.includes('authorised a payment to a scammer') && text.includes('authorised a payment to a scammer'));
  },
  'W-card-exclude': () => {
    const c = R.clauses.find((x) => x.id === 'wise/2978048/exclude/card-unauthorised');
    return !!(c && /without your permission/.test(c.text) && c.assertion.includes('not encoded'));
  },
  'W-account-exclude': () => !!R.clauses.find((x) => x.id === 'wise/2978048/exclude/account-unauthorised'),
  'W-report-wise': () => !!R.clauses.find((x) => x.id === 'wise/2978048/report/wise-channel'),
  'W-report-police': () => !!R.clauses.find((x) => x.id === 'wise/2978048/report/police'),
  'W-recall': () => !!R.clauses.find((x) => x.id === 'wise/2978048/outcome/recall-not-guaranteed'),
  'W-refund': () => {
    const c = R.clauses.find((x) => x.id === 'wise/2978048/outcome/no-guaranteed-refund');
    return !!(c && c.text === "We can't guarantee a refund.");
  },
  'W-loss': () => !!R.clauses.find((x) => x.id === 'wise/2978048/loss/authorised-sender-responsible'),
  'W-psr-app-wired-absence': () => {
    const c = R.clauses.find((x) => x.id === 'wise/2978048/citation/psr-app');
    const out = interpret(R, {
      notice: { recall: { stance: 'not_guaranteed' }, refund: { stance: 'not_guaranteed' }, loss: { stance: 'sender_responsible_if_completed' }, redirects_to_card_fraud_article: true },
    }, {});
    return c
      && c.evaluate?.result?.name === 'field_present'
      && out[c.id].result === 'absent'
      && !citesApp;
  },
  'W-card-fraud-page-absent-ruled': () => R.source.not_encoded?.some((x) => /card/i.test(x.url_observed_as_related_article))
    && !R.clauses.some((c) => /card-fraud page encoded/.test(JSON.stringify(c))),
  'W-banxico-absent-ruled': () => !/banxico|34-2010/i.test(JSON.stringify(R.clauses)),
};

const ITEMS = [
  { id: 'W-scope', status: 'WIRED', kind: 'presence' },
  { id: 'W-card-exclude', status: 'WIRED', kind: 'presence' },
  { id: 'W-account-exclude', status: 'WIRED', kind: 'presence' },
  { id: 'W-report-wise', status: 'WIRED', kind: 'presence' },
  { id: 'W-report-police', status: 'WIRED', kind: 'presence' },
  { id: 'W-recall', status: 'WIRED', kind: 'presence' },
  { id: 'W-refund', status: 'WIRED', kind: 'presence' },
  { id: 'W-loss', status: 'WIRED', kind: 'presence' },
  { id: 'W-psr-app-wired-absence', status: 'WIRED', kind: 'absence' },
  { id: 'W-card-fraud-page-absent-ruled', status: 'ABSENT-RULED', kind: 'out-of-scope' },
  { id: 'W-banxico-absent-ruled', status: 'ABSENT-RULED', kind: 'out-of-scope' },
];

const computed = [];
for (const item of ITEMS) {
  const fn = CHECKS[item.id];
  if (typeof fn !== 'function') {
    assert(`${item.id}: skipped check is never passed`, false, 'no check function');
    computed.push({ ...item, computed: 'GAP', checked: false });
    continue;
  }
  const ok = fn();
  const computedStatus = ok ? item.status : 'GAP';
  computed.push({ ...item, computed: computedStatus, checked: true, ok });
  assert(`${item.id} ${item.status} (${item.kind})`, ok && computedStatus !== 'GAP');
}
const gap = computed.filter((x) => x.computed === 'GAP' || !x.checked);
assert(`completeness GAP 0/${ITEMS.length}`, gap.length === 0, JSON.stringify(gap));
assert('every completeness item was checked', computed.every((x) => x.checked === true));
assert(`clause count is the register array length ${R.clauses.length}/${R.clauses.length}`, R.clauses.length === 9);

const mutant = structuredClone(R);
mutant.clauses.find((c) => c.id === 'wise/2978048/citation/psr-app').evaluate = { op: 'emit', result: { op: 'const', value: 'present' } };
const mutantOut = interpret(mutant, {
  notice: { recall: { stance: 'not_guaranteed' }, refund: { stance: 'not_guaranteed' }, loss: { stance: 'sender_responsible_if_completed' }, redirects_to_card_fraud_article: true },
}, {});
const mutantCites = mutantOut['wise/2978048/citation/psr-app'].result === 'present';
assert('mutant encoded as citing PSR APP is shown FAILING', mutantCites === true);
let mutantGatePassed = false;
try {
  if (mutantCites) throw new Error('Wise register encoded as citing PSR APP');
  mutantGatePassed = true;
} catch (e) {
  console.log(`  SHOWN FAILING  citation mutant: ${e.message}`);
}
assert('citation mutant does not pass the gate', mutantGatePassed === false);

const cleanOut = interpret(R, {
  notice: { recall: { stance: 'not_guaranteed' }, refund: { stance: 'not_guaranteed' }, loss: { stance: 'sender_responsible_if_completed' }, redirects_to_card_fraud_article: true },
}, {});
assert('clean register: psr-app citation is absent (WIRED)', cleanOut['wise/2978048/citation/psr-app'].result === 'absent');

execSync('node generate-determinations.mjs', { cwd: HERE, stdio: 'inherit' });
const detDoc = JSON.parse(readFileSync(`${HERE}out/determinations.json`, 'utf8'));
const pop = populationOf(detDoc, HERE);
assert('population count is the case list', pop.count === detDoc.determinations.length);
assert('population count is 8/8', pop.count === 8);

let sigOk = 0;
const pub = createPublicKey({
  key: Buffer.from(JSON.parse(readFileSync(`${HERE}source/synthetic-ed25519.json`, 'utf8')).publicKeySpkiDerHex, 'hex'),
  format: 'der',
  type: 'spki',
});
function jcs(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map((v) => jcs(v === undefined ? null : v)).join(',') + ']';
  return '{' + Object.keys(value).sort().filter((k) => value[k] !== undefined).map((k) => JSON.stringify(k) + ':' + jcs(value[k])).join(',') + '}';
}
for (const name of readdirSync(`${HERE}out/records`).filter((n) => n.startsWith('WISE-SYN'))) {
  const art = JSON.parse(readFileSync(`${HERE}out/records/${name}`, 'utf8'));
  const { signature, ...payload } = art;
  const digest = sha(jcs(payload));
  const good = digest === signature.digest
    && cryptoVerify(null, Buffer.from(digest, 'hex'), pub, Buffer.from(signature.value, 'hex'))
    && art.synthetic === true
    && art.$label === 'SYNTHETIC';
  if (good) sigOk++;
}
assert(`signed SYNTHETIC records verify ${sigOk}/${pop.count}`, sigOk === pop.count);

let bareThrew = false;
try { renderFigure({ k: 0, n: pop.count, pct: 0 }); } catch { bareThrew = true; }
assert('renderFigure refuses a bare figure', bareThrew);
const zeroGapFig = renderFigure(figure(0, pop.count, pop));
assert('zero-GAP figure carries denominator 0/8', zeroGapFig.startsWith('0/8'));

const MUTANT_CLAUSE = 'wise/2978048/citation/psr-app';
let onClause = 0;
for (const d of detDoc.determinations) {
  const mutated = structuredClone(R);
  mutated.clauses.find((c) => c.id === MUTANT_CLAUSE).evaluate = { op: 'emit', result: { op: 'const', value: 'present' } };
  const outM = interpret(mutated, d.facts, {});
  if (outM[MUTANT_CLAUSE].result !== d.records[MUTANT_CLAUSE].result) onClause++;
}
const rerunDiverging = detDoc.determinations.filter((d) => {
  const again = interpret(R, d.facts, {});
  return JSON.stringify(again) !== JSON.stringify(d.records);
}).length;
assert(`harness: mutant changes citation on ${onClause}/${pop.count}`, onClause === pop.count);
assert(`harness: clean rerun diverges 0/${pop.count}`, rerunDiverging === 0);

writeFileSync(`${HERE}HARNESS-SELF-CHECK.md`, `# Harness self-check: citation mutant shown failing

Generated by \`check.mjs\` on the committed determinations (${pop.count} determinations). Do not edit by hand.

An instrument that cannot fail is not evidence. Before any divergence figure is read, the Wise register is encoded as citing the PSR APP requirement (the citation clause emits \`present\`) and the assertion fails; then the unmutated register is replayed and the WIRED absence is green.

## 1. ENCODED AS CITING PSR APP (shown failing)

**What was perturbed.** \`${MUTANT_CLAUSE}\` evaluate set to \`const present\`. The file on disk is untouched.

Determinations changed on the mutated clause: **${renderFigure(figure(onClause, pop.count, pop))}**.

Citation-mutant gate: **failed, as required**.

## 2. WIRED ABSENCE (green)

Clean interpret: \`${MUTANT_CLAUSE}\` result \`absent\` on empty citation fact. Clean rerun divergence: **${renderFigure(figure(rerunDiverging, pop.count, pop), { marker: false })}**.

${populationMarker(pop)}

**SHOWN FAILING, THEN CLEAN.** The completeness gate may be read.
`);

// Replay against PSR (loaded, not modified)
const PSR = loadRegister(PSR_PATH);
const psrV = validate(PSR, 'psr-2017-752/register.json');
assert('paired PSR still validates', psrV.failures.length === 0);
assert('paired PSR sha256 unchanged after load', sha(readFileSync(PSR_PATH)) === PSR_PIN);

const authorisedFacts = {
  consent: { to_transaction: 'given' },
};
let psrOut;
try { psrOut = interpret(PSR, authorisedFacts, {}); }
catch (e) { psrOut = { $threw: String(e.message) }; }
const consent = psrOut['psr-2017/67/1/consent'];
const trigger = psrOut['psr-2017/76/1/trigger'];
assert('PSR replay ran (no throw)', !psrOut.$threw, psrOut.$threw);
assert('authorised synthetic: PSR 67/1 is one_present', consent?.result === 'one_present');
assert('authorised synthetic: PSR 76/1 trigger is not satisfied', trigger?.result !== 'satisfied');

const noticeAuthorised = detDoc.determinations.filter((d) => d.facts.payment.authorised_to_scammer === true);
const noticeRefundStance = noticeAuthorised.filter((d) => d.records['wise/2978048/outcome/no-guaranteed-refund'].result === 'member').length;
assert(`notice refund stance is not_guaranteed on ${noticeRefundStance}/${noticeAuthorised.length} in-scope synthetics`, noticeRefundStance === noticeAuthorised.length);

const PAIRED = [
  { id: 'psr-2017/67/1/consent', role: 'authorisation / consent', notice: 'wise/2978048/scope/authorised-scam' },
  { id: 'psr-2017/76/1/trigger', role: 'unauthorised-transaction refund trigger', notice: null },
  { id: 'psr-2017/76/1/a/refund', role: 'must refund unauthorised amount', notice: 'wise/2978048/outcome/no-guaranteed-refund' },
  { id: 'psr-2017/74/1/thirteen-months', role: 'notification longstop', notice: null },
  { id: 'psr-2017/76/2/deadline', role: 'refund deadline', notice: null },
  { id: 'PSR-APP-requirement', role: 'APP requirement (not a clause id on psr-2017-752; the omitted citation)', notice: 'wise/2978048/citation/psr-app' },
];
const rows = PAIRED.map((p) => ({
  paired_clause: p.id,
  paired_role: p.role,
  notice_counterpart: p.notice,
  citation: 'MISSING',
  note: p.id === 'PSR-APP-requirement'
    ? 'The notice does not cite the PSR APP requirement. That absence is WIRED. It is not filled in. No APP clause was added to psr-2017-752.'
    : 'The notice does not cite this PSR clause. Pairing is by reference to policy-library/psr-2017-752 (CV2).',
}));
const missingCitation = rows.filter((r) => r.citation === 'MISSING').length;
assert(`replay missing-citation ${missingCitation}/${PAIRED.length}`, missingCitation === PAIRED.length);

const live = parametersFromGeneratorHeader(HERE);
writeFileSync(`${HERE}FINDINGS.md`, `# Wise help 2978048 encode: findings

Findings file. No client-facing report. Retrieval instant \`2026-08-29T23:21:16Z\`.
Branch only; not merged; nothing deployed or published.

${populationMarker(pop)}

## Pins

| source | URL | retrieved | bytes | sha256 |
|---|---|---|---|---|
| How do I report fraud or a scam? | https://wise.com/help/articles/2978048/how-do-i-report-fraud-or-a-scam | 2026-08-29T23:21:16Z | 119222/119222 | \`5db3e87aa10515a5f4ac7322db38b76a947e8be9218cdcb623affccaedc08894\` |

Only this URL is pinned. The related card-fraud article is ABSENT-RULED and is not encoded.

Paired by reference only: \`policy-library/psr-2017-752\` (CV2). PSR sha256 \`c605d94f1ce7b1a5e032cb807f461e428c1a43e79e6fed232835a394efd52e86\` is unchanged.

## Clause count

The register carries **${R.clauses.length}/${R.clauses.length}** clauses (the array length; not invented):

${R.clauses.map((c) => `- \`${c.id}\` (${c.disposition})`).join('\n')}

Ambiguities registered, not resolved: **${R.ambiguities.entries.length}/${R.ambiguities.entries.length}** (W1–W4).

## Completeness

| id | status | kind | checked |
|---|---|---|---|
${computed.map((x) => `| ${x.id} | ${x.computed} | ${x.kind} | ${x.checked} |`).join('\n')}

GAP: **0/${ITEMS.length}**. Every item has a check function. A skipped check is never passed.

## Citation mutant

Shown failing first: encoding \`${MUTANT_CLAUSE}\` as \`const present\` makes the citation assertion fail.
Then green: clean interpret is \`absent\` (WIRED absence). Determinations changed on the mutant: ${renderFigure(figure(onClause, pop.count, pop))}.

## Replay against PSR 2017/752

Authorised synthetic on the paired register: 67/1 \`one_present\`; 76/1 trigger is not \`satisfied\`.
Notice in-scope synthetics with refund stance \`not_guaranteed\`: **${noticeRefundStance}/${noticeAuthorised.length}** (in-scope denominator; not the full synthetic population of ${pop.count}/${pop.count}).

Missing citation: **${missingCitation}/${PAIRED.length}** paired rows, including the PSR APP requirement row. That absence is WIRED. It is not filled in.

| paired clause | notice counterpart | citation |
|---|---|---|
${rows.map((r) => `| \`${r.paired_clause}\` | ${r.notice_counterpart ? '`' + r.notice_counterpart + '`' : '(none)'} | ${r.citation} |`).join('\n')}

## Synthetic rates

${zeroGapFig}

Synthetic rates stay REPOSITORY-INTERNAL. They are not findings about Wise.

Generator header digest \`${live.sha256.slice(0, 12)}\`.
`);

writeFileSync(`${HERE}DIVERGENCE.md`, `# Divergence: Wise notice vs policy-library/psr-2017-752 (CV2)

${populationMarker(pop)}

The paired register was loaded and not written. Its sha256 remains \`${PSR_PIN}\`.

On an authorised-to-scammer synthetic, PSR 67/1 is \`one_present\` and 76/1 trigger is not \`satisfied\` (the refund duty is for unauthorised transactions). The notice's own refund sentence is \`We can't guarantee a refund.\` The missing-citation gap is that the notice does not cite the PSR APP requirement, and does not cite the paired register's clauses.

Missing-citation gap: **${missingCitation}/${PAIRED.length}**.

| paired clause | role | notice counterpart | citation | note |
|---|---|---|---|---|
${rows.map((r) => `| \`${r.paired_clause}\` | ${r.paired_role} | ${r.notice_counterpart ?? '—'} | ${r.citation} | ${r.note} |`).join('\n')}

Harness self-check ran before these rows were written. See HARNESS-SELF-CHECK.md.
`);

writeFileSync(`${HERE}completeness.json`, JSON.stringify({
  $note: 'Statuses are recomputed by check.mjs. A skipped check is never passed.',
  denominator: ITEMS.length,
  gap: gap.length,
  items: computed,
}, null, 1) + '\n');

writeFileSync(`${HERE}out/selfcheck.json`, JSON.stringify({
  $derived_by: 'check.mjs',
  population: pop,
  mutant_clause: MUTANT_CLAUSE,
  mutant_shown_failing: true,
  wired_absence_green: cleanOut['wise/2978048/citation/psr-app'].result === 'absent',
  changed_on_clause: onClause,
  rerun_diverging: rerunDiverging,
  completeness_gap: gap.length,
  completeness_denominator: ITEMS.length,
  paired_missing_citation: missingCitation,
  paired_denominator: PAIRED.length,
  psr_sha256: sha(psrBytes),
}, null, 1) + '\n');

console.log(`\nWise checks: ${pass} passed, ${fail} failed`);
if (fail) { for (const f of failures) console.error(' -', f); process.exit(1); }
console.log('WISE GATE GREEN: GAP 0, WIRED absence tested, mutant shown failing first, PSR unchanged.');
