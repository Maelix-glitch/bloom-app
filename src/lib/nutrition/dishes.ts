/**
 * Nutrition — dishes (D1, dishes foundation).
 *
 * A Dish is a RECIPE: a named set of ingredient lines over the USDA
 * reference foods, with method steps. A dish carries NO nutrient values
 * of its own — its nutrition exists only as a computation,
 * `dishNutrients`, summing its lines through the same math the log uses.
 * That is what keeps dishes licence-clean and honest: no IFCT/INDB
 * values (no written grant exists yet), nothing copied from a cookbook's
 * nutrition panel, nothing hand-typed. The provenance kind is `recipe`
 * and its label says where the numbers come from: "Built from USDA
 * ingredient data".
 *
 * A dish's dietary patterns are likewise COMPUTED, never asserted: a
 * dish suits a pattern exactly when every one of its ingredient lines
 * suits it under the plan composer's existing pattern rule
 * (`patternAllowsClassification` over each food's data-layer
 * classification). A line whose food Bloom has not classified makes the
 * dish suit nothing — an unverifiable claim is not made.
 *
 * The budget tier is an ESTIMATE from a stated heuristic (below), never
 * a priced fact; surfaces that show it must label it as an estimate.
 */

import type { EquipmentItem } from "@/lib/vitalis/domain/profile";
import { EQUIPMENT_ITEMS } from "@/lib/vitalis/domain/profile";
import type { LabelledNutrients } from "./labels";
import { nutrientsForGrams, sumNutrients } from "./math";
import { patternAllowsClassification, type PlanPattern } from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food, FoodGroup, FoodProvenance } from "./types";

export const RECIPE_PROVENANCE_LABEL = "Built from USDA ingredient data";

export type DishCategory =
  | "main"
  | "side"
  | "chutney"
  | "raita"
  | "bread"
  | "rice"
  | "snack"
  | "breakfast"
  | "dessert"
  | "drink"
  | "shake";

export const DISH_CATEGORIES: readonly DishCategory[] = [
  "main",
  "side",
  "chutney",
  "raita",
  "bread",
  "rice",
  "snack",
  "breakfast",
  "dessert",
  "drink",
  "shake",
];

export interface DishLine {
  /** A USDA reference food id (`usda-<fdcId>`) — reference foods only. */
  foodId: string;
  /** Grams of the food in the WHOLE recipe (all servings together). */
  grams: number;
}

export interface Dish {
  id: string;
  name: { en: string; hindi: string };
  category: DishCategory;
  /** Servings the recipe's lines make. */
  servings: number;
  lines: DishLine[];
  /** Short method steps, in order. */
  method: string[];
  timeMinutes: number;
  /** Estimated ingredient-cost tier, 1 (everyday) to 3 (rich) — see the
   *  heuristic at `computeBudgetTier`; an estimate, never a price. */
  budgetTier: 1 | 2 | 3;
  /** True when this is a deliberately boosted variant of a plainer dish. */
  enriched: boolean;
  /** The boost, stated in words ("Greek yogurt instead of curd, plus
   *  50 g extra paneer"). Required when `enriched` is true — an
   *  unstated boost is not a claim Bloom makes. */
  enrichment?: string;
  /** The cuisine the dish belongs to, as a free-form tag. The shipped
   *  library uses exactly three values — "india", "kerala" and
   *  "international" — and every library dish carries one (pinned in
   *  dishLibrary.test.ts); the field stays a free string so stored
   *  user dishes may name finer cuisines ("north-indian"). */
  cuisine?: string;
  /** Kitchen equipment the method needs (spec §10.4). Every shipped
   *  dish carries it, pinned by the §10.4 tagging pass: the value is
   *  DERIVED from the dish's own method text by `deriveDishTags`
   *  (./dishTags) and written by scripts/nutrition-dish-tags.mjs —
   *  never hand-typed, and --check proves pin == derivation. The
   *  field stays optional because a stored user dish may not carry
   *  it; for those, `dishPreparationNeeds` answers conservatively. */
  equipment?: readonly EquipmentItem[];
  /** True when the dish needs no cooking at all. Same status as
   *  `equipment`: pinned per shipped dish by the §10.4 pass (present
   *  only when true), absent on unpinned user dishes. */
  noCook?: boolean;
}

/** What making a dish actually takes, as the plan's kitchen gates
 *  (§10) need to know it: the equipment, whether it cooks at all, and
 *  how many method steps it runs. THE one function those gates read —
 *  the §10.4 pass pinned real values for every shipped dish (see
 *  ./dishTags), so the gates judge the library by its methods.
 *
 *  The unpinned default is deliberately conservative, in the spec's
 *  stated direction: an untagged dish (a stored user dish) is assumed
 *  to need a stove and to need cooking, so a "no cooking" or
 *  "no stove" answer can exclude it — it can never be wrongly
 *  INCLUDED on a guess. */
