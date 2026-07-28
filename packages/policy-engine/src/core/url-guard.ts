import { lookup } from 'node:dns/promises';

// Outbound-fetch guard for URLs that come out of a credential.
//
// The engine dereferences two kinds of URL. The DID document URL is derived
// from config.issuerDid, which the operator pins, so it is operator-controlled.
// The status-list URL is `credentialStatus[].statusListCredential`, which is
// CREDENTIAL-controlled: whoever signs the credential chooses where every
// verifier that reads it will dial.
//
// Before this module, that URL went straight into fetch() with
// `redirect: 'follow'` and no validation, and the check that would catch a
// hostile list (issuer equality) ran on the RESPONSE BODY, after the request
// had already been made. So the guard could reject what came back and could
// not prevent the dial.
//
// Scope of the threat, stated rather than inflated: a credential must be signed
// by the pinned issuer to reach this code at all, because validateStructure
// rejects a foreign issuer first. So this is not "anyone can point us
// anywhere". It is "a credential from a trusted issuer picks an arbitrary URL
// that every verifier will dial, following redirects" -- a confused deputy,
// which matters most inside a hosted multi-tenant verifier whose issuer
// allowlist has more than one entry.
//
// KNOWN RESIDUAL, stated because a guard whose limits are unwritten is a
// caveat we did not earn: this module resolves the hostname and validates the
// addresses, then hands the URL to fetch(), which resolves again. A name that
// answers publicly on the first lookup and privately on the second is not
// closed by this. Closing it needs a connection-pinned lookup, which needs a
// dispatcher, which needs a runtime dependency this package deliberately does
// not have (dependencies: none, so every adapter bundles it with no transitive
// surface). The rebind window is narrow and the static cases -- a literal
// private address, a hostname whose only A record is 169.254.169.254 -- are
// closed. Do not describe this as DNS pinning.

export class ObserverUrlRefusedError extends Error {
  constructor(
    readonly url: string,
    readonly why: string,
  ) {
    super(`[url-guard] refusing to fetch ${url}: ${why}`);
    this.name = 'ObserverUrlRefusedError';
  }
}

// Prefix lengths matter here and getting one wrong fails in both directions:
// too wide refuses routable hosts, too narrow leaves a door open. The /24s below
// are third-octet tests for that reason -- an earlier draft matched 192.0.0.0/24
// on the first two octets, which silently refused all of 192.0.0.0/16, and the
// public-address cases in test/url-guard.mjs are what caught it.
function ipv4Blocked(a: number, b: number, c: number): string | null {
  if (a === 0) return 'unspecified/this-network 0.0.0.0/8';
  if (a === 10) return 'private RFC1918 10.0.0.0/8';
  if (a === 100 && b >= 64 && b <= 127) return 'CGNAT RFC6598 100.64.0.0/10';
  if (a === 127) return 'loopback 127.0.0.0/8';
  if (a === 169 && b === 254) return 'link-local RFC3927 169.254.0.0/16 (includes cloud metadata)';
  if (a === 172 && b >= 16 && b <= 31) return 'private RFC1918 172.16.0.0/12';
  if (a === 192 && b === 0 && c === 0) return 'IETF protocol assignments 192.0.0.0/24';
  if (a === 192 && b === 0 && c === 2) return 'documentation TEST-NET-1 192.0.2.0/24';
  if (a === 192 && b === 88 && c === 99) return 'deprecated 6to4 relay anycast 192.88.99.0/24';
  if (a === 192 && b === 168) return 'private RFC1918 192.168.0.0/16';
  if (a === 198 && (b === 18 || b === 19)) return 'benchmarking RFC2544 198.18.0.0/15';
  if (a === 198 && b === 51 && c === 100) return 'documentation TEST-NET-2 198.51.100.0/24';
  if (a === 203 && b === 0 && c === 113) return 'documentation TEST-NET-3 203.0.113.0/24';
  if (a >= 224 && a <= 239) return 'multicast 224.0.0.0/4';
  if (a >= 240) return 'reserved 240.0.0.0/4';
  return null;
}

/** Classify a literal address. Returns a reason string when the address must
 * not be dialled, or null when it is a routable public address. */
