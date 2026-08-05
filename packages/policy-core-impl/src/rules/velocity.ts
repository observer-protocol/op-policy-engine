/**
 * Rule: velocity — aggregate volume caps (per AIP v0.8 §2.4).
 *
 *   - dailyVolumeCap:   24h rolling window (denominated in mandate.unit)
 *   - monthlyVolumeCap: 30d rolling window
 *
 * Stateful. Wallet-embedded evaluators without persistent state SHOULD
 * skip; the server-side evaluator MUST enforce. The state is passed in
 * via EvaluatorContext.{currentDailyVolume, currentMonthlyVolume}; absent
 * state with a configured cap is treated as "skip" (not deny) — relying
 * on the server-side defense-in-depth layer to catch.
 */

import type {
  EvaluationInput,
  TradingMandate,
  DenyReason,
} from "@observer-protocol/policy-interface";
import { readProposalHints, type EvaluatorContext } from "../proposal-hints.js";

export function evaluateVelocity(
  input: EvaluationInput,
  mandate: TradingMandate,
  context?: EvaluatorContext,
): DenyReason | null {
  const vel = mandate.velocity;
  if (!vel) return null;

  const hints = readProposalHints(input);
  const proposalNotional = hints.notional ?? 0;

  // dailyVolumeCap
  if (vel.dailyVolumeCap !== undefined && context?.currentDailyVolume !== undefined) {
    const newDaily = context.currentDailyVolume + proposalNotional;
    if (newDaily > vel.dailyVolumeCap) {
      return {
        ruleType: "velocity",
        ruleField: "dailyVolumeCap",
        message: `Proposed transaction would bring 24h volume to ${newDaily} ${mandate.unit ?? ""}, exceeding dailyVolumeCap ${vel.dailyVolumeCap} ${mandate.unit ?? ""}.`.trim(),
        currentValue: context.currentDailyVolume,
        proposedValue: newDaily,
      };
    }
  }

  // monthlyVolumeCap
  if (vel.monthlyVolumeCap !== undefined && context?.currentMonthlyVolume !== undefined) {
    const newMonthly = context.currentMonthlyVolume + proposalNotional;
    if (newMonthly > vel.monthlyVolumeCap) {
      return {
        ruleType: "velocity",
        ruleField: "monthlyVolumeCap",
        message: `Proposed transaction would bring 30d volume to ${newMonthly} ${mandate.unit ?? ""}, exceeding monthlyVolumeCap ${vel.monthlyVolumeCap} ${mandate.unit ?? ""}.`.trim(),
        currentValue: context.currentMonthlyVolume,
        proposedValue: newMonthly,
      };
    }
  }

  return null;
}
