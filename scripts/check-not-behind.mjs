#!/usr/bin/env node
/**
 * IS THIS WORKING TREE BEHIND WHAT IT TRACKS?
 *
 * ─── WHY THIS EXISTS, AND WHY THE EXISTING CHECK DID NOT CATCH IT ───────────────────────────────
 *
 * On 2026-08-23 a second worktree sat on `main` at a8f8f6f while origin/main was at 8938918: two
 * commits behind, nothing ahead, and NO VISIBLE SYMPTOM. A session branching from it would have
 * worked from a stale base with nothing to tell it so.
 *
 * `packages/policy-engine/scripts/preflight-publish.mjs` check 6 already fetches and compares. It
 * asserts HEAD is an ancestor of origin/main, which is the right question for publishing and the
 * WRONG DIRECTION for this: a8f8f6f IS an ancestor of 8938918, so CHECK 6 PASSES ON EXACTLY THE
 * CONDITION THIS CATCHES. It is satisfied by being behind. Check 6 is not modified, because it
 * answers its own question correctly and one check asserting two things is worse than two checks.
 *
 * It also runs at publish time and is scoped to one package. Every change of the last two days is in
 * policy-library/, which check 6 does not reach.
 *
 * ─── THE ASSERTION ──────────────────────────────────────────────────────────────────────────────
 *
 *   git fetch --quiet <remote> <branch>
 *   git rev-list --count HEAD..<upstream>   MUST BE 0
 *
 * ─── WHAT IT CANNOT REACH ───────────────────────────────────────────────────────────────────────
 *
 * Recorded here as well as in the log, because this is where someone will read it:
 *
 *   A WORKTREE SIMPLY SITTING THERE. This runs at checkout and at commit. A session that does
 *     neither is never asked, and that is the state the stale worktree is in right now.
 *   ANOTHER SESSION'S UNCOMMITTED WORK. Nothing in git reports that a sibling worktree is dirty.
 *   FILES TRACKED BY NO BRANCH. There is no ref to be behind, so staleness is not the predicate.
 *   TWO SESSIONS EDITING ONE FILE IN SEPARATE TREES. Nothing surfaces until a commit that may never
 *     conflict.
 *   WHETHER BEING BEHIND MATTERS. This can say `two commits behind`. It cannot say `the other
 *     session is mid-flight on this file, wait`. That half is a coordination rule, not a check.
 */
import { execFileSync } from 'node:child_process';

const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', ...opts }).trim();
const gitOk = (args) => { try { git(args, { stdio: 'pipe' }); return true; } catch { return false; } };

const RED = process.stdout.isTTY ? '\x1b[31m' : '';
const OFF = process.stdout.isTTY ? '\x1b[0m' : '';

let branch;
try { branch = git(['rev-parse', '--abbrev-ref', 'HEAD']); } catch { process.exit(0); }
if (branch === 'HEAD') {
  console.log('not-behind: detached HEAD, nothing tracked to be behind. SKIPPED, and stated rather than silent.');
  process.exit(0);
}
if (!gitOk(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])) {
  console.log(`not-behind: ${branch} tracks nothing, so there is no upstream to be behind. SKIPPED, and stated rather than silent.`);
  process.exit(0);
}
const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
const [remote, ...rest] = upstream.split('/');
const remoteBranch = rest.join('/');

try { git(['fetch', '--quiet', remote, remoteBranch], { stdio: 'pipe' }); }
catch {
  console.log(`not-behind: could not fetch ${remote} ${remoteBranch}. NOT A PASS: the question was not answered.`);
  process.exit(0);
}

const behind = Number(git(['rev-list', '--count', `HEAD..${upstream}`]));
const ahead = Number(git(['rev-list', '--count', `${upstream}..HEAD`]));
if (behind === 0) {
  console.log(`not-behind: ${branch} is level with ${upstream}${ahead ? ` (${ahead} ahead)` : ''}.`);
  process.exit(0);
}

const commits = git(['log', '--oneline', `HEAD..${upstream}`]).split('\n').filter(Boolean);
console.error(`
${RED}${'─'.repeat(78)}
${branch} IS ${behind} COMMIT${behind === 1 ? '' : 'S'} BEHIND ${upstream}.${OFF}

  HEAD      ${git(['rev-parse', '--short', 'HEAD'])}  ${git(['log', '-1', '--format=%s'])}
  ${upstream.padEnd(9)} ${git(['rev-parse', '--short', upstream])}  ${git(['log', '-1', '--format=%s', upstream])}
  ${ahead} ahead, ${behind} behind.

  the ${behind} you do not have:
${commits.map((c) => `      ${c}`).join('\n')}

  BRANCHING FROM HERE BRANCHES FROM A STALE BASE, and nothing else will say so. Being behind is
  invisible: it produces no output of its own, which is why it needs a check rather than a reader.

  Fix: git pull --ff-only ${remote} ${remoteBranch}
${RED}${'─'.repeat(78)}${OFF}
`);
process.exit(1);
