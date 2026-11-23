/**
 * Nutrition — real photographs for the reference foods (P3-R).
 *
 * The owner rejected generated imagery outright: every reference food
 * that carries a picture carries a REAL photograph of that ingredient,
 * sourced from Wikimedia Commons under a free licence (CC0, public
 * domain, CC BY or CC BY-SA — nothing else passes the generator's gate).
 * The pins, downloads and attribution records are produced by
 * `scripts/nutrition-food-images.mjs`; this module is the app's typed
 * view over its generated manifest (`data/foodImagesData`).
 *
 * Honesty rules, enforced by the manifest tests:
 *   • a photo exists only where a Commons photograph genuinely depicts
 *     the food itself — foods without one are listed explicitly in
 *     PHOTOLESS_REFERENCE_FOODS, never silently picture-less and never
 *     given another food's photograph;
 *   • attribution (author, licence, Commons file page) comes only from
 *     the manifest — it is read from Commons' own metadata at generation
 *     time, never hand-typed;
 *   • a user's own foods are not reference foods, so they never resolve
 *     here — `foodPhotoFor` answers only for reference ids.
 */

import {
  FOOD_IMAGES_RAW,
  FOOD_IMAGE_PHOTOLESS,
  type FoodImageRaw,
} from "./data/foodImagesData";

export type FoodPhoto = FoodImageRaw;

/** Every photographed reference food, in the manifest's (reference-set) order. */
export const FOOD_PHOTOS: readonly FoodPhoto[] = FOOD_IMAGES_RAW;

/** The credits list: every photo the app ships, alphabetical by food. */
export const FOOD_PHOTO_CREDITS: readonly FoodPhoto[] = [...FOOD_IMAGES_RAW].sort(
  (a, b) => a.foodName.localeCompare(b.foodName),
);

/** Reference foods with no suitable free photograph, and why. */
export const PHOTOLESS_REFERENCE_FOODS = FOOD_IMAGE_PHOTOLESS;

const BY_FOOD_ID = new Map(FOOD_IMAGES_RAW.map((p) => [p.foodId, p]));

/**
 * The photograph for a food id, or null. Only reference ids can
 * resolve — an own/custom food id, an unknown id, and a photo-less
 * reference food all answer null, and the UI renders those exactly as it
 * did before photos existed.
 */
export function foodPhotoFor(foodId: string): FoodPhoto | null {
  return BY_FOOD_ID.get(foodId) ?? null;
}
