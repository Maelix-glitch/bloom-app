/**
 * Nutrition — entry construction (design §4.1/§4.4).
 *
 * Two factories, one per kind of entry, so the honesty invariants hold by
 * construction:
 *  - a food-backed entry computes its nutrients from the food's per-100 g
 *    values and inherits the food's provenance;
 *  - an estimate entry can only be built by `createEstimateEntry`, which
 *    always stamps the `coach_estimate` provenance and the inline snapshot —
 *    there is no way to construct one without the estimate flag (§4.8).
 */

import { newNutritionId } from "./ids";
import { entryNutrientsFor } from "./math";
import { parseLogEntry } from "./parse";
import type { Amount, EntrySource, Food, LogEntry, Meal, Nutrients } from "./types";

export const COACH_ESTIMATE_LABEL = "Estimate, based on your photo";

export function createEntryFromFood(input: {
  food: Food;
  amount: Amount;
  meal: Meal;
  day: string;
  source: Exclude<EntrySource, "coach_photo">;
  now: string;
  id?: string;
}): LogEntry | null {
  const nutrients = entryNutrientsFor(input.food, input.amount);
  if (!nutrients) return null;
  const entry: LogEntry = {
    id: input.id ?? newNutritionId("entry"),
    day: input.day,
    meal: input.meal,
    foodId: input.food.id,
    snapshot: null,
    name: input.food.name,
    amount: input.amount,
    nutrients,
    provenance: input.food.provenance,
    source: input.source,
    createdAt: input.now,
  };
  // The factory's own output must satisfy the strict parser — if a caller
  // handed in a malformed food, the entry is refused, not repaired.
  return parseLogEntry(entry);
}

export function createEstimateEntry(input: {
  /** The name the user typed or confirmed in the log sheet (§4.4). */
  name: string;
  /** Coach's estimated totals for the photographed portion, as confirmed. */
  totals: Nutrients;
  meal: Meal;
  day: string;
  now: string;
  id?: string;
}): LogEntry | null {
  const entry: LogEntry = {
    id: input.id ?? newNutritionId("entry"),
    day: input.day,
    meal: input.meal,
    foodId: null,
    snapshot: { name: input.name, totals: input.totals },
    name: input.name,
    amount: { servings: 1, servingLabel: "Photo portion" },
    nutrients: input.totals,
    provenance: { kind: "coach_estimate", label: COACH_ESTIMATE_LABEL },
    source: "coach_photo",
    createdAt: input.now,
  };
  return parseLogEntry(entry);
}
