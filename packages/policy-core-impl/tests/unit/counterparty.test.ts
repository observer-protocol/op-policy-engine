import { describe, test, expect } from "vitest";
import { evaluateCounterparty } from "../../src/rules/counterparty.js";
import { makeInput, attest } from "./_fixtures.js";

const CP = "did:web:example.com:agents:bot-1";
const CP_OTHER = "did:web:example.com:agents:bot-2";

describe("counterparty — issuer class set membership (v0.8 §2.1)", () => {
  test("allow: counterparty issuer_class in the required set", () => {
    const mandate = {
      counterparty: {
        requireIssuerClassIn: ["third_party_kyb" as const, "partner" as const],
      },
    };
    const input = makeInput({
      mandate,
      counterparty: CP,
      attestations: [attest(CP, { issuerClass: "third_party_kyb" })],
    });
    expect(evaluateCounterparty(input, mandate)).toBeNull();
  });

  test("deny: counterparty issuer_class NOT in the required set", () => {
    const mandate = {
      counterparty: {
        requireIssuerClassIn: ["third_party_kyb" as const, "partner" as const],
      },
    };
    const input = makeInput({
      mandate,
      counterparty: CP,
      attestations: [attest(CP, { issuerClass: "sovereign_self_attested" })],
    });
    const deny = evaluateCounterparty(input, mandate);
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("requireIssuerClassIn");
    expect(deny!.currentValue).toBe("sovereign_self_attested");
  });

  test("skip (return null) when attestation is missing — caller flags evaluatedWithAttestations=false", () => {
    const mandate = {
      counterparty: { requireIssuerClassIn: ["op_first_party" as const] },
    };
    const input = makeInput({ mandate, counterparty: CP, attestations: [] });
    expect(evaluateCounterparty(input, mandate)).toBeNull();
  });
});

describe("counterparty — block list", () => {
  test("deny when counterparty is on the block list", () => {
    const mandate = { counterparty: { blockList: [CP] } };
    const input = makeInput({ mandate, counterparty: CP });
    const deny = evaluateCounterparty(input, mandate);
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("blockList");
  });

  test("allow when counterparty is not on the block list", () => {
    const mandate = { counterparty: { blockList: [CP_OTHER] } };
    const input = makeInput({ mandate, counterparty: CP });
    expect(evaluateCounterparty(input, mandate)).toBeNull();
  });
});

describe("counterparty — allow list (fail-closed)", () => {
  test("allow when counterparty is on the allow list", () => {
    const mandate = { counterparty: { allowList: [CP] } };
    const input = makeInput({ mandate, counterparty: CP });
    expect(evaluateCounterparty(input, mandate)).toBeNull();
  });

  test("deny when counterparty NOT on allow list", () => {
    const mandate = { counterparty: { allowList: [CP_OTHER] } };
    const input = makeInput({ mandate, counterparty: CP });
    const deny = evaluateCounterparty(input, mandate);
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("allowList");
  });

  test("deny (fail-closed) when allow list set but proposal has no counterparty hint", () => {
    const mandate = { counterparty: { allowList: [CP] } };
    const input = makeInput({ mandate });
    const deny = evaluateCounterparty(input, mandate);
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("allowList");
  });
});
