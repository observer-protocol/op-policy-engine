// The record saying "we stopped this" is the only artifact of a refused payment.
//
// ─── WHY THIS EXISTS, AND WHY RELEASES DO NOT GET ONE ────────────────────────────────────────────
//
// A release sits downstream of an instruction and an executor report that are BOTH signed and
// independently checkable. Signing it would sign this service's own summary of things a third party
// can already verify, which is the argument `attestation.ts` already makes about signing your own
// finding: it adds nothing a reader can check. The in-mandate path establishes authority at
// issuance, so a release re-establishes nothing.
//
// A REFUSAL IS THE OPPOSITE SHAPE. There is no instruction and no report beside it. A third party
// can verify the credential says the cap is 25.00 and NOTHING establishes that this service applied
// it, or produced the record at all. For a product whose value is provable enforcement, "we let this
// through" was corroborated and "we stopped this" was corroborated by nothing.
//
// The volume argument does not reach it: a refused payment is by definition the exception.
//
// ─── ENUMERATED PER AUTHORITY, NOT CHECKED FLAT ──────────────────────────────────────────────────
//
// An absent field and an omitted one canonicalise to the same bytes and are opposite facts. That is
// why `breachedConstraint` cannot simply be "required unless deployment-guard": a flat check cannot
// tell "this guard breached no mandate constraint" from "someone dropped the field".
//
// So the payload is built PER AUTHORITY, the way `enumeratedOutcome` is built per outcome kind. A
// deployment-guard payload has NO SLOT for a constraint, so its absence is structural rather than
// incidental, and a mandate payload cannot be signed without one.
//
// The same applies to the two things that are legitimately unavailable: `appliedBound` and
// `credentialDigest` are carried as POSITIVE STATES, never as missing keys, so a signed refusal
// asserts "no bound was supplied, and here is why" rather than staying silent and letting a reader
// guess whether the field was dropped.
import { canonicalise } from '../attestation-jcs.js';
import type { AppliedBound, AppliedBoundReason, Refusal, RefusalAuthority } from './types.js';
import type { AttestationBlock } from '../attestation.js';
import type { SpendRecord } from './types.js';

/** DOMAIN SEPARATION. A refusal must not verify as a lapse, an instruction, a report or a verdict:
 * five different claims, by different parties, about different things. */
/** THE VERSION THIS BUILD ISSUES. Changing it changes only what NEW records are signed under.
 * A stored record is rebuilt under ITS OWN type, never under this one — see `REFUSAL_PAYLOAD_TYPE_V1`. */
export const REFUSAL_PAYLOAD_TYPE = 'op.enforcement.refusal.v3';

/** WHAT A RECORD WITH NO RECORDED TYPE WAS SIGNED UNDER, and it is a fact rather than a fallback:
 * every refusal written before the type was persisted was signed under v1.
 *
 * IT MUST NEVER TRACK `REFUSAL_PAYLOAD_TYPE`. Measured 2026-08-07: `type` is INSIDE the signed
 * payload, so rebuilding an old record under a bumped constant emits bytes the signature does not
 * cover, and every stored refusal reports DOES NOT VERIFY at once. Demonstrated by setting the
 * constant to v2 and watching the committed fixture fail. */
export const REFUSAL_PAYLOAD_TYPE_V1 = 'op.enforcement.refusal.v1';

/** v2 ADDS ONE FIELD: `citation`, the determination the refusal refused on.
 *
 * WHY A NEW VERSION RATHER THAN WIDENING v1. Adding an optional field is harmless for OLD records —
 * `canonicalise` drops undefined members, so a record with no citation rebuilds to identical bytes —
 * but it breaks in the other direction: a NEW record carrying a citation does NOT verify under an OLD
 * verifier, which rebuilds without the field and reports a FALSE NEGATIVE on a valid record. The
 * `@context` fix could be made on both sides because both sides were ours. A recipient's verifier is
 * not ours, so correctness must not depend on them upgrading first. */
export const REFUSAL_PAYLOAD_TYPE_V2 = 'op.enforcement.refusal.v2';

