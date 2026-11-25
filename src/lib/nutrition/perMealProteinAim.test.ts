/**
 * M-244 (research R-2511-04) — the per-meal protein aim.
 *
 * ISSN 2017: 0.25 g/kg per meal. Bloom reads the weight on the
 * engine's OWN protein basis (body.ts: above BMI 23 the basis is
 * the healthy-ceiling weight, 22.9 × height²), recovered from the
 * resolved targets as proteinG ÷ goal band. These tests pin the
 * derivation, including against bodyTargetsOf itself, so a future
 * change to either side fails loudly instead of drifting.
 */
import { describe, expect, it } from "vitest";
import { bodyTargetsOf, type BodyProfile } from "../health/body";
import { perMealProteinAimG, PER_MEAL_PROTEIN_AIM_G_PER_KG } from "./plan";

function bodyProfile(over: Partial<BodyProfile>): BodyProfile {
  return {
    units: "metric",
    heightCm: 165,
    weightKg: 95,
    targetWeightKg: 60,
    age: 19,
    sex: "male",
    activity: "sedentary",
    goal: "lose",
    rateKgPerWeek: 0.75,
    updatedAt: "2026-11-25T00:00:00.000Z",
    ...over,
  };
}

describe("M-244 · per-meal protein aim (0.25 g/kg on the engine's basis)", () => {
  it("the constant is the ISSN per-meal figure", () => {
    expect(PER_MEAL_PROTEIN_AIM_G_PER_KG).toBe(0.25);
  });

  it("owner-shaped targets: 112 g on the lose band reads a 62.2 kg basis, aim 15.6 g", () => {
    /* 112 / 1.8 = 62.2 kg (the healthy-ceiling weight for 165 cm);
       62.2 × 0.25 = 15.6 g per main meal. */
    expect(perMealProteinAimG({ kcal: 1350, proteinG: 112 }, "lose")).toBe(15.6);
  });

  it("each goal band recovers its own basis", () => {
    expect(perMealProteinAimG({ kcal: 2000, proteinG: 140 }, "maintain")).toBe(25);
    expect(perMealProteinAimG({ kcal: 2600, proteinG: 128 }, "gain")).toBe(20);
    expect(perMealProteinAimG({ kcal: 2200, proteinG: 176 }, "recomp")).toBe(20);
  });

  it("agrees with bodyTargetsOf for an overweight profile (reference-weight basis)", () => {
    const targets = bodyTargetsOf(bodyProfile({}), "2026-11-25");
    expect(targets).not.toBeNull();
    /* body.ts basis for 165 cm: 22.9 × 1.65² = 62.3 kg (rounded to
       62.3 in the source); the aim must be that basis × 0.25,
       within the rounding body.ts applies to proteinG first. */
    const aim = perMealProteinAimG(
      { kcal: targets!.calories, proteinG: targets!.proteinG },
      "lose",
    );
    expect(aim).toBeGreaterThanOrEqual(15.4);
    expect(aim).toBeLessThanOrEqual(15.7);
  });

  it("agrees with bodyTargetsOf for a healthy-weight profile (scale-weight basis)", () => {
    const targets = bodyTargetsOf(
      bodyProfile({ weightKg: 60, targetWeightKg: 60, goal: "maintain" }),
      "2026-11-25",
    );
    expect(targets).not.toBeNull();
    /* 60 kg × 1.4 = 84 g protein; basis 60 kg; aim 15 g. */
    expect(targets!.proteinG).toBe(84);
    expect(
      perMealProteinAimG({ kcal: targets!.calories, proteinG: targets!.proteinG }, "maintain"),
    ).toBe(15);
  });
});
