/**
 * The capture confirm write, pinned at the log.
 *
 * The pins that matter:
 *   · an unedited confirm stores the analysis's portion totals EXACTLY
 *     — as the entry's nutrients and as its snapshot — with the
 *     estimate provenance and label (the PR #118 rule: no per-100 g
 *     basis is ever invented for a photo estimate);
 *   · no reusable Food is created by logging a capture;
 *   · a refused entry (totals beyond the caps) writes nothing.
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

import { COACH_ESTIMATE_LABEL } from "@/lib/nutrition/entries";
import { readFoodLog, readFoods } from "@/lib/nutrition/store";
import type { Nutrients } from "@/lib/nutrition/types";

import { logCaptureEstimate } from "./log";

const NOW = "2026-11-18T07:30:00.000Z";
const DAY = "2026-11-18";

/** The totals as an analysis returned them (coachLog's shape: the four
 *  macros the ≈ line carries, nothing more). */
const ANALYSED: Nutrients = { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 };

beforeEach(() => {
  mockDoc.clear();
});

describe("logCaptureEstimate — the estimate lands exactly as analysed", () => {
  it("stores the portion totals untouched, labelled an estimate, with no per-100 g basis", () => {
    const entry = logCaptureEstimate({
      name: "Chicken biryani",
      totals: ANALYSED,
      meal: "lunch",
      day: DAY,
      now: NOW,
    });
    expect(entry).not.toBeNull();

    const logged = readFoodLog();
    expect(logged).toHaveLength(1);
    const stored = logged[0]!;

    /* The entry IS the analysed totals — digit for digit, in both the
       live nutrients and the frozen snapshot. */
    expect(stored.nutrients).toEqual(ANALYSED);
    expect(stored.snapshot).toEqual({ name: "Chicken biryani", totals: ANALYSED });

    /* Estimate forever: provenance, source, and the photo-portion
       amount — one portion, never a weight and never a profile. */
    expect(stored.provenance).toEqual({ kind: "coach_estimate", label: COACH_ESTIMATE_LABEL });
    expect(stored.source).toBe("coach_photo");
    expect(stored.foodId).toBeNull();
    expect(stored.amount).toEqual({ servings: 1, servingLabel: "Photo portion" });
    expect(stored.meal).toBe("lunch");
    expect(stored.day).toBe(DAY);

    /* No per-100 g profile exists anywhere on the entry — the PR #118
       pin. A converted basis would have to live in a field like this. */
    expect(stored).not.toHaveProperty("per100g");
    expect(JSON.stringify(stored)).not.toContain("per100g");

    /* And no reusable Food was created from the estimate. */
    expect(readFoods()).toEqual([]);
  });

  it("stores the user's edited totals as given — still an estimate, still no conversion", () => {
    const edited: Nutrients = { kcal: 500, proteinG: 30, carbsG: 55, fatG: 18 };
    const entry = logCaptureEstimate({
      name: "Chicken biryani (smaller portion)",
      totals: edited,
      meal: "dinner",
      day: DAY,
      now: NOW,
    });
    expect(entry?.nutrients).toEqual(edited);
    expect(entry?.snapshot?.totals).toEqual(edited);
    expect(entry?.provenance.kind).toBe("coach_estimate");
    expect(readFoods()).toEqual([]);
  });

  it("refuses totals beyond the entry caps and writes nothing", () => {
    const entry = logCaptureEstimate({
      name: "Impossible feast",
      totals: { kcal: 50_000, proteinG: 42, carbsG: 75, fatG: 24 },
      meal: "lunch",
      day: DAY,
      now: NOW,
    });
    expect(entry).toBeNull();
    expect(readFoodLog()).toEqual([]);
  });
});
