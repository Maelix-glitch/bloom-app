/**
 * Nutrition — the combined reference library (M-229).
 *
 * The library ships from more than one genuine source: the USDA FoodData
 * Central set (`usdaReference.ts`) and the UK CoFID set
 * (`cofidReference.ts`). Each set keeps its own generator, fingerprint and
 * provenance; this module is the one door through which consumers that
 * want "the reference foods" — the plan composer, dish resolution, the
 * add-food flow — read them together. A food's provenance always names
 * its own source: nothing here relabels a CoFID value as USDA or the
 * reverse, and the per-set stamps stay per-set.
 */

import { COFID_REFERENCE_FOODS, cofidDataStamp, findCofidReference } from "./cofidReference";
import { USDA_REFERENCE_FOODS, findUsdaReference, usdaDataStamp } from "./usdaReference";
import type { Food } from "./types";

/** Every shipped reference food: the USDA set first (its shipped order),
 *  then the CoFID set. */
export const REFERENCE_FOODS: readonly Food[] = [...USDA_REFERENCE_FOODS, ...COFID_REFERENCE_FOODS];

export function findReferenceFood(id: string): Food | null {
  return findUsdaReference(id) ?? findCofidReference(id);
}

/**
 * The data-version line for a reference food, from whichever set it
 * shipped in — the USDA stamp for a USDA food, the CoFID stamp for a
 * CoFID food, null for anything else (a user's own food has no dataset
 * version to stamp).
 */
export function referenceDataStamp(food: Food): string | null {
  return usdaDataStamp(food) ?? cofidDataStamp(food);
}

/**
 * Name search over the whole library, for the N4 add-food flow. Same
 * ranking as `searchUsdaReference` — every query token must appear in the
 * food's name; a name that starts with the query ranks first, then the
 * earliest match, then the shorter name — applied to the combined set so
 * a CoFID food is findable exactly like a USDA one.
 */
export function searchReferenceFoods(query: string, limit = 20): Food[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const firstToken = tokens[0];
  if (firstToken === undefined) return [];
  const phrase = tokens.join(" ");
  const scored: { food: Food; score: number }[] = [];
  for (const food of REFERENCE_FOODS) {
    const name = food.name.toLowerCase();
    if (!tokens.every((t) => name.includes(t))) continue;
    const score =
      (name.startsWith(phrase) ? 0 : 1) * 100_000 + name.indexOf(firstToken) * 100 + name.length;
    scored.push({ food, score });
  }
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((s) => s.food);
}
