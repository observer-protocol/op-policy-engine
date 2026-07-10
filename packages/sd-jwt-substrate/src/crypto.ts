// ES256/P-256 + SHA-256 primitives behind the pluggable callbacks
// @sd-jwt/core expects. All signing/verifying is node:crypto (ieee-p1363
// signatures, the raw r||s form JWS requires); jose is used for JWK
// thumbprints (kid derivation). Nothing here is hand-rolled crypto — this
// file only adapts vetted primitives to the SD-JWT callback shapes.

import { createHash, createPrivateKey, createPublicKey, randomBytes, sign as nodeSign, verify as nodeVerify, type KeyObject } from 'node:crypto';
import type { Signer, Verifier, KbVerifier, JwtPayload } from '@sd-jwt/types';

export type EcJwk = {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
  d?: string;
  kid?: string;
  alg?: string;
  [k: string]: unknown;
};

/** SHA-256 hasher in the @sd-jwt Hasher shape. Only sha-256 is accepted:
 * AP2 pins `_sd_alg` to sha-256, so any other alg is a spec violation. */
export function hasher(data: string | ArrayBuffer, alg: string): Uint8Array {
  if (alg !== 'sha-256' && alg !== 'SHA-256') {
    throw new Error(`unsupported hash alg "${alg}" — this substrate pins sha-256 (AP2 _sd_alg)`);
  }
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  return new Uint8Array(createHash('sha256').update(buf).digest());
}

export function saltGenerator(length: number): string {
  return randomBytes(length).toString('base64url');
}

export function privateKeyFromJwk(jwk: EcJwk): KeyObject {
  if (!jwk.d) throw new Error('JWK carries no private component (d)');
  return createPrivateKey({ key: jwk as unknown as object, format: 'jwk' });
}

export function publicKeyFromJwk(jwk: EcJwk): KeyObject {
  const { d: _d, ...pub } = jwk;
  return createPublicKey({ key: pub as unknown as object, format: 'jwk' });
}

/** ES256 signer callback over a P-256 private key. */
export function es256Signer(privateKey: KeyObject): Signer {
  return (data: string) =>
    nodeSign('sha256', Buffer.from(data, 'utf8'), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
}

/** ES256 verifier callback pinned to ONE known public key. */
export function es256Verifier(publicKey: KeyObject): Verifier {
  return (data: string, sig: string) =>
    nodeVerify('sha256', Buffer.from(data, 'utf8'), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url'));
}

/** RFC 7800 cnf key-binding verifier: the KB-JWT must be signed by the private
 * key matching the `cnf.jwk` carried in the (already issuer-verified) SD-JWT
 * payload. Anything missing or malformed verifies false — never a bypass. */
export function cnfKbVerifier(): KbVerifier {
  return (data: string, sig: string, payload: JwtPayload) => {
    const cnf = (payload as { cnf?: { jwk?: EcJwk } }).cnf;
    const jwk = cnf?.jwk;
    if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256') return false;
    try {
      return nodeVerify('sha256', Buffer.from(data, 'utf8'), { key: publicKeyFromJwk(jwk), dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url'));
    } catch {
      return false;
    }
  };
}
