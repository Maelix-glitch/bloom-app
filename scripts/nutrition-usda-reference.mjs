#!/usr/bin/env node
/**
 * Generate (or verify) the USDA reference food set for Nutrition (W4-3 N3).
 *
 *   npm run seed:usda          regenerate src/lib/nutrition/data/usdaReferenceData.ts
 *   npm run seed:usda:check    fail if the committed file's fingerprint is stale
 *
 * What this is, and the rules it lives by (design: bloom-w43-nutrition-design.md
 * §3(d), §3.1, §4.7 N3):
 *
 *   • **Source.** USDA FoodData Central bulk downloads — Foundation Foods
 *     (2025-04-24 release) and SR Legacy (2018-04 release), from
 *     fdc.nal.usda.gov. No API key, no credentials. The zips are cached under
 *     the OS temp dir (override with USDA_FDC_CACHE) and re-downloaded only
 *     when absent. Extraction shells out to `unzip`.
 *   • **Licence.** FoodData Central is CC0 1.0 — registered in the evidence
 *     catalogue as source `usda-fooddata-central`, `productUseAllowed: true`.
 *     The licence-gate test (src/lib/nutrition/usdaReference.test.ts) re-checks
 *     every shipped entry against that registry; this script is not the gate.
 *   • **No invented numbers, ever.** Every nutrient value in the output is a
 *     number USDA published in the downloaded CSVs, read by this script. The
 *     pick list below pins each food by FDC id AND its exact USDA description;
 *     if upstream data changes either, generation fails loudly instead of
 *     silently shipping a different food. A pick whose record lacks any of
 *     the four core nutrients (energy, protein, carbohydrate, fat) fails too —
 *     some Foundation records are partial analytical panels (the 2019 oils,
 *     the stick butters, table salt), and one publishes a slightly negative
 *     carbohydrate-by-difference (ground lamb); for those staples the pick
 *     list names the SR Legacy record instead, which is the same rule a
 *     reviewer would apply by hand: Foundation first, SR Legacy when the
 *     Foundation record cannot ship, never a value from anywhere else.
 *   • **Energy selection.** Newer Foundation records publish energy only as
 *     Atwater factors. The shipped kcal is the first USDA-published value of:
 *     nutrient 1008 "Energy", then 2048 "Energy (Atwater Specific Factors)",
 *     then 2047 "Energy (Atwater General Factors)" — a choice among published
 *     values, documented here, never a computation.
 *   • **Curation.** ~100 global staple INGREDIENTS in their generic raw/dry
 *     form: grains, flours, legumes, dairy, eggs, meats, fish, oils, produce,
 *     nuts, seeds, basic pantry. Foundation + SR Legacy ONLY — Branded foods
 *     are excluded by design (label data is a different dataset's job), and
 *     no prepared dishes are included: this is an ingredients set, not a
 *     cuisine database, and it must never be dressed up as Indian dish data.
 *     The D1 extension (dishes foundation) adds Indian-kitchen spices,
 *     aromatics and staples under the same pinning rules — ingredients a
 *     recipe composes from, still never dish data.
 *   • **Servings.** Taken only where USDA publishes portion data
 *     (food_portion.csv): up to two portions per food, in USDA's order,
 *     labelled from the row itself (amount + unit/modifier/description) with
 *     the gram weight explicit. Foods without portion rows ship with no
 *     servings — an absent serving is honest; an invented one is not.
 *   • **Classification (P2).** Every pick also carries a food group and
 *     dietary-pattern identity flags (containsEgg / containsDairy /
 *     isFlesh / isFish), pinned per FDC id in CLASSIFICATION below. These
 *     are identity facts about the curated food itself — eggs and dairy
 *     are identifiable foods in this set — assigned here, at the data
 *     layer, so the plan composer filters patterns on ingredients and
 *     never guesses from a name at runtime. A pick with no classification
 *     entry fails generation loudly, exactly like a renamed pick.
 *   • **Fingerprint.** The output carries a SHA-256 over the canonicalised
 *     foods array (the evidence seed's canonicalisation, reused), so any
 *     hand-edit of the generated file is detectable by `--check` and by the
 *     test suite.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = resolve(root, "src/lib/nutrition/data/usdaReferenceData.ts");
const CHECK = process.argv.includes("--check");

/** Import a TypeScript module by repository-relative path (type stripping). */
function load(relativePath) {
  return import(pathToFileURL(resolve(root, relativePath)).href);
}

/* ------------------------------ the pick list ----------------------------- */

/**
 * The curation, pinned. `expect` is the food's exact USDA description: if a
 * future USDA release re-points an id or renames the food, generation stops
 * and a human re-checks the pick. Order here is the shipped order (grouped:
 * grains & flours, legumes, dairy, eggs, meats, fish, oils, vegetables,
 * fruits, nuts & seeds, pantry).
 */
