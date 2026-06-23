/**
 * Observer Protocol Policy Engine — TypeScript interface surface.
 *
 * Types only — no runtime. Matches AIP v0.8 draft 1:
 *   https://github.com/observer-protocol/aip/blob/main/aip-v0.8-draft-1.md
 *
 * The on-the-wire JSON keys are camelCase, matching the spec. These TypeScript
 * interfaces describe the JSON shapes 1:1 — no field-name translation.
 */

// ---------------------------------------------------------------------------
// Issuer class taxonomy (AIP v0.6 §4.1, used by v0.8 counterparty rules)
// ---------------------------------------------------------------------------

export type IssuerClass =
  | "op_first_party"
  | "sovereign_self_attested"
  | "third_party_kyb"
  | "partner"
  | "peer_agent";

// ---------------------------------------------------------------------------
// tradingMandate sub-objects (v0.7 core + v0.8 extensions)
// ---------------------------------------------------------------------------

export interface DailyDrawdownCap {
  /** Loss ceiling magnitude. */
  limit: number;
  /** Whether the ceiling is a percentage of capital or an absolute amount in `unit`. */
  type: "percent" | "absolute";
  /** Duration string, canonical form '<integer>h' (e.g. "24h"). */
  window: string;
}

export interface CounterpartyControls {
  /** Closed list of permitted counterparties. DIDs preferred; raw addresses accepted as fallback. */
  allowList?: string[];
  /** Closed list of denied counterparties. */
  blockList?: string[];
  /** Counterparty's OP-tracked issuer_class MUST be an element of this set. */
  requireIssuerClassIn?: IssuerClass[];
}

export interface TimeWindow {
  /** HH:MM 24-hour. */
  start: string;
  /** HH:MM 24-hour. */
  end: string;
  /** IANA timezone name (e.g. "UTC", "America/New_York"). */
  timezone: string;
  /** Days the window applies. When absent, defaults to all days. */
  daysOfWeek?: Array<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">;
}

export interface TemporalControls {
  allowedTimeWindows?: TimeWindow[];
}

export interface GeographicControls {
  /** ISO 3166-1 alpha-2 country codes; counterparty MUST NOT belong to any. Fail-open if jurisdiction unknown. */
  blockedJurisdictions?: string[];
  /** ISO 3166-1 alpha-2 country codes; if present, counterparty MUST belong to one of these. Fail-closed if jurisdiction unknown. */
  allowedJurisdictionsOnly?: string[];
}

export interface VelocityControls {
  /** Maximum aggregate transacted volume in any 24h rolling window, denominated by tradingMandate.unit. */
  dailyVolumeCap?: number;
  /** Maximum aggregate transacted volume in any 30d rolling window, denominated by tradingMandate.unit. */
  monthlyVolumeCap?: number;
}

export interface TradingMandate {
  // v0.7 core
  allowedVenues?: string[];
  allowedInstruments?: string[];
  /** Denominated by `unit`. */
  maxNotionalPerOrder?: number;
  /** Denominated by `unit`. */
  maxPosition?: number;
  /** Denomination currency or asset code. REQUIRED when any volume/notional field is present. */
  unit?: string;
  dailyDrawdownCap?: DailyDrawdownCap;

  // v0.8 additive extensions
  counterparty?: CounterpartyControls;
  temporal?: TemporalControls;
  geographic?: GeographicControls;
  velocity?: VelocityControls;
}

// ---------------------------------------------------------------------------
// ObserverDelegationCredential (the credential that carries the mandate)
// ---------------------------------------------------------------------------

export interface CredentialProof {
  type: "Ed25519Signature2026" | string;
  created: string;
  verificationMethod: string;
  proofPurpose: "assertionMethod" | string;
  /** Multibase base58btc (`z`-prefixed) Ed25519 signature. */
  proofValue: string;
}

export interface CredentialSchemaRef {
  id: string;
  type: "JsonSchema" | string;
}

export interface BitstringStatusListEntry {
  id: string;
  type: "BitstringStatusListEntry";
  statusPurpose: "revocation" | "suspension" | string;
  statusListIndex: string;
  statusListCredential: string;
}

