// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StudyMap } from "./StudyMap";
import { emptyDay, type DayEntry } from "@/lib/trackers/core";

afterEach(cleanup);

function studyDay(date: string, minutes: number): DayEntry {
  const d = emptyDay(date);
  if (minutes > 0) d.sessions = [{ minutes, subject: "Reading", startAt: null }];
  return d;
}

/**
 * M-207 (sweep grammar nit): the study field's summary read "1 of the
 * last N days HAVE sessions logged" — the verb must agree with the
 * logged-day count: "has" for exactly one day, "have" otherwise.
 */
describe("StudyMap — the logged-days line agrees with its count (M-207)", () => {
  it("says HAS when exactly one day has sessions", () => {
    const days = [studyDay("2026-11-16", 30)];
    const { container } = render(<StudyMap days={days} today="2026-11-18" goal={60} />);
    const label = container.querySelector(".tk-heat")?.getAttribute("aria-label") ?? "";
    expect(label).toContain("1 of the last");
    expect(label).toContain("days has sessions logged.");
    expect(label).not.toContain("have sessions logged.");
  });

  it("says HAVE when more than one day has sessions", () => {
    const days = [studyDay("2026-11-16", 30), studyDay("2026-11-18", 45)];
    const { container } = render(<StudyMap days={days} today="2026-11-18" goal={60} />);
    const label = container.querySelector(".tk-heat")?.getAttribute("aria-label") ?? "";
    expect(label).toContain("2 of the last");
    expect(label).toContain("days have sessions logged.");
  });
});
