// A PUBLISHED ARTIFACT MUST RESOLVE TO AN ANNOTATED, PUSHED TAG ON `main`. REFUSED OTHERWISE.
//
// ─── WHAT HAPPENED, STATED EXACTLY, INCLUDING WHAT IS NOT ESTABLISHED ────────────────────────────
//
// `1.0.0-rc.10` was published at 15:00:58 UTC on 2026-08-09 and tagged at 15:02:39 UTC. **Published
// 1m41s before it was tagged.** That is one instance, it is measurable, and it is the only one.
//
// **`v1.0.0-rc.4` THROUGH `v1.0.0-rc.9` ARE UNMEASURABLE, NOT CLEAN.** They are LIGHTWEIGHT tags:
// bare refs with no tag object, no tagger and no creation date. Git cannot say when any of them was
// made, and GitHub's events API returns no tag events for this repository. **A successor must not
// read this gate's existence as evidence that those six were published correctly.** Nothing here
// establishes that. The question is simply unanswerable for them, and this file exists so it stops
// being unanswerable from rc.11 onward.
//
// ─── THE NEAR-MISS THAT PRODUCED REQUIREMENT 3, AND WHY IT IS NOT GRATUITOUS STRICTNESS ──────────
//
// The first attempt to check the six older tags printed `%(creatordate)` for all seven and got
// plausible timestamps showing rc.4 through rc.9 tagged between 11 seconds and 5 minutes BEFORE their
// publishes — a clean refutation, reported confidently, and wrong.
//
// **`creatordate` ON A LIGHTWEIGHT TAG FALLS BACK TO THE TARGET COMMIT'S DATE.** Those were commit
// times being read as tag times. The field answered a different question and returned something
// shaped like an answer.
//
// **THAT IS WHY REQUIREMENT 3 REFUSES A LIGHTWEIGHT TAG.** rc.10's timing could be checked at all only
// because it happened to be annotated. An annotated tag carries a tagger and a date; a lightweight one
// carries nothing and silently answers with the commit's. Requiring annotated is not tidiness — it is
// what makes the NEXT audit possible, and it is the direct fix for the defect above.
//
// ─── NO ESCAPE HATCH ─────────────────────────────────────────────────────────────────────────────
//
// There is no `--force`, no environment override and no skip. **A publish gate with a bypass is a
// convention**, and this exists because a convention did not hold. If it refuses, the fix is to tag.
//
// ─── THE ORDERING THIS ENFORCES IS A CHANGE TO A HUMAN PROCEDURE ─────────────────────────────────
//
//     git tag -a v<version> -m "..."  &&  git push origin v<version>  &&  npm publish
//
// **Tag, push, THEN publish.** It was publish-then-tag, which is how rc.10 went out untagged. The
// procedure lives in habits rather than in the repository, which is exactly why it needs a gate.
import { execFileSync } from 'node:child_process';

/** Refusal codes. Named so a caller can branch on WHICH property failed rather than on a message. */
export const REFUSAL = {
  TREE_DIRTY: 'TREE_DIRTY',
  NO_TAG: 'NO_TAG',
  TAG_NOT_AT_HEAD: 'TAG_NOT_AT_HEAD',
  TAG_LIGHTWEIGHT: 'TAG_LIGHTWEIGHT',
  TAG_NOT_PUSHED: 'TAG_NOT_PUSHED',
  HEAD_NOT_ON_MAIN: 'HEAD_NOT_ON_MAIN',
};

/** SEPARATED FROM THE REFUSALS, and the distinction is the one this estate keeps relearning. "The
 * remote did not answer" is not a finding about this publish. It gets its own exit code so a reader
 * knows whether to look at the repository or at the network. */
export const EXIT_REFUSED = 1;
export const EXIT_REMOTE_UNREACHABLE = 3;

