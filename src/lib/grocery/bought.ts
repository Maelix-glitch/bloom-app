/**
 * The grocery list's bought ticks — which items are already in the
 * basket (M-201, the Grocery Journey).
 *
 * Until M-201 the ticks were session state in the section: tick a
 * few items, leave the tab, come back, and the shop started from
 * zero. The ticks now live in the shared preferences document under
 * a versioned key — the pantry's pattern — so they inherit sync,
 * export and erasure with no per-key wiring anywhere.
 *
 * A tick is about ONE list, never about a food in general, so the
 * stored value carries the list's signature alongside the ids: the
 * plan days the list was aggregated across plus the list's own item
 * ids, both taken from the grocery result itself — the most honest
 * identity the lib exposes. Ticks restore only when the signature
 * matches the list on screen; a new plan (or a changed one) starts
 * with a clean basket, and ids the current list no longer carries
 * are dropped at read time, never rendered.
 *
 * Everything above the two thin pref wrappers at the bottom is pure.
 */

import { getPref, setPref } from "@/lib/prefs";

export const GROCERY_BOUGHT_KEY = "health.groceryBought.v1";
export const GROCERY_BOUGHT_VERSION = 1;
/** A stored basket longer than this is a data error, not a shop —
 *  parses cap rather than growing forever (the pantry's rule). */
export const MAX_GROCERY_BOUGHT_IDS = 500;

export interface GroceryBoughtValue {
  version: typeof GROCERY_BOUGHT_VERSION;
  /** The list these ticks belong to — see groceryListSignature. */
  signature: string;
  /** The ticked items' food ids, in tick order. */
  bought: string[];
}

/**
 * The identity of one grocery list: its plan days, in the result's
 * own order, and its item ids, sorted (item order inside the list
 * is presentation; the SET of items is the identity). Two lists
 * with the same days and the same items are the same shop.
 */
export function groceryListSignature(
  days: readonly string[],
  foodIds: readonly string[],
): string {
  return `${days.join(",")}#${[...foodIds].sort().join(",")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Strict envelope parse. Null on a wrong envelope — `getPref` then
 *  falls back, so a corrupt value can never reach callers. Ids are
 *  validated one by one; duplicates and non-strings drop. */
export function parseGroceryBoughtValue(raw: unknown): GroceryBoughtValue | null {
  if (!isRecord(raw)) return null;
  if (raw["version"] !== GROCERY_BOUGHT_VERSION) return null;
  const signature = raw["signature"];
  if (typeof signature !== "string" || signature.length === 0) return null;
  if (!Array.isArray(raw["bought"])) return null;
  const bought: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw["bought"]) {
    if (typeof entry !== "string" || entry.length === 0 || seen.has(entry)) continue;
    seen.add(entry);
    bought.push(entry);
    if (bought.length >= MAX_GROCERY_BOUGHT_IDS) break;
  }
  return { version: GROCERY_BOUGHT_VERSION, signature, bought };
}

export function groceryBoughtValueOf(
  signature: string,
  bought: readonly string[],
): GroceryBoughtValue {
  return { version: GROCERY_BOUGHT_VERSION, signature, bought: [...bought] };
}

/**
 * The ticks that belong to the list on screen: the stored ids, in
 * stored order, when the stored signature IS this list's signature
 * — intersected with the ids the list actually carries, so a stored
 * id the plan no longer lists can never tick (or count) here. Any
 * other stored value — another list's ticks, a corrupt read — is an
 * empty basket.
 */
export function boughtIdsFor(
  value: GroceryBoughtValue | null,
  signature: string,
  currentIds: readonly string[],
): ReadonlySet<string> {
  if (!value || value.signature !== signature) return new Set();
  const current = new Set(currentIds);
  return new Set(value.bought.filter((id) => current.has(id)));
}

/**
 * One tick, purely. The base is the stored set ONLY when it belongs
 * to this same list (same signature rule as the read); toggling
 * against another list's ticks starts from empty and re-stamps the
 * value with this list's signature, so a stale value can never leak
 * its ids into a new shop.
 */
export function toggleGroceryBought(
  current: GroceryBoughtValue | null,
  signature: string,
  foodId: string,
  next: boolean,
): GroceryBoughtValue {
  const base =
    current && current.signature === signature
      ? current.bought.filter((id) => id !== foodId)
      : [];
  return groceryBoughtValueOf(signature, next ? [...base, foodId] : base);
}

/* ------------------------------- pref access ------------------------------ */

export function readGroceryBought(): GroceryBoughtValue | null {
  return getPref(GROCERY_BOUGHT_KEY, parseGroceryBoughtValue, null);
}

export function writeGroceryBought(value: GroceryBoughtValue): void {
  setPref(GROCERY_BOUGHT_KEY, value);
}
