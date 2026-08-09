// WHAT AN APPROVAL SIGNATURE COVERS. ONE PLACE, BECAUSE THERE WERE TWO AND THEY DISAGREED.
//
// `denyPending` signed `canonicalise({ handleId, how, at, reason, actor })` — the whole record.
// `approvePending` signed the string `approve:<handleId>` and nothing else. So on the approve path the
// actor and the time were OUTSIDE the signed bytes, and the ordering made it structural rather than an
// oversight: the HTTP layer called `now()` AFTER the signature was produced, so at the moment of signing
// the timestamp did not exist yet.
//
// THE CONSEQUENCE IS NOT "A WEAKER SIGNATURE". It is that the two fields M6 added to the record — an
// actor and a time — were exactly the two a reader would check a signature to establish, and neither was
// covered. Rewriting `actor` or `at` on a stored approval left the signature verifying. A signature that
// still verifies over altered content is worse than no signature, because the record reads as
// corroborated.
//
// DOMAIN-SEPARATED AND VERSIONED. `type` is inside the signed bytes so an approval payload cannot be
// replayed as a denial, and so a future construction is identifiable as a DIFFERENT one rather than as a
// mismatch. Same reasoning as PREIMAGE_VERSION being the first field of the request-identity preimage.
//
// THE HANDLE ID IS INSIDE THE BYTES, so a signature lifted from one payment does not verify on another.

import { canonicalise } from '../attestation-jcs.js';
import type { ResolutionActor } from './types.js';

/** The construction this signature is over. Inside the signed bytes, never inferred from context. */
export const RESOLUTION_PAYLOAD_TYPE = 'op.approval.resolution.v1';

export interface SignableResolution {
  handleId: string;
  how: 'approved' | 'denied';
  /** REQUIRED, and the caller signs the SAME value it stores. A record whose stored `at` differs from
   * the signed one is a record whose signature does not verify, which is the correct outcome and a
   * confusing one to debug, so both call sites take `at` as an argument rather than reading a clock. */
  at: string;
  actor: ResolutionActor;
  /** Denials only. Omitted for an approval, and `canonicalise` drops undefined members, so an approval's
   * bytes are the same whether this field is absent or explicitly undefined. */
  reason?: string;
}

/** The exact bytes both call sites sign and any verifier reconstructs.
 *
 * REFUSES RATHER THAN SIGNING A PARTIAL RECORD. `canonicalise` drops undefined members, so a missing
 * `at` or a missing actor field would silently produce well-formed bytes with the field simply absent —
 * a signature that verifies over a record saying less than the caller thought. Every required field is
 * checked by name here, because "the field was undefined" and "the field was omitted" are the same bytes
 * and opposite facts. */
export function resolutionPayload(r: SignableResolution): string {
  for (const [field, value] of [
    ['handleId', r.handleId], ['at', r.at],
    ['actor.issuer', r.actor?.issuer], ['actor.approverRef', r.actor?.approverRef],
    ['actor.assurance', r.actor?.assurance],
  ] as const) {
    if (typeof value !== 'string' || value === '') {
      throw new Error(
        `Cannot sign a resolution with no ${field}. An absent field canonicalises to the same bytes as an ` +
        `omitted one, so this would produce a signature over a record that does not say what the caller ` +
        `believes it says.`,
      );
    }
  }
  if (r.how === 'denied' && (typeof r.reason !== 'string' || r.reason === '')) {
    throw new Error(
      'Cannot sign a denial with no reason. The surface already refuses a reasonless denial with a 400, ' +
      'and a signature that did not cover the reason would leave the kept field uncorroborated.',
    );
  }
  return canonicalise({
    type: RESOLUTION_PAYLOAD_TYPE,
    handleId: r.handleId,
    how: r.how,
    at: r.at,
    actor: { issuer: r.actor.issuer, approverRef: r.actor.approverRef, assurance: r.actor.assurance },
    // Omitted on an approval rather than sent as an empty string: an empty reason is a value, and a
    // reader would be entitled to read it as "denied for no stated reason".
    ...(r.how === 'denied' ? { reason: r.reason } : {}),
  });
}

// ─── did:key, the half that was missing ──────────────────────────────────────
//
// `verifyDecisionAttestation` already DECODES an ed25519 did:key and refuses anything else by name.
// Nothing in this package ENCODED one, so an approver's DID was whatever an operator typed into
// `OP_APPROVER_REF` — a string with no relationship to the key that signed. Deriving it from the key
// closes that: the record names a DID, the DID carries the key, and the signature checks against it
// without anyone being asked to trust the pairing.

export const DID_KEY_ED25519_PREFIX = Uint8Array.from([0xed, 0x01]);

/** `did:key:z…` for a raw 32-byte ed25519 public key. */
export function encodeDidKeyEd25519(raw: Uint8Array, base58encode: (b: Uint8Array) => string): string {
  if (raw.length !== 32) throw new Error(`An ed25519 public key is 32 bytes and this is ${raw.length}.`);
  const bytes = new Uint8Array(34);
  bytes.set(DID_KEY_ED25519_PREFIX, 0);
  bytes.set(raw, 2);
  return `did:key:z${base58encode(bytes)}`;
}

