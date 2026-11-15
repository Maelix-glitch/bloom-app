import { describe, expect, it } from "vitest";

/**
 * The Overview nutrition input (W4-3 N5, design §4.6).
 *
 * Three shapes and no fourth: vs-target when entries and valid
 * targets both stand, entries-only when the targets engine refuses
 * (totals as totals — never a dressed-up deficit), and null when
 * nothing was logged today (absence is an answer, not a zero). The
 * estimate flag rides along so any surface printing these totals can
 * say the numbers include estimates.
 */

import { emptyAssessmentState } from "@/lib/assessment/state";
import { synthesizeOverview, type OverviewInput } from "@/lib/overview/synthesis";
import { analyzeTrackers, DEFAULT_GOALS } from "@/lib/trackers/core";
import { createEntryFromFood, createEstimateEntry } from "./entries";
import { overviewNutritionFor } from "./overviewInput";
import type { Food, LogEntry } from "./types";

const TODAY = "2026-11-15";
const NOW = "2026-11-15T07:30:00.000Z";
const TARGETS = { kcal: 2200, proteinG: 120 };

const FOOD: Food = {
  id: "food-oats",
  name: "Oats",
  per100g: { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 },
  servings: [{ label: "1 bowl", grams: 60 }],
  provenance: { kind: "user_entered", sourceId: "food-oats", label: "Your value" },
};

function foodEntry(day: string, grams = 100): LogEntry {
  const entry = createEntryFromFood({
    food: FOOD,
    amount: { grams },
    meal: "breakfast",
    day,
    source: "search",
    now: NOW,
  });
  if (!entry) throw new Error("fixture entry refused");
  return entry;
}

function estimateEntry(day: string): LogEntry {
  const entry = createEstimateEntry({
    name: "Chicken biryani",
    totals: { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 },
    meal: "lunch",
    day,
    now: NOW,
  });
  if (!entry) throw new Error("fixture estimate refused");
  return entry;
}

describe("overviewNutritionFor — the three shapes", () => {
  it("nothing logged today → null, with or without targets", () => {
    expect(overviewNutritionFor({ entries: [], today: TODAY, targets: TARGETS })).toBeNull();
    expect(overviewNutritionFor({ entries: [], today: TODAY, targets: null })).toBeNull();
    expect(
      overviewNutritionFor({ entries: [foodEntry("2026-11-14")], today: TODAY, targets: TARGETS }),
    ).toBeNull();
  });

  it("entries + valid targets → vs-target, with the comparison computed", () => {
    const out = overviewNutritionFor({
      entries: [foodEntry(TODAY)],
      today: TODAY,
      targets: TARGETS,
    });
    expect(out).not.toBeNull();
    if (!out || out.kind !== "vs-target") throw new Error("expected vs-target");
    expect(out.day).toBe(TODAY);
    expect(out.totals).toEqual({ kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 });
    expect(out.targets).toEqual(TARGETS);
    expect(out.comparison.kcalRemaining).toBe(2200 - 380);
    expect(out.comparison.proteinRemaining).toBe(120 - 13);
    expect(out.entryCount).toBe(1);
    expect(out.includesEstimates).toBe(false);
  });

  it("entries + refused targets → entries-only, totals standing as totals", () => {
    const out = overviewNutritionFor({
      entries: [foodEntry(TODAY)],
      today: TODAY,
      targets: null,
    });
    expect(out).not.toBeNull();
    if (!out || out.kind !== "entries-only") throw new Error("expected entries-only");
    expect(out.targets).toBeNull();
    expect(out.totals.kcal).toBe(380);
    expect(out.entryCount).toBe(1);
  });

  it("malformed targets degrade to entries-only, exactly like a refusal", () => {
    const out = overviewNutritionFor({
      entries: [foodEntry(TODAY)],
      today: TODAY,
      targets: { kcal: Number.NaN, proteinG: 120 },
    });
    expect(out?.kind).toBe("entries-only");
  });
});

describe("overviewNutritionFor — estimate flagging and the 7-day pattern", () => {
  it("a day including a Coach estimate says so, in both shapes", () => {
    const entries = [foodEntry(TODAY), estimateEntry(TODAY)];
    const vsTarget = overviewNutritionFor({ entries, today: TODAY, targets: TARGETS });
    expect(vsTarget?.includesEstimates).toBe(true);
    expect(vsTarget?.entryCount).toBe(2);
    expect(vsTarget?.totals.kcal).toBe(380 + 680);
    const entriesOnly = overviewNutritionFor({ entries, today: TODAY, targets: null });
    expect(entriesOnly?.includesEstimates).toBe(true);
  });

  it("counts distinct logged days inside the last 7, and no further back", () => {
    const entries = [
      foodEntry(TODAY),
      foodEntry("2026-11-12"),
      foodEntry("2026-11-09"), // today - 6: inside
      foodEntry("2026-11-08"), // today - 7: outside
      estimateEntry("2026-11-12"), // same day as an existing one: still one day
    ];
    const out = overviewNutritionFor({ entries, today: TODAY, targets: null });
    expect(out?.daysLoggedLast7).toBe(3);
  });
});

/* ------------------------- synthesis wiring (input slot) ------------------------ */

function minimalInput(nutrition: OverviewInput["nutrition"]): OverviewInput {
  const trackerDays: never[] = [];
  return {
    today: TODAY,
    habits: {
      all: [],
      logs: [],
      todayHabits: [],
      completedToday: 0,
      dueToday: 0,
      points: null,
    },
    moodEntries: [],
    trackerDays,
    trackers: analyzeTrackers(trackerDays, DEFAULT_GOALS, TODAY, { active: [] }),
    assessment: {
      state: emptyAssessmentState("2026-11-01T00:00:00.000Z"),
      summary: null,
    },
    nutrition,
  };
}

describe("OverviewInput.nutrition — the synthesis input slot", () => {
  it("the synthesis accepts the field and its answers do not change yet", () => {
    const nutrition = overviewNutritionFor({
      entries: [foodEntry(TODAY), estimateEntry(TODAY)],
      today: TODAY,
      targets: TARGETS,
    });
    const withNutrition = synthesizeOverview(minimalInput(nutrition));
    const without = synthesizeOverview(minimalInput(undefined));
    expect(withNutrition).toEqual(without);
  });

  it("the field rides the input shape with its estimate flag intact", () => {
    const nutrition = overviewNutritionFor({
      entries: [estimateEntry(TODAY)],
      today: TODAY,
      targets: null,
    });
    const input = minimalInput(nutrition);
    expect(input.nutrition?.kind).toBe("entries-only");
    expect(input.nutrition?.includesEstimates).toBe(true);
  });
});
