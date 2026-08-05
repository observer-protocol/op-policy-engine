/**
 * at-ars — placeholder for AT-ARS reputation integration.
 *
 * AT-ARS (the Agentic Terminal Agent Reputation Score) is an AT-layer
 * scoring concern, separate from OP's attestation taxonomy. AIP v0.8
 * §6 explicitly defers reputation-as-a-rule (e.g. a hypothetical
 * `tradingMandate.counterparty.requireAtArsMinimum`) to a future revision.
 *
 * This module exists as the wiring point so the future addition is a
 * localised change. v1 evaluation does not consult AT-ARS.
 */

import type { AttestationContext } from "@observer-protocol/policy-interface";

export interface CounterpartyReputation {
  /** AT-ARS score, 0–100 scale. */
  atArsScore?: number;
  /** Star band, 1–5. */
  starBand?: number;
}

/**
 * Fetch AT-ARS reputation for a counterparty.
 *
 * v1: returns undefined. AT-ARS is not consulted during evaluation. When
 * v2 introduces `requireAtArsMinimum`-style rules, this is the wiring point.
 */
export async function fetchReputation(
  _counterparty: string,
  _existing?: AttestationContext,
): Promise<CounterpartyReputation | undefined> {
  return undefined;
}
