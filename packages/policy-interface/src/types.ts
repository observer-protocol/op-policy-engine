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
// Mandate sub-objects (v0.7 core + v0.8 extensions)
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
  /** Maximum aggregate transacted volume in any 24h rolling window, denominated by mandate unit. */
  dailyVolumeCap?: number;
  /** Maximum aggregate transacted volume in any 30d rolling window, denominated by mandate unit. */
  monthlyVolumeCap?: number;
}

// ---------------------------------------------------------------------------
// Mandate profiles — SpendMandate (community) and TradingMandate (enterprise)
// ---------------------------------------------------------------------------

/**
 * Shared base for all mandate profiles.
 * Fields here are evaluated by the shared policy core on every rail.
 */
export interface MandateBase {
  /** REQUIRED when any amount or volume field is present. Denomination currency or asset code. */
  unit?: string;
  /** Counterparty controls: allowlist, blocklist, issuer-class requirements. */
  counterparty?: CounterpartyControls;
  /**
   * Rolling-window volume caps.
   * Generalizes to all rails (not l402 in current parity harness, but no architectural barrier).
   * Note: velocity is a generalizes-to-all-rails rule, not strictly a universal-core rule.
   */
  velocity?: VelocityControls;
  /** Temporal access controls. Generalizes to all rails. */
  temporal?: TemporalControls;
  /** Geographic jurisdiction controls. Generalizes to all rails. Fail-closed when jurisdiction unknown. */
  geographic?: GeographicControls;
}

/**
 * Community/default mandate profile. Deploy-and-go for operators who do not need order-plane
 * infrastructure. Enforced entirely by the shared policy core:
 *   amountLimits (maxPerTransaction), counterparty, velocity (maxPerDay), failClosed.
 *
 * Note: maxPerDay uses velocity, which is classified as generalizes-to-all-rails rather than
 * strictly universal. Safe for SpendMandate — no rail-specific rules are included.
 *
 * On-the-wire credential field: credentialSubject.spendMandate
 */
export interface SpendMandate extends MandateBase {
  /** Per-transaction ceiling denominated by `unit`. Maps to TradingMandate.maxNotionalPerOrder. */
  maxPerTransaction?: number;
  /** Daily aggregate cap denominated by `unit`. Shorthand for velocity.dailyVolumeCap. */
  maxPerDay?: number;
  /** Shorthand for counterparty.allowList. Permitted counterparties only. */
  allowedCounterparties?: string[];
  /** Shorthand for counterparty.blockList. Denied counterparties. */
  blockedCounterparties?: string[];
  /** Shorthand for counterparty.requireIssuerClassIn. Fail-closed if no attestation source. */
  requireIssuerClassIn?: IssuerClass[];
}

/**
 * Enterprise/DeFi mandate profile. Superset of SpendMandate fields plus order-plane constraints.
 * Order-plane fields (allowedVenues, allowedInstruments, maxPosition, dailyDrawdownCap) require
 * an order-aware evaluator and are surfaced as NOT-ENFORCED notes by the shared policy core.
 *
 * On-the-wire credential field: credentialSubject.tradingMandate
 */
export interface TradingMandate extends MandateBase {
  // Universal-core transaction-plane fields (enforced by shared core)
  /** Per-transaction ceiling denominated by `unit`. */
  maxNotionalPerOrder?: number;
  /** Maximum open position denominated by `unit`. Requires order-aware evaluator. */
  maxPosition?: number;

  // Order-plane fields (NOT enforced by shared core — noted as out-of-scope)
  allowedVenues?: string[];
  allowedInstruments?: string[];
  dailyDrawdownCap?: DailyDrawdownCap;
}

// ---------------------------------------------------------------------------
// ObserverDelegationCredential (the credential that carries the mandate)
// ---------------------------------------------------------------------------

export interface CredentialProof {
  type: "DataIntegrityProof" | string;
  /** Cryptosuite identifier; present on DataIntegrityProof credentials (e.g. "eddsa-jcs-2022"). */
  cryptosuite?: "eddsa-jcs-2022" | string;
  created: string;
  verificationMethod: string;
  proofPurpose: "assertionMethod" | string;
  /** Multibase base58btc (`z`-prefixed) signature bytes. */
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
    [k: string]: unknown;
  };
  delegationScope?: {
    may_delegate_further?: boolean;
    [k: string]: unknown;
  };
  enforcementMode?: "pre_transaction_check" | "protocol_native" | string;
  authorizationLevel?: "one-time" | "recurring" | "policy" | string;
  authorizationConfig?: Record<string, unknown>;
  /** Community/default mandate profile. Enforced entirely by the shared policy core. */
  spendMandate?: SpendMandate;
  /** Enterprise/DeFi mandate profile. Superset of spendMandate. */
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
  /** Rail identifier; matches the canonicalization spec at docs/canonicalization/{rail}.md. */
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
 * (counterparty.requireIssuerClassIn, geographic.*) are skipped per
 * AIP v0.8 §2.3 fail modes.
 */
