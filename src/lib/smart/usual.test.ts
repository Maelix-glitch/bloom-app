import { describe, expect, it } from "vitest";

import { emptyDay } from "@/lib/trackers/core";
import {
  MIN_SAMPLES,
  type UsualDay,
  hasUsual,
  usualDay,
  usualSampleCount,
} from "@/lib/smart/usual";

/* A run of ordinary days: 23:30–07:00 sleep, 2L water, some movement. */
function loggedDay(date: string, overrides: Partial<ReturnType<typeof emptyDay>> = {}) {
  return {
    ...emptyDay(date),
    bedTime: "23:30",
    wakeTime: "07:00",
    sleepMinutes: 450,
    sleepQuality: 4,
    waterMl: 2000,
    movementMinutes: 30,
    energy: 3,
    screenMinutes: 180,
    sessions: [],
    ...overrides,
  };
}

describe("usualDay", () => {
  it("returns nothing when there is almost no history", () => {
    const days = [loggedDay("2026-09-19"), loggedDay("2026-09-18"), loggedDay("2026-09-17")];
    const us: UsualDay = usualDay(days, "2026-09-20");
    expect(hasUsual(us)).toBe(false);
    expect(us.sleep).toBeUndefined();
    expect(us.water).toBeUndefined();
  });

  it("appears once the field has enough distinct logged days", () => {
    const days = Array.from({ length: MIN_SAMPLES }, (_, i) => loggedDay(`2026-09-1${5 - i}`));
    const us = usualDay(days, "2026-09-20");
    expect(us.sleep?.samples).toBe(MIN_SAMPLES);
    expect(us.water?.value).toBe(2000);
    expect(us.energy?.value).toBe(3);
  });

  it("computes the median sleep window and never echoes the day being filled", () => {
    const days = [
      loggedDay("2026-09-19", { sleepMinutes: 700, bedTime: "01:00", wakeTime: "12:00" }), // the wild night
      loggedDay("2026-09-18"),
      loggedDay("2026-09-17"),
      loggedDay("2026-09-16"),
      loggedDay("2026-09-15"),
    ];
    const us = usualDay(days, "2026-09-20");
    // Median, not mean: one wild night must not move the usual.
    expect(us.sleep?.value.minutes).toBe(450);
    expect(us.sleep?.value.bedTime).toBe("23:30");
    expect(us.sleep?.value.wakeTime).toBe("07:00");
  });

  it("handles bedtimes past midnight without wrapping", () => {
    const days = [
      loggedDay("2026-09-19", { bedTime: "00:30", wakeTime: "08:00", sleepMinutes: 450 }),
      loggedDay("2026-09-18", { bedTime: "00:10", wakeTime: "07:40", sleepMinutes: 450 }),
      loggedDay("2026-09-17", { bedTime: "00:50", wakeTime: "08:20", sleepMinutes: 450 }),
      loggedDay("2026-09-16", { bedTime: "00:30", wakeTime: "08:00", sleepMinutes: 450 }),
      loggedDay("2026-09-15", { bedTime: "00:20", wakeTime: "07:50", sleepMinutes: 450 }),
    ];
    const us = usualDay(days, "2026-09-20");
    expect(us.sleep?.value.bedTime).toBe("00:30");
    expect(us.sleep?.value.wakeTime).toBe("08:00");
  });

  it("excludes the day being filled from its own suggestion", () => {
    const days = [
      loggedDay("2026-09-20", { waterMl: 5000 }),
      loggedDay("2026-09-19"),
      loggedDay("2026-09-18"),
      loggedDay("2026-09-17"),
      loggedDay("2026-09-16"),
    ];
    const us = usualDay(days, "2026-09-20");
    expect(us.water?.value).toBe(2000); // the 5L day doesn't count
  });

  it("only looks through the recent window", () => {
    const days = [
      loggedDay("2026-08-01", { waterMl: 9000 }),
      loggedDay("2026-08-02", { waterMl: 9000 }),
      loggedDay("2026-08-03", { waterMl: 9000 }),
      loggedDay("2026-08-04", { waterMl: 9000 }),
      ...Array.from({ length: 14 }, (_, i) => {
        const d = new Date(2026, 8, 19 - i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return loggedDay(iso);
      }),
    ];
    const us = usualDay(days, "2026-09-20");
    // The four 9L days from August fall outside the 14-day window entirely.
    expect(us.water?.value).toBe(2000);
    expect(us.water?.samples).toBe(14);
  });

  it("reports the most recent mode for energy", () => {
    const days = [
      loggedDay("2026-09-19", { energy: 2 }),
      loggedDay("2026-09-18", { energy: 4 }),
      loggedDay("2026-09-17", { energy: 2 }),
      loggedDay("2026-09-16", { energy: 4 }),
      loggedDay("2026-09-15", { energy: 2 }),
    ];
    const us = usualDay(days, "2026-09-20");
    expect(us.energy?.value).toBe(2);
  });

  it("suggests the typical study total and most-logged subject", () => {
    const mk = (date: string, subject: string, minutes: number) =>
      loggedDay(date, { sessions: [{ subject, minutes, startAt: null }] });
    const days = [
      mk("2026-09-19", "Organic chemistry", 90),
      mk("2026-09-18", "Organic chemistry", 60),
      mk("2026-09-17", "Mathematics", 75),
      mk("2026-09-16", "Organic chemistry", 75),
    ];
    const us = usualDay(days, "2026-09-20");
    expect(us.study?.value.minutes).toBe(75);
    expect(us.study?.value.subject).toBe("Organic chemistry");
  });

  it("usualSampleCount reports the strongest basis", () => {
    const days = [
      loggedDay("2026-09-19"),
      loggedDay("2026-09-18"),
      loggedDay("2026-09-17"),
      loggedDay("2026-09-16"),
      loggedDay("2026-09-15", {
        bedTime: null,
        wakeTime: null,
        sleepMinutes: null,
        sleepQuality: null,
        waterMl: null,
        energy: null,
        screenMinutes: null,
        movementMinutes: null,
      }),
    ];
    const us = usualDay(days, "2026-09-20");
    // Sleep has 4 days behind it; the partial day logged nothing else.
    expect(us.sleep?.samples).toBe(4);
    expect(us.water?.samples).toBe(4);
    expect(usualSampleCount(us)).toBe(4);
  });
});
