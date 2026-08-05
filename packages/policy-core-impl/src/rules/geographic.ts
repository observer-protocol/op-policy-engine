/**
 * Rule: geographic (per AIP v0.8 §2.3).
 *
 * CRITICAL — asymmetric fail modes:
 *   - blockedJurisdictions:     fail-OPEN  when jurisdiction unknown (skip rule)
 *   - allowedJurisdictionsOnly: fail-CLOSED when jurisdiction unknown (deny)
 *
 * The counterparty's jurisdiction comes from the attestation context or
 * (as a fallback) directly from proposal.humanReadable.counterpartyJurisdiction.
 */

import type {
  EvaluationInput,
  TradingMandate,
  DenyReason,
} from "@observer-protocol/policy-interface";
import { readProposalHints, findAttestation } from "../proposal-hints.js";

function resolveJurisdiction(input: EvaluationInput): string | undefined {
  const hints = readProposalHints(input);
  if (hints.counterparty) {
    const att = findAttestation(input, hints.counterparty);
    if (att?.jurisdiction) return att.jurisdiction;
  }
  // Fallback for offline-of-OP integrations.
  return hints.counterpartyJurisdiction;
}

export function evaluateGeographic(
  input: EvaluationInput,
  mandate: TradingMandate,
): DenyReason | null {
  const geo = mandate.geographic;
  if (!geo) return null;

  const jurisdiction = resolveJurisdiction(input);

  // blockedJurisdictions — fail-OPEN when jurisdiction unknown.
  if (geo.blockedJurisdictions && geo.blockedJurisdictions.length > 0) {
    if (jurisdiction !== undefined && geo.blockedJurisdictions.includes(jurisdiction)) {
      return {
        ruleType: "geographic",
        ruleField: "blockedJurisdictions",
        message: `Counterparty jurisdiction ${jurisdiction} is on the blocked list.`,
        currentValue: jurisdiction,
        proposedValue: geo.blockedJurisdictions,
      };
    }
    // jurisdiction unknown → skip this rule (fail-open). Continue to allow check.
  }

  // allowedJurisdictionsOnly — fail-CLOSED when jurisdiction unknown.
  if (geo.allowedJurisdictionsOnly && geo.allowedJurisdictionsOnly.length > 0) {
    if (jurisdiction === undefined) {
      return {
        ruleType: "geographic",
        ruleField: "allowedJurisdictionsOnly",
        message:
          "Mandate declares allowedJurisdictionsOnly but counterparty jurisdiction is unknown; denying (fail-closed per AIP v0.8 §2.3).",
        proposedValue: geo.allowedJurisdictionsOnly,
      };
    }
    if (!geo.allowedJurisdictionsOnly.includes(jurisdiction)) {
      return {
        ruleType: "geographic",
        ruleField: "allowedJurisdictionsOnly",
        message: `Counterparty jurisdiction ${jurisdiction} is not in the allowed-only list.`,
        currentValue: jurisdiction,
        proposedValue: geo.allowedJurisdictionsOnly,
      };
    }
  }

  return null;
}
