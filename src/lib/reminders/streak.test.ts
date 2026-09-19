import { describe, expect, it } from "vitest";

import { dayBefore, habitStreak } from "./streak";

describe("habitStreak", () => {
  const today = "2026-09-19";

  it("is 0 with no logs", () => {
    expect(habitStreak(new Set(), today)).toBe(0);
  });

  it("counts a run ending today", () => {
    const s = new Set([today, dayBefore(today), dayBefore(today, 2)]);
    expect(habitStreak(s, today)).toBe(3);
  });

  it("keeps a run that ended yesterday — still saveable", () => {
    const s = new Set([dayBefore(today), dayBefore(today, 2)]);
    expect(habitStreak(s, today)).toBe(2);
  });

  it("drops a run that ended earlier", () => {
    const s = new Set([dayBefore(today, 3), dayBefore(today, 4)]);
    expect(habitStreak(s, today)).toBe(0);
  });

  it("breaks at the first gap", () => {
    const s = new Set([today, dayBefore(today, 2), dayBefore(today, 3)]);
    expect(habitStreak(s, today)).toBe(1);
  });
});
