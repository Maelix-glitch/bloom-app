import { describe, expect, it } from "vitest";

import {
  bmiBandOf,
  bmiOf,
  bodyTargetsOf,
  calorieFloor,
  hydrationStatus,
  isBodyReady,
  type BodyProfile,
} from "./body";

const profile: BodyProfile = {
  units: "metric",
  heightCm: 175,
  weightKg: 82,
  targetWeightKg: 70,
  age: 30,
  sex: "female",
  activity: "light",
  goal: "lose",
  rateKgPerWeek: 0.5,
  updatedAt: "",
};

describe("body · BMI", () => {
  it("computes BMI and its band at the Indian-consensus boundaries", () => {
    expect(bmiOf(175, 70)).toBe(22.9);
    expect(bmiBandOf(18.4)).toBe("underweight");
    expect(bmiBandOf(18.5)).toBe("healthy");
    expect(bmiBandOf(22.9)).toBe("healthy");
    /* Misra et al. 2009 / ESI 2022 for Asian Indians (M-219, F-08):
       overweight from 23, obese from 25 — not the WHO 25/30. */
    expect(bmiBandOf(23)).toBe("overweight");
    expect(bmiBandOf(24.9)).toBe("overweight");
    expect(bmiBandOf(25)).toBe("obese");
    expect(bmiBandOf(30)).toBe("obese");
  });

  it("needs a height, a weight and an age before it offers targets", () => {
    expect(isBodyReady({ ...profile, heightCm: null })).toBe(false);
    expect(bodyTargetsOf({ ...profile, age: null }, "2026-10-30")).toBeNull();
  });
});

describe("body · energy and water", () => {
  it("uses Mifflin–St Jeor, activity and the goal rate", () => {
    const targets = bodyTargetsOf(profile, "2026-10-30")!;
    // 10*82 + 6.25*175 - 5*30 - 161 = 1602.75
    expect(targets.bmr).toBe(1603);
    expect(targets.tdee).toBe(Math.round(1603 * 1.375));
    expect(targets.calories).toBe(targets.tdee - 550);
    /* M-219 (F-05): at BMI 26.8 the protein band multiplies the
       healthy-ceiling reference weight (22.9 × 1.75² = 70.1 kg),
       not the 82 kg scale weight. */
    expect(targets.proteinG).toBe(Math.round(70.1 * 1.8));
    /* M-219 (F-07): drinking-water share of EFSA's total-water AI —
       female base 1,500 ml + 150 light-activity allowance. */
    expect(targets.waterMl).toBe(1650);
  });

  it("never recommends eating below the safety floor", () => {
    const aggressive = bodyTargetsOf(
      { ...profile, weightKg: 60, rateKgPerWeek: 1 },
      "2026-10-30",
    )!;
    expect(aggressive.floorApplied).toBe(true);
    expect(aggressive.calories).toBe(calorieFloor("female"));
  });

  it("projects a goal date only from a real goal weight", () => {
    const targets = bodyTargetsOf(profile, "2026-10-30")!;
    expect(targets.weeksToGoal).toBe(24); // 12 kg at 0.5 kg/week
    expect(targets.goalDate).toBe("2027-04-16");
    expect(bodyTargetsOf({ ...profile, targetWeightKg: null }, "2026-10-30")!.weeksToGoal).toBeNull();
  });

  it("gives recomposition maintenance energy at the highest protein band", () => {
    const recomp = bodyTargetsOf({ ...profile, goal: "recomp" }, "2026-10-30")!;
    const maintain = bodyTargetsOf({ ...profile, goal: "maintain" }, "2026-10-30")!;
    /* Same energy as maintenance — no deficit, no surplus, floor intact. */
    expect(recomp.calories).toBe(recomp.tdee);
    expect(recomp.calories).toBe(maintain.calories);
    expect(recomp.calorieDelta).toBe(0);
    /* 2.2 g/kg on the reference weight — above lose (1.8), gain (1.6)
       and maintain (1.4) on the same basis. */
    expect(recomp.proteinG).toBe(Math.round(70.1 * 2.2));
    expect(recomp.proteinG).toBeGreaterThan(bodyTargetsOf(profile, "2026-10-30")!.proteinG);
    expect(recomp.proteinG).toBeGreaterThan(maintain.proteinG);
    /* No scale timeline, even with an explicit goal weight on file; with
       none, the target weight is the current weight, as for maintain. */
    expect(recomp.targetWeightKg).toBe(70);
    expect(recomp.weeksToGoal).toBeNull();
    expect(recomp.goalDate).toBeNull();
    expect(bodyTargetsOf({ ...profile, goal: "recomp", targetWeightKg: null }, "2026-10-30")!.targetWeightKg).toBe(82);
  });

  it("turns water left into glasses, and closes at target", () => {
    const status = hydrationStatus(2700, 1200);
    expect(status.remaining).toBe(1500);
    expect(status.glasses).toBe(6);
    expect(hydrationStatus(2700, 3000).met).toBe(true);
  });
});
