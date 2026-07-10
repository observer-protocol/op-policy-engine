// Issue / present / verify SD-JWT VCs (RFC 9901) with ES256 and RFC 7800 cnf
// key binding, in the AP2 profile: alg ES256, _sd_alg sha-256, compact
// `<JWT>~<disclosure>~...~<KB-JWT>` serialization. Thin, fail-closed wrappers
// over @sd-jwt/sd-jwt-vc — the audited library does the format work; this
// module pins the profile and turns every failure into {ok:false, reason}.

import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { decodeSdJwt } from '@sd-jwt/decode';
import type { DisclosureFrame, PresentationFrame } from '@sd-jwt/types';
import { cnfKbVerifier, es256Signer, es256Verifier, hasher, privateKeyFromJwk, publicKeyFromJwk, saltGenerator, type EcJwk } from './crypto.js';

/** Collect every SD digest referenced by a payload subtree: `_sd` arrays and
 * `{"...": digest}` array-element markers, at any depth. */
function collectDigests(node: unknown, into: Set<string>): void {
  if (Array.isArray(node)) {
    for (const el of node) collectDigests(el, into);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj._sd)) for (const d of obj._sd) if (typeof d === 'string') into.add(d);
  if (typeof obj['...'] === 'string') into.add(obj['...'] as string);
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_sd') continue;
    collectDigests(v, into);
  }
}

/** RFC 9901 strictness the underlying library relaxes: a disclosure whose
 * digest is referenced nowhere (payload or any disclosed value) means the
 * token was tampered with or malformed — MUST reject, never silently drop. */
async function assertNoUnmatchedDisclosures(token: string): Promise<string | null> {
  const decoded = await decodeSdJwt(token, hasher);
  if (decoded.disclosures.length === 0) return null;
  const referenced = new Set<string>();
  collectDigests(decoded.jwt.payload, referenced);
  for (const disc of decoded.disclosures) collectDigests(disc.value, referenced);
  for (const disc of decoded.disclosures) {
    const digest = await disc.digest({ hasher, alg: 'sha-256' });
    if (!referenced.has(digest)) {
      return `disclosure "${String(disc.key ?? '(array element)')}" is not referenced by any _sd digest — token tampered or malformed`;
    }
  }
  return null;
}

export interface IssueInput {
  /** Full claim set. Must carry `iss` and `vct`; carry `cnf: {jwk}` when the
   * credential binds a holder key (open mandates, user credentials). */
  payload: Record<string, unknown> & { iss: string; vct: string };
  /** Which claims are selectively disclosable (per RFC 9901 / @sd-jwt frame). */
  disclosureFrame?: DisclosureFrame<Record<string, unknown>>;
  /** Issuer's P-256 private JWK. */
  issuerPrivateJwk: EcJwk;
  /** kid to stamp into the protected header (JWKS lookup key). */
  kid?: string;
}

/** Issue an SD-JWT VC. Returns the compact serialization. */
export async function issueSdJwtVc(input: IssueInput): Promise<string> {
  const instance = new SDJwtVcInstance({
    signer: es256Signer(privateKeyFromJwk(input.issuerPrivateJwk)),
    signAlg: 'ES256',
    hasher,
    hashAlg: 'sha-256',
    saltGenerator,
  });
  return instance.issue(input.payload, input.disclosureFrame, input.kid ? { header: { kid: input.kid } } : undefined);
}

export interface PresentInput {
  /** The issued compact SD-JWT VC. */
  token: string;
  /** Claims to disclose. Omitted = disclose nothing optional. */
  presentationFrame?: PresentationFrame<Record<string, unknown>>;
  /** Holder's P-256 private JWK matching the credential's cnf.jwk. Present to
   * attach a KB-JWT (proof of possession). */
  holderPrivateJwk?: EcJwk;
  /** KB-JWT audience + nonce (both required when holderPrivateJwk is set). */
  kb?: { aud: string; nonce: string };
}

/** Present an SD-JWT VC, optionally with a KB-JWT proof of possession. */
export async function presentSdJwtVc(input: PresentInput): Promise<string> {
  const withKb = input.holderPrivateJwk !== undefined;
  if (withKb && !input.kb) throw new Error('kb {aud, nonce} is required when presenting with a holder key');
  const instance = new SDJwtVcInstance({
    hasher,
    hashAlg: 'sha-256',
    saltGenerator,
    ...(withKb
      ? { kbSigner: es256Signer(privateKeyFromJwk(input.holderPrivateJwk as EcJwk)), kbSignAlg: 'ES256' }
      : {}),
  });
  return instance.present(
    input.token,
    input.presentationFrame,
    withKb ? { kb: { payload: { aud: input.kb!.aud, nonce: input.kb!.nonce, iat: Math.floor(Date.now() / 1000) } } } : undefined,
  );
}

