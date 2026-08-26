// SYNTHETIC CORPUS TOOLING. Shared helpers for the SRF SCALE corpus: a JCS canonicaliser (RFC 8785,
// the subset this corpus's values need: objects, arrays, strings, finite numbers, booleans, null),
// base58btc, did:key for Ed25519, and the eddsa-jcs-2022 hash construction. The VERIFIER does not
// use this file's JCS: it uses the published @observer-protocol/policy-engine's jcsBytes, so the
// canonicalisation used to sign is checked by an implementation this session did not write.
import { createHash } from 'node:crypto';

export function jcs(value) {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('jcs: non-finite number'); return JSON.stringify(value); }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map((v) => (v === undefined ? 'null' : jcs(v))).join(',') + ']';
  if (typeof value === 'object') {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + jcs(value[k])).join(',') + '}';
  }
  throw new Error(`jcs: unsupported type ${typeof value}`);
}
export const sha256hex = (s) => createHash('sha256').update(s).digest('hex');
export const sha256 = (b) => createHash('sha256').update(b).digest();

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58Encode(bytes) {
  let n = 0n; for (const b of bytes) n = n * 256n + BigInt(b);
  let out = ''; while (n > 0n) { out = ALPHABET[Number(n % 58n)] + out; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; out = '1' + out; }
  return out;
}
export function didKeyFromRawEd25519(raw32) {
  if (raw32.length !== 32) throw new Error('did:key: raw Ed25519 public key must be 32 bytes');
  const mb = 'z' + base58Encode(Buffer.concat([Buffer.from([0xed, 0x01]), raw32]));
  return { did: `did:key:${mb}`, verificationMethod: `did:key:${mb}#${mb}`, publicKeyMultibase: mb };
}
/** eddsa-jcs-2022 hashData = sha256(jcs(proofConfig)) || sha256(jcs(documentWithoutProof)). */
export function eddsaJcs2022HashData(documentNoProof, proofConfig) {
  return Buffer.concat([sha256(jcs(proofConfig)), sha256(jcs(documentNoProof))]);
}
export const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const setPath = (o, path, v) => {
  const ks = path.split('.'); let c = o;
  for (let i = 0; i < ks.length - 1; i++) c = (c[ks[i]] ??= {});
  if (v === undefined) delete c[ks[ks.length - 1]]; else c[ks[ks.length - 1]] = v;
};
export const getPath = (o, path) => { let c = o; for (const k of path.split('.')) { if (c === null || c === undefined) return undefined; c = c[k]; } return c; };
export const clone = (o) => JSON.parse(JSON.stringify(o));
/** Apply a corpus delta {set, unset} to a clone of base. `set` values are JSON (null is a value); `unset` removes the key. */
export function applyDelta(base, delta) {
  const f = clone(base);
  for (const [p, v] of Object.entries(delta.set ?? {})) setPath(f, p, v);
  for (const p of delta.unset ?? []) setPath(f, p, undefined);
  return f;
}
