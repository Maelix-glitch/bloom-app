/**
 * The pantry — what the person already has at home (System 5,
 * Grocery & Pantry Intelligence, foundation).
 *
 * Storage is a versioned prefs key, `health.pantry.v1`, in the shared
 * preferences document — the pattern the plan, the food log and the
 * target adjustment set. Because the value lives in the prefs document
 * it inherits, with no per-key wiring anywhere: sync (the doc mirrors
 * to `user_prefs`, merged per key), export (`useExportBundle` bundles
 * `loadDoc()` wholesale) and erasure (`erase_my_data()` deletes the
 * caller's `user_prefs` row wholesale; `eraseDevice()` wipes the doc).
 * The export/erasure inheritance is pinned by name in pantry.test.ts,
 * the way bodyDataPrivacy pins the body keys.
 *
 * Honesty rules, enforced here and in groceryList.ts:
 *   · a quantity is grams, or it is absent. No other unit exists in
 *     Bloom's food data, so nothing is ever converted or guessed;
 *   · an item with no recorded quantity says exactly that — it flags
 *     "at home, amount not recorded" on the grocery list and deducts
 *     NOTHING numerically, because a deduction nobody measured would
 *     be an invented number.
 *
 * Everything above the two thin pref wrappers at the bottom is pure.
 */

import { getPref, setPref } from "@/lib/prefs";

export const PANTRY_KEY = "health.pantry.v1";
export const PANTRY_VERSION = 1;
/** A household pantry list longer than this is a data error, not a
 *  pantry — writes refuse past the cap rather than growing forever. */
export const MAX_PANTRY_ITEMS = 200;
/** One pantry item above 100 kg is a typo, not a stock level. */
export const MAX_PANTRY_QUANTITY_GRAMS = 100_000;

export interface PantryItem {
  id: string;
  /** The name as the person typed it (display casing preserved). */
  name: string;
  /** The food this item is, when the name resolved to a food in the
   *  person's foods or the USDA reference set at add time. Null when
   *  it did not resolve — the item still exists in the pantry, and
   *  the grocery list can still match it by name. */
  foodId: string | null;
  /** Grams on hand, or null when the person did not record an amount. */
  quantityGrams: number | null;
  addedAt: string;
}

export interface PantryValue {
  version: typeof PANTRY_VERSION;
  items: PantryItem[];
}

/** The draft the pantry editor hands in — id and timestamp are made
 *  here, never by the UI. */
export interface PantryItemDraft {
  name: string;
  foodId?: string | null;
  quantityGrams?: number | null;
}

/** Name matching is case- and spacing-insensitive, everywhere. */
export function normalisePantryName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function newPantryItemId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `pantry-${rand}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

/** A recorded quantity survives only as a sane gram amount; anything
 *  else reads as "not recorded" (null) — never rounded into existence. */
function quantity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value <= 0 || value > MAX_PANTRY_QUANTITY_GRAMS) return null;
  return Math.round(value);
}

function parsePantryItem(raw: unknown): PantryItem | null {
  if (!isRecord(raw)) return null;
  const id = text(raw["id"], 80);
  const name = text(raw["name"], 120);
  const addedAt = text(raw["addedAt"], 40);
  if (!id || !name || !addedAt) return null;
  const foodId = text(raw["foodId"], 120);
  return {
    id,
    name,
    foodId: foodId ? foodId : null,
    quantityGrams: quantity(raw["quantityGrams"]),
    addedAt,
  };
}

/** Strict envelope parse for the pantry value. Null on a wrong
 *  envelope — `getPref` then falls back, so a corrupt value can never
 *  reach callers. Items are validated one by one; malformed ones
 *  drop, valid ones survive (the food log's rule). */
export function parsePantryValue(raw: unknown): PantryItem[] | null {
  if (!isRecord(raw)) return null;
  if (raw["version"] !== PANTRY_VERSION) return null;
  if (!Array.isArray(raw["items"])) return null;
  const items: PantryItem[] = [];
  for (const entry of raw["items"]) {
    const item = parsePantryItem(entry);
    if (item) items.push(item);
  }
  return items.slice(0, MAX_PANTRY_ITEMS);
}

export function pantryValueOf(items: readonly PantryItem[]): PantryValue {
  return { version: PANTRY_VERSION, items: [...items] };
}

/**
 * Add an item, purely. Adding what is already there MERGES into the
 * existing item (matched by foodId, else by normalised name): two
 * recorded quantities sum; if either side has no recorded quantity
 * the merged item has none — a sum with an unknown in it is unknown.
 * Returns the SAME array when the draft is unusable (blank name) or
 * the cap is reached, so callers can tell nothing changed.
 */
export function addPantryItem(
  items: readonly PantryItem[],
  draft: PantryItemDraft,
  now: string,
  id: string = newPantryItemId(),
): PantryItem[] {
  const name = text(draft.name, 120);
  if (!name) return [...items];
  const foodId = draft.foodId ? text(draft.foodId, 120) || null : null;
  const quantityGrams = quantity(draft.quantityGrams ?? null);
  const nameKey = normalisePantryName(name);

  const existingIndex = items.findIndex(
    (item) =>
      (foodId !== null && item.foodId === foodId) ||
      normalisePantryName(item.name) === nameKey,
  );
  if (existingIndex >= 0) {
    const existing = items[existingIndex]!;
    const merged: PantryItem = {
      ...existing,
      foodId: existing.foodId ?? foodId,
      quantityGrams:
        existing.quantityGrams !== null && quantityGrams !== null
          ? Math.min(existing.quantityGrams + quantityGrams, MAX_PANTRY_QUANTITY_GRAMS)
          : null,
    };
    const next = [...items];
    next[existingIndex] = merged;
    return next;
  }
  if (items.length >= MAX_PANTRY_ITEMS) return [...items];
  return [...items, { id, name, foodId, quantityGrams, addedAt: now }];
}

/** Remove one item by id, purely. Unknown ids change nothing. */
export function removePantryItem(items: readonly PantryItem[], id: string): PantryItem[] {
  return items.filter((item) => item.id !== id);
}

/* ------------------------------- pref access ------------------------------ */

const NO_ITEMS: PantryItem[] = [];

export function readPantry(): PantryItem[] {
  return getPref(PANTRY_KEY, parsePantryValue, NO_ITEMS);
}

export function writePantry(items: readonly PantryItem[]): void {
  setPref(PANTRY_KEY, pantryValueOf(items));
}
