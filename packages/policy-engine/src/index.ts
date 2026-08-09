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
// `ed25519Verify` is RAW ed25519 over bytes, distinct from `verifyEddsaJcs2022`, which verifies a
// proof OBJECT on a credential. Exported because verifying a decision attestation needs the raw form:
// the attestation is signed over canonical bytes with no proof object around them, so a consumer with
// only `verifyEddsaJcs2022` would have to hand-roll SPKI wrapping over `node:crypto` to check our
// artifact. That is a way to get a false negative that looks like a forgery, and it is worth one
// export to remove. The function already existed and is unchanged; only its visibility moved.
export { sha256, decodeEd25519Multibase, ed25519Verify } from './core/crypto.js';
export { jcsBytes } from './core/jcs.js';

// ─── THE RECORD SHAPES AND THE PAYLOADS SIGNED OVER THEM, ADDED IN 1.0.0-rc.8 ────────────────────
//
// A COUNTERPARTY CAN NOW CONSTRUCT THE BYTES, NOT ONLY CHECK A SIGNATURE OVER THEM. Until rc.8 this
// package exported `jcsBytes` and `verifyEddsaJcs2022` — primitives, not shapes — and every payload
// construction lived in `op-mcp-payment-server`. Verification therefore required us, which is the one
// thing this protocol claims it does not.
//
// `canonicalise` and `stripUndefinedDeep` were already here and merely unexported. That is worth
// stating: the primitive side was not complete either, and phase 2 would have hit the same wall.
// ONLY `stripUndefinedDeep`. `canonicalise` AND `canonicalBytes` STAY INTERNAL, DELIBERATELY.
//
// TWO CANONICALISERS ON A PUBLIC SURFACE IS THE TWO-REPRESENTATIONS CLASS AT ITS WORST. `jcsBytes` is
// this package's public canonicaliser; `core/attestation-jcs.ts` is the attestation-domain one, and its
// own header records that they agree ONLY because every attestation field is a string — the moment a
// number enters they diverge silently and asymmetrically, one serialising it and the other throwing. A
// counterparty picking the wrong one gets bytes that verify nowhere and nothing tells them which they
// picked.
//
// AND NOBODY NEEDS IT. A counterparty calls `refusalPayload`, which canonicalises for them.
//
// `test/public-exports.mjs` uses `canonicalise` as its NEGATIVE CONTROL — the name that must not be a
// function, or its export loop is measuring nothing. That control fired on rc.8 when this line briefly
// exported it, catching a widening past both a ruling and the decision recorded in that file's header.
export { stripUndefinedDeep } from './core/jcs.js';
export { refusalPayload, signableFromRefusal, REFUSAL_PAYLOAD_TYPE, REFUSAL_PAYLOAD_TYPE_V1, REFUSAL_PAYLOAD_TYPE_V2 } from './core/records/refusal.js';
export { resolutionPayload, RESOLUTION_PAYLOAD_TYPE } from './core/records/resolution.js';
export { lapsePayload, LAPSE_PAYLOAD_TYPE } from './core/records/lapse.js';
export type { Refusal, AppliedBound, RefusalAuthority, Attribution, SpendRecord, ResolutionActor, ApprovalAssurance } from './core/records/types.js';
export { verifyEddsaJcs2022 } from './core/proof.js';
export type { ProofCheckResult } from './core/proof.js';
export { validateStructure, checkValidityWindow } from './core/schema.js';
export { resolveDidDocument, findAssertionMethodKey, resolveDidKeyDocument } from './core/resolve.js';
export type { DidDocument, VerificationMethodEntry } from './core/resolve.js';
// ─── DECISION ATTESTATION ────────────────────────────────────────────────────────────────────────
//
// Moved here from `op-mcp-payment-server` on 2026-08-04. It was reachable only from a package that is
// `"private": true` and unpublished, so a customer who wanted to attest DECISIONS rather than payments
// had to have the private service present to reach a builder and a verifier they would never otherwise
// run. Issuance and verification are both pure over injected primitives — a signer for issuance,
// `ed25519Verify` and a did:key decoder for verification, all exported above — so nothing about this
// requires our infrastructure.
//
// `canonicalise` IS DELIBERATELY NOT EXPORTED. See `core/attestation-jcs.ts`: this package now holds
// two canonicalisers that agree only because every attestation field is a string, and exporting the
// restricted one would create the surface on which a caller could pick the wrong one and sign bytes no
// other implementation reproduces.
// `checkPaymentBinding` IS EXPORTED, AND ITS ABSENCE WAS AN ACCIDENT RATHER THAN A DECISION.
// It arrived in `core/attestation.ts` with the counterparty and rail mirror and this barrel was not
// updated, so it was defined, correct, tested in the other copy, and unreachable from outside the
// package. That is the hand-mirror cost this release exists to end: the function moved, the export
// line did not, and nothing failed. `canonicalise` above is what a deliberate omission looks like,
// stated with its reason; this had none.
export {
  issueDecisionAttestation, verifyDecisionAttestation, acceptDecisionAttestation,
  checkDecisionRefs, checkDeciderArtifactRef, checkOutcomeInVocabulary, checkPaymentBinding,
  assertNoObservation, ObservationRefused, FORBIDDEN_ATTESTATION_FIELDS, ATTESTATION_ESTABLISHES,
} from './core/attestation.js';
export type {
  DecisionAttestation, PolicyRef, VocabularyRef, DeciderArtifactRef, AttestedAmount,
  AttestationCitation, AttestationAssurance, AttestationSigner, IssueResult,
  AttestationState, AttestationBlock, VerifierCapabilities, AcceptResult, DeciderResolver,
} from './core/attestation.js';

export { checkStatusEntry } from './core/revocation.js';
export type { RevocationCheckOutcome } from './core/revocation.js';
