import { describe, test, expect } from "vitest";
import { evaluateAmountLimits } from "../../src/rules/amount-limits.js";
import { makeInput } from "./_fixtures.js";

describe("amount-limits", () => {
  test("allow when notional below cap", () => {
    const mandate = { maxNotionalPerOrder: 10000, unit: "USD" };
    const input = makeInput({ mandate, notional: 5000, unit: "USD" });
    expect(evaluateAmountLimits(input, mandate)).toBeNull();
  });

  test("deny when notional exceeds cap; denyReason carries current+proposed", () => {
    const mandate = { maxNotionalPerOrder: 10000, unit: "USD" };
    const input = makeInput({ mandate, notional: 15000, unit: "USD" });
    const deny = evaluateAmountLimits(input, mandate);
    expect(deny).not.toBeNull();
    expect(deny!.ruleType).toBe("amountLimits");
    expect(deny!.ruleField).toBe("maxNotionalPerOrder");
    expect(deny!.currentValue).toBe(10000); // the cap
    expect(deny!.proposedValue).toBe(15000); // the attempted notional
    expect(deny!.message).toContain("15000");
    expect(deny!.message).toContain("10000");
  });

  test("deny when mandate has cap but proposal carries no notional hint (fail-closed)", () => {
    const mandate = { maxNotionalPerOrder: 10000, unit: "USD" };
    const input = makeInput({ mandate });
    const deny = evaluateAmountLimits(input, mandate);
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("maxNotionalPerOrder");
  });

  test("deny on unit mismatch", () => {
    const mandate = { maxNotionalPerOrder: 10000, unit: "USD" };
    const input = makeInput({ mandate, notional: 5000, unit: "EUR" });
    const deny = evaluateAmountLimits(input, mandate);
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("unit");
  });

  test("maxPosition enforced when context provides currentPosition", () => {
    const mandate = { maxPosition: 100000, unit: "USD" };
    const input = makeInput({ mandate, notional: 30000, unit: "USD" });
    const deny = evaluateAmountLimits(input, mandate, { currentPosition: 80000 });
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("maxPosition");
    expect(deny!.proposedValue).toBe(110000);
  });

  test("maxPosition skipped when no context (wallet-embedded without state)", () => {
    const mandate = { maxPosition: 100000, unit: "USD" };
    const input = makeInput({ mandate, notional: 30000, unit: "USD" });
    expect(evaluateAmountLimits(input, mandate)).toBeNull();
  });

  test("allow when no rules in mandate", () => {
    const input = makeInput({ mandate: {}, notional: 999999999, unit: "USD" });
    expect(evaluateAmountLimits(input, {})).toBeNull();
  });
});
