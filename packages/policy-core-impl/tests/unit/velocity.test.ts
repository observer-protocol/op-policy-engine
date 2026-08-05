import { describe, test, expect } from "vitest";
import { evaluateVelocity } from "../../src/rules/velocity.js";
import { makeInput } from "./_fixtures.js";

describe("velocity — rolling-window caps (v0.8 §2.4)", () => {
  test("allow when (current + proposal) below daily cap", () => {
    const mandate = { velocity: { dailyVolumeCap: 100000 }, unit: "USD" };
    const input = makeInput({ mandate, notional: 20000, unit: "USD" });
    const deny = evaluateVelocity(input, mandate, { currentDailyVolume: 50000 });
    expect(deny).toBeNull();
  });

  test("deny when (current + proposal) exceeds daily cap", () => {
    const mandate = { velocity: { dailyVolumeCap: 100000 }, unit: "USD" };
    const input = makeInput({ mandate, notional: 60000, unit: "USD" });
    const deny = evaluateVelocity(input, mandate, { currentDailyVolume: 50000 });
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("dailyVolumeCap");
    expect(deny!.currentValue).toBe(50000);
    expect(deny!.proposedValue).toBe(110000);
  });

  test("monthly cap enforced independently of daily cap", () => {
    const mandate = { velocity: { monthlyVolumeCap: 500000 }, unit: "USD" };
    const input = makeInput({ mandate, notional: 100000, unit: "USD" });
    const deny = evaluateVelocity(input, mandate, { currentMonthlyVolume: 450000 });
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("monthlyVolumeCap");
  });

  test("skip (return null) when no context — wallet-embedded without state", () => {
    const mandate = { velocity: { dailyVolumeCap: 100000 } };
    const input = makeInput({ mandate, notional: 999999, unit: "USD" });
    expect(evaluateVelocity(input, mandate)).toBeNull();
    expect(evaluateVelocity(input, mandate, {})).toBeNull();
  });

  test("allow when mandate has no velocity sub-object", () => {
    const mandate = {};
    const input = makeInput({ mandate, notional: 999999 });
    expect(evaluateVelocity(input, mandate, { currentDailyVolume: 999999 })).toBeNull();
  });
});
