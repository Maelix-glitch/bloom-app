// @vitest-environment jsdom
/**
 * The prototype HabitsCard rebuild (Reskin slice A), pinned:
 *  · the header title is the day's real count ("n of n habits done",
 *    "All n habits are done." when complete);
 *  · the segmented pill progress has one segment per habit, gold only
 *    when that habit is done;
 *  · each row shows the habit's REAL points value — the same `points`
 *    field useHabits awards on a tick — gold when done;
 *  · the hint line appears ONLY from real meta (a stored note, the
 *    week's count, a reminder time) and is omitted entirely otherwise —
 *    never invented copy;
 *  · Bloom's Add Habit pill lives in the card and opens the same flow.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { HabitToday } from "@/hooks/useHabits";
import { HabitsSection } from "./HabitsSection";

afterEach(cleanup);

const habit = (over: Partial<HabitToday>): HabitToday => ({
  id: "h1",
  name: "Drink water",
  icon: "💧",
  iconType: "emoji",
  iconUrl: null,
  color: "amber",
  frequency: "daily",
  points: 10,
  reminderTime: null,
  priority: "medium",
  tags: [],
  goal: null,
  days: [],
  timesPerWeek: null,
  startDate: null,
  note: null,
  createdAt: null,
  archived: false,
  pausedFrom: null,
  pausedUntil: null,
  done: false,
  doneAt: null,
  due: true,
  week: null,
  missedYesterday: null,
  ...over,
});

const renderCard = (habits: HabitToday[], onAdd = () => {}) =>
  render(
    <HabitsSection
      habits={habits}
      logs={[]}
      today="2026-11-14"
      loading={false}
      onToggle={() => {}}
      onAdd={onAdd}
    />,
  );

describe("HabitsSection — prototype HabitsCard", () => {
  it("titles the card with the real count and segments one pill per habit", () => {
    renderCard([
      habit({ id: "a", name: "Drink water", done: true }),
      habit({ id: "b", name: "Read", done: false }),
    ]);
    expect(screen.getByText("1 of 2 habits done")).toBeTruthy();
    const segments = screen.getByTestId("home-habits-segments");
    expect(segments.getAttribute("aria-valuenow")).toBe("1");
    const pills = [...segments.querySelectorAll("span")];
    expect(pills).toHaveLength(2);
    expect(pills[0]!.className).toContain("bg-gold");
    expect(pills[1]!.className).toContain("bg-white/10");
  });

  it("says all done, in the prototype's words, when the day is complete", () => {
    renderCard([habit({ id: "a", done: true }), habit({ id: "b", name: "Read", done: true })]);
    expect(screen.getByText("All 2 habits are done.")).toBeTruthy();
  });

  it("shows each habit's own real points value, not a hardcoded number", () => {
    renderCard([
      habit({ id: "a", points: 10, done: true }),
      habit({ id: "b", name: "Read", points: 25, done: false }),
    ]);
    expect(screen.getByText("+10")).toBeTruthy();
    expect(screen.getByText("+25")).toBeTruthy();
  });

  it("shows a hint only from real meta — the stored note — and omits it otherwise", () => {
    renderCard([
      habit({ id: "a", note: "Two litres, through the day" }),
      habit({ id: "b", name: "Read" }),
    ]);
    expect(screen.getByText(/Two litres, through the day/)).toBeTruthy();
    const readRow = screen.getByTestId("home-habit-b");
    // No note, no week count, no reminder, no streak: the name stands
    // alone next to its points — no hint line is rendered at all.
    expect(readRow.textContent).toBe("Read+10");
  });

  it("keeps Bloom's Add Habit pill in the card, opening the same flow", () => {
    const onAdd = vi.fn();
    renderCard([habit({})], onAdd);
    fireEvent.click(screen.getByTestId("home-habits-add"));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
