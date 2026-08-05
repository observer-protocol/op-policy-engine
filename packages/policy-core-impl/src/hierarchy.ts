/**
 * hierarchy — effective-mandate extraction from a signed delegation credential.
 *
 * Under AIP v0.8's credential-is-the-policy model, there is no separate
 * mutable policy store to merge from. The credential's tradingMandate IS
 * the policy. This module exists as the single point of "extract the
 * effective policy" so the rest of the engine has a stable interface even
 * if the policy-extraction logic evolves later.
 *
 * Future use cases this module can grow into:
 *   - Cross-credential merging IF a future spec ever introduces composable
 *     delegations (parent-child credentials with shared scope).
 *   - Org-level default-mandate templating at issuance time (still produces
 *     a single signed credential, but with the template applied upstream).
 *
 * For v1: this function unwraps the tradingMandate from the credential and
 * applies no other logic.
 */

import type {
  ObserverDelegationCredential,
  TradingMandate,
} from "@observer-protocol/policy-interface";

export function extractEffectiveMandate(
  credential: ObserverDelegationCredential,
): TradingMandate {
  const mandate = credential.credentialSubject.tradingMandate;
  if (!mandate) {
    // A delegation credential with no tradingMandate has no positive scope.
    // The engine treats this as deny-all (no allowed venues, no allowed
    // instruments, zero notional). Returning {} is correct because closed-list
    // rules deny on empty/missing lists per AIP v0.8 §2.1.
    return {};
  }
  return mandate;
}
