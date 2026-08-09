// EACH OF THE SIX REFUSALS, AGAINST A REPOSITORY BUILT TO VIOLATE EXACTLY THAT ONE.
//
// ─── WHY THIS IS NOT A LIST OF SIX ASSERTIONS THAT IT REFUSED ────────────────────────────────────
//
// **A gate that refuses everything satisfies all six refusal tests.** So the first case here is the
// PASSING one: a correctly tagged, pushed, on-main publish that the gate must ACCEPT. Without it the
// other six are consistent with a function that returns `{ok:false}` unconditionally.
//
// **AND EACH VIOLATION IS CONSTRUCTED, NOT SIMULATED.** Real `git init`, real commits, a real bare
// repository as `origin`, real `git push`. No mock, no injected failure, no monkeypatched exec. A test
// that stubs the condition it is testing for asserts that the stub works — which is the difference
// between this and a guard whose self-tests ran against the checked-out tree and could only ever
// describe it.
//
// Each case starts from a repository that WOULD PASS and breaks exactly one property, so a refusal is
// attributable to that property rather than to the scaffolding.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preflightPublish, REFUSAL } from './preflight-publish.mjs';

const VERSION = '9.9.9-test';
const TAG = `v${VERSION}`;

const run = (dir, args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** A repository that PASSES every check: clean, annotated tag at HEAD, pushed, HEAD on origin/main. */
function buildPassing(root) {
  const origin = join(root, 'origin.git');
  const work = join(root, 'work');
  mkdirSync(origin, { recursive: true });
  mkdirSync(work, { recursive: true });
  execFileSync('git', ['init', '--bare', '--initial-branch=main', origin], { stdio: 'ignore' });
  execFileSync('git', ['init', '--initial-branch=main', work], { stdio: 'ignore' });
  run(work, ['config', 'user.email', 'selftest@op-fixtures.invalid']);
  run(work, ['config', 'user.name', 'preflight selftest']);
  run(work, ['remote', 'add', 'origin', origin]);
  writeFileSync(join(work, 'a.txt'), 'one\n');
  run(work, ['add', 'a.txt']);
  run(work, ['commit', '-m', 'first']);
  run(work, ['push', '-q', 'origin', 'main']);
  run(work, ['tag', '-a', TAG, '-m', 'annotated']);
  run(work, ['push', '-q', 'origin', TAG]);
  return { work, origin };
}

export async function runSelftest() {
  const root = mkdtempSync(join(tmpdir(), 'op-preflight-selftest-'));
  let pass = 0, fail = 0;
  const failures = [];
  const a = (name, ok, detail = '') => {
    if (ok) { pass++; console.log(`  PASS  ${name}`); }
    else { fail++; failures.push(name); console.log(`  FAIL  ${name}  <<< ${detail}`); }
  };
  const check = (work) => preflightPublish({ repoDir: work, version: VERSION });

  try {
    console.log('\n── FIRST: THE GATE ACCEPTS A CORRECT PUBLISH ──');
    console.log('   Without this, all six refusals below are satisfied by a gate that refuses everything.');
    {
      const { work } = buildPassing(join(root, 'ok'));
      const r = check(work);
      a('a clean, annotated, pushed, on-main publish is ACCEPTED', r.ok === true,
        JSON.stringify(r).slice(0, 200));
      a('...and it names the tag it accepted', r.ok && r.tag === TAG, String(r.tag));
    }

    console.log('\n── 1. TREE_DIRTY ──');
    {
      const { work } = buildPassing(join(root, 'dirty'));
      writeFileSync(join(work, 'a.txt'), 'modified after the commit\n');
      const r = check(work);
      a('an uncommitted change refuses', r.ok === false && r.code === REFUSAL.TREE_DIRTY, JSON.stringify(r).slice(0, 160));
      a('...and the reason names the file', /a\.txt/.test(r.reason ?? ''), r.reason);
    }

    console.log('\n── 2. NO_TAG ──');
    {
      const { work } = buildPassing(join(root, 'notag'));
      run(work, ['tag', '-d', TAG]);
      const r = check(work);
      a('a missing tag refuses', r.ok === false && r.code === REFUSAL.NO_TAG, JSON.stringify(r).slice(0, 160));
      a('...and the reason tells you the command that fixes it', /git tag -a/.test(r.reason ?? ''), r.reason);
    }

    console.log('\n── 3. TAG_LIGHTWEIGHT — the requirement the near-miss produced ──');
    {
      const { work } = buildPassing(join(root, 'light'));
      run(work, ['tag', '-d', TAG]);
      run(work, ['tag', TAG]); // lightweight: no -a, no tag object
      const r = check(work);
      a('a lightweight tag refuses even though it points at HEAD', r.ok === false && r.code === REFUSAL.TAG_LIGHTWEIGHT,
        JSON.stringify(r).slice(0, 160));

      // THE PROPERTY THE REFUSAL EXISTS FOR, ASSERTED DIRECTLY: git answers the "when was it tagged"
      // question with the COMMIT's date and gives no sign that it did.
      const commitDate = run(work, ['log', '-1', '--format=%cI']);
      const creatordate = run(work, ['for-each-ref', '--format=%(creatordate:iso-strict)', `refs/tags/${TAG}`]);
      const taggerdate = run(work, ['for-each-ref', '--format=%(taggerdate:iso-strict)', `refs/tags/${TAG}`]);
      a('...and this is why: taggerdate on a lightweight tag is EMPTY', taggerdate === '', JSON.stringify(taggerdate));
      a('...while creatordate silently returns the COMMIT date, which looks like an answer',
        creatordate === commitDate, `creatordate=${creatordate} commit=${commitDate}`);
    }

    console.log('\n── 4. TAG_NOT_AT_HEAD ──');
    {
      const { work } = buildPassing(join(root, 'moved'));
      writeFileSync(join(work, 'b.txt'), 'two\n');
      run(work, ['add', 'b.txt']);
      run(work, ['commit', '-m', 'second']);
      run(work, ['push', '-q', 'origin', 'main']);
      const r = check(work);
      a('a tag on an older commit refuses', r.ok === false && r.code === REFUSAL.TAG_NOT_AT_HEAD, JSON.stringify(r).slice(0, 160));
    }

    console.log('\n── 5. TAG_NOT_PUSHED ──');
    {
      const { work, origin } = buildPassing(join(root, 'unpushed'));
      execFileSync('git', ['-C', origin, 'update-ref', '-d', `refs/tags/${TAG}`], { stdio: 'ignore' });
      const r = check(work);
      a('a tag that exists only locally refuses', r.ok === false && r.code === REFUSAL.TAG_NOT_PUSHED, JSON.stringify(r).slice(0, 160));
    }

    console.log('\n── 6. HEAD_NOT_ON_MAIN ──');
    {
      const { work } = buildPassing(join(root, 'offmain'));
      run(work, ['checkout', '-q', '-b', 'side']);
      writeFileSync(join(work, 'c.txt'), 'three\n');
      run(work, ['add', 'c.txt']);
      run(work, ['commit', '-m', 'on a branch only']);
      run(work, ['tag', '-d', TAG]);
      run(work, ['tag', '-a', TAG, '-m', 'annotated on the branch']);
      // FORCE, because `buildPassing` already pushed this tag at the main commit. The point of this
      // case is a tag that is annotated AND pushed AND at HEAD, failing only on where HEAD sits — so
      // the remote tag has to move with it, or the case would fail on TAG_NOT_PUSHED instead and
      // "refused" would be attributable to the wrong property.
      run(work, ['push', '-q', '--force', 'origin', TAG]);
      const r = check(work);
      a('a commit that is not on origin/main refuses', r.ok === false && r.code === REFUSAL.HEAD_NOT_ON_MAIN,
        JSON.stringify(r).slice(0, 160));
      a('...which is the shape rc.4 through rc.9 shipped in', /only on a branch/.test(r.reason ?? ''), r.reason);
    }

    console.log('\n── AND THE SIX CODES ARE DISTINCT, or branching on them means nothing ──');
    {
      const codes = Object.values(REFUSAL);
      a('six refusal codes, all distinct', new Set(codes).size === 6 && codes.length === 6, codes.join(','));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  console.log(`\npreflight-publish selftest: ${pass} passed, ${fail} failed`);
  if (fail) { console.log('\nFAILURES:'); for (const f of failures) console.log(`  - ${f}`); return 1; }
  return 0;
}

// ─── CLI, so this is a process rather than an import ─────────────────────────────────────────────
//
// `preflight-publish.mjs --selftest` SPAWNS this file instead of importing it. Importing would be a
// cycle — this module imports that one — and the symptom is node exiting 13 on an unsettled top-level
// await, which reads like a failing selftest rather than one that never ran.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(await runSelftest());
}
