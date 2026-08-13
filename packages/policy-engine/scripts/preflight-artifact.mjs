// SIX PROPERTIES WERE ASSERTED ABOUT THE COMMIT AND NONE ABOUT THE ARTIFACT.
//
// ─── THE DEFECT THIS EXISTS FOR, WHICH WAS A NEAR-MISS AND NOT A HYPOTHETICAL ────────────────────
//
// `package.json` declares `files: ["dist/", …]`, `main: dist/index.cjs`, `module: dist/index.mjs` and
// an `exports` map naming all three of `dist/index.{mjs,cjs,d.ts}`. **`dist/` is gitignored and has
// zero tracked files**, and `prepublishOnly` runs preflight, typecheck and test — it does NOT build.
//
// So the tarball ships whatever `dist/` happens to be on the publisher's disk. On a fresh clone that
// is nothing; on a machine that last built an earlier version it is that version. The existing six
// codes — TREE_DIRTY, NO_TAG, TAG_LIGHTWEIGHT, TAG_NOT_AT_HEAD, TAG_NOT_PUSHED, HEAD_NOT_ON_MAIN —
// assert six properties of the COMMIT. **An untracked `dist/` is invisible to TREE_DIRTY by design**,
// so the one check that reads the working tree is structurally unable to see what gets published.
//
// rc.13, rc.14 and rc.15 all shipped correctly because the publisher built immediately beforehand, by
// instruction. That is a convention — in a repo whose preflight exists because "a convention did not
// hold". A second near-miss the same week: a hand-written check assumed `main` pointed at `index.js`
// when the entry points are `index.cjs` and `index.mjs`, dual-format, with no `index.js` at all.
// Property 2 below would have caught that by resolving the declared path rather than assuming it.
//
// ─── IT DOES NOT BUILD, DELIBERATELY ────────────────────────────────────────────────────────────
//
// A gate that repairs what it measures cannot fail, and a preflight that silently rebuilt would hide
// exactly the situation worth knowing about: that the publisher was about to ship something they had
// not built. The remedy is to print `npm run build` and refuse.
//
// ─── IT DOES NOT VERIFY CONTENTS ────────────────────────────────────────────────────────────────
//
// Whether `dist/index.mjs` exports the right symbols is a test's job and `test/public-exports.mjs`
// already does it against source. Whether the PUBLISHED TARBALL exports them is a third question and
// belongs to whoever consumes the release.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

/** One code, because it is one property: the artifact on disk is not the one this commit describes. */
export const ARTIFACT_REFUSAL = { ARTIFACT_STALE: 'ARTIFACT_STALE' };

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};

/** Every path a consumer can resolve from the manifest: main, module, types, and each exports leaf. */
export function declaredEntryPoints(pkg) {
  const out = [];
  for (const k of ['main', 'module', 'types']) if (typeof pkg[k] === 'string') out.push([k, pkg[k]]);
  const visit = (node, path) => {
    if (typeof node === 'string') { out.push([`exports${path}`, node]); return; }
    if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) visit(v, `${path}.${k}`);
  };
  visit(pkg.exports, '');
  return out;
}

/** THE SUBJECT IS THE ARTIFACT, and every input is a parameter so the failure paths can be driven.
 *
 * `now` is not read here: the comparison is between two files' mtimes, not against wall time, so this
 * is deterministic and a selftest can construct both sides. */
export function preflightArtifact({ pkgDir, sourceDirs = ['src'], distDir = 'dist' }) {
  const refuse = (reason, detail) => ({ ok: false, code: ARTIFACT_REFUSAL.ARTIFACT_STALE, reason, detail });
  const pkgPath = join(pkgDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const dist = join(pkgDir, distDir);

  // 1. THE ARTIFACT EXISTS AND IS NOT EMPTY. An absent dist is the fresh-clone case and it publishes a
  //    package whose entry points resolve to nothing.
  if (!existsSync(dist) || walk(dist).length === 0) {
    return refuse(`No build output: ${distDir}/ is absent or empty. Run \`npm run build\` before publishing — `
      + 'this gate deliberately does not build, because a gate that repairs what it measures cannot fail.');
  }
  const built = walk(dist);

  // 2. EVERY DECLARED PATH RESOLVES. The failure mode otherwise is found by the first consumer rather
  //    than by us: a package whose `main` names a file the tarball does not contain.
  const missing = declaredEntryPoints(pkg).filter(([, p]) => !existsSync(join(pkgDir, p)));
  if (missing.length > 0) {
    return refuse(`Declared entry point(s) resolve to nothing: ${missing.map(([k, p]) => `${k} -> ${p}`).join(', ')}. `
      + 'A consumer resolving these gets a module that does not exist.');
  }

  // 3. EVERY `files` ENTRY MATCHES SOMETHING, so a shipped directory cannot silently become empty.
  const filesUnmatched = (pkg.files ?? []).filter((f) => {
    const base = f.replace(/\/$/, '');
    return !existsSync(join(pkgDir, base));
  });
  if (filesUnmatched.length > 0) {
    return refuse(`\`files\` names path(s) that do not exist: ${filesUnmatched.join(', ')}. `
      + 'Each would ship as nothing.');
  }

  // 4. THE BUILD IS NOT OLDER THAN THE SOURCE IT DERIVES FROM. This is the stale-build case, and it is
  //    the one no existing check can see. Reported with BOTH timestamps and the file each came from,
  //    so a refusal is actionable rather than a verdict.
  const sources = sourceDirs.flatMap((d) => (existsSync(join(pkgDir, d)) ? walk(join(pkgDir, d)) : []));
  if (sources.length === 0) return { ok: true, note: 'no source directory to compare against' };
  const newestSrc = sources.map((p) => [p, statSync(p).mtimeMs]).sort((a, b) => b[1] - a[1])[0];
  const oldestOut = built.map((p) => [p, statSync(p).mtimeMs]).sort((a, b) => a[1] - b[1])[0];
  if (newestSrc[1] > oldestOut[1]) {
    return refuse(
      `The build is older than the source it derives from. Run \`npm run build\`.`,
      `newest source  ${relative(pkgDir, newestSrc[0])}  ${new Date(newestSrc[1]).toISOString()}\n`
      + `      oldest output  ${relative(pkgDir, oldestOut[0])}  ${new Date(oldestOut[1]).toISOString()}`,
    );
  }
  return { ok: true, note: `${built.length} built file(s); newest source ${relative(pkgDir, newestSrc[0])} `
    + `is not newer than oldest output ${relative(pkgDir, oldestOut[0])}` };
}
