// OWS-side wire types — the executable contract.
// Per open-wallet-standard/core docs/03-policy-engine.md: full PolicyContext
// arrives as one JSON object on stdin; exactly one PolicyResult JSON object
// must be written to stdout. Non-zero exit, malformed output, or a 5-second
// timeout all deny.

export interface OwsTransaction {
  to?: string;
  value?: string; // wei (or rail-native integer) as decimal string — EVM parsed
  data?: string;
  raw_hex?: string;
}

export interface OwsSpending {
  daily_total?: string; // cumulative value signed today (wei), per API key
  /** Cumulative value signed in the trailing 30 days, same units as daily_total.
   * REQUIRED whenever the mandate carries tradingMandate.velocity.monthlyVolumeCap:
   * that cap was previously compared against daily_total, so a month's budget only
   * tripped when a single day exceeded it. A monthly cap with no monthly counter
   * now fails closed, matching per_day, dailyVolumeCap and crossRailBudget. */
  monthly_total?: string;
  date?: string;
}

export interface OwsTypedData {
  verifying_contract?: string;
  domain_chain_id?: string | number;
  primary_type?: string;
  domain_name?: string;
  domain_version?: string;
  raw_json?: unknown;
}

export interface PolicyContext {
  chain_id: string; // CAIP-2
  wallet_id: string;
  api_key_id: string;
  transaction: OwsTransaction;
  spending?: OwsSpending;
  timestamp: string;
  typed_data?: OwsTypedData;
  policy_config?: unknown;
  /** Rolling-24h spend already counted across ALL rails, converted into the
   * mandate's crossRailBudget.currency at the mandate's principal-attested
   * rates, scaled by CROSS_RAIL_SCALE. Supplied by the caller (the shared
   * CrossRailLedger); a crossRailBudget mandate with no counter fails closed. */
  cross_rail?: { total: string; currency: string };
  /** The counterparty-or-payor-signed statement of what is owed, when one was presented.
   *
   * ABSENT IS NOT EMPTY. A mandate carrying actionScope.requiredPurchaseTerms and a context with no
   * artifact is a payment nobody stated the terms of, which DENIES. A context that supplies one is
   * making a claim the engine checks against the accepted types.
   *
   * `verified` is the CALLER'S claim that it checked the signature. The engine does not verify
   * signatures here and does not pretend to: it refuses an unverified artifact rather than
   * accepting one on the strength of its shape. That boundary is stated because an engine that
   * silently accepted `verified: false` would be reading an artifact as evidence of itself. */
  purchase_terms?: { type: string; verified: boolean };
}

export interface PolicyResult {
  allow: boolean;
  reason?: string;
}

// Observer Protocol credential shapes — mirrors
// @observer-protocol/policy-interface and schemas/delegation/v2.1.json.

export interface DataIntegrityProof {
  type: string; // "DataIntegrityProof"
  cryptosuite?: string; // "eddsa-jcs-2022"
  created?: string;
  verificationMethod?: string;
  proofPurpose?: string;
  proofValue?: string;
  '@context'?: unknown;
}

export interface BitstringStatusListEntry {
  id: string;
  type: string; // "BitstringStatusListEntry"
  statusPurpose: 'revocation' | 'suspension';
  statusListIndex: string;
  statusListCredential: string;
}

export interface PerTransactionCeiling {
  amount: string;
  currency: string;
}

export interface ActionScope {
  /** Above this, a payment routes to a human approver rather than proceeding. Same shape as
   * per_transaction_ceiling and evaluated in the same currency, deliberately: an escalation band that
   * needed an FX rate would put an oracle inside a policy decision. */
  escalationThreshold?: { amount: string; currency: string };
  /** Keys permitted to approve a payment escalation routes to a human. Registered alongside
   * escalationThreshold because the schema requires the band to have somewhere to route, and a
   * threshold whose approver list still denied would leave the credential unusable for a second
   * reason. Carried to the verdict; not otherwise evaluated here. */
  approvers?: unknown[];
  allowed_rails?: string[];
  per_transaction_ceiling?: PerTransactionCeiling;
  allowed_transaction_categories?: string[];
  cumulative_budget?: { amount: string; currency: string; window: string };
  geographic_restriction?: { allowed?: string[]; disallowed?: string[] };
  /** Artifact types acceptable as a signed statement of what is owed. See
   * KNOWN_PURCHASE_TERMS_TYPES, which names the SIGNER of each because one of them contradicts
   * v2.5's frozen description. */
  requiredPurchaseTerms?: string[];
}

export interface AuthorizationConfig {
  oneTime?: {
    counterparty_did: string;
    amount: string;
    currency: string;
    rail: string;
    execution_deadline?: string;
    purchase_description?: string;
  };
  recurring?: {
    counterparty_did: string;
    ceiling_amount: string;
    ceiling_currency: string;
    per_transaction_max?: string;
    period: string;
    valid_until?: string;
    allowed_rails?: string[];
  };
  policy?: {
    policy_id: string;
    rail_preference: string[];
    per_rail_caps?: Record<
      string,
      { per_transaction?: string; aggregate?: string; period?: string; currency?: string }
    >;
    escalation_threshold?: { amount?: string; currency?: string };
  };
}

