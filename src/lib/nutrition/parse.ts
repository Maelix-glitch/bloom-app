/**
 * Nutrition — strict parsers (design §4.1/§4.8).
 *
 * Same discipline as the Assessment parser: read only the named fields (so
 * unknown fields are dropped by construction), validate every value against
 * a sane range, and DROP a malformed Food/LogEntry outright — a parser never
 * repairs a value by inventing one. Optional nutrients survive only when
 * they are genuinely present and valid; absent stays absent, never zero.
 */

import { PREPARATION_STATES } from "./preparation";
import {
  MEALS,
  type Amount,
  type CoachEstimateProvenance,
  type EntryProvenance,
  type EntrySource,
  type EstimateSnapshot,
  type Food,
  type FoodClassification,
  type FoodGroup,
  type FoodProvenance,
  type FoodProvenanceKind,
  type FoodServing,
  type LogEntry,
  type Meal,
  type Nutrients,
  type PreparationProfile,
} from "./types";

const FOOD_KINDS: readonly FoodProvenanceKind[] = [
  "usda",
  "cofid",
  "afcd",
  "cnf",
  "user_entered",
  "off",
  "ifct",
  "recipe",
];
const FOOD_GROUPS: readonly FoodGroup[] = [
  "cereals_grains",
  "pulses_legumes",
  "eggs",
  "dairy",
  "vegetables",
  "fruits",
  "nuts_seeds",
  "fats_oils",
  "other",
];
const ENTRY_SOURCES: readonly EntrySource[] = [
  "search",
  "custom",
  "coach_photo",
  "recent",
  "plan",
  "dish",
];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A day key must name a day that exists. The shape regex alone waves
 *  through "2026-02-31" and "2026-13-01" — impossible dates that would
 *  bucket into phantom days no calendar can render. Leap years follow the
 *  Gregorian rule; future days are accepted (planning ahead is data, not
 *  corruption). */