export interface ObserverDelegationCredentialSubject {
  /** DID of the subject (the delegated agent). */
  id: string;
  actionScope?: {
    allowed_rails?: string[];
    allowed_counterparty_types?: string[];
    [k: string]: unknown;
  };
  delegationScope?: {
    may_delegate_further?: boolean;
    [k: string]: unknown;
  };
  enforcementMode?: "pre_transaction_check" | "protocol_native" | string;
  authorizationLevel?: "one-time" | "recurring" | "policy" | string;
  authorizationConfig?: Record<string, unknown>;
  /** The policy itself, per AIP v0.7/v0.8. */
  tradingMandate?: TradingMandate;
  [k: string]: unknown;
}

export interface ObserverDelegationCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: string;
  validFrom: string;
  validUntil?: string;
  credentialSubject: ObserverDelegationCredentialSubject;
  credentialSchema?: CredentialSchemaRef;
  credentialStatus?: BitstringStatusListEntry[];
  proof: CredentialProof;
}

// ---------------------------------------------------------------------------
// EvaluationInput — what the wallet hands the engine
// ---------------------------------------------------------------------------

export interface TransactionProposal {
  /** Rail identifier; matches the canonicalisation spec at docs/canonicalization/{rail}.md. */
  rail: string;
  /** Hex-encoded canonical pre-sign bytes of the unsigned transaction on this rail. */
  canonicalBytes: string;
  /** Optional human-readable view of the same proposal, for UI / logging. Not used in the hash. */
  humanReadable?: Record<string, unknown>;
}

/**
 * Optional pre-fetched attestation context. When the engine runs in a
 * wallet-embedded mode without OP network access, the host SHOULD supply
 * counterparty attestations here; without them, attestation-dependent rules
 * (`counterparty.requireIssuerClassIn`, `geographic.*`) are skipped per
 * AIP v0.8 §2.3 fail modes.
 */
export interface AttestationContext {
  /** Counterparty's primary identifier (DID or rail-specific address) keying this entry. */
  counterparty: string;
  /** The counterparty's `issuer_class` per OP attestation taxonomy. */
  issuerClass?: IssuerClass;
  /** Counterparty's jurisdiction (ISO 3166-1 alpha-2), if attested. */
  jurisdiction?: string;
}

export interface EvaluationInput {
  proposal: TransactionProposal;
  delegationCredential: ObserverDelegationCredential;
  attestations?: AttestationContext[];
}

// ---------------------------------------------------------------------------
// PolicyEvaluationCredential — what the engine returns
// ---------------------------------------------------------------------------

export type RuleType =
  | "amountLimits"
  | "venues"
  | "instruments"
  | "counterparty"
  | "temporal"
  | "geographic"
  | "velocity"
  | "spendingLimits";

export interface DenyReason {
  ruleType: RuleType;
  /** The specific field that failed (e.g. "maxNotionalPerOrder", "requireIssuerClassIn"). */
  ruleField: string;
  /** Human-readable explanation. */
  message: string;
  /** Optional state value at evaluation time (e.g. current rolling daily volume). */
  currentValue?: unknown;
  /** Optional proposed change (e.g. proposed transaction notional). */
  proposedValue?: unknown;
}

export interface EvaluatedAgainst {
  /** The `id` of the ObserverDelegationCredential whose tradingMandate was evaluated. */
  delegationCredentialId: string;
  /** SHA-256 hex of the JCS-canonical bytes of the delegation credential. */
  delegationCredentialHash: string;
}

export interface ProposalBinding {
  /** SHA-256 hex of the canonical pre-sign bytes of the proposed action (proposal.canonicalBytes). */
  proposalHash: string;
  /** Rail identifier; matches proposal.rail. */
  rail: string;
}

export interface Evaluator {
  /** URN identifying the evaluator software, recommended form `urn:observer-protocol:evaluator:{implementation-id}`. */
  id: string;
  /** Version string of the evaluator implementation. */
  version: string;
}

export interface PolicyEvaluationCredentialSubject {
  decision: "allow" | "deny";
  /** REQUIRED iff decision === "deny". */
  denyReason?: DenyReason;
  evaluatedAgainst: EvaluatedAgainst;
  proposal: ProposalBinding;
  evaluator: Evaluator;
  /** ISO 8601 timestamp. */
  evaluatedAt: string;
  /** Whether OP attestation data was available during evaluation. */
  evaluatedWithAttestations: boolean;
}

export interface PolicyEvaluationCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: string;
  validFrom: string;
  credentialSubject: PolicyEvaluationCredentialSubject;
  proof: CredentialProof;
}
