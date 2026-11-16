/**
 * Nutrition — logging a dish (D4).
 *
 * A dish is a recipe, not a Food: it has no per-100 g profile, and Bloom
 * never invents one for it (the PR #118 rule — a portion's numbers stay
 * a portion snapshot, exactly as a Coach photo estimate does). So a
 * dish entry is built the way an estimate entry is built: the dish's
 * COMPUTED per-serving nutrients (`dishNutrients` — summed from its
 * USDA ingredient lines, never stored on the dish) are snapshotted
 * inline on the entry, under the `recipe` provenance whose sourceId is
 * the dish's id and whose label states where the numbers come from
 * ("Built from USDA ingredient data"). The entry's `source` is `dish`,
 * and the strict parser holds dish entries to exactly this shape:
 * recipe provenance, inline snapshot, no food pointer.
 *
 * One tap logs ONE serving. Logging a dish twice is two servings — a
 * legitimate act, so unlike the Coach and plan handoffs there is no
 * duplicate record here; the log itself is the record.
 */

import { dishNutrients, dishProvenance, type Dish } from "./dishes";
import { newNutritionId } from "./ids";
import { logEntry } from "./log";
import { parseLogEntry } from "./parse";
import type { LogEntry, Meal } from "./types";

/** Build the log entry for one serving of a dish. Null only if the
 *  result fails the strict parser (a dish whose computed nutrients fall
 *  outside the entry caps — refused, never clamped). */
export function createDishEntry(input: {
  dish: Dish;
  meal: Meal;
  day: string;
  now: string;
  id?: string;
}): LogEntry | null {
  const { nutrients } = dishNutrients(input.dish);
  const entry: LogEntry = {
    id: input.id ?? newNutritionId("entry"),
    day: input.day,
    meal: input.meal,
    foodId: null,
    snapshot: { name: input.dish.name.en, totals: nutrients },
    name: input.dish.name.en,
    amount: { servings: 1, servingLabel: "1 serving" },
    nutrients,
    provenance: dishProvenance(input.dish),
    source: "dish",
    createdAt: input.now,
  };
  return parseLogEntry(entry);
}

/** Log one serving of a dish into the food log. Returns the entry, or
 *  null when the lib refuses it. */
export function logDish(
  dish: Dish,
  meal: Meal,
  day: string,
  now: string = new Date().toISOString(),
): LogEntry | null {
  const entry = createDishEntry({ dish, meal, day, now });
  if (!entry) return null;
  logEntry(entry);
  return entry;
}
