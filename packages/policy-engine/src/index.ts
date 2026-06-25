// @observer-protocol/policy-engine
//
// Shared policy enforcement core for Observer Protocol delegation credentials
// (AIP v0.8). Exports the credential verification pipeline and mandate evaluator
// as importable functions — no rail-specific decode, no signing surface.
//
// Rail-specific adapters (wdk-op-policy, mppx-op-account, etc.) import from here
// instead of maintaining their own vendored core/ copy.

export { verifyCredential, enforceMandate } from './core/verify.js';
export type { Verdict } from './core/verify.js';

export { evaluateMandate, parseDecimalScaled } from './core/mandate.js';
export type { MandateOutcome } from './core/mandate.js';

export { runRuntimeAdapter } from './core/runtime-adapter.js';
export type { RuntimeAdapterConfig, IssuanceMode } from './core/runtime-adapter.js';

export type {
  ObserverDelegationCredential,
  DelegationCredentialSubject,
  PolicyContext,
  PolicyResult,
  ResolvedTransfer,
  TradingMandate,
  ActionScope,
  AuthorizationConfig,
  VerifierConfig,
  RailDef,
  AuditEntry,
  TokenDefConfig,
} from './core/types.js';

// Adapter utilities — used by rail-specific engines after the core flip.
// Rail-specific decode (resolveTransfer, evmtx, soltx) stays in each engine.
export { appendAudit } from './core/audit.js';
export { parseConfig } from './core/config.js';
export { DEFAULT_EVM_TOKENS, DEFAULT_SOLANA_MINTS, SOLANA_PROGRAMS, SOLANA_BENIGN_PROGRAMS } from './core/tokens.js';
export { base58Encode, base58Decode } from './core/base58.js';

// Low-level pipeline steps — exported so engines that maintain their own inline
// pipeline (OWS: steps 1–5 + rail-specific step 6) can import from the single
// shared source instead of maintaining vendored copies.
export { sha256, decodeEd25519Multibase, ed25519Verify } from './core/crypto.js';
export { jcsBytes, jcsCanonicalize } from './core/jcs.js';
export { verifyEddsaJcs2022 } from './core/proof.js';
export type { ProofCheckResult } from './core/proof.js';
export { validateStructure, checkValidityWindow } from './core/schema.js';
export { resolveDidDocument, findAssertionMethodKey, resolveDidKeyDocument } from './core/resolve.js';
export type { DidDocument, VerificationMethodEntry } from './core/resolve.js';
export { checkStatusEntry } from './core/revocation.js';
export type { RevocationCheckOutcome } from './core/revocation.js';