const PICKS = [
  { fdcId: 2512381, dataType: "Foundation", expect: "Rice, white, long grain, unenriched, raw" },
  { fdcId: 2512380, dataType: "Foundation", expect: "Rice, brown, long grain, unenriched, raw" },
  { fdcId: 2710825, dataType: "Foundation", expect: "Rice, black, unenriched, raw" },
  { fdcId: 2346396, dataType: "Foundation", expect: "Oats, whole grain, rolled, old fashioned" },
  { fdcId: 2346397, dataType: "Foundation", expect: "Oats, whole grain, steel cut" },
  { fdcId: 2512379, dataType: "Foundation", expect: "Millet, whole grain" },
  { fdcId: 2710842, dataType: "Foundation", expect: "Sorghum, whole grain, white, dry, raw" },
  { fdcId: 2512378, dataType: "Foundation", expect: "Buckwheat, whole grain" },
  { fdcId: 168874, dataType: "SR Legacy", expect: "Quinoa, uncooked" },
  { fdcId: 170284, dataType: "SR Legacy", expect: "Barley, pearled, raw" },
  { fdcId: 168893, dataType: "SR Legacy", expect: "Wheat flour, whole-grain (Includes foods for USDA's Food Distribution Program)" },
  { fdcId: 168936, dataType: "SR Legacy", expect: "Wheat flour, white, all-purpose, enriched, unbleached" },
  { fdcId: 168867, dataType: "SR Legacy", expect: "Cornmeal, degermed, enriched, yellow" },
  { fdcId: 168886, dataType: "SR Legacy", expect: "Rye flour, medium" },
  { fdcId: 2644283, dataType: "Foundation", expect: "Lentils, dry" },
  { fdcId: 174284, dataType: "SR Legacy", expect: "Lentils, pink or red, raw" },
  { fdcId: 2644282, dataType: "Foundation", expect: "Chickpeas, (garbanzo beans, bengal gram), dry" },
  { fdcId: 173734, dataType: "SR Legacy", expect: "Beans, black, mature seeds, raw" },
  { fdcId: 175193, dataType: "SR Legacy", expect: "Beans, kidney, all types, mature seeds, raw" },
  { fdcId: 173745, dataType: "SR Legacy", expect: "Beans, navy, mature seeds, raw" },
  { fdcId: 175199, dataType: "SR Legacy", expect: "Beans, pinto, mature seeds, raw (Includes foods for USDA's Food Distribution Program)" },
  { fdcId: 174270, dataType: "SR Legacy", expect: "Soybeans, mature seeds, raw" },
  { fdcId: 172436, dataType: "SR Legacy", expect: "Pigeon peas (red gram), mature seeds, raw" },
  { fdcId: 174256, dataType: "SR Legacy", expect: "Mung beans, mature seeds, raw" },
  { fdcId: 174259, dataType: "SR Legacy", expect: "Mungo beans, mature seeds, raw" },
  { fdcId: 170419, dataType: "SR Legacy", expect: "Peas, green, raw" },
  { fdcId: 322892, dataType: "Foundation", expect: "Milk, whole, 3.25% milkfat, with added vitamin D" },
  { fdcId: 322559, dataType: "Foundation", expect: "Milk, nonfat, fluid, with added vitamin A and vitamin D (fat free or skim)" },
  { fdcId: 2259793, dataType: "Foundation", expect: "Yogurt, plain, whole milk" },
  { fdcId: 330137, dataType: "Foundation", expect: "Yogurt, Greek, plain, nonfat" },
  { fdcId: 328637, dataType: "Foundation", expect: "Cheese, cheddar" },
  { fdcId: 329370, dataType: "Foundation", expect: "Cheese, mozzarella, low moisture, part-skim" },
  { fdcId: 325036, dataType: "Foundation", expect: "Cheese, parmesan, grated" },
  { fdcId: 328841, dataType: "Foundation", expect: "Cheese, cottage, lowfat, 2% milkfat" },
  { fdcId: 323444, dataType: "Foundation", expect: "Cheese, ricotta, whole milk" },
  { fdcId: 173410, dataType: "SR Legacy", expect: "Butter, salted" },
  { fdcId: 171314, dataType: "SR Legacy", expect: "Butter, Clarified butter (ghee)" },
  { fdcId: 171287, dataType: "SR Legacy", expect: "Egg, whole, raw, fresh" },
  { fdcId: 172183, dataType: "SR Legacy", expect: "Egg, white, raw, fresh" },
  { fdcId: 172184, dataType: "SR Legacy", expect: "Egg, yolk, raw, fresh" },
  { fdcId: 2646170, dataType: "Foundation", expect: "Chicken, breast, boneless, skinless, raw" },
  { fdcId: 2646171, dataType: "Foundation", expect: "Chicken, thigh, boneless, skinless, raw" },
  { fdcId: 168608, dataType: "SR Legacy", expect: "Beef, grass-fed, ground, raw" },
  { fdcId: 2514745, dataType: "Foundation", expect: "Pork, ground, raw" },
  { fdcId: 2646168, dataType: "Foundation", expect: "Pork, loin, boneless, raw" },
  { fdcId: 174370, dataType: "SR Legacy", expect: "Lamb, ground, raw" },
  { fdcId: 2514747, dataType: "Foundation", expect: "Turkey, ground, 93% lean/ 7% fat, raw" },
  { fdcId: 2684441, dataType: "Foundation", expect: "Fish, salmon, Atlantic, farm raised, raw" },
  { fdcId: 2684444, dataType: "Foundation", expect: "Fish, cod, Atlantic, wild caught, raw" },
  { fdcId: 2684442, dataType: "Foundation", expect: "Fish, tilapia, farm raised, raw" },
  { fdcId: 333374, dataType: "Foundation", expect: "Fish, haddock, raw" },
  { fdcId: 334194, dataType: "Foundation", expect: "Fish, tuna, light, canned in water, drained solids" },
  { fdcId: 175179, dataType: "SR Legacy", expect: "Crustaceans, shrimp, raw" },
  { fdcId: 171413, dataType: "SR Legacy", expect: "Oil, olive, salad or cooking" },
  { fdcId: 330458, dataType: "Foundation", expect: "Oil, coconut" },
  { fdcId: 172336, dataType: "SR Legacy", expect: "Oil, canola" },
  { fdcId: 171411, dataType: "SR Legacy", expect: "Oil, soybean, salad or cooking" },
  { fdcId: 171410, dataType: "SR Legacy", expect: "Oil, peanut, salad or cooking" },
  { fdcId: 171025, dataType: "SR Legacy", expect: "Oil, sunflower, linoleic, (approx. 65%)" },
  { fdcId: 171016, dataType: "SR Legacy", expect: "Oil, sesame, salad or cooking" },
  { fdcId: 2346401, dataType: "Foundation", expect: "Potatoes, russet, without skin, raw" },
  { fdcId: 2346404, dataType: "Foundation", expect: "Sweet potatoes, orange flesh, without skin, raw" },
  { fdcId: 790646, dataType: "Foundation", expect: "Onions, yellow, raw" },
  { fdcId: 170457, dataType: "SR Legacy", expect: "Tomatoes, red, ripe, raw, year round average" },
  { fdcId: 2258586, dataType: "Foundation", expect: "Carrots, mature, raw" },
  { fdcId: 321900, dataType: "Foundation", expect: "Broccoli, raw" },
  { fdcId: 2685573, dataType: "Foundation", expect: "Cauliflower, raw" },
  { fdcId: 2346407, dataType: "Foundation", expect: "Cabbage, green, raw" },
  { fdcId: 2346406, dataType: "Foundation", expect: "Cucumber, with peel, raw" },
  { fdcId: 2710826, dataType: "Foundation", expect: "Corn, sweet, yellow and white kernels,  fresh, raw" },
  { fdcId: 168462, dataType: "SR Legacy", expect: "Spinach, raw" },
  { fdcId: 170427, dataType: "SR Legacy", expect: "Peppers, sweet, green, raw" },
  { fdcId: 170108, dataType: "SR Legacy", expect: "Peppers, sweet, red, raw" },
  { fdcId: 1750347, dataType: "Foundation", expect: "Mushrooms, white button" },
  { fdcId: 2346400, dataType: "Foundation", expect: "Beans, snap, green, raw" },
  { fdcId: 1104647, dataType: "Foundation", expect: "Garlic, raw" },
  { fdcId: 169231, dataType: "SR Legacy", expect: "Ginger root, raw" },
  { fdcId: 2685577, dataType: "Foundation", expect: "Eggplant, raw" },
  { fdcId: 173944, dataType: "SR Legacy", expect: "Bananas, raw" },
  { fdcId: 171688, dataType: "SR Legacy", expect: "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)" },
  { fdcId: 746771, dataType: "Foundation", expect: "Oranges, raw, navels" },
  { fdcId: 169910, dataType: "SR Legacy", expect: "Mangos, raw" },
  { fdcId: 327699, dataType: "Foundation", expect: "Strawberries, raw" },
  { fdcId: 174683, dataType: "SR Legacy", expect: "Grapes, red or green (European type, such as Thompson seedless), raw" },
  { fdcId: 171705, dataType: "SR Legacy", expect: "Avocados, raw, all commercial varieties" },
  { fdcId: 167746, dataType: "SR Legacy", expect: "Lemons, raw, without peel" },
  { fdcId: 167765, dataType: "SR Legacy", expect: "Watermelon, raw" },
  { fdcId: 169124, dataType: "SR Legacy", expect: "Pineapple, raw, all varieties" },
  { fdcId: 746773, dataType: "Foundation", expect: "Pears, raw, bartlett" },
  { fdcId: 2346393, dataType: "Foundation", expect: "Nuts, almonds, whole, raw" },
  { fdcId: 2346394, dataType: "Foundation", expect: "Nuts, walnuts, English, halves, raw" },
  { fdcId: 2515374, dataType: "Foundation", expect: "Nuts, cashew nuts, raw" },
  { fdcId: 172430, dataType: "SR Legacy", expect: "Peanuts, all types, raw" },
  { fdcId: 2515381, dataType: "Foundation", expect: "Seeds, sunflower seed, kernel, raw" },
  { fdcId: 2515380, dataType: "Foundation", expect: "Seeds, pumpkin seeds (pepitas), raw" },
  { fdcId: 169640, dataType: "SR Legacy", expect: "Honey" },
  { fdcId: 173468, dataType: "SR Legacy", expect: "Salt, table" },
  { fdcId: 334247, dataType: "Foundation", expect: "Sugars, granulated" },
  { fdcId: 173469, dataType: "SR Legacy", expect: "Vinegar, cider" },
  /* ---- D1 (dishes foundation): the Indian-kitchen extension. ----------
   * Spices, aromatics and staples a dish library composes from, added
   * under exactly the same rules as the original set: SR Legacy records
   * pinned by id + exact description, Foundation first where a record
   * exists (none of these has one). Wished-for items with NO record in
   * either download are NOT picked and never substituted — garam masala,
   * asafoetida, curry leaves, fenugreek leaves, jaggery, basmati rice,
   * chana dal as a distinct split record, drumstick (moringa) pods and
   * paneer (no defensible generic fresh-cheese record) are absent from
   * FoodData Central and stay absent here; the D1 report lists them.
   * Two form notes: mustard seed ships in FDC's ground form (the only
   * mustard-seed record), and split peas exist only as cooked records,
   * so neither whole mustard seed nor dry split peas is picked. */
  { fdcId: 172231, dataType: "SR Legacy", expect: "Spices, turmeric, ground" },
  { fdcId: 170923, dataType: "SR Legacy", expect: "Spices, cumin seed" },
  { fdcId: 170922, dataType: "SR Legacy", expect: "Spices, coriander seed" },
  { fdcId: 170929, dataType: "SR Legacy", expect: "Spices, mustard seed, ground" },
  { fdcId: 170932, dataType: "SR Legacy", expect: "Spices, pepper, red or cayenne" },
  { fdcId: 171319, dataType: "SR Legacy", expect: "Spices, chili powder" },
  { fdcId: 170924, dataType: "SR Legacy", expect: "Spices, curry powder" },
  { fdcId: 171324, dataType: "SR Legacy", expect: "Spices, fenugreek seed" },
  { fdcId: 170919, dataType: "SR Legacy", expect: "Spices, cardamom" },
  { fdcId: 171321, dataType: "SR Legacy", expect: "Spices, cloves, ground" },
  { fdcId: 171320, dataType: "SR Legacy", expect: "Spices, cinnamon, ground" },
  { fdcId: 170917, dataType: "SR Legacy", expect: "Spices, bay leaf" },
  { fdcId: 171323, dataType: "SR Legacy", expect: "Spices, fennel seed" },
  { fdcId: 170931, dataType: "SR Legacy", expect: "Spices, pepper, black" },
  { fdcId: 171330, dataType: "SR Legacy", expect: "Spices, poppy seed" },
  { fdcId: 169997, dataType: "SR Legacy", expect: "Coriander (cilantro) leaves, raw" },
  { fdcId: 173475, dataType: "SR Legacy", expect: "Spearmint, fresh" },
  { fdcId: 170497, dataType: "SR Legacy", expect: "Peppers, hot chili, green, raw" },
  { fdcId: 170106, dataType: "SR Legacy", expect: "Peppers, hot chili, red, raw" },
  { fdcId: 169260, dataType: "SR Legacy", expect: "Okra, raw" },
  { fdcId: 168393, dataType: "SR Legacy", expect: "Balsam-pear (bitter gourd), pods, raw" },
  { fdcId: 174288, dataType: "SR Legacy", expect: "Chickpea flour (besan)" },
  { fdcId: 169714, dataType: "SR Legacy", expect: "Rice flour, white, unenriched" },
  { fdcId: 168933, dataType: "SR Legacy", expect: "Semolina, unenriched" },
  { fdcId: 173758, dataType: "SR Legacy", expect: "Cowpeas, common (blackeyes, crowder, southern), mature seeds, raw" },
  { fdcId: 170150, dataType: "SR Legacy", expect: "Seeds, sesame seeds, whole, dried" },
  { fdcId: 170169, dataType: "SR Legacy", expect: "Nuts, coconut meat, raw" },
  { fdcId: 167763, dataType: "SR Legacy", expect: "Tamarinds, raw" },
  { fdcId: 172337, dataType: "SR Legacy", expect: "Oil, mustard" },
  /* ---- Dishes-expansion foundation: Kerala & South staples, plus the
   * international high-protein anchors the expansion waves compose
   * from. Same rules as every block above: pinned by id + exact
   * description, Foundation first where a record exists (the underripe
   * plantain). Searched in both downloads and NOT present — never
   * substituted: elephant yam (Amorphophallus; USDA's "Yam, raw" is
   * Dioscorea, a different genus), snake gourd, kokum, kudampuli
   * (Malabar tamarind), banana stem, curry leaves, skyr, and a distinct
   * unripe-mango record (only ripe-mango records exist; the ripe fruit
   * is already picked). Coconut milk is picked in its genuine raw form
   * (liquid expressed from grated meat and water) — the sweetened,
   * fortified beverage record is a different product and is not used.
   * Drumstick pods and leaves, long assumed absent, ARE in SR Legacy
   * and are picked below. Beef and pork records exist upstream but no
   * new ones are picked — a deliberate curation omission. */
  { fdcId: 169985, dataType: "SR Legacy", expect: "Cassava, raw" },
  { fdcId: 2710818, dataType: "Foundation", expect: "Plantains, underripe, raw" },
  { fdcId: 174687, dataType: "SR Legacy", expect: "Jackfruit, raw" },
  { fdcId: 170172, dataType: "SR Legacy", expect: "Nuts, coconut milk, raw (liquid expressed from grated meat and water)" },
  { fdcId: 169308, dataType: "SR Legacy", expect: "Taro, raw" },
  { fdcId: 170069, dataType: "SR Legacy", expect: "Waxgourd, (chinese preserving melon), raw" },
  { fdcId: 170483, dataType: "SR Legacy", expect: "Drumstick pods, raw" },
  { fdcId: 168416, dataType: "SR Legacy", expect: "Drumstick leaves, raw" },
  { fdcId: 172448, dataType: "SR Legacy", expect: "Tofu, firm, prepared with calcium sulfate and magnesium chloride (nigari)" },
  { fdcId: 174272, dataType: "SR Legacy", expect: "Tempeh" },
  { fdcId: 168410, dataType: "SR Legacy", expect: "Edamame, frozen, unprepared" },
  { fdcId: 171098, dataType: "SR Legacy", expect: "Turkey, whole, breast, meat only, raw" },
  { fdcId: 175139, dataType: "SR Legacy", expect: "Fish, sardine, Atlantic, canned in oil, drained solids with bone" },
  { fdcId: 175119, dataType: "SR Legacy", expect: "Fish, mackerel, Atlantic, raw" },
  /* ---- Protein-wave foundation (PW-1): the generic protein powders
   * the shake wave composes from. Both downloads were searched:
   * Foundation carries no protein-powder record at all; SR Legacy
   * carries three UNBRANDED beverage-powder records — whey isolate,
   * whey-based and soy-based — alongside branded ones (Abbott EAS and
   * the like), which are not picked, by the same rule that excludes
   * the whole Branded dataset. The isolate and the soy-based powder
   * are picked; the whey-based record fills the isolate's role at a
   * lower strength and is left out. Dried whey (171281/171283) is a
   * dairy ingredient at ~13% protein, not a protein powder, and is
   * not dressed up as one. */
  { fdcId: 173177, dataType: "SR Legacy", expect: "Beverages, Whey protein powder isolate" },
  { fdcId: 173181, dataType: "SR Legacy", expect: "Beverages, Protein powder soy based" },
];

