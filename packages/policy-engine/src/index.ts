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
} from './core/types.js';
