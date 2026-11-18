import { describe, expect, it } from "vitest";

import {
  EMPTY_BEHAVIOURAL,
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type BehaviouralProfile,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { DISH_LIBRARY, findDish } from "./data/dishLibrary";
import { dishPreparationNeeds, parseDish, type Dish } from "./dishes";
import {
  PLAN_METHOD_VERSION,
  fingerprintOfInputs,
  generatePlan,
  parsePlanValue,
  planInputsSnapshotOf,
  planStaleness,
  planValueOf,
  type DailyPlan,
} from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food, FoodClassification } from "./types";

/**
 * P10 acceptance: the behavioural profile (spec §10) shapes composition.
 *
 * The kitchen answers GATE the dish pool — equipment and no-cook through
 * the one preparation-needs function, a prep-time cap on weekday plans
 * that relaxes in stated stages and names the relaxation — basic cooking
 * experience reprices long methods in the pick cost, the hunger pattern
 * tilts the meal split (pinned in plan.test.ts), a sweet craving steers
 * the snack's flexible item, and low confidence leans the picks toward
 * the familiar. Targets never move under any of it, and with no
 * behavioural answers the composer is the P9 composer's.
 *
 * A note on levels: the pick-cost terms (basic complexity, confidence)
 * are bounded ranking terms like the cuisine bonus — they re-order
 * near-equals, they cannot crown a bad fit. Basic cooking is pinned at
 * week level, where its effect is large and stable (the same level the
 * cuisine preference is pinned at). Confidence's terms are smaller than
 * the pick band by design, so its week-level counts do not move on the
 * full library; it is pinned where its guarantee is exact — the record
 * (snapshot + staleness naming) and the unmoved targets.
 */

const NOW = "2026-11-16T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;
/** 2026-11-16 is a Monday; 2026-11-21 is a Saturday. */
const MONDAY = "2026-11-16";
const SATURDAY = "2026-11-21";

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

function gen(
  profile: HealthProfile,
  opts: {
    day?: string;
    dishes?: readonly Dish[];
    foods?: readonly Food[];
    storedPlan?: DailyPlan | null;
    fallbackTargets?: { kcal: number; proteinG: number };
  } = {},
): DailyPlan {
  const day = opts.day ?? MONDAY;
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, day),
    fallbackTargets: opts.fallbackTargets ?? null,
    foods: opts.foods ?? USDA_REFERENCE_FOODS,
    dishes: opts.dishes ?? DISH_LIBRARY,
    ...(opts.storedPlan !== undefined ? { storedPlan: opts.storedPlan } : {}),
    day,
    now: NOW,
    id: "plan-p10",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

const servedDishes = (plan: DailyPlan) => plan.meals.flatMap((m) => m.dishes);

/** A real library main dish, cloned with preparation overrides — the
 *  clone keeps the dish's lines and computed nutrients, so the pool's
 *  own gates judge it exactly as they judge the original. */
function cloneDish(over: Partial<Dish> & { id: string }): Dish {
  /* Any main dish: the fixture profile is omnivore, for which the
     pool applies no pattern restriction. */
  const base = DISH_LIBRARY.find((d) => d.category === "main")!;
  return { ...base, ...over };
}

/* ------------------------------ the record ------------------------------ */

