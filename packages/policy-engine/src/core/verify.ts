import { readFileSync } from 'node:fs';
import type { DenialDetail } from './denial.js';
import { validateStructure, checkValidityWindow } from './schema.js';
import { resolveDidDocument, findAssertionMethodKey } from './resolve.js';
import { verifyEddsaJcs2022, decodeEd25519Multibase } from './proof.js';
import { checkStatusEntry } from './revocation.js';
import { evaluateMandate } from './mandate.js';
import type {
  BitstringStatusListEntry,
  ObserverDelegationCredential,
  PolicyContext,
  ResolvedTransfer,
  VerifierConfig,
} from './types.js';

// Shared credential-verification + mandate pipeline for the extracted PolicyEngine.
//
// Steps 1–5 (verifyCredential): load, structure, validity window, DID-resolve +
// proof verify (eddsa-jcs-2022 only), revocation — chain-agnostic.
//
// Steps 6–7 (enforceMandate): mandate evaluation against a pre-decoded
// ResolvedTransfer. Rail-specific decode is the adapter's responsibility;
// this function never calls resolveTransfer — the resolved transfer is always
// supplied by the caller.

/** Structured record of the credential-verification checks that actually ran,
 * produced BY the verifier as each step passes (not written alongside it). On a
 * successful verify this lets an external reader reconstruct exactly which checks
 * executed. String values only (no floats) so it stays JCS-verifiable when
 * embedded in a signed credential. */
export type CredentialChecks = Record<string, string>;

export interface Verdict {
  allow: boolean;
  reason: string;
  notes: string[];
  /** Machine-readable denial detail, present on a mandate deny. Optional: a new
   * required field on a returned type breaks every caller. */
  detail?: DenialDetail;
  cred?: ObserverDelegationCredential;
  /** Present on a successful verify; the checks that ran, keyed by check name. */
  checks?: CredentialChecks;
  /** THE THIRD STATE: permitted, but a human must authorise it.
   *
   * `allow` STAYS A BOOLEAN AND IS `false` WHEN THIS IS PRESENT. That is the whole safety argument and
   * it is not stylistic. A consumer that does not know about this field sees `allow: false` and DENIES —
   * the payment does not happen. Had this been `allow: true` plus an escalation, an unaware consumer
   * would let an unapproved payment through, invisibly, which is exactly the shape of the v2.1 defect
   * one layer up: a signal that unaware readers treat as permission.
   *
   * Additive and optional, so the 25 read sites of `.allow` across 8 published packages compile and
   * behave identically. A consumer opts in by reading this; one that never does keeps failing closed. */
  escalation?: {
    threshold: { amount: string; currency: string };
    requested: { amount: string; currency: string };
    approvers: unknown[];
  };
}

/** Steps 1–5: load + cryptographically verify the delegation credential.
 * On success returns the parsed credential; on failure returns a deny Verdict. */
export async function verifyCredential(config: VerifierConfig, nowMs: number): Promise<Verdict> {
  let cred: ObserverDelegationCredential;
  try {
    cred = JSON.parse(readFileSync(config.credentialPath, 'utf8')) as ObserverDelegationCredential;
  } catch (e) {
    return { allow: false, reason: `[credential] cannot read ${config.credentialPath}: ${(e as Error).message}`, notes: [] };
  }
  return verifyCredentialObject(cred, config, nowMs);
}

/** Verify an in-memory delegation credential: structure/schema gate + full crypto.
 * This is the file-independent half of verifyCredential — callers that already
 * hold the parsed credential (resolved from a store, presented over the wire)
 * use this instead of a credentialPath. Behavior is identical to verifyCredential
 * after its read step. */
export async function verifyCredentialObject(
  cred: ObserverDelegationCredential,
  config: VerifierConfig,
  nowMs: number,
): Promise<Verdict> {
  const structure = validateStructure(cred, config);
  if (!structure.ok) return { allow: false, reason: `[schema] ${structure.reason}`, notes: [] };
  return verifyCredentialCrypto(cred, config, nowMs);
}