/* --------------------- the pinned classification (P2) --------------------- */

/**
 * One food group per pick (the ICMR-NIN DGI-2024 group framework as
 * operationalised for the plan composer), plus the ingredient-identity
 * flags dietary patterns filter on. Groups follow each food's culinary
 * identity in this set: butter and ghee sit in fats_oils (their role in a
 * meal is fat) but keep containsDairy — they are milk-derived, and a vegan
 * pattern must exclude them; garlic and ginger are `other` (aromatics,
 * never a vegetable portion); meats, fish and pantry items are `other`,
 * with isFlesh / isFish carrying the pattern facts. Peas sit with the
 * pulses, where the pick list's own legume run places them.
 */
const cls = (group, flags = {}) => ({
  group,
  containsEgg: false,
  containsDairy: false,
  isFlesh: false,
  isFish: false,
  ...flags,
});
const DAIRY = { containsDairy: true };
const EGG = { containsEgg: true };
const FLESH = { isFlesh: true };
const FISH = { isFlesh: true, isFish: true };

const CLASSIFICATION = {
  // Cereals & grains (incl. flours and cornmeal)
  2512381: cls("cereals_grains"), 2512380: cls("cereals_grains"),
  2710825: cls("cereals_grains"), 2346396: cls("cereals_grains"),
  2346397: cls("cereals_grains"), 2512379: cls("cereals_grains"),
  2710842: cls("cereals_grains"), 2512378: cls("cereals_grains"),
  168874: cls("cereals_grains"), 170284: cls("cereals_grains"),
  168893: cls("cereals_grains"), 168936: cls("cereals_grains"),
  168867: cls("cereals_grains"), 168886: cls("cereals_grains"),
  // Pulses & legumes (dry)
  2644283: cls("pulses_legumes"), 174284: cls("pulses_legumes"),
  2644282: cls("pulses_legumes"), 173734: cls("pulses_legumes"),
  175193: cls("pulses_legumes"), 173745: cls("pulses_legumes"),
  175199: cls("pulses_legumes"), 174270: cls("pulses_legumes"),
  172436: cls("pulses_legumes"), 174256: cls("pulses_legumes"),
  174259: cls("pulses_legumes"), 170419: cls("pulses_legumes"),
  // Dairy (milk, yogurt, cheeses)
  322892: cls("dairy", DAIRY), 322559: cls("dairy", DAIRY),
  2259793: cls("dairy", DAIRY), 330137: cls("dairy", DAIRY),
  328637: cls("dairy", DAIRY), 329370: cls("dairy", DAIRY),
  325036: cls("dairy", DAIRY), 328841: cls("dairy", DAIRY),
  323444: cls("dairy", DAIRY),
  // Fats & oils (butter and ghee are milk-derived fats: dairy flag set)
  173410: cls("fats_oils", DAIRY), 171314: cls("fats_oils", DAIRY),
  171413: cls("fats_oils"), 330458: cls("fats_oils"),
  172336: cls("fats_oils"), 171411: cls("fats_oils"),
  171410: cls("fats_oils"), 171025: cls("fats_oils"),
  171016: cls("fats_oils"),
  // Eggs
  171287: cls("eggs", EGG), 172183: cls("eggs", EGG), 172184: cls("eggs", EGG),
  // Meat & poultry — group `other`, flesh flag carries the pattern fact
  2646170: cls("other", FLESH), 2646171: cls("other", FLESH),
  168608: cls("other", FLESH), 2514745: cls("other", FLESH),
  2646168: cls("other", FLESH), 174370: cls("other", FLESH),
  2514747: cls("other", FLESH),
  // Fish & seafood — flesh, and fish for the pescatarian pattern
  2684441: cls("other", FISH), 2684444: cls("other", FISH),
  2684442: cls("other", FISH), 333374: cls("other", FISH),
  334194: cls("other", FISH), 175179: cls("other", FISH),
  // Vegetables
  2346401: cls("vegetables"), 2346404: cls("vegetables"),
  790646: cls("vegetables"), 170457: cls("vegetables"),
  2258586: cls("vegetables"), 321900: cls("vegetables"),
  2685573: cls("vegetables"), 2346407: cls("vegetables"),
  2346406: cls("vegetables"), 2710826: cls("vegetables"),
  168462: cls("vegetables"), 170427: cls("vegetables"),
  170108: cls("vegetables"), 1750347: cls("vegetables"),
  2346400: cls("vegetables"), 2685577: cls("vegetables"),
  // Fruits
  173944: cls("fruits"), 171688: cls("fruits"), 746771: cls("fruits"),
  169910: cls("fruits"), 327699: cls("fruits"), 174683: cls("fruits"),
  171705: cls("fruits"), 167746: cls("fruits"), 167765: cls("fruits"),
  169124: cls("fruits"), 746773: cls("fruits"),
  // Nuts & seeds
  2346393: cls("nuts_seeds"), 2346394: cls("nuts_seeds"),
  2515374: cls("nuts_seeds"), 172430: cls("nuts_seeds"),
  2515381: cls("nuts_seeds"), 2515380: cls("nuts_seeds"),
  // Other — aromatics and pantry (honey, salt, sugar, vinegar, garlic, ginger)
  1104647: cls("other"), 169231: cls("other"),
  169640: cls("other"), 173468: cls("other"),
  334247: cls("other"), 173469: cls("other"),
  // D1 Indian-kitchen extension — spices and fresh aromatics are `other`
  // (identity facts, never a vegetable portion), like garlic and ginger;
  // the chillies are vegetables, where the sweet peppers already sit.
  172231: cls("other"), 170923: cls("other"),
  170922: cls("other"), 170929: cls("other"),
  170932: cls("other"), 171319: cls("other"),
  170924: cls("other"), 171324: cls("other"),
  170919: cls("other"), 171321: cls("other"),
  171320: cls("other"), 170917: cls("other"),
  171323: cls("other"), 170931: cls("other"),
  171330: cls("other"), 169997: cls("other"),
  173475: cls("other"),
  170497: cls("vegetables"), 170106: cls("vegetables"),
  169260: cls("vegetables"), 168393: cls("vegetables"),
  // D1 flours and staples — besan, rice flour and semolina sit with the
  // other flours in cereals_grains; cowpeas (lobia) with the pulses;
  // sesame and coconut with the nuts & seeds, FDC's own grouping for
  // coconut; tamarind is a fruit pod; mustard oil with the fats & oils.
  174288: cls("cereals_grains"), 169714: cls("cereals_grains"),
  168933: cls("cereals_grains"), 173758: cls("pulses_legumes"),
  170150: cls("nuts_seeds"), 170169: cls("nuts_seeds"),
  167763: cls("fruits"), 172337: cls("fats_oils"),
  // Dishes-expansion foundation — the Kerala & South staples are
  // vegetables where the kitchen treats them so: cassava, taro, wax
  // gourd, drumstick pods and drumstick leaves with the vegetables;
  // the underripe plantain with the potatoes (a starchy staple cooked
  // as a vegetable — the ripe banana stays a fruit). Jackfruit is a
  // fruit; coconut milk sits with the nuts & seeds, FDC's own grouping
  // for coconut. Tofu, tempeh and edamame are soy foods and sit with
  // the pulses (the green-peas precedent), flesh-free, so the pattern
  // filters treat them as the plant proteins they are. Turkey breast
  // is flesh; sardines and mackerel are fish.
  169985: cls("vegetables"), 2710818: cls("vegetables"),
  169308: cls("vegetables"), 170069: cls("vegetables"),
  170483: cls("vegetables"), 168416: cls("vegetables"),
  174687: cls("fruits"), 170172: cls("nuts_seeds"),
  172448: cls("pulses_legumes"), 174272: cls("pulses_legumes"),
  168410: cls("pulses_legumes"),
  171098: cls("other", FLESH),
  175139: cls("other", FISH), 175119: cls("other", FISH),
  // Protein-wave foundation (PW-1) — the two generic protein powders
  // are pantry supplements, not servings of dairy or pulses, so they
  // sit in `other` with the spices and pantry items; that band also
  // prices them honestly in the budget heuristic (a scoop of whey
  // costs nothing like a glass of milk). The identity flags still
  // tell the truth: whey is milk-derived, so containsDairy is set and
  // a vegan pattern excludes it; the soy-based powder is a plant
  // product and carries no animal flags.
  173177: cls("other", DAIRY),
  173181: cls("other"),
};