describe("P10 · method and record", () => {
  it("plans carry method version 10", () => {
    expect(PLAN_METHOD_VERSION).toBe(10);
    expect(gen(profileWith({})).methodVersion).toBe(10);
  });

  it("the snapshot records the behavioural answers, outside the fingerprint", () => {
    const profile = profileWith({
      prepTimeMaxMinutes: 20,
      equipment: ["stove", "fridge"],
      cookingAbility: "basic",
      eatingSetting: "hostel",
      hungerPattern: "evenings",
      confidence: 2,
    });
    const safety = classifySafety(toSafetyInput(profile));
    const snapshot = planInputsSnapshotOf(profile, safety, { kcal: 2600, proteinG: 150 });
    expect(snapshot.prepTimeMaxMinutes).toBe(20);
    /* Equipment is stored sorted, so the comparison is order-free. */
    expect(snapshot.kitchenEquipment).toBe("fridge,stove");
    expect(snapshot.cookingAbility).toBe("basic");
    expect(snapshot.eatingSetting).toBe("hostel");
    expect(snapshot.hungerPattern).toBe("evenings");
    expect(snapshot.confidence).toBe(2);
    /* Selection-shaping only: a snapshot differing ONLY in the
       behavioural fields fingerprints identically (the cuisine rule). */
    const other = planInputsSnapshotOf(profileWith({ confidence: 5 }), safety, {
      kcal: 2600,
      proteinG: 150,
    });
    expect(fingerprintOfInputs(snapshot)).toBe(fingerprintOfInputs(other));
  });

  it("a changed behavioural answer names itself in the staleness check", () => {
    const plan = gen(profileWith({ confidence: 5 }));
    const safety = classifySafety(toSafetyInput(profileWith({ confidence: 2 })));
    const current = planInputsSnapshotOf(profileWith({ confidence: 2 }), safety, plan.targets);
    expect(planStaleness(plan, current).changed).toEqual(["your confidence"]);
  });

  it("the snapshot fields survive a store/load round trip, and tampering refuses the plan", () => {
    const plan = gen(
      profileWith({ prepTimeMaxMinutes: 35, cookingAbility: "confident", hungerPattern: "nights" }),
    );
    const raw = JSON.parse(JSON.stringify(planValueOf(plan))) as {
      plan: { inputs: Record<string, unknown> };
    };
    const parsed = parsePlanValue(raw);
    expect(parsed?.inputs.prepTimeMaxMinutes).toBe(35);
    expect(parsed?.inputs.cookingAbility).toBe("confident");
    expect(parsed?.inputs.hungerPattern).toBe("nights");
    /* A value that does not exist in the vocabulary is a tamper. */
    raw.plan.inputs["confidence"] = "high";
    expect(parsePlanValue(raw)).toBeNull();
    raw.plan.inputs["confidence"] = 3;
    raw.plan.inputs["prepTimeMaxMinutes"] = 25;
    expect(parsePlanValue(raw)).toBeNull();
  });

  it("no behavioural answer can move the targets", () => {
    const base = gen(profileWith({}));
    const shaped = gen(
      profileWith({
        cookingAbility: "basic",
        equipment: ["stove"],
        prepTimeMaxMinutes: 10,
        eatingSetting: "hostel",
        hungerPattern: "evenings",
        cravingKinds: ["sweet"],
        confidence: 1,
      }),
    );
    expect(shaped.targets).toEqual(base.targets);
  });
});

/* ----------------------------- kitchen gates ----------------------------- */

