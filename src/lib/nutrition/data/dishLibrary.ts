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
 *   - dishLibraryProteinIntl.ts protein wave PW-4 — international
 *                         high-protein mains from the cuisines and
 *                         preparations X-1..X-4 did not reach (≥25 g
 *                         protein/serving, computed and pinned in
 *                         dishLibraryProteinIntl.test.ts)
 *   - dishLibraryShakes.ts protein wave PW-1 — protein shakes &
 *                         smoothies (≥25 g protein/serving, computed
 *                         and pinned in dishLibraryShakes.test.ts),
 *                         built on whole ingredients and the two
 *                         generic USDA protein powders
 *   - dishLibraryProteinBreakfasts.ts protein wave PW-2 — high-protein
 *                         breakfasts and protein snacks (≥25 g
 *                         protein/serving, computed and pinned in
 *                         dishLibraryProteinBreakfasts.test.ts)
 *   - dishLibraryProteinIndia.ts protein wave PW-3 — high-protein
 *                         Indian and Kerala mains (≥25 g protein/
 *                         serving, computed and pinned in
 *                         dishLibraryProteinIndia.test.ts)
 *   - dishLibraryIndia.ts the India wave (dishes expansion WAVE I-2) —
 *                         the rest of India beyond the pan-Indian set
 *                         and the Kerala wave: North, West, East,
 *                         Central and the non-Kerala South, in the
 *                         full category range
 *   - dishLibraryBulgaria.ts the Bulgarian wave (2026-11-26, owner
 *                         ask) — the classic Bulgarian table across
 *                         the full category range, composed from the
 *                         same verified foods with its stand-ins
 *                         stated in the file (sirene through cottage
 *                         cheese, lamb and turkey at the grill)
 *   - dishLibraryBulgaria2.ts the Bulgarian wave 2 (2026-11-26,
 *                         owner ask) — the everyday Bulgarian table
 *                         widened: the full chorba range, the skara
 *                         grill, more kavarma and clay pots, the
 *                         fried weekday dishes, festive roasts and
 *                         the sweet shelf. Beef and pork ship as
 *                         themselves on this shelf (owner decision
 *                         2026-11-26); its stand-ins are stated in
 *                         the file
 *   - dishLibraryProteinWaveA.ts protein wave A (2026-11-26, owner
 *                         directive: three waves, 200+ dishes) —
 *                         protein-rich mains and breakfasts that
 *                         clear the computed 25 g bar and join
 *                         PROTEIN_WAVE_DISH_IDS, plus balanced
 *                         plates (anchor, vegetables, base) that
 *                         honestly sit below it and do not
 *   - dishLibraryProteinWaveB.ts protein wave B (2026-11-26, the
 *                         second of the three waves) — the same
 *                         two shelves on fresh ground: rendang and
 *                         stroganoff, potstickers and carbonara,
 *                         murgh cholay and hariyali, seitan and
 *                         lupin and moringa dal on the protein
 *                         shelf; khichdi, chowders and noodle
 *                         soups on the balanced shelf. Beef and
 *                         pork ship as themselves through the
 *                         three verified ids; stand-ins are
 *                         stated in the file
 *   - dishLibraryProteinWaveC.ts protein wave C (2026-11-26, the
 *                         third and final wave, landing the
 *                         programme at 210 dishes) — the same two
 *                         shelves on fresh ground again: yakitori
 *                         and kung pao, cassoulet, cocido and
 *                         petit salé, étouffée and cioppino,
 *                         kibbeh, lablabi and ghormeh sabzi, akara
 *                         and moin moin on the protein shelf;
 *                         tabbouleh, bissara, causa and the two
 *                         yogurt desserts on the balanced shelf.
 *                         Beef and pork ship as themselves
 *                         through the three verified ids;
 *                         stand-ins are stated in the file
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
import { PROTEIN_INTL_DISHES } from "./dishLibraryProteinIntl";
import { SHAKES_DISHES } from "./dishLibraryShakes";
import { PW2_DISHES } from "./dishLibraryProteinBreakfasts";
import { PROTEIN_INDIA_DISHES } from "./dishLibraryProteinIndia";
import { INDIA_DISHES } from "./dishLibraryIndia";
import { BULGARIA_DISHES } from "./dishLibraryBulgaria";
import { BULGARIA2_DISHES } from "./dishLibraryBulgaria2";
import { BALANCED_WAVE_A_DISHES, PROTEIN_WAVE_A_DISHES } from "./dishLibraryProteinWaveA";
import { BALANCED_WAVE_B_DISHES, PROTEIN_WAVE_B_DISHES } from "./dishLibraryProteinWaveB";
import { BALANCED_WAVE_C_DISHES, PROTEIN_WAVE_C_DISHES } from "./dishLibraryProteinWaveC";
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
  ...PROTEIN_INTL_DISHES,
  ...SHAKES_DISHES,
  ...PW2_DISHES,
  ...PROTEIN_INDIA_DISHES,
  ...INDIA_DISHES,
  ...BULGARIA_DISHES,
  ...BULGARIA2_DISHES,
  ...PROTEIN_WAVE_A_DISHES,
  ...BALANCED_WAVE_A_DISHES,
  ...PROTEIN_WAVE_B_DISHES,
  ...BALANCED_WAVE_B_DISHES,
  ...PROTEIN_WAVE_C_DISHES,
  ...BALANCED_WAVE_C_DISHES,
];

const BY_ID = new Map(DISH_LIBRARY.map((d) => [d.id, d]));

export function findDish(id: string): Dish | null {
  return BY_ID.get(id) ?? null;
}

/**
 * The dedicated protein wave (PW-1..PW-4): the shakes, protein
 * breakfasts and snacks, and the protein-first India and
 * international mains added by the owner's protein mandate — every
 * one computed at ≥25 g of protein a serving and pinned so by its
 * wave's tests. The plan composer (method 13) holds this set so a
 * high-protein guide can prefer the wave by name; membership is a
 * fact about which wave a dish shipped in, so it is stated here,
 * where the library is assembled, and nowhere else.
 */
export const PROTEIN_WAVE_DISH_IDS: ReadonlySet<string> = new Set(
  [
    ...SHAKES_DISHES,
    ...PW2_DISHES,
    ...PROTEIN_INDIA_DISHES,
    ...PROTEIN_INTL_DISHES,
    /* Protein wave A (2026-11-26): only its protein-rich shelf
       joins — the balanced plates in the same file compute below
       the 25 g bar and stay out, so the set's fact (every member
       clears the bar) survives the wave. */
    ...PROTEIN_WAVE_A_DISHES,
    /* Protein wave B (2026-11-26): the same rule — only its
       protein-rich shelf joins; its balanced shelf stays out. */
    ...PROTEIN_WAVE_B_DISHES,
    /* Protein wave C (2026-11-26): the final wave, same rule —
       only its protein-rich shelf joins; its balanced shelf
       stays out. */
    ...PROTEIN_WAVE_C_DISHES,
  ].map((d) => d.id),
);
