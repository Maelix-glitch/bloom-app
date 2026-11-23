/**
 * Module 06 acceptance (Nutrition Intelligence spec §4.4, §12.1 #4):
 * the preparation-basis pass.
 *
 * The rule under test: a raw/dry-basis food record — dry pulses, dry
 * grains, flours, whose per-100 g values describe an ingredient cooked
 * from dry — is never presented as a portion to eat. Not as a composed
 * suggestion, not as a top-up, not as a swap candidate. It remains
 * searchable, loggable, and a dish ingredient (a recipe's lines are
 * quantities a method cooks). Yield-based cooked conversion is NOT
 * pinned here because it does not exist yet: its factors wait on
 * source verification (spec §4.2), and an unsourced factor is not
 * shipped.
 */
import { describe, expect, it } from "vitest";

import {
  DIETARY_PATTERNS,
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type DietaryPattern,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { DISH_LIBRARY, findDish } from "./data/dishLibrary";
import { createEntryFromFood } from "./entries";
import { parseFood, parseFoodPreparation } from "./parse";
import { generatePlan, type DailyPlan } from "./plan";
import { PREPARATION_STATES, isRawBasisFood } from "./preparation";
import { swapsFor } from "./swaps";
import type { Food } from "./types";
import { USDA_REFERENCE_FOODS, findUsdaReference } from "./usdaReference";

const NOW = "2026-11-15T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;
const BY_ID = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f]));

/** The pinned raw-basis set: every dry cereal/flour record and every
 *  dry pulse record in the shipped set. If the data changes, this
 *  fails loudly and a human re-judges the new food's basis — the set
 *  is never silently re-derived from names. */
const RAW_BASIS_IDS = [
  // dry cereals, millets, flours, semolina
  "usda-2512381",
  "usda-2512380",
  "usda-2710825",
  "usda-2346396",
  "usda-2346397",
  "usda-2512379",
  "usda-2710842",
  "usda-2512378",
  "usda-168874",
  "usda-170284",
  "usda-168893",
  "usda-168936",
  "usda-168867",
  "usda-168886",
  "usda-174288",
  "usda-169714",
  "usda-168933",
  /* PF-1 (2026-11-19): vital wheat gluten — a dry flour-family
     powder, cooked from dry like the flours above. */
  "usda-168147",
  // dry pulses & legumes (mature seeds, dry/raw form)
  "usda-2644283",
  "usda-174284",
  "usda-2644282",
  "usda-173734",
  "usda-175193",
  "usda-173745",
  "usda-175199",
  "usda-174270",
  "usda-172436",
  "usda-174256",
  "usda-174259",
  "usda-170419",
  "usda-173758",
  /* PF-1 (2026-11-19): the meat extender — dry textured soy protein,
     soaked and cooked from dry like the dry pulses above. */
  "usda-174268",
];

