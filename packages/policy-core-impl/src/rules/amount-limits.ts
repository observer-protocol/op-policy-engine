/**
 * Rule: amount limits (per-order notional, position, drawdown).
 *
 * Per AIP v0.7 + v0.8 §2:
 *   - maxNotionalPerOrder  → cap on a single proposal's notional
 *   - maxPosition          → cap on aggregate open exposure (requires state)
 *   - dailyDrawdownCap     → P&L-based loss ceiling (requires state)
 *
 * The mandate's `unit` is the denomination. If the proposal's unit hint
 * doesn't match the mandate's, the rule denies (no implicit conversion).
 */

import type {
  EvaluationInput,
  TradingMandate,
  DenyReason,
} from "@observer-protocol/policy-interface";
import { readProposalHints, type EvaluatorContext } from "../proposal-hints.js";

export function evaluateAmountLimits(
  input: EvaluationInput,
  mandate: TradingMandate,
  context?: EvaluatorContext,
): DenyReason | null {
  const hints = readProposalHints(input);

  // 1. Unit consistency — if the mandate declares a unit, the proposal must match.
  if (mandate.unit !== undefined && hints.unit !== undefined && hints.unit !== mandate.unit) {
    return {
      ruleType: "amountLimits",
      ruleField: "unit",
      message: `Proposal unit ${hints.unit} does not match mandate unit ${mandate.unit}.`,
      currentValue: hints.unit,
      proposedValue: mandate.unit,
    };
  }

  // 2. maxNotionalPerOrder
  if (mandate.maxNotionalPerOrder !== undefined) {
    if (hints.notional === undefined) {
      return {
        ruleType: "amountLimits",
        ruleField: "maxNotionalPerOrder",
        message:
          "Mandate declares maxNotionalPerOrder but proposal carries no notional hint; cannot evaluate, denying.",
      };
    }
    if (hints.notional > mandate.maxNotionalPerOrder) {
      return {
        ruleType: "amountLimits",
        ruleField: "maxNotionalPerOrder",
        message: `Proposed order notional ${hints.notional} ${mandate.unit ?? ""} exceeds maxNotionalPerOrder ${mandate.maxNotionalPerOrder} ${mandate.unit ?? ""}.`.trim(),
        currentValue: mandate.maxNotionalPerOrder,
        proposedValue: hints.notional,
      };
    }
  }

  // 3. maxPosition — stateful. Skip if no context (wallet-embedded without state).
  if (mandate.maxPosition !== undefined && context?.currentPosition !== undefined) {
    const newPosition = context.currentPosition + (hints.notional ?? 0);
    if (newPosition > mandate.maxPosition) {
      return {
        ruleType: "amountLimits",
        ruleField: "maxPosition",
        message: `Proposed order would bring open position to ${newPosition} ${mandate.unit ?? ""}, exceeding maxPosition ${mandate.maxPosition} ${mandate.unit ?? ""}.`.trim(),
        currentValue: context.currentPosition,
        proposedValue: newPosition,
      };
    }
  }

  // 4. dailyDrawdownCap — P&L-based, requires state tracking that's beyond
  //    the v1 scope of this rule module. Skip when no drawdown context.
  //    Future versions may add `context.currentDailyDrawdown` and enforce here.

  return null;
}
