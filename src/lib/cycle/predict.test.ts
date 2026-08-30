/**
 * Unit tests for the pure Cycle Intelligence core (src/lib/cycle/predict.ts).
 * Run with `npm test`. Everything here is deterministic — "today" is always
 * passed in, never read from the clock.
 */

import { describe, expect, it } from "vitest";

import {
  addDays,
  analyzeCycle,
  diffDays,
  isValidDateKey,
  stdDev,
  validateLogDraft,
  weightedAverage,
  type PeriodLog,
} from "./predict";

const log = (start: string, extra: Partial<PeriodLog> = {}): PeriodLog => ({
  id: `p-${start}`,
  start,
  ...extra,
});

/** Build a run of start dates from a base date plus a list of cycle lengths. */
const series = (base: string, gaps: readonly number[]): string[] => {
  const out = [base];
  let cur = base;
  for (const g of gaps) {
    cur = addDays(cur, g);
    out.push(cur);
  }
  return out;
};

describe("date helpers", () => {
  it("rejects impossible calendar days", () => {
    expect(isValidDateKey("2026-02-31")).toBe(false);
    expect(isValidDateKey("2026-13-01")).toBe(false);
    expect(isValidDateKey("2026-2-1")).toBe(false);
    expect(isValidDateKey("2026-02-28")).toBe(true);
    expect(isValidDateKey("2024-02-29")).toBe(true); // leap year
  });

  it("adds and diffs days across a DST boundary without drifting", () => {
    expect(addDays("2026-03-01", 30)).toBe("2026-03-31");
    expect(diffDays("2026-03-01", "2026-03-31")).toBe(30);
    expect(diffDays("2026-03-31", "2026-03-01")).toBe(-30);
  });
});

describe("maths", () => {
  it("weights recent cycles more heavily", () => {
    const { value } = weightedAverage([28, 30, 32], 6);
    // (28*1 + 30*2 + 32*3) / 6 = 184 / 6 ≈ 30.67
    expect(value).toBeCloseTo(30.6667, 3);
  });

  it("only looks at the most recent window", () => {
    const { value, used } = weightedAverage([20, 21, 22, 30, 31], 3);
    expect(used).toEqual([22, 30, 31]);
    expect(value).toBeCloseTo((22 + 60 + 93) / 6, 5);
  });

  it("computes population standard deviation", () => {
    expect(stdDev([28, 28, 28, 28])).toBe(0);
    expect(stdDev([26, 30])).toBeCloseTo(2, 5);
    expect(stdDev([20, 40])).toBeCloseTo(10, 5);
  });
});

describe("edge case 1 — no entries yet", () => {
  it("returns no predictions at all", () => {
    const a = analyzeCycle([], "2026-08-30");
    expect(a.entryCount).toBe(0);
    expect(a.nextStart).toBeNull();
    expect(a.ovulationDate).toBeNull();
    expect(a.phase).toBeNull();
    expect(a.confidence).toBe("none");
    expect(a.flags).toHaveLength(0);
    expect(a.tips).toHaveLength(0);
  });
});

describe("edge case 2 — only one entry", () => {
  it("falls back to the generic 28-day estimate and says so", () => {
    const a = analyzeCycle([log("2026-08-10")], "2026-08-30");
    expect(a.isGeneric).toBe(true);
    expect(a.averageLength).toBe(28);
    expect(a.nextStart).toBe("2026-09-07");
    expect(a.confidence).toBe("none");
    expect(a.flags.some((f) => f.kind === "generic")).toBe(true);
    expect(a.flags[0]?.body).toContain("population average");
  });

  it("never sorts or mutates the caller's array", () => {
    const input = [log("2026-03-01"), log("2026-01-01")];
    const copy = [...input];
    analyzeCycle(input, "2026-03-20");
    expect(input.map((l) => l.start)).toEqual(copy.map((l) => l.start));
  });
});

describe("core averaging", () => {
  it("uses a recency-weighted average of plausible gaps", () => {
    const a = analyzeCycle(
      [log("2026-01-01"), log("2026-01-29"), log("2026-02-26"), log("2026-03-26")],
      "2026-04-10",
    );
    expect(a.cycleLengths).toEqual([28, 28, 28]);
    expect(a.averageLength).toBe(28);
    expect(a.nextStart).toBe("2026-04-23");
    expect(a.isGeneric).toBe(false);
    // three steady cycles is real data, but "high" asks for four or more
    expect(a.confidence).toBe("medium");
  });

  it("lets the newest cycle pull the average", () => {
    const a = analyzeCycle([log("2026-01-01"), log("2026-01-29"), log("2026-03-05")], "2026-03-20");
    // gaps 28 and 35 → (28*1 + 35*2)/3 = 98/3 ≈ 32.67 → 33
    expect(a.cycleLengths).toEqual([28, 35]);
    expect(a.averageLength).toBe(32.7);
    expect(a.nextStart).toBe(addDays("2026-03-05", 33));
  });
});

