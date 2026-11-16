/**
 * The dish library — every dish Bloom ships, assembled from its parts.
 *
 * Dishes are RECIPES composed from USDA-verified reference ingredients;
 * their nutrients are computed by `dishNutrients` (see ../dishes.ts) and
 * travel under the "recipe" provenance — never copied from any Indian
 * composition table (IFCT/INDB stay licence-locked until a written grant
 * arrives). Parts:
 *   - proofDishes.ts      the 5 original proof dishes (D1)
 *   - dishesMains.ts      dals, curries, paneer-style, egg, chicken, fish
 *   - dishesRiceBread.ts  rice, breads, breakfast, snacks
 *   - dishesSides.ts      sides, chutneys, raitas, desserts, drinks
 */
import type { Dish } from "../dishes";
import { DISHES_MAINS } from "./dishesMains";
import { DISHES_RICE_BREAD } from "./dishesRiceBread";
import { DISHES_SIDES } from "./dishesSides";
import { PROOF_DISHES } from "./proofDishes";

export const DISH_LIBRARY: readonly Dish[] = [
  ...PROOF_DISHES,
  ...DISHES_MAINS,
  ...DISHES_RICE_BREAD,
  ...DISHES_SIDES,
];

const BY_ID = new Map(DISH_LIBRARY.map((d) => [d.id, d]));

export function findDish(id: string): Dish | null {
  return BY_ID.get(id) ?? null;
}
