// The SERVED shape of a refusal, and the way back from it to the bytes its signature covers.
//
// ─── TWO SHAPES OF ONE RECORD, AND ONLY ONE OF THEM COULD BE VERIFIED WITHOUT US ────────────────
//
// A refusal exists in two shapes. The STORE shape is what the enforcement point writes and what
// `signableFromRefusal` reads: `authority`, `spend`, `attribution`, the signature inline as
// `signature` + `signedBy` + `payloadType`. The SERVED shape is what `GET /v1/refusals` sends and
// what a console's copy button puts on a clipboard: `refusedBy` for authority, `attempted` for
// spend, `agentId` and `mandateId` at the top level, absent fields as `null`, and the signature as
// an OBJECT `{ state, value, signedBy, payloadType }`.
//
// A counterparty holds the second. Until rc.22 the package rebuilt only the first, so the record a
// console hands a refused party could not be verified with the published package: feeding it to
// `signableFromRefusal` read the top-level `agentId` as absent and threw, and read the version from
// a top-level `payloadType` that the served shape does not have, so a v3 row rebuilt as v1. Measured
// 2026-08-24 against rc.21 over five v3 vectors: two served rows threw, two store rows reported DOES
// NOT VERIFY while sound, and one verified only because its v2 and v3 bytes coincide.
//
// ─── THIS IS NOT A NEW MAPPING ───────────────────────────────────────────────────────────────────
//
// It is `signableFromRefusalRow` as it has lived in `op-mcp-payment-server/src/http/reads.ts`,
// vendored into the console and ported into observerprotocol.org/check. Three copies held together
// by cross-repo tests and one page that can import nothing. Moved here for the same reason
// `refusalPayload` moved here at rc.8: a counterparty must be able to build these bytes without us,
// and a construction published nowhere but in a page's own script is not published.
//
// OUTPUT-IDENTICAL TO THOSE COPIES, deliberately, including the one thing a reader may want to
// "fix": a `not-recorded` bound view is carried through as it arrives rather than mapped back to an
// absent field. The three copies agree on that and the cross-repo controls hold them to it; a
// change here is a change to all of them and is a separate decision.
//
// ─── NULL MEANS ABSENT, AND THIS IS THE LINE THAT WILL GET "SIMPLIFIED" ──────────────────────────
//
// A served row NULLS a field that is absent so a reader can tell "no constraint" from "not
// reported". That is right for a surface and WRONG for a canonicaliser: `{x: null}` and `{}` are
// different bytes, and `attestation-jcs` refuses null outright rather than guessing. So every null
// here becomes an OMITTED KEY, never a null and never an empty string.
//
// THE INVERSE DEFECT HAS ALREADY BEEN PAID FOR. The payment server's own `appliedBoundView` turned
// absent keys into null. The field was then PRESENT, every "is the field there" check passed, and
// the bytes still differed, so the signature did not verify and nothing said why. Do not replace
// `withoutNulls` with a spread, do not tidy it into a JSON round-trip, and do not let a null
// through on the grounds that the field is there.
import type { AppliedBound, AppliedBoundReason, Refusal, RefusalAuthority } from './types.js';
import type { AttestationBlock } from '../attestation.js';
import type { SignedCredentialRef } from './refusal.js';

/** The bound as a read route serves it. `not-recorded` is the route describing a record that
 *  predates the field; it is never part of any signed payload. Absent members arrive as `null`. */
export type ServedAppliedBound =
  | { state: 'recorded'; limit: string; unit?: string | null; observed?: string | null; headroom?: string | null; note?: string | null }
  | { state: 'not-supplied'; constraint: string | null; reason?: AppliedBoundReason | null; note: string }
  | { state: 'not-recorded'; note: string };

/** The signature as a read route serves it: three positive states, never an absence.
 *  `unverified` is a signature present and failing; `unsigned` is a record written before this
 *  deployment signed refusals. A verifier must not collapse the two. */
export type ServedRefusalSignature =
  | { state: 'signed'; value: string; signedBy: string; payloadType: string }
  | { state: 'unverified'; value: string; signedBy: string; payloadType: string; reason: string }
  | { state: 'unsigned'; note: string };

/** `not-evaluated` is the read route describing ITSELF: the citation was never read. It was never
 *  part of any signed payload and maps back to absent. */
