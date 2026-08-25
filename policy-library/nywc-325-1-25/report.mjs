#!/usr/bin/env node
/** Renders DIVERGENCE.md from out/*.json and runs check-figures over this directory. */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { populationOf, populationMarker, populationBlock } from '../nywc-12nycrr-fee/figure.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const rd = (f) => JSON.parse(readFileSync(`${HERE}/${f}`, 'utf8'));
const det = rd('determinations.json'), pop = populationOf(det, HERE), MARK = populationMarker(pop), n = det.count;
const ty = rd('out/tally.json'), dA = rd('out/divergence-a.json'), dB = rd('out/divergence-b.json');
const md = `# Divergence by clause: 12 NYCRR 325-1.25 against two restatement layers

Rendered by \`report.mjs\` from \`out/tally.json\`, \`out/divergence-a.json\` and \`out/divergence-b.json\`. Do not edit by hand.

**Reference direction:** the regulation register is the reference; each restatement layer is under test. **Layer A (WCB provider pages) is the publishable comparison. Layer B (daisyBill knowledge base) is MEASURED AND HELD INTERNAL; nothing in section 3 leaves this repository.** Read only after \`HARNESS-SELF-CHECK.md\`.

**Population:** ${n} synthetic bill determinations; every figure below carries ${MARK}.

\`\`\`
${populationBlock(pop)}
\`\`\`

**Both denominators, on every rate:** \`k/${n}\` is over all determinations; \`k/reached\` is over the determinations the clause reaches under the regulation (its result is not \`not_applicable\`, and not an \`undetermined\` the ungrounded emitter returned before testing applicability). CV7's headline rate was uninterpretable for want of the second.

## 1. Regulation against layer A (WCB), publishable

${MARK}

\`\`\`
${dA.rendered}
\`\`\`

## 2. Both denominators, layer A

${MARK}

\`\`\`
${ty.rendered.split('\nREGULATION vs LAYER A')[1].split('\nREGULATION vs LAYER B')[0].replace(/^/, 'REGULATION vs LAYER A')}
\`\`\`

## 3. Regulation against layer B (daisyBill), REPOSITORY-INTERNAL, NOT PUBLISHED

${MARK}

\`\`\`
${dB.rendered}
\`\`\`

\`\`\`
${'REGULATION vs LAYER B' + ty.rendered.split('\nREGULATION vs LAYER B')[1]}
\`\`\`

## 4. The waiting axis and the ungrounded split

${MARK}

\`\`\`
${ty.rendered.split('\nREGULATION vs LAYER A')[0]}
\`\`\`
`;
writeFileSync(`${HERE}/DIVERGENCE.md`, md);
console.log('DIVERGENCE.md rendered');
const chk = spawnSync('node', [`${HERE}/../nywc-12nycrr-fee/check-figures.mjs`, '--dir', HERE], { encoding: 'utf8' });
process.stdout.write(chk.stdout);
if (chk.status !== 0) { console.error('report.mjs: check-figures failed'); process.exit(chk.status); }
