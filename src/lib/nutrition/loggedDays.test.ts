/**
 * M-244 (research R-2511-08) — the complete-day rule counts MAIN meals.
 *
 * The owner's decision (2026-11-25): a day is complete when at least
 * two main meals (breakfast, lunch, dinner) are logged. A snack never
 * makes a day complete, and one main meal plus snacks is a fragment.
 * These tests pin that rule where the learning paths read it.
 */
import { describe, expect, it } from "vitest";
import { completeLoggedDayTotals, isCompleteLoggedDay, loggedDayTotals } from "./loggedDays";
import type { LogEntry } from "./types";

let seq = 0;
function entry(day: string, meal: LogEntry["meal"], kcal: number, proteinG: number): LogEntry {
  seq += 1;
  return {
    id: `ld-${seq}`,
    day,
    meal,
    foodId: null,
    snapshot: null,
    name: "logged",
    amount: { grams: 100 },
    nutrients: { kcal, proteinG, carbsG: 0, fatG: 0 },
    provenance: { kind: "user_entered", sourceId: "loggeddays-fixture", label: "Your value" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

describe("M-244 · complete day = at least two main meals", () => {
  it("lunch + dinner is complete, and mainMeals counts only main meals", () => {
    const totals = loggedDayTotals([
      entry("2026-11-20", "lunch", 500, 30),
      entry("2026-11-20", "dinner", 400, 20),
      entry("2026-11-20", "snack", 150, 3),
    ]).get("2026-11-20");
    expect(totals?.meals).toBe(3);
    expect(totals?.mainMeals).toBe(2);
    expect(totals && isCompleteLoggedDay(totals)).toBe(true);
  });

  it("one main meal plus a snack is NOT complete (the M-244 change)", () => {
    const entries = [entry("2026-11-20", "lunch", 600, 35), entry("2026-11-20", "snack", 200, 5)];
    const totals = loggedDayTotals(entries).get("2026-11-20");
    expect(totals?.meals).toBe(2);
    expect(totals?.mainMeals).toBe(1);
    expect(completeLoggedDayTotals(entries).size).toBe(0);
  });

  it("snacks alone never complete a day, however many", () => {
    const entries = [
      entry("2026-11-20", "snack", 200, 5),
      entry("2026-11-20", "snack", 300, 6),
      entry("2026-11-20", "snack", 100, 2),
    ];
    expect(completeLoggedDayTotals(entries).size).toBe(0);
  });

  it("two entries at the same main meal are not two main meals", () => {
    const entries = [entry("2026-11-20", "lunch", 400, 20), entry("2026-11-20", "lunch", 300, 15)];
    const totals = loggedDayTotals(entries).get("2026-11-20");
    expect(totals?.mainMeals).toBe(1);
    expect(completeLoggedDayTotals(entries).size).toBe(0);
  });

  it("breakfast + lunch completes a day without dinner", () => {
    const entries = [entry("2026-11-20", "breakfast", 450, 25), entry("2026-11-20", "lunch", 550, 35)];
    expect(completeLoggedDayTotals(entries).size).toBe(1);
  });
});
