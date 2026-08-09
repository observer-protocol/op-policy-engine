import type { ObserverDelegationCredential, VerifierConfig } from './types.js';

// Structural validation derived from schemas/delegation/v2.1.json.
//
// ─── STANDING CONSTRAINT. DO NOT "TIDY THIS UP" INTO SCHEMA VALIDATION. ──────────────
//
// THIS VERIFIER DELIBERATELY DOES NOT SCHEMA-VALIDATE THE `proof` BLOCK, and that
// deviation is LOAD-BEARING rather than technical debt. It validates the credential
// BODY against the v2.1 structure and verifies the proof CRYPTOGRAPHICALLY per W3C VC
// Data Integrity (eddsa-jcs-2022).
//
// WHY, MEASURED 2026-08-09 ACROSS THE WHOLE CORPUS. Delegation schemas v2, v2.1 and
// v2.3 pin `proof.type` to the constant "Ed25519Signature2026". That name is NOT a
// registered W3C cryptosuite: it was fabricated, and the signing construction behind it
// omitted the SHA-256 hashing step and the proofConfig contribution, leaving a real
// malleability gap. It was removed across eight emitters by observer-protocol-api
// commit f251ec6, which replaced it with the registered standard. v2.4 onward pin
// `DataIntegrityProof` + `eddsa-jcs-2022` correctly.
//
// THE SCHEMAS CANNOT BE FIXED. Published schema URLs are immutable under
// aip/SCHEMA_POLICY.md; the bytes at a URL never change. So three URLs require a
// fabricated proof type FOREVER, and every credential that cites one and carries the
// CORRECTED proof fails the schema it declares.
//
// THE NUMBERS, so nobody has to re-derive them before deciding:
//   127 pre-v2.5 delegation credentials in the estate
//   104 fail the schema they themselves cite
//   102 of those fail on `/proof/type must be equal to constant` and nothing else
//    13 of 13 credentials citing v2.4 CONFORM  <- the control: conformance tracks the
//                                                 cited VERSION, not the issuer
//
// SO: schema-validating the proof block here would reject 102 credentials whose proofs
// are cryptographically valid and whose suite is the CORRECT one. They are more correct
// than their own declarations, permanently. This deviation is the only reason they
// verify at all.
//
// The tidy-up is attractive and the person who attempts it will have good reasons:
// "the schema is the contract", "we validate everything else against it", "this is an
// inconsistency". All true. It still breaks the entire delegation corpus. If you are
// here to remove it, the thing to change is not this file — it is whether anything is
// ever expected to schema-validate a v2/v2.1/v2.3 proof block, and the answer recorded
// here is no.
//
// Full derivation: op-at-specs/2026-08-09-the-104-and-the-working-revocation-path.md §3.
// See also KNOWN-LIMITS.md, "The proof block is verified cryptographically, never
// schema-validated".

const W3C_VC_V2_CONTEXT = 'https://www.w3.org/ns/credentials/v2';

export function validateStructure(
  cred: ObserverDelegationCredential,
  config: VerifierConfig,
): { ok: true } | { ok: false; reason: string } {
  const fail = (reason: string) => ({ ok: false as const, reason: `structure: ${reason}` });

  if (!Array.isArray(cred['@context']) || !cred['@context'].includes(W3C_VC_V2_CONTEXT)) {
    return fail(`@context must include ${W3C_VC_V2_CONTEXT}`);
  }
  if (typeof cred.id !== 'string' || !(cred.id.startsWith('https://') || cred.id.startsWith('urn:uuid:'))) {
    return fail('id must be an https: or urn:uuid: URI');
  }
  if (!Array.isArray(cred.type) || !cred.type.includes('VerifiableCredential') || cred.type.length < 2) {
    return fail('type must be an array containing VerifiableCredential plus a concrete type');
  }
  if (typeof cred.issuer !== 'string' || !/^did:[a-z]+:.+/.test(cred.issuer)) {
    return fail('issuer must be a DID string');
  }
  if (cred.issuer !== config.issuerDid) {
    return fail(`issuer ${cred.issuer} does not match the pinned trusted issuer ${config.issuerDid}`);
  }
  if (typeof cred.validFrom !== 'string' || typeof cred.validUntil !== 'string') {
    return fail('validFrom and validUntil are required');
  }

  const schemaRef = cred.credentialSchema;
  if (!schemaRef || schemaRef.type !== 'JsonSchema' || typeof schemaRef.id !== 'string') {
    return fail('credentialSchema must be { id, type: "JsonSchema" }');
  }
  if (!config.schemaAllowlist.includes(schemaRef.id)) {
    return fail(
      `credentialSchema.id ${schemaRef.id} is not in the schema allowlist [${config.schemaAllowlist.join(', ')}]`,
    );
  }

  const subject = cred.credentialSubject;
  if (!subject || typeof subject !== 'object') return fail('credentialSubject missing');
  if (typeof subject.id !== 'string' || !/^did:[a-z]+:.+/.test(subject.id)) {
    return fail('credentialSubject.id must be a DID');
  }
  if (config.agentDid && subject.id !== config.agentDid) {
    return fail(`credentialSubject.id ${subject.id} does not match the pinned agent DID ${config.agentDid}`);
  }
  if (!subject.actionScope || typeof subject.actionScope !== 'object') {
    return fail('credentialSubject.actionScope is required');
  }
  if (!subject.delegationScope || typeof subject.delegationScope.may_delegate_further !== 'boolean') {
    return fail('credentialSubject.delegationScope.may_delegate_further is required');
  }
  if (subject.enforcementMode !== 'protocol_native' && subject.enforcementMode !== 'pre_transaction_check') {
    return fail('credentialSubject.enforcementMode must be protocol_native or pre_transaction_check');
  }
  if (subject.authorizationLevel) {
    const levelKey = { 'one-time': 'oneTime', recurring: 'recurring', policy: 'policy' }[subject.authorizationLevel];
    if (!levelKey) return fail(`unknown authorizationLevel ${String(subject.authorizationLevel)}`);
    const cfg = subject.authorizationConfig as Record<string, unknown> | undefined;
    if (!cfg || typeof cfg !== 'object' || !cfg[levelKey]) {
      return fail(`authorizationLevel ${subject.authorizationLevel} requires authorizationConfig.${levelKey}`);
    }
  }

  if (cred.credentialStatus !== undefined && !Array.isArray(cred.credentialStatus)) {
    return fail('credentialStatus must be an array of BitstringStatusListEntry when present');
  }

  return { ok: true };
}

export function checkValidityWindow(
  cred: ObserverDelegationCredential,
  nowMs: number,
): { ok: true } | { ok: false; reason: string } {
  const from = Date.parse(cred.validFrom);
  const until = Date.parse(cred.validUntil);
  if (Number.isNaN(from) || Number.isNaN(until)) {
    return { ok: false, reason: 'validity: validFrom/validUntil are not parseable timestamps' };
  }
  if (nowMs < from) return { ok: false, reason: `validity: credential not yet valid (validFrom ${cred.validFrom})` };
  if (nowMs > until) return { ok: false, reason: `validity: credential expired (validUntil ${cred.validUntil})` };
  return { ok: true };
}
