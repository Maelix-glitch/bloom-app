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
/* Brief v4 Slice 5: the Twin absorbed the plan's learning surface, so
   it reads the plan store too. Mocked at the same module boundary;
   the default is "no plan" — the strip stays absent and every
   pre-Slice-5 fixture renders exactly as it did. */
const planState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/hooks/useNutrition", () => ({
  useNutrition: () => nutritionState.current,
}));
vi.mock("@/hooks/useBodyProfile", () => ({
  useBodyProfile: () => bodyState.current,
}));
vi.mock("@/hooks/useHabits", () => ({
  useHabits: () => habitsState.current,
}));
vi.mock("@/hooks/usePlan", () => ({
  usePlan: () => planState.current,
}));

import { fireEvent, screen } from "@testing-library/react";
import type { Habit, HabitLog } from "@/lib/home/habits";
import type { DailyPlan, TargetAdjustment } from "@/lib/nutrition";
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

const noPlan = {
  state: { kind: "can_generate" },
  targetAdjustment: null,
  engineTdeeKcal: null,
  clearTargetAdjustment: () => {},
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
  planState.current = { ...noPlan };
}

/** A minimal stored plan for the strip fixtures: planLearningFor
 *  reads only its day, targets and meal suggestions (none here, so
 *  portion signals and deprioritised dishes stay empty — the strip
 *  rows under test are adherence / maintenance / adjustment). */
function readyPlan(day: string, targets = { kcal: 2500, proteinG: 100 }): DailyPlan {
  return { day, targets, meals: [] } as unknown as DailyPlan;
}

