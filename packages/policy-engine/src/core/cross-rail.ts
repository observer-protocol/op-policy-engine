import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { hostname } from 'node:os';
import { parseDecimalScaled } from './mandate.js';

// Cross-rail budget accounting (G8): one rolling-24h budget consumed across
// every rail a delegation spans, denominated in the mandate's
// crossRailBudget.currency. Two invariants govern this module:
//
//   1. No oracle. Conversion uses ONLY the principal-attested rates carried
//      inside the signed credential. An in-window spend whose asset has no
//      rate makes the total unestablishable — the caller fails closed.
//   2. Conservative rounding. Every conversion rounds UP, so the budget trips
//      early, never late (same posture as mppx's maxDeposit counting).
//
// The ledger is the shared substrate both buyer gates (l402, x402) write to
// and read from — one file, one budget, N rails. Reserve/commit/release
// lifecycle and the rolling window follow the hermes-gate SpendLedger shape.

/** Scale of all converted budget amounts: 10^6 units per 1 unit of currency. */
export const CROSS_RAIL_SCALE = 6;

const RATE_SCALE = 12;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MONTH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
// Prune must outlive the LONGEST window the ledger serves, not the shortest. It
// was 25h while the only window was 24h; a 30-day counter needs 30 days of
// history or it silently under-counts, which is the direction that permits more
// spending. One hour of slack, as before.
const PRUNE_AFTER_MS = MONTH_WINDOW_MS + 60 * 60 * 1000;
const RESERVE_TTL_MS = 5 * 60 * 1000;

// ─── Single-writer guard (fail-closed on concurrent writers) ────────────────
// The file ledger is a single-writer substrate: rewrite() (commit/release/
// prune) is read-all→temp→rename, which RACES across processes and silently
// under-counts (drops the other writer's committed spends) — the one place in
// OP a misconfiguration resolves toward MORE spending. This guard makes a
// concurrent writer fail CLOSED instead.
//
// Identity must be per OS PROCESS and STABLE across every copy of this module in
// that process — because the legitimate co-located case is N adapters sharing
// ONE ledger path in ONE process, and each adapter BUNDLES its own copy of this
// package (esbuild --bundle), so one process holds several independent module
// instances. A per-module random nonce would give each bundled copy a different
// id and make the co-located adapters read as concurrent strangers — false
// contention on the exact case we exist to serve. So the id is `hostname:pid`:
//   • same across all bundled/duplicated module instances in one process (both
//     hostname() and pid are process-global) → co-located adapters never contend;
//   • distinct across genuinely different processes (pids are unique among live
//     processes; hostname disambiguates same-pid collisions on a shared/NFS path
//     across hosts) → a real second writer is caught.
// "Is this record from before we started" is answered by the FILE'S OWN APPEND
// ORDER, not by a clock. See CLAIM_OFFSET on the class.
//
// It used to be answered by `e.ts >= PROCESS_START_MS`, with PROCESS_START_MS from
// Date.now(). That worked and had a failure nobody could have found in the field:
// Date.now() is wall-clock and not monotonic, so an NTP step, a VM suspend/resume,
// a live migration or a host clock corrected after drift can place a predecessor's
// records in a restarted process's FUTURE. Every one of its own prior records then
// reads as a concurrent writer, and the service restarts and denies every payment,
// on a self-hosted box, with a symptom pointing nowhere near its cause.
//
// A test would only have proved correct behaviour on a regression we simulated. The
// dependency is removable instead: this is an APPEND-ONLY file, so it already has a
// total order, and the guard only ever needed "before or after we opened". Byte
// offset answers that and cannot go backwards.
//
// Removing it also closes a second edge that was going to need its own assertion: a
// predecessor's final write and a successor's start landing in the same millisecond,
// where `>=` read the old record as concurrent. There is no timestamp comparison
// left for either hazard to act on.
//
// `ts` stays on the record. It orders history for humans and drives the window and
// prune cutoffs. It no longer decides identity.
//
// Known edge, unchanged: two containers with identical hostname AND identical pid
// sharing a volume are not distinguished. An unusual shared-volume topology;
// documented, not defended here.
const PROCESS_INSTANCE = `${hostname()}:${process.pid}`;

