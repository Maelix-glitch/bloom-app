// @vitest-environment jsdom
/**
 * The bought ticks — pinned: the list signature (days + the item id
 * SET, order-free), the strict parser (a corrupt value can never
 * reach a caller), the restore rule (ticks return only under their
 * own list's signature; ids the list no longer carries drop), the
 * toggle's re-stamping (another list's ticks never leak into a new
 * shop), the storage round-trip through the real prefs document,
 * and — by name, the pantry.test pattern — the export and erasure
 * coverage every prefs key must prove.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { buildExport } from "@/lib/data/exportAll";
import { eraseDevice } from "@/lib/data/erase";
import { loadDoc } from "@/lib/prefs";
import {
  GROCERY_BOUGHT_KEY,
  boughtIdsFor,
  groceryBoughtValueOf,
  groceryListSignature,
  parseGroceryBoughtValue,
  readGroceryBought,
  toggleGroceryBought,
  writeGroceryBought,
  type GroceryBoughtValue,
} from "./bought";

const SIG = groceryListSignature(["2026-11-22"], ["f-rice", "f-dal"]);

describe("groceryListSignature", () => {
  it("is the days plus the sorted item ids", () => {
    expect(groceryListSignature(["2026-11-22"], ["f-rice", "f-dal"])).toBe(
      "2026-11-22#f-dal,f-rice",
    );
  });

  it("item order does not change the identity; the item set and days do", () => {
    expect(groceryListSignature(["2026-11-22"], ["f-dal", "f-rice"])).toBe(SIG);
    expect(groceryListSignature(["2026-11-22"], ["f-rice"])).not.toBe(SIG);
    expect(groceryListSignature(["2026-11-23"], ["f-rice", "f-dal"])).not.toBe(SIG);
  });
});

describe("parseGroceryBoughtValue", () => {
  it("accepts a well-formed value", () => {
    const value: GroceryBoughtValue = { version: 1, signature: SIG, bought: ["f-rice"] };
    expect(parseGroceryBoughtValue(value)).toEqual(value);
    expect(parseGroceryBoughtValue({ version: 1, signature: SIG, bought: [] })).toEqual({
      version: 1,
      signature: SIG,
      bought: [],
    });
  });

  it("refuses a wrong envelope", () => {
    expect(parseGroceryBoughtValue(null)).toBeNull();
    expect(parseGroceryBoughtValue("nope")).toBeNull();
    expect(parseGroceryBoughtValue({ version: 2, signature: SIG, bought: [] })).toBeNull();
    expect(parseGroceryBoughtValue({ version: 1, bought: [] })).toBeNull();
    expect(parseGroceryBoughtValue({ version: 1, signature: "", bought: [] })).toBeNull();
    expect(parseGroceryBoughtValue({ version: 1, signature: SIG, bought: "nope" })).toBeNull();
  });

  it("drops malformed and duplicate ids, keeps the valid ones", () => {
    const parsed = parseGroceryBoughtValue({
      version: 1,
      signature: SIG,
      bought: ["f-rice", "", 42, null, "f-rice", "f-dal"],
    });
    expect(parsed?.bought).toEqual(["f-rice", "f-dal"]);
  });
});

describe("boughtIdsFor — the restore rule", () => {
  const stored: GroceryBoughtValue = {
    version: 1,
    signature: SIG,
    bought: ["f-rice", "f-gone"],
  };

  it("restores the ticks under a matching signature", () => {
    expect(boughtIdsFor(stored, SIG, ["f-rice", "f-dal"])).toEqual(new Set(["f-rice"]));
  });

  it("drops stored ids the current list no longer carries", () => {
    expect(boughtIdsFor(stored, SIG, ["f-dal"])).toEqual(new Set());
  });

  it("restores nothing under a changed signature — a new plan is a fresh list", () => {
    const other = groceryListSignature(["2026-11-23"], ["f-rice", "f-dal"]);
    expect(boughtIdsFor(stored, other, ["f-rice", "f-dal"])).toEqual(new Set());
  });

  it("a missing value is an empty basket", () => {
    expect(boughtIdsFor(null, SIG, ["f-rice"])).toEqual(new Set());
  });
});

describe("toggleGroceryBought", () => {
  it("ticks and unticks against the same list", () => {
    const on = toggleGroceryBought(null, SIG, "f-rice", true);
    expect(on).toEqual({ version: 1, signature: SIG, bought: ["f-rice"] });
    const off = toggleGroceryBought(on, SIG, "f-rice", false);
    expect(off).toEqual({ version: 1, signature: SIG, bought: [] });
  });

  it("re-stamps under the current signature — another list's ticks never leak in", () => {
    const stale: GroceryBoughtValue = { version: 1, signature: "old#x", bought: ["f-old"] };
    const next = toggleGroceryBought(stale, SIG, "f-dal", true);
    expect(next).toEqual({ version: 1, signature: SIG, bought: ["f-dal"] });
  });
});

describe("storage — the real prefs document", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("write → read round-trips", () => {
    expect(readGroceryBought()).toBeNull();
    const value = groceryBoughtValueOf(SIG, ["f-rice"]);
    writeGroceryBought(value);
    expect(readGroceryBought()).toEqual(value);
  });

  it("rides in the export bundle's prefs, verbatim", () => {
    const value = groceryBoughtValueOf(SIG, ["f-rice"]);
    writeGroceryBought(value);
    const bundle = buildExport({ exportedAt: "2026-11-22T06:00:00.000Z", prefs: loadDoc() });
    const prefs = bundle.prefs as Record<string, { value: unknown }>;
    expect(prefs[GROCERY_BOUGHT_KEY]?.value).toEqual(value);
  });

  it("the device erase removes the document that holds it", () => {
    writeGroceryBought(groceryBoughtValueOf(SIG, ["f-rice"]));
    eraseDevice();
    expect(loadDoc()[GROCERY_BOUGHT_KEY]).toBeUndefined();
    expect(readGroceryBought()).toBeNull();
  });
});
