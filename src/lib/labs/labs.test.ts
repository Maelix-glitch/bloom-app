import { describe, expect, it } from "vitest";

import {
  LAB_FLAG_LABELS,
  LAB_RESULTS_CAP,
  flagForResult,
  flagLabel,
  groupLabResults,
  parseLabResult,
  parseLabsValue,
  type LabResult,
} from "./labs";

function result(overrides: Partial<LabResult> = {}): LabResult {
  return {
    id: "r1",
    testName: "HbA1c",
    value: 5.6,
    unit: "%",
    reportDate: "2026-11-01",
    recordedAt: "2026-11-02T09:00:00.000Z",
    ...overrides,
  };
}

describe("parseLabResult — the record is stored as entered", () => {
  it("keeps the entered range and lab name verbatim", () => {
    const parsed = parseLabResult(result({ refLow: 4, refHigh: 6, labName: "City Lab" }));
    expect(parsed).toEqual(result({ refLow: 4, refHigh: 6, labName: "City Lab" }));
  });

  it("refuses entries with a missing name, unit, value or date", () => {
    expect(parseLabResult(result({ testName: "  " }))).toBeNull();
    expect(parseLabResult(result({ unit: "" }))).toBeNull();
    expect(parseLabResult(result({ value: Number.NaN }))).toBeNull();
    expect(parseLabResult(result({ reportDate: "01/11/2026" }))).toBeNull();
    expect(parseLabResult(result({ reportDate: "2026-02-31" }))).toBeNull();
    expect(parseLabResult(null)).toBeNull();
    expect(parseLabResult("HbA1c")).toBeNull();
  });

  it("refuses an inverted range instead of flagging against it", () => {
    expect(parseLabResult(result({ refLow: 10, refHigh: 5 }))).toBeNull();
  });

  it("drops non-numeric range bounds rather than inventing them", () => {
    const parsed = parseLabResult(result({ refLow: "4" as unknown as number }));
    expect(parsed?.refLow).toBeUndefined();
    expect(parsed && flagForResult(parsed)).toBe("none");
  });
});

describe("flagForResult — arithmetic against the person's OWN range only", () => {
  it("flags below, within and above the entered range", () => {
    expect(flagForResult(result({ value: 3.9, refLow: 4, refHigh: 6 }))).toBe("below");
    expect(flagForResult(result({ value: 5.6, refLow: 4, refHigh: 6 }))).toBe("within");
    expect(flagForResult(result({ value: 6.1, refLow: 4, refHigh: 6 }))).toBe("above");
  });

  it("treats the printed bounds as inclusive", () => {
    expect(flagForResult(result({ value: 4, refLow: 4, refHigh: 6 }))).toBe("within");
    expect(flagForResult(result({ value: 6, refLow: 4, refHigh: 6 }))).toBe("within");
  });

  it("supports one-sided ranges", () => {
    expect(flagForResult(result({ value: 250, refHigh: 200 }))).toBe("above");
    expect(flagForResult(result({ value: 150, refHigh: 200 }))).toBe("within");
    expect(flagForResult(result({ value: 2, refLow: 3 }))).toBe("below");
  });

  it("NO entered range means NO flag — a textbook range is never substituted", () => {
    /* 42 % would sit outside many printed HbA1c ranges; with none
       entered, Bloom still makes no comparison at all. */
    expect(flagForResult(result({ value: 42 }))).toBe("none");
    expect(flagLabel(result({ value: 42 }))).toBeNull();
  });

  it("labels are factual and never say normal or abnormal", () => {
    for (const label of Object.values(LAB_FLAG_LABELS)) {
      expect(label.toLowerCase()).not.toContain("normal");
      expect(label.toLowerCase()).not.toContain("abnormal");
      expect(label).toContain("printed on your report");
    }
    expect(flagLabel(result({ value: 9, refLow: 4, refHigh: 6 }))).toBe(
      "Above the range printed on your report",
    );
  });
});

describe("groupLabResults — trends by name AND unit, never merged across units", () => {
  it("builds a series with arithmetic change since the previous result", () => {
    const groups = groupLabResults([
      result({ id: "a", value: 6.2, reportDate: "2026-05-01" }),
      result({ id: "b", value: 5.6, reportDate: "2026-11-01" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.points[0]!.changeFromPrevious).toBeNull();
    expect(groups[0]!.points[1]!.changeFromPrevious).toBeCloseTo(-0.6, 10);
    expect(groups[0]!.latest.id).toBe("b");
  });

  it("groups the same test name case-insensitively", () => {
    const groups = groupLabResults([
      result({ id: "a", testName: "hba1c", reportDate: "2026-05-01" }),
      result({ id: "b", testName: "HbA1c", reportDate: "2026-11-01" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.testName).toBe("HbA1c");
  });

  it("keeps different units for the same test in SEPARATE series — no conversion, no merge", () => {
    const groups = groupLabResults([
      result({ id: "a", testName: "Glucose", value: 100, unit: "mg/dL", reportDate: "2026-05-01" }),
      result({ id: "b", testName: "Glucose", value: 5.5, unit: "mmol/L", reportDate: "2026-11-01" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.unit).sort()).toEqual(["mg/dL", "mmol/L"]);
    for (const g of groups) {
      expect(g.points).toHaveLength(1);
      expect(g.points[0]!.changeFromPrevious).toBeNull();
    }
  });

  it("orders groups by their latest report date, newest first", () => {
    const groups = groupLabResults([
      result({ id: "a", testName: "HbA1c", reportDate: "2026-01-01" }),
      result({ id: "b", testName: "Vitamin D", unit: "ng/mL", value: 30, reportDate: "2026-09-01" }),
    ]);
    expect(groups.map((g) => g.testName)).toEqual(["Vitamin D", "HbA1c"]);
  });
});

describe("parseLabsValue — strict, capped, forgiving per entry", () => {
  it("drops invalid entries and keeps valid ones", () => {
    const value = parseLabsValue({
      version: 1,
      results: [result(), result({ id: "bad", value: "x" as unknown as number })],
    });
    expect(value?.results).toHaveLength(1);
    expect(value?.results[0]!.id).toBe("r1");
  });

  it("rejects the wrong version and non-array results", () => {
    expect(parseLabsValue({ version: 2, results: [] })).toBeNull();
    expect(parseLabsValue({ version: 1, results: {} })).toBeNull();
    expect(parseLabsValue(null)).toBeNull();
  });

  it("caps at LAB_RESULTS_CAP, keeping the newest by report date", () => {
    const many = Array.from({ length: LAB_RESULTS_CAP + 5 }, (_, i) =>
      result({
        id: `r${i}`,
        reportDate: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
        recordedAt: `2026-02-01T00:00:${String(i % 60).padStart(2, "0")}.000Z`,
      }),
    );
    /* Give the first five the newest dates so the cap provably keeps them. */
    for (let i = 0; i < 5; i++) many[i] = { ...many[i]!, reportDate: "2026-12-01" };
    const value = parseLabsValue({ version: 1, results: many });
    expect(value?.results).toHaveLength(LAB_RESULTS_CAP);
    expect(value?.results.filter((r) => r.reportDate === "2026-12-01")).toHaveLength(5);
  });
});
