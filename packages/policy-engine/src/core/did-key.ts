// ONE did:key DECODER, WITH ITS CONVENTION IN THE NAME AND IN THE TYPE.
//
// ─── THE DEFECT THIS EXISTS BECAUSE OF ───────────────────────────────────────────────────────────
//
// `verifyDecisionAttestation` takes a `decodeDidKey` callback that must return the 34-byte
// multicodec-prefixed form, and a `resolveDeciderDidWeb` callback IMMEDIATELY BESIDE IT that must
// return the 32-byte raw key. Both are typed `(did: string) => Uint8Array | undefined`. Nothing in
// either signature distinguishes them; the engine checks `!== 34` on one and `!== 32` on the other.
//
// So every caller hand-writes `base58Decode(did.slice('did:key:z'.length))` and remembers which
// neighbour it is feeding. Measured 2026-08-16: **nineteen hand-written instances** across
// `op-policy-engine` and `op-mcp-payment-server` — more than the nine a first pass counted, because
// the arrow-function form is only one of the shapes it takes. Every one is currently correct, which
// is nineteen chances taken rather than a property held.
//
// ─── AND GETTING IT WRONG PUBLISHES A FALSE CLAIM ABOUT A THIRD PARTY ───────────────────────────
//
// Hand the engine the 32-byte form and it answers `cited-invalid`: "The decider is not a well-formed
// ed25519 did:key, so no key can be recovered from it." Measured on a constructed decider that
// passes six independent checks and whose signature verifies under `node:crypto`, that sentence is
// FALSE OF THE ARTIFACT. In a verification product, asserting a defect in someone else's document
// because of a defect in your own call is the worst available output.
//
// ─── WHY TWO NAMED WIDTHS RATHER THAN ONE RETURN VALUE ──────────────────────────────────────────
//
// A single `Uint8Array` return would have to pick a width and lose the other, leaving the same
// footgun with a better label. Naming both means a caller writes `.multicodec` or `.publicKey` and
// cannot express the wrong one by forgetting a slice.
import { base58Decode } from './base58.js';

/** The multicodec prefix for an ed25519 public key: `0xed 0x01`, varint-encoded. */
const ED25519_MULTICODEC = [0xed, 0x01] as const;

/** A `did:key` that decoded to an ed25519 public key, in BOTH widths this package asks for. */
export interface Ed25519DidKey {
  /** 34 bytes: `0xed 0x01` then the key. What `verifyDecisionAttestation`'s `decodeDidKey` wants. */
  readonly multicodec: Uint8Array;
  /** 32 bytes, the raw ed25519 public key. What `ed25519Verify` and `resolveDeciderDidWeb` want. */
  readonly publicKey: Uint8Array;
}

/** A CALLER PASSED THE WRONG WIDTH. Never a fact about anyone's artifact.
 *
 * ─── WHY A THROW AND NOT A FOURTH `AttestationBlock` MEMBER ─────────────────────────────────────
 *
 * `AttestationBlock` is a closed discriminated union, and it is closed precisely so that its
 * non-attested variants have nowhere to put a decision fact. A `caller-error` member would place a
 * programming mistake in the union a verifier reads for evidence about a payment, and every
 * consumer's exhaustive switch would silently acquire an unhandled case.
 *
 * A THROW CANNOT BE RECORDED AS EVIDENCE, which is the property wanted. It fails loudly in the
 * caller's own test run rather than quietly in a stored record, and it follows the precedent this
 * package already sets where a construction-time mistake throws rather than returning a state. */
export class DidKeyConventionError extends Error {
  constructor(message: string) { super(message); this.name = 'DidKeyConventionError'; }
}

/** Decode a `did:key` bearing an ed25519 public key. `undefined` means it is not one.
 *
 * THE NAME CARRIES THE CURVE. `did:key` also encodes secp256k1, P-256 and others, and a decoder that
 * returned 34 bytes for one of those would hand a caller a key of the wrong algorithm at the right
 * length. The multicodec prefix is CHECKED, not assumed. */
export function decodeEd25519DidKey(did: string): Ed25519DidKey | undefined {
  if (typeof did !== 'string' || !did.startsWith('did:key:z')) return undefined;
  let body: Uint8Array;
  try { body = base58Decode(did.slice('did:key:z'.length)); } catch { return undefined; }
  if (body.length !== 34) return undefined;
  if (body[0] !== ED25519_MULTICODEC[0] || body[1] !== ED25519_MULTICODEC[1]) return undefined;
  return { multicodec: body, publicKey: body.subarray(2) };
}

/** Refuse a `decodeDidKey` callback that returned its neighbour's width.
 *
 * ─── THE ORDER OF THESE THREE TESTS IS LOAD-BEARING ─────────────────────────────────────────────
 *
 * `undefined` first, then LENGTH, then the prefix. A 32-byte return is unambiguously the wrong
 * convention only because 34 is the required width here — a future multicodec whose payload happened
 * to be 32 bytes would be caught by the PREFIX check, not the length one. Testing the prefix first
 * would report such a key as a caller error, which is the same class of false claim in the other
 * direction. */
export function refuseWrongDidKeyWidth(raw: Uint8Array | undefined, parameter: string): void {
  if (raw === undefined || raw.length !== 32) return;
  throw new DidKeyConventionError(
    `The \`${parameter}\` callback returned 32 bytes. This parameter requires the 34-byte ` +
    'multicodec-prefixed form (`0xed 0x01` then the key); it is `resolveDeciderDidWeb`, the ' +
    'parameter beside it, that takes the 32-byte raw key. Both are typed ' +
    '`(did: string) => Uint8Array | undefined`, so nothing in the signature distinguishes them. ' +
    'THIS IS A DEFECT IN THE CALLER AND NOT A FACT ABOUT THE DECIDER: answering `cited-invalid` ' +
    'here would publish "the decider is not a well-formed ed25519 did:key" about an artifact that ' +
    'may be entirely sound, and a verification product must not assert a defect in a third party\'s ' +
    'document because of one in its own call. Use `decodeEd25519DidKey(did)?.multicodec`.',
  );
}
