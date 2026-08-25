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
/** WHY NO BOUND WAS COMPARED, AS A CLOSED SET RATHER THAN AS PROSE.
 *
 * ─── THE NOTE WAS ALREADY SIGNED, AND PROSE IS THE WEAK FORM OF CLOSED ──────────────────────────
 *
 * `not-supplied` has always carried a `note`, inside the signature, and refuses to sign without one.
 * So the absence was already a claim rather than a silence. What it was not is READABLE BY ANYTHING
 * BUT A PERSON: a recipient cannot separate "no bound compared because no authority was granted"
 * from "no bound compared because an earlier gate fired" except by reading English.
 *
 * Three deployments' worth of findings point at the same missing fact — which checks were reached
 * and which were not — and this is the smallest field that answers it where the record already has
 * somewhere to put it.
 *
 *   `not-reached`      an earlier check refused first, so this bound was never evaluated. The
 *                      ceiling comparison precedes the citation gate, so a payment over the ceiling
 *                      never reaches the outcome comparison; that fact existed only as a read-layer
 *                      state a third party never received.
 *   `no-authority`     the mandate grants no spending authority at all, so there is no bound to
 *                      compare rather than a bound that was not reached. Distinct on purpose: one
 *                      is an ordering, the other is a scope.
 *   `none-configured`  the deployment has no bound configured for this constraint. The absence is
 *                      the deployment's, not the mandate's.
 *
 * CLOSED, so a fourth case stops compiling rather than falling into `note` and becoming prose again.
 * REQUIRED, on the same reasoning the note is: the thing that must be there has nowhere not to be. */
export type AppliedBoundReason = 'no-authority' | 'not-reached' | 'none-configured';

export type AppliedBound =
  | { state: 'recorded'; limit: string; unit?: string; observed?: string; headroom?: string; note?: string }
  | { state: 'not-supplied'; constraint?: string; reason: AppliedBoundReason; note?: string };

/** THE SCHEMA VERSION `RequiredKeyCustody` MIRRORS. A vocabulary type with no version is a claim
 * about a moving target: it says "these are the values" without saying values of WHAT, at WHEN.
 *
 * READ BY `test/approver-assurance-vocabulary.mjs`, which fetches this exact version and fails if the
 * served enum and the union below have diverged. **So this constant is not documentation — changing it
 * changes which document the check compares against.** Bump it and the union together, never alone. */
export const REQUIRED_KEY_CUSTODY_SCHEMA_VERSION = 'v2.7';

/** HOW AN APPROVER KEY NAMED IN A CREDENTIAL IS HELD. `actionScope.approvers[].keys[].assurance`,
 * mirroring `delegation/{@link REQUIRED_KEY_CUSTODY_SCHEMA_VERSION}.json`.
 *
 * NAMED `RequiredKeyCustody` AND NOT `ApprovalAssurance`, AFTER rc.8 SHIPPED THE WRONG NAME.
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
export const REQUIRED_KEY_CUSTODY = ['org-attested', 'operator-held', 'device-bound'] as const;

/* ─── WHAT A CREDENTIAL MAY REQUIRE, WHICH IS NOT WHAT A SIGNER CLAIMS ──────────────────────────
 *
 * RENAMED FROM `ApproverKeyAssurance` AT rc.14, AND THE OLD NAME ASSERTED SOMETHING THIS DOES NOT
 * CARRY. Nothing is ASSURED here: a principal states, in advance, what custody a key must be under
 * before its holder may approve. A constraint has been stated; nothing has been checked. The subject
 * is KEY CUSTODY, so it now says so. "Assurance" also has a fixed meaning in AI-safety and
 * regulator-facing work, and reusing it for key custody creates ambiguity where precision is the
 * product.
 *
 * RENAMED WITH ZERO ADOPTERS OUTSIDE THE ESTATE, hours after rc.13 published it. The cost of renaming
 * a published symbol will never be lower than the day it shipped, and rises monotonically after.
 *
 * ─── THREE MEMBERS HERE, FOUR IN THE PAYMENT SERVER, AND THAT IS NOT DRIFT ─────────────────────
 *
 * These three mirror the served delegation schema — measured from the published bytes, not assumed:
 * v2.5 serves ["operator-held","device-bound"] and v2.7 serves
 * ["org-attested","operator-held","device-bound"]. `op-mcp-payment-server`'s `ClaimedKeyCustody` has a
 * fourth, `approver-held`, which no schema version defines.
 *
 * A REQUIREMENT IS SET BEFORE THE FACT by the party granting authority. A CLAIM IS MADE AT THE TIME
 * OF THE ACT by the party exercising it. Different facts about different moments, and the MISMATCH
 * BETWEEN THEM IS EVIDENCE: a signer claiming custody no mandate could require is something a reader
 * must be able to see. One type covering both would make that unrepresentable — a check that cannot
 * fail because the shape prevents it.
 *
 * SO THIS TYPE MUST NOT TYPE A SIGNER'S CLAIM. `ClaimedKeyCustody` below exists for that, and
 * `SignableResolution.actor.assurance` is typed with it. If you are here to reconcile three against
 * four, this is the reason not to.
 *
 * CORRECTED AT rc.15. This paragraph previously read "…and `resolution.ts` does not export a custody
 * type for that reason", which was true and irrelevant: it does not EXPORT one, it USED one — this
 * one — on the actor. rc.14 shipped the rule and its violation in the same release, inside the note
 * written to prevent it. A note that is wrong on arrival is worse than no note, because it answers
 * "was this considered?" with yes.
 *
 * THE WIRE FIELD IS UNCHANGED and stays `assurance` inside signed credentials under v2.5 and v2.7.
 * Renaming it is a schema version; deferred to v2. */
