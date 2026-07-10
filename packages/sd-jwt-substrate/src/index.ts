// @observer-protocol/sd-jwt-substrate
//
// The shared SD-JWT VC substrate for external mandate formats: RFC 9901
// serialization, ES256/P-256, sha-256 _sd_alg, RFC 7800 cnf key binding.
// Built for the AP2 profile; Verifiable Intent reuses the same primitives.
// Fail-closed throughout: unresolved issuers, wrong algs, missing key
// bindings, and expired tokens all verify false — never a bypass.

export { issueSdJwtVc, presentSdJwtVc, verifySdJwtVc } from './sdjwt.js';
export type { IssueInput, PresentInput, VerifyInput, VerifyResult } from './sdjwt.js';

export { issueAp2MandateToken, verifyAp2MandateToken } from './ap2-envelope.js';
export type { Ap2EnvelopeIssueInput, Ap2EnvelopeVerifyResult } from './ap2-envelope.js';

export { generateES256KeyPair } from './keys.js';
export type { ES256KeyPair } from './keys.js';

export { hasher, saltGenerator, es256Signer, es256Verifier, cnfKbVerifier, privateKeyFromJwk, publicKeyFromJwk } from './crypto.js';
export type { EcJwk } from './crypto.js';

export {
  AP2_VCT,
  AP2_CHECKOUT_CONSTRAINTS,
  AP2_PAYMENT_CONSTRAINTS,
} from './ap2.js';
export type {
  Ap2Vct,
  Ap2Merchant,
  Ap2Amount,
  Ap2PaymentInstrument,
  Ap2Pisp,
  Ap2PaymentMandatePayload,
  Ap2PaymentConstraint,
  Ap2OpenPaymentMandatePayload,
  Ap2CheckoutMandatePayload,
} from './ap2.js';