describe("P10 · kitchen gates", () => {
  it("dishPreparationNeeds answers conservatively until a dish is pinned (§10.4)", () => {
    /* Reason for the fixture change (2026-11-18, §10.4 data pass):
       this test used DISH_LIBRARY[0] as its unpinned dish, but the
       pass pinned every shipped dish, so the library no longer
       contains an unpinned one. The conservative default is now
       exercised on a clone with the pins stripped — the property
       under test (what an UNTAGGED dish, e.g. a stored user dish,
       is assumed to need) is unchanged. */
    const unpinned = cloneDish({ id: "test-unpinned" });
    delete unpinned.equipment;
    delete unpinned.noCook;
    expect(unpinned.equipment).toBeUndefined();
    expect(dishPreparationNeeds(unpinned)).toEqual({
      equipment: ["stove"],
      noCook: false,
      methodSteps: unpinned.method.length,
    });
    const pinned = cloneDish({ id: "test-pinned", equipment: ["oven"], noCook: true });
    expect(dishPreparationNeeds(pinned)).toEqual({
      equipment: ["oven"],
      noCook: true,
      methodSteps: pinned.method.length,
    });
  });

  it("parseDish preserves pinned preparation tags and drops values that do not exist", () => {
    const raw = {
      id: "dish-x",
      name: { en: "X", hindi: "X" },
      category: "main",
      servings: 2,
      lines: [{ foodId: "usda-1", grams: 100 }],
      method: ["Cook."],
      timeMinutes: 30,
      budgetTier: 1,
      enriched: false,
      equipment: ["oven", "air_fryer"],
      noCook: true,
    };
    const dish = parseDish(raw);
    expect(dish?.equipment).toEqual(["oven"]);
    expect(dish?.noCook).toBe(true);
    const unpinned = parseDish({ ...raw, equipment: undefined, noCook: false });
    expect(unpinned?.equipment).toBeUndefined();
    expect(unpinned?.noCook).toBeUndefined();
  });

  it("the equipment gate excludes a dish whose needs the kitchen does not meet", () => {
    const ovenDish = cloneDish({ id: "test-oven", equipment: ["oven"] });
    const stoveDish = cloneDish({ id: "test-stove", equipment: ["stove"] });
    const plan = gen(profileWith({ equipment: ["stove"] }), { dishes: [ovenDish, stoveDish] });
    const ids = servedDishes(plan).map((d) => d.dishId);
    expect(ids).not.toContain("test-oven");
    expect(ids).toContain("test-stove");
  });

  it("a person who does not cook is served only no-cook dishes", () => {
    const noCook = cloneDish({ id: "test-nocook", equipment: [], noCook: true });
    const cooked = cloneDish({ id: "test-cooked" });
    const plan = gen(profileWith({ cookingAbility: "none" }), { dishes: [noCook, cooked] });
    const ids = servedDishes(plan).map((d) => d.dishId);
    expect(ids).toEqual(["test-nocook"]);
  });

  it("after the §10.4 pass, 'no cooking' serves the library's no-cook dishes", () => {
    /* Rewritten 2026-11-18 with the §10.4 data pass: this test
       previously pinned the UNTAGGED library's behaviour — the pool
       emptied and the plan said why — because every dish answered
       the conservative default. The pass pinned real tags from each
       dish's method, so the honest behaviour inverted: the pool now
       holds the library's genuine no-cook dishes, only those are
       served, and the empty-pool note no longer fires. The
       full-library consequence is pinned in dishTags.test.ts; this
       stays as the gate-level record of the change. */
    const plan = gen(profileWith({ cookingAbility: "none" }));
    const served = servedDishes(plan);
    expect(served.length).toBeGreaterThan(0);
    for (const s of served) {
      expect(dishPreparationNeeds(findDish(s.dishId)!).noCook, s.dishId).toBe(true);
    }
    expect(
      plan.notes.some((n) => n.startsWith("No dish in the library fits your kitchen answers yet")),
    ).toBe(false);
  });

  it("an equipment answer without a stove serves only what that kitchen covers", () => {
    /* Rewritten 2026-11-18 with the §10.4 data pass, for the same
       reason as the test above: a fridge-only kitchen previously
       emptied the pool (every dish defaulted to needing a stove);
       now it is served the dishes whose methods need no more than a
       fridge — and nothing whose method needs more. */
    const plan = gen(profileWith({ equipment: ["fridge"] }));
    const served = servedDishes(plan);
    expect(served.length).toBeGreaterThan(0);
    for (const s of served) {
      const needs = dishPreparationNeeds(findDish(s.dishId)!);
      expect(needs.equipment.every((item) => item === "fridge"), s.dishId).toBe(true);
    }
    expect(
      plan.notes.some((n) => n.startsWith("No dish in the library fits your kitchen answers yet")),
    ).toBe(false);
  });

  it("an equipment answer with a stove keeps the dish pool, with no kitchen note", () => {
    const plan = gen(profileWith({ equipment: ["stove", "fridge"] }));
    expect(servedDishes(plan).length).toBeGreaterThan(0);
    expect(
      plan.notes.some((n) => n.startsWith("No dish in the library fits your kitchen answers yet")),
    ).toBe(false);
  });
});