export interface AttestationContext {
  /** Counterparty's primary identifier (DID or rail-specific address) keying this entry. */
  counterparty: string;
  /** The counterparty's issuer_class per OP attestation taxonomy. */
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
  | "counterparty"
  | "temporal"
  | "geographic"
  | "velocity"
  | "failClosed"
  | "credentialIntegrity"
  | "operationClassification"
  | "venues"
  | "instruments"
  | "drawdown"
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
  /** The id of the ObserverDelegationCredential whose mandate was evaluated. */
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
  /** URN identifying the evaluator software, recommended form urn:observer-protocol:evaluator:{implementation-id}. */
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

// ---------------------------------------------------------------------------
// IssuanceMode — dev vs full mode (Step 3 / WalletBindingCredential)
// ---------------------------------------------------------------------------

/**
 * Two issuance modes, one gate. The signer-boundary invariant holds in both:
 * the mandate must be signed by a key the agent cannot forge.
 *
 * dev:  operator-as-principal-and-issuer. The operator anoints their own agent
 *       and issues the mandate with their own key (typically a did:key principal).
 *       OP is not in the issuance loop. The agent key is distinct from the
 *       operator key — the agent cannot mint or alter the mandate.
 *
 * full: OP-issued ODC, full multi-credential chain. Graduation target.
 *       Principal is typically did:web. The did:key dev-mode principal is linked
 *       to the did:web principal via a PrincipalContinuityAttestation at graduation
 *       so the agent's accumulated identity and history are preserved.
 */
export type IssuanceMode = "dev" | "full";

// ---------------------------------------------------------------------------
// WalletBindingCredential (Step 3 — binds a wallet address to a principal DID)
// ---------------------------------------------------------------------------

/**
 * Subject of a WalletBindingCredential.
 * The credential issuer (principal) attests that they control `walletAddress`
 * on `rail`/`chainId`. In dev mode the issuer is the operator (did:key); in
 * full mode the issuer is OP (did:web).
 */
export interface WalletBindingCredentialSubject {
  /** DID of the principal who controls this wallet. */
  id: string;
  /** Rail-specific wallet address being bound. */
  walletAddress: string;
  /** Rail identifier (matches config.rails[chainId].rail). */
  rail: string;
  /** Chain ID scope. When absent the binding applies to all chains on the rail. */
  chainId?: string;
  /** Issuance mode context — informs the verifier which trust root to apply. */
  issuanceMode: IssuanceMode;
}

export interface WalletBindingCredential {
  "@context": string[];
  id: string;
  type: string[];
  /** In dev mode: the operator's DID (typically did:key). In full mode: OP's DID (did:web). */
  issuer: string;
  validFrom: string;
  validUntil?: string;
  credentialSubject: WalletBindingCredentialSubject;
  proof: CredentialProof;
}

// ---------------------------------------------------------------------------
// PrincipalContinuityAttestation — graduation stub (design-for, not built in v1)
// ---------------------------------------------------------------------------

/**
 * Links a prior did:key principal to a new did:web principal at graduation.
 * Issued and signed by the new did:web principal; the signature proves control
 * of the new identity. The prior did:key DID is preserved as `priorPrincipalDid`
 * so the agent's accumulated history (AT-ARS, anointing) remains portable.
 *
 * Implementation: NOT built in v1. This type stub exists so the data model does
 * not foreclose the migration path. Build when the first dev-mode operator
 * actually graduates to full mode — not before.
 */
export interface PrincipalContinuityAttestationSubject {
  /** The new did:web principal DID (issuer of this credential). */
  id: string;
  /** The prior did:key principal DID being superseded. */
  priorPrincipalDid: string;
  /** ISO 8601 timestamp of the continuity event. */
  continuityAt: string;
}

export interface PrincipalContinuityAttestation {
  "@context": string[];
  id: string;
  type: string[];
  /** The new did:web principal — same as credentialSubject.id. */
  issuer: string;
  validFrom: string;
  credentialSubject: PrincipalContinuityAttestationSubject;
  proof: CredentialProof;
}