export type VerifyResult =
  | {
      ok: true;
      /** Disclosed claim set (issuer-signed payload with disclosed SD claims merged). */
      payload: Record<string, unknown>;
      /** KB-JWT payload when key binding was required and verified. */
      kb?: { aud: string; nonce: string; iat: number };
    }
  | { ok: false; reason: string };

export interface VerifyInput {
  token: string;
  /** Resolve the ISSUER's public JWK. Called with the token's iss and the
   * protected-header kid. Return undefined to refuse (fail-closed). This is
   * the trust decision — the substrate never resolves keys on its own. */
  resolveIssuerJwk: (iss: string, kid?: string) => Promise<EcJwk | undefined> | EcJwk | undefined;
  /** Require this exact vct. */
  expectedVct?: string;
  /** Require and verify a KB-JWT bound to the credential's cnf.jwk, with this
   * exact aud + nonce. */
  requireKeyBinding?: { aud: string; nonce: string };
  /** Clock for validity checks (ms). Defaults to now. */
  nowMs?: number;
}

const b64json = (part: string): Record<string, unknown> => JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;

/** Verify an SD-JWT VC, fail-closed. Checks: issuer signature (against the
 * caller-resolved key), disclosure integrity (_sd digests, via the library),
 * vct pin, iat/exp window, and — when required — the cnf key binding with
 * exact aud/nonce match. */
export async function verifySdJwtVc(input: VerifyInput): Promise<VerifyResult> {
  try {
    // Peek at header/payload (unverified) ONLY to pick the trust key; every
    // claim is re-established by the library against that key afterwards.
    const jwtPart = input.token.split('~')[0] ?? '';
    const [headerB64, payloadB64] = jwtPart.split('.');
    if (!headerB64 || !payloadB64) return { ok: false, reason: 'not a compact SD-JWT' };
    const header = b64json(headerB64);
    const unverified = b64json(payloadB64);
    if (header.alg !== 'ES256') return { ok: false, reason: `alg "${String(header.alg)}" rejected — AP2 pins ES256` };
    const iss = typeof unverified.iss === 'string' ? unverified.iss : undefined;
    if (!iss) return { ok: false, reason: 'token carries no iss' };

    const issuerJwk = await input.resolveIssuerJwk(iss, typeof header.kid === 'string' ? header.kid : undefined);
    if (!issuerJwk) return { ok: false, reason: `issuer "${iss}" not trusted (no key resolved) — refusing` };

    const instance = new SDJwtVcInstance({
      verifier: es256Verifier(publicKeyFromJwk(issuerJwk)),
      hasher,
      hashAlg: 'sha-256',
      saltGenerator,
      kbVerifier: cnfKbVerifier(),
      // vct type-metadata fetching stays OFF: no network in the verify path.
      loadTypeMetadataFormat: false,
    });

    const unmatched = await assertNoUnmatchedDisclosures(input.token);
    if (unmatched) return { ok: false, reason: unmatched };

    const result = await instance.verify(input.token, undefined, input.requireKeyBinding !== undefined);
    const payload = result.payload as Record<string, unknown>;

    if (input.expectedVct !== undefined && payload.vct !== input.expectedVct) {
      return { ok: false, reason: `vct "${String(payload.vct)}" does not match required "${input.expectedVct}"` };
    }

    const nowSec = Math.floor((input.nowMs ?? Date.now()) / 1000);
    if (typeof payload.exp === 'number' && payload.exp <= nowSec) return { ok: false, reason: `token expired at ${payload.exp}` };
    if (typeof payload.nbf === 'number' && payload.nbf > nowSec) return { ok: false, reason: `token not valid before ${payload.nbf}` };

    if (input.requireKeyBinding) {
      const kb = (result as { kb?: { payload: { aud: string; nonce: string; iat: number } } }).kb;
      if (!kb) return { ok: false, reason: 'key binding required but no KB-JWT present' };
      if (kb.payload.aud !== input.requireKeyBinding.aud) return { ok: false, reason: `KB-JWT aud "${kb.payload.aud}" does not match expected` };
      if (kb.payload.nonce !== input.requireKeyBinding.nonce) return { ok: false, reason: 'KB-JWT nonce does not match expected' };
      return { ok: true, payload, kb: kb.payload };
    }
    return { ok: true, payload };
  } catch (err) {
    return { ok: false, reason: `verification failed: ${(err as Error).message}` };
  }
}