/* ------------------------------ prep time -------------------------------- */

describe("P10 · prep-time cap", () => {
  it("a weekday plan at the tightest band serves only dishes inside it (full library)", () => {
    const plan = gen(profileWith({ prepTimeMaxMinutes: 10 }), { day: MONDAY });
    const dishes = servedDishes(plan);
    expect(dishes.length).toBeGreaterThan(0);
    for (const d of dishes) {
      expect(findDish(d.dishId)?.timeMinutes).toBeLessThanOrEqual(10);
    }
    /* The cap held at its own stage — no relaxation was needed, so
       none is claimed. */
    expect(plan.notes.some((n) => n.includes("aim for about 10 minutes"))).toBe(false);
  });

  it("the cap does not bind a weekend plan", () => {
    const plan = gen(profileWith({ prepTimeMaxMinutes: 10 }), { day: SATURDAY });
    const times = servedDishes(plan).map((d) => findDish(d.dishId)?.timeMinutes ?? 0);
    expect(times.some((t) => t > 10)).toBe(true);
    expect(plan.notes.some((n) => n.includes("aim for about"))).toBe(false);
  });

  it("a hostel setting supplies the tightest cap by default on a weekday", () => {
    const plan = gen(profileWith({ eatingSetting: "hostel" }), { day: MONDAY });
    for (const d of servedDishes(plan)) {
      expect(findDish(d.dishId)?.timeMinutes).toBeLessThanOrEqual(10);
    }
  });

  it("relaxes to the next band that still offers a main dish — and names it", () => {
    const quick = cloneDish({ id: "test-45", timeMinutes: 45 });
    const slow = cloneDish({ id: "test-90", timeMinutes: 90 });
    const plan = gen(profileWith({ prepTimeMaxMinutes: 20 }), { dishes: [quick, slow] });
    expect(servedDishes(plan).map((d) => d.dishId)).toEqual(["test-45"]);
    expect(
      plan.notes.some((n) => n.includes("aim for about 20 minutes") && n.includes("60 minutes")),
    ).toBe(true);
  });

  it("lifts entirely when every main dish is slower than the widest band — and names it", () => {
    const slow = cloneDish({ id: "test-90", timeMinutes: 90 });
    const plan = gen(profileWith({ prepTimeMaxMinutes: 20 }), { dishes: [slow] });
    expect(servedDishes(plan).map((d) => d.dishId)).toEqual(["test-90"]);
    expect(plan.notes.some((n) => n.includes("every main dish in the library takes longer"))).toBe(
      true,
    );
  });

  it("an explicit prep answer overrides the hostel default", () => {
    /* The clone pins its own equipment (2026-11-18, §10.4 pass):
       cloneDish's base is a real library dish whose method now
       carries real pins (a pressure cooker), which the hostel
       default kitchen honestly lacks — the equipment gate, not the
       prep-time rule under test, would have excluded it. */
    const dish45 = cloneDish({ id: "test-45", timeMinutes: 45, equipment: ["stove"] });
    const plan = gen(profileWith({ eatingSetting: "hostel", prepTimeMaxMinutes: 60 }), {
      dishes: [dish45],
    });
    expect(servedDishes(plan).map((d) => d.dishId)).toEqual(["test-45"]);
    expect(plan.notes.some((n) => n.includes("aim for about"))).toBe(false);
  });
});

/* --------------------------- pick-cost shaping ---------------------------- */