/** Thrown when a second writer is detected on the same ledger path concurrently
 * with this process. Fail-closed: callers MUST treat this as a DENY, never as a
 * zero/low counter. The single-writer contract is deliberate — for a budget
 * shared across processes/hosts, use a shared-counter service, not this file. */
export class ObserverLedgerContentionError extends Error {
  constructor(public readonly foreignWriter: string) {
    super(
      `cross-rail ledger contention: a second writer (${foreignWriter}) wrote the same ledger path ` +
        `concurrently with this process (${PROCESS_INSTANCE}). The file ledger is single-writer per path ` +
        `(rewrite races and under-counts across writers); refusing to race — fail-closed. Co-locate every ` +
        `adapter sharing a budget in ONE process against ONE path, or use a shared-counter service for multi-process.`,
    );
    this.name = 'ObserverLedgerContentionError';
  }
}

/** A record is a concurrent foreign writer iff it carries a writer id that is NOT
 * ours AND sits at or beyond the byte offset the file had when we opened it.
 *
 * Records with no `w` (legacy files) and foreign records that were already in the
 * file when we opened (prior sessions, pre-existing history) are legitimate and
 * counted normally, so the honest case including a single writer that restarted is
 * unchanged. `claimOffset` is that boundary; see CLAIM_OFFSET on the class. */
function concurrentForeign(e: { w?: unknown }, offset: number, claimOffset: number): string | null {
  return typeof e.w === 'string' && e.w !== PROCESS_INSTANCE && offset >= claimOffset ? e.w : null;
}

/** Convert a raw asset amount into budget-currency units at CROSS_RAIL_SCALE,
 * using a principal-attested decimal rate (price of 1 whole asset unit in the
 * budget currency). Rounds up. Throws on a malformed rate. */
export function convertToBudgetUnits(amountRaw: bigint, assetDecimals: number, rate: string): bigint {
  if (amountRaw < 0n) throw new Error('cross-rail conversion: negative amount');
  const rateScaled = parseDecimalScaled(rate, RATE_SCALE);
  const divisor = 10n ** BigInt(assetDecimals + RATE_SCALE - CROSS_RAIL_SCALE);
  return (amountRaw * rateScaled + divisor - 1n) / divisor;
}

/** Render a CROSS_RAIL_SCALE-scaled amount as a decimal string. */
export function formatBudgetUnits(scaled: bigint): string {
  const s = 10n ** BigInt(CROSS_RAIL_SCALE);
  const frac = (scaled % s).toString().padStart(CROSS_RAIL_SCALE, '0').replace(/0+$/, '');
  return `${scaled / s}${frac ? '.' + frac : ''}`;
}

export interface CrossRailSpend {
  rail: string; // e.g. "lightning", "x402:eip155:84532"
  asset: string; // symbol as the mandate rates key it, e.g. "sat", "USDC"
  amountRaw: string; // raw (unscaled) units of `asset`
  decimals: number;
  /** The counterparty this spend went to, AS THE MANDATE MATCHED IT rather than as
   * the rail names it, so a later per-counterparty cap can re-match it against the
   * same allowList. Optional because some rails have no counterparty to record: on
   * Lightning a payment resolves to a node pubkey that may aggregate many payees.
   *
   * ADDED BEFORE IT IS USED, deliberately, and that is not the reserved-and-unused
   * shape it resembles. This is an append-only ledger: a field added later means
   * every historical line lacks it permanently, so a per-counterparty cap would have
   * no history to evaluate against and would start from the day someone thought of
   * it. Populated from the first line or never useful. */
  counterparty?: string;
}

interface LedgerLine extends CrossRailSpend {
  ts: number;
  state: 'committed' | 'reserved';
  reserveId?: string;
  expiresAt?: number;
  /** Writer identity (per-process). Absent on legacy records. */
  w?: string;
  [k: string]: unknown;
}

export type CrossRailTotal = { ok: true; total: bigint } | { ok: false; reason: string };

/**
 * Append-only JSONL ledger of raw per-rail spends. Amounts are stored RAW in
 * their own asset (never pre-converted), so the sum is always taken against
 * the CURRENT mandate's rates — a re-issued mandate with new rates re-prices
 * history instead of trusting stale conversions.
 */
export class CrossRailLedger {
  private readonly path: string;

