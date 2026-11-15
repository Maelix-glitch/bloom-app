/**
 * Nutrition UI — small pure helpers for the dumb-proof rules (owner
 * directive): forgiving numeric parsing, a meal slot that matches the
 * time of day, and display formatting for amounts. None of these compute
 * nutrients — every number they touch is an amount the user typed or a
 * stored value being formatted; nutrient maths lives in the lib alone.
 */

import type { Amount, Meal, Nutrients } from "@/lib/nutrition";

/**
 * Parse a number the way a person types it on a packet label or a phone
 * keyboard: surrounding and internal spaces are ignored, and a comma is
 * understood as the decimal separator ("1,5" → 1.5) — except in the one
 * shape where it is unambiguous as a thousands separator ("1,000" →
 * 1000, "12,500" → 12500, "1.250,5" → 1250.5). Anything with letters,
 * signs or a second decimal point is refused (null), never guessed at.
 */
export function parseForgivingNumber(raw: string): number | null {
  let s = raw.trim().replace(/\s+/g, "");
  if (!s) return null;
  if (!/^[0-9.,]+$/.test(s)) return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    /* The rightmost separator is the decimal one; the other is thousands. */
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1]!.length === 3 && parts[0]!.length >= 1 && parts[0]!.length <= 3 && parts[0] !== "0") {
      /* "1,000" — a thousands separator, not a decimal comma. */
      s = parts.join("");
    } else if (parts.length === 2) {
      s = parts.join(".");
    } else {
      return null;
    }
  } else if (hasDot && s.split(".").length > 2) {
    return null;
  }

  const value = Number(s);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** The meal slot a log most likely belongs to at this hour. */
export function mealForTime(now: Date): Meal {
  const hour = now.getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** "150 g" / "2 × 1 katori" — what the user actually ate, in their terms. */
export function amountLabel(amount: Amount): string {
  if ("grams" in amount) return `${formatGrams(amount.grams)} g`;
  return `${formatGrams(amount.servings)} × ${amount.servingLabel}`;
}

/** Whole numbers print whole; anything else keeps one decimal. */
export function formatGrams(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatKcal(n: number): string {
  return String(Math.round(n));
}

/**
 * One line of a labelled nutrient bundle: "320 kcal · 12 g protein ·
 * 45 g carbs · 9 g fat", with fibre/sodium appended only when the source
 * provided them (absent is not zero — the lib's absence rule, kept at the
 * display layer too).
 */
export function nutrientLine(nutrients: Nutrients): string {
  const parts = [
    `${formatKcal(nutrients.kcal)} kcal`,
    `${formatGrams(nutrients.proteinG)} g protein`,
    `${formatGrams(nutrients.carbsG)} g carbs`,
    `${formatGrams(nutrients.fatG)} g fat`,
  ];
  if (nutrients.fibreG !== undefined) parts.push(`${formatGrams(nutrients.fibreG)} g fibre`);
  if (nutrients.sodiumMg !== undefined) parts.push(`${Math.round(nutrients.sodiumMg)} mg sodium`);
  return parts.join(" · ");
}