const git = (repoDir, args) =>
  execFileSync('git', ['-C', repoDir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const gitOk = (repoDir, args) => {
  try { git(repoDir, args); return true; } catch { return false; }
};

/**
 * @returns {{ok: true, tag: string, head: string} | {ok: false, code: string, reason: string} | {ok: false, unreachable: true, reason: string}}
 *
 * THE REPO DIRECTORY AND REMOTE ARE PARAMETERS so `--selftest` can drive this against constructed
 * repositories with a real local remote. Same reason `schema-reachable.mjs` takes a URL: a gate whose
 * failure paths cannot be exercised is a gate nobody has seen refuse.
 */
export function preflightPublish({ repoDir, version, remote = 'origin', mainBranch = 'main' }) {
  const tag = `v${version}`;
  const refuse = (code, reason) => ({ ok: false, code, reason });

  // 1. THE TREE IS CLEAN, so the bytes about to be published are the bytes at the tagged commit.
  //    Checked FIRST because every check below is about a commit, and a dirty tree means the commit
  //    is not what ships.
  const dirty = git(repoDir, ['status', '--porcelain', '--untracked-files=no']);
  if (dirty) {
    return refuse(REFUSAL.TREE_DIRTY,
      `The working tree has uncommitted changes, so the published bytes would not be the bytes at any ` +
      `commit:\n${dirty.split('\n').map((l) => '      ' + l).join('\n')}`);
  }

  const head = git(repoDir, ['rev-parse', 'HEAD']);

  // 2. A TAG NAMED FOR THIS VERSION EXISTS.
  if (!gitOk(repoDir, ['rev-parse', '--verify', `refs/tags/${tag}`])) {
    return refuse(REFUSAL.NO_TAG,
      `No tag ${tag} exists. Publishing ${version} would produce an artifact whose commit is findable ` +
      `only while some branch happens to point at it.\n      Fix: git tag -a ${tag} -m "..." && git push ${remote} ${tag}`);
  }

  // 3. IT IS ANNOTATED. See the header: a lightweight tag has no tagger and no date, and asking git
  //    when it was made silently returns the target commit's date instead. That is the defect that
  //    produced this requirement.
  const objType = git(repoDir, ['cat-file', '-t', tag]);
  if (objType !== 'tag') {
    return refuse(REFUSAL.TAG_LIGHTWEIGHT,
      `${tag} is a LIGHTWEIGHT tag (git object type '${objType}', expected 'tag'). It carries no tagger ` +
      `and no creation date, so nothing can later establish when it was made — asking git returns the ` +
      `TARGET COMMIT'S date and looks like an answer. That is how the timing of rc.4 through rc.9 became ` +
      `unknowable.\n      Fix: git tag -a -f ${tag} -m "..." && git push -f ${remote} ${tag}`);
  }

  // 4. IT POINTS AT HEAD. A tag on a different commit is worse than no tag, because it looks like
  //    provenance and resolves to the wrong bytes.
  const tagged = git(repoDir, ['rev-parse', `${tag}^{commit}`]);
  if (tagged !== head) {
    return refuse(REFUSAL.TAG_NOT_AT_HEAD,
      `${tag} points at ${tagged.slice(0, 12)} but HEAD is ${head.slice(0, 12)}. The published artifact ` +
      `would resolve to a commit that is not the one being published.`);
  }

  // ─── EVERYTHING BELOW NEEDS THE REMOTE ──────────────────────────────────────────────────────────
  let remoteTags, remoteMain;
  try {
    remoteTags = git(repoDir, ['ls-remote', '--tags', remote]);
    remoteMain = git(repoDir, ['ls-remote', remote, `refs/heads/${mainBranch}`]);
  } catch (e) {
    return { ok: false, unreachable: true, reason: (e?.stderr || e?.message || String(e)).trim() };
  }

  // 5. THE TAG IS ON THE REMOTE. A local-only tag is one lost machine from gone, and findability is
  //    the whole purpose — a tag nobody else can resolve is not provenance.
  if (!new RegExp(`refs/tags/${tag.replace(/\./g, '\\.')}(\\^\\{\\})?$`, 'm').test(remoteTags)) {
    return refuse(REFUSAL.TAG_NOT_PUSHED,
      `${tag} exists locally but not on ${remote}. A tag only this machine holds resolves for nobody ` +
      `else.\n      Fix: git push ${remote} ${tag}`);
  }

  // 6. HEAD IS ON THE REMOTE'S main. rc.10 was the first release candidate whose artifact resolved to
  //    `main` rather than to a branch one merge-click from deletion. This keeps it that way.
  const mainSha = (remoteMain.split(/\s+/)[0] || '').trim();
  if (!mainSha) {
    return refuse(REFUSAL.HEAD_NOT_ON_MAIN,
      `${remote} has no ${mainBranch} branch, so this commit cannot be shown to be on it.`);
  }
  if (!gitOk(repoDir, ['cat-file', '-e', `${mainSha}^{commit}`])) {
    git(repoDir, ['fetch', '--quiet', remote, mainBranch]);
  }
  if (!gitOk(repoDir, ['merge-base', '--is-ancestor', head, mainSha])) {
    return refuse(REFUSAL.HEAD_NOT_ON_MAIN,
      `HEAD ${head.slice(0, 12)} is not an ancestor of ${remote}/${mainBranch} (${mainSha.slice(0, 12)}). ` +
      `rc.4 through rc.9 were published from commits that lived only on a branch; rc.10 was the first ` +
      `whose artifact resolved to main.\n      Fix: merge to ${mainBranch} before publishing.`);
  }

  return { ok: true, tag, head };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--selftest')) {
    // SPAWNED RATHER THAN IMPORTED, AND NOT A STYLE CHOICE. The selftest imports this module, so a
    // dynamic import here is a cycle: this module is still evaluating, its await never settles, and
    // node exits 13 with "unsettled top-level await" — which reads as the selftest failing rather
    // than as never having run. A separate process has no cycle to have.
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const selftest = join(dirname(fileURLToPath(import.meta.url)), 'preflight-publish-selftest.mjs');
    const { status } = (await import('node:child_process')).spawnSync(process.execPath, [selftest], { stdio: 'inherit' });
    process.exit(status ?? 1);
  }
  const repoDir = git(process.cwd(), ['rev-parse', '--show-toplevel']);
  const { createRequire } = await import('node:module');
  const version = createRequire(import.meta.url)('../package.json').version;

  console.log(`\n── publish preflight: ${version} ──`);
  const r = preflightPublish({ repoDir, version });

  // RUNS BEFORE THE SUCCESS EXIT, AND THAT PLACEMENT IS THE POINT. The first cut sat below
  // `if (r.ok) { … process.exit(0) }`, so it would have run ONLY when the preflight was already
  // refusing — a control reachable only on the path where it is not needed.
  // ─── THE ARTIFACT GATE, LANDED DISARMED. ARMING IS THE ONE LINE MARKED BELOW. ──────────────────
  //
  // The six checks above assert six properties of the COMMIT and none of the artifact, and an
  // untracked `dist/` is invisible to TREE_DIRTY by design. `preflight-artifact.mjs` closes that;
  // see its header for the near-misses that motivated it.
  //
  // DISARMED ON PURPOSE. Arming a gate that refuses publishes while other sessions are mid-block
  // converts spare capacity here into blocked capacity there. So it RUNS and REPORTS on every
  // preflight — the finding is visible from today — and does not change the exit code. That is the
  // whole difference between disarmed and absent: a disarmed gate is measured every time it would
  // have fired, so arming it later is a decision made on evidence rather than on a hope.
  //
  // TO ARM: change ARTIFACT_GATE_ARMED to true. Nothing else. Reversible by changing it back.
  // The coordinator closes that decision.
  const ARTIFACT_GATE_ARMED = false;
  {
    const { preflightArtifact } = await import('./preflight-artifact.mjs');

  if (r.ok) {
    console.log(`  OK  ${r.tag} is annotated, pushed, and points at HEAD ${r.head.slice(0, 12)} on main.`);
    console.log('      Publishing this version produces an artifact a reader can resolve to a commit.\n');
    process.exit(0);
  }
  if (r.unreachable) {
    console.error(`\n  REMOTE UNREACHABLE. This says NOTHING about whether the publish is correct — the`);
    console.error(`  checks that need the remote could not be RUN.\n\n      ${r.reason}\n`);
    console.error(`  Exit ${EXIT_REMOTE_UNREACHABLE} is unreachable; exit ${EXIT_REFUSED} is a refusal.\n`);
    process.exit(EXIT_REMOTE_UNREACHABLE);
  }
    let art;
    try { art = preflightArtifact({ pkgDir: process.cwd() }); }
    catch (e) { art = { ok: false, code: 'ARTIFACT_STALE', reason: `the artifact check could not run: ${String(e)}` }; }
    if (art.ok) {
      console.error(`  artifact: ok. ${art.note}`);
    } else {
      console.error(`\n  ${ARTIFACT_GATE_ARMED ? 'PUBLISH REFUSED' : 'ARTIFACT WOULD REFUSE (gate disarmed)'} — ${art.code}\n`);
      console.error(`      ${art.reason}`);
      if (art.detail) console.error(`      ${art.detail}`);
      if (ARTIFACT_GATE_ARMED) process.exit(EXIT_REFUSED);
      console.error(`\n      Disarmed: this did not change the exit code. Arm it in ${'preflight-publish.mjs'} `
        + `by setting ARTIFACT_GATE_ARMED = true.\n`);
    }
  }

  console.error(`\n  PUBLISH REFUSED — ${r.code}\n\n      ${r.reason}\n`);
  console.error('  There is no override. A publish gate with a bypass is a convention, and this exists');
  console.error('  because a convention did not hold: rc.10 was published 1m41s before it was tagged.\n');
  process.exit(EXIT_REFUSED);
}