export type RequiredKeyCustody = typeof REQUIRED_KEY_CUSTODY[number];

/* ─── THE rc.13 NAMES, RE-EXPORTED AS ALIASES AT rc.20 ──────────────────────────────────────────
 *
 * WHY THEY CAME BACK. rc.14 renamed these and recorded the change as "BREAKING FOR ANYONE ON
 * rc.13", a release that lived twenty-three minutes. **That was wrong about which release exposed
 * the name.** Measured from the published bundles: `APPROVER_KEY_ASSURANCE` appears 4 times in
 * rc.12's `dist/index.mjs` and once in its `dist/index.d.ts`, and `ApproverKeyAssurance` is
 * exported as a type from `dist/index.d.ts` line 28. rc.12 has been npm's `latest` since
 * 2026-08-10, so the rename breaks THE DEFAULT INSTALL, not a 23-minute release.
 *
 * Moving `latest` past rc.14 without these aliases would hand every existing caller `undefined`
 * silently — a value, not an error, in the vocabulary array they check credentials against.
 *
 * SAME VALUES, NOT COPIES. Each alias is the canonical binding itself, so the two cannot drift:
 * there is one array and one version string, referred to by two names. They are deprecated, not
 * supported: the new names are the ones that mirror the served schema, and these exist so a
 * `latest` move is not a silent break. */

/** @deprecated Renamed to {@link REQUIRED_KEY_CUSTODY} at rc.14. Alias kept from rc.20 because
 * rc.12 carried this name and was `latest` for twelve days. Use `REQUIRED_KEY_CUSTODY`. */
export const APPROVER_KEY_ASSURANCE = REQUIRED_KEY_CUSTODY;

/** @deprecated Renamed to {@link REQUIRED_KEY_CUSTODY_SCHEMA_VERSION} at rc.14. Alias kept from
 * rc.20 for the same reason. Use `REQUIRED_KEY_CUSTODY_SCHEMA_VERSION`. */
export const APPROVER_KEY_ASSURANCE_SCHEMA_VERSION = REQUIRED_KEY_CUSTODY_SCHEMA_VERSION;

/** @deprecated Renamed to {@link RequiredKeyCustody} at rc.14. rc.12 exported this type from
 * `index.d.ts`, so a TypeScript caller breaks on the rename exactly as a runtime caller does.
 * Use `RequiredKeyCustody`. */
export type ApproverKeyAssurance = RequiredKeyCustody;

/* ─── WHAT A SIGNER CLAIMS, WHICH IS NOT WHAT A CREDENTIAL REQUIRES ─────────────────────────────
 *
 * ADDED AT rc.15. `SignableResolution.actor.assurance` was typed `RequiredKeyCustody` through rc.13
 * and rc.14 — the vocabulary of what a credential MAY DEMAND — on a field recording what the signing
 * party SAID when they signed. The two are different facts about different moments:
 *
 *   A REQUIREMENT is set BEFORE THE FACT by the party granting authority.
 *   A CLAIM is made AT THE TIME OF THE ACT by the party exercising it.
 *
 * FOUR MEMBERS, NOT THREE, AND THE FOURTH IS THE POINT. `approver-held` is claimable and is in no
 * published delegation schema — measured from the served bytes: v2.5 serves two values and v2.7 three.
 * A signer CAN claim a custody level no mandate could have required, and **that mismatch is evidence a
 * reader must be able to see**. Typing the claim with the requirement vocabulary made it
 * unrepresentable, which is a check that cannot fail because the shape prevents it.
 *
 * SO THE REQUIREMENT TYPE IS NOT WIDENED. `REQUIRED_KEY_CUSTODY` stays at three and keeps mirroring
 * the schema; the fourth member lives here, where a claim belongs. Collapsing the two would lose the
 * only fact that makes the pair worth recording separately.
 *
 * NO RUNTIME ARRAY IS EXPORTED FOR THIS ONE, deliberately, and the asymmetry with
 * `REQUIRED_KEY_CUSTODY` is intentional. That array exists so a counterparty can CHECK a credential's
 * designation against a closed set. Nothing checks a claim against a set: `resolutionPayload` requires
 * only that the field is a non-empty string, and a claim outside the vocabulary is a fact about the
 * signer rather than a validation failure. Exporting values here would invite a membership check that
 * would refuse exactly the records worth looking at. */
export type ClaimedKeyCustody =
  | 'org-attested'
  | 'operator-held'
  /** The approver is the issuer and the approver holds their own key. Claimable, and designatable by
   * no published schema version — see the note above. */
  | 'approver-held'
  | 'device-bound';

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
