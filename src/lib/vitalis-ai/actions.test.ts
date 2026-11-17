/**
 * Vitalis action cards — the words a person confirms, and the
 * surgical assessment patch a confirmed change applies. The patch is
 * the risky half: it must move exactly one answer and nothing else.
 */

import { describe, expect, it } from "vitest";

import { EMPTY_ANSWERS, type AssessmentState } from "@/lib/assessment/state";
import { assessmentStateWithChange, describeProposal } from "./actions";
import type { VitalisRecordData } from "../../../supabase/functions/coach/vitalis-core";

const RECORD: VitalisRecordData = {
  v: 1,
  pattern: "eggetarian",
  allergies: [],
  dislikes: [],
  intolerances: [],
  safety: {
    pregnantOrBreastfeeding: null,
    eatingDisorderHistory: null,
    takesMedication: null,
    unexplainedWeightChange: null,
    conditions: [],
    symptoms: [],
  },
  targets: null,
  targetsBlocked: false,
  plan: null,
  todayTotals: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  dishes: [{ id: "dish-1", name: "Paneer Bhurji", kcal: 420, proteinG: 28 }],
  foods: [{ id: "food-1", name: "Greek Yogurt", kcalPer100g: 59, proteinPer100g: 10 }],
  loggedNames: [],
};

function state(): AssessmentState {
  return {
    version: 1,
    status: "complete",
    step: "summary",
    startedAt: "2026-11-01T00:00:00.000Z",
    completedAt: "2026-11-01T01:00:00.000Z",
    updatedAt: "2026-11-01T01:00:00.000Z",
    answers: {
      ...EMPTY_ANSWERS,
      goal: "recomp",
      dietaryPattern: "eggetarian",
      allergies: ["peanut"],
      dislikedFoods: ["okra"],
    },
    consents: [
      {
        purpose: "health_data_processing",
        state: "granted",
        policyVersion: "1",
        decidedAt: "2026-11-01T00:00:00.000Z",
      },
    ],
  };
}

describe("describeProposal", () => {
  it("names the dish and its real numbers for a log_dish card", () => {
    const words = describeProposal({ action: "log_dish", dishId: "dish-1", meal: "dinner" }, RECORD);
    expect(words.title).toBe("Log Paneer Bhurji");
    expect(words.detail).toContain("420 kcal");
    expect(words.detail).toContain("28 g protein");
    expect(words.confirmLabel).toBe("Log it");
  });

  it("describes a food log with its grams", () => {
    const words = describeProposal(
      { action: "log_food", foodId: "food-1", grams: 150, meal: "snack" },
      RECORD,
    );
    expect(words.title).toBe("Log Greek Yogurt");
    expect(words.detail).toContain("150 g");
  });

  it("explains an assessment change in plain words before it can be confirmed", () => {
    const words = describeProposal(
      { action: "propose_assessment_change", field: "goal", value: "maintain" },
      RECORD,
    );
    expect(words.title).toBe("Change your assessment");
    expect(words.detail).toContain("Maintain my weight");
    expect(words.confirmLabel).toBe("Apply change");
  });

  it("never promises a silent write — every card says it applies on confirm", () => {
    const words = describeProposal({ action: "compose_plan" }, RECORD);
    expect(words.detail).toContain("only when you confirm");
  });

  it("names both dishes and the replacement's real numbers for a swap card", () => {
    const rec = {
      ...RECORD,
      dishes: [
        { id: "dish-1", name: "Paneer Bhurji", kcal: 420, proteinG: 28 },
        { id: "dish-2", name: "Quinoa Buddha Bowl", kcal: 510, proteinG: 19 },
      ],
      plan: {
        day: "2026-11-17",
        kcal: 3288,
        proteinG: 220,
        meals: [
          {
            meal: "dinner",
            kcal: 1100,
            proteinG: 73,
            items: ["Paneer Bhurji (dish)"],
            dishIds: ["dish-1"],
          },
        ],
      },
    };
    const words = describeProposal(
      { action: "swap_dish", meal: "dinner", fromDishId: "dish-1", toDishId: "dish-2" },
      rec,
    );
    expect(words.title).toBe("Swap Paneer Bhurji for Quinoa Buddha Bowl");
    expect(words.detail).toContain("510 kcal");
    expect(words.detail).toContain("19 g protein");
    expect(words.detail).toContain("only when you confirm");
    expect(words.confirmLabel).toBe("Swap dish");
  });
});

describe("assessmentStateWithChange", () => {
  it("moves exactly one answer and preserves everything else", () => {
    const before = state();
    const next = assessmentStateWithChange(
      before,
      { action: "propose_assessment_change", field: "goal", value: "maintain" },
      "2026-11-17T00:00:00.000Z",
    );
    expect(next).not.toBeNull();
    expect(next!.answers.goal).toBe("maintain");
    expect(next!.answers.dietaryPattern).toBe("eggetarian");
    expect(next!.status).toBe("complete");
    expect(next!.step).toBe("summary");
    expect(next!.consents).toEqual(before.consents);
    expect(next!.completedAt).toBe(before.completedAt);
    expect(next!.updatedAt).toBe("2026-11-17T00:00:00.000Z");
  });

  it("appends an allergy without duplicating it", () => {
    const before = state();
    const added = assessmentStateWithChange(
      before,
      { action: "propose_assessment_change", field: "addAllergy", value: "sesame" },
      "2026-11-17T00:00:00.000Z",
    );
    expect(added!.answers.allergies).toEqual(["peanut", "sesame"]);
    const again = assessmentStateWithChange(
      added!,
      { action: "propose_assessment_change", field: "addAllergy", value: "sesame" },
      "2026-11-17T00:00:00.000Z",
    );
    expect(again!.answers.allergies).toEqual(["peanut", "sesame"]);
  });

  it("accepts a null food budget (no preference) and a meals-per-day change", () => {
    const before = state();
    const budget = assessmentStateWithChange(
      before,
      { action: "propose_assessment_change", field: "foodBudget", value: null },
      "2026-11-17T00:00:00.000Z",
    );
    expect(budget!.answers.foodBudget).toBeNull();
    const meals = assessmentStateWithChange(
      before,
      { action: "propose_assessment_change", field: "mealsPerDay", value: 4 },
      "2026-11-17T00:00:00.000Z",
    );
    expect(meals!.answers.mealsPerDay).toBe(4);
  });

  it("refuses values the allowlist would never have produced", () => {
    const before = state();
    expect(
      assessmentStateWithChange(
        before,
        { action: "propose_assessment_change", field: "goal", value: "shred" as never },
        "2026-11-17T00:00:00.000Z",
      ),
    ).toBeNull();
    expect(
      assessmentStateWithChange(
        before,
        { action: "propose_assessment_change", field: "mealsPerDay", value: 9 },
        "2026-11-17T00:00:00.000Z",
      ),
    ).toBeNull();
    expect(
      assessmentStateWithChange(
        before,
        { action: "propose_assessment_change", field: "addAllergy", value: "   " },
        "2026-11-17T00:00:00.000Z",
      ),
    ).toBeNull();
  });
});
