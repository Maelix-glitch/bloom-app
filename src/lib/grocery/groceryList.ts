/**
 * The grocery list — built FROM the person's stored plan, never
 * imagined (System 5, Grocery & Pantry Intelligence, foundation).
 *
 * The math is the plan's own math, run backwards to the shop:
 *   · a plan dish is served whole, so its ingredients are the dish's
 *     recipe lines scaled to one serving (`line.grams / dish.servings`)
 *     times the servings the plan serves — the same Dish/DishLine data
 *     `dishNutrients` computes from, so the list and the plan can
 *     never disagree about what a dish contains;
 *   · a plan suggestion (the top-up foods around the dishes) already
 *     carries its grams.
 * Quantities are summed per food across every plan day handed in.
 * Every quantity in Bloom's food data is grams — dish lines,
 * suggestions and pantry stock alike — so there is no unit to
 * convert and none is invented: the one unreconcilable case, a dish
 * line whose food is not in the foods pool (its name and amount basis
 * are unknown), is NOT guessed at; the dish is named as unlisted
 * instead, below.
 *
 * Honest edges, by construction:
 *   · no plan → no list, with the reason on the result;
 *   · a plan dish that is not in the library (a plan stored before a
 *     library change, a forged id) is named in `unlisted` with its
 *     plan name — never silently dropped;
 *   · a dish whose lines name a food outside the pool is listed for
 *     its known lines AND named in `unlisted` for the missing ones;
 *   · categories come from the food's data-layer classification
 *     (`Food.classification.group`) — never guessed from a name. A
 *     food with no classification (the person's own foods) lands in
 *     "other", labelled as exactly that.
 *
 * The pantry deduction is transparent: a pantry item matches a list
 * item by food id, else by normalised name. A recorded quantity
 * deducts `min(have, need)` and both numbers ride on the item; an
 * item whose amount was never recorded flags the line and deducts
 * nothing.
 *
 * The Assessment's dietary pattern and budget tier govern this list
 * silently, the owner's rule: they already governed the PLAN (the
 * composer filters by pattern and hard-caps by budget tier), and the
 * list is built from that plan — so no pattern or budget control
 * exists here or in the section that renders this.
 *
 * Pure: no storage, no React. The section assembles the inputs.
 */

import { fmtGrams } from "@/lib/format";
import type { Dish } from "@/lib/nutrition/dishes";
import { foodDisplayName } from "@/lib/nutrition/displayName";
import type { DailyPlan } from "@/lib/nutrition/plan";
import type { Food, FoodGroup, Meal } from "@/lib/nutrition/types";
import { normalisePantryName, type PantryItem } from "./pantry";

export type GroceryCategory = "produce" | "dairy_eggs" | "pantry_staples" | "other";

export const GROCERY_CATEGORIES: readonly { id: GroceryCategory; label: string }[] = [
  { id: "produce", label: "Produce" },
  { id: "dairy_eggs", label: "Dairy & eggs" },
  { id: "pantry_staples", label: "Pantry staples" },
  { id: "other", label: "Other" },
];

/** The shop-aisle grouping of a data-layer food group. `other` and
 *  unclassified foods stay "other" — the honest bucket. */
export function groceryCategoryForGroup(group: FoodGroup | undefined): GroceryCategory {
  switch (group) {
    case "vegetables":
    case "fruits":
      return "produce";
    case "dairy":
    case "eggs":
      return "dairy_eggs";
    case "cereals_grains":
    case "pulses_legumes":
    case "nuts_seeds":
    case "fats_oils":
      return "pantry_staples";
    default:
      return "other";
  }
}

export interface GroceryItem {
  foodId: string;
  name: string;
  category: GroceryCategory;
  /** Total grams the plan needs, rounded for display. */
  neededGrams: number;
  /** Grams the pantry covers (0 when no quantity was recorded). */
  pantryGrams: number;
  /** Grams left to buy: needed − pantry, never below zero. */
  toBuyGrams: number;
  /** The pantry holds this, but its amount was never recorded —
   *  shown, never deducted. */
  pantryUnrecorded: boolean;
}

/** Something in the plan that could not be listed, named — the
 *  alternative to silently dropping it. */
export interface UnlistedEntry {
  /** The dish's name as the plan states it. */
  name: string;
  /** Where it sits in the plan, e.g. "2026-11-18 · lunch". */
  where: string;
  /** The reason, in plain words. */
  reason: string;
}

export interface GroceryGroup {
  category: GroceryCategory;
  label: string;
  items: GroceryItem[];
}

export type GroceryListResult =
  | { status: "no_plan"; reason: string }
  | {
      status: "ok";
      /** The plan days the list was aggregated across, in plan order. */
      days: string[];
      groups: GroceryGroup[];
      unlisted: UnlistedEntry[];
      totalItems: number;
    };

export interface GroceryListInput {
  /** The stored plan(s). The app stores one plan for one day; the
   *  aggregation runs across every day handed in. */
  plans: readonly DailyPlan[];
  dishes: readonly Dish[];
  /** The foods pool: the person's own foods + the reference set. */
  foods: readonly Food[];
  pantry: readonly PantryItem[];
}

const MEAL_ORDER: readonly Meal[] = ["breakfast", "lunch", "dinner", "snack"];