/** v3 ADDS `appliedBound.reason` AND SIGNS `appliedBound.note` ON THE `recorded` ARM.
 *
 * Same reasoning as v2 and the same failure it avoids: a NEW record carrying either field does not
 * verify under an OLD verifier, which rebuilds without them and reports a FALSE NEGATIVE on a valid
 * record. Widening v2 in place would do that to every verifier already deployed.
 *
 * ─── A v3 RECORD REACHING A PRE-v3 VERIFIER IS A FALSE NEGATIVE, NOT A DETECTION ────────────────
 *
 * It reports DOES NOT VERIFY on a sound record, in front of the recipient the whole record exists to
 * convince. This estate has paid for that once already: 906 of 906 verdicts rendered SIGNATURE NOT
 * VERIFIED while every signature was sound. So every verifier that can reach a v3 record must
 * understand v3 BEFORE such a record exists, and that ordering is not something this file can
 * enforce — it is a release sequence. */
export const REFUSAL_PAYLOAD_TYPE_V3 = 'op.enforcement.refusal.v3';

/** WHICH PAYLOAD VERSIONS CARRY A CITATION, AS A SET AND DELIBERATELY NOT AS A FLOOR.
 *
 * This was `type === REFUSAL_PAYLOAD_TYPE_V2`, an equality, so a v3 record emitted the right token
 * and rebuilt WITHOUT its citation — wrong bytes, read as a bad signature, in the build that
 * introduced v3.
 *
 * A FLOOR (`>= v2`) WOULD BE THE WRONG FIX FOR TWO SEPARATE REASONS.
 *
 * These are opaque type tokens, not ordered versions: lexical comparison happens to rank v1 < v2 <
 * v3 and ranks `v10` BELOW `v2`, so the ordering is not total and the comparison quietly stops being
 * one the day a tenth version exists.
 *
 * And the deeper reason: a floor asserts that every FUTURE version carries a citation — a claim
 * about payloads nobody has designed. That is the same guess this equality already made, widened
 * rather than removed.
 *
 * A SET MAKES THE NEXT VERSION A DECISION. Adding v4 means adding it here, which means someone
 * stating that v4 carries a citation, which is exactly the thought the floor would skip. */
const CITATION_BEARING: ReadonlySet<string> = new Set([
  REFUSAL_PAYLOAD_TYPE_V2,
  REFUSAL_PAYLOAD_TYPE_V3,
]);

/** The versions whose `appliedBound` carries `reason`, and whose `recorded` arm signs its `note`.
 *  Same construction and the same reason: a set, so a fourth version is a decision. */
const REASON_BEARING: ReadonlySet<string> = new Set([REFUSAL_PAYLOAD_TYPE_V3]);

/** THE REASON VOCABULARY AT RUNTIME, because the union is erased at the boundary this package sits
 *  on. Every caller here is JavaScript to the compiler; a closed type it cannot see is a convention. */
const REASON_VALUES: ReadonlySet<string> = new Set<AppliedBoundReason>(
  ['no-authority', 'not-reached', 'none-configured'],
);

/** WHICH CREDENTIAL'S CAP WAS APPLIED, as a positive state.
 *
 * THE MOST VALUABLE FIELD IN THIS PAYLOAD. Without it a reader holds the bound this service asserts
 * and the credential they were given, with nothing binding the two — this service could have applied
 * a different credential's cap and the signature would look identical. With it, the signature says
 * THIS refusal applied THAT credential.
 *
 * It is `VerdictFacts.credentialDigest`, which is OPTIONAL: an evaluator may not supply one, and a
 * deployment-guard refusal happens before any verdict exists, so there is never one to record. Both
 * are stated rather than omitted. */
export type SignedCredentialRef =
  | { state: 'digest'; value: string }
  | { state: 'not-supplied'; note: string };

export interface SignableRefusal {
  refusalId: string;
  at: string;
  authority: RefusalAuthority;
  code: string;
  agentId: string;
  mandateId: string;
  spend: SpendRecord;
  credential: SignedCredentialRef;
  /** Required on a `mandate` refusal. Must be absent on a `deployment-guard` one. */
  breachedConstraint?: string;
  /** Required on a `mandate` refusal. Must be absent on a `deployment-guard` one. */
  appliedBound?: AppliedBound;
  /** The payload version this record's signature covers. Absent means v1: see
   * `REFUSAL_PAYLOAD_TYPE_V1`. Carried so a rebuild uses the RECORD'S rule set, not the build's. */
  payloadType?: string;
  /** The determination this refusal refused on, when one was cited. Covered by the signature under
   * v2 only; a v1 record carrying one must still rebuild without it. */
  attestation?: AttestationBlock;
  /** Required on a `deployment-guard` refusal: the guard's whole subject. Absent on a mandate one. */
  network?: string;
}

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v !== '';

