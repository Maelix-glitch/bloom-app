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
  it("computes BMI and its band at the WHO boundaries", () => {
    expect(bmiOf(175, 70)).toBe(22.9);
    expect(bmiBandOf(18.4)).toBe("underweight");
    expect(bmiBandOf(18.5)).toBe("healthy");
    expect(bmiBandOf(24.9)).toBe("healthy");
    expect(bmiBandOf(25)).toBe("overweight");
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
    expect(targets.proteinG).toBe(Math.round(82 * 1.8));
    expect(targets.waterMl).toBe(Math.round((82 * 35 + 250) / 50) * 50);
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

  it("turns water left into glasses, and closes at target", () => {
    const status = hydrationStatus(2700, 1200);
    expect(status.remaining).toBe(1500);
    expect(status.glasses).toBe(6);
    expect(hydrationStatus(2700, 3000).met).toBe(true);
  });
});
