/**
 * Nutrition — adversarial hardening (owner directive: the engine must be
 * loophole-hunting, foolproof and dumb-proof).
 *
 * Every test here began as an attack. Where the engine already held, the
 * test is the pin. Where it broke, the fix is in the lib layer next to the
 * test's subject and the test is the regression pin. Some attacks are
 * pinned as FINDINGS instead — behaviour the tests document precisely but
 * that only a product/architecture decision may change (the prefs-layer
 * and sync loss windows, F3–F5). Findings F1 (per-entry nutrient caps) and
 * F2 (the foods-cap tail) were closed by the follow-up slice; their pins
 * below now assert the new behaviour. The hardening report carries the
 * verdict table.
 */

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
  addFood,
  createCustomFood,
  deleteCustomFood,
  editCustomFood,
  FoodListFullError,
  saveCustomFood,
  updateFood,
} from "./foods";
import {
  labelledEntryNutrients,
  labelledFoodNutrients,
  provenanceLabel,
} from "./labels";
import {
  appendToLog,
  deleteLogEntry,
  editLogEntry,
  logEntry,
  readDayLog,
  recentsFromLog,
  recentFoods,
  removeLogEntry,
  updateLogEntry,
} from "./log";
import { dayLogOf, entryNutrientsFor, gramsForAmount, groupByDay, nutrientsForGrams, sumNutrients } from "./math";
import {
  parseAmount,
  parseEntryNutrients,
  parseFood,
  parseLogEntry,
  parseLogEntryList,
  parseNutrients,
} from "./parse";
import {
  FOODS_KEY,
  FOODLOG_KEY,
  parseFoodLogValue,
  parseFoodsValue,
  readFoodLog,
  readFoods,
  writeFoodLog,
  writeFoods,
} from "./store";
import {
  compareTotalsToTargets,
  nutritionTargetsFromBodyTargets,
  nutritionTargetsFromOutcome,
} from "./targets";
import type { BodyTargets } from "@/lib/health/body";
import type { BodyTargetsOutcome } from "@/lib/vitalis/calc/body";
import type { Food, LogEntry, Nutrients } from "./types";

const NOW = "2026-11-15T03:00:00.000Z";

const MY_FOOD: Food = {
  id: "food-mine",
  name: "My oats",
  per100g: { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7, fibreG: 9 },
  servings: [{ label: "1 bowl", grams: 60 }],
  provenance: { kind: "user_entered", sourceId: "food-mine", label: "Your value" },
};

function foodEntry(id: string, day = "2026-11-15", grams = 100): LogEntry {
  return createEntryFromFood({
    food: MY_FOOD,
    amount: { grams },
    meal: "breakfast",
    day,
    source: "custom",
    now: `${day}T08:00:00.000Z`,
    id,
  })!;
}

function estimateEntry(id: string, day = "2026-11-15"): LogEntry {
  return createEstimateEntry({
    name: "Biryani",
    totals: { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 },
    meal: "lunch",
    day,
    now: `${day}T09:00:00.000Z`,
    id,
  })!;
}

beforeEach(() => {
  mockDoc.clear();
});

/* ------------------------------ 1 · values ------------------------------ */

