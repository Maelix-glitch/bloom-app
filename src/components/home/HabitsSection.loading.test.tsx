// @vitest-environment jsdom
/**
 * The defaults-flash, pinned at the section level.
 *
 * While signed in and still loading, the account has not answered yet —
 * any rows in state are the device mirror, not the account — so the
 * section shows the skeleton instead of flashing them as real rows.
 * Signed out, the mirror IS the record and rows render instantly, even
 * while loading is still settling.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { HabitToday } from "@/hooks/useHabits";
import { HabitsSection } from "./HabitsSection";

afterEach(cleanup);

const habit = (over: Partial<HabitToday>): HabitToday => ({
  id: "h1",
  name: "Stale mirror habit",
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

const renderSection = (props: { habits: HabitToday[]; loading: boolean; signedIn?: boolean }) =>
  render(
    <HabitsSection
      habits={props.habits}
      logs={[]}
      today="2026-11-12"
      loading={props.loading}
      signedIn={props.signedIn}
      onToggle={() => {}}
      onAdd={() => {}}
    />,
  );

describe("HabitsSection — signed-in loading shows the skeleton, not stale rows", () => {
  it("hides mirror rows behind the skeleton while signed in and loading", () => {
    renderSection({
      habits: [habit({ id: "h1", name: "Stale mirror habit" })],
      loading: true,
      signedIn: true,
    });
    expect(screen.getByText("Loading your habits…")).toBeTruthy();
    expect(screen.queryByText("Stale mirror habit")).toBeNull();
    expect(screen.queryByTestId("home-habit-h1")).toBeNull();
  });

  it("still shows the skeleton with no rows while signed in and loading", () => {
    renderSection({ habits: [], loading: true, signedIn: true });
    expect(screen.getByText("Loading your habits…")).toBeTruthy();
    expect(screen.queryByText("No habits yet.")).toBeNull();
  });

  it("renders local rows instantly while signed out, even while loading", () => {
    renderSection({
      habits: [habit({ id: "h1", name: "Local habit" })],
      loading: true,
      signedIn: false,
    });
    expect(screen.queryByText("Loading your habits…")).toBeNull();
    expect(screen.getByTestId("home-habit-h1")).toBeTruthy();
    expect(screen.getByText("Local habit")).toBeTruthy();
  });

  it("renders rows once loading settles while signed in", () => {
    renderSection({
      habits: [habit({ id: "h1", name: "Drink water" })],
      loading: false,
      signedIn: true,
    });
    expect(screen.queryByText("Loading your habits…")).toBeNull();
    expect(screen.getByTestId("home-habit-h1")).toBeTruthy();
  });
});