export function blockedAddressReason(addr: string): string | null {
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(addr);
  if (v4) {
    const o = v4.slice(1).map(Number);
    if (o.some((n) => n > 255)) return 'malformed IPv4 address';
    return ipv4Blocked(o[0] as number, o[1] as number, o[2] as number);
  }

  const v6 = addr.toLowerCase().replace(/^\[|\]$/g, '');
  if (!v6.includes(':')) return 'not a recognizable IP literal';

  // IPv4-mapped and IPv4-compatible forms carry a v4 address in the tail;
  // classify the embedded address rather than treating the wrapper as public.
  const embedded = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(v6);
  if (embedded) {
    const inner = blockedAddressReason(embedded[1] as string);
    if (inner) return `IPv6-embedded IPv4: ${inner}`;
  }

  if (v6 === '::1') return 'IPv6 loopback ::1';
  if (v6 === '::' || v6 === '::0') return 'IPv6 unspecified ::';
  const head = v6.split(':')[0] ?? '';
  const h = parseInt(head || '0', 16);
  if (head.length && (h & 0xffc0) === 0xfe80) return 'IPv6 link-local fe80::/10';
  if (head.length && (h & 0xfe00) === 0xfc00) return 'IPv6 unique-local fc00::/7';
  if (head.length && (h & 0xff00) === 0xff00) return 'IPv6 multicast ff00::/8';
  if (v6.startsWith('64:ff9b:')) return 'NAT64 well-known prefix 64:ff9b::/96';
  return null;
}

/** Validate one URL: scheme, then the host, resolving it if it is a name.
 * @throws ObserverUrlRefusedError */
export async function assertFetchableUrl(raw: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new ObserverUrlRefusedError(raw, 'not a parseable absolute URL');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new ObserverUrlRefusedError(raw, `scheme ${u.protocol} is not http(s)`);
  }

  const host = u.hostname;
  const literal = blockedAddressReason(host);
  if (literal !== null && literal !== 'not a recognizable IP literal') {
    throw new ObserverUrlRefusedError(raw, `host is a ${literal}`);
  }
  if (literal !== null) {
    // A name, not a literal. Resolve it and judge every answer: one private
    // record among public ones is enough to dial somewhere it should not.
    if (host.toLowerCase() === 'localhost' || host.toLowerCase().endsWith('.localhost')) {
      throw new ObserverUrlRefusedError(raw, 'host resolves to loopback by definition (localhost)');
    }
    let addrs: Array<{ address: string }>;
    try {
      addrs = await lookup(host, { all: true, verbatim: true });
    } catch (e) {
      throw new ObserverUrlRefusedError(raw, `host does not resolve (${(e as Error).message})`);
    }
    if (addrs.length === 0) throw new ObserverUrlRefusedError(raw, 'host resolves to no addresses');
    for (const { address } of addrs) {
      const why = blockedAddressReason(address);
      if (why !== null) throw new ObserverUrlRefusedError(raw, `host resolves to ${address}, a ${why}`);
    }
  }
}

/** Fetch with the guard applied to the initial URL and to EVERY redirect hop,
 * refusing an https-to-http downgrade. Redirects are followed manually because
 * `redirect: 'follow'` hands the hop decisions to the runtime, where nothing
 * can inspect them. */
export async function guardedFetch(url: string, timeoutMs: number, maxHops = 5): Promise<string> {
  let current = url;
  let wasHttps = new URL(url).protocol === 'https:';

  for (let hop = 0; hop <= maxHops; hop++) {
    await assertFetchableUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(current, { signal: controller.signal, redirect: 'manual' });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location');
      if (!next) throw new ObserverUrlRefusedError(current, `HTTP ${res.status} with no Location header`);
      const resolved = new URL(next, current);
      if (wasHttps && resolved.protocol === 'http:') {
        throw new ObserverUrlRefusedError(current, `redirect downgrades https to http (${resolved.href})`);
      }
      wasHttps = wasHttps || resolved.protocol === 'https:';
      current = resolved.href;
      continue;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }
  throw new ObserverUrlRefusedError(url, `more than ${maxHops} redirects`);
}

/** The origin a did:web issuer's own documents must live on, or null when the
 * issuer DID carries no domain (did:key). */
export function didWebOrigin(did: string): string | null {
  if (!did.startsWith('did:web:')) return null;
  const [host] = did.slice('did:web:'.length).split(':');
  if (!host) return null;
  return `https://${decodeURIComponent(host)}`;
}
