/**
 * Shared test fixtures. Small factories that produce well-typed
 * EvaluationInput / delegation credential objects with a configurable
 * tradingMandate. Keeps each test file focused on its rule.
 */

import type {
  EvaluationInput,
  ObserverDelegationCredential,
  TradingMandate,
  AttestationContext,
  IssuerClass,
} from "@observer-protocol/policy-interface";

export function makeDelegation(mandate: TradingMandate): ObserverDelegationCredential {
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    id: "urn:uuid:test-delegation",
    type: ["VerifiableCredential", "ObserverDelegationCredential"],
    issuer: "did:web:observerprotocol.org",
    validFrom: "2026-01-01T00:00:00Z",
    validUntil: "2027-01-01T00:00:00Z",
    credentialSubject: {
      id: "did:web:observerprotocol.org:agents:test-agent",
      tradingMandate: mandate,
    },
    proof: {
      type: "Ed25519Signature2026",
      created: "2026-01-01T00:00:00Z",
      verificationMethod: "did:web:observerprotocol.org#key-2",
      proofPurpose: "assertionMethod",
      proofValue: "zTestSignaturePlaceholder",
    },
  };
}

export function makeInput(opts: {
  mandate: TradingMandate;
  rail?: string;
  notional?: number;
  unit?: string;
  counterparty?: string;
  counterpartyJurisdiction?: string;
  attestations?: AttestationContext[];
}): EvaluationInput {
  const humanReadable: Record<string, unknown> = {};
  if (opts.notional !== undefined) humanReadable.notional = opts.notional;
  if (opts.unit !== undefined) humanReadable.unit = opts.unit;
  if (opts.counterparty !== undefined) humanReadable.counterparty = opts.counterparty;
  if (opts.counterpartyJurisdiction !== undefined) {
    humanReadable.counterpartyJurisdiction = opts.counterpartyJurisdiction;
  }
  return {
    proposal: {
      rail: opts.rail ?? "ethereum-mainnet",
      canonicalBytes: "00", // placeholder; not used in rule evaluation, only in signer
      humanReadable,
    },
    delegationCredential: makeDelegation(opts.mandate),
    attestations: opts.attestations,
  };
}

export function attest(
  counterparty: string,
  parts: { issuerClass?: IssuerClass; jurisdiction?: string },
): AttestationContext {
  return { counterparty, ...parts };
}
