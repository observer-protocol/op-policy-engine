import { describe, test, expect } from "vitest";
import { evaluate } from "../../src/evaluator.js";
import { makeInput, attest } from "./_fixtures.js";

describe("evaluator pipeline", () => {
  test("fail-fast: amount-limits failure short-circuits before temporal is checked", () => {
    // Mandate has BOTH a notional cap AND a temporal restriction.
    // Proposal violates BOTH (high notional AND outside window).
    // The pipeline order puts amount-limits first, so denyReason MUST
    // point to amountLimits, not temporal.
    const mandate = {
      maxNotionalPerOrder: 1000,
      unit: "USD",
      temporal: {
        allowedTimeWindows: [
          { start: "09:00", end: "17:00", timezone: "UTC", daysOfWeek: ["mon" as const] },
        ],
      },
    };
    const input = makeInput({ mandate, notional: 5000, unit: "USD" });
    // Even though "now" is outside the window, we should fail on the cheaper amount check first.
    const result = evaluate(input);
    expect(result.decision).toBe("deny");
    expect(result.denyReason!.ruleType).toBe("amountLimits");
  });

  test("allow when all rules pass", () => {
    const mandate = {
      maxNotionalPerOrder: 10000,
      unit: "USD",
      counterparty: { requireIssuerClassIn: ["third_party_kyb" as const] },
    };
    const cp = "did:web:example.com:agents:cp-1";
    const input = makeInput({
      mandate,
      notional: 5000,
      unit: "USD",
      counterparty: cp,
      attestations: [attest(cp, { issuerClass: "third_party_kyb" })],
    });
    const result = evaluate(input);
    expect(result.decision).toBe("allow");
    expect(result.denyReason).toBeUndefined();
  });

  test("evaluatedWithAttestations: true when attestations supplied", () => {
    const mandate = {};
    const input = makeInput({
      mandate,
      attestations: [attest("did:web:x", { issuerClass: "op_first_party" })],
    });
    const result = evaluate(input);
    expect(result.evaluatedWithAttestations).toBe(true);
  });

  test("evaluatedWithAttestations: false when attestations missing", () => {
    const mandate = {};
    const input = makeInput({ mandate });
    const result = evaluate(input);
    expect(result.evaluatedWithAttestations).toBe(false);
  });

  test("empty mandate (no rules) → allow", () => {
    const input = makeInput({ mandate: {} });
    const result = evaluate(input);
    expect(result.decision).toBe("allow");
  });

  test("delegation with no tradingMandate at all → deny-by-empty-mandate is open (no rules to fail)", () => {
    // The hierarchy module returns {} when tradingMandate is absent.
    // With {} mandate, no rule has anything to evaluate → allow.
    // (Closed-list deny-all interpretation is the policy-issuer's
    // responsibility; an issuer wanting deny-all should issue an empty
    // tradingMandate with explicit allowList/allowedVenues set to [].)
    const input = makeInput({ mandate: {} });
    delete input.delegationCredential.credentialSubject.tradingMandate;
    expect(evaluate(input).decision).toBe("allow");
  });
});
