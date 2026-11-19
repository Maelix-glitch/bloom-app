import { describe, expect, it } from "vitest";

import {
  EMPTY_BEHAVIOURAL,
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  EQUIPMENT_ITEMS,
  type BehaviouralProfile,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { DISH_LIBRARY, findDish } from "./data/dishLibrary";
import { dishNutrients, dishPreparationNeeds, parseDish, type Dish } from "./dishes";
import { DISH_EQUIPMENT_ORDER, deriveDishTags } from "./dishTags";
import { generatePlan, type DailyPlan } from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * §10.4 acceptance: the dish library's preparation tags.
 *
 * Every shipped dish's `equipment` / `noCook` pins are DERIVED from
 * its own method text by `deriveDishTags` and written by
 * scripts/nutrition-dish-tags.mjs (npm run seed:dish-tags; --check in
 * CI-shaped runs). These tests pin the three things that must hold:
 * coverage (every dish classified, pins == derivation, so a hand
 * edit or a silent method change fails here), spot truths (dishes
 * whose methods unambiguously bake / pressure-cook / fry / never
 * cook — and the counter-spots, dishes whose names suggest no-cook
 * but whose methods cook), and the behavioural consequence (the
 * kitchen gates now serve real dishes to a person who does not cook
 * or has no stove, where the unpinned library served none).
 */

const NOW = "2026-11-16T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;
/** 2026-11-16 is a Monday. */
const MONDAY = "2026-11-16";

const dish = (id: string): Dish => {
  const found = findDish(id);
  if (!found) throw new Error(`library dish missing: ${id}`);
  return found;
};

/* ------------------------------- coverage ------------------------------- */

describe("§10.4 · coverage", () => {
  it("classifies every dish in the library — pinned or counted method-less", () => {
    expect(DISH_LIBRARY.length).toBe(1202);
    const methodLess = DISH_LIBRARY.filter((d) => !Array.isArray(d.method) || d.method.length === 0);
    /* Today the count is zero: every shipped dish carries a method.
       A future method-less dish must stay UNTAGGED (the conservative
       default answers for it) — this count is where that shows up. */
    expect(methodLess.length).toBe(0);
    for (const d of methodLess) {
      expect(d.equipment, d.id).toBeUndefined();
      expect(d.noCook, d.id).toBeUndefined();
    }
    const pinned = DISH_LIBRARY.filter((d) => d.equipment !== undefined);
    expect(pinned.length + methodLess.length).toBe(DISH_LIBRARY.length);
  });

  it("every pin equals a fresh derivation from the dish's own method", () => {
    for (const d of DISH_LIBRARY) {
      const derived = deriveDishTags(d);
      expect(d.equipment, d.id).toEqual(derived.equipment);
      expect(d.noCook === true, d.id).toBe(derived.noCook);
    }
  });

  it("pins only ever name equipment that exists in the vocabulary", () => {
    expect(DISH_EQUIPMENT_ORDER).toEqual(EQUIPMENT_ITEMS.filter((i) => i !== "none"));
    for (const d of DISH_LIBRARY) {
      for (const item of d.equipment ?? []) {
        expect(EQUIPMENT_ITEMS, d.id).toContain(item);
        expect(item, d.id).not.toBe("none");
      }
    }
  });

  it("the tag census — a count moves only with a method edit or a rule change", () => {
    const count = (item: string) => DISH_LIBRARY.filter((d) => d.equipment?.includes(item as never)).length;
    expect(count("stove")).toBe(1114);
    expect(count("pressure_cooker")).toBe(68);
    expect(count("oven")).toBe(102);
    /* No shipped method uses a microwave. The honest count is zero,
       pinned so a future microwave method is a deliberate addition. */
    expect(count("microwave")).toBe(0);
    expect(count("mixer_grinder")).toBe(331);
    expect(count("fridge")).toBe(99);
    expect(DISH_LIBRARY.filter((d) => d.noCook === true).length).toBe(71);
  });

  it("an explicitly empty equipment pin survives the strict parser", () => {
    /* dish-fruit-chaat's method needs no equipment at all, so its pin
       is an empty list — a carried value, not an absence. The parser
       must keep it: dropping it would hand the dish the conservative
       stove default on every store/load round trip. */
    const roundTripped = parseDish(JSON.parse(JSON.stringify(dish("dish-fruit-chaat"))));
    expect(roundTripped?.equipment).toEqual([]);
    expect(roundTripped?.noCook).toBe(true);
  });

  it("the tags are metadata: a dish's computed nutrients do not move", () => {
    for (const id of ["dish-masoor-dal-tadka", "dish-fruit-raita", "dish-intl-baked-cod-tomatoes"]) {
      const tagged = dish(id);
      const stripped: Dish = { ...tagged };
      delete stripped.equipment;
      delete stripped.noCook;
      expect(dishNutrients(stripped)).toEqual(dishNutrients(tagged));
    }
  });
});

/* ------------------------------ spot truths ------------------------------ */

describe("§10.4 · spot truths, from the methods themselves", () => {
  it("a baked dish carries the oven", () => {
    /* "Heat the oven to 200°C … bake for 8 minutes" (and it wilts
       spinach in a dry pan first, so the stove is pinned too). */
    expect(dish("dish-intl-baked-cod-tomatoes").equipment).toContain("oven");
  });

  it("a pressure-cooked dal carries the pressure cooker (and its hob)", () => {
    const tags = dish("dish-masoor-dal-tadka");
    expect(tags.equipment).toContain("pressure_cooker");
    expect(tags.equipment).toContain("stove");
    expect(tags.noCook).toBeUndefined();
  });

  it("a raita, a salad and a shake whose methods never cook are noCook", () => {
    expect(dish("dish-fruit-raita").noCook).toBe(true);
    expect(dish("dish-us-yogurt-tuna-salad").noCook).toBe(true);
    expect(dish("dish-shake-sattu-banana").noCook).toBe(true);
    expect(dish("dish-shake-sattu-banana").equipment).toEqual(["mixer_grinder"]);
  });

  it("a fried dish is not noCook", () => {
    const tags = dish("dish-bhindi-fry");
    expect(tags.noCook).toBeUndefined();
    expect(tags.equipment).toContain("stove");
  });

  it("counter-spots: the method, not the name, decides", () => {
    /* Cucumber raita DRY-ROASTS its cumin in a pan and chills — so
       it is a stove + fridge dish, not a no-cook one. */
    const raita = dish("dish-cucumber-raita");
    expect(raita.noCook).toBeUndefined();
    expect(raita.equipment).toContain("stove");
    expect(raita.equipment).toContain("fridge");
    /* Sprouts chaat STEAMS its sprouts. */
    expect(dish("dish-sprouts-chaat").noCook).toBeUndefined();
    /* The tempeh shakes cook their tempeh before blending. */
    expect(dish("dish-shake-tempeh-banana-peanut").noCook).toBeUndefined();
    /* Shark-and-bake is fried: the noun "bake" is not an oven. */
    expect(dish("dish-tt-fish-bake-style").equipment).not.toContain("oven");
    expect(dish("dish-tt-fish-bake-style").equipment).toContain("stove");
  });

  it("a dish that freezes before it bakes carries fridge and oven", () => {
    const tags = dish("dish-pw2-mozzarella-sticks");
    expect(tags.equipment).toContain("fridge");
    expect(tags.equipment).toContain("oven");
  });
});

/* --------------------------- derivation edges ---------------------------- */

describe("§10.4 · the derivation's sharp edges", () => {
  const derive = (method: string[]) => deriveDishTags({ method });

  it("a method with no cooking step at all is noCook with no equipment", () => {
    expect(derive(["Chop everything finely.", "Toss with lemon and serve."])).toEqual({
      equipment: [],
      noCook: true,
    });
  });

  it("'chilli' never reads as 'chill'", () => {
    const tags = derive(["Blend the green chilli with the coriander and lemon."]);
    expect(tags.equipment).toEqual(["mixer_grinder"]);
    expect(tags.noCook).toBe(true);
  });

  it("storage advice is not a preparation need", () => {
    const tags = derive(["Whisk the yogurt with the spices.", "It keeps 3 days in the fridge."]);
    expect(tags.equipment).toEqual([]);
    expect(tags.noCook).toBe(true);
  });

  it("a doneness temperature is not an oven setting", () => {
    const tags = derive(["Grill the chicken until the centre reads 74°C."]);
    expect(tags.equipment).not.toContain("oven");
    expect(tags.equipment).toContain("stove");
  });

  it("hand pressure is not a pressure cooker", () => {
    const tags = derive(["Press the tofu under gentle pressure for 20 minutes, then slice."]);
    expect(tags.equipment).not.toContain("pressure_cooker");
  });

  it("a manual alternative the method offers is not a machine need", () => {
    expect(derive(["Blend or whisk the yogurt until frothy."]).equipment).toEqual([]);
    expect(derive(["Pound or grind the coriander seeds coarsely."]).equipment).toEqual([]);
  });

  it("a negated purée is not a mixer need — a real one is", () => {
    expect(derive(["Mash the yolks — the filling is chunky, never a purée."]).equipment).toEqual([]);
    expect(derive(["Blend the tomatoes to a smooth purée."]).equipment).toContain("mixer_grinder");
  });

  it("a cooked dish naming no equipment still pins the conservative stove", () => {
    const tags = derive(["Cook the mixture until it thickens and coats a spoon."]);
    expect(tags).toEqual({ equipment: ["stove"], noCook: false });
  });
});

/* ------------------------- behavioural consequence ------------------------ */

function profileWith(behavioural: Partial<BehaviouralProfile>): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "male",
    height: observation(quantity(178, "cm"), PROVENANCE),
    weight: observation(quantity(80, "kg"), PROVENANCE),
    goal: "maintain",
    activity: "moderate",
    rateKgPerWeek: 0,
    dietary: { ...EMPTY_DIETARY, pattern: "omnivore", mealsPerDay: 4 },
    behavioural: { ...EMPTY_BEHAVIOURAL, ...behavioural },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
    },
  };
}