/* ------------------------------ source data ------------------------------- */

const DATASETS = [
  {
    label: "Foundation",
    dataType: "foundation_food",
    zip: "FoodData_Central_foundation_food_csv_2025-04-24.zip",
    url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2025-04-24.zip",
  },
  {
    label: "SR Legacy",
    dataType: "sr_legacy_food",
    zip: "FoodData_Central_sr_legacy_food_csv_2018-04.zip",
    url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip",
  },
];

/** Nutrient ids in the FDC CSVs (nutrient.csv), the values Bloom ships.
 *  The micronutrient panel (N-UI) rides the same rule as fibre and
 *  sodium: shipped only where the source row publishes it, held to the
 *  strict parser's per-100 g caps (see OPTIONAL_RANGES below). Ids
 *  verified against the datasets' own nutrient.csv: 1087 Calcium (nbr
 *  301), 1089 Iron (303), 1090 Magnesium (304), 1092 Potassium (306),
 *  1162 Vitamin C (401). */
const NUTRIENT_IDS = {
  proteinG: 1003,
  fatG: 1004,
  carbsG: 1005,
  fibreG: 1079,
  sodiumMg: 1093,
  potassiumMg: 1092,
  magnesiumMg: 1090,
  calciumMg: 1087,
  ironMg: 1089,
  vitaminCMg: 1162,
};
/** The optional nutrients and the parser's per-100 g cap for each — a
 *  published value outside its cap fails generation, like the core four. */