  /** CLAIM_OFFSET: the file's size when this instance opened it.
   *
   * Everything before it was already there and is history, whoever wrote it.
   * Everything at or after it was appended while we were live, so a foreign writer
   * there is genuinely concurrent. That is the whole of the single-writer guard, and
   * it needs no clock: an append-only file already carries a total order, and a byte
   * offset cannot go backwards when the host's clock does.
   *
   * Reset after a successful `rewrite`, because a rewrite compacts the file and
   * invalidates every offset. Safe to reset: `rewrite` runs the same guard over every
   * line first and throws before compacting, so a file it has just written contains
   * no concurrent foreign records by construction. */
  private claimOffset: number;

  constructor(path: string) {
    if (!path) throw new Error('CrossRailLedger: path required');
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
    if (!existsSync(path)) writeFileSync(path, '', { encoding: 'utf8', mode: 0o600 });
    this.claimOffset = this.fileSize();
  }

  private fileSize(): number {
    try {
      return statSync(this.path).size;
    } catch {
      return 0;
    }
  }

  /** Record a committed spend immediately (signer-boundary path: the signature
   * IS the spend commitment — settlement timing is the facilitator's). */
  record(spend: CrossRailSpend): void {
    this.append({ ...spend, ts: Date.now(), state: 'committed', w: PROCESS_INSTANCE });
  }

  /** Reserve budget headroom before an out-of-process payment executes.
   * Counted by sums immediately; expires after 5 minutes if abandoned. */
  reserve(spend: CrossRailSpend): string {
    const reserveId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    this.append({ ...spend, ts: Date.now(), state: 'reserved', reserveId, expiresAt: Date.now() + RESERVE_TTL_MS, w: PROCESS_INSTANCE });
    return reserveId;
  }

  commit(reserveId: string | null): void {
    if (!reserveId) return;
    this.rewrite((e) => {
      if (e.reserveId !== reserveId || e.state !== 'reserved') return e;
      const { expiresAt: _x, reserveId: _r, ...rest } = e;
      return { ...rest, state: 'committed' } as LedgerLine;
    });
  }

  release(reserveId: string | null): void {
    if (!reserveId) return;
    this.rewrite((e) => (e.reserveId === reserveId && e.state === 'reserved' ? null : e));
  }

  /** Rolling-24h total across ALL rails, converted into the budget currency at
   * the supplied principal-attested rates (CROSS_RAIL_SCALE units, per-entry
   * round-up). An in-window entry whose asset has no rate, or that cannot be
   * parsed as a spend, makes the total unestablishable: {ok:false} — the
   * caller MUST fail closed, because an unpriceable spend still consumed the
   * budget. */
  sumWindowConverted(rates: Record<string, string>, nowMs = Date.now()): CrossRailTotal {
    let total = 0n;
    try {
      for (const e of this.window(nowMs)) {
        const rate = rates[e.asset];
        if (rate === undefined) {
          return { ok: false, reason: `ledger holds an in-window ${e.asset} spend (rail ${e.rail}) with no principal-attested rate in the mandate — cross-rail total cannot be established` };
        }
        try {
          total += convertToBudgetUnits(BigInt(e.amountRaw), e.decimals, rate);
        } catch (err) {
          return { ok: false, reason: `ledger entry unparseable (${(err as Error).message}) — cross-rail total cannot be established` };
        }
      }
    } catch (err) {
      // A concurrent second writer on this path is fail-closed, not a low total.
      if (err instanceof ObserverLedgerContentionError) return { ok: false, reason: err.message };
      throw err;
    }
    return { ok: true, total };
  }

  /** Rolling-24h raw total for ONE asset — feeds tm.velocity.dailyVolumeCap as
   * ctx.spending.daily_total. Rolling 24h is a superset of the calendar-day
   * counter the velocity note documents, so the cap trips early, never late.
   * Entries that do not parse are skipped here (they cannot lower a same-asset
   * sum; the binding cross-rail path above still fails closed on them).
   * @throws ObserverLedgerContentionError if a second writer is detected on this
   * path — callers MUST treat the throw as a DENY (never a zero counter). */
  sumWindowRaw(asset: string, nowMs = Date.now()): bigint {
    let total = 0n;
    for (const e of this.window(nowMs)) {
      if (e.asset !== asset) continue;
      try {
        total += BigInt(e.amountRaw);
      } catch {
        continue;
      }
    }
    return total;
  }