function requireFields(r: Record<string, unknown>, fields: readonly string[], context: string): void {
  for (const f of fields) {
    if (!nonEmpty(r[f])) {
      throw new Error(
        `Cannot sign a refusal with no ${f}${context}. An absent field canonicalises to the same ` +
        `bytes as an omitted one, so this would produce a signature over a refusal that does not ` +
        `say what it stopped or on whose authority.`,
      );
    }
  }
}

/** The money, as integers a reader can sum.
 *
 * `decimals` IS STRINGIFIED, and that is not cosmetic: `src/jcs.ts` refuses numbers outright, so a
 * numeric field here does not produce a different signature, it produces no signature at all. Every
 * other signed payload in this package carries scale the same way. */
function enumeratedSpend(s: SpendRecord): Record<string, string> {
  if (!nonEmpty(s?.amountRaw) || typeof s?.decimals !== 'number' || !nonEmpty(s?.rail) || !nonEmpty(s?.asset)) {
    throw new Error(
      'Cannot sign a refusal whose spend does not carry rail, asset, amountRaw and numeric decimals. ' +
      'A refusal that cannot say what it stopped, in units a reader can sum, does not answer the ' +
      'question a refusal log exists for.',
    );
  }
  return {
    rail: s.rail,
    asset: s.asset,
    amountRaw: s.amountRaw,
    decimals: String(s.decimals),
    // ENUMERATED, so a property attached to the spend object cannot ride into the signed bytes.
    ...(s.counterparty === undefined ? {} : { counterparty: s.counterparty }),
  };
}

/** The bound, per state. `recorded` must carry a limit: a bound with no limit is not a bound.
 *
 * ─── VERSION-GATED, BECAUSE THE ONLY SAFE ASSUMPTION IS ABOUT RECORDS I CANNOT SEE ─────────────
 *
 * `reason` and the `recorded` arm's `note` are emitted only for `REASON_BEARING` types. Not because
 * old records are known to lack them — because they are NOT known to. This package is deployed
 * beyond the stores anyone here can inspect, and a v1 record somewhere carrying a `recorded` note
 * would, under an ungated copy, rebuild with a field its signature never covered and flip to DOES
 * NOT VERIFY. Gating makes "old records rebuild byte-identically" a property of the code rather than
 * a belief about deployments.
 *
 * ─── S10, RULED: `recorded.note` JOINS THE SIGNED SET RATHER THAN LEAVING THE TYPE ──────────────
 *
 * The type accepted `note` on the `recorded` arm and this function dropped it, so a note there would
 * have been stored, served, rendered and unsigned — with the type telling every caller otherwise.
 * Nothing sets it today, so it was a trap rather than a live defect. Both fixes were available.
 *
 * IT IS SIGNED, AND THE `not-supplied` ARM IS WHY. That arm signs its note and refuses to sign
 * without one, on the stated grounds that a note is what makes the bound a claim rather than a
 * silence. The same field, on the same object, signed on one arm and discarded on the other, is the
 * inconsistency — not the note's existence.
 *
 * AND REMOVING IT WOULD FORECLOSE A REAL CLAIM. `mandateCeiling` may be the credential's figure or a
 * deployment's tighter one, and the two are indistinguishable at the point this is built. A
 * `recorded` bound that needs to say which is describing its own arithmetic, which is exactly what a
 * signed note is for. Dropping the field would have removed the only place to say it. */