describe("edge case 3 — implausible gaps", () => {
  it("excludes long gaps from the average and suggests the missed date", () => {
    const a = analyzeCycle([log("2026-01-01"), log("2026-02-01"), log("2026-06-01")], "2026-06-20");
    // 31 days (plausible) and 120 days (a missed log)
    expect(a.cycleLengths).toEqual([31]);
    expect(a.averageLength).toBe(31);
    const anomaly = a.gaps.find((g) => !g.plausible);
    expect(anomaly?.days).toBe(120);
    expect(anomaly?.suggestedMissedDate).toBe("2026-04-02"); // midpoint of the gap
    const flag = a.flags.find((f) => f.kind === "anomaly");
    expect(flag?.action?.start).toBe("2026-04-02");
    expect(flag?.body).toContain("left out of your average");
  });

  it("treats short gaps as duplicates, not cycles, and suggests no fix date", () => {
    const a = analyzeCycle([log("2026-01-01"), log("2026-01-09")], "2026-01-20");
    expect(a.cycleLengths).toEqual([]);
    expect(a.isGeneric).toBe(true);
    const anomaly = a.gaps[0];
    expect(anomaly?.plausible).toBe(false);
    expect(anomaly?.suggestedMissedDate).toBeNull();
    expect(a.flags.find((f) => f.kind === "anomaly")?.body).toContain("mistyped");
  });

  it("counts 15 and 45 day cycles as plausible, 14 and 46 as not", () => {
    const base = "2026-01-01";
    const withGap = (days: number) =>
      analyzeCycle([log(base), log(addDays(base, days))], addDays(base, days + 1));
    expect(withGap(15).cycleLengths).toEqual([15]);
    expect(withGap(45).cycleLengths).toEqual([45]);
    expect(withGap(14).cycleLengths).toEqual([]);
    expect(withGap(46).cycleLengths).toEqual([]);
  });
});

describe("confidence", () => {
  it("is low with fewer than three plausible cycles", () => {
    const a = analyzeCycle([log("2026-01-01"), log("2026-01-29"), log("2026-02-26")], "2026-03-05");
    expect(a.cycleLengths.length).toBe(2);
    expect(a.confidence).toBe("low");
    expect(a.confidenceReason).toContain("Only 2 usable cycles");
  });

  it("is high with several steady cycles", () => {
    const starts = ["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26", "2026-04-23"];
    const a = analyzeCycle(
      starts.map((s) => log(s)),
      "2026-05-10",
    );
    expect(a.cycleLengths.length).toBe(4);
    expect(a.variability).toBeLessThanOrEqual(3);
    expect(a.confidence).toBe("high");
  });

  it("is low when variability is high even with several cycles", () => {
    // 22 / 42 / 25 / 44 — genuinely all over the place
    const starts = series("2026-01-01", [22, 42, 25, 44]);
    const a = analyzeCycle(
      starts.map((s) => log(s)),
      "2026-06-01",
    );
    expect(a.cycleLengths.length).toBe(4);
    expect(a.variability).toBeGreaterThan(7);
    expect(a.confidence).toBe("low");
    expect(a.irregular).toBe(true);
    expect(a.flags.some((f) => f.kind === "variability")).toBe(true);
  });
});

describe("ovulation and fertile window", () => {
  it("counts 14 days back from the predicted next period", () => {
    const a = analyzeCycle(
      [log("2026-01-01"), log("2026-01-29"), log("2026-02-26"), log("2026-03-26")],
      "2026-04-02",
    );
    expect(a.nextStart).toBe("2026-04-23");
    expect(a.ovulationDate).toBe("2026-04-09");
    expect(a.fertileStart).toBe("2026-04-04");
    expect(a.fertileEnd).toBe("2026-04-10");
    expect(a.ovulationDay).toBe(14); // 28 - 14
  });
});

describe("current phase", () => {
  const steady = [log("2026-01-01"), log("2026-01-29"), log("2026-02-26"), log("2026-03-26")];

  it("is menstrual during the logged bleed", () => {
    expect(analyzeCycle(steady, "2026-03-27").phase).toBe("menstrual");
  });

  it("is follicular after the bleed, before the fertile window", () => {
    expect(analyzeCycle(steady, "2026-04-01").phase).toBe("follicular");
  });

  it("is ovulation on the estimated day", () => {
    expect(analyzeCycle(steady, "2026-04-09").phase).toBe("ovulation");
  });

  it("is luteal after ovulation", () => {
    expect(analyzeCycle(steady, "2026-04-15").phase).toBe("luteal");
  });

  it("is 'past predicted date' once the prediction has passed", () => {
    const a = analyzeCycle(steady, "2026-04-24");
    expect(a.phase).toBe("late");
    expect(a.lateBy).toBe(1);
    expect(a.isLate).toBe(false); // not yet "meaningfully" late
  });

  it("uses the logged bleed length when one exists", () => {
    const withEnd = [...steady.slice(0, 3), log("2026-03-26", { end: "2026-03-30" })];
    const a = analyzeCycle(withEnd, "2026-03-30");
    expect(a.periodLength).toBe(5);
    expect(a.periodLengthIsLogged).toBe(true);
    expect(a.phase).toBe("menstrual");
  });
});

