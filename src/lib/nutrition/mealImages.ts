/**
 * Plan meal banners (P3) — one illustrative photograph per meal slot,
 * heading the meal's card in the plan section.
 *
 * These are atmosphere, never data. A banner shows the *kind* of plate
 * the meal aims at; it does not depict the foods the composer actually
 * suggested (those are listed, with provenance badges, directly beneath
 * it), and nothing in the UI may caption or alt-text it as if it did.
 * The alt text is therefore fixed in this module — "Illustration — a
 * balanced breakfast" — so the honesty rule lives with the asset, not
 * with each call site.
 *
 * The photographs are Bloom's own, made for this set in the app's
 * palette (dark slate, brass, gold light) and committed in-repo under
 * `src/assets/meals/` as 1200px WebP derivatives (60–143 KB) — the same
 * bundled-asset pattern as the profile presets (`presetAvatars.ts`):
 * no hotlinks, no public-path originals, Vite emits them hashed.
 */

import breakfast from "@/assets/meals/meal-breakfast.webp";
import lunch from "@/assets/meals/meal-lunch.webp";
import dinner from "@/assets/meals/meal-dinner.webp";
import snack from "@/assets/meals/meal-snack.webp";

import type { Meal } from "./types";

export interface MealImage {
  src: string;
  /** Screen-reader text. Always names the image an illustration. */
  alt: string;
}

export const MEAL_IMAGES: Record<Meal, MealImage> = {
  breakfast: { src: breakfast, alt: "Illustration — a balanced breakfast" },
  lunch: { src: lunch, alt: "Illustration — a balanced lunch" },
  dinner: { src: dinner, alt: "Illustration — a balanced dinner" },
  snack: { src: snack, alt: "Illustration — a balanced snack" },
};

export function mealImage(meal: Meal): MealImage {
  return MEAL_IMAGES[meal];
}