export interface TradingMandate {
  allowedVenues?: string[];
  allowedInstruments?: string[];
  maxNotionalPerOrder?: number;
  maxPosition?: number;
  unit?: string;
  dailyDrawdownCap?: { limit: number; type: 'percent' | 'absolute'; window: string };
  counterparty?: {
    allowList?: string[];
    blockList?: string[];
    requireIssuerClassIn?: string[];
  };
  temporal?: {
    allowedTimeWindows?: Array<{
      start: string;
      end: string;
      timezone: string;
      daysOfWeek?: string[];
    }>;
  };
  geographic?: {
    blockedJurisdictions?: string[];
    allowedJurisdictionsOnly?: string[];
  };
  velocity?: { dailyVolumeCap?: number; monthlyVolumeCap?: number };
  crossRailBudget?: CrossRailBudget;
}

/** One rolling-24h budget consumed across every rail the delegation spans
 * (schema v2.3). `rates` maps each spendable asset symbol to its value in
 * `currency`, ATTESTED BY THE PRINCIPAL inside the signed credential — the
 * evaluator performs no FX lookup and consults no oracle (AIP v0.8
 * same-currency invariant holds: all comparisons happen in `currency` using
 * only signed data). An asset with no rate cannot be scoped and fails closed. */
export interface CrossRailBudget {
  amount: string; // decimal string in `currency`
  currency: string; // e.g. "USD"
  window: string; // ISO-8601 duration; v1 evaluators support exactly "P1D" (rolling 24h)
  rates: Record<string, string>; // asset symbol -> decimal price in `currency`
}

export interface DelegationCredentialSubject {
  id: string;
  authorizationLevel?: 'one-time' | 'recurring' | 'policy';
  authorizationConfig?: AuthorizationConfig;
  actionScope: ActionScope;
  delegationScope: { may_delegate_further: boolean };
  acl?: unknown;
  enforcementMode: string;
  parentDelegationId?: string | null;
  kybCredentialId?: string | null;
  tradingMandate?: TradingMandate;
}

export interface ObserverDelegationCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  validFrom: string;
  validUntil: string;
  credentialSubject: DelegationCredentialSubject;
  credentialSchema: { id: string; type: string };
  credentialStatus?: BitstringStatusListEntry[];
  proof: DataIntegrityProof;
}

// Configuration injected via the OWS policy file's `config` object
// (arrives as PolicyContext.policy_config). Every behavioral knob is
// explicit here and documented in the README. Staleness values still have
// defaults, but an UNRECOGNIZED key under `revocation` or `didCache` now throws
// rather than being ignored, so a typo cannot silently restore a limit someone
// lowered. The shipped policy template writes them out loud regardless.

export interface RailDef {
  rail: string; // Observer Protocol rail name, e.g. "ethereum-mainnet"
  currency: string; // rail-native unit for transaction.value, e.g. "ETH"
  decimals: number; // scale of transaction.value relative to `currency`
  family: 'evm' | 'solana' | 'other'; // payload-parsing family
}

export interface TokenDefConfig {
  symbol: string;
  decimals: number;
}

// The single asset/amount/recipient view the mandate enforces against,
// resolved from either an EVM or Solana payload. `amount` is raw (unscaled)
// units of `assetSymbol`; `decimals` is that asset's scale.
export interface ResolvedTransfer {
  kind: 'native' | 'evm-token' | 'trc20-token' | 'sol-system' | 'sol-spl-checked' | 'sol-spl' | 'unparsed';
  assetSymbol?: string; // e.g. "ETH", "SOL", "USDC" — undefined if undeterminable
  amount?: bigint; // raw units of assetSymbol
  decimals?: number;
  recipient?: string; // wallet (native/evm-token/sol-system) or token account (sol-spl*)
  recipientKind: 'wallet' | 'spl-token-account' | 'none';
  notes: string[];
  // Set when resolution itself establishes the transfer is unenforceable for
  // a binding amount/counterparty constraint (mandate turns this into a deny).
  unenforceable?: string;
}

export interface VerifierConfig {
  credentialPath: string;
  issuerDid: string;
  schemaAllowlist: string[];
  agentDid?: string;
  revocation: {
    maxStalenessHours: number;
    onUnreachable: 'cache-then-deny'; // refresh-first; cache under maxStalenessHours; deny otherwise
    fetchTimeoutMs: number;
  };
  didCache: { maxStalenessHours: number };
  cacheDir: string;
  auditLog: string;
  rails: Record<string, RailDef>;
  evmTokens?: Record<string, TokenDefConfig>; // lowercased ERC-20 contract → asset
  solanaMints?: Record<string, TokenDefConfig>; // base58 SPL mint → asset (case-SENSITIVE)
  trc20Tokens?: Record<string, TokenDefConfig>; // base58 TRC-20 contract → asset (case-SENSITIVE — base58 must never be case-folded)
  allowContractCalls: boolean;
  transactionCategory?: string;
  counterpartyAddressMap?: Record<string, string[]>; // DID -> rail addresses
  /** Origins a credential-supplied status list may be fetched from, beyond the
   * did:web issuer's own origin. EMPTY BY DEFAULT, so the default posture is
   * same-origin only and a did:key issuer permits nothing until configured.
   * Entries are exact origins (scheme, host and port), never prefixes. */
  statusListOriginAllowlist?: string[];
  offline?: {
    didDocumentPath?: string; // air-gapped/test override for the issuer DID document
    statusListPath?: string; // air-gapped/test override for the status list credential
  };
}

export interface AuditEntry {
  ts: string;
  decision: 'allow' | 'deny';
  reason: string;
  notes: string[];
  chain_id?: string;
  wallet_id?: string;
  api_key_id?: string;
  credential_id?: string;
  credential_sha256?: string;
  tx_sha256?: string;
}
