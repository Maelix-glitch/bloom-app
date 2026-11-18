// @vitest-environment jsdom
/**
 * LabReportsSection: pinned here —
 *   · the standing disclaimer is always on screen;
 *   · a result with an entered range shows the factual flag against
 *     the range printed on the person's own report;
 *   · a result with NO entered range shows no flag at all;
 *   · the same test in two units renders as two separate series;
 *   · nothing on screen ever says "normal" or "abnormal".
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import { LABS_KEY, LABS_VERSION, type LabResult } from "@/lib/labs/labs";
import { LabReportsSection } from "./LabReportsSection";

function seed(results: LabResult[]) {
  setPref(LABS_KEY, { version: LABS_VERSION, results });
  resetPrefCache();
}

const base: LabResult = {
  id: "a",
  testName: "HbA1c",
  value: 7.2,
  unit: "%",
  reportDate: "2026-11-01",
  refLow: 4,
  refHigh: 6,
  recordedAt: "2026-11-02T09:00:00.000Z",
};

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
});

afterEach(() => cleanup());

describe("LabReportsSection", () => {
  it("shows the disclaimer and the honest empty state", () => {
    render(<LabReportsSection />);
    expect(screen.getByText(/does not interpret your results/)).toBeTruthy();
    expect(screen.getByText(/No results yet/)).toBeTruthy();
  });

  it("flags against the person's own range, in factual words only", () => {
    seed([base]);
    const { container } = render(<LabReportsSection />);
    expect(screen.getByText("Above the range printed on your report")).toBeTruthy();
    expect(screen.getByText(/Range on your report:/)).toBeTruthy();
    expect(container.textContent?.toLowerCase()).not.toContain("normal");
    expect(container.textContent?.toLowerCase()).not.toContain("abnormal");
  });

  it("a result with no entered range shows NO flag", () => {
    const { refLow: _l, refHigh: _h, ...noRange } = base;
    seed([noRange]);
    render(<LabReportsSection />);
    expect(screen.queryByText(/range printed on your report/)).toBeNull();
    expect(screen.queryByText(/Range on your report:/)).toBeNull();
  });

  it("the same test in different units is two separate series", () => {
    const { refLow: _l, refHigh: _h, ...noRange } = base;
    seed([
      { ...noRange, id: "g1", testName: "Glucose", value: 100, unit: "mg/dL" },
      { ...noRange, id: "g2", testName: "Glucose", value: 5.5, unit: "mmol/L" },
    ]);
    render(<LabReportsSection />);
    expect(screen.getAllByText("Glucose")).toHaveLength(2);
    expect(screen.getByText(/100 mg\/dL/)).toBeTruthy();
    expect(screen.getByText(/5.5 mmol\/L/)).toBeTruthy();
  });

  it("shows the trend change against the previous result in the same series", () => {
    seed([
      { ...base, id: "old", value: 6.8, reportDate: "2026-05-01" },
      { ...base, id: "new", value: 7.2, reportDate: "2026-11-01" },
    ]);
    render(<LabReportsSection />);
    expect(screen.getByText(/\+0.4 % since the previous result/)).toBeTruthy();
  });
});