const OPTIONAL_RANGES = {
  fibreG: 100,
  sodiumMg: 40000,
  potassiumMg: 10000,
  magnesiumMg: 2000,
  calciumMg: 5000,
  ironMg: 1000,
  vitaminCMg: 5000,
};
/** Energy is a choice among USDA-published values, in this order. */
const ENERGY_IDS = [1008, 2048, 2047];

/** Minimal RFC 4180 CSV reader — the FDC files are plain quoted CSV. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const head = rows[0];
  return rows
    .slice(1)
    .filter((r) => r.length === head.length)
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

async function ensureDataset(cacheRoot, dataset) {
  const dir = join(cacheRoot, dataset.zip.replace(/\.zip$/, ""));
  if (existsSync(join(dir, "food.csv"))) return dir;
  mkdirSync(cacheRoot, { recursive: true });
  const zipPath = join(cacheRoot, dataset.zip);
  if (!existsSync(zipPath)) {
    console.log(`downloading ${dataset.url}`);
    const res = await fetch(dataset.url);
    if (!res.ok) throw new Error(`download failed for ${dataset.url}: HTTP ${res.status}`);
    writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  }
  execFileSync("unzip", ["-o", "-q", zipPath, "-d", cacheRoot], { stdio: "inherit" });
  if (!existsSync(join(dir, "food.csv"))) throw new Error(`extraction did not produce ${dir}`);
  return dir;
}

/* ------------------------------- extraction ------------------------------- */

