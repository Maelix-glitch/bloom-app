import { describe, expect, it } from "vitest";

import { displayNameForFoodId, foodDisplayName } from "./displayName";
import { findUsdaReference } from "./usdaReference";
import type { Food } from "./types";

describe("foodDisplayName — the friendly-name door", () => {
  it("renders a reference food under its friendly name, with its Hindi name", () => {
    const atta = findUsdaReference("usda-168893")!;
    expect(atta.name).toContain("Includes foods for USDA's Food Distribution Program");
    expect(foodDisplayName(atta)).toEqual({
      en: "Whole wheat flour (atta)",
      hindi: "गेहूं का आटा",
    });
  });

  it("keeps a user's own food under its own name, with no invented Hindi", () => {
    const own: Food = {
      id: "custom-1",
      name: "Amul Taaza Milk",
      per100g: { kcal: 62, proteinG: 3.2, carbsG: 4.8, fatG: 3 },
      servings: [],
      provenance: { kind: "user_entered", sourceId: "custom-1", label: "Your value" },
    };
    expect(foodDisplayName(own)).toEqual({ en: "Amul Taaza Milk", hindi: null });
  });
});

describe("displayNameForFoodId — the log entry's shape", () => {
  it("renders an old entry's raw USDA name under the friendly name", () => {
    const display = displayNameForFoodId(
      "usda-168893",
      "Wheat flour, whole-grain (Includes foods for USDA's Food Distribution Program)",
    );
    expect(display.en).toBe("Whole wheat flour (atta)");
    expect(display.hindi).toBe("गेहूं का आटा");
  });

  it("falls back to the stored name for non-reference entries", () => {
    expect(displayNameForFoodId(null, "Coach's biryani")).toEqual({
      en: "Coach's biryani",
      hindi: null,
    });
    expect(displayNameForFoodId("custom-9", "My oats")).toEqual({
      en: "My oats",
      hindi: null,
    });
  });
});
