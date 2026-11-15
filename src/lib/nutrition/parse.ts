/**
 * Nutrition — strict parsers (design §4.1/§4.8).
 *
 * Same discipline as the Assessment parser: read only the named fields (so
 * unknown fields are dropped by construction), validate every value against
 * a sane range, and DROP a malformed Food/LogEntry outright — a parser never
 * repairs a value by inventing one. Optional nutrients survive only when
 * they are genuinely present and valid; absent stays absent, never zero.
 */

import {
  MEALS,
  type Amount,
  type CoachEstimateProvenance,
  type EntryProvenance,
  type EntrySource,
  type EstimateSnapshot,
  type Food,
  type FoodProvenance,
  type FoodProvenanceKind,
  type FoodServing,
  type LogEntry,
  type Meal,
  type Nutrients,
} from "./types";

const FOOD_KINDS: readonly FoodProvenanceKind[] = ["usda", "user_entered", "off", "ifct"];
const ENTRY_SOURCES: readonly EntrySource[] = ["search", "custom", "coach_photo", "recent"];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

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

/**
 * Nutrients are all-or-nothing on the four core values: a source that cannot
 * state kcal/protein/carbs/fat is not a food. Fibre and sodium ride along
 * only when present and valid.
 */
export function parseNutrients(raw: unknown): Nutrients | null {
  if (!isRecord(raw)) return null;
  const kcal = numIn(raw["kcal"], 0, 2000);
  const proteinG = numIn(raw["proteinG"], 0, 100);
  const carbsG = numIn(raw["carbsG"], 0, 100);
  const fatG = numIn(raw["fatG"], 0, 100);
  if (kcal === null || proteinG === null || carbsG === null || fatG === null) return null;
  const out: Nutrients = { kcal, proteinG, carbsG, fatG };
  const fibreG = numIn(raw["fibreG"], 0, 100);
  if (fibreG !== null) out.fibreG = fibreG;
  const sodiumMg = numIn(raw["sodiumMg"], 0, 40000);
  if (sodiumMg !== null) out.sodiumMg = sodiumMg;
  return out;
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

export function parseFood(raw: unknown): Food | null {
  if (!isRecord(raw)) return null;
  const id = text(raw["id"], 80);
  const name = text(raw["name"], 120);
  if (!id || !name) return null;
  const per100g = parseNutrients(raw["per100g"]);
  if (!per100g) return null;
  const provenance = parseFoodProvenance(raw["provenance"]);
  if (!provenance) return null;
  return { id, name, per100g, servings: parseServings(raw["servings"]), provenance };
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
  const totals = parseNutrients(raw["totals"]);
  if (!name || !totals) return null;
  return { name, totals };
}

export function parseLogEntry(raw: unknown): LogEntry | null {
  if (!isRecord(raw)) return null;
  const id = text(raw["id"], 80);
  if (!id) return null;
  const day = raw["day"];
  if (typeof day !== "string" || !DAY_RE.test(day)) return null;
  const meal: Meal | null = oneOf(raw["meal"], MEALS);
  if (!meal) return null;
  const source: EntrySource | null = oneOf(raw["source"], ENTRY_SOURCES);
  if (!source) return null;
  const name = text(raw["name"], 120);
  if (!name) return null;
  const amount = parseAmount(raw["amount"]);
  if (!amount) return null;
  const nutrients = parseNutrients(raw["nutrients"]);
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
