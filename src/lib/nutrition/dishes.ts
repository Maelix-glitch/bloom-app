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
  | "drink";

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
 */
const COST_BAND_PER_GRAM: Record<FoodGroup, number> = {
  cereals_grains: 0.06,
  pulses_legumes: 0.12,
  vegetables: 0.06,
  fruits: 0.12,
  dairy: 0.07,
  eggs: 0.15,
  nuts_seeds: 0.8,
  fats_oils: 0.2,
  other: 0.8,
};

const TIER_1_MAX_PER_SERVING = 20;
const TIER_2_MAX_PER_SERVING = 45;

/** The estimated ingredient cost of one serving, in ₹ (heuristic above). */
export function dishCostPerServingEstimate(
  dish: Dish,
  foods: readonly Food[] = USDA_REFERENCE_FOODS,
): number {
  let total = 0;
  for (const line of dish.lines) {
    const food = foodById(foods, dish, line.foodId);
    const band = COST_BAND_PER_GRAM[food.classification?.group ?? "other"];
    total += line.grams * band;
  }
  return total / dish.servings;
}

/** The budget tier the heuristic assigns a dish (1–3). */
export function computeBudgetTier(
  dish: Dish,
  foods: readonly Food[] = USDA_REFERENCE_FOODS,
): 1 | 2 | 3 {
  const perServing = dishCostPerServingEstimate(dish, foods);
  if (perServing <= TIER_1_MAX_PER_SERVING) return 1;
  if (perServing <= TIER_2_MAX_PER_SERVING) return 2;
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
