// RFC 8785 JSON Canonicalization Scheme.
//
// Inputs here are always values freshly parsed from JSON text, so numbers
// are finite and strings are well-formed; JSON.stringify's serialization of
// strings and numbers matches RFC 8785 (which defers to ECMAScript's
// JSON.stringify for primitives). Object members are sorted by UTF-16 code
// units, which is the default Array.prototype.sort() comparison.

export function jcsCanonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error('JCS: non-finite numbers are not representable in JSON');
    }
    if (value === undefined) {
      throw new Error('JCS: undefined is not representable in JSON');
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => jcsCanonicalize(v === undefined ? null : v)).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined) continue; // mirror JSON.stringify: undefined members are omitted
    parts.push(JSON.stringify(k) + ':' + jcsCanonicalize(v));
  }
  return '{' + parts.join(',') + '}';
}

export function jcsBytes(value: unknown): Buffer {
  return Buffer.from(jcsCanonicalize(value), 'utf8');
}

/** Drop `undefined` members, recursively, without touching `null`.
 *
 * MOVED HERE FROM `core/attestation-jcs.ts` IN rc.8, AND THE MOVE IS THE POINT. It is not a
 * canonicaliser and cannot produce bytes, so exporting it opens no door — but it lived in the
 * restricted module, and `decision-attestation.mjs` asserts that NOTHING in that module is reachable,
 * because a caller who reaches the restricted canonicaliser can sign with the wrong one and produce
 * bytes no other implementation reproduces.
 *
 * THE GUARD IS DRAWN AT THE MODULE RATHER THAN AT A LIST OF NAMES, which is what made this available:
 * the helper could be made public by MOVING it, instead of by narrowing a three-part assertion to two
 * and leaving the next function added to that file exported by default rather than by decision.
 *
 * `undefined` and `null` are different facts. An absent member is a field nobody set; `null` is a value
 * someone chose, and collapsing them would sign bytes that say something the caller did not.
 *
 * ─── WHY THIS EXISTS WHEN `canonicalise` ALREADY OMITS THEM ──────────────────────────────────────
 *
 * CARRIED HERE FROM THE PRE-rc.8 BLOCK IN `core/attestation-jcs.ts` WHEN THE BRANCH MERGED TO `main`
 * ON 2026-08-09. The rc.8 rewrite above explains WHERE this function lives and why moving it was how
 * to export it safely. It did not carry what the displaced block explained, which is WHAT IT DOES TO
 * BYTES — and that half is not recoverable from reading the code, while the placement half is visible
 * in the file tree. Git raised no conflict on this file, so nothing would have flagged the loss.
 *
 * `canonicalise` filters undefined OBJECT MEMBERS at the point it serialises them, so for a plain
 * object this is already equivalent. Two reasons it is still applied at the signing site:
 *
 *   1. ARRAYS. A hole or an explicit `undefined` inside an array is not filtered above — it reaches
 *      the type check and THROWS. This turns it into an omission, matching `JSON.stringify`.
 *   2. THE CONTRACT IS STATED WHERE IT IS RELIED ON. "An optional field left unset does not change
 *      the bytes" is a property signers and verifiers both depend on, and burying it in a filter
 *      inside the canonicaliser makes it something a reader has to go and discover.
 *
 * ─── ABSENT IS NOT PRESENT-BUT-EMPTY ─────────────────────────────────────────────────────────────
 *
 * This strips `undefined`. It does NOT strip `''`. A field left unset and a field set to the empty
 * string are DIFFERENT BYTES, deliberately: a bound that was never supplied and one supplied as blank
 * are different facts, and collapsing them would make an unsupplied limit indistinguishable from an
 * empty one.
 *
 * From the Sovereign claim bug: `title: principalTitle || undefined` made an OWN key whose value was
 * `undefined`, RFC 8785 has no encoding for it, and the whole claim died before any network call. */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.filter((v) => v !== undefined).map(stripUndefinedDeep) as unknown as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefinedDeep(v)]),
    ) as unknown as T;
  }
  return value;
}