export interface DishPreparationNeeds {
  readonly equipment: readonly EquipmentItem[];
  readonly noCook: boolean;
  readonly methodSteps: number;
}

export function dishPreparationNeeds(dish: Dish): DishPreparationNeeds {
  return {
    equipment: dish.equipment ?? ["stove"],
    noCook: dish.noCook ?? false,
    methodSteps: dish.method.length,
  };
}

/** The provenance a dish's computed nutrients travel under. */
export function dishProvenance(dish: Dish): FoodProvenance {
  return { kind: "recipe", sourceId: dish.id, label: RECIPE_PROVENANCE_LABEL };
}

/* ------------------------------ nutrients ------------------------------- */

function foodById(foods: readonly Food[], dish: Dish, foodId: string): Food {
  const food = foods.find((f) => f.id === foodId);
  if (!food) throw new Error(`dish ${dish.id}: line names unknown food ${foodId}`);
  return food;
}

/**
 * Per-serving nutrients for a dish, computed — the ONLY way a dish's
 * numbers exist. Each line contributes its food's per-100 g values at
 * (line grams ÷ servings) through the log's own scaling, and the results
 * sum under the log's absence rule (an optional nutrient appears only
 * when at least one ingredient reports it). Throws on a line naming a
 * food outside the given set: a dish with an unresolvable line is a
 * data error, and it fails loudly rather than silently under-counting.
 */
export function dishNutrients(
  dish: Dish,
  foods: readonly Food[] = USDA_REFERENCE_FOODS,
): LabelledNutrients {
  const parts = dish.lines.map((line) =>
    nutrientsForGrams(foodById(foods, dish, line.foodId).per100g, line.grams / dish.servings),
  );
  return { nutrients: sumNutrients(parts), label: RECIPE_PROVENANCE_LABEL, estimate: false };
}

/* ------------------------------ patterns -------------------------------- */

const ALL_PATTERNS: readonly PlanPattern[] = [
  "vegetarian",
  "eggetarian",
  "vegan",
  "ovo_vegetarian",
  "pescatarian",
  "non_vegetarian",
];

/**
 * The dietary patterns a dish suits, derived from its ingredient lines
 * via the existing pattern rule: a dish suits a pattern exactly when
 * EVERY line's food does. A line whose food carries no classification
 * (Bloom does not claim to know what is in it) makes the dish suit no
 * pattern at all. Throws on an unknown food id, like `dishNutrients`.
 */
export function dishPatterns(
  dish: Dish,
  foods: readonly Food[] = USDA_REFERENCE_FOODS,
): PlanPattern[] {
  const lineFoods = dish.lines.map((line) => foodById(foods, dish, line.foodId));
  if (lineFoods.some((f) => !f.classification)) return [];
  return ALL_PATTERNS.filter((pattern) =>
    lineFoods.every((f) => patternAllowsClassification(pattern, f.classification!)),
  );
}

/* ---------------------------- budget estimate ---------------------------- */

/**
 * The budget heuristic — an ESTIMATE, stated so it can be argued with.
 * Each food group carries a rough per-gram ingredient-cost band, in
 * approximate ₹ per gram at 2026 urban-Indian retail (atta ≈ ₹60/kg,
 * dals ≈ ₹120/kg, eggs ≈ ₹7 each, almonds ≈ ₹800/kg, oils ≈ ₹200/kg,
 * spices dear per gram but used by the pinch — banded with the other
 * aromatics). A dish's estimated cost is the sum over its lines of
 * grams × band, divided by servings; the tier is that per-serving
 * estimate bucketed: ≤ ₹20 → 1, ≤ ₹45 → 2, above → 3. Bands are group
 * averages — cheese costs more than milk, spinach less than capsicum —
 * so a tier is a budgeting hint, never a priced fact.
 *
 * Re-banded 2026-11-19 (plan method 13) — the first banding priced
 * three things by the company they kept, not by what they are:
 *  · FLESH and FISH sit in the residual "other" group, so chicken
 *    and fish were priced at the almond band (0.8 ₹/g = ₹800/kg).
 *    They now carry their own blended bands: flesh 0.25 ₹/g
 *    (≈ ₹250/kg — whole chicken and the common cuts averaged;
 *    boneless breast runs dearer, mince and whole birds cheaper),
 *    fish 0.35 ₹/g (≈ ₹350/kg for the common table fish).
 *  · The PROTEIN POWDERS (the same census rule `isProteinPowder`
 *    states in plan.ts) were also in "other" at 0.8; a powder is a
 *    supplement, priced as one: 1.5 ₹/g (whey isolate ≈ ₹2,000/kg
 *    and soy isolate ≈ ₹1,000/kg, averaged). Only nine dishes carry
 *    a powder line, so this band barely moves the census — it is
 *    stated for honesty, not effect.
 *  · NUTS_SEEDS was the almond price (0.8) applied to peanuts and
 *    sesame too; the blended group average is 0.5 ₹/g. The residual
 *    "other" group (honey, sugar, soy drinks, yeast, sweeteners)
 *    likewise inherited 0.8; its blended average is 0.3 ₹/g.
 * Measured effect on the shipped library: the protein wave's tiers
 * move from 3 / 122 / 174 to 8 / 151 / 140 — the wave is no longer
 * 58% tier 3, and every dietary pattern has servable protein-wave
 * dishes at tiers 1 and 2 (census pinned in planDishFirst.test.ts).
 */
