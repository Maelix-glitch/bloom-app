/**
 * Nutrition — real photographs for the dish library (D3).
 *
 * The owner rejected generated imagery outright: every dish that
 * carries a picture carries a REAL photograph of that dish, sourced
 * from Wikimedia Commons under a free licence (CC0, public domain,
 * CC BY or CC BY-SA — nothing else passes the generator's gate). The
 * pins, downloads and attribution records are produced by
 * `scripts/nutrition-dish-images.mjs`; this module is the app's typed
 * view over its generated manifest (`data/dishImagesData`).
 *
 * Honesty rules, enforced by the manifest tests:
 *   • a photo exists only where a Commons photograph genuinely depicts
 *     the dish itself, plated/served — dishes without one are listed
 *     explicitly in PHOTOLESS_DISHES, never silently picture-less and
 *     never given a near-miss photograph;
 *   • a variant whose plating is visually identical to another dish's
 *     (an enriched version of the same dish, a drier side version) may
 *     share that dish's photograph — the sharing is recorded in the
 *     generator, and the manifest entry names the same Commons file;
 *   • attribution (author, licence, Commons file page) comes only from
 *     the manifest — it is read from Commons' own metadata at
 *     generation time, never hand-typed.
 */

import {
  DISH_IMAGES_RAW,
  DISH_IMAGE_PHOTOLESS,
  type DishImageRaw,
} from "./data/dishImagesData";

export type DishPhoto = DishImageRaw;

/** Every photographed dish, in the manifest's (library) order. */
export const DISH_PHOTOS: readonly DishPhoto[] = DISH_IMAGES_RAW;

/** The credits list: every photo the app ships, alphabetical by dish. */
export const DISH_PHOTO_CREDITS: readonly DishPhoto[] = [...DISH_IMAGES_RAW].sort(
  (a, b) => a.dishName.localeCompare(b.dishName),
);

/** Dishes with no suitable free photograph, and why. */
export const PHOTOLESS_DISHES = DISH_IMAGE_PHOTOLESS;

const BY_DISH_ID = new Map(DISH_IMAGES_RAW.map((p) => [p.dishId, p]));

/**
 * The photograph for a dish id, or null. Only library dish ids can
 * resolve — an unknown id and a photo-less dish both answer null, and
 * the UI renders those exactly as it did before photos existed.
 */
export function dishPhotoFor(dishId: string): DishPhoto | null {
  return BY_DISH_ID.get(dishId) ?? null;
}

/** The one-line credit for a dish's photograph, or null when it has none. */
export function dishPhotoCredit(dishId: string): string | null {
  const photo = dishPhotoFor(dishId);
  if (!photo) return null;
  return `${photo.dishName} — photo by ${photo.author}, ${photo.license}, via Wikimedia Commons`;
}
