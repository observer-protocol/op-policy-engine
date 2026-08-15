// The bytes an evaluator signs over a payment decision, so a counterparty can rebuild them.
//
// ─── WHY THIS IS HERE AND `resolutionPayload` IS NOT, WHICH IS THE QUESTION TO ANSWER FIRST ───────
//
// `index.ts` records that `resolutionPayload` and `ResolutionActor` were exported at rc.8 and WITHDRAWN
// at rc.9, because "they came along because they were adjacent to `refusalPayload`, and adjacency is not
// a reason", and because the actor's `assurance` field collided with a type of the same name and a
// different meaning in `op-mcp-payment-server`.
//
// **THAT NOTE WAS ANSWERED BEFORE THIS FILE WAS WRITTEN, NOT ROUTED AROUND.** Four objections, each
// taken separately:
//
//   1. ADJACENCY. This package IS the policy evaluator: `evaluateMandate` computes the decision, and a
//      verdict is that decision signed. It belongs here by SUBJECT. And the note's own positive test is
//      met more strongly than by the refusal: it justifies `refusalPayload` because "a refusal is the
//      only artifact of a stopped payment", and a verdict is the artifact of EVERY payment. Measured on
//      the demonstration corpora: 35 verdicts against 2 resolutions.
//
//   2. A FOREIGN CONCEPT ON A COUNTERPARTY SURFACE. There is none to carry. The payload is thirteen
//      strings and one nested object of four optional strings. No actor, no vocabulary, no union, no
//      boolean, no number. `decision` is a plain `string`, so no decision vocabulary travels either.
//
//   3. A COLLIDING TYPE MADE PERMANENT. **This one was REAL and it is why the names below are not the
//      names this arrived with.** See `SignedDenialDetail` and `SignableEvaluationVerdict`.
//
//   4. TWO CANONICALISERS ON ONE SURFACE, which the paragraph above the withdrawal note warns is "the
//      two-representations class at its worst". Measured rather than argued, on the worst-case shape:
//      `op-mcp-payment-server/src/jcs.ts`, `core/attestation-jcs.ts` and `core/jcs.ts` produce the same
//      461 bytes for a `deny` carrying all four detail fields. This file uses `attestation-jcs`, the
//      same canonicaliser `refusalPayload` uses, so the two payload builders in this directory share
//      one and a reader cannot pick the wrong one.
//
// ─── THE PARITY MEASUREMENT HAS A CONDITION, AND THE CONDITION IS ENFORCED AT THE BOTTOM ─────────
//
// Those three canonicalisers agree FOR A STATED REASON: every field here is a string, so RFC 8785's
// number rules — where independent canonicalisers diverge, silently and asymmetrically — are never
// reached. That reason is a property of the TYPE, not of the canonicalisers, so it stops holding the
// moment a non-string field is added.
//
// A comment cannot enforce that. `_PARITY_OBLIGATION` at the bottom of this file fails to COMPILE if a
// field that is not a string enters the payload, and names re-measuring parity as what must be done.
// The thing creating the obligation and the thing discharging it are in one unit.
import { canonicalise } from '../attestation-jcs.js';

