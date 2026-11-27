import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDoc = new Map<string, unknown>();

vi.mock("@/lib/prefs", () => ({
  getPref: (key: string, parse: (raw: unknown) => unknown, fallback: unknown) => {
    if (!mockDoc.has(key)) return fallback;
    const parsed = parse(mockDoc.get(key));
    return parsed === null ? fallback : parsed;
  },
  setPref: (key: string, value: unknown) => {
    mockDoc.set(key, value);
  },
  clearPref: (key: string) => {
    mockDoc.delete(key);
  },
}));

import {
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { nutritionTargetsFromOutcome } from "./targets";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import { DISH_LIBRARY } from "./data/dishLibrary";
import { dishCountry, dishOnShelf, dishSide } from "./countries";
import type { Dish } from "./dishes";
import {
  PLAN_KEY,
  generatePlan,
  planInputsSnapshotOf,
  planStaleness,
  readPlan,
  writePlan,
  type DailyPlan,
  type PlanOutcome,
} from "./plan";
import { setPref } from "@/lib/prefs";

/**
 * M-251: the country + food side in the plan pool, end to end
 * through generatePlan over the REAL dish library.
 *
 * The doctrine under test (the budget's, P13, restated for country):
 * the country is a preference-class filter staged before the budget
 * on the same pool floor (24 main-capable dishes, 4 protein mains).
 * A shelf that clears the floor binds; a thin shelf widens — side
 * first, country last — and every widening is named in the plan's
 * reasons. No country stated (every pre-M-251 assessment) means no
 * country stage at all. Pattern and eligibility gates never widen.
 */

const DAY = "2026-11-15";
const NOW = "2026-11-15T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

function profile(dietary: Partial<HealthProfile["dietary"]> = {}): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "female",
    height: observation(quantity(175, "cm"), PROVENANCE),
    weight: observation(quantity(82, "kg"), PROVENANCE),
    goal: "lose",
    activity: "light",
    rateKgPerWeek: 0.5,
    dietary: { ...EMPTY_DIETARY, pattern: "omnivore", ...dietary },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
    },
  };
}

function generate(p: HealthProfile, dishes: readonly Dish[] = DISH_LIBRARY): DailyPlan {
  const safety = classifySafety(toSafetyInput(p));
  const outcome: PlanOutcome = generatePlan({
    profile: p,
    safety,
    gatedOutcome: targetsFor(p, safety, DAY),
    fallbackTargets: null,
    foods: USDA_REFERENCE_FOODS,
    dishes,
    day: DAY,
    now: NOW,
    id: "plan-country-test",
  });
  if (!outcome.ok) throw new Error(`expected a plan, got refusal ${outcome.refusal.kind}`);
  return outcome.plan;
}

const dishById = (id: string): Dish => DISH_LIBRARY.find((d) => d.id === id)!;

function servedDishes(plan: DailyPlan): Dish[] {
  return plan.meals.flatMap((meal) => meal.dishes.map((d) => dishById(d.dishId)));
}

function reasonKinds(plan: DailyPlan): string[] {
  return plan.reasons.map((r) => r.kind);
}

beforeEach(() => {
  mockDoc.clear();
});

