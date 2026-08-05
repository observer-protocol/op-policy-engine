/**
 * Conventions for reading semantic information out of EvaluationInput.proposal.
 *
 * The wire shape (per @observer-protocol/policy-interface) is intentionally
 * minimal: `proposal.canonicalBytes` (hex of rail-native pre-sign bytes,
 * what gets hashed into the PolicyEvaluationCredential) and `proposal.rail`.
 * Everything else lives under `proposal.humanReadable` — Record<string, unknown>.
 *
 * Rules that depend on semantic fields (notional, counterparty, etc.) read
 * from humanReadable through the typed accessors below. The integration
 * adapter (WDK adapter, Aqua adapter, test fixtures) is responsible for
 * populating those fields from the rail-native transaction structure.
 *
 * Fail-closed: when a mandate has a rule that DEPENDS on a hint (e.g. a
 * maxNotionalPerOrder rule depends on humanReadable.notional), and the hint
 * is absent, the rule denies. Otherwise an attacker could omit the hint to
 * bypass the cap.
 */

import type {
  EvaluationInput,
  AttestationContext,
} from "@observer-protocol/policy-interface";

/** Parsed semantic view of a proposal. Each field may be undefined. */
export interface ProposalHints {
  /** Transaction notional value, denominated in `unit`. */
  notional?: number;
  /** Unit/asset code; SHOULD match the mandate's `unit`. */
  unit?: string;
  /** Counterparty identifier: DID (preferred) or rail-specific address. */
  counterparty?: string;
  /** Counterparty's jurisdiction (ISO 3166-1 alpha-2); usually comes from attestation, may also be supplied here for offline-of-OP runs. */
  counterpartyJurisdiction?: string;
}

export function readProposalHints(input: EvaluationInput): ProposalHints {
  const hr = input.proposal.humanReadable ?? {};
  return {
    notional: typeof hr.notional === "number" ? hr.notional : undefined,
    unit: typeof hr.unit === "string" ? hr.unit : undefined,
    counterparty: typeof hr.counterparty === "string" ? hr.counterparty : undefined,
    counterpartyJurisdiction:
      typeof hr.counterpartyJurisdiction === "string" ? hr.counterpartyJurisdiction : undefined,
  };
}

/** Look up the attestation entry for a given counterparty identifier. */
export function findAttestation(
  input: EvaluationInput,
  counterparty: string,
): AttestationContext | undefined {
  if (!input.attestations) return undefined;
  return input.attestations.find((a) => a.counterparty === counterparty);
}

/**
 * Optional context for stateful rules. Never crosses the wire — purely an
 * implementation-side input populated by the server-side evaluator from a
 * state store (e.g. Postgres-backed rolling counters per delegation).
 * Wallet-embedded callers pass {} (or simply omit), and stateful rules
 * skip per AIP v0.8 §2.4.
 */
export interface EvaluatorContext {
  /** Aggregate transacted volume in the last 24h, for this delegation, denominated in mandate.unit. */
  currentDailyVolume?: number;
  /** Aggregate transacted volume in the last 30d, for this delegation, denominated in mandate.unit. */
  currentMonthlyVolume?: number;
  /** Current open exposure, denominated in mandate.unit. */
  currentPosition?: number;
  /** Optional override of "now" for deterministic temporal tests. Defaults to new Date(). */
  now?: Date;
}
