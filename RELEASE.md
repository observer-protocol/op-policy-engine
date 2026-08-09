# Releasing `@observer-protocol/policy-engine`

## Read this first: publishing the core is step one of six, not the job

**Every published Observer Protocol package bundles this engine into its own `dist` at build
time.** Each adapter builds with `esbuild --bundle` and does not mark
`@observer-protocol/policy-engine` external, so the shipped artifact carries a frozen copy of
whatever core was resolved when it was built. The `dependencies` entry is build-time ceremony;
it does not describe what the consumer runs.

**So no published package receives a core fix through a version bump.** Publishing this package
changes nothing for anyone until each consumer is rebuilt and republished.

This was discovered on 2026-07-28 while preparing a security disclosure. The dependency graph
was read as if it described runtime, and it does not. Had the disclosure gone out on that
reading, it would have told a counterparty to take a package that would have left them exactly
as exposed, while believing they were covered. That is why this file exists.

## 1.0.0-rc.10 IS PREPARED AND **NOT PUBLISHED**. npm's `latest` IS STILL rc.9.

**Nothing below has shipped.** `package.json` says `1.0.0-rc.10` because the version travels with the
change in this repository, not because anything was pushed to npm. Until it is published, a
counterparty installing `@observer-protocol/policy-engine` gets **rc.9 and the stale vocabulary this
release exists to fix**.

**What it changes: `ApproverKeyAssurance` gains `org-attested`, and nothing else at runtime.** Measured
by diffing the built bundle before and after: the entire delta is two new declarations
(`APPROVER_KEY_ASSURANCE`, `APPROVER_KEY_ASSURANCE_SCHEMA_VERSION`) and their two export names. **No
existing code path changed**, which is the answer to "does this change what any existing record
validates as": it cannot. Nothing in `src/` branches on these values and `validateStructure` never
reads `approvers` at all.

**Why.** `approvers.keys.assurance` entered `delegation` at v2.5 as `operator-held | device-bound` and
**gained `org-attested` at v2.6**. This package carried v2.5's two values through rc.9, so **a
counterparty validating with the published type would reject an `org-attested` approver key the current
schema permits** — the exact failure the export exists to prevent. A type exported so a counterparty has
the vocabulary must match the vocabulary the schema publishes.

**Two things came with it, and they are the reason this does not recur.**

1. **The type declares which schema version it mirrors.** `APPROVER_KEY_ASSURANCE_SCHEMA_VERSION` is
   `'v2.7'`, exported. A vocabulary type with no version is a claim about a moving target.
2. **`test/approver-assurance-vocabulary.mjs` compares the published union against the served schema
   and fails on divergence in either direction** — too narrow (rejecting a permitted value) and too
   wide (claiming a value no issuer can sign). It builds the URL FROM the declared version, so the two
   cannot drift apart, it fails rather than skips when the origin is unreachable, and it asserts that
   **the real rc.9 union would have failed it**.

The vocabulary is now exported as VALUES as well as a type, and the type is derived from the array
(`typeof APPROVER_KEY_ASSURANCE[number]`), so there is one representation rather than a union and a
list that can disagree.

**To publish:** `npm test` (17 suites, needs a network for the two schema checks), then publish, then
**re-read the six-step warning at the top of this file** — no consumer receives this through a version
bump.

## 1.0.0-rc.9 CORRECTS TWO EXPORTS THAT rc.8 SHIPPED WRONGLY

**If you took rc.8 in the hour it was current, read this.** rc.8 was published 2026-08-09 and rc.9
followed within the hour. Nothing about the BYTES changed — `refusalPayload` produces identical output
in both, verified against 14 real records — but rc.8 exported two names it should not have.

**`ApprovalAssurance` (rc.8) is `ApproverKeyAssurance` (rc.9).** The rc.8 name collided with an existing
`ApprovalAssurance` in `op-mcp-payment-server` that means something else entirely. This one is about
**how an approver key named in a credential is held** (from `actionScope.approvers[].keys[].assurance`).
That one is about **what a resolution's signature establishes about who approved**. Two different ideas
wearing one name. Merging them would have made the resemblance permanent in a package counterparties
import.

