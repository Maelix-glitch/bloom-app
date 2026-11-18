// @vitest-environment jsdom
/**
 * The Sleep & Recovery section: pinned — a well-recorded week shows its
 * band with the debt line and its basis; a thin record shows the honest
 * "not enough data" read instead of a band.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/hooks/useAssessment", () => ({
  useAssessment: () => ({
    state: { status: "complete", answers: { sleepHoursTypical: null } },
  }),
}));

import { emptyDay, type DayEntry } from "@/lib/trackers/core";
import { SleepRecoverySection } from "./SleepRecoverySection";

const TODAY = "2026-11-18";

function day(date: string, sleepMinutes: number | null, sleepQuality: number | null = null): DayEntry {
  const d = emptyDay(date);
  d.sleepMinutes = sleepMinutes;
  d.sleepQuality = sleepQuality;
  return d;
}

function nights(count: number, minutes: number, quality: number | null): DayEntry[] {
  const out: DayEntry[] = [];
  const [y, m, dd] = TODAY.split("-").map(Number) as [number, number, number];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(Date.UTC(y, m - 1, dd - i)).toISOString().slice(0, 10);
    out.push(day(date, minutes, quality));
  }
  return out;
}

afterEach(() => cleanup());

describe("SleepRecoverySection", () => {
  it("shows the band and the debt line for a well-recorded week", () => {
    render(<SleepRecoverySection days={nights(5, 470, 5)} today={TODAY} />);
    expect(screen.getByText("Recovered")).toBeTruthy();
    expect(screen.getByText(/Sleep debt of 50m/)).toBeTruthy();
    expect(screen.getByText(/5 recorded nights in the last 7 days/)).toBeTruthy();
  });

  it("shows the honest thin-record read instead of a band", () => {
    render(<SleepRecoverySection days={nights(1, 300, 2)} today={TODAY} />);
    expect(screen.getByText("Not enough data yet")).toBeTruthy();
    expect(screen.getByText(/Only 1 night recorded in the last 7 days/)).toBeTruthy();
    expect(screen.queryByText("Running low")).toBeNull();
  });
});
