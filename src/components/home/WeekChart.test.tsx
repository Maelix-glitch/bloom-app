// @vitest-environment jsdom
/**
 * The week chart's determinism, pinned (Reskin Slice B).
 *
 * The chart used to render straight off whatever logs happened to be in
 * state — on a first load or a Profile return that meant interim bars
 * (an empty/mirror week) painted as the record, and the section could
 * read as absent while the rest of Today was still settling. Now the
 * section shell is ALWAYS present: while the record is unsettled it
 * holds a stable skeleton in the same panel, and once ready (latched by
 * the caller) the real chart mounts and never unmounts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { WeekTicks } from "@/lib/home/weekChart";
import { WeekChart } from "./WeekChart";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const data: WeekTicks = {
  labels: ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
  thisWeek: [1, 2, 0, 3, 1, 0, 2],
  prevWeek: [0, 1, 1, 2, 0, 1, 1],
  totalThis: 9,
  totalPrev: 6,
};

describe("WeekChart — deterministic presence, settled data only", () => {
  it("holds a stable skeleton panel while the record is unsettled — title present, no interim bars or totals", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    render(<WeekChart data={data} ready={false} />);
    /* The section never goes missing: its shell and title are there. */
    expect(screen.getByText("Your week in ticks")).toBeTruthy();
    expect(screen.getByTestId("home-week-chart-skeleton")).toBeTruthy();
    /* But nothing derived from unsettled logs is painted as the record. */
    expect(screen.queryByText("habits ticked")).toBeNull();
    expect(screen.queryByText("9")).toBeNull();
  });

  it("renders the real totals once ready", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    render(<WeekChart data={data} ready={true} />);
    expect(screen.getByText("Your week in ticks")).toBeTruthy();
    expect(screen.queryByTestId("home-week-chart-skeleton")).toBeNull();
    expect(screen.getByText("habits ticked")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
  });
});
