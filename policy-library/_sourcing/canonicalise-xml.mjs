#!/usr/bin/env node
/**
 * A canonicalisation for pinning retrieved XML, and a digest over it.
 *
 * ─── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────────────
 *
 * legislation.gov.uk does not serialise XML attributes in a stable order. Measured 2026-08-23:
 * regulations 67, 74, 75 and 76 each returned IDENTICAL BYTE COUNTS AND THREE DIFFERENT sha256
 * digests across three request shapes from one host. The content was identical every time; only the
 * attribute order inside `ukm:UnappliedEffect` and its siblings moved.
 *
 * So a sha256 over a response body pins THE BYTES A PARTICULAR CLIENT RECEIVED, not the document.
 * Where a server serialises non-deterministically those are different things, and only a
 * canonicalisation makes the pin a claim about content.
 *
 * ─── WHAT IT NORMALISES ─────────────────────────────────────────────────────────────────────────
 *
 *   ATTRIBUTE ORDER within every element, sorted by attribute name.
 *
 * ─── WHAT IT DELIBERATELY DOES NOT ──────────────────────────────────────────────────────────────
 *
 * Everything else, and the omissions are choices rather than oversights:
 *
 *   WHITESPACE between elements is NOT collapsed. In mixed content it is significant, and a
 *     canonicaliser that cannot tell mixed from element content would silently alter text.
 *   NAMESPACE PREFIXES are NOT rewritten to a canonical form. Doing it properly needs a real XML
 *     parser; doing it with a regex would change text that merely looks like a prefix.
 *   ATTRIBUTE VALUES are NOT normalised: no entity expansion, no whitespace folding, no case
 *     changes. A value that differs is a document that differs.
 *   ELEMENT ORDER is NOT touched. Order is meaning in a legal instrument.
 *   THE XML DECLARATION AND DOCTYPE are left exactly as served.
 *
 * This is deliberately NOT C14N. C14N would be the right answer if a parser were in scope; this is
 * the smallest normalisation that closes the ONE instability actually observed, and it says so
 * rather than implying more. If a second instability appears, this file is where it gets recorded.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const TAG = /<([A-Za-z_:][-\w:.]*)((?:\s+[^\s=/>]+="[^"]*")*)(\s*\/?)>/g;

export function canonicaliseXml(text) {
  return text.replace(TAG, (_m, name, attrs, close) => {
    const pairs = [...attrs.matchAll(/([^\s=/>]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]);
    pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return `<${name}${pairs.map(([k, v]) => ` ${k}="${v}"`).join('')}${close}>`;
  });
}

export function documentDigest(text) {
  return createHash('sha256').update(canonicaliseXml(text), 'utf8').digest('hex');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of process.argv.slice(2)) {
    const raw = readFileSync(f);
    const text = raw.toString('utf8');
    console.log(`${f}`);
    console.log(`  bytes            ${raw.length}`);
    console.log(`  fetch digest     sha256:${createHash('sha256').update(raw).digest('hex')}`);
    console.log(`  document digest  sha256:${documentDigest(text)}   <- pin this`);
  }
}
