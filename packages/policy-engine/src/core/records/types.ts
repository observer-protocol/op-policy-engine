// THE RECORD SHAPES A COUNTERPARTY NEEDS IN ORDER TO RECONSTRUCT SIGNED BYTES.
//
// WHY THESE LIVE IN THE ENGINE. Until 1.0.0-rc.8 every payload construction lived in
// `op-mcp-payment-server`, and the engine exported `jcsBytes` and `verifyEddsaJcs2022` — primitives,
// not shapes. A counterparty could hash bytes and check a signature; what they could not do is
// CONSTRUCT the bytes a refusal was signed over, which is the only part that requires knowing the
// shape. That is not a gap in the export. The export was never of the thing that matters.
//
// AN ENGINE THAT DEFINES POLICY EVALUATION BUT NOT RECORD SHAPES leaves the shapes somewhere a
// counterparty cannot reach, which is the whole gap. Ruled 2026-08-09; this is a deliberate widening of
// what the engine is, not scope creep.
//
// THE CLOSURE WAS MEASURED, NOT ASSUMED. Seven types, none referencing anything outside the set:
// `SpendRecord` is all primitives, `Attribution` two optional strings, `RefusalAuthority` a string
// union, `AppliedBound` a two-variant union of primitives, and `AttestationBlock` already came from
// here. A prior scoping asserted this closure without measuring it and happened to be right.

import type { AttestationBlock } from '../attestation.js';

/** What actually moved, as the record states it. */
export interface SpendRecord {
  rail: string;
  asset: string;
  amountRaw: string;
  decimals: number;
  /** As the MANDATE matched it, not as the rail names it. */
  counterparty?: string;
}

/** WHO the payment was for, when the record can say. Both optional: a verdict may name neither party,
 * and two unrecorded values are two unanswered questions rather than one. */
export interface Attribution {
  agentId?: string;
  mandateId?: string;
}

/** WHICH AUTHORITY REFUSED, and the distinction is load-bearing: a `mandate` refusal is the credential
 * saying no, a `deployment-guard` refusal is this deployment saying it could not establish something.
 * They are different claims and a reader must not have to infer which. */
export type RefusalAuthority = 'mandate' | 'deployment-guard';

/** THE BOUND THAT WAS APPLIED, as a positive state rather than a missing key.
 *
 * `not-supplied` says the evaluator compared nothing; a record with the field simply absent would leave
 * a reader unable to tell that from a record whose writer forgot. */
export type AppliedBound =
  | { state: 'recorded'; limit: string; unit?: string; observed?: string; headroom?: string; note?: string }
  | { state: 'not-supplied'; constraint?: string; note?: string };

/** THE SCHEMA VERSION `ApproverKeyAssurance` MIRRORS. A vocabulary type with no version is a claim
 * about a moving target: it says "these are the values" without saying values of WHAT, at WHEN.
 *
 * READ BY `test/approver-assurance-vocabulary.mjs`, which fetches this exact version and fails if the
 * served enum and the union below have diverged. **So this constant is not documentation — changing it
 * changes which document the check compares against.** Bump it and the union together, never alone. */
export const APPROVER_KEY_ASSURANCE_SCHEMA_VERSION = 'v2.7';

/** HOW AN APPROVER KEY NAMED IN A CREDENTIAL IS HELD. `actionScope.approvers[].keys[].assurance`,
 * mirroring `delegation/{@link APPROVER_KEY_ASSURANCE_SCHEMA_VERSION}.json`.
 *
 * NAMED `ApproverKeyAssurance` AND NOT `ApprovalAssurance`, AFTER rc.8 SHIPPED THE WRONG NAME.
 * `op-mcp-payment-server` has an `ApprovalAssurance` meaning something else entirely — what a
 * RESOLUTION'S SIGNATURE establishes about who approved.
 *
 * ─── THEY OVERLAP ON THREE MEMBERS AND THEY ARE STILL DIFFERENT IDEAS ────────────────────────────
 *
 * The rc.9 note here said the overlap was "a single member by coincidence of vocabulary". **That was
 * wrong twice.** Measured 2026-08-08: `op-mcp-payment-server`'s `ApprovalAssurance` is
 * `org-attested | operator-held | approver-held | device-bound`, four members, and this union was a
 * strict SUBSET of it. Adding `org-attested` below makes the overlap three.
 *
 * **THE OVERLAP IS NOT THE ARGUMENT AND NEVER WAS.** RULED 2026-08-08: these stay two types at three
 * shared members exactly as they were at two, because they answer different questions. This one asks
 * how a key named in a CREDENTIAL is held. That one asks what a RESOLUTION'S SIGNATURE establishes
 * about who approved. **A type exported so a counterparty has the vocabulary must match the vocabulary
 * the schema publishes**, and being wrong about a served artifact is worse than two types resembling
 * each other. The defence against conflating them is this name and this comment, not a stale union.
 *
 * So: do not widen this to reconcile it with `ApprovalAssurance`, and do not narrow that one to meet
 * this. Neither is a superset of the other by intent; the resemblance is what the schema happens to
 * need, and it will move again.
 *
 * ─── THE MEMBERS ────────────────────────────────────────────────────────────────────────────────
 *
 * `operator-held` needs only DID resolution and signature verification. `device-bound` requires
 * verifying the key IS device-bound, which is not honourable until enrolment publishes something
 * checkable, and which the schema couples to the `approval.assurance-verification` capability — **that
 * coupling triggers on this VALUE, not on the field being present**, and is unchanged v2.5 through
 * v2.7. `org-attested` entered the schema at **v2.6** and requires no capability.
 *
 * NOTHING ELSE IN THIS PACKAGE CONSUMES IT — measured, not assumed: no runtime code in `src/` branches
 * on these values and `validateStructure` never reads `approvers` at all. It is exported because a
 * counterparty reading an `actionScope.approvers` entry needs the vocabulary, which is exactly why it
 * being two versions stale was a published package rejecting a value the schema permits.
 *
 * ─── THE LIST IS THE VALUE AND THE TYPE IS DERIVED FROM IT ──────────────────────────────────────
 *
 * A hand-written union plus a separate array for the check would be two representations of one fact,
 * and the check would pass while they disagreed with each other and with the schema. **The union
 * below is `typeof ... [number]`, so there is exactly one place to edit and the check reads the same
 * bytes the type is built from.** A counterparty needing the values at runtime gets them here rather
 * than retyping them. */
export const APPROVER_KEY_ASSURANCE = ['org-attested', 'operator-held', 'device-bound'] as const;

export type ApproverKeyAssurance = typeof APPROVER_KEY_ASSURANCE[number];

/** A refused payment, as the store records it. The signable subset is derived from this by
 * `signableFromRefusal`; this is the shape a reader holds. */
export interface Refusal {
  refusalId: string;
  authority: RefusalAuthority;
  observedAt?: string;
  at: string;
  code: string;
  reason: string;
  attribution?: Attribution;
  network?: string;
  spend: SpendRecord;
  appliedBound?: AppliedBound;
  /** THE ATTESTATION STATE THAT WAS JUDGED, carried onto the refusal. Without it a forged citation
   * refused here survives only as prose in `reason`, and a coverage panel counting states rather than
   * sentences would show the control as cleaner than it is. */
  attestation?: AttestationBlock;
  breachedConstraint?: string;
  credentialDigest?: string;
  payloadType?: string;
  signature?: string;
  signedBy?: string;
}