const COST_BAND_PER_GRAM: Record<FoodGroup, number> = {
  cereals_grains: 0.06,
  pulses_legumes: 0.12,
  vegetables: 0.06,
  fruits: 0.12,
  dairy: 0.07,
  eggs: 0.15,
  nuts_seeds: 0.5,
  fats_oils: 0.2,
  other: 0.3,
};

/** The flesh band: chicken and meat priced as themselves — see the
 *  re-banding note above. Judged on the classification's flesh flag,
 *  never on the group the food was filed under. */
const COST_BAND_FLESH_PER_GRAM = 0.25;
/** The fish band — as above, on the fish flag (a fish food usually
 *  carries the flesh flag too; fish is judged first). */
const COST_BAND_FISH_PER_GRAM = 0.35;
/** The protein-powder band — the supplement price, on the same
 *  census rule the plan's powder test states. */
const COST_BAND_PROTEIN_POWDER_PER_GRAM = 1.5;

/** The per-gram band one food is priced at: identity first (fish,
 *  flesh, protein powder), the food's group band otherwise. An
 *  unclassified food (a user's own) prices at the residual band —
 *  the heuristic claims nothing about what it is. */
function costBandForFood(food: Food): number {
  const cls = food.classification;
  if (!cls) return COST_BAND_PER_GRAM.other;
  if (cls.isFish) return COST_BAND_FISH_PER_GRAM;
  if (cls.isFlesh) return COST_BAND_FLESH_PER_GRAM;
  if (cls.group === "other" && food.per100g.proteinG >= 40) {
    return COST_BAND_PROTEIN_POWDER_PER_GRAM;
  }
  return COST_BAND_PER_GRAM[cls.group];
}

/** Per-serving ₹ ceilings for budget tiers 1 and 2 (tier 3 is above
 *  the second). Exported so the assessment's budget question quotes
 *  the same numbers the heuristic buckets by — never a forked copy. */
export const BUDGET_TIER_1_MAX_PER_SERVING = 20;
export const BUDGET_TIER_2_MAX_PER_SERVING = 45;

/** The estimated ingredient cost of one serving, in ₹ (heuristic above). */
export function dishCostPerServingEstimate(
  dish: Dish,
  foods: readonly Food[] = USDA_REFERENCE_FOODS,
): number {
  let total = 0;
  for (const line of dish.lines) {
    const food = foodById(foods, dish, line.foodId);
    total += line.grams * costBandForFood(food);
  }
  return total / dish.servings;
}

/** The budget tier the heuristic assigns a dish (1–3). */
export function computeBudgetTier(
  dish: Dish,
  foods: readonly Food[] = USDA_REFERENCE_FOODS,
): 1 | 2 | 3 {
  const perServing = dishCostPerServingEstimate(dish, foods);
  if (perServing <= BUDGET_TIER_1_MAX_PER_SERVING) return 1;
  if (perServing <= BUDGET_TIER_2_MAX_PER_SERVING) return 2;
  return 3;
}

/* ------------------------------- parsing -------------------------------- */

/**
 * Strict parsing, the same discipline as the food parser (parse.ts):
 * read only the named fields, validate every value against a sane
 * range, and DROP a malformed dish outright — a parser never repairs a
 * value by inventing one.
 */

export const MAX_DISHES = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function numIn(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return null;
  }
  return value;
}

function parseDishLine(raw: unknown): DishLine | null {
  if (!isRecord(raw)) return null;
  const foodId = text(raw["foodId"], 80);
  const grams = numIn(raw["grams"], 0.1, 5000);
  if (!foodId || grams === null) return null;
  return { foodId, grams };
}