describe("edge case 5 — meaningfully late", () => {
  it("raises a calm, non-diagnostic flag after the late threshold", () => {
    const starts = ["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26"];
    const a = analyzeCycle(
      starts.map((s) => log(s)),
      "2026-04-28",
    );
    expect(a.lateBy).toBe(5);
    expect(a.isLate).toBe(true);
    const flag = a.flags.find((f) => f.kind === "late");
    expect(flag?.title).toContain("5 days later");
    expect(flag?.body).toContain("stress");
    expect(flag?.body).toContain("Nothing here can diagnose anything");
  });

  it("switches tips to the late-period set", () => {
    const starts = ["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26"];
    const a = analyzeCycle(
      starts.map((s) => log(s)),
      "2026-04-28",
    );
    expect(a.phase).toBe("late");
    expect(a.tips[0]?.title).toBe("First: this is common");
  });
});

describe("edge case 7 — trend detection", () => {
  it("spots a lengthening trend of 3+ days", () => {
    // 26 / 27 / 31 / 32 — early half averages 26.5, recent half 31.5
    const starts = series("2026-01-01", [26, 27, 31, 32]);
    const a = analyzeCycle(
      starts.map((s) => log(s)),
      "2026-05-20",
    );
    expect(a.cycleLengths).toEqual([26, 27, 31, 32]);
    expect(a.trend?.direction).toBe("lengthening");
    expect(a.trend?.days).toBeGreaterThanOrEqual(3);
    expect(a.flags.some((f) => f.kind === "trend")).toBe(true);
  });

  it("stays quiet when the shift is under the threshold", () => {
    const starts = ["2026-01-01", "2026-01-29", "2026-02-27", "2026-03-29", "2026-04-28"];
    const a = analyzeCycle(
      starts.map((s) => log(s)),
      "2026-05-10",
    );
    expect(a.trend).toBeNull();
    expect(a.flags.some((f) => f.kind === "trend")).toBe(false);
  });
});

describe("edge case 8 — delete or edit recomputes from what is left", () => {
  const full = ["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26"].map((s) => log(s));

  it("drops a deleted entry out of every derived number", () => {
    const before = analyzeCycle(full, "2026-04-01");
    const after = analyzeCycle(
      full.filter((l) => l.start !== "2026-03-26"),
      "2026-04-01",
    );
    expect(before.lastStart).toBe("2026-03-26");
    expect(after.lastStart).toBe("2026-02-26");
    expect(after.nextStart).not.toBe(before.nextStart);
    expect(after.cycleLengths).toEqual([28, 28]);
  });

  it("re-averages after an edit, with no caching of the old value", () => {
    const edited = full.map((l) => (l.start === "2026-03-26" ? { ...l, start: "2026-04-10" } : l));
    const a = analyzeCycle(edited, "2026-04-15");
    expect(a.lastStart).toBe("2026-04-10");
    expect(a.cycleLengths).toEqual([28, 28, 43]);
    expect(a.nextStart).toBe(addDays("2026-04-10", Math.round(a.averageLength)));
  });
});

describe("edge case 4 — entry-time validation", () => {
  const existing = [log("2026-01-01", { end: "2026-01-05" }), log("2026-01-29")];
  const today = "2026-02-10";

  it("requires a start date", () => {
    const errors = validateLogDraft({ start: "" }, existing, today);
    expect(errors.start).toMatch(/first day of your period/i);
  });

  it("rejects an unparseable start date", () => {
    expect(validateLogDraft({ start: "31/02/2026" }, existing, today).start).toMatch(
      /date picker/i,
    );
  });

  it("rejects a duplicate start date", () => {
    const errors = validateLogDraft({ start: "2026-01-29" }, existing, today);
    expect(errors.start).toContain("already have a period starting");
  });

  it("rejects a start date inside an existing logged period", () => {
    const errors = validateLogDraft({ start: "2026-01-03" }, existing, today);
    expect(errors.start).toContain("falls inside");
  });

  it("rejects a future start date", () => {
    const errors = validateLogDraft({ start: "2026-02-11" }, existing, today);
    expect(errors.start).toContain("future");
  });

  it("rejects an end date before the start date", () => {
    const errors = validateLogDraft({ start: "2026-02-05", end: "2026-02-01" }, existing, today);
    expect(errors.end).toContain("before the start date");
  });

  it("rejects an end date in the future", () => {
    const errors = validateLogDraft({ start: "2026-02-05", end: "2026-02-20" }, existing, today);
    expect(errors.end).toContain("future");
  });

  it("rejects an impossibly long bleed", () => {
    const errors = validateLogDraft({ start: "2026-01-10", end: "2026-02-05" }, existing, today);
    expect(errors.end).toContain("longer than 15 days");
  });

  it("lets the entry being edited keep its own date", () => {
    const errors = validateLogDraft({ start: "2026-01-29" }, existing, today, "p-2026-01-29");
    expect(errors.start).toBeUndefined();
  });

  it("accepts a clean minimal entry", () => {
    expect(validateLogDraft({ start: "2026-02-06" }, existing, today)).toEqual({});
  });
});