function gen(behavioural: Partial<BehaviouralProfile>): DailyPlan {
  const profile = profileWith(behavioural);
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, MONDAY),
    fallbackTargets: null,
    foods: USDA_REFERENCE_FOODS,
    dishes: DISH_LIBRARY,
    day: MONDAY,
    now: NOW,
    id: "plan-dishtags",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

const KITCHEN_NOTE = "No dish in the library fits your kitchen answers yet";

describe("§10.4 · the kitchen gates, after the pass", () => {
  it("a person who does not cook is served real dishes — only no-cook ones", () => {
    const plan = gen({ cookingAbility: "none" });
    const served = plan.meals.flatMap((m) => m.dishes);
    /* Before the pass this pool was empty by construction: every
       dish answered the conservative default. Now the day's dishes
       are the library's genuine no-cook dishes. */
    expect(served.length).toBeGreaterThan(0);
    for (const s of served) {
      expect(dishPreparationNeeds(dish(s.dishId)).noCook, s.dishId).toBe(true);
    }
    expect(plan.notes.some((n) => n.startsWith(KITCHEN_NOTE))).toBe(false);
  });

  it("a kitchen with only a fridge is served — and only what a fridge covers", () => {
    /* Method 13 rewrite (2026-11-19, the dish-first repair): the
       fridge-only pool holds only TWO dishes that can carry a
       lunch or dinner (measured against the tagged library) —
       below the kitchen floor of three — so the relaxation ladder
       widens the equipment gate by one item and NAMES it. The
       contract now pinned is the method-13 one: no served dish
       needs more than one item beyond the fridge, and the
       widening is named in the plan's notes, never silent. (The
       same contract is pinned at plan level in
       planBehaviour.test.ts.) */
    const plan = gen({ equipment: ["fridge"] });
    const served = plan.meals.flatMap((m) => m.dishes);
    expect(served.length).toBeGreaterThan(0);
    for (const s of served) {
      const needs = dishPreparationNeeds(dish(s.dishId));
      const beyond = needs.equipment.filter((item) => item !== "fridge");
      expect(beyond.length, s.dishId).toBeLessThanOrEqual(1);
    }
    /* Brief v4 (Slice 1): the naming is the kitchen-relaxed reason
       (stage extra-equipment); the note is reasons.ts's detail. */
    expect(
      plan.reasons?.some(
        (r) => r.kind === "kitchen-relaxed" && r.stages.some((s) => s.stage === "extra-equipment"),
      ),
    ).toBe(true);
    expect(
      plan.notes.some(
        (n) => n.includes("leave almost no real dishes") && n.includes("one more piece of equipment"),
      ),
    ).toBe(true);
    expect(plan.notes.some((n) => n.startsWith(KITCHEN_NOTE))).toBe(false);
  });

  it("a kitchen with only a mixer is served only what a mixer covers", () => {
    /* Method 13 rewrite (2026-11-19): a mixer-only kitchen can
       blend shakes but holds no dish that can carry a lunch or
       dinner at all, so the ladder widens by one equipment item
       and names it — the same contract as the fridge test above:
       at most one item beyond the stated kitchen, named in the
       notes. */
    const plan = gen({ equipment: ["mixer_grinder"] });
    const served = plan.meals.flatMap((m) => m.dishes);
    expect(served.length).toBeGreaterThan(0);
    for (const s of served) {
      const needs = dishPreparationNeeds(dish(s.dishId));
      const beyond = needs.equipment.filter((item) => item !== "mixer_grinder");
      expect(beyond.length, s.dishId).toBeLessThanOrEqual(1);
    }
    /* Brief v4 (Slice 1): as the fridge test above — the naming is
       the kitchen-relaxed reason; the note is its derived detail. */
    expect(
      plan.reasons?.some(
        (r) => r.kind === "kitchen-relaxed" && r.stages.some((s) => s.stage === "extra-equipment"),
      ),
    ).toBe(true);
    expect(
      plan.notes.some(
        (n) => n.includes("leave almost no real dishes") && n.includes("one more piece of equipment"),
      ),
    ).toBe(true);
  });
});