/** The domain separator. The identifier is `EVALUATION_VERDICT_PAYLOAD_TYPE` rather than
 * `VERDICT_PAYLOAD_TYPE` for the same reason the type below is not called `SignableVerdict`.
 *
 * ─── v3 → v4 AT rc.18: AN ESCALATE NOW SIGNS `remainingAfterApproval` ───────────────────────────
 *
 * **The value moves when and only when the signed field set moves.** It was frozen at v3 across the
 * constant's rename precisely because renaming the VALUE without changing the SET would have
 * invalidated every signature in existence for no gain. This change is the opposite case: the set
 * genuinely changed, so the discriminator must, or one string would cover two constructions and a
 * verifier could not tell which bytes to rebuild.
 *
 * WHAT CHANGED AND WHY. `remainingAfterApproval` — the headroom figure an approver reads before
 * releasing money — travelled in the body, reached the approver's screen, and was NOT in the signed
 * set. A deny signed its bound down to four filtered sub-fields; an escalate did not sign the figure
 * a human decides on. **The path with a human in it had less integrity coverage than the path
 * without one.**
 *
 * WHAT THE BUMP COSTS, MEASURED 2026-08-15 — AND A CORRECTION TO THE FIRST ANSWER GIVEN.
 *
 * 1,864 verdict signatures exist across the estate and all re-verify under v3. The scope of the bump
 * was first reported as **ten** — the stored escalates — on the reasoning that releases and denies
 * carry no `remainingAfterApproval` and would therefore canonicalise identically under both
 * versions. **That is wrong, and the mistake is one line above the claim: `type` is INSIDE the
 * canonical object.** Measured: a v3 release and a v4 release differ, and differ *only* in the
 * discriminator.
 *
 * So the affected population is **all 1,864**, not ten. Every stored signature fails a v4 rebuild.
 *
 * WHAT SAVES IT IS THAT NONE OF THEM IS AMBIGUOUS. Because the two constructions never emit the same
 * bytes for the same field set, trial verification is decisive: rebuild under v3 and the signature
 * verifies, rebuild under v4 and it does not. The cost is that a verifier must TRY each known
 * construction rather than READ one — which is precisely the cost the construction stamp removes for
 * every record written from here on. Run 5 adds 468 escalates.
 *
 * AND THE STAMP LANDED FIRST, DELIBERATELY. `op-mcp-payment-server` records the construction on each
 * stored verdict as of 2026-08-15, read off these bytes. So v4 records say what they are, and the
 * 1,864 written before it read as `not-recorded` — which is the truth about them, rather than a
 * backfilled guess. Bumping first would have converted a latent recording gap into an unverifiable
 * corpus. */
export const EVALUATION_VERDICT_PAYLOAD_TYPE = 'op.evaluation.verdict.v4';

/** The FOUR `denialDetail` fields a verdict signature covers.
 *
 * ─── NAMED, AND NOT `DenialDetail`, BECAUSE THIS PACKAGE ALREADY EXPORTS THAT ────────────────────
 *
 * `core/denial.ts` exports `DenialDetail` with EIGHT members: `tag` (a `DenialTag`, a vocabulary),
 * `constraint`, `limit`, `observed`, `headroom`, `unit`, `remedy`, and `terminal` (a boolean). This is a
 * four-member SUBSET of that concept, and shipping it unnamed and inline would have put two
 * `denialDetail` shapes on one imported surface with nothing saying which one a signature covers.
 *
 * **That is precisely the collision the rc.9 withdrawal refused**, with `denialDetail` in place of
 * `assurance`, and it would have sat two exports apart in one `index.ts` rather than across two
 * repositories. The remedy is the one this package already applied to `RequiredKeyCustody`: a name
 * that carries the distinction, and a comment saying what the distinction is.
 *
 * ─── THE TWO EXCLUSIONS, EACH WITH ITS REASON, BECAUSE AN UNEXPLAINED SUBSET IS A GUESS ──────────
 *
 * - **`terminal` is excluded because it is a BOOLEAN and this estate's canonicaliser refuses booleans.**
 *   Carrying it as the string `'true'` would be read as a value rather than a flag. A real captured
 *   deny record confirms the exclusion happens: the request carried `terminal: true` and the stored
 *   signed payload does not.
 * - **`tag`, `constraint` and `remedy` are excluded because they are not signed.** `tag` is a
 *   vocabulary, which would make this type carry one; `constraint` duplicates `breachedConstraint`,
 *   which IS signed; `remedy` is advice to the caller rather than a fact about the decision.
 *
 * **So a holder of a verdict signature can check the bound that refused and cannot check the tag, the
 * remedy, or whether a retry is pointless.** Stated here so nobody infers coverage from the name. */
export interface SignedDenialDetail {
  limit?: string;
  observed?: string;
  headroom?: string;
  unit?: string;
}

/** The exact field set an evaluator signs over one payment decision.
 *
 * ─── NAMED `SignableEvaluationVerdict` AND NOT `SignableVerdict`, DELIBERATELY ───────────────────
 *
 * **This package already exports `Verdict`** from `core/verify.ts`: `{ allow: boolean, reason, notes,
 * detail?, checks? }` — a decision **as computed**. This is a decision **as signed**. Two
 * representations of one event on one public surface, and their fields do not correspond: `allow:
 * boolean` against `decision: string`, `detail?: DenialDetail` against `denialDetail?:
 * SignedDenialDetail`.
 *
 * A reader meeting `Verdict` and `SignableVerdict` two exports apart would reasonably conclude the
 * second is a signable form of the first. It is not, and shipping the name would have made that
 * inference permanent in a package counterparties import. **The defence is this name and this comment,
 * on the `RequiredKeyCustody` precedent, rather than collapsing two types that answer different
 * questions.**
 *
 * `Verdict` answers *"what does this engine conclude about this request"*. This answers *"what did a
 * named evaluator commit to, in bytes anyone can rebuild"*.
 *
 * ─── EVERY FIELD IS A STRING, AND THAT IS LOAD-BEARING RATHER THAN STYLISTIC ─────────────────────
 *
 * `decimals` is a string for the reason the whole file turns on: this estate's canonicaliser covers
 * objects, arrays and strings and REFUSES numbers, because RFC 8785's number rules are where
 * independent canonicalisers diverge, and a signature over bytes nobody else reproduces is worse than
 * no signature. See `_PARITY_OBLIGATION`. */
