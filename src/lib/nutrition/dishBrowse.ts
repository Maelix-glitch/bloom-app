/**
 * Nutrition — browsing the dish library, and the plan's dish idea (D4).
 *
 * Pure filter logic for the Dishes section: a search over the English
 * and Hindi names, the category / cuisine / pattern / budget filters
 * and the enriched-only toggle, over a deterministic sort — the same
 * filters always yield the same list in the same order, so the section
 * never reshuffles under the reader.
 *
 * The plan's dish idea reuses the plan engine's own gates rather than
 * inventing parallel ones: a dish qualifies for a meal only when it
 * suits the person's dietary pattern (its derived `dishPatterns`) AND
 * every one of its ingredient lines sits in the plan's eligible pool
 * (`eligiblePool` — the provenance gate, the pattern judgement and the
 * allergy / intolerance / dislike name-matching the plan applies to
 * foods, applied to the dish's foods). Rotation follows the plan
 * composer's discipline (P2): an FNV-1a hash of the day and the dish
 * id — the same dish all day, a different pick across days.
 */

import type { HealthProfile } from "@/lib/vitalis/domain/profile";
import { DISH_LIBRARY } from "./data/dishLibrary";
import {
  DISH_CATEGORIES,
  dishNutrients,
  dishPatterns,
  type Dish,
  type DishCategory,
} from "./dishes";
import type { LabelledNutrients } from "./labels";
import { eligiblePool, planPatternOf, type PlanPattern } from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Meal } from "./types";

/* ------------------------------- browsing -------------------------------- */

/**
 * The library's cuisine taxonomy — the three values every shipped
 * dish carries in its `cuisine` tag (the tag itself stays a free
 * string on the Dish model; these are the values the library uses
 * and the Dishes section offers as a filter).
 */
export type DishCuisine = "india" | "kerala" | "international";

export const DISH_CUISINES: readonly DishCuisine[] = ["india", "kerala", "international"];

export const DISH_CUISINE_LABEL: Record<DishCuisine, string> = {
  india: "Indian",
  kerala: "Kerala",
  international: "International",
};

export interface DishBrowseFilters {
  /** Free text, matched against the English and Hindi names. */
  query: string;
  category: DishCategory | null;
  cuisine: DishCuisine | null;
  pattern: PlanPattern | null;
  budgetTier: 1 | 2 | 3 | null;
  enrichedOnly: boolean;
}

export const NO_DISH_FILTERS: DishBrowseFilters = {
  query: "",
  category: null,
  cuisine: null,
  pattern: null,
  budgetTier: null,
  enrichedOnly: false,
};

export interface DishBrowseRow {
  dish: Dish;
  /** Per-serving nutrients, computed — the only way a dish's numbers
   *  exist (see dishes.ts). Bundled with their provenance label. */
  labelled: LabelledNutrients;
  /** The patterns the dish suits, derived from its ingredient lines. */
  patterns: PlanPattern[];
}

/**
 * The dishes matching every active filter, in a deterministic order:
 * category (in the library's category order), then English name. The
 * search matches the English name and the Hindi name, case-insensitively
 * for the English; every other filter is an exact judgement — a dish is
 * under a pattern only when `dishPatterns` derives it.
 */
export function browseDishes(
  filters: DishBrowseFilters,
  dishes: readonly Dish[] = DISH_LIBRARY,
): DishBrowseRow[] {
  const q = filters.query.trim().toLowerCase();
  const rows: DishBrowseRow[] = [];
  for (const dish of dishes) {
    if (filters.category !== null && dish.category !== filters.category) continue;
    if (filters.cuisine !== null && dish.cuisine !== filters.cuisine) continue;
    if (filters.budgetTier !== null && dish.budgetTier !== filters.budgetTier) continue;
    if (filters.enrichedOnly && !dish.enriched) continue;
    if (
      q &&
      !dish.name.en.toLowerCase().includes(q) &&
      !dish.name.hindi.toLowerCase().includes(q)
    ) {
      continue;
    }
    const patterns = dishPatterns(dish);
    if (filters.pattern !== null && !patterns.includes(filters.pattern)) continue;
    rows.push({ dish, labelled: dishNutrients(dish), patterns });
  }
  const categoryRank = new Map(DISH_CATEGORIES.map((c, i) => [c, i]));
  rows.sort((a, b) => {
    const byCategory =
      (categoryRank.get(a.dish.category) ?? 0) - (categoryRank.get(b.dish.category) ?? 0);
    if (byCategory !== 0) return byCategory;
    return a.dish.name.en < b.dish.name.en ? -1 : a.dish.name.en > b.dish.name.en ? 1 : 0;
  });
  return rows;
}