describe("hardening · values cannot poison the math", () => {
  it("non-finite, negative and absurd per-100 g values are refused, never clamped", () => {
    const core = { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 };
    expect(parseNutrients({ ...core, kcal: Number.NaN })).toBeNull();
    expect(parseNutrients({ ...core, proteinG: Number.POSITIVE_INFINITY })).toBeNull();
    expect(parseNutrients({ ...core, carbsG: Number.NEGATIVE_INFINITY })).toBeNull();
    expect(parseNutrients({ ...core, fatG: -0.1 })).toBeNull();
    expect(parseNutrients({ ...core, kcal: 1e9 })).toBeNull();
    expect(parseNutrients({ ...core, kcal: "100" })).toBeNull();
  });

  it("-0 parses as zero and can never poison a total with negative zero or NaN", () => {
    const parsed = parseNutrients({ kcal: -0, proteinG: -0, carbsG: 0, fatG: 0 });
    expect(parsed).not.toBeNull();
    const totals = sumNutrients([parsed!]);
    expect(totals.kcal).toBe(0);
    expect(Object.is(totals.kcal, -0)).toBe(false);
    expect(Number.isNaN(totals.proteinG)).toBe(false);
  });

  it("amount bounds: 0 g, negative, NaN and runaway serving counts are refused", () => {
    expect(parseAmount({ grams: 0 })).toBeNull();
    expect(parseAmount({ grams: -5 })).toBeNull();
    expect(parseAmount({ grams: Number.NaN })).toBeNull();
    expect(parseAmount({ grams: 5000 })).toEqual({ grams: 5000 });
    expect(parseAmount({ grams: 5000.01 })).toBeNull();
    expect(parseAmount({ servings: 0, servingLabel: "1 bowl" })).toBeNull();
    expect(parseAmount({ servings: 100000, servingLabel: "1 bowl" })).toBeNull();
    expect(parseAmount({ servings: 50, servingLabel: "1 bowl" })).toEqual({
      servings: 50,
      servingLabel: "1 bowl",
    });
  });

  it("the entry factory refuses bad amounts even when the math alone would compute them", () => {
    const attempt = (amount: Parameters<typeof createEntryFromFood>[0]["amount"]) =>
      createEntryFromFood({
        food: MY_FOOD,
        amount,
        meal: "lunch",
        day: "2026-11-15",
        source: "custom",
        now: NOW,
      });
    expect(attempt({ grams: -50 })).toBeNull();
    expect(attempt({ grams: 0 })).toBeNull();
    expect(attempt({ grams: Number.NaN })).toBeNull();
    expect(attempt({ servings: 100000, servingLabel: "1 bowl" })).toBeNull();
  });

  it("the math layer itself resolves only positive, finite gram weights", () => {
    expect(gramsForAmount(MY_FOOD, { grams: -50 })).toBeNull();
    expect(gramsForAmount(MY_FOOD, { grams: 0 })).toBeNull();
    expect(gramsForAmount(MY_FOOD, { grams: Number.NaN })).toBeNull();
    expect(gramsForAmount(MY_FOOD, { grams: Number.POSITIVE_INFINITY })).toBeNull();
    expect(entryNutrientsFor(MY_FOOD, { grams: -50 })).toBeNull();
    expect(entryNutrientsFor(MY_FOOD, { grams: Number.NaN })).toBeNull();
    // A serving that weighs nothing (or whose grams went missing) cannot
    // resolve — null, not a silent zero-nutrient entry.
    const weightless: Food = { ...MY_FOOD, servings: [{ label: "1 bowl", grams: 0 }] };
    expect(entryNutrientsFor(weightless, { servings: 1, servingLabel: "1 bowl" })).toBeNull();
    const missing = {
      ...MY_FOOD,
      servings: [{ label: "1 bowl" }],
    } as unknown as Food;
    expect(entryNutrientsFor(missing, { servings: 1, servingLabel: "1 bowl" })).toBeNull();
    // Valid amounts are untouched.
    expect(gramsForAmount(MY_FOOD, { grams: 42 })).toBe(42);
    expect(gramsForAmount(MY_FOOD, { servings: 2, servingLabel: "1 bowl" })).toBe(120);
  });

  it("rounding policy, pinned: entries round kcal/sodium to integers and macros to 1 dp", () => {
    const scaled = nutrientsForGrams(
      { kcal: 101, proteinG: 3.33, carbsG: 3.33, fatG: 3.33, sodiumMg: 55 },
      33,
    );
    expect(scaled).toEqual({ kcal: 33, proteinG: 1.1, carbsG: 1.1, fatG: 1.1, sodiumMg: 18 });
  });

  it("daily totals do not drift: 1,000 small entries sum to the exact decimal", () => {
    const small: Nutrients = { kcal: 1, proteinG: 0.1, carbsG: 0.2, fatG: 0.3 };
    const totals = sumNutrients(Array.from({ length: 1000 }, () => small));
    expect(totals).toEqual({ kcal: 1000, proteinG: 100, carbsG: 200, fatG: 300 });
    const entries = Array.from({ length: 365 }, (_, i) =>
      foodEntry(`drift-${i}`, "2026-11-15"),
    );
    expect(dayLogOf(entries, "2026-11-15").totals.proteinG).toBe(365 * 13);
  });

  it("totals stay finite and exact at the storage ceiling (5,000 max-size entries)", () => {
    const max: Nutrients = { kcal: 2000, proteinG: 100, carbsG: 100, fatG: 100, sodiumMg: 40000 };
    const totals = sumNutrients(Array.from({ length: 5000 }, () => max));
    expect(totals).toEqual({
      kcal: 10_000_000,
      proteinG: 500_000,
      carbsG: 500_000,
      fatG: 500_000,
      sodiumMg: 200_000_000,
    });
  });
});

