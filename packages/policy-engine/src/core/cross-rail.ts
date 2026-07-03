import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
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
const PRUNE_AFTER_MS = 25 * 60 * 60 * 1000;
const RESERVE_TTL_MS = 5 * 60 * 1000;

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
}

interface LedgerLine extends CrossRailSpend {
  ts: number;
  state: 'committed' | 'reserved';
  reserveId?: string;
  expiresAt?: number;
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

  constructor(path: string) {
    if (!path) throw new Error('CrossRailLedger: path required');
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
    if (!existsSync(path)) writeFileSync(path, '', { encoding: 'utf8', mode: 0o600 });
  }

  /** Record a committed spend immediately (signer-boundary path: the signature
   * IS the spend commitment — settlement timing is the facilitator's). */
  record(spend: CrossRailSpend): void {
    this.append({ ...spend, ts: Date.now(), state: 'committed' });
  }

  /** Reserve budget headroom before an out-of-process payment executes.
   * Counted by sums immediately; expires after 5 minutes if abandoned. */
  reserve(spend: CrossRailSpend): string {
    const reserveId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    this.append({ ...spend, ts: Date.now(), state: 'reserved', reserveId, expiresAt: Date.now() + RESERVE_TTL_MS });
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
    return { ok: true, total };
  }

  /** Rolling-24h raw total for ONE asset — feeds tm.velocity.dailyVolumeCap as
   * ctx.spending.daily_total. Rolling 24h is a superset of the calendar-day
   * counter the velocity note documents, so the cap trips early, never late.
   * Entries that do not parse are skipped here (they cannot lower a same-asset
   * sum; the binding cross-rail path above still fails closed on them). */
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

  /** Drop entries older than 25h and expired reservations. Atomic rewrite. */
  prune(nowMs = Date.now()): void {
    this.rewrite((e) => {
      if (e.ts < nowMs - PRUNE_AFTER_MS) return null;
      if (e.state === 'reserved' && e.expiresAt !== undefined && e.expiresAt < nowMs) return null;
      return e;
    });
  }

  private *window(nowMs: number): Generator<LedgerLine> {
    const cutoff = nowMs - WINDOW_MS;
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch {
      return;
    }
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      let e: LedgerLine;
      try {
        e = JSON.parse(line) as LedgerLine;
      } catch {
        continue; // a corrupt line never lowers the sum; nothing to price either
      }
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
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const out = transform(JSON.parse(line) as LedgerLine);
        if (out !== null) kept.push(JSON.stringify(out));
      } catch {
        kept.push(line);
      }
    }
    const tmp = this.path + '.tmp';
    writeFileSync(tmp, kept.join('\n') + (kept.length ? '\n' : ''), { encoding: 'utf8', mode: 0o600 });
    renameSync(tmp, this.path);
  }
}