/** The raw 32-byte key inside a `did:key:z…`, or undefined if it is not a well-formed ed25519 one. */
export function decodeDidKeyEd25519(did: string, base58decode: (s: string) => Uint8Array): Uint8Array | undefined {
  if (!did.startsWith('did:key:z')) return undefined;
  let bytes: Uint8Array;
  try { bytes = base58decode(did.slice('did:key:z'.length)); } catch { return undefined; }
  if (bytes.length !== 34 || bytes[0] !== DID_KEY_ED25519_PREFIX[0] || bytes[1] !== DID_KEY_ED25519_PREFIX[1]) return undefined;
  return bytes.subarray(2);
}

export type ResolutionVerdict =
  | { ok: true; approverRef: string }
  | { ok: false; reason: string };

/** Check a stored resolution against the key its own actor names.
 *
 * VERIFIES AGAINST THE RECORD'S OWN `approverRef`, not against a key the caller supplies. That is the
 * property the product claims: a third party reads the record, recovers the key from the DID it names,
 * and checks the signature without having to trust whoever handed them the record. Passing the key in
 * would make this a check the record's holder configures.
 *
 * THE SIGNATURE IS THE APPROVER'S, so `approverRef` is the right DID even under `org-attested`, where
 * `issuer` is the org and differs. A verifier that checked `issuer` would fail every org-attested record
 * and pass nothing extra.
 *
 * ─── WHAT A PASSING CHECK ESTABLISHES, AND WHAT IT DOES NOT ──────────────────────────────────
 *
 * WRITTEN HERE RATHER THAN ONLY IN KNOWN-LIMITS, because someone reading a receipt six months from
 * now will read this function and will not read our limits file.
 *
 * `ok: true` establishes that the named key signed these exact bytes: this handle, this decision,
 * this time, this actor. Altering any of them breaks it.
 *
 * UNDER `approver-held` IT ESTABLISHES ONE MORE THING AND NOT A SECOND. **This signature is that
 * approver's, and this deployment says that approver counts.** The first clause is what you just
 * checked. THE SECOND IS NOT: the set of DIDs a deployment accepts as approvers comes from its own
 * configuration, so a verifier can confirm WHO signed and must trust the operator about whether that
 * signer was authorised to.
 *
 * **THE SECOND CLAUSE EXPIRES.** When the acceptable-approver list moves from deployment
 * configuration into the credential's `approvers` — signed by the issuer, verifiable by anyone — both
 * halves become checkable from the artifact and this paragraph should be rewritten rather than left
 * standing. A caveat that outlives its cause reads as a limit that was never lifted.
 *
 * UNDER `operator-held` AND `org-attested` the same gap exists and always has; it is stated here
 * because `approver-held` is the level at which someone would first assume otherwise. */
export function verifyResolution(
  handleId: string,
  resolution: { how: string; at: string; actor?: ResolutionActor; signature?: string; reason?: string },
  verifyEd25519: (message: string, signature: Buffer, publicKey: Buffer) => boolean,
  base58decode: (s: string) => Uint8Array,
): ResolutionVerdict {
  if (resolution.how !== 'approved' && resolution.how !== 'denied') {
    // A lapse carries no actor and no signature BY DESIGN: nobody decided. Asking whether its signature
    // verifies is a category error, and answering `false` would read as a failed check.
    return { ok: false, reason: `A '${resolution.how}' resolution carries no signature by design: nobody decided. There is nothing here to verify.` };
  }
  if (typeof resolution.signature !== 'string' || resolution.signature === '') {
    return { ok: false, reason: 'The resolution carries no signature.' };
  }
  if (resolution.actor === undefined) {
    return { ok: false, reason: 'The resolution names no actor, so there is no key to check it against.' };
  }
  const raw = decodeDidKeyEd25519(resolution.actor.approverRef, base58decode);
  if (raw === undefined) {
    return {
      ok: false,
      reason:
        `The approver is '${resolution.actor.approverRef}', which is not a well-formed ed25519 did:key, so no ` +
        `key can be recovered from it. A did:web approver is not verifiable here for the same reason it is ` +
        `not verifiable on an attestation: it would require an outbound call from the verification path.`,
    };
  }
  let payload: string;
  try {
    // `reason` is SPREAD IN ONLY WHEN PRESENT rather than passed as possibly-undefined. Under
    // `exactOptionalPropertyTypes` an explicit undefined is not the same as an absent member, and that
    // distinction is exactly the one this construction depends on: an absent reason and a reason of
    // `undefined` must produce the same bytes, and the type system should not let the two be conflated.
    payload = resolutionPayload({
      handleId, how: resolution.how, at: resolution.at, actor: resolution.actor,
      ...(resolution.reason === undefined ? {} : { reason: resolution.reason }),
    });
  } catch (e) {
    return { ok: false, reason: `The resolution cannot be canonicalised, so no signature could cover it: ${String(e)}` };
  }
  let ok = false;
  try {
    ok = verifyEd25519(payload, Buffer.from(resolution.signature, 'base64'), Buffer.from(raw));
  } catch (e) {
    return { ok: false, reason: `The signature could not be checked: ${String(e)}` };
  }
  return ok
    ? { ok: true, approverRef: resolution.actor.approverRef }
    : {
        ok: false,
        reason:
          'The signature does NOT verify against the key its own approver names. This is not a missing ' +
          'record: it is a signed artifact failing its own check, which is a defect or a forgery.',
      };
}
