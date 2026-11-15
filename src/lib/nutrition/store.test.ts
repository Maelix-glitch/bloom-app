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

import { setPref } from "@/lib/prefs";
import { createEntryFromFood, createEstimateEntry } from "./entries";
import {
  deleteCustomFood,
  editCustomFood,
  listCustomFoods,
  saveCustomFood,
} from "./foods";
import {
  appendToLog,
  deleteLogEntry,
  editLogEntry,
  logEntry,
  readDayLog,
  recentsFromLog,
  recentFoods,
} from "./log";
import { FOODS_KEY, FOODLOG_KEY, readFoodLog, readFoods } from "./store";
import type { Food } from "./types";

const NOW = "2026-11-15T03:00:00.000Z";

const OATS_INPUT = {
  name: "My oats mix",
  per100g: { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7, fibreG: 9 },
  servings: [{ label: "1 bowl", grams: 60 }],
};

beforeEach(() => {
  mockDoc.clear();
});

describe("nutrition store · custom foods CRUD through the prefs layer", () => {
  it("create → read round-trips, stamped as the user's own value", () => {
    const saved = saveCustomFood(OATS_INPUT, "food-mine")!;
    expect(saved.provenance).toEqual({
      kind: "user_entered",
      sourceId: "food-mine",
      label: "Your value",
    });
    expect(listCustomFoods()).toEqual([saved]);
    // the stored value is the versioned envelope under the design's key
    expect(mockDoc.get(FOODS_KEY)).toMatchObject({ version: 1 });
  });

  it("update changes values, never the id or the provenance", () => {
    saveCustomFood(OATS_INPUT, "food-mine");
    const edited = editCustomFood("food-mine", {
      per100g: { kcal: 400, proteinG: 14, carbsG: 62, fatG: 8 },
    })!;
    expect(edited.id).toBe("food-mine");
    expect(edited.per100g.kcal).toBe(400);
    expect(edited.provenance.kind).toBe("user_entered");
    expect(listCustomFoods()[0]!.per100g.kcal).toBe(400);
    expect(editCustomFood("food-ghost", { name: "x" })).toBeNull();
  });

  it("delete removes exactly that food", () => {
    saveCustomFood(OATS_INPUT, "food-a");
    saveCustomFood({ ...OATS_INPUT, name: "Second" }, "food-b");
    deleteCustomFood("food-a");
    expect(listCustomFoods().map((f) => f.id)).toEqual(["food-b"]);
  });

  it("an unusable custom food is refused and nothing is stored", () => {
    expect(saveCustomFood({ name: "  ", per100g: OATS_INPUT.per100g })).toBeNull();
    expect(readFoods()).toEqual([]);
    expect(mockDoc.has(FOODS_KEY)).toBe(false);
  });

  it("reads re-validate: a wrong-version or partly-corrupt value degrades honestly", () => {
    setPref(FOODS_KEY, { version: 99, foods: [] });
    expect(listCustomFoods()).toEqual([]);
    setPref(FOODS_KEY, "garbage");
    expect(listCustomFoods()).toEqual([]);
    const good = saveCustomFood(OATS_INPUT, "food-mine")!;
    setPref(FOODS_KEY, { version: 1, foods: [good, { id: "broken" }, null] });
    expect(listCustomFoods()).toEqual([good]);
  });
});

describe("nutrition store · food log through the prefs layer", () => {
  function oatsFood(): Food {
    return saveCustomFood(OATS_INPUT, "food-mine")!;
  }

  it("append → day read round-trips with totals from the N1 math", () => {
    const food = oatsFood();
    const entry = createEntryFromFood({
      food,
      amount: { servings: 1, servingLabel: "1 bowl" }, // 60 g of 380 kcal/100 g
      meal: "breakfast",
      day: "2026-11-15",
      source: "custom",
      now: NOW,
      id: "entry-1",
    })!;
    logEntry(entry);
    expect(readFoodLog()).toEqual([entry]);
    const day = readDayLog("2026-11-15");
    expect(day.entries).toHaveLength(1);
    expect(day.totals).toEqual({ kcal: 228, proteinG: 7.8, carbsG: 36, fatG: 4.2, fibreG: 5.4 });
    expect(mockDoc.get(FOODLOG_KEY)).toMatchObject({ version: 1 });
  });

  it("edit and delete operate by id; origin fields are not patchable", () => {
    const food = oatsFood();
    const entry = createEntryFromFood({
      food,
      amount: { grams: 100 },
      meal: "breakfast",
      day: "2026-11-15",
      source: "custom",
      now: NOW,
      id: "entry-1",
    })!;
    logEntry(entry);
    editLogEntry("entry-1", { meal: "lunch" });
    const after = readFoodLog()[0]!;
    expect(after.meal).toBe("lunch");
    expect(after.foodId).toBe("food-mine");
    expect(after.source).toBe("custom");
    deleteLogEntry("entry-1");
    expect(readFoodLog()).toEqual([]);
  });

  it("a malformed entry can never enter the stored log", () => {
    const broken = { id: "x", day: "not-a-day" } as unknown as Parameters<typeof appendToLog>[1];
    expect(appendToLog([], broken)).toEqual([]);
    logEntry(broken);
    expect(readFoodLog()).toEqual([]);
  });
});

describe("nutrition store · recents derive from the user's own log only", () => {
  function logged(food: Food, day: string, id: string) {
    return createEntryFromFood({
      food,
      amount: { grams: 100 },
      meal: "lunch",
      day,
      source: "search",
      now: `${day}T08:00:00.000Z`,
      id,
    })!;
  }

  it("orders by most recent day, then frequency; estimates never appear", () => {
    const a = saveCustomFood(OATS_INPUT, "food-a")!;
    const b = saveCustomFood({ ...OATS_INPUT, name: "B" }, "food-b")!;
    const entries = [
      logged(b, "2026-11-14", "e1"),
      logged(b, "2026-11-14", "e2"),
      logged(b, "2026-11-14", "e3"),
      logged(a, "2026-11-13", "e4"),
      logged(a, "2026-11-15", "e5"),
      logged(a, "2026-11-15", "e6"),
      createEstimateEntry({
        name: "Biryani",
        totals: { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 },
        meal: "dinner",
        day: "2026-11-15",
        now: NOW,
        id: "e7",
      })!,
    ];
    const recents = recentsFromLog(entries);
    expect(recents).toEqual([
      { foodId: "food-a", count: 3, lastLoggedDay: "2026-11-15" },
      { foodId: "food-b", count: 3, lastLoggedDay: "2026-11-14" },
    ]);
    expect(recentFoods(entries, [a, b]).map((f) => f.id)).toEqual(["food-a", "food-b"]);
    // a food the user deleted falls away; the log itself is untouched
    expect(recentFoods(entries, [b]).map((f) => f.id)).toEqual(["food-b"]);
    expect(recentsFromLog(entries, 1)).toHaveLength(1);
  });
});
