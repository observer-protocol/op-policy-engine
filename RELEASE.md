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

## Behaviour changes currently riding the next fanout

Named individually rather than summarised, because a shared banner is how a behaviour change
stops being noticed. **Four entries, and they are different in kind.** Each needs its own line
in each of the five packages' notes.

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

**3. `[unenforceable]` denial tag**, distinct from `[unknown-rule]`. A consumer parsing reason
strings sees a new tag for a constraint the engine declares it cannot enforce, where it
previously saw the generic unknown-rule text.

**4. Monthly window accounting.** A 30-day counter alongside the rolling 24-hour one, with the
prune horizon extended to match. A shorter prune would have silently under-counted the longer
window, which is the direction that permits more spending.

## Security releases

Build and **hold** the five rather than publishing as you go. A partially-published fleet is a
window where the fix is public and most consumers are still vulnerable, which is worse than
either end state.

Where a counterparty is being disclosed to, the hold also buys them a window at no cost:
nothing is protected by publishing early, because nothing published resolves the engine at
install.
