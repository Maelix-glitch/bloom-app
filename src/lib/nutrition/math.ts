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

import {
  OPTIONAL_NUTRIENT_KEYS,
  type Amount,
  type DayLog,
  type Food,
  type LogEntry,
  type Nutrients,
  type OptionalNutrientKey,
} from "./types";

const round1 = (n: number) => Math.round(n * 10) / 10;
const round0 = (n: number) => Math.round(n);

/** Display rounding per optional field: gram and large-milligram values
 *  print whole; the small-milligram traces (iron, vitamin C) keep a
 *  decimal, where a whole-milligram rounding would erase them. */
const OPTIONAL_ROUND: Record<OptionalNutrientKey, (n: number) => number> = {
  fibreG: round1,
  sugarG: round1,
  sodiumMg: round0,
  potassiumMg: round0,
  magnesiumMg: round0,
  calciumMg: round0,
  ironMg: round1,
  vitaminCMg: round1,
};

function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  const out: Nutrients = {
    kcal: round0(per100g.kcal * f),
    proteinG: round1(per100g.proteinG * f),
    carbsG: round1(per100g.carbsG * f),
    fatG: round1(per100g.fatG * f),
  };
  for (const key of OPTIONAL_NUTRIENT_KEYS) {
    const value = per100g[key];
    if (value !== undefined) out[key] = OPTIONAL_ROUND[key](value * f);
  }
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

/** Sum stored entry nutrients. Absence is preserved per optional field:
 *  a field appears in the total only when at least one input carries it,
 *  summed over the inputs that do. */
export function sumNutrients(list: readonly Nutrients[]): Nutrients {
  const out: Nutrients = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const optional = new Map<OptionalNutrientKey, number>();
  for (const n of list) {
    out.kcal += n.kcal;
    out.proteinG += n.proteinG;
    out.carbsG += n.carbsG;
    out.fatG += n.fatG;
    for (const key of OPTIONAL_NUTRIENT_KEYS) {
      const value = n[key];
      if (value !== undefined) optional.set(key, (optional.get(key) ?? 0) + value);
    }
  }
  out.kcal = round0(out.kcal);
  out.proteinG = round1(out.proteinG);
  out.carbsG = round1(out.carbsG);
  out.fatG = round1(out.fatG);
  for (const [key, total] of optional) out[key] = OPTIONAL_ROUND[key](total);
  return out;
}

/**
 * Which optional fields a set of nutrient bundles is INCOMPLETE in: a
 * field is incomplete when at least one bundle does not carry it — the
 * summed total for that field is then a floor over the foods that
 * reported it, not the day's whole intake. An empty set is incomplete
 * in nothing (there is no total to misread).
 */
export function incompleteOptionalFields(
  list: readonly Nutrients[],
): ReadonlySet<OptionalNutrientKey> {
  const out = new Set<OptionalNutrientKey>();
  if (list.length === 0) return out;
  for (const key of OPTIONAL_NUTRIENT_KEYS) {
    if (list.some((n) => n[key] === undefined)) out.add(key);
  }
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
