/**
 * The First Bloom model (M-174) — pinned:
 *   · a step is done only when its real signal says so, each signal
 *     flipping exactly its own step;
 *   · the current step is the first unfinished one, and the path is
 *     complete only when every signal is present;
 *   · points are the progression catalogue's own values for the same
 *     actions (read by id, never restated), and steps the catalogue
 *     pays nothing for carry no points;
 *   · goal copy uses the assessment's stated goal — and only that.
 */

import { describe, expect, it } from "vitest";

import { GOAL_BY_ID } from "@/lib/progression/goals";

import { journeyStateOf, type JourneySignals } from "./journey";

const FRESH: JourneySignals = {
  waterDaysLogged: 0,
  habitTicks: 0,
  vitalisMet: false,
  planExists: false,
  todayDish: null,
  sleepDaysLogged: 0,
  moodEntries: 0,
  assessmentStatus: "not_started",
  goal: null,
};

const step = (signals: JourneySignals, id: string) =>
  journeyStateOf(signals).steps.find((s) => s.id === id)!;

describe("journeyStateOf — step state from real signals", () => {
  it("a fresh record starts at the water step with nothing done", () => {
    const j = journeyStateOf(FRESH);
    expect(j.complete).toBe(false);
    expect(j.doneCount).toBe(0);
    expect(j.current).toBe(0);
    expect(j.steps[0]!.id).toBe("water");
    expect(j.steps.map((s) => s.id)).toEqual([
      "water",
      "habit",
      "vitalis",
      "dish",
      "sleep",
      "mood",
      "assessment",
    ]);
  });

  it("each signal completes exactly its own step", () => {
    expect(step({ ...FRESH, waterDaysLogged: 1 }, "water").done).toBe(true);
    expect(step({ ...FRESH, waterDaysLogged: 1 }, "sleep").done).toBe(false);
    expect(step({ ...FRESH, habitTicks: 3 }, "habit").done).toBe(true);
    expect(step({ ...FRESH, vitalisMet: true }, "vitalis").done).toBe(true);
    expect(step({ ...FRESH, planExists: true }, "dish").done).toBe(true);
    expect(step({ ...FRESH, sleepDaysLogged: 2 }, "sleep").done).toBe(true);
    expect(step({ ...FRESH, moodEntries: 1 }, "mood").done).toBe(true);
    expect(step({ ...FRESH, assessmentStatus: "complete" }, "assessment").done).toBe(true);
    expect(step({ ...FRESH, assessmentStatus: "in_progress" }, "assessment").done).toBe(false);
  });

  it("the current step is the first unfinished one, in path order", () => {
    const j = journeyStateOf({ ...FRESH, waterDaysLogged: 1, habitTicks: 1, vitalisMet: true });
    expect(j.current).toBe(3);
    expect(j.steps[j.current]!.id).toBe("dish");
    expect(j.doneCount).toBe(3);
  });

  it("the path completes only when every signal is present", () => {
    const all: JourneySignals = {
      waterDaysLogged: 1,
      habitTicks: 1,
      vitalisMet: true,
      planExists: true,
      todayDish: "Fish Korma",
      sleepDaysLogged: 1,
      moodEntries: 1,
      assessmentStatus: "complete",
      goal: "lose",
    };
    const j = journeyStateOf(all);
    expect(j.complete).toBe(true);
    expect(j.current).toBe(-1);
    expect(j.doneCount).toBe(7);
    /* Vitalis is the one signal that can lapse: unmet, the path is
       not complete even with everything else done. */
    expect(journeyStateOf({ ...all, vitalisMet: false }).complete).toBe(false);
  });
});

describe("journeyStateOf — points are the catalogue's own", () => {
  it("priced steps carry the progression goal's points, by id", () => {
    expect(step(FRESH, "water").points).toBe(GOAL_BY_ID.get("daily-water")!.points);
    expect(step(FRESH, "habit").points).toBe(GOAL_BY_ID.get("first-bloom")!.points);
    expect(step(FRESH, "sleep").points).toBe(GOAL_BY_ID.get("daily-sleep")!.points);
    expect(step(FRESH, "mood").points).toBe(GOAL_BY_ID.get("daily-mood")!.points);
  });

  it("steps the catalogue pays nothing for show no points", () => {
    expect(step(FRESH, "vitalis").points).toBeNull();
    expect(step(FRESH, "dish").points).toBeNull();
    expect(step(FRESH, "assessment").points).toBeNull();
  });
});

describe("journeyStateOf — goal copy from the stated goal only", () => {
  it("names today's dish and ties it to the goal", () => {
    const dish = step({ ...FRESH, todayDish: "Fish Korma", goal: "lose" }, "dish");
    expect(dish.line).toContain("Fish Korma");
    expect(dish.line).toContain("lose weight");
  });

  it("without a dish or a goal the line stays generic — nothing invented", () => {
    const dish = step(FRESH, "dish");
    expect(dish.line).not.toContain("lose weight");
    expect(dish.line).not.toContain("maintain");
  });

  it("the assessment step frames the unlock, in the goal's words when known", () => {
    expect(step({ ...FRESH, goal: "lose" }, "assessment").line).toContain("lose weight");
    expect(step(FRESH, "assessment").line).toContain("composes your full plan around you");
    expect(step(FRESH, "assessment").actionLabel).toBe("Begin the assessment");
    expect(step({ ...FRESH, assessmentStatus: "in_progress" }, "assessment").actionLabel).toBe(
      "Continue the assessment",
    );
  });
});
