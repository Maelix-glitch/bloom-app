/**
 * Nutrition — the user's own foods (W4-3 N2, design §4.2 "Custom food").
 *
 * `health.foods.v1` holds only foods the user entered themselves, so every
 * food created here is stamped `user_entered` provenance by construction —
 * the "Your value" badge is a fact about where the food lives, not a flag
 * a caller can forget. List operations are pure; the pref-backed wrappers
 * at the bottom are what the UI calls. Every read goes back through the
 * strict parser, so a stored food is re-validated on every load.
 */

import { newNutritionId } from "./ids";
import { USER_ENTERED_LABEL } from "./labels";
import { parseFood } from "./parse";
import { readFoods, writeFoods } from "./store";
import type { Food, FoodServing, Nutrients } from "./types";

export interface CustomFoodInput {
  name: string;
  per100g: Nutrients;
  servings?: FoodServing[];
}

/** Build a user-entered food. Null when the input does not survive the
 *  strict parser (a blank name, an out-of-range value, …). */
export function createCustomFood(input: CustomFoodInput, id?: string): Food | null {
  const foodId = id ?? newNutritionId("food");
  return parseFood({
    id: foodId,
    name: input.name,
    per100g: input.per100g,
    servings: input.servings ?? [],
    provenance: { kind: "user_entered", sourceId: foodId, label: USER_ENTERED_LABEL },
  });
}

export function findFood(foods: readonly Food[], id: string): Food | null {
  return foods.find((f) => f.id === id) ?? null;
}

/** Add a food, replacing any existing food with the same id (ids stable). */
export function addFood(foods: readonly Food[], food: Food): Food[] {
  const valid = parseFood(food);
  if (!valid) return [...foods];
  return [...foods.filter((f) => f.id !== valid.id), valid];
}

/**
 * Edit one of the user's foods. The patch may change name, per-100 g values
 * and servings; id and provenance are not patchable — a user food stays a
 * user food. The patched result must survive the strict parser, and an
 * unknown id changes nothing.
 */
export function updateFood(
  foods: readonly Food[],
  id: string,
  patch: Partial<CustomFoodInput>,
): Food[] {
  const current = findFood(foods, id);
  if (!current) return [...foods];
  const next = parseFood({
    ...current,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.per100g !== undefined ? { per100g: patch.per100g } : {}),
    ...(patch.servings !== undefined ? { servings: patch.servings } : {}),
    id: current.id,
    provenance: current.provenance,
  });
  if (!next) return [...foods];
  return foods.map((f) => (f.id === id ? next : f));
}

export function removeFood(foods: readonly Food[], id: string): Food[] {
  return foods.filter((f) => f.id !== id);
}

/* ------------------------------- pref access ------------------------------ */

export function listCustomFoods(): Food[] {
  return readFoods();
}

/** Create a custom food and persist it. Returns the stored food. */
export function saveCustomFood(input: CustomFoodInput, id?: string): Food | null {
  const food = createCustomFood(input, id);
  if (!food) return null;
  writeFoods(addFood(readFoods(), food));
  return food;
}

export function editCustomFood(id: string, patch: Partial<CustomFoodInput>): Food | null {
  const next = updateFood(readFoods(), id, patch);
  writeFoods(next);
  return findFood(next, id);
}

export function deleteCustomFood(id: string): void {
  writeFoods(removeFood(readFoods(), id));
}
