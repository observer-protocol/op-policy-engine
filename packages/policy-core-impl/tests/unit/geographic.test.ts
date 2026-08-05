import { describe, test, expect } from "vitest";
import { evaluateGeographic } from "../../src/rules/geographic.js";
import { makeInput, attest } from "./_fixtures.js";

const CP = "did:web:example.com:agents:bot-1";

describe("geographic — asymmetric fail modes (v0.8 §2.3) — load-bearing tests", () => {
  test("blockedJurisdictions with KNOWN jurisdiction in the list → DENY", () => {
    const mandate = { geographic: { blockedJurisdictions: ["KP", "IR"] } };
    const input = makeInput({
      mandate,
      counterparty: CP,
      attestations: [attest(CP, { jurisdiction: "KP" })],
    });
    const deny = evaluateGeographic(input, mandate);
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("blockedJurisdictions");
  });

  test("blockedJurisdictions with UNKNOWN jurisdiction → ALLOW (fail-OPEN)", () => {
    const mandate = { geographic: { blockedJurisdictions: ["KP", "IR"] } };
    const input = makeInput({ mandate, counterparty: CP /* no attestation, no hint */ });
    expect(evaluateGeographic(input, mandate)).toBeNull();
  });

  test("allowedJurisdictionsOnly with KNOWN jurisdiction in list → ALLOW", () => {
    const mandate = { geographic: { allowedJurisdictionsOnly: ["US", "GB"] } };
    const input = makeInput({
      mandate,
      counterparty: CP,
      attestations: [attest(CP, { jurisdiction: "US" })],
    });
    expect(evaluateGeographic(input, mandate)).toBeNull();
  });

  test("allowedJurisdictionsOnly with KNOWN jurisdiction NOT in list → DENY", () => {
    const mandate = { geographic: { allowedJurisdictionsOnly: ["US", "GB"] } };
    const input = makeInput({
      mandate,
      counterparty: CP,
      attestations: [attest(CP, { jurisdiction: "DE" })],
    });
    const deny = evaluateGeographic(input, mandate);
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("allowedJurisdictionsOnly");
  });

  test("allowedJurisdictionsOnly with UNKNOWN jurisdiction → DENY (fail-CLOSED) — critical security property", () => {
    const mandate = { geographic: { allowedJurisdictionsOnly: ["US", "GB"] } };
    const input = makeInput({ mandate, counterparty: CP /* no attestation, no hint */ });
    const deny = evaluateGeographic(input, mandate);
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("allowedJurisdictionsOnly");
    expect(deny!.message).toContain("unknown");
  });

  test("jurisdiction hint fallback works for offline-of-OP integrations", () => {
    const mandate = { geographic: { blockedJurisdictions: ["KP"] } };
    const input = makeInput({ mandate, counterparty: CP, counterpartyJurisdiction: "KP" });
    expect(evaluateGeographic(input, mandate)).not.toBeNull();
  });
});