/** Cryptographic trust checks ONLY, no structure/schema/issuer-pin gate:
 * validity window → issuer DID resolution → eddsa-jcs-2022 proof → signer-boundary
 * → revocation. Callers that must accept more than one credential body shape verify
 * cryptographic integrity here and gate shape / trust-anchor by other means (e.g. a
 * hash-match to a registered credential). verifyCredentialObject layers the v2.1
 * structure gate on top of this; adapters that require that gate keep using it. */
export async function verifyCredentialCrypto(
  cred: ObserverDelegationCredential,
  config: VerifierConfig,
  nowMs: number,
): Promise<Verdict> {
  const notes: string[] = [];
  const checks: CredentialChecks = {};

  const window = checkValidityWindow(cred, nowMs);
  if (!window.ok) return { allow: false, reason: window.reason ?? '[validity] credential not currently valid', notes };
  checks.validityWindow = 'passed';

  // W3C VC Data Integrity permits `issuer` as either a DID string or an object
  // with an `id`. Normalize to the DID string for resolution and key-binding.
  const rawIssuer: unknown = cred.issuer;
  const issuerId =
    typeof rawIssuer === 'string'
      ? rawIssuer
      : (rawIssuer && typeof rawIssuer === 'object' && typeof (rawIssuer as { id?: unknown }).id === 'string'
          ? (rawIssuer as { id: string }).id
          : undefined);
  if (!issuerId) return { allow: false, reason: '[proof] credential issuer is missing or malformed', notes };

  try {
    const { doc, note } = await resolveDidDocument(issuerId, {
      cacheDir: config.cacheDir,
      timeoutMs: config.revocation.fetchTimeoutMs,
      maxStalenessHours: config.didCache.maxStalenessHours,
      offlinePath: config.offline?.didDocumentPath,
    });
    if (note) notes.push(note);
    if (doc.id !== issuerId) {
      return { allow: false, reason: `[did] resolved DID document id ${doc.id} does not match issuer ${issuerId}`, notes };
    }
    checks.issuerResolution = config.offline?.didDocumentPath
      ? 'offline-pinned'
      : issuerId.startsWith('did:key:') ? 'did:key-inline' : 'network';
    const vmId = cred.proof?.verificationMethod;
    if (!vmId) return { allow: false, reason: '[proof] proof.verificationMethod missing', notes };
    if (!vmId.startsWith(issuerId + '#')) {
      return { allow: false, reason: `[proof] verificationMethod ${vmId} is not a key of the issuer ${issuerId}`, notes };
    }
    const { entry } = findAssertionMethodKey(doc, vmId);
    if (!entry.publicKeyMultibase) {
      return { allow: false, reason: `[did] verification method ${entry.id} has no publicKeyMultibase`, notes };
    }
    const { key, note: keyNote } = decodeEd25519Multibase(entry.publicKeyMultibase);
    if (keyNote) notes.push(keyNote);
    const proofResult = verifyEddsaJcs2022(cred as unknown as Record<string, unknown>, key);
    notes.push(...proofResult.notes);
    if (!proofResult.ok) return { allow: false, reason: `[proof] ${proofResult.reason}`, notes };
    checks.issuerProof = 'eddsa-jcs-2022-verified';

    // Signer-boundary check: the mandate must not be signed by a key the agent controls.
    // A mandate signed by the agent's own key means the agent could self-authorize — which
    // inverts the delegation model into "do whatever the skill asked."
    // String comparison is sufficient: step 4 proof verification already bound the
    // verificationMethod to the actual signing key, so a match here is authoritative.
    const signingDid = vmId.includes('#') ? vmId.split('#')[0] : vmId;
    if (config.agentDid && signingDid === config.agentDid) {
      return {
        allow: false,
        reason:
          '[signer-boundary] mandate signing key is agent-controlled — a principal key is required (operator key in dev mode, OP key in full mode)',
        notes,
      };
    }
    checks.signerBoundary = config.agentDid ? 'passed' : 'not-configured';
  } catch (e) {
    return { allow: false, reason: `[proof] ${(e as Error).message}`, notes };
  }

  // SHAPE. The array is canonical: delegation schemas v2.4-v2.6 all type
  // credentialStatus as `type: array`, and validateStructure rejects anything
  // else. An issuer emitting a bare object is the defect. The tolerance below is
  // a COMPATIBILITY SHIM for the crypto path, not a widening of the shape.
  //
  // It is needed because this function is the one entry point with no structure
  // gate in front of it — verifyCredentialCrypto skips validateStructure by
  // design, and policy-core-impl/src/gate.ts casts an arbitrary inbound
  // credential straight into it. The previous guard read `.length` directly:
  // undefined on an object, and `undefined > 0` is false, so an object-shaped
  // credentialStatus took the else branch, recorded 'status-absent' and
  // ALLOWED. A revoked credential verified as valid, silently, in the direction
  // that grants authority. Same array-read-as-dict defect the Python verifier
  // fixed in observer-protocol-api/delegation_routes.py.
  //
  // A value that is neither array nor object is NOT tolerated. Nothing can be
  // checked against it, so it refuses. Note this case already denied before the
  // fix, but by accident: a truthy string has a .length, so the loop iterated
  // its CHARACTERS and checkStatusEntry threw on the first one. Right outcome,
  // wrong cause, and it would have flipped to a silent allow for any truthy
  // non-string scalar (a number has no .length). It is now stated, not incidental.
  const rawStatus: unknown = cred.credentialStatus;
  let statusEntries: BitstringStatusListEntry[];
  if (rawStatus === undefined || rawStatus === null) {
    statusEntries = [];
  } else if (Array.isArray(rawStatus)) {
    statusEntries = rawStatus as BitstringStatusListEntry[];
  } else if (typeof rawStatus === 'object') {
    statusEntries = [rawStatus as BitstringStatusListEntry];
    notes.push('credentialStatus was a single object, not an array — accepted for compatibility; the schema requires an array');
  } else {
    return {
      allow: false,
      reason: `[revocation] credentialStatus must be an array or a single entry object, got ${typeof rawStatus}`,
      notes,
    };
  }

  if (statusEntries.length > 0) {
    for (const entry of statusEntries) {
      try {
        const outcome = await checkStatusEntry(entry, config);
        notes.push(...outcome.notes);
        if (outcome.revoked) return { allow: false, reason: `[revocation] ${outcome.detail}`, notes };
      } catch (e) {
        return { allow: false, reason: `[revocation] status could not be established: ${(e as Error).message}`, notes };
      }
    }
    checks.revocation = 'not-revoked';
  } else {
    notes.push('credential carries no credentialStatus entry — revocation not checkable for this credential');
    checks.revocation = 'status-absent';
  }

  return { allow: true, reason: 'credential verified', notes, cred, checks };
}

