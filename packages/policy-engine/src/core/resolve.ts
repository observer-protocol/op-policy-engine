import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { guardedFetch } from './url-guard.js';
import { join } from 'node:path';
import { sha256 } from './crypto.js';

// did:web resolution + refresh-first cached fetch.
//
// Cache policy (ratified, documented in README — not a quiet default):
// every remote fetch is attempted first within its timeout; on failure the
// cached copy is served only if younger than the configured staleness
// window; anything older DENIES upstream.

export interface CachedFetchResult {
  body: string;
  fresh: boolean;
  ageHours: number;
  note?: string;
}

export function didWebToUrl(did: string): string {
  if (!did.startsWith('did:web:')) throw new Error(`not a did:web DID: ${did}`);
  const rest = did.slice('did:web:'.length);
  const parts = rest.split(':').map((p) => decodeURIComponent(p));
  const host = parts[0];
  if (!host) throw new Error(`malformed did:web DID: ${did}`);
  // https ALWAYS. The did:web spec's localhost allowance used to be honoured
  // here by downgrading to plain http for `localhost` / `127.0.0.1`, which put
  // an unencrypted loopback dial one credential away from an engine that also
  // dereferences credential-supplied URLs. The guard refuses loopback anyway,
  // so the downgrade bought nothing except a second door into the same room.
  // Local development uses config.offline.didDocumentPath, which is the
  // supported air-gapped/test path and needs no network at all.
  if (parts.length === 1) return `https://${host}/.well-known/did.json`;
  return `https://${host}/${parts.slice(1).join('/')}/did.json`;
}

// Every outbound dereference in this engine goes through the URL guard: scheme,
// address class, and a re-check on every redirect hop. See url-guard.ts for what
// it does and does not close.
async function fetchWithTimeout(url: string, timeoutMs: number, sanctionedOrigins?: readonly string[]): Promise<string> {
  return guardedFetch(url, timeoutMs, sanctionedOrigins ? { sanctionedOrigins } : {});
}

function cachePathFor(cacheDir: string, url: string): string {
  return join(cacheDir, sha256(url).toString('hex') + '.json');
}

/**
 * Refresh-first cached fetch. Throws with a deny-grade message when the
 * resource is unreachable AND the cache is missing or older than
 * maxStalenessHours.
 */
export async function cachedFetch(
  url: string,
  cacheDir: string,
  timeoutMs: number,
  maxStalenessHours: number,
  sanctionedOrigins?: readonly string[],
): Promise<CachedFetchResult> {
  mkdirSync(cacheDir, { recursive: true });
  const cachePath = cachePathFor(cacheDir, url);
  let fetchError: string | undefined;
  try {
    const body = await fetchWithTimeout(url, timeoutMs, sanctionedOrigins);
    writeFileSync(cachePath, JSON.stringify({ fetchedAt: new Date().toISOString(), url, body }));
    return { body, fresh: true, ageHours: 0 };
  } catch (e) {
    fetchError = (e as Error).message;
  }
  if (existsSync(cachePath)) {
    try {
      const cached = JSON.parse(readFileSync(cachePath, 'utf8')) as { fetchedAt: string; body: string };
      const ageHours = (Date.now() - Date.parse(cached.fetchedAt)) / 3_600_000;
      if (ageHours <= maxStalenessHours) {
        return {
          body: cached.body,
          fresh: false,
          ageHours,
          note: `refresh of ${url} failed (${fetchError}); served from cache aged ${ageHours.toFixed(1)}h (limit ${maxStalenessHours}h)`,
        };
      }
      throw new Error(
        `unreachable (${fetchError}) and cache is ${ageHours.toFixed(1)}h old, beyond the ${maxStalenessHours}h staleness window`,
      );
    } catch (e) {
      if ((e as Error).message.includes('staleness window')) throw e;
      throw new Error(`unreachable (${fetchError}) and cache unreadable: ${(e as Error).message}`);
    }
  }
  throw new Error(`unreachable (${fetchError}) and no cached copy exists`);
}

export interface VerificationMethodEntry {
  id: string;
  type?: string;
  controller?: string;
  publicKeyMultibase?: string;
}

export interface DidDocument {
  id: string;
  verificationMethod?: VerificationMethodEntry[];
  assertionMethod?: Array<string | VerificationMethodEntry>;
}

/**
 * Derive a DID document for a did:key DID in-memory per the did:key spec.
 * No network access required — the public key is embedded in the DID string.
 * The verificationMethod id uses the canonical did:key fragment (same as the
 * multibase key identifier).
 */
export function resolveDidKeyDocument(did: string): DidDocument {
  if (!did.startsWith('did:key:')) throw new Error(`not a did:key DID: ${did}`);
  const keyId = did.slice('did:key:'.length);
  if (!keyId.startsWith('z')) {
    throw new Error(`did:key must use multibase base58btc (z prefix): ${did}`);
  }
  const vmId = `${did}#${keyId}`;
  return {
    id: did,
    verificationMethod: [{ id: vmId, type: 'Multikey', controller: did, publicKeyMultibase: keyId }],
    assertionMethod: [vmId],
  };
}

/**
 * Resolve a DID document. Dispatches by DID method:
 *   did:key  — derived in-memory from the key material (no network, offlinePath ignored)
 *   did:web  — offline override file when configured, otherwise HTTPS with refresh-first caching
 */
export async function resolveDidDocument(
  did: string,
  opts: {
    cacheDir: string;
    timeoutMs: number;
    maxStalenessHours: number;
    offlinePath?: string;
  },
): Promise<{ doc: DidDocument; note?: string }> {
  if (did.startsWith('did:key:')) {
    return { doc: resolveDidKeyDocument(did) };
  }
  if (opts.offlinePath) {
    const doc = JSON.parse(readFileSync(opts.offlinePath, 'utf8')) as DidDocument;
    return { doc, note: `issuer DID document loaded from offline override ${opts.offlinePath}` };
  }
  const url = didWebToUrl(did);
  const res = await cachedFetch(url, opts.cacheDir, opts.timeoutMs, opts.maxStalenessHours);
  const doc = JSON.parse(res.body) as DidDocument;
  return { doc, note: res.note };
}

/**
 * Select the verification method named by `vmId`, requiring it to be
 * assertionMethod-valid on the DID document. A key merely present in
 * verificationMethod but absent from assertionMethod is REJECTED — this is
 * the wrongful-acceptance case strict W3C verification exists to prevent.
 */
export function findAssertionMethodKey(
  doc: DidDocument,
  vmId: string,
): { entry: VerificationMethodEntry } {
  const assertion = doc.assertionMethod ?? [];
  const referenced = assertion.find((a) => (typeof a === 'string' ? a === vmId : a.id === vmId));
  if (!referenced) {
    throw new Error(
      `verification method ${vmId} is not listed in assertionMethod on ${doc.id} — refusing (mis-scoped or non-assertion key)`,
    );
  }
  if (typeof referenced !== 'string') return { entry: referenced };
  const entry = (doc.verificationMethod ?? []).find((vm) => vm.id === vmId);
  if (!entry) {
    throw new Error(`assertionMethod references ${vmId} but no matching verificationMethod entry exists`);
  }
  return { entry };
}