function amountText(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : String(n);
}

/**
 * A serving label built only from the portion row's own text: the amount,
 * then the modifier (SR Legacy's carrier of meaning) or the measure unit
 * (Foundation's), then the portion description when one exists.
 */
function servingLabel(portion, unitName) {
  const parts = [];
  const amt = amountText(portion.amount);
  if (amt) parts.push(amt);
  if (portion.modifier) parts.push(portion.modifier);
  else if (unitName && unitName !== "undetermined") parts.push(unitName);
  let label = parts.join(" ");
  if (portion.portion_description) {
    label = label ? `${label}, ${portion.portion_description}` : portion.portion_description;
  }
  return label.trim();
}

function buildServings(portionRows, units) {
  const out = [];
  const seen = new Set();
  const sorted = [...portionRows].sort((a, b) => Number(a.seq_num) - Number(b.seq_num));
  for (const portion of sorted) {
    const grams = Number(portion.gram_weight);
    if (!Number.isFinite(grams) || grams < 0.1 || grams > 2000) continue;
    const label = servingLabel(portion, units.get(portion.measure_unit_id));
    if (!label || label.length > 60 || seen.has(label)) continue;
    seen.add(label);
    out.push({ label, grams });
    if (out.length === 2) break;
  }
  return out;
}

function extractFood(pick, tables) {
  const { foods, nutrients, portions, units } = tables;
  const row = foods.get(String(pick.fdcId));
  if (!row) throw new Error(`pick ${pick.fdcId}: no such food in the ${pick.dataType} download`);
  const expectedType = pick.dataType === "Foundation" ? "foundation_food" : "sr_legacy_food";
  if (row.data_type !== expectedType) {
    throw new Error(`pick ${pick.fdcId}: data_type is "${row.data_type}", expected "${expectedType}"`);
  }
  if (row.description !== pick.expect) {
    throw new Error(
      `pick ${pick.fdcId}: description changed upstream.\n  expected: ${pick.expect}\n  found:    ${row.description}`,
    );
  }
  const values = nutrients.get(String(pick.fdcId)) ?? new Map();
  const energyId = ENERGY_IDS.find((id) => values.has(id));
  const per100g = {
    kcal: energyId === undefined ? undefined : values.get(energyId),
    proteinG: values.get(NUTRIENT_IDS.proteinG),
    carbsG: values.get(NUTRIENT_IDS.carbsG),
    fatG: values.get(NUTRIENT_IDS.fatG),
  };
  for (const [key, v] of Object.entries(per100g)) {
    if (v === undefined) {
      throw new Error(`pick ${pick.fdcId} (${pick.expect}): no published ${key} value — record is incomplete`);
    }
  }
  // The parser's sane range, both bounds: a published value outside it is
  // not shippable as-is (USDA's carbohydrate-by-difference can come out
  // slightly negative when a record's components sum over 100 — the ground
  // lamb Foundation record does exactly that, which is why its pick names
  // the SR Legacy record instead).
  const inRange = (v, max) => Number.isFinite(v) && v >= 0 && v <= max;
  if (!inRange(per100g.kcal, 2000) || !inRange(per100g.proteinG, 100) ||
      !inRange(per100g.carbsG, 100) || !inRange(per100g.fatG, 100)) {
    throw new Error(`pick ${pick.fdcId} (${pick.expect}): core value outside the parser's sane range`);
  }
  for (const [key, cap] of Object.entries(OPTIONAL_RANGES)) {
    const id = NUTRIENT_IDS[key];
    if (!values.has(id)) continue;
    const value = values.get(id);
    if (!inRange(value, cap)) {
      throw new Error(`pick ${pick.fdcId} (${pick.expect}): ${key} outside the parser's sane range`);
    }
    per100g[key] = value;
  }
  const classification = CLASSIFICATION[pick.fdcId];
  if (!classification) {
    throw new Error(
      `pick ${pick.fdcId} (${pick.expect}): no pinned classification — classify it in CLASSIFICATION before shipping`,
    );
  }
  return {
    id: `usda-${pick.fdcId}`,
    name: row.description,
    per100g,
    servings: buildServings(portions.get(String(pick.fdcId)) ?? [], units),
    provenance: {
      kind: "usda",
      sourceId: String(pick.fdcId),
      dataType: pick.dataType,
      label: "USDA FoodData Central",
    },
    classification,
  };
}