describe("preparation · the shipped reference set", () => {
  it("every reference food carries a pinned preparation state (spec §12.1 #4)", () => {
    /* 158 since PF-1 (2026-11-19) added the dedicated protein foods. */
    expect(USDA_REFERENCE_FOODS.length).toBe(158);
    for (const food of USDA_REFERENCE_FOODS) {
      expect(food.preparation, food.id).toBeDefined();
      expect(PREPARATION_STATES).toContain(food.preparation!.state);
    }
  });

  it("the raw-basis set is exactly the pinned dry staples", () => {
    const raw = USDA_REFERENCE_FOODS.filter(isRawBasisFood)
      .map((f) => f.id)
      .sort();
    expect(raw).toEqual([...RAW_BASIS_IDS].sort());
  });

  it("the four defect records are raw-basis, by name", () => {
    /* The records the owner’s screenshot and the spec (§4.1) name:
       grams of these were presented as portions to eat. */
    for (const name of [
      "Lentils, dry",
      "Mung beans, mature seeds, raw",
      "Peas, green, raw",
      "Beans, black, mature seeds, raw",
    ]) {
      const food = USDA_REFERENCE_FOODS.find((f) => f.name === name)!;
      expect(food, name).toBeDefined();
      expect(isRawBasisFood(food), name).toBe(true);
    }
  });

  it("the top-up set carries no raw-basis staples (spec §4.4 rule 4)", () => {
    /* Top-ups draw on dairy and egg protein foods and on milk/curd and
       nuts/seeds for energy. Their records say "raw" where USDA means
       fresh — portioned as bought, so the basis rule does not bite
       and the top-up layer is unaffected by this pass. */
    for (const id of ["usda-171287", "usda-2346393", "usda-172430", "usda-322892", "usda-330137"]) {
      expect(isRawBasisFood(BY_ID.get(id)!), id).toBe(false);
    }
  });

  it("the cooked soy forms keep their P4 standing: prepared, not dry", () => {
    expect(BY_ID.get("usda-172448")!.preparation!.state).toBe("cooked_unspecified"); // tofu
    expect(BY_ID.get("usda-174272")!.preparation!.state).toBe("cooked_unspecified"); // tempeh
    expect(BY_ID.get("usda-168410")!.preparation!.state).toBe("as_purchased"); // edamame
    for (const id of ["usda-172448", "usda-174272", "usda-168410"]) {
      expect(isRawBasisFood(BY_ID.get(id)!), id).toBe(false);
    }
    /* …while dry soybeans, a dry seed, are raw-basis. */
    expect(isRawBasisFood(BY_ID.get("usda-174270")!)).toBe(true);
  });
});

describe("preparation · isRawBasisFood semantics", () => {
  const food = (partial: Partial<Food>): Food => ({
    id: "x",
    name: "X",
    per100g: { kcal: 100, proteinG: 10, carbsG: 10, fatG: 2 },
    servings: [],
    provenance: { kind: "usda", sourceId: "0", label: "USDA FoodData Central" },
    ...partial,
  });
  const cls = (group: Food["classification"] extends { group: infer G } | undefined ? G : never) => ({
    group,
    containsEgg: false,
    containsDairy: false,
    isFlesh: false,
    isFish: false,
  });

  it("a pinned state decides, whatever the group", () => {
    expect(
      isRawBasisFood(food({ classification: cls("pulses_legumes"), preparation: { state: "as_purchased" } })),
    ).toBe(false);
    expect(
      isRawBasisFood(food({ classification: cls("vegetables"), preparation: { state: "raw" } })),
    ).toBe(true);
    expect(
      isRawBasisFood(food({ classification: cls("pulses_legumes"), preparation: { state: "boiled" } })),
    ).toBe(false);
  });

  it("an unclaimed basis fails safe in the staple groups only", () => {
    /* Spec §4.4 rule 1: state unclaimed for a pulses/grains food is
       treated as raw-basis — in those groups the dry form is the
       default a record describes. Anywhere else, absence is not
       suspicion: a user's own food is served on its own values. */
    expect(isRawBasisFood(food({ classification: cls("pulses_legumes") }))).toBe(true);
    expect(isRawBasisFood(food({ classification: cls("cereals_grains") }))).toBe(true);
    expect(isRawBasisFood(food({ classification: cls("vegetables") }))).toBe(false);
    expect(isRawBasisFood(food({}))).toBe(false);
  });
});

