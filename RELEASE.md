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

## Security releases

Build and **hold** the five rather than publishing as you go. A partially-published fleet is a
window where the fix is public and most consumers are still vulnerable, which is worse than
either end state.

Where a counterparty is being disclosed to, the hold also buys them a window at no cost:
nothing is protected by publishing early, because nothing published resolves the engine at
install.
