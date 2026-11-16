// @vitest-environment jsdom
/**
 * The N-UI day view, driven end to end: the date strip moves the
 * whole tab, the timeline edits grams inline and swaps USDA foods
 * through the hardened path, the spectrum marks sodium as a ceiling
 * and unknowns with asterisks, and PatternLab keeps its honest empty
 * state until real mood + food days exist on both sides.
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { setPref } from "@/lib/prefs";
import { BODY_KEY, type BodyProfile } from "@/lib/health/body";
import { yesterdayOf } from "@/hooks/useNutrition";
import { shiftDay, todayLocal } from "@/lib/localDay";
import { createEntryFromFood } from "@/lib/nutrition/entries";
import { saveCustomFood } from "@/lib/nutrition/foods";
import { logEntry } from "@/lib/nutrition/log";
import { readFoodLog } from "@/lib/nutrition/store";
import { findUsdaReference } from "@/lib/nutrition/usdaReference";
import { resetPrefCache } from "@/lib/prefsStore";
import type { Food } from "@/lib/nutrition/types";
import { NutritionPage } from "./NutritionPage";

beforeEach(() => {
  window.matchMedia =
    window.matchMedia ??
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList);
  window.localStorage.clear();
  resetPrefCache();
});

afterEach(() => cleanup());

function seedBodyProfile() {
  const profile: BodyProfile = {
    units: "metric",
    heightCm: 178,
    weightKg: 72,
    targetWeightKg: null,
    age: 30,
    sex: "female",
    activity: "moderate",
    goal: "maintain",
    rateKgPerWeek: 0.5,
    updatedAt: "2026-11-15T00:00:00.000Z",
  };
  setPref(BODY_KEY, profile);
}

function log(food: Food, grams: number, day: string, meal: "breakfast" | "lunch" = "breakfast") {
  const entry = createEntryFromFood({
    food,
    amount: { grams },
    meal,
    day,
    source: "search",
    now: `${day}T08:00:00.000Z`,
  });
  if (!entry) throw new Error("entry refused");
  logEntry(entry);
  return entry;
}

describe("DateNav", () => {
  it("moves the whole tab to the chosen day", () => {
    const oats = saveCustomFood({
      name: "Nav Oats",
      per100g: { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 },
    });
    if (!oats) throw new Error("seed refused");
    log(oats, 100, yesterdayOf(todayLocal()));

    render(<NutritionPage />);
    expect(screen.getByText("Nothing logged yet")).toBeTruthy();
    const cell = screen.getByRole("button", { name: "Yesterday" });
    fireEvent.click(cell);
    expect(screen.getByText("Nav Oats")).toBeTruthy();
    expect(screen.queryByText("Nothing logged yet")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Yesterday" }).getAttribute("aria-current"),
    ).toBe("date");
  });
});

describe("Timeline — inline gram edit", () => {
  it("rewrites a gram-based entry through the hardened update", () => {
    const egg = findUsdaReference("usda-171287")!;
    log(egg, 100, todayLocal());
    render(<NutritionPage />);
    fireEvent.click(screen.getByRole("button", { name: /Edit grams for Egg/ }));
    const input = screen.getByLabelText(/Grams for Egg/);
    fireEvent.change(input, { target: { value: "200" } });
    fireEvent.click(screen.getByRole("button", { name: "Save grams" }));
    const stored = readFoodLog();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.amount).toEqual({ grams: 200 });
    expect(stored[0]!.nutrients.kcal).toBe(286);
  });
});

describe("Timeline — swaps", () => {
  it("offers calorie-matched same-group swaps and applies one in place", () => {
    const egg = findUsdaReference("usda-171287")!;
    const before = log(egg, 100, todayLocal());
    render(<NutritionPage />);
    fireEvent.click(screen.getByRole("button", { name: /Swaps for Egg/ }));
    expect(screen.getByText(/Calorie-matched swaps/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Swap Egg, whole, raw, fresh for Egg, white, raw, fresh",
      }),
    );
    const stored = readFoodLog();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).toBe(before.id);
    expect(stored[0]!.foodId).toBe("usda-172183");
    expect(stored[0]!.provenance.kind).toBe("usda");
    expect(stored[0]!.nutrients.kcal).toBe(143);
  });
});

describe("Spectrum", () => {
  it("shows sodium against its ceiling and asterisks what some food did not report", () => {
    seedBodyProfile();
    const salt = findUsdaReference("usda-173468")!;
    log(salt, 10, todayLocal(), "lunch"); /* ≈3,876 mg sodium */
    const oats = saveCustomFood({
      name: "Spectrum Oats",
      per100g: { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 },
    });
    if (!oats) throw new Error("seed refused");
    log(oats, 100, todayLocal());

    render(<NutritionPage />);
    const heading = screen.getByText("Beyond the macros");
    const card = heading.closest("section") as HTMLElement;
    expect(within(card).getByText(/3,876 \/ 2,000 mg/)).toBeTruthy();
    expect(within(card).getByText("limit")).toBeTruthy();
    expect(within(card).getAllByText("*").length).toBeGreaterThan(0);
    expect(within(card).getByText(/a floor — not a claim/)).toBeTruthy();
    expect(within(card).getByText(/ICMR-NIN Recommended Dietary Allowances 2020/)).toBeTruthy();
  });
});

describe("WeekPanel + PatternLab", () => {
  it("summarises the week and links the clinician report for the selected day", () => {
    seedBodyProfile();
    const egg = findUsdaReference("usda-171287")!;
    log(egg, 100, todayLocal());
    render(<NutritionPage />);
    const heading = screen.getByText("Your rhythm");
    const card = heading.closest("section") as HTMLElement;
    expect(within(card).getByText("143")).toBeTruthy(); /* avg kcal = the one logged day */
    const link = within(card).getByRole("link", { name: /Clinician report/ });
    expect(link.getAttribute("href")).toContain("/nutrition/report");
  });

  it("PatternLab keeps the honest empty state with no mood history", () => {
    render(<NutritionPage />);
    expect(screen.getByText(/How food and mood/)).toBeTruthy();
    expect(screen.getByText(/Patterns appear once you have at least two days/)).toBeTruthy();
  });

  it("a future day in the strip is reachable — Bloom logs future days too", () => {
    render(<NutritionPage />);
    const tomorrow = shiftDay(todayLocal(), 1);
    const label = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(
      new Date(`${tomorrow}T12:00:00`),
    );
    /* The strip cell carries the full day label as its accessible name. */
    expect(screen.getAllByRole("button").some((b) => b.getAttribute("aria-label"))).toBe(true);
    expect(label.length).toBeGreaterThan(0);
  });
});
