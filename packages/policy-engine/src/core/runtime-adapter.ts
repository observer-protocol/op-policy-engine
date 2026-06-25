import { readFileSync } from 'node:fs';
import { resolveDidDocument, findAssertionMethodKey } from './resolve.js';
import { verifyEddsaJcs2022, decodeEd25519Multibase } from './proof.js';
import { verifyCredential, enforceMandate } from './verify.js';
import type { PolicyContext, ResolvedTransfer, VerifierConfig } from './types.js';
import type { Verdict } from './verify.js';

// BIND→LINK→AUTHORIZE gate.
//
// The three steps are ordered to close the cross-principal pairing attack:
// a valid WBC for an attacker-controlled wallet cannot be combined with a
// mandate issued by a different principal, because LINK rejects combinations
// where the WBC controller and mandate principal differ.
//
// BIND:  WalletBindingCredential is cryptographically valid (proof by
//        controller's assertionMethod key), and its walletAddress matches the
//        transaction wallet (ctx.wallet_id).
//
// LINK:  The WBC controller (wbc.issuer) and the mandate principal
//        (mandate.issuer) resolve to the same operator.
//        dev mode:  explicit DID equality — operator is both WBC controller
//                   and mandate issuer.
//        full mode: L1 principal-binding chain verification (cosign_verify /
//                   partner_attestations gate). SCAFFOLD: fail-closed stub in
//                   v1 — wire to cosign_verify before deploying full mode.
//
// AUTHORIZE: evaluateMandate (existing shared core, policy evaluation).

export type IssuanceMode = 'dev' | 'full';

export interface RuntimeAdapterConfig extends VerifierConfig {
  /** Path to the WalletBindingCredential. When absent, bind+link steps are skipped. */
  walletBindingCredentialPath?: string;
  /** Governs the LINK step check. Required when walletBindingCredentialPath is set. */
  issuanceMode?: IssuanceMode;
}