export type ServedAttestation = AttestationBlock | { state: 'not-evaluated'; note?: string };

/** One row of `GET /v1/refusals`, which is also what a console's copy button emits. */
export interface RefusalRow {
  refusalId: string;
  at: string;
  observedAt?: string | null;
  agentId: string | null;
  mandateId: string | null;
  refusedBy: RefusalAuthority;
  code: string;
  constraint: string | null;
  attempted: { amountRaw: string; decimals: number; asset: string; rail: string; counterparty: string | null };
  appliedBound?: ServedAppliedBound | null;
  credential?: SignedCredentialRef | null;
  attestation?: ServedAttestation | null;
  network?: string | null;
  signature: ServedRefusalSignature;
}

function withoutNulls<T extends object>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

/** Whether a value has the served shape. THE MARKER IS THE SIGNATURE: a served row carries it as an
 *  OBJECT with a `state` (`signed` / `unverified` / `unsigned`), a store record as a string or not
 *  at all. That is a total discriminator between the two shapes.
 *
 *  `refusedBy` IS NOT USED AS A MARKER, and a comment is owed because the obvious version of this
 *  function did use it. A store record's `authority` lives under `authority`, and `refusedBy` should
 *  never appear on one — but `test/read-path-gaps.mjs` in `op-mcp-payment-server` writes fixtures
 *  with a stray `refusedBy`, and keying on it classified those as served rows and made
 *  `signableFromRefusal` throw on a store record it had always accepted. The signature marker does
 *  not have that failure mode: an unsigned store record has a string-or-absent signature, so it is
 *  correctly a store record. */
export function isRefusalRow(r: unknown): r is RefusalRow {
  if (r === null || typeof r !== 'object') return false;
  const sig = (r as { signature?: unknown }).signature;
  return sig !== null && typeof sig === 'object' && 'state' in (sig as object);
}

/** The store-shape record a served row was projected from, so that
 *  `refusalPayload(signableFromRefusal(signableFromRefusalRow(row)))` is the bytes its signature
 *  covers. The version is taken from the ROW'S OWN SIGNATURE VIEW, so a rebuild uses the field list
 *  the record was signed under rather than the one this build issues. An unsigned row has no
 *  version, because a version describes a signature. */
/** What a served row rebuilds to: the store record minus `reason`, which is prose, is not in the
 *  signed bytes, and is not served. Not `''`: the three existing copies of this mapping emit no
 *  such key, and a cross-repo comparison of the rebuilt OBJECTS (not only the bytes) would catch
 *  one that did. `signableFromRefusal` accepts this shape. */
export type RebuiltRefusal = Omit<Refusal, 'reason'>;

export function signableFromRefusalRow(row: RefusalRow): RebuiltRefusal {
  const sig = row.signature;
  const sigPayloadType = sig !== null && typeof sig === 'object' && 'payloadType' in sig
    ? sig.payloadType
    : undefined;
  const bound = row.appliedBound === null || row.appliedBound === undefined
    ? undefined
    : withoutNulls(row.appliedBound) as unknown as AppliedBound;
  const att = row.attestation;
  const attestation = att === null || att === undefined || (att as { state?: string }).state === 'not-evaluated'
    ? undefined
    : att as AttestationBlock;
  const attempted = row.attempted ?? ({} as RefusalRow['attempted']);
  return {
    refusalId: row.refusalId,
    at: row.at,
    authority: row.refusedBy,
    code: row.code,
    attribution: withoutNulls({ agentId: row.agentId, mandateId: row.mandateId }) as Refusal['attribution'],
    spend: withoutNulls({
      rail: attempted.rail, asset: attempted.asset,
      amountRaw: attempted.amountRaw, decimals: attempted.decimals,
      counterparty: attempted.counterparty,
    }) as unknown as Refusal['spend'],
    ...(row.credential?.state === 'digest' && typeof row.credential.value === 'string' && row.credential.value !== ''
      ? { credentialDigest: row.credential.value } : {}),
    ...(row.constraint === null || row.constraint === undefined ? {} : { breachedConstraint: row.constraint }),
    ...(bound === undefined ? {} : { appliedBound: bound }),
    ...(row.network === null || row.network === undefined ? {} : { network: row.network }),
    ...(sigPayloadType === undefined ? {} : { payloadType: sigPayloadType }),
    ...(attestation === undefined ? {} : { attestation }),
  };
}
