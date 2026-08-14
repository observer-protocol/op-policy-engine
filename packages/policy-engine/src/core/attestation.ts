// Decision attestation: THE BOUNDARY, and the rule written where someone would cross it.
//
// NOTHING IS IMPLEMENTED HERE. This file exists because the rule below has to live at the site where
// it would be violated, and a design note is not that site. Under delivery pressure in three months,
// a design note is not what gets read; the type someone is about to add a field to is.
//
// ═════════════════════════════════════════════════════════════════════════════
//   WE ATTEST TO A DECISION SOMETHING ELSE MADE.
//   WE DO NOT OBSERVE THE DECISION BEING MADE.
//
//   No capture layer. No LLM instrumentation. No reasoning evaluation.
// ═════════════════════════════════════════════════════════════════════════════
//
// WHY THE LINE IS LOAD-BEARING, and not a scoping preference. It is the same reason
// requiredPurchaseTerms binds to an artifact someone else signed: THE PARTY WHO BENEFITS FROM A
// CONTROL MUST NOT BE THE PARTY PRODUCING THE EVIDENCE IT WAS SATISFIED. An attestation that watched
// the decision would be us producing evidence about a system we are also selling.
//
// It is also the same reason org-attested is a NAMED level rather than the architecture: an
// attestation about a decision we observed proves that we observed it, not that the decision was
// sound. That is a signed log entry wearing a stronger name.
//
// ── HOW THE LINE GETS CROSSED, WHICH IS NOT BY ANYONE DECIDING TO CROSS IT ──
//
// The first buyer who asks "can you also tell us WHY it decided that" is asking for reasoning
// capture. It will arrive framed as a small addition to something already built, because by then
// something will be built and the addition will be one field.
//
// THE FIELD IS THE CROSSING. It will be called `rationale`, `reasoning`, `trace`, `deliberation`,
// `context`, `inputs`, or `explanation`. It will look like metadata. Adding it means this system now
// holds a record of how a decision was reached, which is the thing we said we do not do, and the
// artifact will not look different afterwards.
//
// ── WHAT TO DO INSTEAD ──
//
// The decider states its own reasons IN ITS OWN ARTIFACT, and we attest to that artifact. The
// distinction survives: they said it, we witnessed that they said it, and a reader can tell which is
// which. What we must not do is assemble the reasons ourselves from anything we watched.

/** What a decision attestation carries.
 *
 * CLOSED DELIBERATELY. Every field here describes a decision's IDENTITY and OUTCOME. None describes
 * how it was reached, and that is not an omission to be filled in.
 *
 * IF YOU ARE ADDING A FIELD TO THIS TYPE, the question is not whether it is useful. It is whether it
 * describes WHAT was decided or HOW. The second is the line above. */
import { canonicalise } from './attestation-jcs.js';

// `DecisionAttestationInput` WAS DELETED HERE, 2026-08-04, and what it cost is worth recording.
//
// It described a second shape for the same credential — `deciderDid` for `decider`, `decisionRef` for
// `decisionId`, and a `deciderArtifactDigest: string` that the issued type did not have. Nothing took
// it as a parameter: `issueDecisionAttestation` takes `Omit<DecisionAttestation, 'decider' |
// 'assurance'>` and always did.
//
// It was not inert. It carried the only written statement of where a decision's reasons belong, and
// that statement was load-bearing for the ruling that this credential carries no `reason` field. So
// the guarantee lived on an interface nothing issued, which reads as a design that was implemented
// when it was not. Two shapes for one payload is the divergence this estate keeps finding; this one
// hid a missing field rather than a mismatched one.
//
// The field is now on `DecisionAttestation` itself, as `DeciderArtifactRef`.

/** Fields that MUST NOT appear on a decision attestation, by name.
 *
 * AN ENUMERATED REFUSAL RATHER THAN A COMMENT, because a comment does not fail a build. The list is
 * not exhaustive and cannot be: the point is that a check exists at all, so adding one of the obvious
 * names is a deliberate act rather than an oversight.
 *
 * A field not on this list that describes HOW a decision was reached is still a violation. The list
 * catches the easy crossing; the rule above catches the rest. */
export const FORBIDDEN_ATTESTATION_FIELDS: readonly string[] = [
  'rationale', 'reasoning', 'trace', 'deliberation', 'explanation',
  'thoughts', 'chainOfThought', 'promptTokens', 'modelOutput', 'transcript',
];

export class ObservationRefused extends Error {}

/** Refuse an attestation input that describes HOW a decision was reached.
 *
 * Called at construction, not at serialisation, so the refusal happens where the field was added
 * rather than where it was written out. */
