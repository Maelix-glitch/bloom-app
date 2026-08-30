/**
 * Tests for the advanced daily-log core (src/lib/cycle/dayLogs.ts).
 */

import { describe, expect, it } from "vitest";

import { analyzeCycle, type PeriodLog } from "./predict";
import { analyzeDayLogs, isEmptyDay, placeDate, validateDayLog, type DayLog } from "./dayLogs";

const log = (start: string, extra: Partial<PeriodLog> = {}): PeriodLog => ({
  id: `p-${start}`,
  start,
  ...extra,
});

const day = (date: string, extra: Partial<DayLog> = {}): DayLog => ({ date, ...extra });

/** Last period started 2026-08-18, steady 28-day cycles → ovulation ≈ day 14. */
const base = analyzeCycle(
  ["2026-04-28", "2026-05-26", "2026-06-23", "2026-07-21", "2026-08-18"].map((s) => log(s)),
  "2026-08-30",
);

describe("placeDate", () => {
  it("maps dates inside the current cycle", () => {
    expect(placeDate(base, "2026-08-18")).toMatchObject({
      cycleDay: 1,
      phase: "menstrual",
      reconstructed: false,
    });
    // day 13 of 28 → inside the ovulation window (days 13–15)
    expect(placeDate(base, "2026-08-30")).toMatchObject({ cycleDay: 13, phase: "ovulation" });
  });

  it("finds ovulation around day 14 of a 28-day cycle", () => {
    expect(base.averageLength).toBeCloseTo(28, 1);
    expect(placeDate(base, "2026-08-31")?.phase).toBe("ovulation");
    expect(placeDate(base, "2026-09-02")?.phase).toBe("luteal");
  });

  it("reconstructs earlier cycles and says so", () => {
    const past = placeDate(base, "2026-06-05");
    expect(past?.reconstructed).toBe(true);
    expect(past?.cycleDay).toBeGreaterThan(0);
    expect(past?.cycleDay).toBeLessThanOrEqual(28);
  });

  it("returns nothing before any period is logged", () => {
    const empty = analyzeCycle([], "2026-08-30");
    expect(placeDate(empty, "2026-08-30")).toBeNull();
  });
});

describe("validateDayLog", () => {
  const today = "2026-08-30";

  it("rejects a future date", () => {
    expect(validateDayLog(day("2026-09-01"), today).date).toContain("hasn't happened yet");
  });

  it("rejects out-of-range numbers with a specific message", () => {
    expect(validateDayLog(day("2026-08-30", { energy: 9 }), today).energy).toBe(
      "Energy should be between 1 and 5.",
    );
    expect(validateDayLog(day("2026-08-30", { pain: 7 }), today).pain).toBe(
      "Pain should be between 0 and 5.",
    );
    expect(validateDayLog(day("2026-08-30", { sleep: 30 }), today).sleep).toBe(
      "Sleep should be between 0 and 24 hours.",
    );
    expect(validateDayLog(day("2026-08-30", { temperature: 12 }), today).temperature).toBe(
      "Temperature should be between 34 and 42°C.",
    );
  });

  it("accepts a fully-filled valid day", () => {
    const errors = validateDayLog(
      day("2026-08-30", {
        flow: "medium",
        symptoms: ["cramps"],
        mood: "okay",
        energy: 3,
        pain: 2,
        sleep: 7.5,
        temperature: 36.6,
        mucus: "creamy",
        lh: "negative",
        notes: "fine",
      }),
      today,
    );
    expect(errors).toEqual({});
  });

  it("knows when a day carries nothing", () => {
    expect(isEmptyDay(day("2026-08-30"))).toBe(true);
    expect(isEmptyDay(day("2026-08-30", { pain: 0 }))).toBe(false);
    expect(isEmptyDay(day("2026-08-30", { notes: "  " }))).toBe(true);
  });
});

describe("analyzeDayLogs", () => {
  const days: DayLog[] = [
    day("2026-08-18", { flow: "heavy", pain: 4, mood: "rough", energy: 2, symptoms: ["cramps"] }),
    day("2026-08-19", {
      flow: "medium",
      pain: 3,
      mood: "low",
      energy: 2,
      symptoms: ["cramps", "tiredness"],
    }),
    day("2026-08-20", { flow: "light", pain: 2, mood: "okay", energy: 3, symptoms: ["cramps"] }),
    day("2026-08-28", { pain: 0, mood: "good", energy: 4, sleep: 7.5, temperature: 36.4 }),
    day("2026-08-30", {
      pain: 1,
      mood: "great",
      energy: 5,
      sleep: 8,
      temperature: 36.7,
      lh: "positive",
    }),
  ];

  it("tallies symptoms with their share and leading phase", () => {
    const a = analyzeDayLogs(days, base);
    const cramps = a.symptoms.find((s) => s.key === "cramps");
    expect(cramps?.count).toBe(3);
    expect(cramps?.share).toBeCloseTo(0.6, 2);
    expect(cramps?.topPhase).toBe("menstrual");
  });

  it("averages numeric scores per phase", () => {
    const a = analyzeDayLogs(days, base);
    const menstrual = a.painByPhase.find((p) => p.phase === "menstrual");
    expect(menstrual?.days).toBe(3);
    expect(menstrual?.average).toBeCloseTo(3, 5); // (4+3+2)/3
    expect(menstrual?.min).toBe(2);
    expect(menstrual?.max).toBe(4);

    const energy = a.energyByPhase.find((p) => p.phase === "menstrual");
    expect(energy?.average).toBeCloseTo(2.3333, 3);
  });

  it("leaves phases with no data as null rather than zero", () => {
    const a = analyzeDayLogs(days, base);
    const luteal = a.painByPhase.find((p) => p.phase === "luteal");
    expect(luteal?.days).toBe(0);
    expect(luteal?.average).toBeNull();
  });

  it("builds a flow curve from the bleeding days", () => {
    const a = analyzeDayLogs(days, base);
    expect(a.flowCurve.map((f) => [f.day, f.average])).toEqual([
      [1, 3],
      [2, 2],
      [3, 1],
    ]);
  });

  it("collects temperature readings and positive LH tests in order", () => {
    const a = analyzeDayLogs(days, base);
    expect(a.temperatures.map((t) => t.value)).toEqual([36.4, 36.7]);
    expect(a.lhPositives).toHaveLength(1);
    expect(a.lhPositives[0]?.date).toBe("2026-08-30");
  });

  it("writes plain-language notes once there is enough data", () => {
    const a = analyzeDayLogs(days, base);
    expect(a.notes.length).toBeGreaterThan(0);
    expect(a.notes.join(" ")).toMatch(/most logged symptom/i);
  });

  it("handles an empty log without inventing anything", () => {
    const a = analyzeDayLogs([], base);
    expect(a.total).toBe(0);
    expect(a.symptoms).toEqual([]);
    expect(a.notes).toEqual([]);
    expect(a.flowCurve).toEqual([]);
  });

  it("counts days logged in the last 30 days", () => {
    const a = analyzeDayLogs([...days, day("2026-01-01", { pain: 1 })], base);
    expect(a.lastThirty).toBe(5);
    expect(a.total).toBe(6);
  });
});