export interface SignableEvaluationVerdict {
  /** What the evaluator decided. A plain `string`, NOT a union: the decision vocabulary stays where it
   * is enforced rather than travelling into a package counterparties import. Same treatment Boyd ruled
   * for `assurance` on the resolution payload. */
  decision: string;
  mandateId: string;
  agentId: string;
  issuerId: string;
  /** From the SPEND. These four are what bind the money to the decision: signing the verdict facts
   * alone would leave the amount free, so a verdict signed for 1.00 presented with a spend of 1000.00
   * would verify. */
  rail: string;
  asset: string;
  amountRaw: string;
  decimals: string;
  counterpartyMatchedAs: string;
  /** INSIDE the signed bytes, not beside them. A window carried next to the signature could be widened
   * by whoever replays it. */
  notBefore: string;
  notAfter: string;
  /** Required on `deny`, refused on `escalate` and `release`. A signed deny naming no constraint says
   * the mandate refused and not what refused it; a signed release carrying one says the mandate both
   * permitted and breached. Neither is signable. */
  breachedConstraint?: string;
  /** Required on `escalate`, refused on the other two, in the other direction. */
  routingConstraint?: string;
  /** THE HEADROOM FIGURE THE APPROVER READS. Required on `escalate`, refused on the other two, on
   * exactly the same rule as `routingConstraint` — and added at v4 because it was not signed at all.
   *
   * ─── WHY IT IS REQUIRED RATHER THAN OPTIONAL ──────────────────────────────────────────────────
   *
   * Optional would have closed nothing. An evaluator that omitted it would produce a valid escalate
   * whose human-facing figure is unsigned, which is the defect this field exists to remove — and
   * nobody downstream could tell an escalate that had no figure from one whose figure was simply not
   * covered. Required makes the absence impossible rather than invisible.
   *
   * ─── AND A DEPLOYMENT WITH NO BUDGET SAYS SO, IN THIS FIELD ───────────────────────────────────
   *
   * `string`, not a number, like every other signed field here — see the note on `decimals`. That is
   * also what lets a deployment tracking no budget state the fact: an escalate against a mandate
   * declaring no ceiling carries a value saying no figure was declared, rather than a fabricated
   * one. `op-mcp-payment-server`'s adapter has recorded the rule this follows since before the field
   * was signed: *"A number in front of an approver that nobody calculated is worse than no number."*
   *
   * This package does not enumerate which strings are acceptable. The decision vocabulary stays
   * where it is enforced, on the same ruling as `decision` and `assurance`. */
  remainingAfterApproval?: string;
  /** The signed subset. See `SignedDenialDetail` for what it deliberately does not cover. */
  denialDetail?: SignedDenialDetail;
}

const SIGNED_FIELDS = [
  'decision', 'mandateId', 'agentId', 'issuerId', 'rail', 'asset', 'amountRaw', 'decimals',
  'counterpartyMatchedAs', 'notBefore', 'notAfter',
] as const;

const SIGNED_DETAIL_FIELDS = ['limit', 'observed', 'headroom', 'unit'] as const;

/** The exact bytes an evaluator signs. A counterparty calls this to rebuild them.
 *
 * EVERY FIELD IS CHECKED BY NAME BEFORE CANONICALISING. An absent field canonicalises to the same bytes
 * as an omitted one, so without this a caller could sign a payload that does not say what it believes
 * it says, and the signature would verify.
 *
 * THE CONDITIONAL FIELDS MUST AGREE WITH THE DECISION. Three decisions, two fields, each decision takes
 * exactly one or neither: a deny breached something and names it, an escalate breached nothing and
 * names what routed it, a release carries neither. Both guards or neither — a release able to carry a
 * `routingConstraint` unchallenged is the same defect in the newer field. */
