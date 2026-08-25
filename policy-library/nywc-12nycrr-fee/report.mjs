#!/usr/bin/env node
/**
 * RENDERS DIVERGENCE.md FROM THE DERIVED FILES under out/. Nothing in DIVERGENCE.md is typed: it is
 * the comparator's own rendering (out/divergence.json), the version diff (out/version-diff.json)
 * and the defensibility figure (out/defensibility.json), with their denominators as the scripts
 * printed them. Rerun after any change to the register or the determinations.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { populationOf, populationMarker, populationBlock } from './figure.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const rd = (f) => JSON.parse(readFileSync(`${HERE}/${f}`, 'utf8'));
const div = rd('out/divergence.json'), vd = rd('out/version-diff.json'), df = rd('out/defensibility.json');
const det = rd('determinations.json');
const pop = populationOf(det);
const MARK = populationMarker(pop);
const n = div.denominator;
const changedRows = vd.rows.filter((r) => r.change !== 'unchanged');
const md = `# Divergence by clause: in-force against proposed-2026-01-14

Rendered by \`report.mjs\` from \`out/divergence.json\`, \`out/version-diff.json\` and \`out/defensibility.json\`. Do not edit by hand.

**Population:** ${n} synthetic determinations (\`determinations.json\`, seed ${det.seed}); every figure below is over that denominator unless it says otherwise. The population's parameters are stated in the header of \`generate-determinations.mjs\` and reproduced here, adjacent, because a figure that travels without them becomes an operational claim; \`check-figures.mjs\` refuses any surface in this directory that carries one of these figures without the marker ${MARK}.

\`\`\`
${populationBlock(pop)}
\`\`\`

**Read only after \`HARNESS-SELF-CHECK.md\`**, which shows the comparator catching a single-constant mutation on the clause that carries it and reporting zero on an identical re-run.

## 1. The two versions differ on ${vd.tally.changed + vd.tally.absent_in_proposed} of ${vd.rows.length} clauses (derived, not listed)

| change | clauses |
|---|---|
${Object.entries(vd.tally).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

Per-version data whose definition differs: \`${vd.changed_bindings.join('`, `')}\`.

| change | disposition | clause | how |
|---|---|---|---|
${changedRows.map((r) => `| ${r.change} | ${r.disposition} | \`${r.id}\` | ${r.detail ?? ''} |`).join('\n')}

## 2. Divergence by clause over the replay

\`\`\`
${div.rendered}
\`\`\`

**Reading the transitions.** \`X -> Y\` is the token under in-force, then under proposed, for one determination. \`-> undetermined\` on a date-of-service clause is the proposed version's effective date being unsupplied (NY-A2) on that determination; the register refuses to decide a date test against a date the source does not state. \`cited_edition_in_force_on_dos -> cited_edition_not_the_one_in_force\` is a determination citing the 2019 OptumInsight edition, correct today, wrong under the proposal. The reverse transition is a determination citing the 2025 RefMed edition, wrong today, right under the proposal on the effective date it assumed. \`absent in proposed-2026-01-14 ${n}/${n}\` is a clause the proposal's restatement does not carry (NY-A7): a determination applying it under the proposed version has no clause to rest on. ${MARK}

## 3. Defensibility

\`\`\`
${df.rendered}
\`\`\`

The union is the figure. Its two parts are independent facts about a determination and are both reported because they fail differently: (a) is a claim the determination makes about itself (which register version it says it was decided under) and is checked by string equality; (b) is read off the in-force replay and inherits the replay's limits, which is why the undetermined and no-edition rows sit beside it and are counted under neither.
`;
writeFileSync(`${HERE}/DIVERGENCE.md`, md);
console.log('DIVERGENCE.md rendered');
// A bare figure anywhere in the directory fails the render.
const chk = spawnSync('node', [`${HERE}/check-figures.mjs`], { encoding: 'utf8' });
process.stdout.write(chk.stdout);
if (chk.status !== 0) { console.error('report.mjs: check-figures failed; a figure is rendered bare somewhere in this directory'); process.exit(chk.status); }
