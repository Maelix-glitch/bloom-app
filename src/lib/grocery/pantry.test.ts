// @vitest-environment jsdom
/**
 * The pantry model — pinned: the strict parser (a corrupt value can
 * never reach a caller), add/merge semantics (a sum with an unknown
 * in it stays unknown), remove, the storage round-trip through the
 * real prefs document, and — by name, the way bodyDataPrivacy pins
 * the body keys — the export and erasure coverage every prefs key
 * must prove: the key rides in the export bundle verbatim, and the
 * device erase removes the document that holds it. Server-side, the
 * key lives in the caller's `user_prefs` row, which `erase_my_data()`
 * deletes wholesale — the same inheritance the plan and the food log
 * rely on, verified against prefs.ts/exportAll/erase here.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { buildExport } from "@/lib/data/exportAll";
import { eraseDevice } from "@/lib/data/erase";
import { loadDoc } from "@/lib/prefs";
import {
  PANTRY_KEY,
  addPantryItem,
  pantryValueOf,
  parsePantryValue,
  readPantry,
  removePantryItem,
  writePantry,
  type PantryItem,
} from "./pantry";

const NOW = "2026-11-18T05:00:00.000Z";

const RICE: PantryItem = {
  id: "pantry-1",
  name: "Rice",
  foodId: "usda-rice",
  quantityGrams: 500,
  addedAt: NOW,
};

describe("parsePantryValue", () => {
  it("accepts a well-formed value", () => {
    expect(parsePantryValue({ version: 1, items: [RICE] })).toEqual([RICE]);
    expect(parsePantryValue({ version: 1, items: [] })).toEqual([]);
  });

  it("refuses a wrong envelope", () => {
    expect(parsePantryValue(null)).toBeNull();
    expect(parsePantryValue("nope")).toBeNull();
    expect(parsePantryValue({ version: 2, items: [] })).toBeNull();
    expect(parsePantryValue({ version: 1, items: "nope" })).toBeNull();
    expect(parsePantryValue({ items: [] })).toBeNull();
  });

  it("drops malformed items and keeps the valid ones", () => {
    const parsed = parsePantryValue({
      version: 1,
      items: [RICE, { id: "", name: "x", addedAt: NOW }, { name: "No id", addedAt: NOW }, null],
    });
    expect(parsed).toEqual([RICE]);
  });

  it("an unusable quantity reads as not recorded — the item survives", () => {
    for (const bad of ["500", -5, 0, Number.NaN, 10_000_000]) {
      const parsed = parsePantryValue({
        version: 1,
        items: [{ ...RICE, quantityGrams: bad }],
      });
      expect(parsed).toEqual([{ ...RICE, quantityGrams: null }]);
    }
  });
});

describe("addPantryItem / removePantryItem", () => {
  it("adds a new item with the draft's facts", () => {
    const next = addPantryItem([], { name: "Spinach", quantityGrams: 200 }, NOW, "pantry-2");
    expect(next).toEqual([
      { id: "pantry-2", name: "Spinach", foodId: null, quantityGrams: 200, addedAt: NOW },
    ]);
  });

  it("a blank name adds nothing", () => {
    expect(addPantryItem([RICE], { name: "   " }, NOW)).toEqual([RICE]);
  });

  it("adding what is already there merges: recorded quantities sum", () => {
    const next = addPantryItem([RICE], { name: "rice", quantityGrams: 250 }, NOW, "pantry-9");
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: "pantry-1", quantityGrams: 750 });
  });

  it("merging with an unrecorded amount keeps the amount unknown", () => {
    const unrecorded: PantryItem = { ...RICE, quantityGrams: null };
    const a = addPantryItem([unrecorded], { name: "Rice", quantityGrams: 250 }, NOW);
    expect(a[0]!.quantityGrams).toBeNull();
    const b = addPantryItem([RICE], { name: "Rice" }, NOW);
    expect(b[0]!.quantityGrams).toBeNull();
  });

  it("merges by food id even when the typed name differs", () => {
    const next = addPantryItem(
      [RICE],
      { name: "Basmati", foodId: "usda-rice", quantityGrams: 100 },
      NOW,
    );
    expect(next).toHaveLength(1);
    expect(next[0]!.quantityGrams).toBe(600);
    expect(next[0]!.foodId).toBe("usda-rice");
  });

  it("remove takes exactly the named item out", () => {
    const spinach: PantryItem = { ...RICE, id: "pantry-2", name: "Spinach" };
    expect(removePantryItem([RICE, spinach], "pantry-1")).toEqual([spinach]);
    expect(removePantryItem([RICE], "pantry-nope")).toEqual([RICE]);
  });
});

describe("storage — the real prefs document", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("write → read round-trips", () => {
    expect(readPantry()).toEqual([]);
    writePantry([RICE]);
    expect(readPantry()).toEqual([RICE]);
    writePantry([]);
    expect(readPantry()).toEqual([]);
  });

  it("rides in the export bundle's prefs, verbatim", () => {
    writePantry([RICE]);
    const bundle = buildExport({ exportedAt: "2026-11-18T06:00:00.000Z", prefs: loadDoc() });
    const prefs = bundle.prefs as Record<string, { value: unknown }>;
    expect(prefs[PANTRY_KEY]?.value).toEqual(pantryValueOf([RICE]));
  });

  it("the device erase removes the document that holds it", () => {
    writePantry([RICE]);
    eraseDevice();
    expect(loadDoc()[PANTRY_KEY]).toBeUndefined();
    expect(readPantry()).toEqual([]);
  });
});
