import { describe, expect, it } from "vitest";

import { analyseCycle } from "./index";
import { addDays } from "./dates";
import type { CycleDayRecord, CyclePeriodRecord, CycleRecord } from "./types";

const period = (start: string, end: string | null = null): CyclePeriodRecord => ({
  start,
  end,
  bleedingDays: null,
});

const dayRecord = (date: string, patch: Partial<CycleDayRecord> = {}): CycleDayRecord => ({
  date,
  flow: null,
  symptoms: [],
  mood: null,
  energy: null,
  sleepHours: null,
  pain: null,
  ...patch,
});

const record = (
  today: string,
  starts: string[],
  days: CycleDayRecord[] = [],
  ends: Record<string, string> = {},
): CycleRecord => ({
  today,
  periods: starts.map((start) => period(start, ends[start] ?? null)),
  days,
});

function startsFrom(first: string, lengths: number[]): string[] {
  const out = [first];
  for (const length of lengths) out.push(addDays(out[out.length - 1]!, length));
  return out;
}

describe("scenario A — no history", () => {
  const analysis = analyseCycle(record("2026-06-01", []));

  it("makes no personalised forecast", () => {
    expect(analysis.forecast.available).toBe(false);
    expect(analysis.forecast.next).toBeNull();
    expect(analysis.baseline.count).toBe(0);
    expect(analysis.phase.key).toBeNull();
    expect(analysis.confidence.level).toBe("none");
  });

  it("says what would change that, without inventing a cycle length", () => {
    expect(analysis.insights.some((i) => i.id === "need-second-start")).toBe(true);
    expect(analysis.brief.headline).toBe("Your cycle journey starts here.");
    expect(analysis.explanation.lines.join(" ")).toContain("28-day");
  });
});

describe("scenario B — one period start", () => {
  const analysis = analyseCycle(record("2026-01-10", ["2026-01-01"]));

  it("records the day but refuses a personal baseline", () => {
    expect(analysis.phase.day).toBe(10);
    expect(analysis.phase.key).toBeNull();
    expect(analysis.phase.note).toContain("needs a cycle length");
    expect(analysis.baseline.sufficiency).toBe("one_start");
    expect(analysis.forecast.available).toBe(false);
    expect(analysis.confidence.level).toBe("none");
  });

  it("never claims ovulation", () => {
    expect(analysis.brief.lines.join(" ")).not.toContain("ovulat");
  });
});

describe("scenario C — two starts, one interval", () => {
  const analysis = analyseCycle(
    record("2026-02-05", ["2026-01-01", "2026-01-29"]),
  );

  it("shows a preliminary estimate with a wide window", () => {
    expect(analysis.baseline.intervals).toEqual([28]);
    expect(analysis.forecast.status).toBe("preliminary");
    expect(analysis.forecast.halfWidth).toBe(4);
    expect(analysis.forecast.next?.point).toBe("2026-02-26");
    expect(analysis.forecast.next?.from).toBe("2026-02-22");
    expect(analysis.confidence.level).toBe("low");
  });
});

describe("scenario D — consistent intervals", () => {
  const starts = startsFrom("2026-01-01", [28, 28, 28, 28, 28, 28, 28]);
  const last = starts[starts.length - 1]!;
  const analysis = analyseCycle(record(addDays(last, 9), starts));

  it("derives a personal baseline and narrows the window", () => {
    expect(analysis.forecast.status).toBe("personal");
    expect(analysis.forecast.halfWidth).toBe(2);
    expect(analysis.baseline.median).toBe(28);
    expect(analysis.confidence.level).toBe("good");
  });

  it("scores its own past predictions", () => {
    expect(analysis.backtest.count).toBe(6);
    expect(analysis.backtest.meanAbsError).toBe(0);
  });

  it("places the phase as an estimate, not a measurement", () => {
    expect(analysis.phase.key).toBe("follicular");
    expect(analysis.phase.certainty).toBe("estimated");
    expect(analysis.phase.label).toBe("Follicular");
  });
});

describe("scenario E — variable cycle lengths", () => {
  const starts = startsFrom("2026-01-01", [26, 33, 24, 35, 27, 34]);
  const analysis = analyseCycle(record("2026-07-01", starts));

  it("widens the forecast instead of forcing a single date", () => {
    expect(analysis.forecast.halfWidth).toBeGreaterThanOrEqual(4);
    expect(analysis.baseline.min).toBe(24);
    expect(analysis.baseline.max).toBe(35);
    expect(analysis.confidence.level).not.toBe("good");
  });
});

describe("scenario F — one unusually long interval", () => {
  const starts = ["2026-01-01", "2026-01-29", "2026-03-30"];
  const analysis = analyseCycle(record("2026-04-02", starts));

  it("keeps the observation and sets it aside from the statistics", () => {
    expect(analysis.baseline.intervals).toEqual([28, 60]);
    expect(analysis.baseline.unusual).toEqual([60]);
    expect(analysis.baseline.median).toBe(28);
    expect(analysis.changes.some((c) => c.kind === "unusual")).toBe(true);
  });

  it("does not present it as a diagnosis", () => {
    const text = analysis.changes.map((c) => c.detail).join(" ");
    expect(text.toLowerCase()).not.toContain("pcos");
    expect(text.toLowerCase()).not.toContain("disorder");
  });
});