function enumeratedBound(b: AppliedBound, type: string): Record<string, unknown> {
  if (b?.state === 'recorded') {
    if (!nonEmpty(b.limit)) {
      throw new Error(
        'Cannot sign a refusal whose appliedBound is `recorded` with no limit. The arithmetic is the ' +
        'substance of the claim — a signed bound that names no limit asserts only that some bound existed.',
      );
    }
    return {
      state: 'recorded',
      limit: b.limit,
      ...(b.unit === undefined ? {} : { unit: b.unit }),
      ...(b.observed === undefined ? {} : { observed: b.observed }),
      ...(b.headroom === undefined ? {} : { headroom: b.headroom }),
      ...(REASON_BEARING.has(type) && b.note !== undefined ? { note: b.note } : {}),
    };
  }
  if (b?.state === 'not-supplied') {
    if (!nonEmpty(b.note)) {
      throw new Error(
        'Cannot sign a refusal whose appliedBound is `not-supplied` with no note. The note is what ' +
        'makes the absence a claim rather than a silence.',
      );
    }
    // REFUSED RATHER THAN DEFAULTED. A `reason` this function does not recognise must not be
    // silently dropped into prose: that is the state this field exists to end, and a payload that
    // omitted it would be signed as though the absence were the claim.
    if (REASON_BEARING.has(type) && !REASON_VALUES.has(b.reason as string)) {
      throw new Error(
        `Cannot sign a ${type} refusal whose appliedBound reason is ${JSON.stringify(b.reason)}. ` +
        `The reasons are ${[...REASON_VALUES].join(', ')}; an unrecognised one is refused rather ` +
        'than omitted, because a bound whose absence this service cannot explain must not carry a ' +
        'signature saying it can.',
      );
    }
    return {
      state: 'not-supplied',
      ...(b.constraint === undefined ? {} : { constraint: b.constraint }),
      ...(REASON_BEARING.has(type) ? { reason: b.reason } : {}),
      note: b.note,
    };
  }
  throw new Error(
    `Cannot sign a refusal whose appliedBound state is ${JSON.stringify((b as { state?: unknown })?.state)}. ` +
    'The two states are `recorded` and `not-supplied`; an unrecognised one is refused rather than ' +
    'signed, because a bound this service cannot describe must not carry a signature saying it can.',
  );
}

function enumeratedCredential(c: SignedCredentialRef): Record<string, string> {
  if (c?.state === 'digest') {
    if (!nonEmpty(c.value)) {
      throw new Error(
        'Cannot sign a refusal whose credential state is `digest` with no value. A digest field with ' +
        'no digest in it is a placeholder wearing the name of the thing it stands for.',
      );
    }
    return { state: 'digest', value: c.value };
  }
  if (c?.state === 'not-supplied') {
    if (!nonEmpty(c.note)) throw new Error('Cannot sign a refusal whose credential is `not-supplied` with no note.');
    return { state: 'not-supplied', note: c.note };
  }
  throw new Error(
    `Cannot sign a refusal whose credential state is ${JSON.stringify((c as { state?: unknown })?.state)}.`,
  );
}

/** The exact bytes this deployment signs to record that it refused a payment.
 *
 * ─── WHAT IS DELIBERATELY NOT IN HERE ────────────────────────────────────────────────────────────
 *
 * `reason` — PROSE. It is reworded freely and `code` plus `breachedConstraint` carry the stable
 * facts. A signature over a sentence binds a sentence.
 *
 * `amount` and `asset` as top-level fields — the evaluator's decimal form of money that `spend`
 * already carries as integer minor units. Two representations of one fact inside one signature is
 * the pair class this codebase keeps finding, and it would be the worst instance of it: the
 * signature would cover both while relating them to nothing.
 *
 * `observedAt` — the service clock. It is stamped inside `commit`, at the single write point, AFTER
 * this payload is built, and that ordering is exactly what makes it impossible for a caller to
 * supply: there is no parameter for it on any method. Signing it means introducing one.
 *
 * SO THE SCOPE OF THIS SIGNATURE IS WHAT WAS REFUSED, NOT WHEN THIS SERVICE SAW IT. `at` is inside
 * and is caller-supplied. A reader must not read a verified refusal as attesting to service-observed
 * time. Recorded in KNOWN-LIMITS rather than left for someone to infer from an absence. */
/** THE CITATION, AS A NAMED PROJECTION rather than the whole attestation block.
 *
 * WHAT IT ANSWERS, and it is exactly the three questions a refused party could not previously ask:
 * WHICH determination (`decisionId`), WHO decided it (`decider`), and WHAT it said (`outcome`).
 * `state` is carried because "a determination that verified and said no" and "a determination that
 * could not be checked" are different facts and both refuse.
 *
 * NO PROSE. The block's non-attested variants carry a `reason` sentence, deliberately left out:
 * prose inside a signature is a claim being attested, and a sentence written for one code is
 * inherited by every later code routed through the same helper.
 *
 * A NAMED LIST, so a field added to `AttestationBlock` upstream cannot silently widen what this
 * deployment signs. */
function citationOf(a: AttestationBlock | undefined): Record<string, unknown> | undefined {
  if (a === undefined) return undefined;
  if (a.state !== 'attested') return { state: a.state };
  return { state: a.state, decisionId: a.decisionId, decider: a.decider, outcome: a.outcome };
}

