/**
 * Nutrition — display names for reference foods (D4) and dishes (N3).
 *
 * The one door through which surfaces render a reference food's name.
 * The generated USDA data keeps each food's full source description —
 * that is the provenance record and it is never edited — but a person
 * cooks with "Whole wheat flour (atta)", not "Wheat flour, whole-grain
 * (Includes foods for USDA's Food Distribution Program)". `foodNames.ts`
 * carries the friendly display name and the Hindi kitchen name for
 * every reference food; this helper resolves a food (or a logged
 * entry's food id) to those names, falling back to the food's own name
 * for anything that is not a reference food — a user's own food keeps
 * the name its owner gave it, and Bloom invents no Hindi for it.
 */

import { foodNamesFor } from "./data/foodNames";
import type { Dish } from "./dishes";
import type { Food } from "./types";

export interface FoodDisplayName {
  /** The name to show: the friendly display name for a reference food,
   *  the food's own name otherwise. */
  en: string;
  /** The Hindi kitchen name for a reference food; null when the food
   *  is not a reference food (nothing is transliterated on the fly). */
  hindi: string | null;
}

/** Display names for a food. */
export function foodDisplayName(food: Food): FoodDisplayName {
  const names = foodNamesFor(food.id);
  return names ? { en: names.display, hindi: names.hindi } : { en: food.name, hindi: null };
}

/**
 * Display names for a food id with a fallback name — the shape a log
 * entry carries (its food id plus the name captured at log time). A
 * reference food renders under its friendly name even in an old entry
 * whose stored name is the raw USDA description; anything else renders
 * under the fallback, unchanged.
 */
export function displayNameForFoodId(
  foodId: string | null,
  fallback: string,
): FoodDisplayName {
  if (foodId) {
    const names = foodNamesFor(foodId);
    if (names) return { en: names.display, hindi: names.hindi };
  }
  return { en: fallback, hindi: null };
}

/* ------------------------------ dishes ------------------------------- */

export interface DishDisplayName {
  /** The dish's English name, as the library states it. */
  en: string;
  /** The dish's local name — ONLY when it is a real local name.
   *  Null when the library's hindi field is a mechanical
   *  transliteration of the English name, or when nothing curated
   *  is known (M-148). */
  hindi: string | null;
}

/**
 * The cuisines whose library entries carry a genuine local name in
 * `name.hindi`, authored with the dish: the Indian library's Hindi
 * kitchen names (अरहर दाल) and the Kerala library's Malayalam names
 * in Devanagari (अवियाल). The international library's hindi field is
 * a faithful Devanagari TRANSLITERATION of its English name
 * ("हर्ब-ग्रिल्ड चिकन विथ ब्रोकली" for "Herb-Grilled Chicken with
 * Broccoli" — the intl wave reports state this outright), and an
 * untagged dish (a stored user dish) makes no curation claim at all.
 * Neither is shown as a local name (brief v7 N3, M-148): Bloom never
 * dresses a transliteration up as a translation, and never invents
 * a local name the library does not carry.
 */
const LOCAL_NAME_CUISINES: ReadonlySet<string> = new Set(["india", "kerala"]);

/** Display names for a dish — the one door through which the Plan
 *  page renders a dish's name. */
export function displayDishName(dish: Dish): DishDisplayName {
  const curated =
    dish.cuisine !== undefined && LOCAL_NAME_CUISINES.has(dish.cuisine)
      ? dish.name.hindi
      : null;
  return { en: dish.name.en, hindi: curated };
}