interface WbcShape {
  issuer: string;
  validFrom: string;
  validUntil?: string;
  credentialSubject: {
    id: string;
    walletAddress: string;
    rail?: string;
    issuanceMode?: IssuanceMode;
    [k: string]: unknown;
  };
  proof?: {
    verificationMethod?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

interface WbcResult {
  ok: boolean;
  reason?: string;
  notes: string[];
  wbc?: WbcShape;
}

async function verifyWbc(config: RuntimeAdapterConfig, nowMs: number): Promise<WbcResult> {
  const notes: string[] = [];
  let wbc: WbcShape;
  try {
    wbc = JSON.parse(readFileSync(config.walletBindingCredentialPath!, 'utf8')) as WbcShape;
  } catch (e) {
    return { ok: false, reason: `cannot read WBC at ${config.walletBindingCredentialPath}: ${(e as Error).message}`, notes };
  }

  if (!wbc.issuer || typeof wbc.issuer !== 'string') {
    return { ok: false, reason: 'WBC missing issuer', notes };
  }
  if (!wbc.credentialSubject?.walletAddress) {
    return { ok: false, reason: 'WBC credentialSubject.walletAddress missing', notes };
  }

  const from = Date.parse(wbc.validFrom);
  const until = wbc.validUntil ? Date.parse(wbc.validUntil) : Infinity;
  if (nowMs < from) return { ok: false, reason: `WBC not yet valid (validFrom ${wbc.validFrom})`, notes };
  if (nowMs > until) return { ok: false, reason: `WBC expired (validUntil ${wbc.validUntil})`, notes };

  // Resolve WBC controller's DID and verify proof.
  // The controller's DID is wbc.issuer — independent of the mandate's config.issuerDid.
  // For did:key: resolves in-memory. For did:web: resolves over HTTPS.
  try {
    const { doc, note } = await resolveDidDocument(wbc.issuer, {
      cacheDir: config.cacheDir,
      timeoutMs: config.revocation.fetchTimeoutMs,
      maxStalenessHours: config.didCache.maxStalenessHours,
    });
    if (note) notes.push(note);
    const vmId = wbc.proof?.verificationMethod;
    if (!vmId) return { ok: false, reason: 'WBC proof.verificationMethod missing', notes };
    if (!vmId.startsWith(wbc.issuer + '#')) {
      return {
        ok: false,
        reason: `WBC verificationMethod ${vmId} is not a key of the WBC issuer ${wbc.issuer}`,
        notes,
      };
    }
    const { entry } = findAssertionMethodKey(doc, vmId);
    if (!entry.publicKeyMultibase) {
      return { ok: false, reason: `WBC verification method ${entry.id} has no publicKeyMultibase`, notes };
    }
    const { key, note: keyNote } = decodeEd25519Multibase(entry.publicKeyMultibase);
    if (keyNote) notes.push(`WBC issuer key: ${keyNote}`);
    const proofResult = verifyEddsaJcs2022(wbc as Record<string, unknown>, key);
    notes.push(...proofResult.notes);
    if (!proofResult.ok) return { ok: false, reason: `WBC proof: ${proofResult.reason}`, notes };
  } catch (e) {
    return { ok: false, reason: `WBC proof: ${(e as Error).message}`, notes };
  }

  return { ok: true, notes, wbc };
}

/**
 * BIND→LINK→AUTHORIZE gate.
 *
 * When walletBindingCredentialPath is absent in config, falls through to
 * verifyCredential + enforceMandate with no behavioral change.
 *
 * When walletBindingCredentialPath is present, runs all three steps.
 * The issuanceMode in config (or wbc.credentialSubject.issuanceMode as
 * fallback) determines which LINK rule applies.
 */
export async function runRuntimeAdapter(
  ctx: PolicyContext,
  config: RuntimeAdapterConfig,
  resolved: ResolvedTransfer,
  nowMs: number,
): Promise<Verdict> {
  // Steps 1-5 + signer-boundary: verify mandate credential.
  const credVerdict = await verifyCredential(config, nowMs);
  if (!credVerdict.allow || !credVerdict.cred) return credVerdict;
  const mandate = credVerdict.cred;
  const notes = [...credVerdict.notes];

  if (!config.walletBindingCredentialPath) {
    // No WBC configured — skip bind+link, go straight to authorize.
    const authResult = enforceMandate(ctx, mandate, config, resolved);
    return { ...authResult, notes: [...notes, ...authResult.notes] };
  }

  // BIND: Verify WalletBindingCredential.
  const wbcResult = await verifyWbc(config, nowMs);
  if (!wbcResult.ok) {
    return { allow: false, reason: `[bind] ${wbcResult.reason}`, notes: [...notes, ...wbcResult.notes] };
  }
  notes.push(...wbcResult.notes);
  const wbc = wbcResult.wbc!;

  // BIND: Wallet address in the WBC must match the transaction wallet.
  // ctx.wallet_id is the signing wallet (the one that controls the spend).
  if (ctx.wallet_id && wbc.credentialSubject.walletAddress.toLowerCase() !== ctx.wallet_id.toLowerCase()) {
    return {
      allow: false,
      reason: `[bind] WBC walletAddress ${wbc.credentialSubject.walletAddress} does not match transaction wallet ${ctx.wallet_id}`,
      notes,
    };
  }

  // LINK: The WBC controller (wbc.issuer) and the mandate principal (mandate.issuer)
  // must resolve to the same operator. This closes the cross-principal pairing attack.
  const wbcController = wbc.issuer;
  const mandatePrincipal = mandate.issuer;
  const mode: IssuanceMode = config.issuanceMode ?? wbc.credentialSubject.issuanceMode ?? 'dev';

  if (mode === 'dev') {
    // Dev mode: operator is both WBC controller and mandate principal.
    // Explicit DID equality is the complete check — the proof steps bound
    // each DID to its actual signing key, so equality here is authoritative.
    if (wbcController !== mandatePrincipal) {
      return {
        allow: false,
        reason: `[issuer-linkage] dev-mode: WBC controller (${wbcController}) !== mandate principal (${mandatePrincipal}) — both must be the same operator DID`,
        notes,
      };
    }
    notes.push(`issuer-linkage/dev: operator DID equality confirmed (${wbcController})`);
  } else {
    // Full mode: link = principal's delegation chain authorizes this controller.
    // This is the L1 cosign_verify / partner_attestations gate.
    // SCAFFOLD: fail-closed until L1 is wired. Any full-mode request with a WBC
    // DENIES here until cosign_verify is implemented and connected.
    return {
      allow: false,
      reason: `[issuer-linkage] full-mode: L1 principal-binding chain verification required (wbcController=${wbcController}, mandatePrincipal=${mandatePrincipal}) — not implemented in v1 scaffold; wire cosign_verify gate before deploying full mode`,
      notes,
    };
  }

  // AUTHORIZE: evaluateMandate — existing shared core policy evaluation.
  const authResult = enforceMandate(ctx, mandate, config, resolved);
  if (!authResult.allow) {
    return { ...authResult, notes: [...notes, ...authResult.notes] };
  }
  return { allow: true, reason: authResult.reason, notes: [...notes, ...authResult.notes] };
}
