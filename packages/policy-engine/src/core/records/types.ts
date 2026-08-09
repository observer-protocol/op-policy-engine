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

/** The approver identity a resolution is signed under. */
export interface ResolutionActor {
  issuer: string;
  approverRef: string;
  assurance: ApprovalAssurance;
}

/** How the approver's key custody is established. `operator-held` needs DID resolution and signature
 * verification; `device-bound` requires verifying the key IS device-bound, which is not honourable
 * until enrolment publishes something checkable. */
export type ApprovalAssurance = 'operator-held' | 'device-bound';

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