function setPlan(patch: {
  plan?: DailyPlan;
  targetAdjustment?: TargetAdjustment | null;
  engineTdeeKcal?: number | null;
  clearTargetAdjustment?: () => void;
}) {
  planState.current = {
    state: patch.plan ? { kind: "ready", plan: patch.plan, staleness: null } : { kind: "can_generate" },
    targetAdjustment: patch.targetAdjustment ?? null,
    engineTdeeKcal: patch.engineTdeeKcal ?? null,
    clearTargetAdjustment: patch.clearTargetAdjustment ?? (() => {}),
  };
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
    /* Brief v7 N2 (M-157): the provenance lines live behind the one
       `.more` disclosure now — closed, they are not in the DOM at
       all (the native <details> kept them mounted). Open it, as a
       reader would, before reading them. */
    fireEvent.click(screen.getByRole("button", { name: /How the twin works/ }));
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

describe("MetabolicTwinSection — the absorbed insight strip (brief v4 Slice 5)", () => {
  it("a 2-day adherence conclusion is an Early read with a neutral headline (M-93)", () => {
    /* The owner's data shape: two logged days, both under target.
       The learning reads the last 2–3 logged days by design, so the
       conclusion's basis is 2 days — under the brief's 7-day line. */
    setStores({ entries: daysFrom("2026-10-20", 2, 1800) });
    setPlan({ plan: readyPlan("2026-10-22") });
    const { container } = render(<MetabolicTwinSection />);
    const strip = container.querySelector(".twin-strip");
    expect(strip, "the strip renders with a plan and learning").not.toBeNull();
    const text = strip!.textContent ?? "";
    expect(text).toContain("Intake is below target so far");
    expect(text).not.toContain("running under");
    const badge = strip!.querySelector(".tile-badge--early");
    expect(badge, "the Early read badge renders").not.toBeNull();
    expect(badge!.textContent).toContain("Early read · 2 days");
    /* Neutral treatment: the badge is the dashed estimated
       signature, never gold, never success. */
    expect(badge!.className).not.toMatch(/gold|success/);
    /* The strip states the conclusion only — the averages stay in
       the coverage tile (the M-83 debt stays cleared). */
    expect(text).not.toContain("1,800");
  });

  it("the adherence basis is the last 3 logged days even on a long record — still an Early read", () => {
    setStores({
      entries: daysFrom("2026-10-01", 12, 2500),
      weighIns: [
        { date: "2026-10-01", kg: 100 },
        { date: "2026-10-22", kg: 99 },
      ],
    });
    /* engineTdee == the estimate (2,867) → maintenance matches the
       target: a ≥10-day-basis conclusion, which renders badge-free. */
    setPlan({ plan: readyPlan("2026-10-22"), engineTdeeKcal: 2867 });
    const { container } = render(<MetabolicTwinSection />);
    const strip = container.querySelector(".twin-strip");
    expect(strip).not.toBeNull();
    const rows = [...strip!.querySelectorAll(".insight")];
    expect(rows.length).toBe(2);
    const adherence = rows.find((r) => r.textContent?.includes("Intake is"));
    expect(adherence, "adherence row renders").toBeDefined();
    expect(adherence!.querySelector(".tile-badge--early")?.textContent).toContain(
      "Early read · 3 days",
    );
    const matches = rows.find((r) => r.textContent?.includes("Maintenance matches your target"));
    expect(matches, "maintenance-matches row renders").toBeDefined();
    expect(matches!.querySelector(".tile-badge--early")).toBeNull();
  });

  it("the target adjustment row carries the Remove adjustment action", () => {
    const clear = vi.fn();
    const adjustment: TargetAdjustment = {
      version: 1 as TargetAdjustment["version"],
      kcalDelta: 200,
      confirmedAt: "2026-10-20T03:00:00.000Z",
      basedOn: {
        maintenanceKcal: 2867,
        engineTdeeKcal: 2667,
        loggedDays: 12,
        spanDays: 21,
        weightChangeKg: -1,
      },
    };
    setStores({ entries: daysFrom("2026-10-20", 2, 1800) });
    setPlan({
      plan: readyPlan("2026-10-22", { kcal: 2700, proteinG: 100 }),
      targetAdjustment: adjustment,
      engineTdeeKcal: 2667,
      clearTargetAdjustment: clear,
    });
    const { container } = render(<MetabolicTwinSection />);
    const strip = container.querySelector(".twin-strip");
    expect(strip).not.toBeNull();
    expect(strip!.textContent).toContain("Target includes your adjustment");
    /* The adjustment's maintenance basis is not restated as a
       number in the strip — it lives in the maintenance tile. */
    expect(strip!.textContent).not.toContain("2,867");
    fireEvent.click(screen.getByRole("button", { name: "Remove adjustment" }));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("caps the strip at two rows — the functional and headline conclusions win", () => {
    const adjustment: TargetAdjustment = {
      version: 1 as TargetAdjustment["version"],
      kcalDelta: 200,
      confirmedAt: "2026-10-20T03:00:00.000Z",
      basedOn: {
        maintenanceKcal: 2867,
        engineTdeeKcal: 2667,
        loggedDays: 12,
        spanDays: 21,
        weightChangeKg: -1,
      },
    };
    setStores({
      entries: daysFrom("2026-10-01", 12, 2500),
      weighIns: [
        { date: "2026-10-01", kg: 100 },
        { date: "2026-10-22", kg: 99 },
      ],
    });
    /* Adjustment + adherence + maintenance-matches all exist;
       engineTdee is the estimate so "matches" would qualify — the
       cap keeps adjustment (functional) and adherence (headline). */
    setPlan({
      plan: readyPlan("2026-10-22"),
      targetAdjustment: adjustment,
      engineTdeeKcal: 2867,
    });
    const { container } = render(<MetabolicTwinSection />);
    const strip = container.querySelector(".twin-strip");
    expect(strip).not.toBeNull();
    const rows = strip!.querySelectorAll(".insight");
    expect(rows.length).toBe(2);
    expect(strip!.textContent).toContain("Target includes your adjustment");
    expect(strip!.textContent).toContain("Intake is close to target so far");
    expect(strip!.textContent).not.toContain("Maintenance matches your target");
  });

  it("no plan, no strip — the tiles render exactly as before", () => {
    setStores({ entries: daysFrom("2026-10-20", 2, 1800) });
    const { container } = render(<MetabolicTwinSection />);
    expect(container.querySelector(".twin-strip")).toBeNull();
  });
});
