/**
 * Nutrition — pure math (design §4.1).
 *
 * Entry nutrients are per-100 g × amount; a serving amount resolves through
 * the food's own serving grams. Daily totals are a plain sum over the day's
 * stored entry nutrients. Optional nutrients follow the absence rule all the
 * way through: a total carries fibre/sodium only when at least one entry
 * carries them, summed over the entries that do — absent is never presented
 * as zero.
 */

import type { Amount, DayLog, Food, LogEntry, Nutrients } from "./types";

const round1 = (n: number) => Math.round(n * 10) / 10;
const round0 = (n: number) => Math.round(n);

function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  const out: Nutrients = {
    kcal: round0(per100g.kcal * f),
    proteinG: round1(per100g.proteinG * f),
    carbsG: round1(per100g.carbsG * f),
    fatG: round1(per100g.fatG * f),
  };
  if (per100g.fibreG !== undefined) out.fibreG = round1(per100g.fibreG * f);
  if (per100g.sodiumMg !== undefined) out.sodiumMg = round0(per100g.sodiumMg * f);
  return out;
}

/** Nutrients for an amount of a food's per-100 g values, by grams directly. */
export function nutrientsForGrams(per100g: Nutrients, grams: number): Nutrients {
  return scaleNutrients(per100g, grams);
}

/** The gram weight an amount means for this food. Null when a serving
 *  amount names a serving the food does not define — and null whenever the
 *  resolved weight is not a positive, finite number, so a negative, NaN or
 *  weightless amount can never scale nutrients into nonsense downstream. */
export function gramsForAmount(food: Food, amount: Amount): number | null {
  if ("grams" in amount) {
    return Number.isFinite(amount.grams) && amount.grams > 0 ? amount.grams : null;
  }
  const serving = food.servings.find((s) => s.label === amount.servingLabel);
  if (!serving) return null;
  const grams = serving.grams * amount.servings;
  return Number.isFinite(grams) && grams > 0 ? grams : null;
}

/** Nutrients for an amount of a food. Null when the amount cannot resolve. */
export function entryNutrientsFor(food: Food, amount: Amount): Nutrients | null {
  const grams = gramsForAmount(food, amount);
  if (grams === null) return null;
  return scaleNutrients(food.per100g, grams);
}

/** Sum stored entry nutrients. Absence is preserved per optional field. */
export function sumNutrients(list: readonly Nutrients[]): Nutrients {
  const out: Nutrients = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  let fibre = 0;
  let fibreSeen = false;
  let sodium = 0;
  let sodiumSeen = false;
  for (const n of list) {
    out.kcal += n.kcal;
    out.proteinG += n.proteinG;
    out.carbsG += n.carbsG;
    out.fatG += n.fatG;
    if (n.fibreG !== undefined) {
      fibre += n.fibreG;
      fibreSeen = true;
    }
    if (n.sodiumMg !== undefined) {
      sodium += n.sodiumMg;
      sodiumSeen = true;
    }
  }
  out.kcal = round0(out.kcal);
  out.proteinG = round1(out.proteinG);
  out.carbsG = round1(out.carbsG);
  out.fatG = round1(out.fatG);
  if (fibreSeen) out.fibreG = round1(fibre);
  if (sodiumSeen) out.sodiumMg = round0(sodium);
  return out;
}

/** One day's entries with their totals. */
export function dayLogOf(entries: readonly LogEntry[], day: string): DayLog {
  const dayEntries = entries.filter((e) => e.day === day);
  return { day, entries: dayEntries, totals: sumNutrients(dayEntries.map((e) => e.nutrients)) };
}

/** All days present in the log, oldest first, each with its totals. */
export function groupByDay(entries: readonly LogEntry[]): DayLog[] {
  const days = [...new Set(entries.map((e) => e.day))].sort();
  return days.map((day) => dayLogOf(entries, day));
}