/**
 * A quantity as the shop list prints it: whole grams, grouped, via
 * the shared formatter ("250 g", "1,250 g"). DISPLAY ONLY — the
 * numbers on the items are the plan's own sums (accumulated raw,
 * rounded once at the item boundary); this string never feeds back
 * into any math, and no decimal gram or kilo fraction ever prints.
 */
export function formatGramAmount(grams: number): string {
  return `${fmtGrams(grams)} g`;
}

interface AccumulatingItem {
  foodId: string;
  name: string;
  category: GroceryCategory;
  neededRaw: number;
}

export function buildGroceryList(input: GroceryListInput): GroceryListResult {
  const { plans, dishes, foods, pantry } = input;
  if (plans.length === 0) {
    return {
      status: "no_plan",
      reason:
        "There is no plan yet — the shopping list is built from your plan, so there is nothing to list until a plan exists.",
    };
  }

  const dishById = new Map(dishes.map((dish) => [dish.id, dish]));
  const foodById = new Map(foods.map((food) => [food.id, food]));
  const byFood = new Map<string, AccumulatingItem>();
  const unlisted: UnlistedEntry[] = [];

  const addFood = (foodId: string, name: string, category: GroceryCategory, grams: number) => {
    if (!(grams > 0)) return;
    const existing = byFood.get(foodId);
    if (existing) {
      existing.neededRaw += grams;
    } else {
      byFood.set(foodId, { foodId, name, category, neededRaw: grams });
    }
  };

  for (const plan of plans) {
    const meals = [...plan.meals].sort(
      (a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal),
    );
    for (const meal of meals) {
      const where = `${plan.day} · ${meal.meal}`;
      for (const planDish of meal.dishes) {
        const dish = dishById.get(planDish.dishId);
        if (!dish) {
          unlisted.push({
            name: planDish.name,
            where,
            reason:
              "This dish is not in the dish library, so its ingredients are unknown and cannot be listed.",
          });
          continue;
        }
        const servings = dish.servings > 0 ? dish.servings : 1;
        let missingLines = 0;
        for (const line of dish.lines) {
          const food = foodById.get(line.foodId);
          if (!food) {
            missingLines += 1;
            continue;
          }
          addFood(
            line.foodId,
            /* The display name the rest of the app cooks with — the
               raw USDA description is the provenance record and stays
               in the data layer, never on a shopping list (§J). */
            foodDisplayName(food).en,
            groceryCategoryForGroup(food.classification?.group),
            (line.grams / servings) * planDish.servings,
          );
        }
        if (missingLines > 0) {
          unlisted.push({
            name: planDish.name,
            where,
            reason: `${missingLines} of this dish's ingredients have no food data, so those amounts are not listed. The rest of the dish is listed.`,
          });
        }
      }
      for (const suggestion of meal.suggestions) {
        const food = foodById.get(suggestion.foodId);
        addFood(
          suggestion.foodId,
          food ? foodDisplayName(food).en : suggestion.name,
          groceryCategoryForGroup(food?.classification?.group),
          suggestion.grams,
        );
      }
    }
  }

  /* ------------------------- pantry deduction ------------------------- */

  /** Pantry stock per grocery item: grams known to be on hand, and
   *  whether any matching item has no recorded amount. A pantry item
   *  counts once: by food id first, else by normalised name. */
  const stockByFood = new Map<string, { grams: number; unrecorded: boolean }>();
  const claim = (foodId: string, item: PantryItem) => {
    const stock = stockByFood.get(foodId) ?? { grams: 0, unrecorded: false };
    if (item.quantityGrams === null) stock.unrecorded = true;
    else stock.grams += item.quantityGrams;
    stockByFood.set(foodId, stock);
  };
  const unclaimed: PantryItem[] = [];
  for (const item of pantry) {
    if (item.foodId !== null && byFood.has(item.foodId)) claim(item.foodId, item);
    else unclaimed.push(item);
  }
  if (unclaimed.length > 0) {
    const foodIdByName = new Map<string, string>();
    for (const entry of byFood.values()) {
      const key = normalisePantryName(entry.name);
      if (!foodIdByName.has(key)) foodIdByName.set(key, entry.foodId);
    }
    for (const item of unclaimed) {
      const foodId = foodIdByName.get(normalisePantryName(item.name));
      if (foodId) claim(foodId, item);
    }
  }

  const items: GroceryItem[] = [...byFood.values()].map((entry) => {
    const stock = stockByFood.get(entry.foodId);
    const deducted = stock ? Math.min(stock.grams, entry.neededRaw) : 0;
    return {
      foodId: entry.foodId,
      name: entry.name,
      category: entry.category,
      neededGrams: Math.round(entry.neededRaw),
      pantryGrams: Math.round(deducted),
      toBuyGrams: Math.max(0, Math.round(entry.neededRaw - deducted)),
      pantryUnrecorded: stock?.unrecorded ?? false,
    };
  });

  const groups: GroceryGroup[] = GROCERY_CATEGORIES.map(({ id, label }) => ({
    category: id,
    label,
    items: items
      .filter((item) => item.category === id)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.items.length > 0);

  return {
    status: "ok",
    days: plans.map((plan) => plan.day),
    groups,
    unlisted,
    totalItems: items.length,
  };
}
