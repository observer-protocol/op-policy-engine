#!/usr/bin/env node
/**
 * REPLAYS A DETERMINATION SET AGAINST ONE REGISTER VERSION. One line of JSON per determination:
 * { id, records: { <clauseId>: <record> } }, records exactly as the interpreter emits them.
 *
 *   node replay.mjs <register.json> <determinations.json> <out.jsonl>
 *
 * Exported for the harness self-check, which replays an in-memory MUTATED register and must not
 * be able to reach a file the unmutated run wrote.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { interpret } from '../_interpreter/interpret.mjs';

export function replayAll(register, determinations) {
  return determinations.map((d) => ({ id: d.id, records: interpret(register, d.facts, d.resolutions ?? {}) }));
}
export const toJsonl = (rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';

if (import.meta.url === `file://${process.argv[1]}`) {
  const [regPath, detPath, outPath] = process.argv.slice(2);
  const register = JSON.parse(readFileSync(regPath, 'utf8'));
  const det = JSON.parse(readFileSync(detPath, 'utf8'));
  const rows = replayAll(register, det.determinations);
  writeFileSync(outPath, toJsonl(rows));
  console.log(`replayed ${rows.length} determinations x ${register.clauses.length} clauses under ${register.domain} -> ${outPath}`);
}