export function refusalPayload(r: SignableRefusal): string {
  requireFields(r as unknown as Record<string, unknown>,
    ['refusalId', 'at', 'code', 'agentId', 'mandateId'], '');

  const type = r.payloadType ?? REFUSAL_PAYLOAD_TYPE_V1;
  // THE FIELD LIST IS CHOSEN BY THE RECORD'S VERSION, NOT BY THIS BUILD. A v1 record that carries an
  // attestation must STILL rebuild WITHOUT a citation: v1 did not cover it, so including it would
  // emit bytes that signature never saw. This is the whole reason the type is recorded.
  const citation = CITATION_BEARING.has(type) ? citationOf(r.attestation) : undefined;
  const base = {
    // FROM THE RECORD, NOT FROM THIS BUILD. See REFUSAL_PAYLOAD_TYPE_V1.
    type,
    refusalId: r.refusalId,
    at: r.at,
    code: r.code,
    agentId: r.agentId,
    mandateId: r.mandateId,
    spend: enumeratedSpend(r.spend),
    credential: enumeratedCredential(r.credential),
    ...(citation === undefined ? {} : { citation }),
  };

  // ─── PER AUTHORITY. The two shapes do not overlap and neither can borrow the other's fields. ──
  if (r.authority === 'mandate') {
    if (!nonEmpty(r.breachedConstraint)) {
      throw new Error(
        'Cannot sign a MANDATE refusal with no breachedConstraint. This is the claim that a signed ' +
        "credential's own constraint stopped the payment; without naming which, the signature asserts " +
        'only that something did.',
      );
    }
    if (r.appliedBound === undefined) {
      throw new Error(
        'Cannot sign a MANDATE refusal with no appliedBound. The bound arithmetic is what a third ' +
        'party checks the refusal against — an unsupplied bound is recorded as `not-supplied` with a ' +
        'note, which is a claim, rather than omitted, which is a silence.',
      );
    }
    return canonicalise({
      ...base,
      authority: 'mandate',
      breachedConstraint: r.breachedConstraint,
      appliedBound: enumeratedBound(r.appliedBound, type),
    });
  }

  if (r.authority === 'deployment-guard') {
    // NO SLOT FOR A CONSTRAINT OR A BOUND. A deployment guard breached no mandate constraint and
    // consulted no mandate, so there is nothing to name. Refusing them here rather than dropping
    // them makes a caller that supplies one fix their call rather than sign a misleading record.
    if (r.breachedConstraint !== undefined) {
      throw new Error(
        'A deployment-guard refusal must not carry a breachedConstraint. It breached no mandate ' +
        'constraint — it never consulted a mandate — and signing one would attribute a deployment ' +
        "decision to a credential's own rule, which is the reverse of what this record exists to show.",
      );
    }
    // A `not-supplied` BOUND IS CORRECT HERE AND IS KEPT. Five of the six guard call sites already
    // write one, carrying a note that says no mandate constraint was evaluated — which is exactly
    // the positive absence this design wants, and refusing it would delete the explanation.
    //
    // A `recorded` BOUND IS NOT. A guard consulted no mandate, so a limit here would assert that a
    // credential's own arithmetic refused the payment when nothing evaluated any.
    if (r.appliedBound !== undefined && r.appliedBound.state === 'recorded') {
      throw new Error(
        'A deployment-guard refusal must not carry a RECORDED appliedBound. It consulted no mandate, ' +
        "so a limit here would attribute a deployment decision to a credential's own arithmetic. A " +
        '`not-supplied` bound stating why no bound was evaluated is correct and is kept.',
      );
    }
    if (!nonEmpty(r.network)) {
      throw new Error(
        'Cannot sign a DEPLOYMENT-GUARD refusal with no network. The network is the guard\'s whole ' +
        'subject: a test-only deployment refusing a mainnet identifier is the claim being made.',
      );
    }
    return canonicalise({
      ...base,
      authority: 'deployment-guard',
      network: r.network,
      ...(r.appliedBound === undefined ? {} : { appliedBound: enumeratedBound(r.appliedBound, type) }),
    });
  }

  throw new Error(
    `Cannot sign a refusal whose authority is ${JSON.stringify(r.authority)}. The two authorities are ` +
    '`mandate` and `deployment-guard`; an unrecognised one is refused rather than signed, because a ' +
    'refusal whose authority this service cannot name must not carry a signature saying it can.',
  );
}

/** Rebuild the signable form from a stored record, so a verifier and the signer cannot drift.
 *
 * DERIVED FROM THE RECORD, NEVER STORED ALONGSIDE IT. A persisted copy of the signed bytes would be
 * a second source for the same fact, and the two would disagree the first time the payload changed. */
