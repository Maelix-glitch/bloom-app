/**
 * Today's balance (brief v4, Slice 4) — the day's food-group tally
 * behind the Bloom flower: how much of each plate group the plan's
 * meals actually carry, walked exactly as the composer's own floor
 * tally (`floorTotalsOf` in plan.ts) walks them — suggestions by
 * their grams, dish lines by per-serving grams at the servings the
 * plan serves. A unit test pins this module's vegetable, fruit and
 * milk-and-curd totals EQUAL to `floorTotalsOf`'s on real composed
 * plans, so the picture can never drift from the numbers the
 * composer judged.
 *
 * The group set is the classifier's own, read honestly: `FoodGroup`
 * (types.ts) names nine groups, but the classification the seed
 * generator pinned (scripts/nutrition-usda-reference.mjs, P2) puts
 * meats and fish in the residual group `other`, with the
 * `isFlesh` / `isFish` flags "carrying the pattern facts", and
 * aromatics, spices and pantry items are `other` too. The eight
 * coverage groups below are therefore seven named groups plus the
 * flag-derived flesh/fish group. `fats_oils` — a cooking medium
 * present in nearly every dish — and the residual `other` are not
 * coverage groups: a petal must be a group a person can act on.
 *
 * Milk & curd speaks the app's own language: the bucket is the
 * `countsTowardMilkCurdFloor` predicate (plan.ts) — the pinned
 * milks and curds plus the dairy group's fluid/fermented foods —
 * the same predicate behind the floor tally and the
 * milk-curd-shortfall reason.
 */

import type { Dish } from "./dishes";
import { countsTowardMilkCurdFloor, type PlanMeal } from "./plan";
import type { Food } from "./types";

export type BalanceGroupKey =
  | "vegetables"
  | "fruits"
  | "cereals_grains"
  | "pulses_legumes"
  | "milk_curd"
  | "eggs"
  | "flesh_fish"
  | "nuts_seeds";

export interface BalanceGroup {
  key: BalanceGroupKey;
  /** The group's name, as the flower's chips and labels speak it. */
  label: string;
  /** The chip's words when the day carries none of this group —
   *  factual, no failure language ("No fruit yet today"). */
  missing: string;
  grams: number;
  /** Covered = the group is present in the day (grams > 0), the
   *  same presence the composer's diversity counting uses. Goal
   *  progress for vegetables and fruit lives in their meters. */
  covered: boolean;
}

/** ICMR-NIN My Plate guideline amounts for the day — the goals the
 *  balance meters measure against. plan.ts holds the composer's
 *  twins (FLOOR_VEGETABLES_G / FLOOR_FRUIT_G, module-private); a
 *  test pins these constants against the `guidelineG` the composer
 *  emits in its shortfall reasons, so the two can never drift. */
export const GUIDELINE_VEGETABLES_G = 400;
export const GUIDELINE_FRUIT_G = 100;

const GROUP_DEFS: readonly { key: BalanceGroupKey; label: string; missing: string }[] = [
  { key: "vegetables", label: "Vegetables", missing: "No vegetables yet today" },
  { key: "fruits", label: "Fruit", missing: "No fruit yet today" },
  { key: "cereals_grains", label: "Cereals & grains", missing: "No cereals or grains yet today" },
  { key: "pulses_legumes", label: "Pulses & legumes", missing: "No pulses or legumes yet today" },
  { key: "milk_curd", label: "Milk & curd", missing: "No milk or curd yet today" },
  { key: "eggs", label: "Eggs", missing: "No eggs yet today" },
  { key: "flesh_fish", label: "Flesh foods", missing: "No flesh foods yet today" },
  { key: "nuts_seeds", label: "Nuts & seeds", missing: "No nuts or seeds yet today" },
];

/** The one bucket a food counts toward, or null when it is not a
 *  coverage food (fats and oils, aromatics and pantry residuals,
 *  protein-dairy that is not milk or curd). Flags first: a flesh
 *  food's group is `other` in the data, its identity is the flag. */
export function balanceGroupKeyOf(food: Food): BalanceGroupKey | null {
  return bucketOf(food);
}

function bucketOf(food: Food): BalanceGroupKey | null {
  const c = food.classification;
  if (!c) return null;
  if (c.isFlesh || c.isFish) return "flesh_fish";
  if (countsTowardMilkCurdFloor(food)) return "milk_curd";
  switch (c.group) {
    case "vegetables":
      return "vegetables";
    case "fruits":
      return "fruits";
    case "cereals_grains":
      return "cereals_grains";
    case "pulses_legumes":
      return "pulses_legumes";
    case "eggs":
      return "eggs";
    case "nuts_seeds":
      return "nuts_seeds";
    default:
      return null;
  }
}

/** The day's balance: one entry per coverage group, in plate
 *  order, with the grams the plan's meals carry of it. Foods and
 *  dishes the maps no longer hold are skipped — the same honesty
 *  as `floorTotalsOf`, whose totals this module's floor groups
 *  are pinned equal to. */
export function dayBalance(
  meals: readonly PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): BalanceGroup[] {
  const grams = new Map<BalanceGroupKey, number>(GROUP_DEFS.map((d) => [d.key, 0]));
  const add = (food: Food, g: number) => {
    const key = bucketOf(food);
    if (key) grams.set(key, (grams.get(key) ?? 0) + g);
  };
  for (const meal of meals) {
    for (const s of meal.suggestions) {
      const food = byId.get(s.foodId);
      if (food) add(food, s.grams);
    }
    for (const planDish of meal.dishes) {
      const dish = dishById.get(planDish.dishId);
      if (!dish) continue;
      for (const line of dish.lines) {
        const food = byId.get(line.foodId);
        if (food) add(food, (line.grams / dish.servings) * planDish.servings);
      }
    }
  }
  return GROUP_DEFS.map((d) => {
    const g = grams.get(d.key) ?? 0;
    return { ...d, grams: g, covered: g > 0 };
  });
}

/** A guideline goal's coverage (brief v4 Part 3.2): the fill
 *  share, what is left to go, and whether the goal is met. A
 *  guideline is a target, not a verdict — the words built on
 *  this say "to go", never "short" or "failed". */
export function coverage(
  actual: number,
  goal: number,
): { pct: number; gap: number; met: boolean } {
  return {
    pct: goal > 0 ? Math.min(100, Math.round((actual / goal) * 100)) : 100,
    gap: Math.max(0, goal - actual),
    met: actual >= goal,
  };
}
