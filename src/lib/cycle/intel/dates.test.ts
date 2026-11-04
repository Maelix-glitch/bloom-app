import { describe, expect, it } from "vitest";

import { addDays, diffDays, isDateKey, longDay, rangeLabel, shortDay } from "./dates";

describe("date-only arithmetic", () => {
  it("keeps a logged day stable across a DST transition", () => {
    // 29 March 2026 is a 23-hour day in Europe/London; 25 October is 25 hours.
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2);
    expect(diffDays("2026-10-24", "2026-10-26")).toBe(2);
    expect(addDays("2026-03-28", 3)).toBe("2026-03-31");
  });

  it("handles month, year and leap-year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(diffDays("2026-01-01", "2027-01-01")).toBe(365);
    expect(diffDays("2028-01-01", "2029-01-01")).toBe(366);
  });

  it("never shifts a date through UTC conversion", () => {
    expect(addDays("2026-11-01", 0)).toBe("2026-11-01");
    expect(diffDays("2026-11-01", "2026-11-01")).toBe(0);
    expect(shortDay("2026-11-01")).toBe("1 Nov");
    expect(longDay("2026-11-01")).toBe("1 Nov 2026");
    expect(rangeLabel("2026-11-18", "2026-11-21")).toBe("18 Nov – 21 Nov");
    expect(rangeLabel("2026-11-18", "2026-11-18")).toBe("18 Nov");
  });

  it("rejects impossible keys instead of rolling them over", () => {
    expect(isDateKey("2025-02-31")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("2026-1-01")).toBe(false);
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2028-02-29")).toBe(true);
  });
});
