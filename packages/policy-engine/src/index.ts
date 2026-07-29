// @observer-protocol/policy-engine
//
// Shared policy enforcement core for Observer Protocol delegation credentials
// (AIP v0.8). Exports the credential verification pipeline and mandate evaluator
// as importable functions — no rail-specific decode, no signing surface.
//
// Rail-specific adapters (wdk-op-policy, mppx-op-account, etc.) import from here
// instead of maintaining their own vendored core/ copy.

export { verifyCredential, verifyCredentialObject, verifyCredentialCrypto, enforceMandate } from './core/verify.js';
export type { Verdict, CredentialChecks } from './core/verify.js';

export { evaluateMandate, parseDecimalScaled } from './core/mandate.js';

// Structured denials. DENIAL_TAGS is exported as data for the same reason the
// constraint vocabulary is: a taxonomy nothing can enumerate is one nothing can check.
export { DENIAL_TAGS, capDetail, formatScaled, NON_NEGOTIABLE } from './core/denial.js';
export type { DenialTag, DenialDetail } from './core/denial.js';
export type { MandateOutcome } from './core/mandate.js';

// The constraint vocabulary, as data. Exported so the schema-vs-engine
// conformance check can diff the published delegation schemas against what this
// engine actually recognizes, instead of against a code comment.
export { KNOWN_SCOPE_KEYS, KNOWN_TM_KEYS, KNOWN_COUNTERPARTY_KINDS, DECLARED_UNENFORCEABLE, declaredUnenforceable } from './core/vocabulary.js';
export type { DeclaredUnenforceable } from './core/vocabulary.js';

export { runRuntimeAdapter } from './core/runtime-adapter.js';
export type { RuntimeAdapterConfig, IssuanceMode } from './core/runtime-adapter.js';

export type {
  ObserverDelegationCredential,
  DelegationCredentialSubject,
  PolicyContext,
  PolicyResult,
  ResolvedTransfer,
  TradingMandate,
  CrossRailBudget,
  ActionScope,
  AuthorizationConfig,
  VerifierConfig,
  RailDef,
  AuditEntry,
  TokenDefConfig,
} from './core/types.js';

// Cross-rail budget accounting (G8): the shared rolling-24h ledger both buyer
// gates write to, plus the oracle-free conversion helpers the evaluator uses.
export {
  CrossRailLedger,
  ObserverLedgerContentionError,
  convertToBudgetUnits,
  formatBudgetUnits,
  CROSS_RAIL_SCALE,
} from './core/cross-rail.js';
export type { CrossRailSpend, CrossRailTotal } from './core/cross-rail.js';

// Core version stamp (derived from package.json at build time, travels inside the
// bundle) + the ledger-safety self-check an adapter can run at init.
export {
  CORE_VERSION,
  LEDGER_SAFE_FLOOR,
  compareCoreVersion,
  assertLedgerCoreSafe,
} from './core/version.js';
export type { LedgerCoreStatus } from './core/version.js';

// Adapter utilities — used by rail-specific engines after the core flip.
// Rail-specific decode (resolveTransfer, evmtx, soltx) stays in each engine.
// Outbound-fetch guard. Exported so adapters and hosted verifiers can apply the
// same refusal set to any URL they dereference, rather than each inventing one.
export { guardedFetch, assertFetchableUrl, blockedAddressReason, didWebOrigin, statusListOriginDecision, ObserverUrlRefusedError } from './core/url-guard.js';

export { appendAudit } from './core/audit.js';
export { parseConfig } from './core/config.js';
export { DEFAULT_EVM_TOKENS, DEFAULT_SOLANA_MINTS, SOLANA_PROGRAMS, SOLANA_BENIGN_PROGRAMS } from './core/tokens.js';
export { base58Encode, base58Decode } from './core/base58.js';

// Low-level pipeline steps — exported so engines that maintain their own inline
// pipeline (OWS: steps 1–5 + rail-specific step 6) can import from the single
// shared source instead of maintaining vendored copies.
export { sha256, decodeEd25519Multibase } from './core/crypto.js';
export { jcsBytes } from './core/jcs.js';
export { verifyEddsaJcs2022 } from './core/proof.js';
export type { ProofCheckResult } from './core/proof.js';
export { validateStructure, checkValidityWindow } from './core/schema.js';
export { resolveDidDocument, findAssertionMethodKey, resolveDidKeyDocument } from './core/resolve.js';
export type { DidDocument, VerificationMethodEntry } from './core/resolve.js';
export { checkStatusEntry } from './core/revocation.js';
export type { RevocationCheckOutcome } from './core/revocation.js';
