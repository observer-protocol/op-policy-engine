// The record saying "a person decided", and the bytes their signature covers.
//
// ─── WHY THIS IS HERE, WHEN rc.9 WITHDREW IT ─────────────────────────────────────────────────────
//
// `resolutionPayload` was exported in rc.8 and withdrawn in rc.9 on two objections, both recorded in
// `index.ts`. They are answered here rather than routed around, and the second was REAL at the time.
//
//   ADJACENCY — no longer the reason, and was a fair charge in rc.8. It came along because it sat
//   beside `refusalPayload`. It is here now on its own subject: this package publishes the payload
//   constructors for every signed artifact a counterparty must rebuild WITHOUT US, and an approval is
//   the one artifact in the estate that turns on a person's judgement. A refusal, a lapse and a
//   verdict rebuild offline; an approval and a denial did not, so the one record that a human is
//   accountable for was the one nobody outside could check.
//
//   A COLLIDING TYPE MADE PERMANENT — **answered by this package's own later decision, not by me.**
//   The objection was that `ResolutionActor.assurance` collided with a type of the same name and a
//   different meaning in the payment server, and that shipping it would make the collision permanent
//   in a package counterparties import. Since rc.9 this package exports `ApproverKeyAssurance` AS A
//   NAMED TYPE, plus `APPROVER_KEY_ASSURANCE` as runtime values and its schema version — precisely so
//   a counterparty can CHECK an assurance field rather than merely type one. The colliding name was
//   given a distinguishing one and shipped deliberately. `index.ts` says so itself:
//   "`ApproverKeyAssurance` is the precedent for both, and it is the precedent this surface already
//   set." The actor below is typed against that export, so no second meaning of `assurance` enters.
//
// ─── A MOVE, NOT A REWRITE, AND THAT IS THE PROPERTY THAT MATTERS ────────────────────────────────
//
// The body is byte-for-byte the payment server's, including the field order the canonicaliser sees and
// both refusal messages. **No signed artifact changes and every approval already written verifies
// afterwards exactly as it did before** — publishing a constructor lets others rebuild what exists, it
// does not alter it. That property is asserted against EXISTING RECORDS, not against new ones, by
// `op-mcp-payment-server/test/resolution-payload-parity.mjs`.
import { canonicalise } from '../attestation-jcs.js';
import type { ApproverKeyAssurance } from './types.js';

// THE TYPE STRING IS INSIDE THE CANONICALISED BYTES. It is copied from the payment server verbatim,
// NOT renamed to match this package's other payload types. `op.enforcement.*` would have been the
// consistent-looking choice and would have invalidated every approval ever signed. A move must not
// tidy the thing it moves.
export const RESOLUTION_PAYLOAD_TYPE = 'op.approval.resolution.v1';

/** Who signed a resolution. Named for what it is AS SIGNED, following `SignedDenialDetail`. */
export interface ResolutionActor {
  issuer: string;
  approverRef: string;
  assurance: ApproverKeyAssurance;
}

/** A resolution as signed. `lapsed` carries no actor and has its own payload — see `lapse.ts`. */
export interface SignableResolution {
  handleId: string;
  how: 'approved' | 'denied';
  at: string;
  actor: ResolutionActor;
  reason?: string;
}

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