export function assertNoObservation(input: Record<string, unknown>): void {
  const found = FORBIDDEN_ATTESTATION_FIELDS.filter((f) => f in input);
  if (found.length > 0) {
    throw new ObservationRefused(
      `A decision attestation carries ${found.join(', ')}, which describe HOW a decision was reached. ` +
      'WE ATTEST TO A DECISION SOMETHING ELSE MADE; WE DO NOT OBSERVE THE DECISION BEING MADE. If the ' +
      'decider explains itself, that explanation belongs in THEIR artifact under THEIR signature, and ' +
      'this attestation binds to it by digest. Restating it here makes this system the producer of ' +
      'evidence about a decision it is also selling assurance over, which is the defect that sent ' +
      'payer consent and purchase terms to external artifacts.',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// §7 THE ATTESTATION STANDS ALONE. A PAYMENT CITES IT. NEVER THE REVERSE.
// ═══════════════════════════════════════════════════════════════════════════════
//
// STRUCTURAL, AND IT LANDS BEFORE ANYTHING CONSUMES IT. If the shape let a payment CARRY an
// attestation rather than CITE one, the inversion would be invisible in every passing test and would
// show up as a gap in the record years later.
//
// WHY THE INVERSION MATTERS, and it is not tidiness. A DECISION THAT PRODUCES NO PAYMENT STILL
// PRODUCES AN ATTESTATION. A denied claim is the decision a regulator cares about MORE than an
// approval, and an attestation that exists only when money moves is a record SYSTEMATICALLY BIASED
// TOWARD APPROVALS.
//
// A payment-carried attestation cannot represent a denial at all: there is no payment to carry it.
// So the bias would not be a tendency, it would be total, and the record would look complete.

/** WHICH POLICY WAS APPLIED, by reference and by hash.
 *
 * `id` IS OPAQUE AND IS NEVER PARSED. It is the decider's own reference to its own policy, and any
 * meaning we read out of its structure would be us interpreting a policy we have said we do not
 * interpret. It is carried, matched and shown; it is not decomposed.
 *
 * `hashMethod` IS NAMED, NEVER DEFAULTED, for the reason it is named everywhere else here: a hash
 * whose method is unstated is a hex string, and a verifier that assumes sha256 because that is what we
 * happened to use is verifying its own assumption.
 *
 * PER POLICY RATHER THAN PER SCOPE. Clients hold artifacts from different eras and different regimes,
 * and one method fixed across all of them would force a re-hash of documents that are frozen.
 *
 * ─── AND AN ID AND A HASH NAME SOMETHING THAT LIVES SOMEWHERE A VERIFIER CANNOT REACH ────────────
 *
 * THE FOUR OPTIONAL FIELDS BELOW ARE A CONVENTION, NOT A CONSTRAINT, and the difference is measured
 * rather than preferred. A parallel measurement over 446 live records found that EVERY constraint
 * adding meaning to `policyRef` refuses 100 PERCENT of existing traffic, so the ruling was convention
 * plus adoption measurement. Nothing here requires them and nothing refuses a `policyRef` without
 * them. See `POLICY_REF_CONVENTION`, which is where an ISSUER meets this.
 *
 * THE ARGUMENT IS THIS FILE'S OWN, MADE FOR `vocabularyRef` FIRST AND ACCEPTED HERE BEFORE IT WAS
 * MADE ANYWHERE ELSE. `VocabularyRef.values` exists because "`id`, `version` and `hash` named a
 * vocabulary that lived somewhere else, so nothing could tell whether `outcome` was actually drawn
 * from it". `verifyDecisionAttestation` states the same thing a third time about a citation: "a
 * decisionId is an identifier, not a locator". `policyRef` is the remaining place where an id and a
 * hash are the whole of the reference.
 *
 * THE DIFFERENCE FROM `vocabularyRef`, STATED SO THE PRECEDENT IS NOT OVER-READ. A vocabulary is
 * small enough to TRAVEL, so `values` carries the set itself and membership is checked offline. A
 * policy document is not, so these carry a COORDINATE rather than the thing. A verifier still cannot
 * check the clause; what it can now do is find it, which is the whole of what was missing.
 *
 * ─── UNTYPED UNTIL 2026-08-14, WHICH DID NOT MEAN UNGUIDED. IT MEANT REFUSED. ────────────────────
 *
 * `PolicyRef` was three required strings and nothing else, and TypeScript's excess-property check
 * refuses an unknown key on a fresh object literal. Measured against this source: an issuer writing
 * the convention plainly at the call site got
 *
 *   TS2353: Object literal may only specify known properties, and 'clauses' does not exist in type
 *   'PolicyRef'.
 *
 * and the same error one level up for the same fields at the document's top level. THE ONLY ROUTE
 * THAT COMPILED WAS AN INTERMEDIATE `const`, which defeats the check by losing literal freshness.
 * So the convention was not merely undiscoverable by an issuer; the shape refused the plain way of
 * meeting it and admitted only the least discoverable one. */

/** ─── WHERE THESE GO IS NOT A STYLE QUESTION. IT IS MEASURED, AND THE TWO PLACEMENTS DIFFER. ──────
 *
 * INSIDE `policyRef`. Measured 2026-08-14 against this package's own built artifact:
 *
 *   inside policyRef  — signed, and CARRIED WHOLE into the verified block. `verifyDecisionAttestation`
 *                       copies `policyRef` by reference, so every key an issuer wrote arrives.
 *   at the top level  — signed, and SILENTLY DROPPED from the verified block. The `attested` variant
 *                       is built field by field from an enumerated list, and a name not on that list
 *                       exists in the bytes and nowhere a reader reaches.
 *
 * THE TOP-LEVEL CASE IS THE DANGEROUS ONE BECAUSE IT LOOKS LIKE SUCCESS. The document signs, it
 * verifies, the field is inside the signature, and a decider who put them there did everything right
 * and will find them nowhere. Only a party holding the raw document recovers them. */

/** WHAT AN ISSUER PUTS IN `policyRef` BEYOND THE THREE REQUIRED FIELDS, AS DATA RATHER THAN PROSE.
 *
 * EXPORTED AS DATA FOR THE REASON `DENIAL_TAGS` AND THE CONSTRAINT VOCABULARY ARE: a convention
 * nothing can enumerate is one nothing can check, and one that lives only in a doc comment on a type
 * constrains a reader who already agrees. THE PARTY THIS INSTRUCTS IS THE ISSUER, so it is reachable
 * from the package entry point, beside `issueDecisionAttestation`, and not only in a comment a reader
 * of the OUTPUT would find.
 *
 * `capturableLater` IS THE FIELD THAT DECIDES URGENCY, and it is why this is a convention worth
 * adopting before it is enforced. A locator and a retrieval coordinate are facts about WHAT WAS READ
 * AT THE MOMENT OF DECIDING. They cannot be reconstructed afterwards from a document that is still
 * there, because what is missing is not the document — it is which part of it the decider was looking
 * at. Every attestation issued without them is permanently without them.
 *
 * NAMES RECONCILED AGAINST THE READING SIDE, 2026-08-14, rather than chosen here. The convention's
 * consumer is `op-mcp-payment-server`, which already reads these keys; names invented independently
 * here would have produced records written in one vocabulary and read in another, and — see
 * `capturableLater` — those records could never be corrected. */
export const POLICY_REF_CONVENTION: ReadonlyMap<string, { carries: string; why: string; capturableLater: boolean }> = new Map([
  ['clauses', {
    carries: "Clause locators in the PUBLISHER'S OWN addressing scheme, as written: 'III.4.e', '4.2'.",
    why:
      'THE PUBLISHER\'S SCHEME, NEVER OURS, AND NEVER A BYTE OFFSET OR A COORDINATE INTO A RENDERING. '
      + 'A locator into our rendering of a document is a fact about our rendering: it survives only as '
      + 'long as that rendering does, and it is meaningless to the publisher and to anyone holding the '
      + 'original. The publisher\'s own numbering is the one the document itself asserts, so it is '
      + 'checkable by a party who has the document and nothing of ours.',
    capturableLater: false,
  }],
  ['version', {
    carries: "The publisher's own version label for the policy document, as the publisher writes it.",
    why:
      'NOT THE THING THAT FIXES THE REFERENCE — `hash` already does that, and this is deliberately NOT '
      + 'the `vocabularyRef.version` rule one type down, which is REQUIRED and refused when empty because '
      + 'attestations under different vocabulary versions are not comparable. This is carried so a human '
      + 'chasing the document can ask for it by the name its publisher uses, and it is never checked '
      + 'against the hash: a publisher who reissues different bytes under the same label has made a '
      + 'statement this attestation records rather than one it corrects.',
    capturableLater: true,
  }],
  ['publisherId', {
    carries: 'Who published the policy document. A resolvable identifier, not a display name.',
    why:
      'THE POLICY IS NOT NECESSARILY THE DECIDER\'S OWN. A third-party administrator decides under a '
      + "payor's policy, and `decider` names who decided while nothing else names whose rules were "
      + 'applied. Without this a verifier reading the attestation cannot tell an internal policy from an '
      + 'imposed one, which is the distinction a diligence reader is there for.',
    capturableLater: true,
  }],
  ['retrievedFrom', {
    carries: 'The retrieval coordinate the decider actually used to obtain the document it read.',
    why:
      'A FACT ABOUT THE RETRIEVAL EVENT, WHICH IS WHY IT DOES NOT SURVIVE THE DECISION. `id` is opaque '
      + 'and is never parsed, so it is not required to be dereferenceable and frequently is not. This is '
      + 'where the decider went, recorded at the moment it went there. Reconstructing it later yields '
      + 'where someone would go NOW, which is a different claim wearing the same shape.',
    capturableLater: false,
  }],
]);

/** THE PLACEMENT RULE AS A VALUE, so it is assertable rather than merely written down.
 *
 * See the placement note above `POLICY_REF_CONVENTION`. Inside `policyRef` is carried whole; at the
 * document's top level is signed and dropped. This is `true` because the convention's fields go
 * INSIDE, and a change that makes top-level placement work is the thing that would flip it. */
export const POLICY_REF_FIELDS_GO_INSIDE_POLICY_REF = true;

/** WHAT `POLICY_REF_CONVENTION` DOES NOT DO, RECORDED BESIDE IT BECAUSE THE GAP IS REACHABLE THROUGH
 * THE OBJECT IT ASKS ISSUERS TO FILL.
 *
 * `assertNoObservation` TESTS TOP-LEVEL KEYS ONLY — it runs `f in input` — so a forbidden name nested
 * inside `policyRef` is not seen. Measured 2026-08-14 against the built artifact: an attestation whose
 * `policyRef` carried `rationale` ISSUED, VERIFIED, and the rationale reached the verified block
 * inside `policyRef`, which is carried whole.
 *
 * THAT HOLE PREDATES THIS CONVENTION AND IS NOT CLOSED BY IT. It is recorded here rather than fixed
 * here for a stated reason: closing it means refusing a shape at issuance, and the ruling over 446
 * live records was convention plus adoption measurement rather than enforcement on this object. A
 * refusal added quietly alongside guidance would be enforcement arriving as a side effect of a
 * document.
 *
 * SO IT IS A NAMED, SEPARATE DECISION, and this is the note that makes it one. What raises its
 * urgency is precisely this convention: telling issuers to put structured facts inside `policyRef`
 * increases the traffic through the one object the observation boundary does not inspect. */
export const OBSERVATION_BOUNDARY_DOES_NOT_INSPECT_POLICY_REF = true;

export interface PolicyRef {
  id: string;
  hash: string;
  hashMethod: string;
  /** Clause locators in the publisher's own addressing scheme. OPTIONAL, AND NOTHING REFUSES ITS
   * ABSENCE. See `POLICY_REF_CONVENTION`, and note `capturableLater: false`. */
  clauses?: readonly string[];
  /** The publisher's own version label. NOT the `vocabularyRef.version` rule: carried, never checked,
   * never required. `hash` is what fixes the reference. */
  version?: string;
  /** Who published the policy, which is not necessarily the decider. */
  publisherId?: string;
  /** Where the decider actually obtained the document. `capturableLater: false`. */
  retrievedFrom?: string;
}

/** THE ENUMERATED SET `outcome` IS DRAWN FROM.
 *
 * THE PROBLEM THIS SOLVES, stated because the field looks like bookkeeping. If we define the outcome
 * values, we are interpreting policy, which is the one thing this product does not do. If `outcome` is
 * a free string, nothing is comparable: two deciders both write "cleared" and mean different things,
 * or the same decider changes what it means in March and nothing records that it did. Naming the
 * vocabulary and fixing it by hash avoids both. We attest that the decider chose this value from this
 * set. We never say what the value means.
 *
 * A DECLARED VOCABULARY IS IMMUTABLE. Changing it is a new version with a new hash, the same rule as
 * schema URLs. ATTESTATIONS UNDER DIFFERENT VOCABULARY VERSIONS ARE NOT COMPARABLE WITHOUT AN EXPLICIT
 * MAPPING, AND NO SUCH MAPPING EXISTS. That limit travels with the artifact rather than living in a
 * design note, because the reader who needs it is holding the attestation, not the note.
 *
 * WHAT IS DELIBERATELY ABSENT: any structural classification of outcome values — approve-equivalent,
 * deny-equivalent, and so on. It would buy cross-client comparability and it is precisely where we
 * would be making judgements. No client has asked. It is addable to a vocabulary declaration later
 * without touching anything already signed. */
export interface VocabularyRef {
  /** The vocabulary's own identifier. Opaque, like `PolicyRef.id`. */
  id: string;
  /** WHICH VERSION. Exists so a future client-declared mapping has something to reference on both
   * sides. BUILD THE FIELD, DO NOT BUILD THE MAPPING. */
  version: string;
  hash: string;
  hashMethod: string;
  /** STANDARD OR BESPOKE, as a two-value enum.
   *
   * A verifier seeing only a hash cannot tell one from the other, and that difference matters: an
   * `op-starter-set` value carries whatever comparability the starter set has, a `client-defined` one
   * carries none beyond that client. A free string here yields "custom", "ours", "internal" and no
   * comparability at all, which is the same failure as a free-string `outcome` one level up.
   *
   * `op-starter-set` IS PRESENT IN THE TYPE AND REFUSED AT ISSUANCE, because no OP starter vocabulary
   * is published. See `checkDecisionRefs`. It is declared here rather than added later so that
   * publishing one is a code change and not a change to a signed shape. */
  source: 'op-starter-set' | 'client-defined';
  /** THE DECLARED SET ITSELF, so membership is CHECKABLE rather than asserted.
   *
   * WITHOUT THIS THE HASH COMMITS TO NOTHING A VERIFIER CAN REACH. `id`, `version` and `hash` named a
   * vocabulary that lived somewhere else, so nothing could tell whether `outcome` was actually drawn
   * from it. Measured on a real run: three adjudicating agents produced eighteen determinations, every
   * one of their outcome strings fell outside the set the attestation cited, and every one issued. An
   * attestation asserting membership in a set it is not in is a false statement in the field a
   * compliance buyer compares across decisions.
   *
   * CARRIED RATHER THAN RESOLVED, because verification makes no network call. The set travels with the
   * artifact and a verifier checks membership offline, with no registry and no fetch. */
  values: readonly string[];
}

/** WHETHER THE DECIDER SUPPLIED AN ARTIFACT OF ITS OWN, as a positive state.
 *
 * Same construction as `SignedCredentialRef` in `refusal-signing.ts`, and for the same reason: under
 * JCS an absent field and an omitted field are the same bytes and opposite facts. `not-supplied`
 * asserts "the decider produced no artifact of its own, and here is why" rather than staying silent
 * and letting a reader guess whether the field was dropped in transit. */
export type DeciderArtifactRef =
  | { state: 'digest'; value: string }
  | { state: 'not-supplied'; note: string };

/** A decision attestation. A CREDENTIAL IN ITS OWN RIGHT, issued whether or not money moved. */
export interface DecisionAttestation {
  /** The decision this attests to, as the DECIDER identifies it. Their reference, not ours. */
  decisionId: string;
  /** Who decided. Resolvable, and NOT this service. */
  decider: string;
  /** What the decision was about: the claimant, the account, the obligation. */
  subject: string;
  /** What was decided. A denial is an outcome, not an absence, which is the whole of §7.
   *
   * A VALUE FROM `vocabularyRef`, NEVER PROSE, AND NEVER INTERPRETED BY US. We attest that the decider
   * chose THIS value from THAT enumerated set, fixed by hash. We assign no meaning to any value: if we
   * defined them we would be interpreting policy, and if this were a free string nothing would be
   * comparable across deciders or across time. Both failures are avoided by naming the vocabulary
   * rather than by constraining the value here. */
  outcome: string;
  /** WHICH POLICY THE DECIDER APPLIED, FIXED RATHER THAN MERELY NAMED.
   *
   * A bare reference names a document that can change after the decision, which breaks the
   * frozen-evidence rule this estate applies everywhere else: a record of what happened is never
   * updated to match what is known later. With the hash, the attestation says which VERSION was
   * applied, and a verifier reading a policy that no longer matches learns that rather than being
   * silently misled. */
  policyRef: PolicyRef;
  /** THE VOCABULARY `outcome` IS DRAWN FROM.
   *
   * The whole of the outcome design. See `VocabularyRef`. */
  vocabularyRef: VocabularyRef;
  /** A DIGEST OF THE INPUTS, NEVER THE INPUTS.
   *
   * THE CUSTOMER HOLDS THE INPUTS AND THE ATTESTATION COMMITS TO THEM. A claims file contains medical
   * information, account details and personal data, and none of it should be readable by us or by a
   * counterparty verifying the attestation.
   *
   * The digest gives the customer what they need: they can prove later WHICH inputs were before the
   * decider, because only the original set reproduces this value. What they cannot do, and what we
   * cannot do either, is read them from here. */
  inputsDigest: string;
  /** THE DECIDER'S OWN ARTIFACT, BY DIGEST. THIS IS WHERE REASONS BELONG.
   *
   * A DIFFERENT FACT FROM `inputsDigest`, and conflating them is what this field exists to stop.
   * `inputsDigest` commits to what was BEFORE the decider: the claims file, the account state, the
   * evidence. This commits to what the decider PRODUCED: its determination document, under its own
   * signature, where its reasoning belongs.
   *
   * WHY THIS FIELD AND NOT A `reason` STRING. A decision attestation carries no reason, because a
   * reason restated by us is this system producing evidence about a decision it also sells assurance
   * over. The objection that answer has to survive is that a caller could then supply any reason it
   * liked after the fact. This is the answer: the reason is FIXED BY HASH at decision time, held by
   * the decider, authored by the decider, and readable by neither us nor a counterparty verifying the
   * attestation. A caller cannot swap it, and we never hold it.
   *
   * OPTIONAL, AND ITS ABSENCE IS A STATE RATHER THAN A SILENCE. A decider that issues no artifact of
   * its own is a real case and must not be forced to duplicate `inputsDigest` to fill this in. It is a
   * positive-state union for the reason `SignedCredentialRef` is: an absent key and a key that is
   * present-but-empty are the same bytes and opposite facts, so `not-supplied` SAYS the artifact was
   * not supplied and says why. Never defaulted, and specifically never defaulted to `inputsDigest` —
   * that would assert the decider explained itself when what it actually did was receive inputs. */
  deciderArtifactDigest: DeciderArtifactRef;
  /** When the decider says it decided. Their timestamp: we did not watch it happen. */
  decidedAt: string;
  /** THE FIGURE THE DECISION PRODUCED, when it produced one.
   *
   * OPTIONAL, AND ABSENCE IS NOT MISMATCH. Not every decision is a calculation: a claim approval, an
   * eligibility ruling and a policy exception all decide something and commit to no number. An
   * attestation carrying none is complete, and a payment citing it is not contradicted by it.
   *
   * Present, it BINDS: a payment citing this attestation and moving a different amount is refused.
   * That is the whole of the computed-amount case — a fee charge is only meaningful if the amount
   * paid is the amount the calculation produced, and `outcome` is free prose that nothing can check. */
  amount?: AttestedAmount;
  /** WHO THE DECISION AUTHORISES PAYING. NOT `subject`, AND THE TWO MUST NOT COLLAPSE.
   *
   * `subject` is what the decision was ABOUT: the claimant, the account, the obligation. This is who
   * the money goes to. They are frequently different parties — an exception cleared on account A is
   * settled to the counterparty on the instruction — and reading one as the other would bind a
   * payment to the wrong party while appearing to bind it.
   *
   * PRESENT AND SIGNED FROM THE FIRST ATTESTATION. NOT YET COMPARED AGAINST ANY PAYMENT.
   *
   * WHY IT EXISTS BEFORE IT IS ENFORCED, WHICH IS THE OPPOSITE OF THE USUAL ORDER HERE. The cost of
   * this field is not in the comparison, which is four lines. It is in the SIGNATURE: an attestation
   * is signed over its own bytes, so a field added later is absent from every attestation already
   * issued. Adding it then forces a choice between invalidating every prior attestation and accepting
   * its absence — and accepting absence is exactly the bypass that an optional `amount` already
   * demonstrates, where a requirement to cite a decision is satisfied by citing one that binds
   * nothing. Deferring the field once is a judgement. Deferring it twice is how the bypass becomes
   * permanent, because the body of attestations lacking it only grows.
   *
   * SO: the signed surface exists now, and the enforcement ruling is made ONCE, later, with the
   * comparison and a real client structure in view. Until then this is PRESENT-BUT-UNENFORCED, which
   * is a materially different statement from absent and is the one on the honest-limits list. */
  counterparty: string;
  /** WHICH RAIL THE DECISION AUTHORISES SETTLING ON. Present, signed, and NOT YET COMPARED.
   *
   * The same argument as `counterparty` above, and the same status. `amount` already carries `asset`
   * and `decimals`, so the figure is bound to a unit; nothing binds it to a RAIL. A decision cleared
   * for one rail therefore verifies against a payment moving the same figure on another, which is a
   * live shape rather than a hypothetical: the mandate's own `allowed_rails` refusals exist because
   * agents do propose payments on rails they were not granted. */
  rail: string;
  /** What this attestation's provenance rests on. See ATTESTATION_ASSURANCE. */
  assurance: AttestationAssurance;
  /** Who observed, when assurance is `independently-observed`. Absent under `self-declared`, and its
   * absence is the honest form rather than a missing field. */
  observerRef?: string;
  /** After this, the attestation should not be relied on without re-checking. Derived from the
   * longest applicable dispute window AND the statutory retention period, whichever is longer. The
   * second term is not derivable from any rail and is not invented here. */
  resolvableUntil: string;
}

/** A payment's reference TO an attestation. A STRING, DELIBERATELY.
 *
 * A payment cites an attestation by id. It does not embed one, and the type does not permit it: there
 * is no field here that could hold a DecisionAttestation, which is what makes §7 structural rather
 * than a convention someone maintains. */
export interface AttestationCitation {
  /** The `decisionId` of a DecisionAttestation issued independently of this payment. */
  citesDecisionId: string;
}

export type AttestationAssurance =
  /** THE DECIDER SIGNED ITS OWN ATTESTATION. Nothing beyond signature verification is required, and
   * it is HONOURABLE ON DAY ONE: the decider is making a signed, non-repudiable statement about a
   * decision it made, which is more than an unsigned log and less than an independent record. */
  | 'self-declared'
  /** A THIRD PARTY OBSERVED AND CO-SIGNED. Expressed and NOT BUILT: no partner integration exists.
   *
   * CAPABILITY-GATED. An evaluator that cannot verify the observer's reference DECLINES the
   * credential rather than accepting provenance it cannot check, on the same reasoning as every other
   * critical field: accepting an unverifiable claim about provenance is worse than refusing it,
   * because it reaches a receipt as evidence. */
  | 'independently-observed';

// ═══════════════════════════════════════════════════════════════════════════════
// §5 WHAT AN ATTESTATION ESTABLISHES, AS DATA
// ═══════════════════════════════════════════════════════════════════════════════
//
// Same pattern as ANCHOR_ESTABLISHES, same reason: PROSE CAN BE PARAPHRASED UPWARD AND A `false` WITH
// A TEST CANNOT. Every `false` below is a sentence someone will eventually want to write, and each is
// asserted rather than left to a reader's restraint.

export const ATTESTATION_ESTABLISHES = {
  /** A named decider made a non-repudiable statement. That is the whole of what a signature buys, and
   * it is not nothing: it cannot later be denied. */
  deciderMadeTheStatement: true,
  /** The statement existed at or before the time it was verified against a resolvable key. */
  statementExistedAtVerification: true,
  /** The inputs are committed to. Only the original set reproduces `inputsDigest`, so the customer can
   * prove later which inputs were before the decider. */
  inputsAreCommittedTo: true,
  /** A decision with no payment is recorded. This is §7 as a claim: a denial produces an attestation
   * because the attestation stands alone. */
  decisionsWithoutPaymentsAreRecorded: true,

  // ── AND THE FOUR IT DOES NOT ──

  /** NOT that the decision was correct, reasonable, or compliant. An attestation is a record that a
   * decision was made, by whom, about what. Nothing in it evaluates the decision, and a signature over
   * a wrong decision is a signed wrong decision. */
  decisionWasSound: false,
  /** NOT that we observed the decision being made. We attest to a decision something else made; the
   * decider's own artifact carries its reasons under its own signature. See the boundary above. */
  weObservedTheDecision: false,
  /** NOT what the inputs WERE. `inputsDigest` commits without disclosing, deliberately: a claims file
   * holds medical and personal data that neither we nor a verifying counterparty should read. */
  inputsAreReadable: false,
  /** NOT that decisions producing no attestation did not happen.
   *
   * THIS ROW CARRIES ITS OWN REASONING BECAUSE IT IS THE EASIEST TO GET BACKWARDS. An absent
   * attestation is an absence, and absence has more causes than presence: the decider may not have
   * been configured, the issuance may have failed, or the decision may genuinely not have occurred.
   *
   * THE EXCEPTION IS WHAT MAKES IT USEFUL: if the mandate REQUIRED an attestation, then a payment
   * without one was refused, and the absence of the payment IS established. The claim is bounded by
   * what the mandate demanded, not by what the record happens to contain. */
  absentAttestationMeansNoDecision: false,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// §4 ASSURANCE: `self-declared` IS BUILT. `independently-observed` IS EXPRESSED AND GATED.
// ═══════════════════════════════════════════════════════════════════════════════
//
// SAME DISCIPLINE AS APPROVALS, DELIBERATELY THE SAME: the assurance a credential CLAIMS is never what
// this service RECORDS. The signer states what it can honestly claim, and a credential asking for more
// is refused rather than signed-and-labelled. That rule was learned on `device-bound`, where the
// enum value could be declared and nothing could earn it.

/** Signs decision attestations. */
export interface AttestationSigner {
  /** WHO DECIDED, from the signer rather than from the caller. A caller-supplied decider is a caller
   * asserting whose decision this was. */
  deciderDid(): Promise<string>;
  sign(payload: string): Promise<string>;
  /** WHAT THIS SIGNER CAN HONESTLY CLAIM. Not read from the input. */
  assurance(): AttestationAssurance;
}

export type IssueResult =
  | { kind: 'issued'; attestation: DecisionAttestation; signature: string }
  | { kind: 'refused'; reason: string };

/** Validate a `DeciderArtifactRef`. Returns a refusal reason, or null when it is well formed.
 *
 * Separate from issuance so the same check is available to a verifier reading an attestation it did
 * not issue: a state this service will not sign is a state it must not accept either. */
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v !== '';

/** Validate `policyRef` and `vocabularyRef`. Returns a refusal reason, or null when both are well formed.
 *
 * ENFORCED AT ISSUANCE, NOT DOCUMENTED. A field whose rules live only in a doc comment is a comment:
 * it constrains a reader who already agrees and nothing else. `hashMethod` in particular is worth
 * nothing unless something refuses an attestation that omits it, because the failure it prevents is a
 * verifier assuming the method we happened to use. */
export function checkDecisionRefs(policyRef: PolicyRef | undefined, vocabularyRef: VocabularyRef | undefined): string | null {
  for (const [label, ref] of [['policyRef', policyRef], ['vocabularyRef', vocabularyRef]] as const) {
    if (ref === undefined || ref === null) return `A decision attestation must carry ${label}.`;
    for (const f of ['id', 'hash', 'hashMethod'] as const) {
      if (!nonEmpty((ref as unknown as Record<string, unknown>)[f])) {
        return (
          `Cannot issue an attestation whose ${label}.${f} is missing or empty. ` +
          (f === 'hashMethod'
            ? 'A hash whose method is unnamed is a hex string, and a verifier that assumes one is verifying its own assumption.'
            : `${label}.${f} is what makes the reference resolvable and fixed rather than merely named.`)
        );
      }
    }
  }
  if (!nonEmpty(vocabularyRef!.version)) {
    return (
      'Cannot issue an attestation whose vocabularyRef.version is missing or empty. Attestations under ' +
      'different vocabulary versions are not comparable, so a version that is not stated cannot be compared against.'
    );
  }
  if (vocabularyRef!.source !== 'op-starter-set' && vocabularyRef!.source !== 'client-defined') {
    return (
      `Cannot issue an attestation whose vocabularyRef.source is ${JSON.stringify(vocabularyRef!.source)}. ` +
      "The two values are 'op-starter-set' and 'client-defined'; anything else is a free string, and a free " +
      'string here tells a verifier nothing about whether the vocabulary is standard or bespoke.'
    );
  }
  // `op-starter-set` IS EXPRESSIBLE AND CURRENTLY UNEARNABLE, SO IT IS REFUSED.
  //
  // THERE IS NO PUBLISHED OP STARTER VOCABULARY. Searched across the estate: the only occurrences of
  // that string are this type, this check, and documents proposing it. So an attestation claiming it
  // would assert a provenance nobody can resolve, and we would be validating the claim.
  //
  // THE VALUE STAYS IN THE TYPE ANYWAY, and that is the deliberate part. Removing it and adding it
  // back when a starter set exists is a versioning event on a signed credential; keeping it and
  // refusing costs one line to reverse and changes no signed shape. Same construction as
  // `device-bound` on approver assurance and `did:web` on deciders: a value that is expressible,
  // unearnable here, and REFUSED rather than quietly trusted.
  // ─── THE DECLARED SET MUST BE A SET ─────────────────────────────────────────────────────────
  const values = vocabularyRef!.values;
  if (!Array.isArray(values) || values.length === 0) {
    return (
      'Cannot issue an attestation whose vocabularyRef declares no values. The set has to travel with ' +
      'the artifact or membership cannot be checked by anyone: an id and a hash name a vocabulary that ' +
      'lives somewhere a verifier cannot reach.'
    );
  }
  if (!values.every((v) => typeof v === 'string' && v !== '')) {
    return 'Cannot issue an attestation whose vocabularyRef.values contains a non-string or empty entry.';
  }
  if (new Set(values).size !== values.length) {
    return (
      'Cannot issue an attestation whose vocabularyRef.values repeats a value. A set with a duplicate ' +
      'is two different declarations of the same outcome and nothing can say which was meant.'
    );
  }
  if (vocabularyRef!.source === 'op-starter-set') {
    return (
      "Cannot issue an attestation whose vocabularyRef.source is 'op-starter-set': no OP starter " +
      'vocabulary is published, so the reference resolves to nothing and the claim that the outcome ' +
      "came from a standard set cannot be checked by anyone. Use 'client-defined' and name your own " +
      'vocabulary by id, version and hash. When a starter set is published this refusal is removed and ' +
      'no signed shape changes.'
    );
  }
  return null;
}

/** Is `outcome` a member of the set `vocabularyRef` declares? Returns a refusal reason, or null.
 *
 * REFUSED, NOT WARNED, AND NOT RECORDED AS AN ANOMALY. Ruled 2026-08-05. An attestation whose
 * `outcome` is outside the set it cites is a FALSE STATEMENT in the one field a compliance buyer
 * compares across decisions — it asserts membership in a set the value is not in. A warning would
 * leave that statement signed and shipped.
 *
 * WHAT IT COSTS, STATED BECAUSE IT IS THE POINT RATHER THAN A SIDE EFFECT. This makes a vocabulary a
 * real onboarding decision instead of a formality. If a client's agents produce outcomes outside their
 * declared set, either the set is wrong or the agents are — and both are worth learning at ISSUANCE,
 * where one artifact fails loudly, rather than at AUDIT, where a year of them read as comparable and
 * are not.
 *
 * EXACT MATCH, NO NORMALISATION. No case folding, no trimming, no fuzzy mapping. Normalising here
 * would be this system deciding that "Compensation owed" means `compensation_due`, which is
 * interpreting the determination — the thing we do not do. Mapping a decider's prose onto a declared
 * value is the DECIDER's act, and its prose belongs in its own artifact where reasons belong. */
export function checkOutcomeInVocabulary(outcome: unknown, vocabularyRef: VocabularyRef | undefined): string | null {
  if (vocabularyRef === undefined || !Array.isArray(vocabularyRef.values)) return null;   // shape errors are checkDecisionRefs' job
  if (typeof outcome !== 'string' || outcome === '') {
    return 'Cannot issue an attestation with no outcome. A decision that decided nothing is not a decision.';
  }
  if (vocabularyRef.values.includes(outcome)) return null;
  const shown = vocabularyRef.values.slice(0, 6).map((v) => JSON.stringify(v)).join(', ');
  return (
    `Cannot issue an attestation whose outcome ${JSON.stringify(outcome.slice(0, 60))} is not a member of ` +
    `the vocabulary it cites (${vocabularyRef.id} v${vocabularyRef.version}), whose values are ` +
    `[${shown}${vocabularyRef.values.length > 6 ? `, +${vocabularyRef.values.length - 6} more` : ''}]. ` +
    `The attestation would assert that the decider chose this value FROM THAT SET, which is not true. ` +
    `Either the decider must select a declared value — its own wording belongs in its artifact, bound ` +
    `by deciderArtifactDigest — or the vocabulary is wrong and needs a new version.`
  );
}

export function checkDeciderArtifactRef(ref: DeciderArtifactRef | undefined): string | null {
  if (ref === undefined || ref === null) {
    return (
      'A decision attestation must state whether the decider supplied an artifact of its own. ' +
      "Use { state: 'not-supplied', note: <why> } when it did not; omitting the field leaves a reader " +
      'unable to tell an absent artifact from a dropped one.'
    );
  }
  if (ref.state === 'digest') {
    return nonEmpty(ref.value)
      ? null
      : 'Cannot issue an attestation whose deciderArtifactDigest state is `digest` with no value. ' +
        'A digest field with no digest in it is a placeholder wearing the name of the thing it stands for.';
  }
  if (ref.state === 'not-supplied') {
    return nonEmpty(ref.note)
      ? null
      : 'Cannot issue an attestation whose deciderArtifactDigest is `not-supplied` with no note. ' +
        'The note is what makes the absence a stated fact rather than a silence.';
  }
  return (
    `Cannot issue an attestation whose deciderArtifactDigest state is ${JSON.stringify((ref as { state?: unknown }).state)}. ` +
    'The two states are `digest` and `not-supplied`; an unrecognised one is refused rather than signed.'
  );
}

/** Validate the payment-binding surface: who the decision authorises paying, and on which rail.
 *
 * ─── AN ARTIFACT THAT NAMES NOTHING CONSTRAINS NOTHING ───────────────────────────────────────────
 *
 * BOTH ARE REQUIRED ON EVERY ATTESTATION, INCLUDING A DENIAL, AND THAT IS THE INTERESTING CASE. The
 * objection is obvious: a denial pays nobody, so naming a payee looks like filling in a field for the
 * sake of it.
 *
 * IT IS THE OPPOSITE. A denial that named no counterparty would be the single easiest artifact in
 * this system to cite falsely. A later payment to ANY party could attach it, and a binding check
 * would have nothing to compare against — so the one document that refuses a payment would authorise
 * every payment. The weakest legal value of an optional field is "no constraint".
 *
 * THE NARROWER RULE WAS CONSIDERED AND REJECTED: requiring the pair only when `amount` is present.
 * That reintroduces, inside the mechanism built to prevent it, exactly the defect that made `amount`
 * itself insufficient — an attestation that commits to nothing satisfies a requirement to cite
 * something. Same shape, new field.
 *
 * THIS GENERALISES AND IS NOT A LOCAL DECISION. Any field added to bind one artifact to another must
 * be mandatory on every instance of that artifact, or the instances lacking it become the preferred
 * thing to cite. A binding surface with holes routes traffic to the holes.
 *
 * REFUSED AT ISSUANCE, DELIBERATELY NOT AT VERIFICATION, WHICH BREAKS THE PARITY RULE THIS FILE
 * OTHERWISE APPLIES. Everywhere else here, "a state this service will not sign is a state it must not
 * accept either" — `checkDecisionRefs`, `checkDeciderArtifactRef` and `checkOutcomeInVocabulary` are
 * all run against documents we did not issue, for the reason that a good signature over a malformed
 * claim is still a malformed claim.
 *
 * These two are not run there, and the difference is that an absent `counterparty` is not a MALFORMED
 * claim. It is an OLDER SHAPE. Refusing it at verification would make every attestation issued before
 * today `cited-invalid`, which is the state documented as the only one indicating hostility, for
 * documents whose only defect is their age. That is a caption asserting an outcome the facts
 * disprove.
 *
 * THE ASYMMETRY IS THE WHOLE POINT AND IS TEMPORARY. We refuse to SIGN one without these fields, so
 * every attestation this estate issues from now on carries them; we ACCEPT one without them, so the
 * enforcement ruling can be made once, later, against a corpus where the field is universal rather
 * than against a mixed population where it is not. When that ruling lands, this comment is the thing
 * to delete, and the parity rule reasserts itself. */
export function checkPaymentBinding(counterparty: unknown, rail: unknown): string | null {
  if (!nonEmpty(counterparty)) {
    return (
      'Cannot issue a decision attestation with no counterparty. This is WHO THE DECISION AUTHORISES ' +
      'PAYING, and it is not `subject`: subject is what was decided about, this is where the money ' +
      'goes, and they are routinely different parties. An attestation that names neither cannot ever ' +
      'be bound to a payment, and a field added after the signatures exist cannot be required of them.'
    );
  }
  if (!nonEmpty(rail)) {
    return (
      'Cannot issue a decision attestation with no rail. `amount` binds the figure to an asset and to ' +
      'a number of decimals, and nothing binds it to a rail, so a decision cleared for one rail would ' +
      'verify against the same figure moving on another.'
    );
  }
  return null;
}

/** Issue a decision attestation.
 *
 * The assurance recorded is the SIGNER's, never the caller's. A caller asking for
 * `independently-observed` from a signer that can only self-declare is REFUSED, because the
 * alternative is a credential that reaches a counterparty carrying provenance nobody established. */
export async function issueDecisionAttestation(
  input: Omit<DecisionAttestation, 'decider' | 'assurance'>,
  signer: AttestationSigner,
  requestedAssurance?: AttestationAssurance,
): Promise<IssueResult> {
  // CHECK THE CALLER'S OBJECT, NOT A HAND-COPIED SUBSET OF IT.
  //
  // This built a prefix of renamed aliases and then spread `input` over the top. The aliases bought
  // nothing — `assertNoObservation` tests for FORBIDDEN names, and none of them is a rename of a
  // permitted one, so every alias was shadowed by the spread or irrelevant to the check. What the
  // prefix DID do was write `deciderArtifactDigest: input.inputsDigest`, asserting in the one place
  // the two names are adjacent that the decider's own artifact IS the digest of its inputs. Those are
  // opposite facts: one is what the decider produced, the other is what was put in front of it. The
  // alias made the wrong one look like the right one at exactly the site a reader would check.
  assertNoObservation({
    decider: await signer.deciderDid(),
    ...(input as Record<string, unknown>),
  });

  // A MALFORMED ARTIFACT REF IS REFUSED, NOT SIGNED.
  //
  // Both halves matter and they fail differently. `digest` with no value is a placeholder wearing the
  // name of the thing it stands for: a verifier reads a field called `deciderArtifactDigest`, finds
  // it present, and concludes an artifact was bound. `not-supplied` with no note is a silence dressed
  // as a state, which is the exact thing the union exists to prevent.
  const artifactRefRefusal = checkDeciderArtifactRef(input.deciderArtifactDigest);
  if (artifactRefRefusal !== null) return { kind: 'refused', reason: artifactRefRefusal };

  const refsRefusal = checkDecisionRefs(input.policyRef, input.vocabularyRef);
  if (refsRefusal !== null) return { kind: 'refused', reason: refsRefusal };

  const membershipRefusal = checkOutcomeInVocabulary(input.outcome, input.vocabularyRef);
  if (membershipRefusal !== null) return { kind: 'refused', reason: membershipRefusal };

  // THE PAYMENT-BINDING SURFACE MUST EXIST BEFORE IT CAN EVER BE COMPARED. See `checkPaymentBinding`
  // for why this is refused here and deliberately NOT refused at verification.
  const bindingRefusal = checkPaymentBinding(input.counterparty, input.rail);
  if (bindingRefusal !== null) return { kind: 'refused', reason: bindingRefusal };

  const actual = signer.assurance();
  if (requestedAssurance !== undefined && requestedAssurance !== actual) {
    return {
      kind: 'refused',
      reason:
        `This credential asks for assurance '${requestedAssurance}' and the signer can honestly claim '${actual}'. ` +
        `Issuing it would put a provenance claim nobody established in front of a counterparty. ` +
        `Either sign as '${actual}', or use a signer that earns '${requestedAssurance}'.`,
    };
  }
  if (actual === 'independently-observed' && input.observerRef === undefined) {
    // An independently-observed attestation naming no observer is the claim without the thing that
    // makes it true. `self-declared` with no observer is the HONEST form and is not refused.
    return {
      kind: 'refused',
      reason:
        `Assurance 'independently-observed' requires an observerRef, and none was supplied. ` +
        `An attestation claiming independent observation must name what observed it. ` +
        `If nothing did, 'self-declared' is the accurate level and is a real one.`,
    };
  }

  const attestation: DecisionAttestation = { ...input, decider: await signer.deciderDid(), assurance: actual };
  // CANONICALISED BEFORE SIGNING. THIS WAS `JSON.stringify(attestation)` AND THAT WAS A LIVE DEFECT.
  //
  // `JSON.stringify` preserves INSERTION ORDER, so two semantically identical attestations whose keys
  // were added in a different order produce different bytes and therefore different signatures.
  // Everything else in this estate signs `eddsa-jcs-2022`, and the same property was demonstrated the
  // same day one layer up: removing `@context` from a proof object changed the canonicalised bytes and
  // produced `signature: false`.
  //
  // THE CONSEQUENCE WAS NOT "OUR VERIFIER CANNOT CHECK IT". It was that NOBODY could. An attestation
  // signed over insertion-ordered bytes is signed over bytes no other implementation reproduces, which
  // is exactly the property this product exists to provide.
  return { kind: 'issued', attestation, signature: await signer.sign(canonicalise(attestation)) };
}

/** What a verifier can do. */
export interface VerifierCapabilities {
  /** Whether this verifier can resolve and check an observer's reference. FALSE IN v1: NO PARTNER
   * INTEGRATION EXISTS, and this flag is how that fact is expressed rather than assumed. */
  canVerifyObserver: boolean;
}

export type AcceptResult = { kind: 'accepted' } | { kind: 'declined'; reason: string };

/** CAPABILITY-GATED ACCEPTANCE.
 *
 * A verifier that cannot check an observer DECLINES an `independently-observed` attestation rather
 * than accepting provenance it cannot verify. Same reasoning as every other critical field: an
 * unverifiable claim that is accepted reaches a receipt AS EVIDENCE, which is worse than a refusal
 * because the refusal is visible and the acceptance is not. */
export function acceptDecisionAttestation(
  attestation: Pick<DecisionAttestation, 'assurance' | 'observerRef'>,
  capabilities: VerifierCapabilities,
): AcceptResult {
  if (attestation.assurance === 'independently-observed' && !capabilities.canVerifyObserver) {
    return {
      kind: 'declined',
      reason:
        `This attestation claims 'independently-observed' and this verifier cannot resolve an observer reference, ` +
        `so the claim cannot be checked. It is declined rather than accepted at face value. ` +
        `The same attestation re-issued as 'self-declared' is verifiable here today.`,
    };
  }
  return { kind: 'accepted' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION, AND THE FOUR STATES AN APPROVER CAN BE SHOWN
// ═══════════════════════════════════════════════════════════════════════════════

/** What a payment's attestation citation resolved to.
 *
 * FOUR, NOT THREE, AND THE FOURTH IS THE ONE THAT MATTERS MOST. `cited-unresolvable` is an ABSENCE:
 * nothing could be obtained or the method cannot be checked here. `cited-invalid` is a signed artifact
 * FAILING ITS OWN CHECK, which is a bug or an attack. An approver who cannot tell "we could not check"
 * from "we checked and it failed" is being shown the same screen for a missing file and a forged one.
 *
 * IT IS THE ONLY STATE THAT INDICATES HOSTILITY, so it must be visually distinct on every surface and not
 * merely different in the data. */
// ─── THE SAME DISTINCTION, ARRIVING IN A CONTROL THAT ALREADY KNEW ABOUT IT ──────────────────
//
// These four states exist to keep an ABSENCE apart from a VALUE: `not-cited` is nothing claimed,
// `cited-unresolvable` is something unobtainable, `cited-invalid` is something checked and failed.
// The whole union is one argument that absence is not an answer.
//
// `buildApprovalFacts` — a control in the same payment path, written to refuse a credential whose
// issuer and subject are the same party — compared `issuerId === agentId` and therefore fired when
// BOTH WERE UNDEFINED, reporting that a principal authorised itself when the verdict had named
// neither party. Two unrecorded values read as one party.
//
// Worth a line here rather than only at the fix: the collapse appeared inside a control built to
// catch a different absence, in a file that states the rule. Knowing the distinction does not make
// a comparison immune to it — `===` does not know which of its operands were ever written down.
export type AttestationState =
  | 'attested'
  | 'not-cited'
  | 'cited-unresolvable'
  | 'cited-invalid'
  /** THE FIFTH, AND IT IS NOT A FLAVOUR OF THE FOURTH.
   *
   * The attestation VERIFIED — real signature, real decider key, citation matching the document —
   * and it commits to an amount the payment citing it does not move. The artifact did not fail its
   * own check; it is sound and the payment contradicts it.
   *
   * FILED SEPARATELY FROM `cited-invalid` BECAUSE THE CAPTION WOULD OTHERWISE LIE. `cited-invalid`
   * renders as "A claimed decision did NOT survive verification", which is false here: it survived.
   * Putting this under that heading would be a caption asserting an outcome the code disproves,
   * which is the defect the attestation work already had once.
   *
   * AND THE REMEDY DIFFERS. `cited-invalid` says distrust the document. This says the document is
   * fine and the PAYMENT is wrong — a citation of the wrong decision, a calculation that moved after
   * the decision, or an amount altered between decision and payment. */
  | 'cited-contradicted';

/** WHAT A DECISION COMMITS THE PAYMENT TO, when the decision produced a figure.
 *
 * INTEGER MINOR UNITS, because a fee charge is the output of a calculation and a decimal string
 * compared as text is a rounding artifact waiting to be read as agreement. Carries its own decimals
 * and asset so a comparison never has to normalise across units it cannot establish. */
export interface AttestedAmount {
  amountRaw: string;
  /** A STRING, AND THAT IS FORCED RATHER THAN CHOSEN. `src/jcs.ts` refuses numbers outright: RFC
   * 8785's number rules are where a canonicaliser goes subtly wrong and produces bytes that look
   * right and no other implementation reproduces. This value is signed over, so it must be
   * canonicalisable, and the alternative was extending a canonicaliser whose own comment says not to.
   * Found by issuing one, not by reading the type. */
  decimals: string;
  asset: string;
}

/** The attestation block carried on a RoutingVerdict and copied to ApprovalFacts.
 *
 * A DISCRIMINATED UNION, DELIBERATELY, SO "AN UNVERIFIED DOCUMENT CONTRIBUTES NO FACTS" IS STRUCTURAL.
 * The three non-attested variants have NO FIELD that could hold a decision fact, so an unverified
 * attestation cannot contribute facts-marked-unverified: there is nowhere to put them. Same construction
 * as §7's citation shape, and for the same reason — a rule the type enforces is not a rule someone
 * maintains.
 *
 * WHAT THE PAYMENT CLAIMED TO CITE IS NOT HERE. It is agent-supplied, so it lives in
 * `agentSupplied.citedDecisionId` where it is already quarantined, rendered last and marked unverified. */
export type AttestationBlock =
  | {
      state: 'attested';
      /** From the VERIFIED document, never from the citation. */
      decisionId: string;
      decider: string;
      outcome: string;
      policyRef: PolicyRef;
      /** WHAT `outcome` MEANS IS NOT HERE, AND THAT IS THE DESIGN. This says which enumerated set the
       * value came from and whether that set is ours or the client's. An approver comparing two
       * decisions needs it: the same word under two vocabularies is not the same outcome. */
      vocabularyRef: VocabularyRef;
      decidedAt: string;
      /** WHETHER THE DECIDER PRODUCED AN ARTIFACT OF ITS OWN, and its digest when it did.
       *
       * Carried through for the same reason `inputsDigest` is: it was signed over, and dropping it
       * would leave an approver holding a decision with no way to reach the document that explains
       * it. `not-supplied` is shown as the stated absence it is, never as a blank. */
      deciderArtifactDigest: DeciderArtifactRef;
      /** THE COMMITMENT TO THE INPUTS, CARRIED THROUGH.
       *
       * It was computed at issuance and dropped before anyone could act on it, so an approver saw a
       * decision and could not tell what it was decided FROM. For a computed amount that is the
       * whole question: an auditor checks that these inputs under this policy yield this figure, and
       * the digest is the only thing that makes the input set checkable later. */
      inputsDigest: string;
      /** The figure the decision produced, when it produced one. Absent for decisions that are not
       * calculations, which is a complete attestation rather than a missing field. */
      amount?: AttestedAmount;
      /** WHO THE DECISION AUTHORISED PAYING, AND ON WHICH RAIL. Carried from the verified document
       * and COMPARED AGAINST NOTHING.
       *
       * OPTIONAL HERE WHILE REQUIRED AT ISSUANCE, and the difference is not an oversight. Issuance
       * refuses to sign an attestation lacking them; verification accepts a document that lacks them,
       * because a document issued before the fields existed is old rather than malformed. See
       * `checkPaymentBinding`.
       *
       * ON SCREEN THIS MUST NOT READ AS A CHECKED FIELD. A surface that renders `counterparty` beside
       * a verified badge invites the reading that the payment was bound to it, which is the exact
       * defect the amount comparison was built to close: two unrelated facts on one screen with
       * nothing binding them. Until the comparison exists, these are the decider's claims about its
       * own decision, verified as having been SAID and not as being TRUE of this payment. */
      counterparty?: string;
      rail?: string;
    }
  | { state: 'not-cited' }
  | { state: 'cited-unresolvable'; reason: string }
  | { state: 'cited-invalid'; reason: string }
  /** VERIFIED, AND CONTRADICTED BY THE PAYMENT CITING IT.
   *
   * Carries BOTH figures, because "these disagree" is unactionable without saying by how much and in
   * which direction. It also carries the decision's identity — unlike the other three non-attested
   * states, whose whole point is that they contribute no facts. Here the facts are established: the
   * signature verified. What is refused is the payment, not the attestation. */
  | {
      state: 'cited-contradicted';
      reason: string;
      decisionId: string;
      decider: string;
      policyRef: PolicyRef;
      inputsDigest: string;
      attested: AttestedAmount;
      payment: AttestedAmount;
    };

const DID_KEY_ED25519_PREFIX = [0xed, 0x01] as const;

/** A well-formed attested amount, checked rather than trusted.
 *
 * A HALF-PRESENT AMOUNT IS TREATED AS ABSENT, NOT AS ZERO. `{ asset: 'USD' }` with no amountRaw is a
 * document that says nothing about a figure, and reading it as a figure would compare a payment
 * against a value nobody wrote. */
function isAttestedAmount(v: unknown): v is AttestedAmount {
  if (v === null || typeof v !== 'object') return false;
  const a = v as Partial<AttestedAmount>;
  return typeof a.amountRaw === 'string' && /^\d+$/.test(a.amountRaw)
    && typeof a.decimals === 'string' && /^\d+$/.test(a.decimals)
    && typeof a.asset === 'string' && a.asset.length > 0;
}

/** Resolve a `did:web` decider to its raw ed25519 public key.
 *
 * SUPPLIED BY THE DEPLOYMENT, NOT BY THIS PACKAGE, and that is the whole design. Returning a key means
 * "this domain publishes this key in its assertionMethod". Returning undefined means "I could not
 * establish that", and the caller must not distinguish a 404 from a timeout here — both are the same
 * fact to a verifier: nothing was established.
 *
 * THROWING IS DIFFERENT FROM RETURNING UNDEFINED, deliberately. A resolver that throws is reporting a
 * refusal it made on purpose — the url-guard rejecting a private address, for instance — and that is
 * surfaced with its reason rather than flattened into "unavailable". */
export type DeciderResolver = (did: string) => Uint8Array | undefined;

/** Verify a decision attestation carried alongside a payment.
 *
 * did:key ALWAYS. did:web ONLY IF THE DEPLOYMENT SUPPLIES A RESOLVER, and REFUSED BY NAME otherwise.
 *
 * A did:key encodes its own public key, so verification needs no network, no DID document and no trust in
 * the transporter. `did:web` needs an outbound call, so it is **opt-in per deployment**: pass
 * `resolveDeciderDidWeb` and this function will use it; omit it and `did:web` is refused exactly as
 * before. **A consumer of this package does not silently acquire a network call in its evaluation path
 * by upgrading.** That default is the point, not an oversight.
 *
 * UNRESOLVABLE IS `cited-unresolvable`, NOT A DENIAL, AND THIS IS NOT THE STATUS-LIST SHAPE.
 * An unreachable status list means the credential MAY HAVE BEEN REVOKED and we cannot tell: the unknown
 * is adverse, so it fails closed. An unreachable decider document means WE CANNOT SAY WHO SIGNED — and
 * the attestation is evidence carried ALONGSIDE a payment, not the authority FOR it. The mandate
 * authorises the payment. So the payment escalates carrying a citation marked unverified, a human sees
 * "a decision was cited and we could not check it", and a decider's DNS outage does not become a payment
 * outage. Never fail-open: an unresolved decider never renders as `attested`.
 *
 * SAME CONSTRUCTION AS `device-bound` ON `approvers.assurance` WHEN NO RESOLVER IS SUPPLIED: the value is
 * expressible, it cannot be EARNED here, and it is REFUSED rather than accepted-and-labelled. A claim
 * nobody can check must not reach an approver as though someone had.
 *
 * WHAT A RESOLVED did:web ESTABLISHES, AND ITS LIMIT: that the holder of a key the domain publishes
 * signed this. NOT that the organisation authorised the decision internally. No cryptography here can
 * establish the second, and the first is what a counterparty needs to begin diligence.
 *
 * THE CITATION IS CHECKED AGAINST THE DOCUMENT. An agent that cites one decision and ships another would
 * otherwise have the approver read the shipped one. */
export function verifyDecisionAttestation(
  citedDecisionId: string | undefined,
  document: unknown,
  signature: string | undefined,
  verifyEd25519: (message: string, signature: Buffer, publicKey: Buffer) => boolean,
  decodeDidKey: (did: string) => Uint8Array | undefined,
  resolveDeciderDidWeb?: DeciderResolver,
): AttestationBlock {
  if (citedDecisionId === undefined) return { state: 'not-cited' };

  if (document === null || typeof document !== 'object' || signature === undefined) {
    return {
      state: 'cited-unresolvable',
      reason:
        `The payment cites a decision but carried no verifiable attestation document. A decisionId is an ` +
        `identifier, not a locator: nothing here can fetch an attestation from an id, so the document must ` +
        `travel with the payment.`,
    };
  }

  const att = document as Partial<DecisionAttestation>;
  const decider = att.decider;
  if (typeof decider !== 'string') {
    return { state: 'cited-invalid', reason: 'The attestation document names no decider, so nothing identifies who decided.' };
  }
  // ─── WHOSE KEY, AND WHETHER WE CAN ESTABLISH IT ─────────────────────────────────────────────────
  //
  // Both branches below end at ONE `publicKey`, so the signature check that follows is identical for
  // a did:key and a resolved did:web. The methods differ in how the key is obtained, never in how
  // hard the artifact is then checked.
  let publicKey: Buffer;

  if (decider.startsWith('did:web:')) {
    if (resolveDeciderDidWeb === undefined) {
      return {
        state: 'cited-unresolvable',
        reason:
          `The decider is a did:web and this deployment supplies no resolver for one. Resolving it ` +
          `requires an outbound call from the evaluation path, so it is OPT-IN: a deployment that wants ` +
          `organisational deciders passes a resolver, and one that does not keeps a verification path ` +
          `that makes no network call. This is REFUSED rather than accepted unverified, on the same ` +
          `reasoning as 'device-bound' on approvers.assurance: a claim nobody can check must not reach ` +
          `an approver as though someone had. A did:key decider verifies here with no resolver.`,
      };
    }
    let resolved: Uint8Array | undefined;
    try {
      resolved = resolveDeciderDidWeb(decider);
    } catch (e) {
      // A THROW IS A DELIBERATE REFUSAL, NOT AN OUTAGE, so its reason is surfaced rather than
      // flattened into "unavailable". The url-guard rejecting a private address arrives here, and
      // "we refused to dial that" and "we dialled and nobody answered" are different facts.
      return {
        state: 'cited-unresolvable',
        reason: `The decider's DID document was refused rather than fetched: ${(e as Error).message}`,
      };
    }
    if (resolved === undefined || resolved.length !== 32) {
      // NOT A DENIAL, AND NOT `cited-invalid`. Nothing about the artifact failed a check — we could
      // not establish WHO signed it. See the note on this function: the mandate authorises the
      // payment, the attestation is evidence carried alongside it, so a decider's outage escalates
      // with the citation marked unverified rather than refusing the payment.
      return {
        state: 'cited-unresolvable',
        reason:
          `The decider's DID document could not be resolved to an ed25519 assertion key ` +
          `(${decider.slice(0, 48)}). This is not a failed check on the attestation: it is an inability ` +
          `to establish who signed it, so the decision is shown as cited and unverified rather than ` +
          `read as a decision.`,
      };
    }
    publicKey = Buffer.from(resolved);
  } else if (decider.startsWith('did:key:z')) {
    const raw = decodeDidKey(decider);
    if (raw === undefined || raw.length !== 34 || raw[0] !== DID_KEY_ED25519_PREFIX[0] || raw[1] !== DID_KEY_ED25519_PREFIX[1]) {
      return { state: 'cited-invalid', reason: 'The decider is not a well-formed ed25519 did:key, so no key can be recovered from it.' };
    }
    publicKey = Buffer.from(raw.subarray(2));
  } else {
    return { state: 'cited-unresolvable', reason: `The decider uses an unsupported DID method: ${decider.slice(0, 24)}. Only did:key and did:web are verifiable here.` };
  }

  // THE CITATION MUST NAME THE DOCUMENT THAT ARRIVED.
  if (att.decisionId !== citedDecisionId) {
    return {
      state: 'cited-invalid',
      reason:
        `The payment cites decision '${citedDecisionId}' and carried an attestation for ` +
        `'${String(att.decisionId)}'. Citing one decision and shipping another would have an approver read ` +
        `the shipped one.`,
    };
  }

  for (const f of ['outcome', 'decidedAt'] as const) {
    if (typeof att[f] !== 'string') {
      return { state: 'cited-invalid', reason: `The attestation document is missing '${f}', so it cannot state what was decided.` };
    }
  }

  // THE SAME CHECKS ISSUANCE RUNS, ON A DOCUMENT WE DID NOT ISSUE.
  //
  // A state this service refuses to sign is a state it must not accept either. Without this, an
  // attestation carrying a hash with no named method, or a `digest` artifact ref with no digest in
  // it, would verify here purely because its signature was good — and a good signature over a
  // malformed claim is exactly the artifact a verifier must not wave through.
  const refsRefusal = checkDecisionRefs(att.policyRef, att.vocabularyRef);
  if (refsRefusal !== null) return { state: 'cited-invalid', reason: refsRefusal };
  const artifactRefusal = checkDeciderArtifactRef(att.deciderArtifactDigest);
  if (artifactRefusal !== null) return { state: 'cited-invalid', reason: artifactRefusal };
  // THE SAME MEMBERSHIP RULE ON A DOCUMENT WE DID NOT ISSUE. A good signature over a false claim is
  // still a false claim, and this one is false in the field a reader compares across deciders.
  const membershipFailure = checkOutcomeInVocabulary(att.outcome, att.vocabularyRef);
  if (membershipFailure !== null) return { state: 'cited-invalid', reason: membershipFailure };

  // ─── AN ASSURANCE LEVEL THIS VERIFIER CANNOT CHECK IS DECLINED ──────────────────────────────────
  //
  // `acceptDecisionAttestation` exists to do exactly this and had ZERO PRODUCTION CALL SITES. The
  // repository's own `callsite-census.mjs` reported it as ORPHAN, with its acceptance criterion
  // written out, and nothing acted on it — a detector that fires and is never read. Verification
  // never examined `assurance` at all.
  //
  // WHAT THAT LEFT OPEN. `independently-observed` is a STRICTLY STRONGER claim than `self-declared`
  // and is wholly unverifiable here, because no partner integration exists and nothing can resolve an
  // observer reference. So an attestation we did not issue could declare the stronger level, carry a
  // fabricated `observerRef`, and reach an approver rendered as `attested` — with the strongest claim
  // on the document being the one nobody checked. An agent gains by claiming more.
  //
  // `cited-unresolvable`, NOT `cited-invalid`, AND THE DISTINCTION IS THE WHOLE RULING. Nothing about
  // the document failed a check: the signature is fine, the fields are well formed. We cannot RUN the
  // check. `cited-invalid` is documented as the only state indicating hostility, and an attestation
  // legitimately co-signed by an observer we cannot resolve is not hostile — it is unverifiable here.
  //
  // AND IT COMPOSES WITH REQUIRED-MODE FOR FREE. Under a voluntary citation this proceeds while
  // rendering honestly, which is already an improvement on rendering `attested` falsely. Under
  // `requiresDecisionAttestation` it becomes ATTESTATION_UNRESOLVED and refuses, with no extra code.
  // That the correct state choice also produced the correct enforcement is the confirmation it was
  // right rather than convenient.
  //
  // MINIMAL, AND THE LIMIT IS STATED. This declines a level; it does not verify an observer. Nothing
  // here resolves `observerRef` and `acceptDecisionAttestation` remains an orphan. Full wiring is a
  // separate piece of work, and what is closed is the concrete exposure above.
  if (att.assurance !== undefined && att.assurance !== 'self-declared') {
    return {
      state: 'cited-unresolvable',
      reason:
        `This attestation declares assurance '${String(att.assurance)}' and this verifier can check only ` +
        `'self-declared'. Establishing anything stronger requires resolving an observer's reference, and ` +
        `no such integration exists here — so the claim is DECLINED rather than accepted at face value. ` +
        `This is not a failed check on the document: its signature and fields are sound, and the level ` +
        `it claims is one nobody here can establish. The same attestation re-issued as 'self-declared' ` +
        `verifies today.`,
    };
  }

  let ok = false;
  try {
    ok = verifyEd25519(canonicalise(att), Buffer.from(signature, 'base64'), publicKey);
  } catch (e) {
    return { state: 'cited-invalid', reason: `The attestation signature could not be checked: ${String(e)}` };
  }
  if (!ok) {
    return {
      state: 'cited-invalid',
      reason:
        `The attestation signature does NOT verify against its own decider's key. This is not a missing ` +
        `record: it is a signed artifact failing its own check, which is a defect or a forgery. Do not ` +
        `read it as a decision.`,
    };
  }

  // ONLY NOW DO FACTS EXIST. Copied from the VERIFIED document, field by field.
  //
  // `inputsDigest` and `amount` join them because both were signed over and both were being dropped
  // here. The comparison against the payment is NOT done in this function: it does not know the
  // payment, and a verifier that took one would be deciding two questions at once. PaymentHost holds
  // both and makes the binding at the call site.
  return {
    state: 'attested',
    decisionId: att.decisionId as string,
    decider,
    outcome: att.outcome as string,
    policyRef: att.policyRef as PolicyRef,
    vocabularyRef: att.vocabularyRef as VocabularyRef,
    decidedAt: att.decidedAt as string,
    inputsDigest: att.inputsDigest as string,
    deciderArtifactDigest: att.deciderArtifactDigest as DeciderArtifactRef,
    ...(isAttestedAmount(att.amount) ? { amount: att.amount } : {}),
    // CARRIED, NEVER COMPARED, AND NEVER DEFAULTED. An absent one stays absent rather than becoming
    // an empty string: `''` is a value, and a consumer comparing it would find two documents with no
    // counterparty "agreeing". The comparison does not exist yet; when it does, it must be able to
    // tell a document that named nobody from one that named someone.
    ...(nonEmpty(att.counterparty) ? { counterparty: att.counterparty } : {}),
    ...(nonEmpty(att.rail) ? { rail: att.rail } : {}),
  };
}