async function generate() {
  const cacheRoot = process.env.USDA_FDC_CACHE ?? join(tmpdir(), "bloom-fdc-cache");
  const tablesByLabel = new Map();
  for (const dataset of DATASETS) {
    const dir = await ensureDataset(cacheRoot, dataset);
    const foods = new Map();
    for (const f of parseCsv(readFileSync(join(dir, "food.csv"), "utf8"))) {
      if (f.data_type === dataset.dataType) foods.set(f.fdc_id, f);
    }
    const wanted = new Set(
      PICKS.filter((p) => p.dataType === dataset.label).map((p) => String(p.fdcId)),
    );
    const nutrients = new Map();
    for (const r of parseCsv(readFileSync(join(dir, "food_nutrient.csv"), "utf8"))) {
      if (!wanted.has(r.fdc_id) || r.amount === "") continue;
      const nutrientId = Number(r.nutrient_id);
      if (!nutrients.has(r.fdc_id)) nutrients.set(r.fdc_id, new Map());
      const byNutrient = nutrients.get(r.fdc_id);
      if (!byNutrient.has(nutrientId)) byNutrient.set(nutrientId, Number(r.amount));
    }
    const units = new Map(
      parseCsv(readFileSync(join(dir, "measure_unit.csv"), "utf8")).map((u) => [u.id, u.name]),
    );
    const portions = new Map();
    for (const p of parseCsv(readFileSync(join(dir, "food_portion.csv"), "utf8"))) {
      if (!wanted.has(p.fdc_id)) continue;
      if (!portions.has(p.fdc_id)) portions.set(p.fdc_id, []);
      portions.get(p.fdc_id).push(p);
    }
    tablesByLabel.set(dataset.label, { foods, nutrients, portions, units });
  }

  const foods = PICKS.map((pick) => extractFood(pick, tablesByLabel.get(pick.dataType)));
  const { canonicalise } = await load("src/lib/vitalis/evidence/seed/canonical.ts");
  const fingerprint = createHash("sha256").update(canonicalise(foods), "utf8").digest("hex");
  const retrievedOn = new Date().toISOString().slice(0, 10);

  const lines = [
    "/**",
    " * GENERATED by scripts/nutrition-usda-reference.mjs — do not edit by hand.",
    " * Regenerate with `npm run seed:usda`; verify with `npm run seed:usda:check`.",
    " *",
    " * Source: USDA FoodData Central bulk downloads — Foundation Foods",
    " * (2025-04-24 release) and SR Legacy (2018-04 release), fdc.nal.usda.gov.",
    " * Licence: CC0 1.0 (evidence catalogue source `usda-fooddata-central`).",
    " * Every nutrient value below is a value USDA published for that food,",
    " * per 100 g; fibre, sodium and the micronutrient panel (potassium,",
    " * magnesium, calcium, iron, vitamin C) appear only where the source",
    " * row has them — absent means not reported, never zero.",
    " * Each entry also carries a food group + dietary-pattern classification,",
    " * pinned per FDC id in the generator — identity facts about the curated",
    " * food, not values read from USDA's tables.",
    " */",
    "",
    `export const USDA_REFERENCE_RETRIEVED_ON = ${JSON.stringify(retrievedOn)};`,
    "",
    "/** SHA-256 over the canonicalised foods array (see the generator). */",
    `export const USDA_REFERENCE_FINGERPRINT = ${JSON.stringify(fingerprint)};`,
    "",
    "/** The reference foods, raw — read them through `../usdaReference`,",
    " *  which parses every entry with the strict N1 parser. */",
    "export const USDA_REFERENCE_FOODS_RAW: readonly unknown[] = [",
    ...foods.map((food) => `  ${JSON.stringify(food)},`),
    "];",
    "",
  ];
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, lines.join("\n"));
  console.log(`wrote ${OUT_FILE}`);
  console.log(`foods: ${foods.length}  fingerprint: sha256:${fingerprint}`);
}