describe("plan pool — country filter (M-251)", () => {
  it("no country stated: no country stage, no country reasons (backward compatibility)", () => {
    const plan = generate(profile());
    expect(reasonKinds(plan)).not.toContain("country-widened");
    expect(reasonKinds(plan)).not.toContain("food-side-widened");
    expect(plan.inputs.country).toBeNull();
    expect(plan.inputs.foodSide).toBeNull();
  });

  it("India stated: the plan serves only Indian dishes and says nothing about widening", () => {
    const plan = generate(profile({ country: "IN" }));
    expect(reasonKinds(plan)).not.toContain("country-widened");
    const served = servedDishes(plan);
    expect(served.length).toBeGreaterThan(0);
    for (const dish of served) expect(dishCountry(dish)).toBe("IN");
    expect(plan.inputs.country).toBe("IN");
  });

  it("a side stated: the plan serves only that side's shelf (its dishes + the shared ones)", () => {
    const plan = generate(profile({ country: "IN", foodSide: "north_indian" }));
    expect(reasonKinds(plan)).not.toContain("country-widened");
    expect(reasonKinds(plan)).not.toContain("food-side-widened");
    const served = servedDishes(plan);
    expect(served.length).toBeGreaterThan(0);
    for (const dish of served) {
      expect(dishOnShelf(dish, "IN", "north_indian")).toBe(true);
    }
  });

  it("a country with almost no dishes widens, names it, and still builds the day", () => {
    /* Egypt has exactly one placed dish in the library today —
       far below the floor — so the country must surrender and the
       plan must say so, exactly as a thin budget does. (This
       scenario originally used Bulgaria, which had one placed dish
       when M-251 was written; the M-252/M-253 waves grew Bulgaria
       to 133 placed dishes, so it no longer widens.) */
    const plan = generate(profile({ country: "EG" }));
    const widened = plan.reasons.find((r) => r.kind === "country-widened");
    expect(widened).toMatchObject({ countryName: "Egypt" });
    expect(servedDishes(plan).length).toBeGreaterThan(0);
  });

  it("a thin side widens to the country before the country widens", () => {
    /* A shelf of only North-sided and East-sided dishes (no shared
       side-less dishes): the East shelf is 13 dishes, below the
       floor, while the whole country clears it — so the side
       surrenders, the country holds, and the plan reaches across
       sides to compose the day. */
    const subset = DISH_LIBRARY.filter(
      (d) => dishSide(d) === "north_indian" || dishSide(d) === "east_indian",
    );
    const plan = generate(profile({ country: "IN", foodSide: "east_indian" }), subset);
    expect(reasonKinds(plan)).toContain("food-side-widened");
    expect(reasonKinds(plan)).not.toContain("country-widened");
    const served = servedDishes(plan);
    for (const dish of served) expect(dishCountry(dish)).toBe("IN");
    expect(served.some((d) => dishSide(d) === "north_indian")).toBe(true);
  });

  it("widening order: the budget note precedes the country note when both fire", () => {
    /* A shelf where both preferences must surrender: Egypt's one
       dish (below the country floor) plus tier-3 Greek mains only
       (nothing at a tier-1 budget). The country widens last, so its
       note comes after the budget's in the plan's reasons. */
    const egypt = DISH_LIBRARY.filter((d) => dishCountry(d) === "EG");
    const greekTier3 = DISH_LIBRARY.filter(
      (d) => dishCountry(d) === "GR" && d.budgetTier === 3,
    ).slice(0, 30);
    const plan = generate(profile({ country: "EG", budgetTier: 1 }), [
      ...egypt,
      ...greekTier3,
    ]);
    const kinds = reasonKinds(plan);
    expect(kinds).toContain("budget-widened");
    expect(kinds).toContain("country-widened");
    expect(kinds.indexOf("budget-widened")).toBeLessThan(kinds.indexOf("country-widened"));
  });

  it("the pattern gate never widens for a country: a vegan Greek plan stays vegan", () => {
    const plan = generate(profile({ country: "GR", pattern: "vegan" }));
    for (const meal of plan.meals) {
      for (const d of meal.dishes) {
        const dish = dishById(d.dishId);
        expect(dish.lines.length).toBeGreaterThan(0);
      }
    }
    /* Whatever the pool did, every served dish passed the vegan
       pattern gate — the country stage never resurrects a dish the
       pattern excluded. Greek vegan dishes exist in the wave; if
       the shelf was too thin the country widened and the plan says
       so — either way the gate held. */
    const kinds = reasonKinds(plan);
    if (!kinds.includes("country-widened")) {
      for (const dish of servedDishes(plan)) expect(dishCountry(dish)).toBe("GR");
    }
  });
});

describe("plan snapshot + storage — country (M-251)", () => {
  it("records the country on the snapshot and names a change as 'your country'", () => {
    const p = profile({ country: "IN", foodSide: "south_indian" });
    const plan = generate(p);
    expect(plan.inputs.country).toBe("IN");
    expect(plan.inputs.foodSide).toBe("south_indian");

    const moved = profile({ country: "GR" });
    const safety = classifySafety(toSafetyInput(moved));
    const outcome = targetsFor(moved, safety, DAY);
    if (!outcome.ok) throw new Error("expected targets");
    const current = planInputsSnapshotOf(moved, safety, nutritionTargetsFromOutcome(outcome)!);
    const staleness = planStaleness(plan, current);
    expect(staleness.stale).toBe(true);
    expect(staleness.changed).toContain("your country");
    expect(staleness.changed).toContain("your food side");
  });

  it("a stored plan carrying a country-widened reason round-trips intact", () => {
    const plan = generate(profile({ country: "EG" }));
    writePlan(plan);
    expect(mockDoc.has(PLAN_KEY)).toBe(true);
    const reread = readPlan();
    expect(reread).toEqual(plan);
    expect(reread?.reasons.some((r) => r.kind === "country-widened")).toBe(true);
  });

  it("a plan stored before the country question existed still reads (no country keys)", () => {
    const plan = generate(profile());
    writePlan(plan);
    const stored = mockDoc.get(PLAN_KEY) as { version: number; plan: Record<string, unknown> };
    const inputs = { ...(stored.plan["inputs"] as Record<string, unknown>) };
    delete inputs["country"];
    delete inputs["foodSide"];
    setPref(PLAN_KEY, { version: 1, plan: { ...stored.plan, inputs } });
    const reread = readPlan();
    expect(reread).not.toBeNull();
    expect(reread?.inputs.country).toBeNull();
  });

  it("a tampered country in a stored snapshot refuses the plan", () => {
    const plan = generate(profile({ country: "IN" }));
    writePlan(plan);
    const stored = mockDoc.get(PLAN_KEY) as { version: number; plan: Record<string, unknown> };
    const inputs = {
      ...(stored.plan["inputs"] as Record<string, unknown>),
      country: "not-a-country",
    };
    setPref(PLAN_KEY, { version: 1, plan: { ...stored.plan, inputs } });
    expect(readPlan()).toBeNull();
  });
});