describe("P10 · pick shaping", () => {
  const WEEK = [
    "2026-11-16",
    "2026-11-17",
    "2026-11-18",
    "2026-11-19",
    "2026-11-20",
    "2026-11-21",
    "2026-11-22",
  ];

  function week(behavioural: Partial<BehaviouralProfile>): DailyPlan[] {
    const plans: DailyPlan[] = [];
    let prev: DailyPlan | null = null;
    for (const day of WEEK) {
      const plan = gen(profileWith(behavioural), {
        day,
        storedPlan: prev,
        fallbackTargets: { kcal: 2600, proteinG: 150 },
      });
      plans.push(plan);
      prev = plan;
    }
    return plans;
  }

  it("basic cooking experience steers the week away from long-method dishes", () => {
    const complexCount = (plans: DailyPlan[]) =>
      plans
        .flatMap((p) => servedDishes(p))
        .filter((d) => (findDish(d.dishId)?.method.length ?? 0) > 6).length;
    const confident = complexCount(week({ cookingAbility: "confident" }));
    const basic = complexCount(week({ cookingAbility: "basic" }));
    /* Measured on this library and fixture: 7 of 21 serves are
       long-method for a confident cook, 2 of 21 for a basic one.
       The pin is the direction and a clear margin, not the exact
       counts — the pool's fits still lead. */
    expect(basic).toBeLessThan(confident);
    expect(basic).toBeLessThanOrEqual(3);
  }, 60_000);

  it("the hunger pattern moves the dinner split, not the day (plan-level)", () => {
    const plain = gen(profileWith({}));
    const evenings = gen(profileWith({ hungerPattern: "evenings" }));
    const dinnerOf = (p: DailyPlan) => p.meals.find((m) => m.meal === "dinner")!;
    expect(dinnerOf(evenings).kcal).toBeGreaterThan(dinnerOf(plain).kcal);
    expect(evenings.targets).toEqual(plain.targets);
    expect(evenings.meals.reduce((s, m) => s + m.kcal, 0)).toBe(plain.targets.kcal);
  });
});

/* ------------------------------ snack craving ----------------------------- */

describe("P10 · snack craving", () => {
  const cls = (group: "fruits" | "dairy"): FoodClassification => ({
    group,
    containsEgg: false,
    containsDairy: group === "dairy",
    isFlesh: false,
    isFish: false,
  });
  const mkFood = (
    id: string,
    name: string,
    group: "fruits" | "dairy",
    per100g: Food["per100g"],
  ): Food => ({
    id,
    name,
    per100g,
    servings: [],
    provenance: { kind: "user_entered", sourceId: id, label: "Your value" },
    classification: cls(group),
  });
  /* A snack-eligible food no main-meal layer can take (unclassified,
     low protein, low carb), so it reaches the snack unused. */
  const SOUP: Food = {
    id: "user-soup",
    name: "Light soup",
    per100g: { kcal: 60, proteinG: 2, carbsG: 5, fatG: 4 },
    servings: [],
    provenance: { kind: "user_entered", sourceId: "user-soup", label: "Your value" },
  };
  const FOODS: Food[] = [
    mkFood("user-apple", "Apple", "fruits", { kcal: 52, proteinG: 0.3, carbsG: 14, fatG: 0.2 }),
    mkFood("user-banana", "Banana", "fruits", { kcal: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3 }),
    mkFood("user-milk", "Milk", "dairy", { kcal: 64, proteinG: 3.3, carbsG: 4.8, fatG: 3.6 }),
    SOUP,
  ];

  it("a sweet craving makes the snack's flexible item a fruit, once the fruit floor is met", () => {
    /* Fixture construction (2026-11-16, this pool): the snack's first
       item is a banana whose portion alone passes the day's 100 g
       fruit floor, so the floor clause is spent and the second item
       is the flexible one. Without a craving it is the soup (the
       rotation's next snack food); with a stated sweet craving it is
       the apple — the craving is answered with a whole food. */
    const opts = { day: MONDAY, foods: FOODS, dishes: [] as Dish[], fallbackTargets: { kcal: 2000, proteinG: 80 } };
    const plain = gen(profileWith({}), opts);
    const craving = gen(profileWith({ cravingKinds: ["sweet"] }), opts);
    const snackIds = (p: DailyPlan) =>
      p.meals.find((m) => m.meal === "snack")!.suggestions.map((s) => s.foodId);
    expect(snackIds(plain)).toEqual(["user-banana", "user-soup"]);
    expect(snackIds(craving)).toEqual(["user-banana", "user-apple"]);
  });
});
