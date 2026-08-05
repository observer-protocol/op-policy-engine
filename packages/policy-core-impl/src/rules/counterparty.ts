/**
 * Rule: counterparty controls (per AIP v0.8 §2.1).
 *
 * Fail modes:
 *   - blockList:  closed list of denied; absent counterparty → skip (no match)
 *   - allowList:  closed list of permitted; absent counterparty → DENY (fail-closed)
 *   - requireIssuerClassIn: set membership over issuer_class; if no
 *     attestation available for the counterparty, the rule is SKIPPED
 *     and the caller records evaluatedWithAttestations=false.
 */

import type {
  EvaluationInput,
  TradingMandate,
  DenyReason,
} from "@observer-protocol/policy-interface";
import { readProposalHints, findAttestation } from "../proposal-hints.js";

export function evaluateCounterparty(
  input: EvaluationInput,
  mandate: TradingMandate,
): DenyReason | null {
  const cp = mandate.counterparty;
  if (!cp) return null;

  const hints = readProposalHints(input);
  const counterparty = hints.counterparty;

  // 1. blockList — match against counterparty identifier (DID or address as-is).
  //    No counterparty hint → can't check → skip (per fail-mode docs in SPEC.md).
  if (cp.blockList && cp.blockList.length > 0 && counterparty) {
    if (cp.blockList.includes(counterparty)) {
      return {
        ruleType: "counterparty",
        ruleField: "blockList",
        message: `Counterparty ${counterparty} is on the block list.`,
        currentValue: counterparty,
      };
    }
  }

  // 2. allowList — closed list, fail-closed when counterparty unknown OR not in list.
  if (cp.allowList && cp.allowList.length > 0) {
    if (!counterparty) {
      return {
        ruleType: "counterparty",
        ruleField: "allowList",
        message:
          "Mandate declares counterparty.allowList but proposal carries no counterparty hint; cannot evaluate, denying.",
      };
    }
    if (!cp.allowList.includes(counterparty)) {
      return {
        ruleType: "counterparty",
        ruleField: "allowList",
        message: `Counterparty ${counterparty} is not on the allow list.`,
        currentValue: counterparty,
      };
    }
  }

  // 3. requireIssuerClassIn — set membership; skip if attestation absent.
  if (cp.requireIssuerClassIn && cp.requireIssuerClassIn.length > 0 && counterparty) {
    const attestation = findAttestation(input, counterparty);
    if (!attestation || !attestation.issuerClass) {
      // No attestation → skip per v0.8 §2.3; the evaluator records
      // evaluatedWithAttestations=false for the overall decision.
      return null;
    }
    if (!cp.requireIssuerClassIn.includes(attestation.issuerClass)) {
      return {
        ruleType: "counterparty",
        ruleField: "requireIssuerClassIn",
        message: `Counterparty issuer_class '${attestation.issuerClass}' is not in the required set (${cp.requireIssuerClassIn.join(", ")}).`,
        currentValue: attestation.issuerClass,
        proposedValue: cp.requireIssuerClassIn,
      };
    }
  }

  return null;
}
