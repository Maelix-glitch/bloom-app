import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDoc = new Map<string, unknown>();

vi.mock("@/lib/prefs", () => ({
  getPref: (key: string, parse: (raw: unknown) => unknown, fallback: unknown) => {
    if (!mockDoc.has(key)) return fallback;
    const parsed = parse(mockDoc.get(key));
    return parsed === null ? fallback : parsed;
  },
  setPref: (key: string, value: unknown) => {
    mockDoc.set(key, value);
  },
  clearPref: (key: string) => {
    mockDoc.delete(key);
  },
}));

import { findDish } from "./data/dishLibrary";
import { dishNutrients, RECIPE_PROVENANCE_LABEL } from "./dishes";
import { createDishEntry, logDish } from "./dishLog";
import { readDayLog } from "./log";
import { parseLogEntry } from "./parse";
import { readFoodLog } from "./store";

const NOW = "2026-11-16T07:30:00.000Z";
const DAY = "2026-11-16";

const dal = findDish("dish-masoor-dal-tadka")!;

beforeEach(() => {
  mockDoc.clear();
});

describe("createDishEntry — a portion snapshot under the recipe provenance", () => {
  it("carries the dish's computed per-serving nutrients, exactly", () => {
    const entry = createDishEntry({ dish: dal, meal: "lunch", day: DAY, now: NOW });
    expect(entry).not.toBeNull();
    const perServing = dishNutrients(dal).nutrients;
    expect(entry!.nutrients).toEqual(perServing);
    expect(entry!.snapshot).toEqual({ name: dal.name.en, totals: perServing });
  });

  it("travels under the recipe provenance, keyed to the dish", () => {
    const entry = createDishEntry({ dish: dal, meal: "lunch", day: DAY, now: NOW })!;
    expect(entry.provenance).toEqual({
      kind: "recipe",
      sourceId: dal.id,
      label: RECIPE_PROVENANCE_LABEL,
    });
    expect(entry.source).toBe("dish");
    expect(entry.name).toBe(dal.name.en);
    expect(entry.amount).toEqual({ servings: 1, servingLabel: "1 serving" });
  });

  it("never invents a per-100 g profile: no food pointer, no reusable food", () => {
    const entry = createDishEntry({ dish: dal, meal: "dinner", day: DAY, now: NOW })!;
    expect(entry.foodId).toBeNull();
  });

  it("survives the strict parser unchanged — the stored shape is the read shape", () => {
    const entry = createDishEntry({ dish: dal, meal: "lunch", day: DAY, now: NOW })!;
    expect(parseLogEntry(JSON.parse(JSON.stringify(entry)))).toEqual(entry);
  });
});

describe("the parser holds dish entries to the snapshot discipline", () => {
  const good = createDishEntry({ dish: dal, meal: "lunch", day: DAY, now: NOW })!;

  it("refuses a dish entry wearing a food provenance", () => {
    const forged = {
      ...good,
      provenance: { kind: "usda", sourceId: "174284", label: "USDA FoodData Central" },
    };
    expect(parseLogEntry(forged)).toBeNull();
  });

  it("refuses a dish entry pointing at a reusable food", () => {
    expect(parseLogEntry({ ...good, foodId: "usda-174284" })).toBeNull();
  });

  it("refuses a dish entry without its snapshot", () => {
    expect(parseLogEntry({ ...good, snapshot: null })).toBeNull();
  });

  it("refuses a food-backed entry wearing the recipe provenance and no food", () => {
    const { snapshot: _snapshot, ...rest } = good;
    expect(parseLogEntry({ ...rest, source: "search", snapshot: null })).toBeNull();
  });
});

describe("logDish — into the day's log, totals and all", () => {
  it("lands in the day log and moves its totals by exactly one serving", () => {
    const entry = logDish(dal, "lunch", DAY, NOW);
    expect(entry).not.toBeNull();
    const dayLog = readDayLog(DAY);
    expect(dayLog.entries.map((e) => e.id)).toEqual([entry!.id]);
    expect(dayLog.totals).toEqual(dishNutrients(dal).nutrients);
    expect(readFoodLog()).toHaveLength(1);
  });

  it("two servings are two entries — logging again is a second helping, not a duplicate error", () => {
    logDish(dal, "lunch", DAY, NOW);
    logDish(dal, "lunch", DAY, NOW);
    const dayLog = readDayLog(DAY);
    expect(dayLog.entries).toHaveLength(2);
    const perServing = dishNutrients(dal).nutrients;
    expect(dayLog.totals.kcal).toBeCloseTo(perServing.kcal * 2, 6);
  });
});
