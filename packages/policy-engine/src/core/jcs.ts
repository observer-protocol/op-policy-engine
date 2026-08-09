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
 * someone chose, and collapsing them would sign bytes that say something the caller did not. */
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
