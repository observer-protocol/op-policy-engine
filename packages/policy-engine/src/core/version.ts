// Core version stamp + ledger-safety self-check.
//
// CORE_VERSION is injected from THIS package's own package.json at build time
// (esbuild --define, see the "build" script). It is DERIVED, never hand-set: a
// stale build that bundles old core bytes also bundles the old stamp, so the two
// cannot drift. Crucially, when an adapter esbuild-bundles this core, the stamp
// travels INSIDE the bundle with the code it describes — so a running adapter can
// report the core version it ACTUALLY enforces with (the bundled copy), not the
// version npm resolved into node_modules. Under dual-presence those two differ,
// and the resolved one is the misleading one (it upgrades on install while the
// bundled runtime stays frozen). This stamp reports the copy that runs.
//
// Honest ceiling (do not oversell): this reaches builds shipped WITH it. A build
// already distributed WITHOUT it has neither the stamp nor this check — nothing
// added now runs inside frozen bytes. See the who-installed question for the only
// lever on those.
declare const __OP_CORE_VERSION__: string | undefined;

export const CORE_VERSION: string =
  typeof __OP_CORE_VERSION__ === 'string' && __OP_CORE_VERSION__.length > 0
    ? __OP_CORE_VERSION__
    : '0.0.0-unstamped';

/** First core version that fully closed the cross-rail ledger fail-open: the
 * single-writer fail-closed guard with host:pid identity. Below this the ledger
 * either races silently and under-counts (<0.3.1) or false-contends when the
 * core is bundled into multiple co-located adapters (0.3.1). */
export const LEDGER_SAFE_FLOOR = '0.3.2';

function parse(v: string): [number, number, number] {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
}

/** -1 | 0 | 1 for a<b | a==b | a>b at major.minor.patch. */
export function compareCoreVersion(a: string, b: string): number {
  const [a0, a1, a2] = parse(a);
  const [b0, b1, b2] = parse(b);
  if (a0 !== b0) return a0 < b0 ? -1 : 1;
  if (a1 !== b1) return a1 < b1 ? -1 : 1;
  if (a2 !== b2) return a2 < b2 ? -1 : 1;
  return 0;
}

export interface LedgerCoreStatus {
  coreVersion: string;
  floor: string;
  safe: boolean;
  /** true when the stamp is absent (a build produced without the --define) —
   * treated as UNSAFE: an unstamped build cannot prove its core is fixed. */
  unstamped: boolean;
}

/** Report whether the BUNDLED core is at/above the ledger-safe floor, and
 * optionally enforce it. WARNs by default; `mode:'refuse'` throws. A gate that
 * ships with a frozen core should be able to tell you the core is broken — this
 * is that signal, carried in the same bundle as the core it describes. */
export function assertLedgerCoreSafe(
  opts: { mode?: 'warn' | 'refuse'; logger?: (m: string) => void } = {},
): LedgerCoreStatus {
  const unstamped = CORE_VERSION === '0.0.0-unstamped';
  const safe = !unstamped && compareCoreVersion(CORE_VERSION, LEDGER_SAFE_FLOOR) >= 0;
  const status: LedgerCoreStatus = { coreVersion: CORE_VERSION, floor: LEDGER_SAFE_FLOOR, safe, unstamped };
  if (!safe) {
    const msg =
      `[op-policy-engine] bundled core ${CORE_VERSION} is below the ledger-safe floor ${LEDGER_SAFE_FLOOR}` +
      (unstamped ? ' (version stamp missing — built without --define)' : '') +
      `: the cross-rail ledger in this build may under-count or false-contend. ` +
      `Rebuild the adapter against @observer-protocol/policy-engine@^${LEDGER_SAFE_FLOOR}.`;
    if ((opts.mode ?? 'warn') === 'refuse') throw new Error(msg);
    (opts.logger ?? console.warn)(msg);
  }
  return status;
}