async function check() {
  const data = await load("src/lib/nutrition/data/usdaReferenceData.ts");
  const { canonicalise } = await load("src/lib/vitalis/evidence/seed/canonical.ts");
  // The fingerprint is over the canonicalised foods; the raw array in the
  // data file is exactly the Food shape the generator emitted, and the test
  // suite proves every entry survives the strict N1 parser unchanged — so
  // hashing the raw array here hashes the same canonical text.
  const raw = data.USDA_REFERENCE_FOODS_RAW;
  if (raw.length !== PICKS.length) {
    console.error(`check failed: data file holds ${raw.length} foods, the pick list has ${PICKS.length}`);
    process.exit(1);
  }
  // The classification table must cover exactly the pick list — no pick
  // unclassified, no classification pinned to a food that is not shipped.
  const pickIds = new Set(PICKS.map((p) => String(p.fdcId)));
  for (const id of pickIds) {
    if (!CLASSIFICATION[Number(id)]) {
      console.error(`check failed: pick ${id} has no pinned classification`);
      process.exit(1);
    }
  }
  for (const id of Object.keys(CLASSIFICATION)) {
    if (!pickIds.has(id)) {
      console.error(`check failed: classification pinned for ${id}, which is not a pick`);
      process.exit(1);
    }
  }
  for (const food of raw) {
    if (!food.classification || !food.classification.group) {
      console.error(`check failed: ${food.id} ships without a classification`);
      process.exit(1);
    }
  }
  const fingerprint = createHash("sha256").update(canonicalise(raw), "utf8").digest("hex");
  if (fingerprint !== data.USDA_REFERENCE_FINGERPRINT) {
    console.error("check failed: fingerprint mismatch — the data file was edited or is stale.");
    console.error(`  stored:   ${data.USDA_REFERENCE_FINGERPRINT}`);
    console.error(`  computed: ${fingerprint}`);
    process.exit(1);
  }
  console.log(`check ok: ${raw.length} foods, fingerprint sha256:${fingerprint}`);
}

if (CHECK) await check();
else await generate();
