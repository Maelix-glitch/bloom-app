/**
 * M-244 (research R-2511-01) — the plan's working diagnosis.
 *
 * The pins: the Problem is the goal (never a condition — Bloom
 * does not diagnose); the Etiology names the person's stated
 * conditions by their Assessment labels, unknown codes dropped;
 * the Signs count COMPLETE days by the M-244 rule (two main
 * meals) inside the 28-day learning window before the plan's
 * day; and every copy line is ≤ 140 chars with none of brief
 * v7's banned words.
 */
import { describe, expect, it } from "vitest";

import { EMPTY_ANSWERS, toHealthProfile, type AssessmentState } from "@/lib/assessment/state";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { diagnosisCopy } from "@/lib/reasons";

import { diagnosisFor, DIAGNOSIS_WINDOW_DAYS } from "./diagnosis";
import { generatePlan, perMealProteinAimG, type DailyPlan } from "./plan";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";
import type { LogEntry } from "./types";

function basePlan(): DailyPlan {
  const state: AssessmentState = {
    version: 1,
    status: "complete",
    step: "summary",
    answers: {
      ...EMPTY_ANSWERS,
      ageYears: 30,
      heightCm: 175,
      weightKg: 82,
      sex: "female",
      goal: "lose",
      activity: "light",
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
      unexplainedWeightChange: false,
    },
    consents: [],
    startedAt: null,
    completedAt: "2026-11-10T03:05:00.000Z",
    updatedAt: "2026-11-10T03:05:00.000Z",
  };
  const profile = toHealthProfile(state, "user-1");
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, "2026-11-20"),
    fallbackTargets: null,
    foods: USDA_REFERENCE_FOODS,
    dishes: DISH_LIBRARY,
    day: "2026-11-20",
  });
  if (!outcome.ok) throw new Error("fixture plan refused");
  return outcome.plan;
}

let seq = 0;
function entry(day: string, meal: LogEntry["meal"]): LogEntry {
  seq += 1;
  return {
    id: `dg-${seq}`,
    day,
    meal,
    foodId: null,
    snapshot: null,
    name: "logged",
    amount: { grams: 100 },
    nutrients: { kcal: 500, proteinG: 30, carbsG: 0, fatG: 0 },
    provenance: { kind: "user_entered", sourceId: "diagnosis-fixture", label: "Your value" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

describe("M-244 · diagnosisFor", () => {
  it("the problem is the goal profile; the aim matches the solver's derivation", () => {
    const plan = basePlan();
    const d = diagnosisFor({ plan, conditions: [], entries: [] });
    expect(d.goalProfile).toBe(plan.goalProfile);
    expect(d.perMealProteinAimG).toBe(perMealProteinAimG(plan.targets, plan.goalProfile));
    expect(d.windowDays).toBe(DIAGNOSIS_WINDOW_DAYS);
  });

  it("stated conditions arrive by their Assessment labels; unknown codes drop", () => {
    const d = diagnosisFor({
      plan: basePlan(),
      conditions: ["type_2_diabetes", "pcos", "not_a_condition"],
      entries: [],
    });
    expect(d.conditionLabels).toEqual(["type 2 diabetes (not on insulin)", "PCOS"]);
  });

  it("complete days count by the two-main-meals rule, inside the window only", () => {
    const plan = basePlan(); // plan day 2026-11-20; window starts 2026-10-23
    const entries: LogEntry[] = [
      entry("2026-11-19", "lunch"),
      entry("2026-11-19", "dinner"), // complete: two main meals
      entry("2026-11-18", "lunch"),
      entry("2026-11-18", "snack"), // NOT complete under M-244
      entry("2026-11-20", "breakfast"),
      entry("2026-11-20", "lunch"), // the plan's own day: excluded
      entry("2026-10-22", "lunch"),
      entry("2026-10-22", "dinner"), // before the window: excluded
    ];
    const d = diagnosisFor({ plan, conditions: [], entries });
    expect(d.completeDaysInWindow).toBe(1);
  });
});

describe("M-244 · diagnosisCopy", () => {
  it("every line is a ≤140-char sentence with no banned words", () => {
    const d = diagnosisFor({
      plan: basePlan(),
      conditions: ["type_2_diabetes", "hypertension"],
      entries: [entry("2026-11-19", "lunch"), entry("2026-11-19", "dinner")],
    });
    const copy = diagnosisCopy(d);
    for (const line of [copy.problem, copy.why, copy.signs]) {
      expect(line.length).toBeLessThanOrEqual(140);
      expect(line.endsWith(".")).toBe(true);
      expect(line.toLowerCase()).not.toContain("to go");
      expect(line.toLowerCase()).not.toContain("failed");
      expect(line).not.toContain(" left");
    }
    expect(copy.why).toContain("type 2 diabetes (not on insulin)");
    expect(copy.why).toContain("high blood pressure (hypertension)");
    expect(copy.signs).toContain("1 complete day");
  });

  it("no conditions and no complete days reads plainly, with nothing adapted claimed", () => {
    const copy = diagnosisCopy(diagnosisFor({ plan: basePlan(), conditions: [], entries: [] }));
    expect(copy.why).toBe("This plan follows the goal and answers in your assessment.");
    expect(copy.signs).toContain("No complete days logged yet");
  });
});