> **CORRECTED 2026-08-08, and the correction matters because it is the argument people will reach
> for.** The paragraph above said the two unions overlapped "on a single member by coincidence of
> vocabulary", gave this one as `operator-held | device-bound` and the payment server's as
> `org-attested | operator-held`.
>
> **The payment server's has four members** — `org-attested | operator-held | approver-held |
> device-bound`, measured at `src/approvals.ts:287` — so rc.9's union was a **strict subset** of it,
> overlapping on two of two rather than one. **rc.10 adds `org-attested` and the overlap becomes
> three.** RULED 2026-08-08: they stay two types. The overlap was never the argument. They answer
> different questions, and a type published so a counterparty has the vocabulary must track the
> schema rather than its neighbour's type.

**`resolutionPayload` and `ResolutionActor` are WITHDRAWN in rc.9.** They were exported in rc.8 because
they sat next to `refusalPayload`, and adjacency is not a reason. A resolution actor is a payment-server
concept, and it dragged the colliding type above. `resolutionPayload` remains in `op-mcp-payment-server`.

`refusalPayload`, `signableFromRefusal`, `lapsePayload`, `stripUndefinedDeep` and the record types are
unchanged between rc.8 and rc.9. **`lapsePayload` was checked rather than assumed** to carry no
payment-server concepts: `SignableLapse` is `{ handleId, at, expiresAt }`, all strings, and it
deliberately has no actor.

**What caught it, because it is worth knowing.** TypeScript, at the seam, the moment
`op-mcp-payment-server` tried to use both types. The engine's suite was green and the payment server's
was green: **a name collision between two repositories is invisible to either repository's tests.**

## WHERE THE PUBLISHED RELEASE CANDIDATES ACTUALLY LIVE

**Stated because it is a fact about our own provenance, and it should be discoverable by anyone who
looks rather than something they discover.** Two repositories are in this posture; documenting only one
is worse than documenting neither, because an auditor who finds a note in `aip` and none here concludes
there is nothing here to find.

**`main` does not carry the commits that produced `1.0.0-rc.4` through `1.0.0-rc.7`.** They are on
branch `feat/vocabulary-membership-rule`, pushed 2026-08-08:

| npm version | commit |
|---|---|
| `1.0.0-rc.4` | `cf74450` |
| `1.0.0-rc.5` | `42249f4` |
| `1.0.0-rc.6` | `4763df0` |
| `1.0.0-rc.7` | `d11c5f9d787c8724acfa519c88cfd7128cffb305` (branch head) |

Anyone verifying what a published package contains should cite the **commit**, not the branch: a branch
ref moves, and provenance that can change after the package is immutable on npm is not provenance.

**WHY THE MERGE WAS DEFERRED, so it does not read as an oversight.** `origin/main` has DIVERGED rather
than fallen behind: it carries `b958115` (*"Refuse an outcome outside the vocabulary it cites, and carry
the set so membership is checkable"*), which this branch does not. There is no fast-forward. Force was
refused outright — it would delete published work from public history.

**WHAT CLOSES IT.** Someone with the context merges `feat/vocabulary-membership-rule` into `main`,
reconciling it against `b958115`. No published artifact changes and no hash changes; only where the
source lives. Until then the commits above are the citable originals and they are real public objects.

The same deferral exists in `observer-protocol/aip` for `schemas/delegation/v2.7.json`, recorded in that
repo's `SCHEMA_POLICY.md`.

## The fanout list

A core change with **security or behaviour consequence** requires all five to be rebuilt and
republished before it reaches anyone:

| package | repo directory |
|---|---|
| `@observer-protocol/x402-op-authorize` | `x402-op-authorize` |
| `@observer-protocol/l402-op-authorize` | `l402-op-authorize` |
| `@observer-protocol/wdk-op-policy` | `wdk-op-policy` |
| `@observer-protocol/mppx-op-account` | `mppx-op-policy` (directory name differs from the package name) |
| `@observer-protocol/ows-op-verify` | `ows-op-policy` (same) |

`@observer-protocol/ap2-op-authorize` and `@observer-protocol/op-verify-service` resolve the
engine at install rather than bundling it, so they would receive a fix through a range bump.
**Both are currently unpublished**, so the resolve-at-install path protects nobody today.
Re-check that rather than assuming it if either is ever published.

Also outside the fanout, and not on npm: `op-lnd-interceptor` consumes the engine transitively
through `l402-op-authorize` and is deployed by hand on a node. A fanout release does not reach
it. Redeploy it deliberately.

## Declared dependency range

Consumers declare `">=<this minor> <1.0.0"` rather than a caret.

A caret on a `0.x` version pins the minor: `^0.3.3` means `>=0.3.3 <0.4.0` and silently
**excludes** `0.4.0`. Every core minor would otherwise need a mechanical widen in five
repositories, and the widen is the step most likely to be forgotten, because nothing fails
loudly when it is missed: the build simply freezes an older core.

The range is safe to widen because it is build-time only, and reproducibility comes from the
committed `package-lock.json` in each consumer, not from the range. The floor still matters:
`assertLedgerCoreSafe` has a `LEDGER_SAFE_FLOOR`, and a build that resolved a pre-floor core
would ship a bundle that warns or refuses at init.

## Checklist

1. Land the change here, with tests, and bump this package's version.
2. Decide whether it has security or behaviour consequence. If yes, the fanout applies.
3. Publish this package.
4. For each of the five: widen the range if the floor moved, `npm install` to update the
   lockfile, rebuild, run the package's own test suite, bump its version.
5. **Release notes per package, one entry per change.** A behaviour change riding into five
   packages under a security banner is how behaviour changes stop being noticed. Describe each
   in its own terms, including what a consumer parsing reason strings would see differently.
6. Publish the five. Only now has the change reached anyone.

## Behaviour changes riding 0.4.0

Named individually rather than summarised, because a shared banner is how a behaviour change
stops being noticed. **Five entries, and they are different in kind.** Each needs its own line
in each of the five packages' notes, describing what a consumer would OBSERVE differently
rather than what we changed internally.

**0. SSRF guard on outbound dereference.** Origin pin, operator allowlist defaulting to empty,
and the loopback-http downgrade removed. **The DNS-rebinding residual is stated in the module
header and the CHANGELOG in the words already written, and a release note must not soften it.**
A guard described as complete when a residual is known is worse than no guard, because it
stops anyone looking.

**1. Ledger contention detection no longer depends on the age of the other writer's spend.
FIXES A FAIL-OPEN.**

The single-writer guard ran *after* the 24-hour window and record-state filters, so a
concurrent writer whose most recent spend fell outside the window was skipped before the check
ever saw it. Two processes on one ledger were detected only if the other one had written
recently; a quiet second writer was invisible.

That is a fail-open in the control whose entire job is failing closed. **This is the entry a
consumer needs to read**, because it changes *what the guard detects*, not how it decides. A
deployment that has been running two writers on one path and seeing no contention error has not
been safe; it has been unobserved.

**2. Writer identity is decided by file offset, not by comparing timestamps. REMOVES A HAZARD
CLASS.**

`e.ts >= PROCESS_START_MS` became a byte-offset boundary. `Date.now()` is wall-clock and not
monotonic, so an NTP step, a VM suspend/resume, a live migration or a corrected host clock could
place a predecessor's records in a restarted process's future, and every one of its own prior
records would read as a concurrent writer: **a service that restarts and then denies every
payment.** No consumer action; the honest cases, including restart and cold-start, behave as
before.

**3. `allowed_counterparty_types` denies with `[unenforceable]`** rather than through the
unknown-rule catch-all. Same verdict, legible cause: the issuer is told the property is
declared-but-unenforceable and why, instead of being told the engine has never heard of a
field its own schema accepts.

**4. `monthlyVolumeCap` enforces a real 30-day window** rather than comparing against today's
counter, with the prune horizon extended to match. A cap named for a month that measured a day
permitted roughly thirty times what it declared. A shorter prune would have silently
under-counted the longer window, which is the same direction.

## Security releases

Build and **hold** the five rather than publishing as you go. A partially-published fleet is a
window where the fix is public and most consumers are still vulnerable, which is worse than
either end state.

Where a counterparty is being disclosed to, the hold also buys them a window at no cost:
nothing is protected by publishing early, because nothing published resolves the engine at
install.
