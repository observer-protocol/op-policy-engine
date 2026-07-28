// URL guard conformance.
//
// Enumerate the surface, then assert the control covers all of it: every
// address class the guard claims to refuse gets a case, and the public case
// gets one too, because a guard that refuses everything is not a guard.
//
// Deliberately literal-only where possible. blockedAddressReason is pure, so
// these cases need no network and cannot go green because a DNS server was
// unreachable.
import { blockedAddressReason, assertFetchableUrl, didWebOrigin, ObserverUrlRefusedError } from '../dist/index.mjs';

let pass = 0, fail = 0;
const failures = [];
function assert(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(`${name}${detail ? ': ' + detail : ''}`); console.log(`  FAIL  ${name}  <<< ${detail}`); }
}

console.log('\n── blocked address classes (the surface the guard claims to cover) ──');

const MUST_BLOCK = [
  ['0.0.0.0', 'unspecified'],
  ['10.1.2.3', 'RFC1918 /8'],
  ['100.64.0.1', 'CGNAT'],
  ['100.127.255.255', 'CGNAT upper edge'],
  ['127.0.0.1', 'loopback'],
  ['169.254.169.254', 'link-local, cloud metadata'],
  ['172.16.0.1', 'RFC1918 /12 lower edge'],
  ['172.31.255.255', 'RFC1918 /12 upper edge'],
  ['192.0.0.1', 'IETF protocol assignments'],
  ['192.168.1.1', 'RFC1918 /16'],
  ['198.18.0.1', 'benchmarking'],
  ['192.0.2.5', 'TEST-NET-1 documentation'],
  ['198.51.100.5', 'TEST-NET-2 documentation'],
  ['203.0.113.5', 'TEST-NET-3 documentation'],
  ['192.88.99.1', 'deprecated 6to4 anycast'],
  ['224.0.0.1', 'multicast'],
  ['255.255.255.255', 'reserved /4'],
  ['::1', 'IPv6 loopback'],
  ['::', 'IPv6 unspecified'],
  ['fe80::1', 'IPv6 link-local'],
  ['fd00::1', 'IPv6 ULA'],
  ['ff02::1', 'IPv6 multicast'],
  ['::ffff:169.254.169.254', 'IPv4-mapped metadata address'],
  ['::ffff:127.0.0.1', 'IPv4-mapped loopback'],
  ['64:ff9b::1', 'NAT64 prefix'],
];
for (const [addr, label] of MUST_BLOCK) {
  const why = blockedAddressReason(addr);
  assert(`blocks ${addr} (${label})`, typeof why === 'string' && why !== 'not a recognizable IP literal', `got ${JSON.stringify(why)}`);
}

console.log('\n── public addresses must NOT be blocked (a guard that refuses everything is not a guard) ──');
for (const addr of ['8.8.8.8', '1.1.1.1', '104.16.0.1', '2606:4700::1111', '172.32.0.1', '100.63.255.255', '192.0.1.1', '192.0.3.1', '198.52.100.1', '203.1.113.1', '192.89.99.1']) {
  assert(`allows public ${addr}`, blockedAddressReason(addr) === null, `got ${JSON.stringify(blockedAddressReason(addr))}`);
}

console.log('\n── scheme and host refusal at the URL layer ──');

async function refuses(name, url, fragment) {
  try {
    await assertFetchableUrl(url);
    assert(name, false, 'expected refusal, got acceptance');
  } catch (e) {
    const isGuard = e instanceof ObserverUrlRefusedError;
    const matches = !fragment || e.message.toLowerCase().includes(fragment.toLowerCase());
    assert(name, isGuard && matches, isGuard ? `message lacks ${JSON.stringify(fragment)}: ${e.message}` : `wrong error type: ${e.name}`);
  }
}

await refuses('refuses file:', 'file:///etc/passwd', 'not http');
await refuses('refuses data:', 'data:text/plain,hi', 'not http');
await refuses('refuses gopher:', 'gopher://example.com/', 'not http');
await refuses('refuses a non-URL', 'not a url at all', 'not a parseable');
await refuses('refuses literal loopback host', 'http://127.0.0.1/x', 'loopback');
await refuses('refuses literal metadata host', 'http://169.254.169.254/latest/meta-data/', 'link-local');
await refuses('refuses bracketed IPv6 loopback', 'http://[::1]/x', 'loopback');
await refuses('refuses localhost by name', 'http://localhost:8080/x', 'localhost');
await refuses('refuses a .localhost name', 'https://evil.localhost/x', 'localhost');
await refuses('refuses RFC1918 literal', 'https://10.0.0.5/status.json', 'RFC1918');

console.log('\n── did:web origin derivation (the status-list pin depends on it) ──');
assert('did:web maps to https origin', didWebOrigin('did:web:observerprotocol.org') === 'https://observerprotocol.org',
  `got ${didWebOrigin('did:web:observerprotocol.org')}`);
assert('did:web with a path keeps only the host',
  didWebOrigin('did:web:observerprotocol.org:agents:maxi-0001') === 'https://observerprotocol.org',
  `got ${didWebOrigin('did:web:observerprotocol.org:agents:maxi-0001')}`);
assert('did:key has no origin to pin', didWebOrigin('did:key:z6Mkabc') === null);
assert('non-DID input yields null', didWebOrigin('https://example.com') === null);

console.log(`\nurl-guard: ${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
