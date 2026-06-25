import { readFileSync } from 'node:fs';
import { validateStructure, checkValidityWindow } from './schema.js';
import { resolveDidDocument, findAssertionMethodKey } from './resolve.js';
import { verifyEddsaJcs2022, decodeEd25519Multibase } from './proof.js';
import { checkStatusEntry } from './revocation.js';
import { evaluateMandate } from './mandate.js';
import type {
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

export interface Verdict {
  allow: boolean;
  reason: string;
  notes: string[];
  cred?: ObserverDelegationCredential;
}

/** Steps 1–5: load + cryptographically verify the delegation credential.
 * On success returns the parsed credential; on failure returns a deny Verdict. */
export async function verifyCredential(config: VerifierConfig, nowMs: number): Promise<Verdict> {
  const notes: string[] = [];

  let cred: ObserverDelegationCredential;
  try {
    cred = JSON.parse(readFileSync(config.credentialPath, 'utf8')) as ObserverDelegationCredential;
  } catch (e) {
    return { allow: false, reason: `[credential] cannot read ${config.credentialPath}: ${(e as Error).message}`, notes };
  }

  const structure = validateStructure(cred, config);
  if (!structure.ok) return { allow: false, reason: `[schema] ${structure.reason}`, notes };

  const window = checkValidityWindow(cred, nowMs);
  if (!window.ok) return { allow: false, reason: window.reason ?? '[validity] credential not currently valid', notes };

  try {
    const { doc, note } = await resolveDidDocument(cred.issuer, {
      cacheDir: config.cacheDir,
      timeoutMs: config.revocation.fetchTimeoutMs,
      maxStalenessHours: config.didCache.maxStalenessHours,
      offlinePath: config.offline?.didDocumentPath,
    });
    if (note) notes.push(note);
    if (doc.id !== cred.issuer) {
      return { allow: false, reason: `[did] resolved DID document id ${doc.id} does not match issuer ${cred.issuer}`, notes };
    }
    const vmId = cred.proof?.verificationMethod;
    if (!vmId) return { allow: false, reason: '[proof] proof.verificationMethod missing', notes };
    if (!vmId.startsWith(cred.issuer + '#')) {
      return { allow: false, reason: `[proof] verificationMethod ${vmId} is not a key of the issuer ${cred.issuer}`, notes };
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
  } catch (e) {
    return { allow: false, reason: `[proof] ${(e as Error).message}`, notes };
  }

  if (cred.credentialStatus && cred.credentialStatus.length > 0) {
    for (const entry of cred.credentialStatus) {
      try {
        const outcome = await checkStatusEntry(entry, config);
        notes.push(...outcome.notes);
        if (outcome.revoked) return { allow: false, reason: `[revocation] ${outcome.detail}`, notes };
      } catch (e) {
        return { allow: false, reason: `[revocation] status could not be established: ${(e as Error).message}`, notes };
      }
    }
  } else {
    notes.push('credential carries no credentialStatus entry — revocation not checkable for this credential');
  }

  return { allow: true, reason: 'credential verified', notes, cred };
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
  if (!mandate.ok) return { allow: false, reason: mandate.reason, notes: mandate.notes };
  return { allow: true, reason: mandate.reason, notes: mandate.notes };
}
