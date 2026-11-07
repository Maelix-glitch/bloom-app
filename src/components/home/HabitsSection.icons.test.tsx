// @vitest-environment jsdom
/**
 * Habit rows render the U4 icon rule (plan §3.4): a legacy emoji habit
 * shows its bespoke twin glyph (an SVG, never the emoji), a bloom habit
 * shows its glyph, a free-pasted emoji shows itself, and a word-like
 * legacy value falls back to the monogram instead of raw text.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { HabitToday } from "@/hooks/useHabits";
import { HabitsSection } from "./HabitsSection";

afterEach(cleanup);

const habit = (over: Partial<HabitToday>): HabitToday => ({
  id: "h1",
  name: "Read",
  icon: "🌱",
  iconType: "emoji",
  iconUrl: null,
  color: "sky",
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

/** The icon tile is the row button's first span. */
function tileOf(h: HabitToday): HTMLElement {
  render(
    <HabitsSection
      habits={[h]}
      logs={[]}
      today="2026-11-07"
      loading={false}
      points={null}
      onToggle={() => {}}
      onAdd={() => {}}
    />,
  );
  const tile = screen.getByTestId(`home-habit-${h.id}`).querySelector(":scope > span");
  expect(tile).not.toBeNull();
  return tile as HTMLElement;
}

describe("HabitsSection — habit icon rendering", () => {
  it("renders a legacy catalogue emoji as its bespoke twin glyph (svg, not emoji)", () => {
    const tile = tileOf(habit({ icon: "🌱", iconType: "emoji" }));
    expect(tile.querySelector("svg")).not.toBeNull();
    expect(tile.textContent).not.toContain("🌱");
  });

  it("renders a bloom habit's glyph as an svg, never the raw glyph id", () => {
    const tile = tileOf(habit({ icon: "fern", iconType: "bloom", name: "Fern walk" }));
    expect(tile.querySelector("svg")).not.toBeNull();
    expect(tile.textContent).not.toContain("fern");
  });

  it("renders a free-pasted emoji as itself", () => {
    const tile = tileOf(habit({ icon: "🦄", iconType: "emoji" }));
    expect(tile.textContent).toContain("🦄");
    expect(tile.querySelector("svg")).toBeNull();
  });

  it("falls back to the monogram for a word-like legacy value", () => {
    const tile = tileOf(habit({ icon: "droplet", iconType: "emoji", name: "Water" }));
    expect(tile.querySelector("svg")).toBeNull();
    expect(tile.textContent).toBe("W");
  });
});