/* ----------------- 1b · entry caps (finding F1, closed) ---------------- */

describe("hardening · entry nutrients carry whole portions, not per-100 g caps (F1)", () => {
  const CHICKEN: Food = {
    id: "food-chicken",
    name: "Chicken breast",
    per100g: { kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
    servings: [],
    provenance: { kind: "usda", sourceId: "171077", label: "USDA FoodData Central" },
  };

  it("a 500 g chicken-breast entry (155 g protein) now logs with exact values", () => {
    const entry = createEntryFromFood({
      food: CHICKEN,
      amount: { grams: 500 },
      meal: "lunch",
      day: "2026-11-15",
      source: "search",
      now: NOW,
      id: "big-portion",
    });
    expect(entry).not.toBeNull();
    expect(entry!.nutrients).toEqual({ kcal: 825, proteinG: 155, carbsG: 0, fatG: 18 });
    // …and the stored form re-parses to the same entry (round-trip).
    expect(parseLogEntry(entry!)).toEqual(entry);
  });

  it("a 2 500 kcal Coach meal estimate now logs, snapshot and all", () => {
    const totals = { kcal: 2500, proteinG: 120, carbsG: 260, fatG: 110 };
    const entry = createEstimateEntry({
      name: "Thali",
      totals,
      meal: "dinner",
      day: "2026-11-15",
      now: NOW,
      id: "big-estimate",
    });
    expect(entry).not.toBeNull();
    expect(entry!.nutrients).toEqual(totals);
    expect(entry!.snapshot!.totals).toEqual(totals);
  });

  it("entry caps are generous but finite: the boundary holds, absurd entries still refuse", () => {
    const core = { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 };
    expect(parseEntryNutrients({ ...core, kcal: 10000 })).not.toBeNull();
    expect(parseEntryNutrients({ ...core, kcal: 10001 })).toBeNull();
    expect(parseEntryNutrients({ ...core, proteinG: 1000 })).not.toBeNull();
    expect(parseEntryNutrients({ ...core, proteinG: 1001 })).toBeNull();
    // Optional nutrients follow the absence rule at the entry caps too:
    // in range they ride along, out of range they drop alone.
    expect(parseEntryNutrients({ ...core, fibreG: 500 })!.fibreG).toBe(500);
    expect("fibreG" in parseEntryNutrients({ ...core, fibreG: 501 })!).toBe(false);
    expect(parseEntryNutrients({ ...core, sodiumMg: 100000 })!.sodiumMg).toBe(100000);
    expect("sodiumMg" in parseEntryNutrients({ ...core, sodiumMg: 100001 })!).toBe(false);
    expect(
      createEstimateEntry({
        name: "Absurd",
        totals: { kcal: 50000, proteinG: 10, carbsG: 10, fatG: 10 },
        meal: "lunch",
        day: "2026-11-15",
        now: NOW,
      }),
    ).toBeNull();
  });

  it("the per-100 g FOOD caps are unchanged — a food cannot borrow the entry caps", () => {
    const core = { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 };
    expect(parseNutrients({ ...core, kcal: 2000 })).not.toBeNull();
    expect(parseNutrients({ ...core, kcal: 2001 })).toBeNull();
    expect(parseNutrients({ ...core, proteinG: 155 })).toBeNull();
    expect(parseFood({ ...CHICKEN, per100g: { ...CHICKEN.per100g, proteinG: 155 } })).toBeNull();
  });
});

/* --------------------- 2 · provenance & estimates ----------------------- */

describe("hardening · provenance cannot be forged or rewritten", () => {
  it("a food-backed entry carrying a snapshot, or an estimate carrying a food, is refused", () => {
    const food = foodEntry("e-1") as unknown as Record<string, unknown>;
    expect(
      parseLogEntry({ ...food, snapshot: { name: "X", totals: food["nutrients"] } }),
    ).toBeNull();
    const est = estimateEntry("e-2") as unknown as Record<string, unknown>;
    expect(parseLogEntry({ ...est, foodId: "food-mine", snapshot: null })).toBeNull();
    // A non-photo source wearing estimate provenance is refused too.
    expect(parseLogEntry({ ...food, provenance: { kind: "coach_estimate", label: "E" } })).toBeNull();
  });

  it("a log-entry patch cannot rewrite provenance, source, food link, snapshot or timestamps", () => {
    const hostile = {
      meal: "dinner",
      provenance: { kind: "usda", sourceId: "169705", label: "USDA" },
      source: "search",
      foodId: "food-other",
      snapshot: { name: "Forged", totals: { kcal: 1, proteinG: 1, carbsG: 1, fatG: 1 } },
      createdAt: "1999-01-01T00:00:00.000Z",
    } as unknown as Parameters<typeof updateLogEntry>[2];
    const [after] = updateLogEntry([foodEntry("e-1")], "e-1", hostile);
    // The legitimate field in the same patch applies…
    expect(after!.meal).toBe("dinner");
    // …and every origin field is exactly what it was.
    expect(after!.provenance).toEqual(MY_FOOD.provenance);
    expect(after!.source).toBe("custom");
    expect(after!.foodId).toBe("food-mine");
    expect(after!.snapshot).toBeNull();
    expect(after!.createdAt).toBe("2026-11-15T08:00:00.000Z");
  });

  it("an estimate entry stays an estimate under a hostile patch", () => {
    const hostile = {
      meal: "dinner",
      provenance: { kind: "usda", sourceId: "169705", label: "USDA" },
      foodId: "food-mine",
    } as unknown as Parameters<typeof updateLogEntry>[2];
    const [after] = updateLogEntry([estimateEntry("e-9")], "e-9", hostile);
    expect(after!.meal).toBe("dinner");
    expect(after!.provenance.kind).toBe("coach_estimate");
    expect(after!.foodId).toBeNull();
    expect(after!.snapshot?.name).toBe("Biryani");
    expect(labelledEntryNutrients(after!).estimate).toBe(true);
  });

  it("a custom-food patch cannot smuggle a new id or provenance past updateFood", () => {
    const hostile = {
      name: "Renamed",
      provenance: { kind: "usda", sourceId: "169705", label: "USDA" },
      id: "food-other",
    } as unknown as Parameters<typeof updateFood>[2];
    const [after] = updateFood([MY_FOOD], "food-mine", hostile);
    expect(after!.name).toBe("Renamed");
    expect(after!.id).toBe("food-mine");
    expect(after!.provenance.kind).toBe("user_entered");
  });

  it("a custom food is stamped user_entered even when the caller tries to claim a source", () => {
    const hostileInput = {
      name: "Claimed",
      per100g: { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 },
      provenance: { kind: "usda", sourceId: "169705", label: "USDA" },
    } as unknown as Parameters<typeof createCustomFood>[0];
    const food = createCustomFood(hostileInput, "food-claim")!;
    expect(food.provenance).toEqual({
      kind: "user_entered",
      sourceId: "food-claim",
      label: "Your value",
    });
  });

  it("the custom-food store drops a forged reference food on read — the store holds only the user's own", () => {
    const forged: Food = {
      id: "food-forged",
      name: "Forged oats",
      per100g: { kcal: 1, proteinG: 1, carbsG: 1, fatG: 1 },
      servings: [],
      provenance: { kind: "usda", sourceId: "169705", label: "USDA FoodData Central" },
    };
    writeFoods([forged]);
    expect(readFoods()).toEqual([]);
    writeFoods([MY_FOOD, forged]);
    expect(readFoods()).toEqual([MY_FOOD]);
    // Raw envelope level too — e.g. a tampered or sync-merged document.
    expect(
      parseFoodsValue({ version: 1, foods: [forged, MY_FOOD] })?.map((f) => f.id),
    ).toEqual(["food-mine"]);
  });

  it("no display bundle ever carries a blank label", () => {
    expect(provenanceLabel({ kind: "usda", sourceId: "1", label: "   " })).toBe(
      "USDA FoodData Central",
    );
    expect(provenanceLabel({ kind: "coach_estimate", label: "  " })).toContain("Estimate");
    const entry: LogEntry = {
      ...foodEntry("e-1"),
      provenance: { kind: "usda", sourceId: "1", label: " " },
    };
    const labelled = labelledEntryNutrients(entry);
    expect(labelled.label).toBe("USDA FoodData Central");
    expect(labelled.estimate).toBe(false);
    expect(labelledFoodNutrients(MY_FOOD).label).toBe("Your value");
  });
});

/* ------------------------------ 3 · storage ----------------------------- */

describe("hardening · corrupt storage degrades to empty, never to invention", () => {
  it("envelope attacks: wrong types, string versions and missing payloads all degrade", () => {
    expect(parseFoodsValue("garbage")).toBeNull();
    expect(parseFoodsValue(42)).toBeNull();
    expect(parseFoodsValue([])).toBeNull();
    expect(parseFoodsValue({ version: "1", foods: [] })).toBeNull();
    expect(parseFoodsValue({ version: 2, foods: [] })).toBeNull();
    expect(parseFoodsValue({ version: 1, foods: "nope" })).toEqual([]);
    expect(parseFoodsValue({ version: 1 })).toEqual([]);
    expect(parseFoodLogValue({ version: 1, entries: "nope" })).toEqual([]);
    expect(parseFoodLogValue({ version: 1, entries: [foodEntry("ok-1"), { id: "bad" }, null] })).toHaveLength(1);
  });

  it("a corrupt stored value reads as an empty log and an empty day — no crash, no numbers", () => {
    setPref(FOODLOG_KEY, " corrupt ");
    expect(readFoodLog()).toEqual([]);
    const day = readDayLog("2026-11-15");
    expect(day.entries).toEqual([]);
    expect(day.totals).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
    setPref(FOODS_KEY, { version: 1, foods: [null, 7, "x"] });
    expect(readFoods()).toEqual([]);
  });

  it("duplicate ids on read: the first stored copy wins, for foods and entries alike", () => {
    const first: Food = { ...MY_FOOD, name: "First" };
    const second: Food = { ...MY_FOOD, name: "Second" };
    expect(parseFoodsValue({ version: 1, foods: [first, second] })?.map((f) => f.name)).toEqual([
      "First",
    ]);
    const a = foodEntry("dup");
    const b = { ...foodEntry("dup"), meal: "dinner" as const };
    const parsed = parseLogEntryList([a, b]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.meal).toBe("breakfast");
  });

  it("history survives its food: delete the food, the entry and its totals stand", () => {
    const saved = createCustomFood(
      { name: "Soup", per100g: { kcal: 50, proteinG: 2, carbsG: 6, fatG: 1 } },
      "food-soup",
    )!;
    writeFoods([saved]);
    const entry = createEntryFromFood({
      food: saved,
      amount: { grams: 300 },
      meal: "lunch",
      day: "2026-11-15",
      source: "custom",
      now: NOW,
      id: "e-soup",
    })!;
    logEntry(entry);
    deleteCustomFood("food-soup");
    expect(readFoods()).toEqual([]);
    const day = readDayLog("2026-11-15");
    expect(day.entries).toHaveLength(1);
    expect(day.entries[0]!.name).toBe("Soup");
    expect(day.totals).toEqual({ kcal: 150, proteinG: 6, carbsG: 18, fatG: 3 });
    // …and the deleted food falls out of recents resolution.
    expect(recentFoods(readFoodLog(), readFoods())).toEqual([]);
    expect(recentsFromLog(readFoodLog())).toEqual([
      { foodId: "food-soup", count: 1, lastLoggedDay: "2026-11-15" },
    ]);
  });

  it("editing a food after logging never moves the logged numbers", () => {
    const saved = createCustomFood(
      { name: "Rice", per100g: { kcal: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3 } },
      "food-rice",
    )!;
    writeFoods([saved]);
    logEntry(
      createEntryFromFood({
        food: saved,
        amount: { grams: 200 },
        meal: "dinner",
        day: "2026-11-15",
        source: "custom",
        now: NOW,
        id: "e-rice",
      })!,
    );
    const before = readDayLog("2026-11-15").totals;
    editCustomFood("food-rice", {
      per100g: { kcal: 999, proteinG: 99, carbsG: 99, fatG: 99 },
    });
    expect(readDayLog("2026-11-15").totals).toEqual(before);
    expect(before).toEqual({ kcal: 260, proteinG: 5.4, carbsG: 56, fatG: 0.6 });
  });

  it("appending an entry with an existing id replaces it — the log never double-counts", () => {
    const once = appendToLog([], foodEntry("e-1"));
    const twice = appendToLog(once, { ...foodEntry("e-1"), meal: "dinner" as const });
    expect(twice).toHaveLength(1);
    expect(dayLogOf(twice, "2026-11-15").totals.kcal).toBe(380);
  });

  it("the log cap keeps the most recent 5,000 entries and drops the oldest days", () => {
    const raw: unknown[] = [];
    const dayOf = (i: number) => {
      const d = new Date(Date.UTC(2020, 0, 1 + i));
      return d.toISOString().slice(0, 10);
    };
    for (let i = 0; i < 6000; i++) {
      raw.push({
        id: `bulk-${i}`,
        day: dayOf(i),
        meal: "lunch",
        foodId: "food-mine",
        snapshot: null,
        name: "My oats",
        amount: { grams: 100 },
        nutrients: { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 },
        provenance: { kind: "user_entered", sourceId: "food-mine", label: "Your value" },
        source: "custom",
        createdAt: `${dayOf(i)}T08:00:00.000Z`,
      });
    }
    const parsed = parseLogEntryList(raw);
    expect(parsed).toHaveLength(5000);
    expect(parsed[0]!.id).toBe("bulk-1000");
    expect(parsed.at(-1)!.id).toBe("bulk-5999");
  });

  it("F2 (closed): the read-side cap stays as a backstop — an over-cap stored list keeps the first 500", () => {
    const foods: Food[] = Array.from({ length: 501 }, (_, i) => ({
      ...MY_FOOD,
      id: `food-${i}`,
      name: `Food ${i}`,
      provenance: { kind: "user_entered" as const, sourceId: `food-${i}`, label: "Your value" },
    }));
    const kept = parseFoodsValue({ version: 1, foods })!;
    expect(kept).toHaveLength(500);
    expect(kept.at(-1)!.id).toBe("food-499");
    expect(kept.some((f) => f.id === "food-500")).toBe(false);
    // The backstop is no longer the only line of defence: creation now
    // refuses at the cap (next tests), so a stored list can only exceed
    // 500 through tampering or a sync merge — never through the app.
  });

  it("F2 (closed): addFood refuses a NEW food at the cap, but replacing an existing one still works", () => {
    const full: Food[] = Array.from({ length: 500 }, (_, i) => ({
      ...MY_FOOD,
      id: `food-${i}`,
      name: `Food ${i}`,
      provenance: { kind: "user_entered" as const, sourceId: `food-${i}`, label: "Your value" },
    }));
    const newcomer = createCustomFood(
      { name: "One too many", per100g: { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 } },
      "food-new",
    )!;
    let thrown: unknown;
    try {
      addFood(full, newcomer);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(FoodListFullError);
    expect((thrown as Error).message).toBe("Food list is full");
    // Replacement does not grow the list, so it is allowed at the cap.
    const replaced = addFood(full, { ...full[0]!, name: "Renamed" });
    expect(replaced).toHaveLength(500);
    expect(replaced.find((f) => f.id === "food-0")!.name).toBe("Renamed");
  });

  it("F2 (closed): saveCustomFood at the cap fails explicitly and persists nothing", () => {
    const fiveHundred: Food[] = Array.from({ length: 500 }, (_, i) => ({
      ...MY_FOOD,
      id: `food-${i}`,
      name: `Food ${i}`,
      provenance: { kind: "user_entered" as const, sourceId: `food-${i}`, label: "Your value" },
    }));
    writeFoods(fiveHundred);
    expect(() =>
      saveCustomFood({
        name: "One too many",
        per100g: { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 },
      }),
    ).toThrow(FoodListFullError);
    // The stored list is untouched: the first 500 remain, intact.
    const stored = readFoods();
    expect(stored).toHaveLength(500);
    expect(stored[0]!.id).toBe("food-0");
    expect(stored.at(-1)!.id).toBe("food-499");
    expect(stored.some((f) => f.name === "One too many")).toBe(false);
  });

  it("F2 (closed): the 500th food still saves — the refusal starts at 501", () => {
    const fourNinetyNine: Food[] = Array.from({ length: 499 }, (_, i) => ({
      ...MY_FOOD,
      id: `food-${i}`,
      name: `Food ${i}`,
      provenance: { kind: "user_entered" as const, sourceId: `food-${i}`, label: "Your value" },
    }));
    writeFoods(fourNinetyNine);
    const saved = saveCustomFood(
      { name: "Fills the list", per100g: { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 } },
      "food-499",
    );
    expect(saved).not.toBeNull();
    expect(readFoods()).toHaveLength(500);
    expect(() =>
      saveCustomFood({
        name: "One too many",
        per100g: { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 },
      }),
    ).toThrow(FoodListFullError);
  });
});

/* ------------------------------- 4 · time ------------------------------- */

describe("hardening · day keys must be real calendar days", () => {
  const withDay = (day: string) =>
    parseLogEntry({ ...(foodEntry("e-1") as unknown as Record<string, unknown>), day });

  it("impossible dates are refused: no Feb 31, no month 13, no day zero", () => {
    for (const day of [
      "2026-02-31",
      "2026-04-31",
      "2026-13-01",
      "2026-00-10",
      "2026-01-00",
      "2026-01-32",
      "2026-02-29", // 2026 is not a leap year
      "1900-02-29", // divisible by 100, not by 400 — not a leap year
    ]) {
      expect(withDay(day), day).toBeNull();
    }
  });

  it("real edge dates stand: leap days and future days are data, not corruption", () => {
    expect(withDay("2028-02-29")).not.toBeNull();
    expect(withDay("2000-02-29")).not.toBeNull();
    expect(withDay("2999-12-31")).not.toBeNull();
  });

  it("entries either side of midnight bucket into their own days", () => {
    const late = { ...foodEntry("late", "2026-11-15"), createdAt: "2026-11-15T23:59:00.000Z" };
    const early = { ...foodEntry("early", "2026-11-16"), createdAt: "2026-11-16T00:01:00.000Z" };
    const days = groupByDay([early, late]);
    expect(days.map((d) => d.day)).toEqual(["2026-11-15", "2026-11-16"]);
    expect(days[0]!.entries.map((e) => e.id)).toEqual(["late"]);
    expect(days[1]!.entries.map((e) => e.id)).toEqual(["early"]);
    expect(days[0]!.totals.kcal).toBe(380);
    expect(days[1]!.totals.kcal).toBe(380);
  });

  it("a meal outside the enum arriving from storage drops the entry, not the log", () => {
    const good = foodEntry("good");
    const badMeal = { ...(good as unknown as Record<string, unknown>), id: "bad", meal: "BREAKFAST" };
    const parsed = parseLogEntryList([badMeal, good]);
    expect(parsed.map((e) => e.id)).toEqual(["good"]);
  });

  it("a non-string createdAt degrades to empty metadata; the entry itself survives", () => {
    const raw = { ...(foodEntry("e-1") as unknown as Record<string, unknown>), createdAt: 12345 };
    const parsed = parseLogEntry(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.createdAt).toBe("");
  });
});

/* ------------------------------ 5 · targets ----------------------------- */

describe("hardening · targets fail closed — garbage in means no targets, never NaN out", () => {
  const totals: Nutrients = { kcal: 1500, proteinG: 60, carbsG: 180, fatG: 50 };

  it("the legacy adapter refuses NaN, infinite, zero and negative engine values", () => {
    const asTargets = (t: unknown) => nutritionTargetsFromBodyTargets(t as BodyTargets);
    expect(asTargets({ calories: Number.NaN, proteinG: 100 })).toBeNull();
    expect(asTargets({ calories: Number.POSITIVE_INFINITY, proteinG: 100 })).toBeNull();
    expect(asTargets({ calories: 2000, proteinG: -5 })).toBeNull();
    expect(asTargets({ calories: 0, proteinG: 100 })).toBeNull();
    expect(asTargets({ calories: 2000, proteinG: 0 })).toBeNull();
    // A sane engine answer still adapts.
    expect(asTargets({ calories: 2200, proteinG: 120 })).toEqual({ kcal: 2200, proteinG: 120 });
  });

  it("an ok:true outcome carrying garbage targets is refused by the adapter", () => {
    const outcome = (targets: unknown) =>
      nutritionTargetsFromOutcome({ ok: true, targets } as unknown as BodyTargetsOutcome);
    expect(outcome({ calorieTargetKcal: -100, proteinG: 90 })).toBeNull();
    expect(outcome({ calorieTargetKcal: Number.NaN, proteinG: 90 })).toBeNull();
    expect(outcome({ calorieTargetKcal: 1800, proteinG: 0 })).toBeNull();
    expect(outcome({ calorieTargetKcal: 1800, proteinG: 90 })).toEqual({ kcal: 1800, proteinG: 90 });
  });

  it("the comparison itself fails closed: invalid targets behave exactly like no targets", () => {
    for (const bad of [
      { kcal: Number.NaN, proteinG: 90 },
      { kcal: -500, proteinG: 90 },
      { kcal: 0, proteinG: 0 },
      { kcal: 2000, proteinG: Number.NaN },
    ]) {
      const cmp = compareTotalsToTargets(totals, bad);
      expect(cmp.targets).toBeNull();
      expect(cmp.kcalRemaining).toBeNull();
      expect(cmp.proteinRemaining).toBeNull();
      expect(cmp.kcalFraction).toBeNull();
      expect(cmp.proteinFraction).toBeNull();
      expect(cmp.totals).toEqual(totals);
    }
    // And a valid comparison is untouched.
    const ok = compareTotalsToTargets(totals, { kcal: 2000, proteinG: 100 });
    expect(ok.kcalRemaining).toBe(500);
    expect(ok.proteinRemaining).toBe(40);
  });
});

/* ------------------------------ 6 · recents ----------------------------- */

describe("hardening · recents stay honest under interleaving and deletion", () => {
  it("estimates interleaved with real entries never surface and never inflate counts", () => {
    const entries = [
      foodEntry("r-1", "2026-11-14"),
      estimateEntry("r-2", "2026-11-15"),
      foodEntry("r-3", "2026-11-15"),
      estimateEntry("r-4", "2026-11-15"),
    ];
    expect(recentsFromLog(entries)).toEqual([
      { foodId: "food-mine", count: 2, lastLoggedDay: "2026-11-15" },
    ]);
  });

  it("unsorted input still derives the true most-recent day", () => {
    const entries = [
      foodEntry("u-3", "2026-11-15"),
      foodEntry("u-1", "2026-11-10"),
      foodEntry("u-2", "2026-11-12"),
    ];
    expect(recentsFromLog(entries)).toEqual([
      { foodId: "food-mine", count: 3, lastLoggedDay: "2026-11-15" },
    ]);
    expect(recentsFromLog(entries, 0)).toEqual([]);
  });

  it("a ghost food id is derived faithfully but resolves to nothing", () => {
    const ghost: LogEntry = { ...foodEntry("g-1"), foodId: "food-ghost" };
    expect(recentsFromLog([ghost]).map((r) => r.foodId)).toEqual(["food-ghost"]);
    expect(recentFoods([ghost], [MY_FOOD])).toEqual([]);
    expect(recentFoods([ghost, foodEntry("g-2")], [MY_FOOD]).map((f) => f.id)).toEqual([
      "food-mine",
    ]);
  });
});

/* ---------------------------- 7 · concurrency --------------------------- */

describe("hardening · read-modify-write: what the layers actually guarantee", () => {
  it("the pref wrappers never lose entries: sequential appends, edits and deletes compose", () => {
    logEntry(foodEntry("c-1"));
    logEntry(foodEntry("c-2"));
    editLogEntry("c-1", { meal: "lunch" });
    logEntry(foodEntry("c-3"));
    deleteLogEntry("c-2");
    const stored = readFoodLog();
    expect(stored.map((e) => e.id)).toEqual(["c-1", "c-3"]);
    expect(stored[0]!.meal).toBe("lunch");
  });

  it("the pure list operations do not mutate their inputs", () => {
    const base = [foodEntry("p-1")];
    const snapshot = [...base];
    appendToLog(base, foodEntry("p-2"));
    updateLogEntry(base, "p-1", { meal: "dinner" });
    removeLogEntry(base, "p-1");
    expect(base).toEqual(snapshot);
  });

  it("FINDING (pinned behaviour): two writers holding the same snapshot lose the first writer's entry", () => {
    // The wrappers above are safe because each re-reads synchronously in
    // the same tick. A caller that holds a snapshot across an await and
    // writes it back through writeFoodLog gets last-write-wins — the
    // precise loss window documented in the hardening report, together
    // with the cross-device one (prefs merge is per-key later-wins for
    // this key; only the points ledger unions).
    const snapA = readFoodLog();
    const snapB = readFoodLog();
    writeFoodLog(appendToLog(snapA, foodEntry("w-1")));
    writeFoodLog(appendToLog(snapB, foodEntry("w-2")));
    expect(readFoodLog().map((e) => e.id)).toEqual(["w-2"]);
  });
});
