// JCS canonicalisation (RFC 8785), RESTRICTED TO THE DECISION-ATTESTATION DOMAIN, refusing the rest.
//
// `stripUndefinedDeep` USED TO LIVE HERE AND MOVED TO `core/jcs.ts` IN rc.8. It is not a canonicaliser
// — it strips `undefined` and touches nothing about serialisation — but while it sat in this file it
// could only be made public by exporting FROM this file, and the control in `decision-attestation.mjs`
// asserts that NOTHING here is reachable. The unit that guard protects is the MODULE, not a list of
// names, so the helper moved rather than the guard weakening.
//
// ─── THERE ARE TWO CANONICALISERS IN THIS PACKAGE. READ THIS BEFORE USING EITHER ────────────────
//
// `core/jcs.ts` exports `jcsBytes`, the full RFC 8785 canonicaliser, and it is the package's PUBLIC
// one. This file is NOT exported from `index.ts` and exists only for `core/attestation.ts`.
//
// THEY AGREE TODAY, AND THAT AGREEMENT IS NOT A GUARANTEE. Measured 2026-08-04 over the attestation
// domain — full attestation, absent optional, unicode and escapes, empty string, nested key reorder,
// arrays — both produce IDENTICAL bytes in every case. They agree because every attestation field is
// a STRING. The moment a number enters the type they diverge silently and asymmetrically: `jcsBytes`
// serialises it, this one throws.
//
// WHICH IS WHY THIS ONE IS UNEXPORTED. If both were reachable, a caller could sign an attestation
// with the wrong one and produce bytes that verify under one implementation and not the other. There
// is no surface on which to make that mistake, deliberately. If you are adding an export for this
// file, you are adding that surface back.
//
// WHY IT WAS NOT SIMPLY REPLACED BY `jcsBytes` WHEN IT MOVED HERE. The refusal below IS the safety
// property, and `jcsBytes` does not have it: it will happily serialise a number, which is where a
// canonicaliser goes subtly wrong. Adopting the general one would have traded a loud failure at
// issuance for bytes that look canonical and that no other implementation reproduces.
//
// ─── ORIGINAL NOTE, from op-mcp-payment-server where this file lived until 2026-08-04 ────────────
//
// It was written there rather than imported because that package did not then depend on this one.
// It does now, which is what made the move possible; the reasoning is kept because it explains the
// restriction rather than the location.
//
// WHY IT REFUSES INSTEAD OF HANDLING EVERYTHING. RFC 8785's hard part is NUMBERS: the ES6 double
// serialisation rules, negative zero, exponent forms. Getting those subtly wrong produces bytes that
// look canonical and are not, which is the exact failure this file exists to end. So the restricted
// domain — objects, arrays and STRINGS — is canonicalised, and anything else THROWS.
//
// THE REFUSAL IS THE SAFETY PROPERTY. `DecisionAttestation` is all strings today. If someone adds a
// number, this fails loudly at issuance rather than signing bytes no other implementation reproduces.
// A canonicaliser that silently handles a case it handles WRONG is worse than one that refuses.

export class NotCanonicalisable extends Error {}

/** RFC 8785 string serialisation: JSON escaping, which `JSON.stringify` already implements correctly
 * for strings including surrogate pairs and control characters. */
const str = (s: string): string => JSON.stringify(s);

/** Canonical JSON for the restricted domain.
 *
 * Object keys are sorted by UTF-16 CODE UNIT, which is what `Array.prototype.sort` does on strings by
 * default and what RFC 8785 specifies. No whitespace anywhere. */
export function canonicalise(value: unknown, path = '$'): string {
  if (typeof value === 'string') return str(value);
  if (Array.isArray(value)) return `[${value.map((v, i) => canonicalise(v, `${path}[${i}]`)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      // UNDEFINED IS OMITTED, matching JSON.stringify and JCS: a key whose value is undefined is not a
      // member. An optional field left unset must not change the bytes.
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${str(k)}:${canonicalise(v, `${path}.${k}`)}`).join(',')}}`;
  }
  throw new NotCanonicalisable(
    `Cannot canonicalise ${path}: ${value === null ? 'null' : typeof value}. This canonicaliser covers ` +
    `objects, arrays and strings, which is everything this package signs. Numbers, booleans and null are ` +
    `REFUSED rather than guessed at, because RFC 8785's number rules are where a canonicaliser goes ` +
    `subtly wrong and produces bytes that look right and no other implementation reproduces. If this type ` +
    `now needs one, that is a decision about the PAYLOAD and not about this file: adding a number to a ` +
    `signed attestation means this canonicaliser and jcsBytes stop agreeing, so it needs a ruling rather ` +
    `than a wider domain here.`,
  );
}


/** The bytes to sign. */
export const canonicalBytes = (value: unknown): Buffer => Buffer.from(canonicalise(value), 'utf8');
