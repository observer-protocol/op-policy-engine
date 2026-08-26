#!/usr/bin/env node
/**
 * ONE COMMAND FOR THE WHOLE PHASE 0 CLAIM. Every instrument here has been shown failing on the real
 * condition before it was trusted; `show-parity-fails.md` records what each printed.
 */
import { execFileSync } from 'node:child_process';
const HERE = new URL('.', import.meta.url).pathname;
const LIB = `${HERE}..`;
const steps = [
  ['register validator, four registers', ['node', `${LIB}/_interpreter/validate.mjs`, `${LIB}/banxico-34-2010/register.json`, `${LIB}/psr-2017-752/register.json`, `${LIB}/feca-2-0805/register.json`, `${LIB}/mas-srf-2024/register.json`]],
  ['every validator rule shown firing', ['node', `${HERE}show-validator.mjs`]],
  ['E17 conditions on the interpreter', ['node', `${HERE}show-e17.mjs`]],
  ['the adoption chain completes and its refusals fire', ['node', `${HERE}show-adoption.mjs`]],
  ['every fact path the registers read is varied by the parity population', ['node', `${HERE}reads-graph.mjs`]],
  ['parity, hand-written evaluators against the frozen oracle (identity)', ['node', `${HERE}parity.mjs`, '--candidate=hand']],
  ['parity, interpreter against the frozen oracle', ['node', `${HERE}parity.mjs`, '--candidate=interpreter']],
];
let bad = 0;
for (const [label, cmd] of steps) {
  let ok = true, out = '';
  try { out = execFileSync(cmd[0], cmd.slice(1), { encoding: 'utf8' }); }
  catch (e) { ok = false; out = (e.stdout ?? '') + (e.stderr ?? ''); bad++; }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(out.split('\n').map((l) => `      ${l}`).join('\n'));
}
console.log(bad === 0 ? '\nPHASE 0 GATE: ALL STEPS PASS.' : `\nPHASE 0 GATE: ${bad} STEP(S) FAILED.`);
process.exit(bad === 0 ? 0 : 1);
