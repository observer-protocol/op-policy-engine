import { describe, test, expect } from "vitest";
import { evaluateTemporal } from "../../src/rules/temporal.js";
import { makeInput } from "./_fixtures.js";

// Helper: build a Date that represents a specific UTC instant. The temporal
// rule converts to the window's IANA timezone internally.
function utc(yyyymmdd: string, hhmm: string): Date {
  return new Date(`${yyyymmdd}T${hhmm}:00Z`);
}

describe("temporal — window matching (v0.8 §2.2)", () => {
  const businessHoursUTC = {
    temporal: {
      allowedTimeWindows: [
        {
          start: "09:00",
          end: "17:00",
          timezone: "UTC",
          daysOfWeek: ["mon" as const, "tue" as const, "wed" as const, "thu" as const, "fri" as const],
        },
      ],
    },
  };

  test("allow: tx at 14:00 UTC on Monday inside Mon-Fri 09:00-17:00", () => {
    const input = makeInput({ mandate: businessHoursUTC });
    // 2026-05-25 was a Monday.
    const deny = evaluateTemporal(input, businessHoursUTC, { now: utc("2026-05-25", "14:00") });
    expect(deny).toBeNull();
  });

  test("deny: tx at 20:00 UTC on Monday (after window close)", () => {
    const input = makeInput({ mandate: businessHoursUTC });
    const deny = evaluateTemporal(input, businessHoursUTC, { now: utc("2026-05-25", "20:00") });
    expect(deny).not.toBeNull();
    expect(deny!.ruleField).toBe("allowedTimeWindows");
  });

  test("deny: tx at 14:00 UTC on Saturday (not a permitted day)", () => {
    const input = makeInput({ mandate: businessHoursUTC });
    // 2026-05-30 was a Saturday.
    const deny = evaluateTemporal(input, businessHoursUTC, { now: utc("2026-05-30", "14:00") });
    expect(deny).not.toBeNull();
  });

  test("midnight-wrapping window (22:00 → 06:00) allows 23:00", () => {
    const mandate = {
      temporal: {
        allowedTimeWindows: [{ start: "22:00", end: "06:00", timezone: "UTC" }],
      },
    };
    const input = makeInput({ mandate });
    expect(evaluateTemporal(input, mandate, { now: utc("2026-05-25", "23:00") })).toBeNull();
  });

  test("midnight-wrapping window (22:00 → 06:00) allows 03:00", () => {
    const mandate = {
      temporal: {
        allowedTimeWindows: [{ start: "22:00", end: "06:00", timezone: "UTC" }],
      },
    };
    const input = makeInput({ mandate });
    expect(evaluateTemporal(input, mandate, { now: utc("2026-05-25", "03:00") })).toBeNull();
  });

  test("midnight-wrapping window denies 12:00 (outside)", () => {
    const mandate = {
      temporal: {
        allowedTimeWindows: [{ start: "22:00", end: "06:00", timezone: "UTC" }],
      },
    };
    const input = makeInput({ mandate });
    expect(evaluateTemporal(input, mandate, { now: utc("2026-05-25", "12:00") })).not.toBeNull();
  });

  test("timezone offset honored — 14:00 UTC = 09:00 America/New_York during EDT", () => {
    const mandate = {
      temporal: {
        allowedTimeWindows: [
          {
            start: "09:00",
            end: "10:00",
            timezone: "America/New_York",
            daysOfWeek: ["mon" as const],
          },
        ],
      },
    };
    const input = makeInput({ mandate });
    // 2026-05-25 14:00 UTC is 10:00 EDT — outside the 09:00-10:00 window.
    expect(evaluateTemporal(input, mandate, { now: utc("2026-05-25", "14:00") })).not.toBeNull();
    // 2026-05-25 13:30 UTC is 09:30 EDT — inside.
    expect(evaluateTemporal(input, mandate, { now: utc("2026-05-25", "13:30") })).toBeNull();
  });

  test("no temporal restriction → always allow", () => {
    const mandate = {};
    const input = makeInput({ mandate });
    expect(evaluateTemporal(input, mandate, { now: utc("2026-05-30", "03:14") })).toBeNull();
  });
});
