#!/usr/bin/env node
/**
 * ONE COMMAND FOR THE WHOLE PHASE 0 CLAIM. Every instrument here has been shown failing on the real
 * condition before it was trusted; `show-parity-fails.md` records what each printed.
 *
 * The last step is the 12 NYCRR register's figure gate (added 2026-08-25, ruled: a control nobody
 * runs passes by not running). It is the register's own check, invoked here so one command covers
 * the estate's registers rather than three of four; its printed LIMITS line states what a green
 * did not cover.
 */
import { execFileSync } from 'node:child_process';
const HERE = new URL('.', import.meta.url).pathname;
const LIB = `${HERE}..`;
const steps = [
  ['register validator, three registers', ['node', `${LIB}/_interpreter/validate.mjs`, `${LIB}/banxico-34-2010/register.json`, `${LIB}/psr-2017-752/register.json`, `${LIB}/feca-2-0805/register.json`]],
  ['every validator rule shown firing', ['node', `${HERE}show-validator.mjs`]],
  ['E17 conditions on the interpreter', ['node', `${HERE}show-e17.mjs`]],
  ['the adoption chain completes and its refusals fire', ['node', `${HERE}show-adoption.mjs`]],
  ['every fact path the registers read is varied by the parity population', ['node', `${HERE}reads-graph.mjs`]],
  ['parity, hand-written evaluators against the frozen oracle (identity)', ['node', `${HERE}parity.mjs`, '--candidate=hand']],
  ['parity, interpreter against the frozen oracle', ['node', `${HERE}parity.mjs`, '--candidate=interpreter']],
  ['12 NYCRR figure gate: no synthetic figure rendered without its population', ['node', `${LIB}/nywc-12nycrr-fee/check-figures.mjs`]],
];
// The last step's own summary and LIMITS lines are printed on a pass too: a green that does not say
// what it did not cover reads as covering everything.
const SHOW_ON_PASS = new Set(['12 NYCRR figure gate: no synthetic figure rendered without its population']);
let bad = 0;
for (const [label, cmd] of steps) {
  let ok = true, out = '';
  try { out = execFileSync(cmd[0], cmd.slice(1), { encoding: 'utf8' }); }
  catch (e) { ok = false; out = (e.stdout ?? '') + (e.stderr ?? ''); bad++; }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok || SHOW_ON_PASS.has(label)) console.log(out.split('\n').filter((l) => l.length).map((l) => `      ${l}`).join('\n'));
}
console.log(bad === 0 ? '\nPHASE 0 GATE: ALL STEPS PASS.' : `\nPHASE 0 GATE: ${bad} STEP(S) FAILED.`);
process.exit(bad === 0 ? 0 : 1);
