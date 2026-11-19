/**
 * Nutrition — preparation basis (Nutrition Intelligence spec §4,
 * module 06, v1: the eligibility/presentation side).
 *
 * The defect this module exists to close: the plain-food layers sized
 * suggestions in grams OF THE FOOD RECORD, and the shipped reference
 * set's pulse and grain records are raw/dry-basis USDA records — so a
 * plan could present "165 g lentils" where the record means 165 g of
 * DRY lentils (≈ three times that on the plate, cooked). The P2/P3
 * portion caps bounded the size of the error; they did not fix the
 * basis.
 *
 * v1's rule (spec §4.4, conservative route): a raw-basis food is never
 * SERVED as a plain-food portion — not as a composed suggestion, not
 * as a top-up, not as a swap candidate. It remains searchable and
 * loggable (the user knows what they ate), and it remains a dish
 * ingredient (a recipe's lines are quantities a method cooks; dish
 * compilation is untouched by this module).
 *
 * What v1 deliberately does NOT do: convert raw quantities to cooked
 * quantities. That needs yield factors, and a yield factor enters the
 * data layer only with a registered evidence source attached — the
 * USDA yield/retention tables are still TO VERIFY (spec §4.2), so no
 * factor is shipped, however standard it feels. When a verified
 * `YieldEntry` exists for a food, §4.4 rule 2 (render the cooked
 * equivalent) supersedes rule 3 (ineligibility) for that food.
 */

import type { Food, PreparationState } from "./types";

export const PREPARATION_STATES: readonly PreparationState[] = [
  "raw",
  "boiled",
  "steamed",
  "roasted",
  "fried",
  "cooked_unspecified",
  "as_purchased",
];

/**
 * Is this food's record on a raw/dry basis — grams of the record are
 * NOT grams of the food as eaten?
 *
 * A pinned `raw` state decides it. An UNCLAIMED state is judged by
 * group, fail-safe (spec §4.4 rule 1): a pulses/grains food whose
 * basis nobody has pinned is treated as raw-basis, because in those
 * groups the dry form is the default form a record describes. Any
 * other unclaimed food (a user's own food, a fresh food from another
 * set) is not raw-basis on suspicion alone — Bloom does not invent a
 * basis, in either direction.
 */
export function isRawBasisFood(food: Food): boolean {
  const state = food.preparation?.state;
  if (state !== undefined) return state === "raw";
  const group = food.classification?.group;
  return group === "pulses_legumes" || group === "cereals_grains";
}

/**
 * The preparation framing an ingredient line carries when its grams
 * are a raw/dry-basis weight (method 13, presentation only): the
 * line's grams are what goes INTO the pot, never the cooked portion
 * on the plate — lentils roughly triple in weight as they cook, and
 * a bare "55 g" beside a cooked dish reads as a serving of cooked
 * lentils. Returns null for every food whose record is on an
 * as-eaten basis, so the framing appears exactly where the basis
 * could mislead and nowhere else.
 */
export function rawBasisFraming(food: Food): string | null {
  return isRawBasisFood(food) ? "dry — weighed before cooking" : null;
}