/** `reason` is optional on the input because it is prose outside the signed bytes, and a record
 *  rebuilt from a served row (see `signableFromRefusalRow`) does not carry it. */
export function signableFromRefusal(r: Omit<Refusal, 'reason'> & { reason?: string }): SignableRefusal {
  // A SERVED ROW IS REFUSED BY NAME, NOT BY ACCIDENT. Handed the shape `GET /v1/refusals` sends,
  // this function used to read the top-level `agentId` as absent and throw "no agentId", and read
  // the version from a top-level `payloadType` the served shape does not have, so a v3 row
  // rebuilt as v1. Both are wrong answers to a wrong-shape input, and the second is a false
  // negative. The served shape has a positive marker, so it is named and redirected instead.
  const sig = (r as { signature?: unknown }).signature;
  if (sig !== null && typeof sig === 'object' && 'state' in (sig as object)) {
    throw new Error(
      'signableFromRefusal was handed a SERVED refusal row (the shape GET /v1/refusals sends and a ' +
      'console copy button emits: `refusedBy`, `attempted`, a signature OBJECT). It reads the store ' +
      'shape. Rebuild a served row with signableFromRefusalRow(row) first: ' +
      'refusalPayload(signableFromRefusal(signableFromRefusalRow(row))).',
    );
  }
  const digest = (r as { credentialDigest?: string }).credentialDigest;
  return {
    // ABSENT MEANS v1, and this is the ONLY place that decision is made, so a record written before
    // the type was persisted rebuilds under the rules it was actually signed with.
    payloadType: (r as { payloadType?: string }).payloadType ?? REFUSAL_PAYLOAD_TYPE_V1,
    // CARRIED SO v2 CAN SIGN IT. The record has held this since required-mode landed; nothing
    // signed it and nothing served it, so a refused party could not see what refused them.
    ...(r.attestation === undefined ? {} : { attestation: r.attestation }),
    refusalId: r.refusalId,
    at: r.at,
    authority: r.authority,
    code: r.code,
    agentId: r.attribution?.agentId ?? '',
    mandateId: r.attribution?.mandateId ?? '',
    spend: r.spend,
    // ─── THE NOTE IS INSIDE THE SIGNATURE, SO IT MUST BE TRUE OF EVERY RECORD IT LANDS ON ────────
    //
    // It read: "A deployment-guard refusal happens before any verdict exists, so no credential was
    // evaluated." That is true of the network guard and of NO_VERDICT. It is FALSE of
    // DECIDER_IS_EVALUATOR, ATTESTATION_INVALID, ATTESTATION_CONTRADICTS_PAYMENT and
    // VERDICT_CONTRADICTS_PAYMENT, every one of which runs with a verdict in hand.
    //
    // A FALSE CLAIM ON A SCREEN CAN BE CORRECTED. A false claim inside a signature is durable, and
    // the signature attests to it: every refusal already issued under that wording is permanently
    // wrong about how it came to exist.
    //
    // THE DISCRIMINATOR IS THE RECORD'S OWN attribution.agentId, which is copied from the verdict and
    // is therefore present exactly when a verdict existed. Derived rather than passed in, so a new
    // refusal site cannot pick the wrong sentence by forgetting to choose one.
    //
    // AND A GUARD NEVER SPEAKS FOR THE EVALUATOR. Both guard sentences describe what the GUARD did.
    // The first draft of the with-verdict case said "the evaluator supplied no credentialDigest with
    // it" — a guard asserting something about a party it did not consult. Caught by an existing
    // assertion that encodes exactly that rule, which is the test being right and the change wrong.
    credential: nonEmpty(digest)
      ? { state: 'digest', value: digest }
      : {
          state: 'not-supplied',
          note: r.authority !== 'deployment-guard'
            ? 'The evaluator supplied no credentialDigest with this verdict, so this service cannot say which credential document the bound came from.'
            : nonEmpty(r.attribution?.agentId)
              ? 'A deployment guard refused this with a verdict present, and a guard reads no credential, so there is no digest to record. This describes the GUARD, not the evaluator.'
              : 'A deployment guard refused this BEFORE any verdict existed, so no credential was evaluated and there is no digest to record.',
        },
    ...(r.breachedConstraint === undefined ? {} : { breachedConstraint: r.breachedConstraint }),
    ...(r.appliedBound === undefined ? {} : { appliedBound: r.appliedBound }),
    ...(r.network === undefined ? {} : { network: r.network }),
  };
}