export function parseDish(raw: unknown): Dish | null {
  if (!isRecord(raw)) return null;
  const id = text(raw["id"], 80);
  if (!id) return null;
  if (!isRecord(raw["name"])) return null;
  const en = text(raw["name"]["en"], 120);
  const hindi = text(raw["name"]["hindi"], 120);
  if (!en || !hindi) return null;
  const category =
    typeof raw["category"] === "string" &&
    (DISH_CATEGORIES as readonly string[]).includes(raw["category"])
      ? (raw["category"] as DishCategory)
      : null;
  if (!category) return null;
  const servings = numIn(raw["servings"], 1, 50);
  if (servings === null || !Number.isInteger(servings)) return null;
  if (!Array.isArray(raw["lines"]) || raw["lines"].length === 0 || raw["lines"].length > 40) {
    return null;
  }
  const lines: DishLine[] = [];
  for (const rawLine of raw["lines"]) {
    const line = parseDishLine(rawLine);
    if (!line) return null;
    lines.push(line);
  }
  if (!Array.isArray(raw["method"]) || raw["method"].length === 0 || raw["method"].length > 30) {
    return null;
  }
  const method: string[] = [];
  for (const step of raw["method"]) {
    const s = text(step, 300);
    if (!s) return null;
    method.push(s);
  }
  const timeMinutes = numIn(raw["timeMinutes"], 1, 1440);
  if (timeMinutes === null || !Number.isInteger(timeMinutes)) return null;
  const budgetTier = raw["budgetTier"];
  if (budgetTier !== 1 && budgetTier !== 2 && budgetTier !== 3) return null;
  if (typeof raw["enriched"] !== "boolean") return null;
  const enriched = raw["enriched"];
  const enrichment = text(raw["enrichment"], 200);
  /* An enriched dish must state its boost — the claim is the statement. */
  if (enriched && !enrichment) return null;
  const dish: Dish = {
    id,
    name: { en, hindi },
    category,
    servings,
    lines,
    method,
    timeMinutes,
    budgetTier,
    enriched,
  };
  if (enriched) dish.enrichment = enrichment;
  /* The cuisine tag is optional metadata: preserved when a dish carries
   *  a usable one, absent otherwise — absence is not an error. */
  const cuisine = text(raw["cuisine"], 60);
  if (cuisine) dish.cuisine = cuisine;
  /* Preparation tags (§10.4) are optional the same way: preserved when
   *  a dish carries valid ones — equipment values must exist in the
   *  vocabulary, noCook only when literally true — absent otherwise.
   *  An explicitly EMPTY equipment list is a carried value, not an
   *  absence: it is the §10.4 pin for a dish whose method needs no
   *  equipment at all (dish-fruit-chaat), and dropping it would hand
   *  the dish the conservative stove default on every round trip. */
  if (Array.isArray(raw["equipment"])) {
    const equipment = raw["equipment"].filter(
      (item): item is EquipmentItem =>
        typeof item === "string" && (EQUIPMENT_ITEMS as readonly string[]).includes(item),
    );
    dish.equipment = [...new Set(equipment)];
  }
  if (raw["noCook"] === true) dish.noCook = true;
  return dish;
}

/** Parse a dish list: malformed dishes drop, valid ones survive. */
export function parseDishList(raw: unknown): Dish[] {
  if (!Array.isArray(raw)) return [];
  const out: Dish[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const dish = parseDish(item);
    if (!dish || seen.has(dish.id)) continue;
    seen.add(dish.id);
    out.push(dish);
    if (out.length >= MAX_DISHES) break;
  }
  return out;
}

/* ------------------------------ validation ------------------------------ */

/**
 * Completeness problems for a dish against a food set — the checks a
 * shipped dish must pass that parsing alone cannot make (a parser
 * cannot know which food ids exist). Empty array = complete. An
 * unknown line is a loud failure here, in tests, rather than a shrug
 * on a screen later.
 */
export function validateDish(
  dish: Dish,
  foods: readonly Food[] = USDA_REFERENCE_FOODS,
): string[] {
  const problems: string[] = [];
  const byId = new Map(foods.map((f) => [f.id, f]));
  const seenLines = new Set<string>();
  for (const line of dish.lines) {
    const food = byId.get(line.foodId);
    if (!food) {
      problems.push(`line names unknown food ${line.foodId}`);
      continue;
    }
    if (seenLines.has(line.foodId)) problems.push(`duplicate line for ${line.foodId}`);
    seenLines.add(line.foodId);
    if (!food.classification) {
      problems.push(`line food ${line.foodId} is unclassified — patterns and budget cannot be derived`);
    }
  }
  if (dish.enriched && !dish.enrichment) problems.push("enriched dish does not state its boost");
  if (problems.length === 0) {
    const computed = computeBudgetTier(dish, foods);
    if (computed !== dish.budgetTier) {
      problems.push(`stored budgetTier ${dish.budgetTier} disagrees with the heuristic's ${computed}`);
    }
  }
  return problems;
}