describe("scenario G — historical edit", () => {
  const before = analyseCycle(
    record("2026-03-10", ["2026-01-01", "2026-01-29", "2026-03-05"]),
  );
  const after = analyseCycle(
    record("2026-03-10", ["2026-01-01", "2026-01-29", "2026-02-26"]),
  );

  it("recalculates both the baseline and the forecast", () => {
    expect(before.forecast.next?.point).not.toBe(after.forecast.next?.point);
    expect(before.baseline.median).not.toBe(after.baseline.median);
  });
});

describe("scenario H — historical deletion", () => {
  const full = ["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-20"];
  const before = analyseCycle(record("2026-04-01", full));
  const after = analyseCycle(record("2026-04-01", full.filter((s) => s !== "2026-02-26")));

  it("removes the record from every dependent calculation", () => {
    expect(after.baseline.starts).toEqual(["2026-01-01", "2026-01-29", "2026-03-20"]);
    expect(after.baseline.intervals).toEqual([28, 50]);
    expect(before.baseline.count).toBe(3);
    expect(after.baseline.count).toBe(2);
  });

  it("leaves no resurrected entry behind", () => {
    expect(after.record.periods.some((p) => p.start === "2026-02-26")).toBe(false);
  });
});

describe("scenario I — missing symptom records", () => {
  const starts = startsFrom("2026-01-01", [28, 28]);
  const analysis = analyseCycle(record("2026-04-01", starts));

  it("treats missing days as missing, never as absence of symptoms", () => {
    expect(analysis.symptoms.sufficient).toBe(false);
    expect(analysis.symptoms.patterns).toEqual([]);
    expect(analysis.symptoms.note).toContain("at least 3 cycles");
    expect(analysis.symptoms.note.toLowerCase()).not.toContain("no symptoms");
  });
});

describe("scenario K — insufficient symptom samples", () => {
  const analysis = analyseCycle(
    record(
      "2026-02-10",
      ["2026-01-01", "2026-01-29"],
      [dayRecord("2026-01-02", { symptoms: ["Cramps"] })],
    ),
  );

  it("refuses to call one occurrence a correlation", () => {
    expect(analysis.symptoms.patterns).toEqual([]);
    expect(analysis.symptoms.topSymptom).toBeNull();
  });
});

describe("symptom patterns with enough evidence", () => {
  const starts = ["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26"];
  const analysis = analyseCycle(
    record("2026-03-27", starts, [
      dayRecord("2026-01-02", { symptoms: ["Cramps"], energy: 2 }),
      dayRecord("2026-01-30", { symptoms: ["Cramps"], energy: 2 }),
      dayRecord("2026-02-27", { symptoms: ["Cramps"], energy: 3 }),
    ]),
  );

  it("reports recurrence with its sample attached", () => {
    expect(analysis.symptoms.sufficient).toBe(true);
    expect(analysis.symptoms.topSymptom).toBe("Cramps");
    const pattern = analysis.symptoms.patterns[0]!;
    expect(pattern.cyclesSeen).toBe(3);
    expect(pattern.totalCycles).toBe(3);
    expect(pattern.dominantPhase).toBe("menstrual");
    expect(analysis.insights.some((i) => i.kind === "symptom")).toBe(true);
  });
});

describe("scenario L — irregular recorded cycles", () => {
  const starts = startsFrom("2026-01-01", [21, 40, 21, 40]);
  const last = starts[starts.length - 1]!;
  const analysis = analyseCycle(record(addDays(last, 17), starts));

  it("keeps the history and shows uncertainty rather than certainty", () => {
    expect(analysis.baseline.count).toBe(4);
    expect(analysis.forecast.halfWidth).toBe(10);
    expect(analysis.confidence.level).not.toBe("good");
    expect(analysis.confidence.level).not.toBe("moderate");
  });

  it("marks a phase inside an ovulation window as estimated", () => {
    expect(analysis.phase.key).toBe("ovulation");
    expect(analysis.phase.certainty).toBe("estimated");
    expect(analysis.phase.label).toContain("Estimated");
    expect(analysis.phase.note).toContain("not evidence that ovulation happened");
  });
});

describe("bleeding duration", () => {
  it("uses only periods the user actually closed with an end date", () => {
    const starts = ["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26"];
    const ends = {
      "2026-01-01": "2026-01-05",
      "2026-01-29": "2026-02-03",
      "2026-02-26": "2026-03-01",
    };
    const analysis = analyseCycle(record("2026-03-27", starts, [], ends));
    expect(analysis.baseline.bleedingCount).toBe(3);
    expect(analysis.baseline.bleedingMedian).toBe(5);
    expect(analysis.baseline.completeness).toBeCloseTo(3 / 4, 5);
  });
});

describe("determinism and versioning", () => {
  it("returns an identical result for the same record", () => {
    const input = record("2026-04-01", startsFrom("2026-01-01", [28, 29, 27, 28]));
    const a = analyseCycle(input);
    const b = analyseCycle(input);
    expect(a).toEqual(b);
    expect(a.version).toBe("intel-2.0.0");
    expect(a.generatedAt).toBe("2026-04-01T00:00:00.000Z");
  });
});
