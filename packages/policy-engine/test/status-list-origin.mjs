// Status-list origin policy: what must be REFUSED, and what must still PASS.
//
// Written before the implementation, deliberately. The URL guard shipped with
// must-still-pass cases and its over-block was caught in minutes by its own
// tests. The origin pin shipped without them and its over-refusal took two days
// and a downstream package to surface. Same author, same day, same class of
// control. This file is the difference.
//
// The property under test is NOT "off-origin is refused". It is:
//
//   a credential-supplied status-list URL is dereferenced only when it is
//   origin-pinned to a did:web issuer OR explicitly allowlisted by the
//   deploying operator, with the allowlist empty by default
//
// which has a permitted half. Every case below states which half it is in.
import { statusListOriginDecision } from '../dist/index.mjs';

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(`${name}${detail ? ': ' + detail : ''}`); console.log(`  FAIL  ${name}  <<< ${detail}`); }
}

const WEB = 'did:web:issuer.example';
const KEY = 'did:key:z6MkabcDEF';

function allowed(issuer, url, allowlist) {
  return statusListOriginDecision(issuer, url, allowlist ?? []).ok;
}
function reason(issuer, url, allowlist) {
  const d = statusListOriginDecision(issuer, url, allowlist ?? []);
  return d.ok ? '' : d.reason;
}

console.log('\n── MUST STILL PASS (the half that over-refusal breaks) ──');

check('did:web, same origin, no configuration needed',
  allowed(WEB, 'https://issuer.example/status/1'));
check('did:web, same origin with a port, unconfigured',
  allowed('did:web:issuer.example%3A8443', 'https://issuer.example:8443/status/1'));
check('did:web with a path, origin is the host only',
  allowed('did:web:issuer.example:agents:maxi-0001', 'https://issuer.example/status/1'));
check('did:web, OFF-origin CDN, explicitly allowlisted (the deployment shape the strict pin made impossible)',
  allowed(WEB, 'https://cdn.example.net/lists/1', ['https://cdn.example.net']));
check('did:key, allowlisted origin (no document to pin against)',
  allowed(KEY, 'https://lists.example.org/1', ['https://lists.example.org']));
check('did:web, local test server, allowlisted',
  allowed(WEB, 'http://127.0.0.1:62104/status', ['http://127.0.0.1:62104']));
check('allowlist with several entries, one matches',
  allowed(WEB, 'https://b.example/1', ['https://a.example', 'https://b.example']));

console.log('\n── MUST REFUSE ──');

check('did:web, off-origin, allowlist EMPTY (default posture unchanged)',
  !allowed(WEB, 'https://evil.example/1'));
check('did:key, allowlist EMPTY (no origin to pin, nothing permitted)',
  !allowed(KEY, 'https://lists.example.org/1'));
check('did:web, off-origin, allowlist present but does not match',
  !allowed(WEB, 'https://evil.example/1', ['https://cdn.example.net']));
check('allowlist matches on origin, not on prefix (evil.example.net must not match evil.example)',
  !allowed(WEB, 'https://evil.example.net.attacker.test/1', ['https://evil.example.net']));
check('scheme is part of the origin: http does not satisfy an https allowlist entry',
  !allowed(WEB, 'http://cdn.example.net/1', ['https://cdn.example.net']));
check('port is part of the origin: 8443 does not satisfy a bare-host entry',
  !allowed(WEB, 'https://cdn.example.net:8443/1', ['https://cdn.example.net']));
check('unparseable URL refuses rather than throwing',
  !allowed(WEB, 'not a url'));

console.log('\n── the denial must be actionable ──');
const r = reason(WEB, 'https://cdn.example.net/1');
check('names the refused origin', r.includes('https://cdn.example.net'), r);
check('names the pinned issuer origin', r.includes('https://issuer.example'), r);
check('names the config key that would permit it', r.includes('statusListOriginAllowlist'), r);
const rk = reason(KEY, 'https://lists.example.org/1');
check('did:key denial explains there is no origin to pin', /did:key|no origin/i.test(rk), rk);

console.log(`\nstatus-list-origin: ${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
