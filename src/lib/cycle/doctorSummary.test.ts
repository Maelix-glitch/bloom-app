import { describe, expect, it } from "vitest";

import { analyzeCycle, type PeriodLog } from "./predict";
import type { DayLog } from "./dayLogs";
import { buildDoctorSummary } from "./doctorSummary";

/**
 * The doctor summary (Wave C13): twelve months of logged history — dates,
 * lengths, symptoms, and the stretches left out of the averages, with the
 * reason recorded at the time. Nothing older than the window is printed.
 */

const TODAY = "2026-11-19";
const logs: PeriodLog[] = [
  { id: "old", start: "2025-10-01", end: "2025-10-05", flow: "medium", notes: null },
  { id: "a", start: "2026-09-21", end: "2026-09-25", flow: "medium", notes: null },
  { id: "b", start: "2026-10-19", end: "2026-10-23", flow: "heavy", notes: null, excluded: true },
  { id: "c", start: "2026-11-16", end: null, flow: null, notes: null },
];
const days: DayLog[] = [
  { date: "2026-09-22", symptoms: ["cramps"] },
  { date: "2026-10-20", symptoms: ["cramps", "acne"] },
  { date: "2025-10-02", symptoms: ["headache"] }, // outside the window
];

describe("buildDoctorSummary", () => {
  const summary = buildDoctorSummary({
    logs,
    days,
    analysis: analyzeCycle(logs, TODAY),
    today: TODAY,
  });

  it("prints only the last twelve months, oldest first", () => {
    expect(summary.rows.map((r) => r.start)).toEqual(["2026-09-21", "2026-10-19", "2026-11-16"]);
  });

  it("carries dates, bleed length, cycle length and the exclusion mark", () => {
    const [a, b, c] = summary.rows;
    expect(a).toMatchObject({ bleedDays: 5, cycleDays: 28, flow: "medium", excluded: false });
    expect(b).toMatchObject({ bleedDays: 5, cycleDays: 28, excluded: true });
    expect(c).toMatchObject({ bleedDays: null, cycleDays: null, endLabel: null });
  });

  it("counts symptom days inside the window only", () => {
    expect(summary.topSymptoms).toEqual([
      { symptom: "cramps", days: 2 },
      { symptom: "acne", days: 1 },
    ]);
  });
});