/** Steps 6–7: enforce the mandate against a pre-decoded transfer.
 * The resolved transfer is always supplied by the adapter — this function
 * performs no rail-specific decode. Velocity state must be baked into
 * ctx.spending.daily_total by the caller before invoking this function. */
export function enforceMandate(
  ctx: PolicyContext,
  cred: ObserverDelegationCredential,
  config: VerifierConfig,
  resolved: ResolvedTransfer,
): Verdict {
  const railDef = config.rails[ctx.chain_id];
  if (!railDef) {
    return { allow: false, reason: `[rails] chain ${ctx.chain_id} has no rail mapping in config.rails`, notes: [] };
  }
  const mandate = evaluateMandate(ctx, cred, config, resolved);
  // AN ESCALATION IS NOT A DENIAL, and carrying it through as one would lose the reason a human could
  // still authorise this. `allow` is false either way; `escalation` is what distinguishes them.
  if (!mandate.ok && mandate.escalation) {
    return { allow: false, reason: mandate.reason, notes: mandate.notes, escalation: mandate.escalation };
  }
  if (!mandate.ok) {
    // Carry the detail through. Dropping it here would have made the whole
    // structured-denial change invisible to every adapter, since enforceMandate is
    // what they call.
    return mandate.detail
      ? { allow: false, reason: mandate.reason, notes: mandate.notes, detail: mandate.detail }
      : { allow: false, reason: mandate.reason, notes: mandate.notes };
  }
  return { allow: true, reason: mandate.reason, notes: mandate.notes };
}
