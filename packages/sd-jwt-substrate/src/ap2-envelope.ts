// The AP2 reference SDK's on-wire root-token shape — discovered against the
// SDK itself (code/sdk/python/ap2/sdk/sdjwt/sd_jwt.py + common.py), not the
// prose spec: mandate claims ride inside a `delegate_payload` ARRAY (one
// disclosure per element, RFC 9901 array-element disclosures), there is NO
// top-level iss and NO typ header, and issuer trust is a key handed to the
// verifier out-of-band (kid at most). That is a plain RFC 9901 SD-JWT, not an
// SD-JWT-VC — so these functions use the core instance, not the VC profile.
// The generic VC-profile issue/verify in sdjwt.ts stays for JWKS-discovery
// issuers; this module speaks the reference SDK's dialect for interop.

import { SDJwtInstance } from '@sd-jwt/core';
import { es256Signer, es256Verifier, hasher, privateKeyFromJwk, publicKeyFromJwk, saltGenerator, type EcJwk } from './crypto.js';

export interface Ap2EnvelopeIssueInput {
  /** The mandate claims (e.g. an Open Payment Mandate payload: vct, constraints, cnf, ...). */
  mandate: Record<string, unknown>;
  issuerPrivateJwk: EcJwk;
  /** kid for the protected header (their SDK stamps it when the JWK has one). */
  kid?: string;
}

/** Issue a root mandate token in the AP2 reference-SDK envelope:
 * `{ delegate_payload: [mandate] }` with the array element disclosable. */
export async function issueAp2MandateToken(input: Ap2EnvelopeIssueInput): Promise<string> {
  const instance = new SDJwtInstance<Record<string, unknown>>({
    signer: es256Signer(privateKeyFromJwk(input.issuerPrivateJwk)),
    signAlg: 'ES256',
    hasher,
    hashAlg: 'sha-256',
    saltGenerator,
  });
  return instance.issue(
    { delegate_payload: [input.mandate] },
    { delegate_payload: { _sd: [0] } } as never,
    input.kid ? { header: { kid: input.kid } } : undefined,
  );
}

export type Ap2EnvelopeVerifyResult =
  | { ok: true; mandate: Record<string, unknown> }
  | { ok: false; reason: string };

/** Verify a root AP2 reference-SDK mandate token against a known issuer key
 * and unwrap the mandate. Fail-closed: bad signature, missing/empty
 * delegate_payload, or a non-object element all reject. Root tokens only —
 * `~~`-joined delegation chains are a later layer. */
export async function verifyAp2MandateToken(token: string, issuerPublicJwk: EcJwk): Promise<Ap2EnvelopeVerifyResult> {
  try {
    if (token.includes('~~')) return { ok: false, reason: 'delegation chains (~~) not supported yet — root tokens only' };
    const instance = new SDJwtInstance<Record<string, unknown>>({
      verifier: es256Verifier(publicKeyFromJwk(issuerPublicJwk)),
      hasher,
      hashAlg: 'sha-256',
      saltGenerator,
    });
    const result = await instance.verify(token);
    const payload = result.payload as Record<string, unknown>;
    const dp = payload.delegate_payload;
    if (!Array.isArray(dp) || dp.length === 0) return { ok: false, reason: 'token carries no delegate_payload — not an AP2 mandate token' };
    const mandate = dp[0];
    if (mandate === null || typeof mandate !== 'object' || Array.isArray(mandate)) {
      return { ok: false, reason: 'delegate_payload[0] is not an object' };
    }
    return { ok: true, mandate: mandate as Record<string, unknown> };
  } catch (err) {
    return { ok: false, reason: `verification failed: ${(err as Error).message}` };
  }
}
