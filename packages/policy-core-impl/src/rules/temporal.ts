/**
 * Rule: temporal (per AIP v0.8 §2.2).
 *
 * Evaluates the current wall-clock time against the mandate's
 * allowedTimeWindows. The proposal is allowed iff the current time falls
 * within at least one window on a permitted day of the week.
 *
 * Time is the verifier's local clock, in each window's stated IANA
 * timezone. Handles windows that cross midnight (start > end → wraps).
 */

import type {
  EvaluationInput,
  TradingMandate,
  DenyReason,
  TimeWindow,
} from "@observer-protocol/policy-interface";
import type { EvaluatorContext } from "../proposal-hints.js";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

interface LocalParts {
  hour: number;
  minute: number;
  day: (typeof DAY_KEYS)[number];
}

function toLocalParts(date: Date, timezone: string): LocalParts {
  // Intl.DateTimeFormat with the window's IANA timezone gives the local
  // time directly without needing a third-party tz library.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  // 24-hour formats sometimes return "24" for midnight in `hour: "2-digit"` mode.
  const hour = parseInt(parts.hour ?? "0", 10) % 24;
  const minute = parseInt(parts.minute ?? "0", 10);
  const weekday = (parts.weekday ?? "").toLowerCase().slice(0, 3) as LocalParts["day"];
  return { hour, minute, day: weekday };
}

function minutesOfDay(h: number, m: number): number {
  return h * 60 + m;
}

function parseHHMM(s: string): number {
  const [h = 0, m = 0] = s.split(":").map((x) => parseInt(x, 10));
  return minutesOfDay(h, m);
}

function withinWindow(now: LocalParts, window: TimeWindow): boolean {
  // Day-of-week check first (cheaper); when absent, all days match.
  if (window.daysOfWeek && window.daysOfWeek.length > 0) {
    if (!window.daysOfWeek.some((d) => d === now.day)) return false;
  }
  const start = parseHHMM(window.start);
  const end = parseHHMM(window.end);
  const cur = minutesOfDay(now.hour, now.minute);
  if (start <= end) {
    // Normal same-day window.
    return cur >= start && cur < end;
  }
  // Wrap-around (e.g. 22:00 → 06:00 next morning).
  return cur >= start || cur < end;
}

export function evaluateTemporal(
  _input: EvaluationInput,
  mandate: TradingMandate,
  context?: EvaluatorContext,
): DenyReason | null {
  const windows = mandate.temporal?.allowedTimeWindows;
  if (!windows || windows.length === 0) return null; // no temporal restriction
  const now = context?.now ?? new Date();
  for (const w of windows) {
    const local = toLocalParts(now, w.timezone);
    if (withinWindow(local, w)) return null;
  }
  return {
    ruleType: "temporal",
    ruleField: "allowedTimeWindows",
    message: `Current time falls outside all ${windows.length} allowed time window(s).`,
    currentValue: now.toISOString(),
  };
}
