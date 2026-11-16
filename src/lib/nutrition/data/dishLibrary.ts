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
 *   - dishLibraryKerala.ts the Kerala wave (dishes expansion WAVE I-1)
 *   - dishLibraryIntl1.ts international high-protein wave (X-1)
 *   - dishLibraryIntl2.ts international wave X-2 — Mediterranean,
 *                         European and Middle Eastern high-protein
 *                         mains and breakfasts (≥25 g protein/serving,
 *                         computed and pinned in dishesIntl2.test.ts)
 *   - dishLibraryIntl3.ts international wave X-3 — East/South-East
 *                         Asian, American and Latin high-protein mains
 *                         and breakfasts (≥25 g protein/serving,
 *                         computed and pinned in dishLibraryIntl3.test.ts)
 *   - dishLibraryIntl4.ts international wave X-4 — Central & Eastern
 *                         European, Nordic, British & Irish, Central
 *                         Asian & Caucasus, African, Caribbean and
 *                         remaining Latin high-protein mains and
 *                         breakfasts (≥25 g protein/serving, computed
 *                         and pinned in dishLibraryIntl4.test.ts)
 *   - dishLibraryIndia.ts the India wave (dishes expansion WAVE I-2) —
 *                         the rest of India beyond the pan-Indian set
 *                         and the Kerala wave: North, West, East,
 *                         Central and the non-Kerala South, in the
 *                         full category range
 */
import type { Dish } from "../dishes";
import { DISHES_MAINS } from "./dishesMains";
import { DISHES_RICE_BREAD } from "./dishesRiceBread";
import { DISHES_SIDES } from "./dishesSides";
import { KERALA_DISHES } from "./dishLibraryKerala";
import { INTL1_DISHES } from "./dishLibraryIntl1";
import { INTL2_DISHES } from "./dishLibraryIntl2";
import { INTL3_DISHES } from "./dishLibraryIntl3";
import { INTL4_DISHES } from "./dishLibraryIntl4";
import { INDIA_DISHES } from "./dishLibraryIndia";
import { PROOF_DISHES } from "./proofDishes";

export const DISH_LIBRARY: readonly Dish[] = [
  ...PROOF_DISHES,
  ...DISHES_MAINS,
  ...DISHES_RICE_BREAD,
  ...DISHES_SIDES,
  ...KERALA_DISHES,
  ...INTL1_DISHES,
  ...INTL2_DISHES,
  ...INTL3_DISHES,
  ...INTL4_DISHES,
  ...INDIA_DISHES,
];

const BY_ID = new Map(DISH_LIBRARY.map((d) => [d.id, d]));

export function findDish(id: string): Dish | null {
  return BY_ID.get(id) ?? null;
}
