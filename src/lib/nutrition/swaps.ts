/**
 * Nutrition — calorie-matched swaps (N-UI).
 *
 * A swap answers one narrow question honestly: "what else in the USDA
 * reference set, from the same food group, would give me about the same
 * energy with more of the nutrient my day is shortest on?" Candidates
 * come from the plan composer's eligible pool — the caller applies
 * `eligiblePool`, so the person's dietary pattern and their stated
 * allergies / intolerances / dislikes filter swaps exactly as they
 * filter plans. The portion is the gram weight that matches the
 * entry's energy (±25% after rounding to a weighable 5 g step); the
 * ranking is the focus nutrient's gain over the entry itself.
 *
 * Only USDA-backed entries can be swapped, and only into USDA foods:
 * an estimate or a user's own value swapped "into" a reference food
 * would dress a guess in verified clothing. Applying a swap goes
 * through the log's validated write path (`appendToLog` re-parses the
 * replacement and replaces by id), keeping the entry's id, day, meal,
 * source and creation time — its origin is unchanged; only the food,
 * its amount, its nutrients and its (USDA) provenance move, together.
 */

import { entryNutrientsFor } from "./math";
import { parseLogEntry } from "./parse";
import { logEntry } from "./log";
import { isRawBasisFood } from "./preparation";
import type { Food, LogEntry, Nutrients } from "./types";
import type { NutritionTargets } from "./targets";

export type SwapFocus = "protein" | "fibre";

/**
 * Which nutrient the day is shortest on, as a fraction of its guide:
 * fibre (against the spectrum's reference intake) versus protein
 * (against the day's target). When either side cannot be judged — no
 * protein target, or no logged food reported fibre — the focus is
 * protein, the quantity Bloom actually knows.
 */
export function swapFocusFor(
  totals: Nutrients,
  targets: NutritionTargets | null,
  fibreReferenceG: number,
): SwapFocus {
  const proteinFraction =
    targets && targets.proteinG > 0 ? totals.proteinG / targets.proteinG : null;
  const fibreFraction = totals.fibreG !== undefined ? totals.fibreG / fibreReferenceG : null;
  if (proteinFraction !== null && fibreFraction !== null && fibreFraction < proteinFraction) {
    return "fibre";
  }
  return "protein";
}

export interface SwapOption {
  food: Food;
  /** The gram weight that matches the entry's energy. */
  grams: number;
  /** The candidate's nutrients at that weight (lib math). */
  nutrients: Nutrients;
  /** Focus-nutrient gain over the entry, in grams (1 dp). */
  delta: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Up to `limit` swap options for an entry, best focus gain first.
 * Empty when the entry's food is unclassified (no group to match), when
 * the entry does not report the focus nutrient (a fibre gain over an
 * unreported base would be invented), or when nothing in the pool
 * matches honestly.
 */
export function swapsFor(
  entry: LogEntry,
  entryFood: Food,
  pool: readonly Food[],
  focus: SwapFocus,
  limit = 3,
): SwapOption[] {
  const group = entryFood.classification?.group;
  if (!group) return [];
  const entryFocus = focus === "protein" ? entry.nutrients.proteinG : entry.nutrients.fibreG;
  if (entryFocus === undefined) return [];

  const options: SwapOption[] = [];
  for (const candidate of pool) {
    if (candidate.id === entryFood.id) continue;
    if (candidate.provenance.kind !== "usda") continue;
    /* A swap presents the candidate's grams as the portion to eat, so
       the preparation-basis rule binds here exactly as it binds the
       plan composer (module 06, spec §4.4): a raw/dry-basis record —
       dry lentils for cooked lentils — is never the suggestion. The
       caller's pool is the identity pool (pattern, allergies), so the
       basis judgement is made at this surface, not assumed of it. */
    if (isRawBasisFood(candidate)) continue;
    if (candidate.classification?.group !== group) continue;
    if (candidate.per100g.kcal <= 0) continue;
    const rawGrams = entry.nutrients.kcal / (candidate.per100g.kcal / 100);
    if (!Number.isFinite(rawGrams) || rawGrams < 5 || rawGrams > 1000) continue;
    const grams = Math.max(5, Math.round(rawGrams / 5) * 5);
    const nutrients = entryNutrientsFor(candidate, { grams });
    if (!nutrients) continue;
    if (entry.nutrients.kcal > 0) {
      const offBy = Math.abs(nutrients.kcal - entry.nutrients.kcal) / entry.nutrients.kcal;
      if (offBy > 0.25) continue;
    }
    const focusValue = focus === "protein" ? nutrients.proteinG : nutrients.fibreG;
    if (focusValue === undefined) continue;
    const delta = round1(focusValue - entryFocus);
    if (delta <= 0) continue;
    options.push({ food: candidate, grams, nutrients, delta });
  }
  options.sort(
    (a, b) =>
      b.delta - a.delta ||
      Math.abs(a.nutrients.kcal - entry.nutrients.kcal) -
        Math.abs(b.nutrients.kcal - entry.nutrients.kcal) ||
      (a.food.name < b.food.name ? -1 : 1),
  );
  return options.slice(0, limit);
}

/**
 * The entry a swap would write: same identity, the candidate food's
 * values. Null when either side is not USDA-backed — the guard that
 * keeps an estimate or an own value from being swapped into a fake.
 * The result must survive the strict parser, like every entry write.
 */
export function buildSwapEntry(entry: LogEntry, option: SwapOption): LogEntry | null {
  if (!entry.foodId || entry.provenance.kind !== "usda") return null;
  if (option.food.provenance.kind !== "usda") return null;
  return parseLogEntry({
    ...entry,
    foodId: option.food.id,
    name: option.food.name,
    amount: { grams: option.grams },
    nutrients: option.nutrients,
    provenance: option.food.provenance,
    snapshot: null,
  });
}

/** Apply a swap through the log's validated write path. Returns the
 *  stored replacement, or null when the swap is refused. */
export function swapLogEntry(entry: LogEntry, option: SwapOption): LogEntry | null {
  const next = buildSwapEntry(entry, option);
  if (!next) return null;
  logEntry(next);
  return next;
}
