/**
 * evaluator — the core decision function.
 *
 * Given a transaction proposal and a signed delegation credential (whose
 * credentialSubject.tradingMandate carries the policy), return the
 * EvaluationResult that the signer wraps into a PolicyEvaluationCredential.
 *
 * Order of rule evaluation is fail-fast: the first denial short-circuits.
 * Order is deterministic and matches the order documented in v0.8 §2:
 *
 *   1. amount-limits   (cheapest, deterministic)
 *   2. temporal        (deterministic, no attestation needed)
 *   3. velocity        (stateful but no network)
 *   4. counterparty    (may consult attestations)
 *   5. geographic      (may consult attestations)
 */

import type {
  EvaluationInput,
  DenyReason,
  TradingMandate,
} from "@observer-protocol/policy-interface";

import { extractEffectiveMandate } from "./hierarchy.js";
import { evaluateAmountLimits } from "./rules/amount-limits.js";
import { evaluateCounterparty } from "./rules/counterparty.js";
import { evaluateTemporal } from "./rules/temporal.js";
import { evaluateGeographic } from "./rules/geographic.js";
import { evaluateVelocity } from "./rules/velocity.js";
import type { EvaluatorContext } from "./proposal-hints.js";

export interface EvaluationResult {
  decision: "allow" | "deny";
  denyReason?: DenyReason;
  evaluatedWithAttestations: boolean;
}

export function evaluate(
  input: EvaluationInput,
  context?: EvaluatorContext,
): EvaluationResult {
  const mandate: TradingMandate = extractEffectiveMandate(input.delegationCredential);
  const evaluatedWithAttestations =
    Array.isArray(input.attestations) && input.attestations.length > 0;

  // Pipeline — order matters for denyReason specificity (cheapest first).
  const pipeline: Array<() => DenyReason | null> = [
    () => evaluateAmountLimits(input, mandate, context),
    () => evaluateTemporal(input, mandate, context),
    () => evaluateVelocity(input, mandate, context),
    () => evaluateCounterparty(input, mandate),
    () => evaluateGeographic(input, mandate),
  ];

  for (const step of pipeline) {
    const deny = step();
    if (deny) return { decision: "deny", denyReason: deny, evaluatedWithAttestations };
  }
  return { decision: "allow", evaluatedWithAttestations };
}