export function isRealDayKey(day: string): boolean {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const date = Number(day.slice(8, 10));
  if (month < 1 || month > 12 || date < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
  return date <= daysInMonth;
}

export const MAX_FOODS = 500;
export const MAX_LOG_ENTRIES = 5000;

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

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

interface NutrientCaps {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  sugarG: number;
  sodiumMg: number;
  potassiumMg: number;
  magnesiumMg: number;
  calciumMg: number;
  ironMg: number;
  vitaminCMg: number;
}

/** Per-100 g caps (a Food's profile): the densest real foods sit well
 *  inside them — pure oil is ~884 kcal and 100 g fat per 100 g. The
 *  micronutrient caps are the same kind of sanity ceiling, set above the
 *  densest real foods (parmesan ~1 200 mg calcium, pumpkin seeds
 *  ~590 mg magnesium, acerola ~1 700 mg vitamin C per 100 g) and far
 *  below any value that could only be a data error. */
const FOOD_NUTRIENT_CAPS: NutrientCaps = {
  kcal: 2000,
  proteinG: 100,
  carbsG: 100,
  fatG: 100,
  fibreG: 100,
  sugarG: 100,
  sodiumMg: 40000,
  potassiumMg: 10000,
  magnesiumMg: 2000,
  calciumMg: 5000,
  ironMg: 1000,
  vitaminCMg: 5000,
};

/** Entry caps: an entry is a whole portion, not 100 g — 500 g of chicken
 *  breast legitimately carries 155 g of protein, and a large
 *  Coach-estimated meal runs to ~2 500 kcal. Entry nutrients therefore get
 *  their own generous-but-finite caps (hardening finding F1); beyond them
 *  an entry is still refused outright, never clamped. */
const ENTRY_NUTRIENT_CAPS: NutrientCaps = {
  kcal: 10000,
  proteinG: 1000,
  carbsG: 1000,
  fatG: 1000,
  fibreG: 500,
  sugarG: 1000,
  sodiumMg: 100000,
  potassiumMg: 50000,
  magnesiumMg: 10000,
  calciumMg: 25000,
  ironMg: 5000,
  vitaminCMg: 25000,
};

/** The optional fields and the cap each is held to — one list, so a new
 *  optional nutrient joins the parser by joining this list and the caps. */
const OPTIONAL_FIELDS = [
  "fibreG",
  "sugarG",
  "sodiumMg",
  "potassiumMg",
  "magnesiumMg",
  "calciumMg",
  "ironMg",
  "vitaminCMg",
] as const;

/**
 * Nutrients are all-or-nothing on the four core values: a source that cannot
 * state kcal/protein/carbs/fat is not a food. Fibre and sodium ride along
 * only when present and valid.
 */
function parseNutrientsWithCaps(raw: unknown, caps: NutrientCaps): Nutrients | null {
  if (!isRecord(raw)) return null;
  const kcal = numIn(raw["kcal"], 0, caps.kcal);
  const proteinG = numIn(raw["proteinG"], 0, caps.proteinG);
  const carbsG = numIn(raw["carbsG"], 0, caps.carbsG);
  const fatG = numIn(raw["fatG"], 0, caps.fatG);
  if (kcal === null || proteinG === null || carbsG === null || fatG === null) return null;
  const out: Nutrients = { kcal, proteinG, carbsG, fatG };
  for (const key of OPTIONAL_FIELDS) {
    const value = numIn(raw[key], 0, caps[key]);
    if (value !== null) out[key] = value;
  }
  return out;
}

/** Per-100 g nutrients — a Food's profile, held to FOOD_NUTRIENT_CAPS. */
export function parseNutrients(raw: unknown): Nutrients | null {
  return parseNutrientsWithCaps(raw, FOOD_NUTRIENT_CAPS);
}

/** A log entry's nutrients — a whole portion, held to ENTRY_NUTRIENT_CAPS. */
export function parseEntryNutrients(raw: unknown): Nutrients | null {
  return parseNutrientsWithCaps(raw, ENTRY_NUTRIENT_CAPS);
}

export function parseFoodProvenance(raw: unknown): FoodProvenance | null {
  if (!isRecord(raw)) return null;
  const kind = oneOf(raw["kind"], FOOD_KINDS);
  if (!kind) return null;
  if (typeof raw["sourceId"] !== "string") return null;
  const out: FoodProvenance = {
    kind,
    sourceId: raw["sourceId"].slice(0, 120),
    label: text(raw["label"], 120),
  };
  const dataType = text(raw["dataType"], 60);
  if (dataType) out.dataType = dataType;
  return out;
}

export function parseEntryProvenance(raw: unknown): EntryProvenance | null {
  if (isRecord(raw) && raw["kind"] === "coach_estimate") {
    const prov: CoachEstimateProvenance = {
      kind: "coach_estimate",
      label: text(raw["label"], 120),
    };
    return prov;
  }
  return parseFoodProvenance(raw);
}

function parseServings(raw: unknown): FoodServing[] {
  if (!Array.isArray(raw)) return [];
  const out: FoodServing[] = [];
  for (const item of raw.slice(0, 20)) {
    if (!isRecord(item)) continue;
    const label = text(item["label"], 60);
    const grams = numIn(item["grams"], 0.1, 2000);
    if (!label || grams === null) continue;
    out.push({ label, grams });
  }
  return out;
}

/**
 * A food's group + pattern identity (P2). The classification is data-layer
 * fact (the USDA generator's pinned per-FDC-id table), so it is validated
 * like any other shipped fact: a malformed classification is dropped whole
 * — the food survives as unclassified rather than wearing a half-parsed
 * identity a pattern filter might misread.
 */
export function parseFoodClassification(raw: unknown): FoodClassification | null {
  if (!isRecord(raw)) return null;
  const group = oneOf(raw["group"], FOOD_GROUPS);
  if (!group) return null;
  const flags = ["containsEgg", "containsDairy", "isFlesh", "isFish"] as const;
  for (const flag of flags) {
    if (typeof raw[flag] !== "boolean") return null;
  }
  return {
    group,
    containsEgg: raw["containsEgg"] as boolean,
    containsDairy: raw["containsDairy"] as boolean,
    isFlesh: raw["isFlesh"] as boolean,
    isFish: raw["isFish"] as boolean,
  };
}

/**
 * A food's preparation basis (spec §3.3/§4). Like the classification,
 * it is data-layer fact (the generator's pinned per-FDC-id table), so
 * it is validated the same way: a state outside the vocabulary — or a
 * yield/edible figure outside its sane range — drops the whole
 * profile, and the food survives with its basis unclaimed rather than
 * wearing a half-parsed basis a presentation rule might misread. The
 * optional figures ride along only when present and valid; no shipped
 * food carries them yet (the yield sources are TO VERIFY, spec §4.2).
 */
export function parseFoodPreparation(raw: unknown): PreparationProfile | null {
  if (!isRecord(raw)) return null;
  const state = oneOf(raw["state"], PREPARATION_STATES);
  if (!state) return null;
  const out: PreparationProfile = { state };
  if (raw["yieldToCookedPer100g"] !== undefined) {
    const yieldPer100g = numIn(raw["yieldToCookedPer100g"], 1, 1000);
    if (yieldPer100g === null) return null;
    out.yieldToCookedPer100g = yieldPer100g;
  }
  if (raw["ediblePortionShare"] !== undefined) {
    const share = numIn(raw["ediblePortionShare"], 0, 1);
    if (share === null) return null;
    out.ediblePortionShare = share;
  }
  return out;
}

export function parseFood(raw: unknown): Food | null {
  if (!isRecord(raw)) return null;
  const id = text(raw["id"], 80);
  const name = text(raw["name"], 120);
  if (!id || !name) return null;
  const per100g = parseNutrients(raw["per100g"]);
  if (!per100g) return null;
  const provenance = parseFoodProvenance(raw["provenance"]);
  if (!provenance) return null;
  const food: Food = { id, name, per100g, servings: parseServings(raw["servings"]), provenance };
  const classification = parseFoodClassification(raw["classification"]);
  if (classification) food.classification = classification;
  const preparation = parseFoodPreparation(raw["preparation"]);
  if (preparation) food.preparation = preparation;
  return food;
}

/** Parse a stored food list: malformed entries drop, valid ones survive. */
export function parseFoodList(raw: unknown): Food[] {
  if (!Array.isArray(raw)) return [];
  const out: Food[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const food = parseFood(item);
    if (!food || seen.has(food.id)) continue;
    seen.add(food.id);
    out.push(food);
    if (out.length >= MAX_FOODS) break;
  }
  return out;
}

export function parseAmount(raw: unknown): Amount | null {
  if (!isRecord(raw)) return null;
  if ("grams" in raw) {
    const grams = numIn(raw["grams"], 0.1, 5000);
    return grams === null ? null : { grams };
  }
  if ("servings" in raw) {
    const servings = numIn(raw["servings"], 0.01, 50);
    const servingLabel = text(raw["servingLabel"], 60);
    if (servings === null || !servingLabel) return null;
    return { servings, servingLabel };
  }
  return null;
}

function parseSnapshot(raw: unknown): EstimateSnapshot | null {
  if (!isRecord(raw)) return null;
  const name = text(raw["name"], 120);
  const totals = parseEntryNutrients(raw["totals"]);
  if (!name || !totals) return null;
  return { name, totals };
}

export function parseLogEntry(raw: unknown): LogEntry | null {
  if (!isRecord(raw)) return null;
  const id = text(raw["id"], 80);
  if (!id) return null;
  const day = raw["day"];
  if (typeof day !== "string" || !DAY_RE.test(day) || !isRealDayKey(day)) return null;
  const meal: Meal | null = oneOf(raw["meal"], MEALS);
  if (!meal) return null;
  const source: EntrySource | null = oneOf(raw["source"], ENTRY_SOURCES);
  if (!source) return null;
  const name = text(raw["name"], 120);
  if (!name) return null;
  const amount = parseAmount(raw["amount"]);
  if (!amount) return null;
  const nutrients = parseEntryNutrients(raw["nutrients"]);
  if (!nutrients) return null;
  const provenance = parseEntryProvenance(raw["provenance"]);
  if (!provenance) return null;
  const foodId = typeof raw["foodId"] === "string" && raw["foodId"] ? raw["foodId"].slice(0, 80) : null;
  const snapshot = parseSnapshot(raw["snapshot"]);

  if (source === "coach_photo") {
    // An estimate entry is an estimate or it is nothing: it must carry the
    // estimate provenance and its inline snapshot, and it must not point at
    // a reusable Food (an estimate never becomes reference data, §4.4).
    if (provenance.kind !== "coach_estimate" || !snapshot || foodId !== null) return null;
  } else if (source === "dish") {
    // A dish entry (D4) is a portion snapshot like an estimate, under the
    // recipe provenance: the dish's computed per-serving nutrients, stored
    // inline — never a per-100 g profile invented for the dish, and never
    // a pointer at a reusable Food (a dish is a recipe, not a food).
    if (provenance.kind !== "recipe" || !snapshot || foodId !== null) return null;
  } else {
    // A food-backed entry must name its food and inherit a food provenance.
    if (provenance.kind === "coach_estimate" || !foodId || snapshot !== null) return null;
  }

  return {
    id,
    day,
    meal,
    foodId,
    snapshot,
    name,
    amount,
    nutrients,
    provenance,
    source,
    createdAt: typeof raw["createdAt"] === "string" ? raw["createdAt"] : "",
  };
}

/** Parse a stored food log: malformed entries drop, valid ones survive. */
export function parseLogEntryList(raw: unknown): LogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LogEntry[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const entry = parseLogEntry(item);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
  }
  out.sort((a, b) =>
    a.day === b.day ? (a.createdAt < b.createdAt ? -1 : 1) : a.day < b.day ? -1 : 1,
  );
  return out.slice(-MAX_LOG_ENTRIES);
}
