// ES256 (P-256) key generation and JWK export. `kid` is the RFC 7638 JWK
// thumbprint, computed by jose — stable, derived, never invented.

import { generateKeyPairSync } from 'node:crypto';
import { calculateJwkThumbprint } from 'jose';
import type { EcJwk } from './crypto.js';

export interface ES256KeyPair {
  /** Public JWK (kty/crv/x/y + kid). Safe to publish (JWKS, cnf). */
  publicJwk: EcJwk;
  /** Private JWK (includes d). NEVER commit or log; load from managed paths. */
  privateJwk: EcJwk;
  /** RFC 7638 thumbprint of the public JWK. */
  kid: string;
}

export async function generateES256KeyPair(): Promise<ES256KeyPair> {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const publicJwk = publicKey.export({ format: 'jwk' }) as unknown as EcJwk;
  const privateJwk = privateKey.export({ format: 'jwk' }) as unknown as EcJwk;
  const kid = await calculateJwkThumbprint(publicJwk as unknown as Parameters<typeof calculateJwkThumbprint>[0], 'sha256');
  publicJwk.kid = kid;
  privateJwk.kid = kid;
  return { publicJwk, privateJwk, kid };
}