export const DISH_CATEGORY_LABEL: Record<DishCategory, string> = {
  main: "Mains",
  side: "Sides",
  chutney: "Chutneys",
  raita: "Raitas",
  bread: "Breads",
  rice: "Rice",
  snack: "Snacks",
  breakfast: "Breakfast",
  dessert: "Desserts",
  drink: "Drinks",
  shake: "Shakes",
};

export const PLAN_PATTERN_LABEL: Record<PlanPattern, string> = {
  vegetarian: "Vegetarian",
  eggetarian: "Eggetarian",
  vegan: "Vegan",
  ovo_vegetarian: "Ovo-vegetarian",
  pescatarian: "Pescatarian",
  non_vegetarian: "Non-vegetarian",
};

export const ALL_PLAN_PATTERNS: readonly PlanPattern[] = [
  "vegetarian",
  "eggetarian",
  "vegan",
  "ovo_vegetarian",
  "pescatarian",
  "non_vegetarian",
];

/* ------------------------------ dish idea -------------------------------- */

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The dish idea for one plan meal on one day, or null when no dish
 * honestly qualifies (the row is then simply absent — Bloom does not
 * pad a plan with a dish that breaks the person's pattern or names an
 * ingredient they said they avoid).
 *
 * Slots: breakfast draws from the breakfast and main categories; lunch
 * and dinner from mains; a snack gets no dish idea. Qualification is
 * the plan's own: the dish suits the person's pattern (when they have
 * stated one) and every ingredient line is in the plan's eligible pool
 * for their profile. When the person has stated a meal budget (in the
 * assessment, and only there), qualifiers at or under their tier are
 * preferred; if none qualifies in-budget, the pick falls back to any
 * qualifier — a budget preference never empties the row. Among the
 * preferred set, the pick is the first in the day's FNV-1a rotation
 * order over `day:dishId` — deterministic within the day, rotating
 * across days.
 *
 * `excludeIds` carries the dish ids already offered for earlier meals
 * the same day (P3): lunch and dinner draw from the same category and
 * the same rotation order, so without it both slots served the same
 * dish. Callers thread the day's used ids through in meal order; a
 * slot whose qualifiers are all used gets no idea rather than a
 * repeat.
 */
export function dishIdeaFor(
  profile: HealthProfile,
  day: string,
  meal: Meal,
  dishes: readonly Dish[] = DISH_LIBRARY,
  excludeIds: ReadonlySet<string> = new Set(),
): Dish | null {
  if (meal === "snack") return null;
  const categories: readonly DishCategory[] =
    meal === "breakfast" ? ["breakfast", "main"] : ["main"];
  const pattern = planPatternOf(profile.dietary.pattern);
  const eligible = new Set(eligiblePool(profile, USDA_REFERENCE_FOODS).map((f) => f.id));
  const qualifiers = dishes.filter((dish) => {
    if (excludeIds.has(dish.id)) return false;
    if (!categories.includes(dish.category)) return false;
    if (pattern !== null && !dishPatterns(dish).includes(pattern)) return false;
    return dish.lines.every((line) => eligible.has(line.foodId));
  });
  if (qualifiers.length === 0) return null;
  const budgetTier = profile.dietary.budgetTier;
  const inBudget =
    budgetTier === null ? [] : qualifiers.filter((dish) => dish.budgetTier <= budgetTier);
  const pool = inBudget.length > 0 ? inBudget : qualifiers;
  const ordered = pool
    .map((dish) => ({ dish, key: fnv1a(`${day}:dish:${dish.id}`) }))
    .sort((a, b) => a.key - b.key || (a.dish.id < b.dish.id ? -1 : 1));
  return ordered[0]!.dish;
}