describe("preparation · parser", () => {
  it("parses a pinned basis; a malformed one drops whole, the food survives unclaimed", () => {
    expect(parseFoodPreparation({ state: "raw" })).toEqual({ state: "raw" });
    expect(parseFoodPreparation({ state: "microwaved" })).toBeNull();
    expect(parseFoodPreparation({ state: "raw", yieldToCookedPer100g: 280 })).toEqual({
      state: "raw",
      yieldToCookedPer100g: 280,
    });
    /* A yield outside its sane range is a half-parsed basis — dropped
       whole rather than carried in part. */
    expect(parseFoodPreparation({ state: "raw", yieldToCookedPer100g: 0 })).toBeNull();
    const parsed = parseFood({
      id: "usda-1",
      name: "Some food",
      per100g: { kcal: 100, proteinG: 10, carbsG: 10, fatG: 2 },
      servings: [],
      provenance: { kind: "usda", sourceId: "1", label: "USDA FoodData Central" },
      preparation: { state: "microwaved" },
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.preparation).toBeUndefined();
  });
});

/* ------------------------- generated plans (property) ---------------------- */

function fullProfile(pattern: DietaryPattern | null): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "male",
    height: observation(quantity(178, "cm"), PROVENANCE),
    weight: observation(quantity(80, "kg"), PROVENANCE),
    goal: "maintain",
    activity: "moderate",
    rateKgPerWeek: 0,
    dietary: { ...EMPTY_DIETARY, pattern, mealsPerDay: 3 },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
    },
  };
}

function gen(profile: HealthProfile, dishes?: readonly unknown[]): DailyPlan {
  const day = "2026-11-15";
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, day),
    fallbackTargets: null,
    foods: USDA_REFERENCE_FOODS,
    ...(dishes ? { dishes: dishes as never } : {}),
    day,
    now: NOW,
    id: "plan-prep",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

describe("preparation · no generated plan serves a raw-basis portion", () => {
  const patterns: (DietaryPattern | null)[] = [null, ...DIETARY_PATTERNS];
  for (const pattern of patterns) {
    it(`pattern ${pattern ?? "unanswered"} — layered fallback and dish top-ups alike`, () => {
      for (const dishes of [undefined, DISH_LIBRARY] as const) {
        const plan = gen(fullProfile(pattern), dishes);
        for (const meal of plan.meals) {
          for (const s of meal.suggestions) {
            const food = BY_ID.get(s.foodId);
            expect(food, s.foodId).toBeDefined();
            expect(isRawBasisFood(food!), `${pattern}: ${food!.name}`).toBe(false);
          }
        }
      }
    });
  }

  it("raw-basis foods remain dish ingredients — the recipe path is untouched", () => {
    /* The basis gate binds portions, not recipes: a served dish may
       still be built from dry lentils and raw rice, because its
       method cooks them and its panel is the cooked dish's. */
    const plan = gen(fullProfile("eggetarian"), DISH_LIBRARY);
    const servedDishes = plan.meals.flatMap((m) => m.dishes);
    expect(servedDishes.length).toBeGreaterThan(0);
    const lineFoodIds = servedDishes.flatMap((d) => findDish(d.dishId)!.lines.map((l) => l.foodId));
    expect(lineFoodIds.some((id) => RAW_BASIS_IDS.includes(id))).toBe(true);
  });
});

describe("preparation · the swap surface", () => {
  const logOf = (food: Food, grams: number) => {
    const entry = createEntryFromFood({
      food,
      amount: { grams },
      meal: "lunch",
      day: "2026-11-15",
      source: "search",
      now: NOW,
    });
    if (!entry) throw new Error("entry refused");
    return entry;
  };

  it("never offers a raw-basis candidate — dry soybeans for green peas", () => {
    /* On protein density per kcal, dry soybeans (8.2 g/100 kcal) beat
       green peas (6.7) — before this pass they were the swap. The
       pool here is the raw reference set on purpose: the basis
       judgement is the surface's own, not the caller's. */
    const peas = findUsdaReference("usda-170419")!;
    const entry = logOf(peas, 150);
    const options = swapsFor(entry, peas, USDA_REFERENCE_FOODS, "protein");
    expect(options.length).toBeGreaterThan(0);
    expect(options.some((o) => o.food.id === "usda-174270")).toBe(false);
    for (const option of options) expect(isRawBasisFood(option.food)).toBe(false);
  });

  it("a cereals entry has no swap: every other cereal record is raw-basis", () => {
    const rice = findUsdaReference("usda-2512381")!;
    const entry = logOf(rice, 100);
    expect(swapsFor(entry, rice, USDA_REFERENCE_FOODS, "protein")).toEqual([]);
  });
});