export function evaluationVerdictPayload(v: SignableEvaluationVerdict): string {
  for (const field of SIGNED_FIELDS) {
    const value = (v as unknown as Record<string, unknown>)[field];
    if (typeof value !== 'string' || value === '') {
      throw new Error(
        `Cannot sign a verdict with no ${field}. An absent field canonicalises to the same bytes as an ` +
        `omitted one, so this would produce a signature over a payment that does not say what the ` +
        `evaluator believes it says.`,
      );
    }
  }
  const decision = v.decision;
  if (decision === 'deny' && v.breachedConstraint === undefined) {
    throw new Error(
      'Cannot sign a deny with no breachedConstraint. A signed deny that names no constraint says the ' +
      'mandate refused and does not say what refused it.',
    );
  }
  if (decision !== 'deny' && v.breachedConstraint !== undefined) {
    throw new Error(
      `Cannot sign a ${decision} carrying a breachedConstraint. Only a deny breached something; this ` +
      'would assert that the mandate both permitted and refused the same payment.',
    );
  }
  if (decision === 'escalate' && v.routingConstraint === undefined) {
    throw new Error(
      'Cannot sign an escalate with no routingConstraint. The rule that routed a payment to a human is ' +
      'what the human is acting on.',
    );
  }
  if (decision !== 'escalate' && v.routingConstraint !== undefined) {
    throw new Error(
      `Cannot sign a ${decision} carrying a routingConstraint. Only an escalate asked anybody.`,
    );
  }
  // ─── THE SAME PAIR FOR `remainingAfterApproval`, ADDED AT v4 ────────────────────────────────────
  //
  // BOTH DIRECTIONS OR NEITHER, on the rule this file already states for the two fields above: a
  // field guarded in one direction is a field a caller can attach to the wrong decision. An escalate
  // without the figure leaves the human-facing number unsigned, which is what v4 exists to fix; a
  // release or a deny carrying one asserts a headroom-after-approval for a payment nobody was asked
  // to approve.
  if (decision === 'escalate' && v.remainingAfterApproval === undefined) {
    throw new Error(
      'Cannot sign an escalate with no remainingAfterApproval. It is the figure the approver reads ' +
      'before releasing money, and leaving it out of the signature is what v4 exists to stop. A ' +
      'deployment that tracks no budget states that in this field rather than omitting it — an ' +
      'absent field and a declared absence are different claims, and only one of them is signed.',
    );
  }
  if (decision !== 'escalate' && v.remainingAfterApproval !== undefined) {
    throw new Error(
      `Cannot sign a ${decision} carrying a remainingAfterApproval. Only an escalate asked anybody, ` +
      'so only an escalate has a headroom that would remain after an approval.',
    );
  }
  // ─── AND THE STRING CHECK IS APPLIED TO THE STRUCTURE, NOT TO THE NEW FIELD ALONE ──────────────
  //
  // `denialDetail`'s four members have been type-checked by name since v3, and the three top-level
  // conditional fields never were: a number reached `canonicalise`, which refuses it one layer down
  // and reports a TYPE rather than which field was wrong. Adding the check for
  // `remainingAfterApproval` only would have been the recorded defect exactly — a rule applied to
  // one field is not applied to the structure — so all three are checked here.
  //
  // The required members are already covered by the `SIGNED_FIELDS` loop above, which rejects a
  // non-string there. This is the conditional half of the same rule.
  for (const f of ['breachedConstraint', 'routingConstraint', 'remainingAfterApproval'] as const) {
    const value = v[f];
    if (value !== undefined && typeof value !== 'string') {
      throw new Error(
        `Cannot sign a verdict whose ${f} is a ${typeof value}. Every signed field is a string, ` +
        'because RFC 8785\'s number rules are where canonicalisers diverge and a value compared as a ' +
        'number here would be compared as text by whoever verifies it.',
      );
    }
  }
  // ─── TWO GUARDS RESTORED AT rc.12 AFTER THE MOVE DROPPED THEM ───────────────────────────────────
  //
  // rc.11 moved this construction out of `op-mcp-payment-server` and I verified BYTE PARITY: three
  // canonicalisers, identical 461 bytes, real driven fixtures. **Byte parity over valid inputs cannot
  // detect a lost refusal**, and two refusals were lost. Both were caught by the payment server's own
  // suite when it imported this function — the downstream control `test/public-exports.mjs` names, doing
  // exactly what that comment says it would.
  //
  // The lesson is the verification's, not the code's: a moved payload builder needs its REFUSALS
  // enumerated against the original, not only its output compared. Agreement on what two
  // implementations ACCEPT is silent about what one of them stopped rejecting.
  const detail = v.denialDetail;
  if (detail !== undefined) {
    // ONLY A DENY HAS A BOUND. An escalate breached nothing and a release breached nothing, so a signed
    // detail on either asserts a comparison that did not happen — the same class as v2 signing
    // `breachedConstraint` on an escalate, which is why v3 exists.
    if (decision !== 'deny') {
      throw new Error(
        `Cannot sign a ${decision} carrying a denialDetail. Only a deny has one: it is the bound the ` +
        'mandate refused against, and an escalate or a release did not refuse.',
      );
    }
    for (const f of SIGNED_DETAIL_FIELDS) {
      const value = (detail as Record<string, unknown>)[f];
      // ABSENT IS FINE — every one of these is optional. A PRESENT NON-STRING IS NOT, and it is refused
      // HERE so the message names the FIELD. The canonicaliser would refuse a number anyway, one layer
      // down, reporting a type rather than which bound was wrong.
      if (value !== undefined && typeof value !== 'string') {
        throw new Error(
          `Cannot sign a denialDetail whose ${f} is a ${typeof value}. Every signed bound is a string, ` +
          'because RFC 8785\'s number rules are where canonicalisers diverge and a bound compared as a ' +
          'number here would be compared as text by whoever verifies it.',
        );
      }
    }
  }
  return canonicalise({
    type: EVALUATION_VERDICT_PAYLOAD_TYPE,
    ...Object.fromEntries(SIGNED_FIELDS.map((f) => [f, (v as unknown as Record<string, string>)[f]])),
    ...(v.breachedConstraint === undefined ? {} : { breachedConstraint: v.breachedConstraint }),
    ...(v.routingConstraint === undefined ? {} : { routingConstraint: v.routingConstraint }),
    ...(v.remainingAfterApproval === undefined ? {} : { remainingAfterApproval: v.remainingAfterApproval }),
    // ENUMERATED, NEVER SPREAD. A field a caller attached to `denialDetail` cannot reach the signed
        // bytes by any route, which is why `terminal` cannot arrive as a fifth member.
    ...(detail === undefined ? {} : {
      denialDetail: Object.fromEntries(
        SIGNED_DETAIL_FIELDS.filter((f) => detail[f] !== undefined).map((f) => [f, detail[f]]),
      ),
    }),
  });
}

