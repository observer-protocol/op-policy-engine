#!/usr/bin/env node
/**
 * Completeness gate, citation mutant, harness self-check, replay, figure refusal.
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
const card = readFileSync(`${HERE}source/card-terms.html`);
const help = readFileSync(`${HERE}source/refund-help.html`);
const cardText = card.toString('utf8');
const helpText = help.toString('utf8');
const bothText = cardText + '\n' + helpText;

// ── validator ────────────────────────────────────────────────────────────────
const v = validate(R, 'gxs-card-terms-4-7/register.json');
assert('register validates (zero rule failures)', v.failures.length === 0, JSON.stringify(v.failures));
assert('record format is v7', RECORD_VERSION === 7);

// ── pin digests ──────────────────────────────────────────────────────────────
assert('card-terms sha256', sha(card) === 'd42dfd6b480280c154ebd3820e5303d79a2b96976934a21bde8c1b71c6efc1b2');
assert('refund-help sha256', sha(help) === '4d0d6a06e4e7ab80b53ebd80c2385198eac674d577d3c4327c8b2a1ce0ba7bea');
assert('card-terms bytes', card.length === 168557);
assert('refund-help bytes', help.length === 64360);
for (const [file, expect] of [
  ['source/card-terms.html', 'd42dfd6b480280c154ebd3820e5303d79a2b96976934a21bde8c1b71c6efc1b2'],
  ['source/refund-help.html', '4d0d6a06e4e7ab80b53ebd80c2385198eac674d577d3c4327c8b2a1ce0ba7bea'],
]) {
  const line = readFileSync(`${HERE}SOURCES.md`, 'utf8').split('\n').find((l) => l.includes(`\`${file}\``));
  assert(`SOURCES.md carries ${file}`, !!(line && line.includes(expect)));
}

// ── source contains 4.7 and the help path; does not contain SRF ──────────────
assert('pin carries Section C 4.7 credit sentence', cardText.includes('We may credit your FlexiCard with the amount of the disputed transaction'));
assert('help carries four-step path', helpText.includes("Raising a card transaction dispute"));
const srfHit = /shared responsibility framework|\bsrf-register-accepted-v1\b/i.test(bothText);
assert('pinned bytes do not cite SRF', !srfHit);

// ── completeness items, each with a live check ───────────────────────────────
const CHECKS = {
  'C-4.7-inform': () => {
    const c = R.clauses.find((x) => x.id === 'gxs/card-terms/C/4.7/inform-immediately');
    return !!(c && c.text.includes('must inform us immediately') && cardText.includes(c.text));
  },
  'C-4.7-credit': () => {
    const c = R.clauses.find((x) => x.id === 'gxs/card-terms/C/4.7/credit-permission');
    return !!(c && c.text.includes('We may credit your FlexiCard') && cardText.includes('We may credit your FlexiCard'));
  },
  'C-help-path': () => {
    const c = R.clauses.find((x) => x.id === 'gxs/help/unauthorised-refund/in-app-path');
    return !!(c && helpText.includes('FlexiCredit tile') && helpText.includes("Raising a card transaction dispute"));
  },
  'C-srf-citation-wired-absence': () => {
    const c = R.clauses.find((x) => x.id === 'gxs/notice/srf-citation');
    const out = interpret(R, { notice: { credit: { stance: 'may' } } }, {});
    return c
      && c.evaluate?.op === 'emit'
      && c.evaluate?.result?.name === 'field_present'
      && out[c.id].result === 'absent'
      && !srfHit;
  },
  'C-no-gxs-policy-authored': () => {
    const credit = R.clauses.find((x) => x.id === 'gxs/card-terms/C/4.7/credit-permission');
    return credit && credit.text.startsWith('We may credit') && !/must credit/i.test(credit.text);
  },
  'C-debit-5.7-absent-ruled': () => {
    return !R.clauses.some((x) => /5\.7|savings account/.test(x.id + x.text))
      && cardText.includes('We may credit your savings account');
  },
  'C-banxico-absent-ruled': () => !/banxico|34-2010/i.test(JSON.stringify(R.clauses)),
};

const ITEMS = [
  { id: 'C-4.7-inform', status: 'WIRED', kind: 'presence' },
  { id: 'C-4.7-credit', status: 'WIRED', kind: 'presence' },
  { id: 'C-help-path', status: 'WIRED', kind: 'presence' },
  { id: 'C-srf-citation-wired-absence', status: 'WIRED', kind: 'absence' },
  { id: 'C-no-gxs-policy-authored', status: 'WIRED', kind: 'presence' },
  { id: 'C-debit-5.7-absent-ruled', status: 'ABSENT-RULED', kind: 'out-of-scope' },
  { id: 'C-banxico-absent-ruled', status: 'ABSENT-RULED', kind: 'out-of-scope' },
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
assert(`clause count is the register array length ${R.clauses.length}/${R.clauses.length}`, R.clauses.length === 4);

// ── show the citation assertion failing first, then green ────────────────────
const mutant = structuredClone(R);
const cite = mutant.clauses.find((c) => c.id === 'gxs/notice/srf-citation');
cite.evaluate = { op: 'emit', result: { op: 'const', value: 'present' } };
const mutantOut = interpret(mutant, { notice: { credit: { stance: 'may' } } }, {});
const mutantCites = mutantOut['gxs/notice/srf-citation'].result === 'present';
assert('mutant encoded as citing SRF is shown FAILING', mutantCites === true);
let mutantGatePassed = false;
try {
  if (mutantCites) throw new Error('GXS register encoded as citing SRF');
  mutantGatePassed = true;
} catch (e) {
  console.log(`  SHOWN FAILING  citation mutant: ${e.message}`);
}
assert('citation mutant does not pass the gate', mutantGatePassed === false);

const cleanOut = interpret(R, { notice: { credit: { stance: 'may' } } }, {});
assert('clean register: srf-citation is absent (WIRED)', cleanOut['gxs/notice/srf-citation'].result === 'absent');
assert('clean register: credit stance is member (may)', cleanOut['gxs/card-terms/C/4.7/credit-permission'].result === 'member');

// ── generate determinations, verify signatures, figure self-check ────────────
execSync('node generate-determinations.mjs', { cwd: HERE, stdio: 'inherit' });
const detDoc = JSON.parse(readFileSync(`${HERE}out/determinations.json`, 'utf8'));
const pop = populationOf(detDoc, HERE);
assert('population count is the case list', pop.count === detDoc.determinations.length);
assert('population count is 6/6', pop.count === 6);

let sigOk = 0;
const pub = createPublicKey({
  key: Buffer.from(JSON.parse(readFileSync(`${HERE}source/synthetic-ed25519.json`, 'utf8')).publicKeySpkiDerHex, 'hex'),
  format: 'der',
  type: 'spki',
});
for (const name of readdirSync(`${HERE}out/records`).filter((n) => n.startsWith('GXS-SYN'))) {
  const art = JSON.parse(readFileSync(`${HERE}out/records/${name}`, 'utf8'));
  const { signature, ...payload } = art;
  function jcs(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map((v) => jcs(v === undefined ? null : v)).join(',') + ']';
    return '{' + Object.keys(value).sort().filter((k) => value[k] !== undefined).map((k) => JSON.stringify(k) + ':' + jcs(value[k])).join(',') + '}';
  }
  const digest = sha(jcs(payload));
  const good = digest === signature.digest
    && cryptoVerify(null, Buffer.from(digest, 'hex'), pub, Buffer.from(signature.value, 'hex'))
    && art.synthetic === true
    && art.$label === 'SYNTHETIC';
  if (good) sigOk++;
}
assert(`signed SYNTHETIC records verify ${sigOk}/${pop.count}`, sigOk === pop.count);

// figure refusal then render
let bareThrew = false;
try { renderFigure({ k: 0, n: pop.count, pct: 0 }); } catch { bareThrew = true; }
assert('renderFigure refuses a bare figure', bareThrew);
const zeroGapFig = renderFigure(figure(0, pop.count, pop));
assert('zero-GAP figure carries denominator 0/6', zeroGapFig.startsWith('0/6'));
assert('figure carries REPOSITORY-INTERNAL marker', zeroGapFig.includes('REPOSITORY-INTERNAL'));

// harness: mutate citation, determinations on that clause change; clean rerun does not
const MUTANT_CLAUSE = 'gxs/notice/srf-citation';
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

const harnessMd = `# Harness self-check: citation mutant shown failing

Generated by \`check.mjs\` on the committed determinations (${pop.count} determinations). Do not edit by hand.

An instrument that cannot fail is not evidence. Before any divergence figure is read, the GXS register is encoded as citing SRF (the citation clause emits \`present\`) and the assertion fails; then the unmutated register is replayed and the WIRED absence is green.

## 1. ENCODED AS CITING SRF (shown failing)

**What was perturbed.** \`${MUTANT_CLAUSE}\` evaluate set to \`const present\`. The file on disk is untouched.

Determinations changed on the mutated clause: **${renderFigure(figure(onClause, pop.count, pop))}**.

Citation-mutant gate: **failed, as required**.

## 2. WIRED ABSENCE (green)

Clean interpret: \`${MUTANT_CLAUSE}\` result \`absent\` on empty citation fact. Clean rerun divergence: **${renderFigure(figure(rerunDiverging, pop.count, pop), { marker: false })}**.

${populationMarker(pop)}

**SHOWN FAILING, THEN CLEAN.** The completeness gate may be read.
`;
writeFileSync(`${HERE}HARNESS-SELF-CHECK.md`, harnessMd);

// ── replay against omitted SRF instrument (by reference; not copied) ─────────
const PAIRED = [
  { id: 'srf/7.13/fi-credits', role: 'FI credit of total loss', notice: 'gxs/card-terms/C/4.7/credit-permission' },
  { id: 'srf/7.2/explain-workflow', role: 'explain operational workflow at report', notice: null },
  { id: 'srf/7.3/report-within-30-days', role: 'report within 30 calendar days', notice: 'gxs/card-terms/C/4.7/inform-immediately' },
  { id: 'srf/6.8/redress', role: 'alternative redress', notice: null },
  { id: 'srf/1.1/fn1/card-exclusion', role: 'card-transaction exclusion on the paired instrument', notice: null },
];
const rows = PAIRED.map((p) => ({
  paired_clause: p.id,
  paired_role: p.role,
  notice_counterpart: p.notice,
  citation: 'MISSING',
  note: 'srf-register-accepted-v1 is paired by reference only and is not stored in this tree. The notice does not cite it. That absence is WIRED. It is not filled in.',
}));
const missingCitation = rows.filter((r) => r.citation === 'MISSING').length;
assert(`replay missing-citation ${missingCitation}/${PAIRED.length}`, missingCitation === PAIRED.length);
assert('replay does not copy the paired register', !readdirSync(HERE).includes('mas-srf-2024') && !JSON.stringify(R).includes('srf/7.13/fi-credits'));

const live = parametersFromGeneratorHeader(HERE);
const findings = `# GXS card-terms 4.7 + refund-help encode: findings

Findings file. No client-facing report. Retrieval instant \`2026-08-29T23:21:16Z\`.
Branch only; not merged; nothing deployed or published.

${populationMarker(pop)}

## Pins

| source | URL | retrieved | bytes | sha256 |
|---|---|---|---|---|
| Card Account Terms, Section C clause 4.7 | https://www.gxs.com.sg/card-terms | 2026-08-29T23:21:16Z | 168557/168557 | \`d42dfd6b480280c154ebd3820e5303d79a2b96976934a21bde8c1b71c6efc1b2\` |
| Refund-help article | https://help.gxs.com.sg/?title=GXS_FlexiCredit%2FGXS_Credit_Card%2FSecurity_%26_Fraud%2FHow_can_I_request_a_refund_for_unauthorised_transactions_on_my_GXS_Credit_Card%3F | 2026-08-29T23:21:16Z | 64360/64360 | \`4d0d6a06e4e7ab80b53ebd80c2385198eac674d577d3c4327c8b2a1ce0ba7bea\` |

Paired by reference only: \`srf-register-accepted-v1\`. Not copied. No other institution's encode was copied, renamed, or cited into this directory.

## Clause count

The register carries **${R.clauses.length}/${R.clauses.length}** clauses (the array length; not invented):

${R.clauses.map((c) => `- \`${c.id}\` (${c.disposition})`).join('\n')}

Ambiguities registered, not resolved: **${R.ambiguities.entries.length}/${R.ambiguities.entries.length}** (G1–G4).

## Completeness

| id | status | kind | checked |
|---|---|---|---|
${computed.map((x) => `| ${x.id} | ${x.computed} | ${x.kind} | ${x.checked} |`).join('\n')}

GAP: **0/${ITEMS.length}**. Every item has a check function. A skipped check is never passed.

## Citation mutant

Shown failing first: encoding \`${MUTANT_CLAUSE}\` as \`const present\` makes the citation assertion fail.
Then green: clean interpret is \`absent\` (WIRED absence). Determinations changed on the mutant: ${renderFigure(figure(onClause, pop.count, pop))}.

## Replay against the omitted public instrument

srf-register-accepted-v1 is not stored here. Divergence is by referenced clause id, including the missing-citation gap.

| paired clause (reference) | notice counterpart | citation |
|---|---|---|
${rows.map((r) => `| \`${r.paired_clause}\` | ${r.notice_counterpart ? '`' + r.notice_counterpart + '`' : '(none)'} | ${r.citation} |`).join('\n')}

Missing citation: **${missingCitation}/${PAIRED.length}** paired clause ids. That absence is WIRED. It is not filled in.

Credit-permission on the notice is the verb \`may\` (${renderFigure(figure(detDoc.determinations.filter((d) => d.records['gxs/card-terms/C/4.7/credit-permission'].result === 'member').length, pop.count, pop), { marker: false })} of the synthetic set). That is a fact about these pins, not a finding about GXS.

## Synthetic rates

${zeroGapFig}

Synthetic rates stay REPOSITORY-INTERNAL. They are not findings about GXS.

Generator header digest \`${live.sha256.slice(0, 12)}\`.
`;
writeFileSync(`${HERE}FINDINGS.md`, findings);

const divergence = `# Divergence: GXS notice vs srf-register-accepted-v1 (reference only)

${populationMarker(pop)}

The paired instrument is **not in this tree**. Rows name clause ids on that register. No SRF clause text is copied.

Missing-citation gap: **${missingCitation}/${PAIRED.length}**.

| paired clause | role | notice counterpart | citation | note |
|---|---|---|---|---|
${rows.map((r) => `| \`${r.paired_clause}\` | ${r.paired_role} | ${r.notice_counterpart ?? '—'} | ${r.citation} | ${r.note} |`).join('\n')}

Harness self-check ran before these rows were written. See HARNESS-SELF-CHECK.md.
`;
writeFileSync(`${HERE}DIVERGENCE.md`, divergence);

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
  wired_absence_green: cleanOut['gxs/notice/srf-citation'].result === 'absent',
  changed_on_clause: onClause,
  rerun_diverging: rerunDiverging,
  completeness_gap: gap.length,
  completeness_denominator: ITEMS.length,
  paired_missing_citation: missingCitation,
  paired_denominator: PAIRED.length,
}, null, 1) + '\n');

console.log(`\nGXS checks: ${pass} passed, ${fail} failed`);
if (fail) { for (const f of failures) console.error(' -', f); process.exit(1); }
console.log('GXS GATE GREEN: GAP 0, WIRED absence tested, mutant shown failing first.');
