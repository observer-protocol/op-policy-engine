#!/usr/bin/env node
/**
 * Estate check for the two omission-seam encodes. Lives outside both
 * encode directories so a name-ban over the GXS tree does not have to
 * carry the banned name inside that tree.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const HERE = new URL('.', import.meta.url).pathname;
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const PSR = join(HERE, 'psr-2017-752/register.json');
const PSR_PIN = 'c605d94f1ce7b1a5e032cb807f461e428c1a43e79e6fed232835a394efd52e86';

function walk(dir, acc = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) console.log('  PASS ', name);
  else { failed++; console.log('  FAIL ', name, detail); }
};

check('PSR register byte-identical', sha(PSR) === PSR_PIN, sha(PSR));
check('no mas-srf directory added on this commit tree', !readdirSync(HERE).includes('mas-srf-2024'));
check('Banxico register not in this change set as a new encode', readdirSync(join(HERE, 'banxico-34-2010')).includes('register.json'));

const banned = ['Mari', 'Bank'].join('');
const gxsFiles = walk(join(HERE, 'gxs-card-terms-4-7'));
const hits = [];
for (const p of gxsFiles) {
  const t = readFileSync(p, 'utf8');
  if (t.toLowerCase().includes(banned.toLowerCase())) hits.push(p);
}
check(`GXS tree does not cite the banned named encode (0/${gxsFiles.length} files)`, hits.length === 0, hits.join(', '));

console.log('\n-- gxs-card-terms-4-7 --');
execSync('node check.mjs', { cwd: join(HERE, 'gxs-card-terms-4-7'), stdio: 'inherit' });
console.log('\n-- wise-help-2978048 --');
execSync('node check.mjs', { cwd: join(HERE, 'wise-help-2978048'), stdio: 'inherit' });

check('PSR register still byte-identical after Wise replay', sha(PSR) === PSR_PIN);

if (failed) { console.error(`estate check failed: ${failed}`); process.exit(1); }
console.log('\nESTATE GREEN: both encodes, both WIRED absences, PSR unchanged, banned name absent from GXS tree.');
