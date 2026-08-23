#!/usr/bin/env node
/**
 * Did npm actually record the commit this version was built from?
 *
 * WHY THIS EXISTS AND WHY IT CANNOT BE A PREFLIGHT. scripts/preflight-publish.mjs
 * checks that the annotated tag is pushed and points at HEAD on main. That is a
 * property of THIS REPOSITORY. The property a reader actually depends on is that
 * the REGISTRY carries a gitHead equal to that commit, and no check running before
 * a publish can establish it, because the field is written by the publish itself.
 *
 * 1.0.0-rc.20 is the proof. It satisfied every preflight check and went out with no
 * gitHead at all. npm derives the field in @npmcli/package-json/lib/normalize.js by
 * reading `<gitRoot>/.git/HEAD` AS A PATH; that publish ran from a linked git
 * worktree, where `.git` is a FILE containing `gitdir: …`. The read raises ENOTDIR
 * straight into an empty catch, the field is skipped without a warning, and the
 * publish reports success. Detached HEAD is not the cause and a branch does not fix
 * it: only the shape of `.git` matters.
 *
 * IT READS THE RAW REGISTRY DOCUMENT, NOT `npm view`. `npm view` answers from a
 * local cache that can be minutes stale, and a cache is the wrong instrument for
 * "what does the registry now hold". This fetches registry.npmjs.org directly with
 * no-cache and parses the document.
 *
 * IT COMPARES AGAINST THE ANNOTATED TAG, NOT AGAINST HEAD. HEAD moves; the tag is
 * what the version names. A gitHead that is present but points somewhere else is a
 * worse failure than an absent one, because it resolves.
 *
 *   node scripts/postflight-publish.mjs            # the version in package.json
 *   node scripts/postflight-publish.mjs 1.0.0-rc.20
 *
 * Exit 0 pass, 1 refusal, 2 the registry could not be reached. Unreachable is NOT a
 * pass: it means the check did not run.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXIT_OK = 0, EXIT_REFUSED = 1, EXIT_UNREACHABLE = 2;
const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const version = process.argv[2] || pkg.version;
const name = pkg.name;

function tagCommit(tag) {
  try {
    return execFileSync('git', ['rev-parse', `${tag}^{}`], { cwd: pkgDir, encoding: 'utf8' }).trim();
  } catch { return null; }
}

async function registryDoc(pkgName) {
  const url = `https://registry.npmjs.org/${pkgName.replace('/', '%2F')}`;
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`registry returned HTTP ${res.status}`);
  return res.json();
}

console.log(`\n── publish postflight: ${version} ──`);

let doc;
try {
  doc = await registryDoc(name);
} catch (e) {
  console.error(`\n  REGISTRY UNREACHABLE. This says NOTHING about whether the publish is correct —`);
  console.error(`  the check could not be RUN.\n\n      ${e.message}\n`);
  console.error(`  Exit ${EXIT_UNREACHABLE} is unreachable; exit ${EXIT_REFUSED} is a refusal.\n`);
  process.exit(EXIT_UNREACHABLE);
}

// A REAL PUBLISH RUNS THIS SECONDS LATER, so absence can mean "not propagated yet"
// rather than "not published". Those are different findings and must not share an
// exit code. Re-read a few times before concluding anything; if it never appears,
// say that it never appeared rather than that the publish failed.
let meta = doc.versions?.[version];
if (!meta) {
  const waits = [1000, 2000, 4000, 8000];
  for (const ms of waits) {
    process.stdout.write(`  ${version} not visible yet, re-reading in ${ms / 1000}s\n`);
    await new Promise((r) => setTimeout(r, ms));
    try { doc = await registryDoc(name); } catch { /* handled below by !meta */ }
    meta = doc.versions?.[version];
    if (meta) break;
  }
}
if (!meta) {
  console.error(`\n  REFUSING: ${name}@${version} is not in the registry's versions list,`);
  console.error(`  after re-reading over ${(1 + 2 + 4 + 8)}s. Either it was never published, or the`);
  console.error(`  registry has not made it visible. This check cannot tell those apart, and says`);
  console.error(`  so rather than picking one.\n`);
  process.exit(EXIT_REFUSED);
}

const recorded = meta.gitHead || null;
const tag = `v${version}`;
const expected = tagCommit(tag);

console.log(`  registry gitHead   ${recorded ?? '(ABSENT)'}`);
console.log(`  ${tag}${' '.repeat(Math.max(1, 18 - tag.length))} ${expected ?? '(tag not found in this checkout)'}`);
console.log(`  dist.shasum        ${meta.dist?.shasum ?? '(none)'}`);

if (!recorded) {
  console.error(`\n  REFUSING: the registry carries NO gitHead for ${version}.`);
  console.error(`  A reader holding this tarball cannot resolve it to a commit. The field cannot be`);
  console.error(`  added to a version already published, so the remedy is a new version published`);
  console.error(`  from a tree where npm can read .git/HEAD — a plain clone, not a linked worktree.\n`);
  process.exit(EXIT_REFUSED);
}

if (!expected) {
  console.error(`\n  REFUSING: ${tag} is not present in this checkout, so the recorded gitHead cannot`);
  console.error(`  be compared to anything. Fetch tags and re-run; a gitHead that is never compared`);
  console.error(`  is not evidence.\n`);
  process.exit(EXIT_REFUSED);
}

if (recorded !== expected) {
  console.error(`\n  REFUSING: the registry's gitHead does not match ${tag}.`);
  console.error(`  It resolves, which is why this is worse than an absent field: a reader following`);
  console.error(`  it lands on a commit that is not the one this version names.\n`);
  process.exit(EXIT_REFUSED);
}

console.log(`\n  OK  the registry records ${recorded.slice(0, 12)} for ${version}, which is the commit`);
console.log(`      ${tag} points at. A reader can resolve this artifact to a commit.\n`);
process.exit(EXIT_OK);
