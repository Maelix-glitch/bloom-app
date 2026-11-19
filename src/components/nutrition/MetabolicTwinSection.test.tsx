// @vitest-environment jsdom
/**
 * MetabolicTwinSection — presentation over buildTwinSnapshot with the
 * three data hooks mocked at the module boundary (the snapshot logic
 * itself is pinned in lib/twin/twin.test.ts). The section must show
 * real values with their provenance when the record supports them,
 * and the honest insufficient states — never an invented number —
 * when it does not.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const nutritionState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const bodyState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const habitsState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/hooks/useNutrition", () => ({
  useNutrition: () => nutritionState.current,
}));
vi.mock("@/hooks/useBodyProfile", () => ({
  useBodyProfile: () => bodyState.current,
}));
vi.mock("@/hooks/useHabits", () => ({
  useHabits: () => habitsState.current,
}));

import type { Habit, HabitLog } from "@/lib/home/habits";
import type { LogEntry } from "@/lib/nutrition/types";
import { MetabolicTwinSection } from "./MetabolicTwinSection";

afterEach(cleanup);

let seq = 0;
function dayEntry(day: string, kcal: number): LogEntry {
  seq += 1;
  return {
    id: `e-${seq}`,
    day,
    meal: "lunch",
    foodId: null,
    snapshot: null,
    name: "logged",
    amount: { grams: 100 },
    nutrients: { kcal, proteinG: 0, carbsG: 0, fatG: 0 },
    provenance: { kind: "user_entered", sourceId: "fixture", label: "Your value" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

function daysFrom(from: string, count: number, kcal: number): LogEntry[] {
  const out: LogEntry[] = [];
  const start = Date.parse(`${from}T12:00:00Z`);
  for (let i = 0; i < count; i += 1) {
    out.push(dayEntry(new Date(start + i * 86_400_000).toISOString().slice(0, 10), kcal));
  }
  return out;
}

const dailyHabit: Habit = {
  id: "h-1",
  name: "Walk",
  icon: "walk",
  iconType: "bloom",
  iconUrl: null,
  color: "sage",
  frequency: "daily",
  points: 10,
  reminderTime: null,
  priority: "normal",
  tags: [],
  goal: null,
  days: [],
  timesPerWeek: null,
  startDate: null,
  note: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  archived: false,
  pausedFrom: null,
  pausedUntil: null,
};

function setStores(patch: {
  entries?: LogEntry[];
  weighIns?: { date: string; kg: number }[];
  habits?: Habit[];
  habitLogs?: HabitLog[];
  today?: string;
}) {
  nutritionState.current = {
    entries: patch.entries ?? [],
    targetState: { kind: "ready", targets: { kcal: 2500, proteinG: 100 } },
    spectrumSex: "male",
    today: patch.today ?? "2026-10-22",
  };
  bodyState.current = { weighIns: patch.weighIns ?? [] };
  habitsState.current = { habits: patch.habits ?? [], logs: patch.habitLogs ?? [] };
}

describe("MetabolicTwinSection — a record that can speak", () => {
  it("shows the maintenance estimate, trend and rhythm with provenance", () => {
    const habitLogs: HabitLog[] = [];
    const start = Date.parse("2026-10-08T12:00:00Z");
    for (let i = 0; i < 14; i += 1) {
      const date = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
      habitLogs.push({ habitId: "h-1", date, completedAt: `${date}T09:00:00.000Z` });
    }
    setStores({
      entries: daysFrom("2026-10-01", 12, 2500),
      weighIns: [
        { date: "2026-10-01", kg: 100 },
        { date: "2026-10-22", kg: 99 },
      ],
      habits: [dailyHabit],
      habitLogs,
    });
    const { container } = render(<MetabolicTwinSection />);
    const text = container.textContent ?? "";

    expect(text).toContain("Your metabolic twin");
    expect(text).toContain("2,867 kcal");
    expect(text).toContain("7,700 kcal per kg");
    expect(text).toContain("−1.0 kg");
    expect(text).toContain("100%");
    expect(text).toContain(
      "No nutrient is running under 70% of its reference in the days judged.",
    );
  });
});

describe("MetabolicTwinSection — the energy percentage (M-57)", () => {
  it("the rendered % is the logged average over the SAME targets the hero uses", () => {
    /* Rulebook v2 §11: any "X% of target" claim is tied by test to
       the displayed target. The section and the Nutrition hero both
       read useNutrition's targetState — this pins the rendered
       percentage to that exact targets object: 458 logged against a
       1,350 kcal guide is 34% (the figures the v2 audit compared
       against the maintenance estimate, a different quantity). */
    const targets = { kcal: 1350, proteinG: 171 };
    nutritionState.current = {
      entries: daysFrom("2026-10-01", 12, 458),
      targetState: { kind: "ready", targets },
      spectrumSex: "male",
      today: "2026-10-22",
    };
    bodyState.current = { weighIns: [] };
    habitsState.current = { habits: [], logs: [] };
    const { container } = render(<MetabolicTwinSection />);
    const text = container.textContent ?? "";
    const expectedPct = Math.round((458 / targets.kcal) * 100);
    expect(expectedPct).toBe(34);
    expect(text).toContain(`${expectedPct}% of your energy target`);
    expect(text).toContain("458 kcal");
  });
});

describe("MetabolicTwinSection — an empty record", () => {
  it("shows the honest unlocks and no invented numbers", () => {
    setStores({});
    const { container } = render(<MetabolicTwinSection />);
    const text = container.textContent ?? "";

    expect(text).toContain("1 of 5 signals");
    expect(text).toContain("No weigh-ins on record yet");
    expect(text).toContain("Log your weight on two different days");
    expect(text).toContain("No active habits");
    expect(text).toContain("Logged");
    expect(text).not.toContain("what your record says your body actually burns");
  });
});