// ─── THE PARITY OBLIGATION, ENFORCED AT COMPILE TIME ─────────────────────────────────────────────
//
// THIS IS NOT DECORATION AND IT IS NOT A TYPE UTILITY NOBODY USES. Three canonicalisers were measured
// byte-identical over this payload, and they agree ONLY because every field in it is a string. A
// non-string field would reach RFC 8785's number or boolean rules, where they diverge silently — the
// failure that breaks no test and makes every already-stored signature unverifiable by this function
// while both sides look correct.
//
// So the condition is checked by the compiler rather than remembered by a reader. `NonStringFields`
// resolves to the NAMES of any members that are not strings; the assignment below only compiles while
// that is `never`.
//
// IF THIS FILE STOPS COMPILING HERE, DO NOT WIDEN THE GUARD. Re-run the three-way canonicaliser parity
// measurement over the new shape, and if they diverge the field cannot be signed. `terminal` is
// excluded from `SignedDenialDetail` for exactly this reason and is the worked example.
type NonStringFields<T> = { [K in keyof T]-?: NonNullable<T[K]> extends string ? never : K }[keyof T];
type ParityHolds<T> = NonStringFields<T> extends never ? true : NonStringFields<T>;

/** `true` while every signed field is a string. Becomes the offending field's NAME otherwise, so the
 * compiler error says which field broke the parity condition. */
const _PARITY_OBLIGATION: ParityHolds<SignedDenialDetail> = true;
/** Same, for the payload itself. `denialDetail` is excluded because it is the nested object guarded
 * above; every other member must be a string. */
const _PARITY_OBLIGATION_PAYLOAD: ParityHolds<Omit<SignableEvaluationVerdict, 'denialDetail'>> = true;
void _PARITY_OBLIGATION;
void _PARITY_OBLIGATION_PAYLOAD;
