// A window that never closes is not a window.
//
// ─── WHAT THIS CLOSES ────────────────────────────────────────────────────────────────────────────
//
// `queue.lapse()` had NO CALLER anywhere in `src/` or `scripts/` outside its own definition. No
// sweeper, no interval, no route. `expiresAt` was written onto every handle and read by nothing that
// made a decision, so every pending approval stayed pending forever: its reservation kept holding
// budget, the fleet view kept counting it in flight, and the `lapsed` resolution state was reachable
// only from tests. A complete machine whose crank nobody turned.
//
// ─── A LAPSE IS SIGNED AND STILL NAMES NOBODY ────────────────────────────────────────────────────
//
// It gets a record and a signature like any other resolution. It does NOT get an `actor`, and the two
// facts belong together: the DEPLOYMENT signs that it observed a window close, which is a statement
// about a clock rather than about a person. An actor here would name somebody for FAILING TO ACT,
// which is the asymmetry `Resolution` already documents and which the signature must not quietly
// undo.
//
// So this is a separate payload with its own type rather than a variant of `resolutionPayload`.
// Reusing that one would mean relaxing its actor requirement, which is load-bearing for approvals and
// denials — a guard weakened for a third case is a guard weakened for all three.

import { canonicalise } from '../attestation-jcs.js';

/** DOMAIN SEPARATION. A lapse must not verify as a resolution and vice versa: they are different
 * claims by different parties about different things. */
export const LAPSE_PAYLOAD_TYPE = 'op.approval.lapse.v1';

export interface SignableLapse {
  handleId: string;
  /** When the lapse was RECORDED. Caller-supplied, as every other `at` in this package is. */
  at: string;
  /** The window that closed. IN THE SIGNED BYTES, because without it a signed lapse says only that
   * this deployment lapsed something — not that the window it lapsed had actually elapsed. With it,
   * a reader holding the record can check the claim against the handle's own expiry. */
  expiresAt: string;
}

/** IS THIS WINDOW CLOSED?
 *
 * ─── INCLUSIVE AT THE BOUNDARY, AND THAT IS A DECISION ───────────────────────────────────────────
 *
 * `Date.parse(expiresAt) <= now`. At exactly `expiresAt` the handle IS lapsed, because the field is
 * named for the instant it expires rather than the last instant it is valid.
 *
 * MATCHED TO `redeem()` IN `src/approvals.ts`, which already used `<= nowMs`. Two expiry predicates
 * in one codebase is how a handle comes to be redeemable and unapprovable at the same millisecond.
 *
 * IT DIFFERS FROM THE VERDICT WINDOW ON PURPOSE. `notAfter` there is INCLUSIVE-VALID — a verdict
 * arriving exactly on its boundary is still good — because "valid until" and "expires at" are
 * opposite framings. Both are asserted at their own boundary rather than one inherited from the other.
 *
 * ─── AN UNREADABLE EXPIRY IS NOT AN ETERNAL ONE ──────────────────────────────────────────────────
 *
 * An absent or unparseable `expiresAt` is treated as EXPIRED. A handle whose window cannot be
 * evaluated must not be offered to an approver as though it had a valid one, and the permissive
 * reading of a malformed value is exactly how this field came to mean nothing in the first place. */
export function isExpired(expiresAt: string | undefined, nowMs: number): boolean {
  if (typeof expiresAt !== 'string' || expiresAt === '') return true;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return true;
  return t <= nowMs;
}

/** The exact bytes a deployment signs to record that a window closed.
 *
 * EVERY FIELD CHECKED BY NAME, as `resolutionPayload` and `verdictPayload` both do: an absent field
 * canonicalises to the same bytes as an omitted one. */
export function lapsePayload(l: SignableLapse): string {
  for (const field of ['handleId', 'at', 'expiresAt'] as const) {
    const value = l[field];
    if (typeof value !== 'string' || value === '') {
      throw new Error(
        `Cannot sign a lapse with no ${field}. An absent field canonicalises to the same bytes as an ` +
        `omitted one, so this would produce a signature over a lapse that does not say what closed.`,
      );
    }
  }
  // NO ACTOR, AND NOTHING SHAPED LIKE ONE. See the header: the deployment attests to a clock, not to
  // a person, and a lapse that named a party would name them for not acting.
  return canonicalise({
    type: LAPSE_PAYLOAD_TYPE,
    handleId: l.handleId,
    at: l.at,
    expiresAt: l.expiresAt,
  });
}