  /** Rolling 30-day raw total for ONE asset, for tm.velocity.monthlyVolumeCap.
   * Same shape and same conservative posture as sumWindowRaw: unparseable entries
   * are skipped (they cannot lower a same-asset sum) and the binding cross-rail
   * path still fails closed on them.
   * @throws ObserverLedgerContentionError if a second writer is detected. */
  sumMonthWindowRaw(asset: string, nowMs = Date.now()): bigint {
    let total = 0n;
    for (const e of this.window(nowMs, MONTH_WINDOW_MS)) {
      if (e.asset !== asset) continue;
      try {
        total += BigInt(e.amountRaw);
      } catch {
        continue;
      }
    }
    return total;
  }

  /** Drop entries older than the longest served window and expired reservations. */
  prune(nowMs = Date.now()): void {
    this.rewrite((e) => {
      if (e.ts < nowMs - PRUNE_AFTER_MS) return null;
      if (e.state === 'reserved' && e.expiresAt !== undefined && e.expiresAt < nowMs) return null;
      return e;
    });
  }

  private *window(nowMs: number, spanMs: number = WINDOW_MS): Generator<LedgerLine> {
    const cutoff = nowMs - spanMs;
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch {
      return;
    }
    // Offset tracked explicitly: split() discards position, and position is what the
    // guard now reads. Byte length rather than character count, because the file is
    // written as utf8 and a multi-byte payee or memo would otherwise drift the offset
    // against the size statSync reported.
    let offset = 0;
    for (const line of raw.split('\n')) {
      const lineStart = offset;
      offset += Buffer.byteLength(line, 'utf8') + 1; // +1 for the newline split removed
      if (!line.trim()) continue;
      let e: LedgerLine;
      try {
        e = JSON.parse(line) as LedgerLine;
      } catch {
        continue; // a corrupt line never lowers the sum; nothing to price either
      }
      // The guard runs BEFORE the window and state filters. A concurrent writer whose
      // record falls outside the window is still a concurrent writer, and skipping it
      // would make contention detection depend on how old the other process's spend was.
      const foreign = concurrentForeign(e, lineStart, this.claimOffset);
      if (foreign) throw new ObserverLedgerContentionError(foreign);
      if (typeof e.ts !== 'number' || e.ts < cutoff) continue;
      if (e.state !== 'committed' && e.state !== 'reserved') continue;
      if (e.state === 'reserved' && e.expiresAt !== undefined && e.expiresAt < nowMs) continue;
      yield e;
    }
  }

  private append(e: LedgerLine): void {
    appendFileSync(this.path, JSON.stringify(e) + '\n', { encoding: 'utf8' });
  }

  private rewrite(transform: (e: LedgerLine) => LedgerLine | null): void {
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch {
      return;
    }
    const kept: string[] = [];
    let offset = 0;
    for (const line of raw.split('\n')) {
      const lineStart = offset;
      offset += Buffer.byteLength(line, 'utf8') + 1;
      if (!line.trim()) continue;
      let parsed: LedgerLine;
      try {
        parsed = JSON.parse(line) as LedgerLine;
      } catch {
        kept.push(line); // corrupt line preserved verbatim
        continue;
      }
      // Never clobber a file a second writer is also mutating: fail closed
      // BEFORE the temp-write/rename that would drop their committed spends.
      const foreign = concurrentForeign(parsed, lineStart, this.claimOffset);
      if (foreign) throw new ObserverLedgerContentionError(foreign);
      let out: LedgerLine | null;
      try {
        out = transform(parsed);
      } catch {
        kept.push(line);
        continue;
      }
      if (out !== null) kept.push(JSON.stringify(out));
    }
    const tmp = this.path + '.tmp';
    writeFileSync(tmp, kept.join('\n') + (kept.length ? '\n' : ''), { encoding: 'utf8', mode: 0o600 });
    renameSync(tmp, this.path);
    // Offsets from before the compaction are meaningless now. Everything in the file is
    // content this process just wrote, and the loop above threw if any concurrent foreign
    // record existed, so the whole file is history from here.
    this.claimOffset = this.fileSize();
  }
}
