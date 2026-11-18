// @vitest-environment jsdom
/**
 * RecordBlock trust contracts (senior diagnosis M-26/M-27):
 *
 *   · a stat tile's sub-line may only elaborate the tile's own metric —
 *     the points tile carries rank progress, never an unrelated count
 *     like mood check-ins, and there is no "Rewards 0" tile disagreeing
 *     with the points balance the rest of the app shows;
 *   · the week tile's value carries its frame ("4 of 7") and its
 *     sub-line names its window in words ("of the last 30 days");
 *   · the grid's today cell is the real today (a Wednesday for
 *     2026-11-18), future cells are marked future, and the grid itself
 *     no longer prints a second count under a different window — the
 *     card header states the twelve-week count once.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { recordGrid, type RecordTotals } from "@/lib/profile/record";
import { RecordGrid, RecordNumbers } from "./RecordBlock";

afterEach(cleanup);

const totals: RecordTotals = {
  daysLogged: 15,
  streak: 3,
  bestStreak: 9,
  last7: 4,
  last30: 7,
  entries: 42,
  firstDay: "2026-08-13",
};

describe("RecordNumbers", () => {
  it("the points tile shows the balance and its own metric's progress", () => {
    render(<RecordNumbers totals={totals} points={945} loading={false} />);
    const tile = screen.getByTestId("pf-number-points");
    expect(within(tile).getByText("945")).toBeTruthy();
    expect(within(tile).getByText("Points")).toBeTruthy();
    /* 945 points: First Bloom (500) → Sprout (1,200) is 64% of the way. */
    expect(within(tile).getByText("64% to Sprout")).toBeTruthy();
    expect(screen.queryByTestId("pf-number-rewards")).toBeNull();
    expect(screen.queryByText(/mood check-ins/)).toBeNull();
  });

  it("the week tile frames its value and names the sub-line's window", () => {
    render(<RecordNumbers totals={totals} points={945} loading={false} />);
    const week = screen.getByTestId("pf-number-week");
    expect(within(week).getByText("4")).toBeTruthy();
    expect(within(week).getByText("of 7")).toBeTruthy();
    expect(within(week).getByText("7 of the last 30 days")).toBeTruthy();
  });

  it("the days tile dates the record from its first day, in full", () => {
    render(<RecordNumbers totals={totals} points={945} loading={false} />);
    expect(within(screen.getByTestId("pf-number-days")).getByText("since 13 Aug 2026")).toBeTruthy();
  });
});

describe("RecordGrid", () => {
  it("marks the real today and the future cells of its week", () => {
    const { days } = recordGrid({
      trackerDays: [],
      moodEntries: [],
      habitLogs: [],
      cycleDays: [],
      periods: [],
      today: "2026-11-18", // a Wednesday
    });
    const { container } = render(<RecordGrid days={days} today="2026-11-18" />);
    const todayCell = container.querySelector('[data-today="true"]');
    expect(todayCell).not.toBeNull();
    expect(todayCell!.getAttribute("title")).toMatch(/^Wed, Nov 18/);
    expect(container.querySelectorAll('[data-future="true"]')).toHaveLength(4);
    /* No second count under a different window inside the grid. */
    expect(screen.queryByText(/of \d+ days$/)).toBeNull();
  });
});
