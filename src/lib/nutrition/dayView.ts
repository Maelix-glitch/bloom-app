/**
 * Nutrition — day-view aggregations (N-UI).
 *
 * The computations the rebuilt Nutrition tab renders: where the day's
 * energy came from (by provenance), when eating started and stopped,
 * the week's rhythm, and the micronutrient spectrum against reference
 * intakes. Everything here is a plain sum or a stated comparison over
 * the user's real log — no inference, no invented values. A total that
 * rests on foods which did not report a nutrient is flagged INCOMPLETE
 * (see `incompleteOptionalFields` in math.ts): the number is a floor,
 * never a claim about the whole day.
 */

import { shiftDay } from "@/lib/localDay";
import { dayLogOf, incompleteOptionalFields, sumNutrients } from "./math";
import type { LogEntry, Nutrients, OptionalNutrientKey } from "./types";

/* ------------------------------ provenance ------------------------------ */

export interface SourceShares {
  /** kcal from USDA reference foods (incl. plan-logged USDA foods). */
  usdaKcal: number;
  /** kcal from the user's own entered values. */
  ownKcal: number;
  /** kcal from Coach photo estimates. */
  estimateKcal: number;
  totalKcal: number;
  /**
   * The share of energy that carries a stated value rather than an
   * estimate — (USDA + own) ÷ total. Null when nothing is logged: there
   * is no share of an empty day.
   */
  verifiedShare: number | null;
}

/** Group the day's energy by the provenance of the entries it came from. */
export function kcalByProvenance(entries: readonly LogEntry[]): SourceShares {
  let usdaKcal = 0;
  let ownKcal = 0;
  let estimateKcal = 0;
  for (const entry of entries) {
    switch (entry.provenance.kind) {
      case "usda":
        usdaKcal += entry.nutrients.kcal;
        break;
      case "user_entered":
        ownKcal += entry.nutrients.kcal;
        break;
      case "coach_estimate":
        estimateKcal += entry.nutrients.kcal;
        break;
      default:
        /* A food provenance Bloom cannot plan or verify with today
           (off / ifct) counts toward the day but toward no share. */
        break;
    }
  }
  const totalKcal = usdaKcal + ownKcal + estimateKcal;
  return {
    usdaKcal,
    ownKcal,
    estimateKcal,
    totalKcal,
    verifiedShare: totalKcal > 0 ? (usdaKcal + ownKcal) / totalKcal : null,
  };
}

/* ----------------------------- eating window ---------------------------- */

export interface EatingWindow {
  /** Local HH:MM of the first entry that carries a usable timestamp. */
  first: string;
  /** Local HH:MM of the last such entry. */
  last: string;
  /** Whole minutes between first and last; 0 for a single sitting. */
  spanMinutes: number;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function clockOf(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/**
 * The day's eating window, from the entries' creation timestamps.
 * Entries whose stored `createdAt` is missing or unparseable (possible
 * in older stored data — the parser defaults it to "") simply do not
 * take part; when NO entry carries a usable time, the window is null
 * and the surface omits the block rather than guessing. Nothing is
 * backfilled: a timestamp Bloom did not record is not invented later.
 */
export function eatingWindowOf(entries: readonly LogEntry[]): EatingWindow | null {
  let first: Date | null = null;
  let last: Date | null = null;
  for (const entry of entries) {
    if (!entry.createdAt) continue;
    const at = new Date(entry.createdAt);
    if (Number.isNaN(at.getTime())) continue;
    if (!first || at < first) first = at;
    if (!last || at > last) last = at;
  }
  if (!first || !last) return null;
  return {
    first: clockOf(first),
    last: clockOf(last),
    spanMinutes: Math.max(0, Math.round((last.getTime() - first.getTime()) / 60000)),
  };
}

/** "7 h 20 min" / "45 min" — the window's span, for display. */
export function formatSpan(spanMinutes: number): string {
  const h = Math.floor(spanMinutes / 60);
  const m = spanMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** The local HH:MM an entry was created at, or null when its stored
 *  timestamp is missing or unparseable. */
export function entryClock(entry: LogEntry): string | null {
  if (!entry.createdAt) return null;
  const at = new Date(entry.createdAt);
  return Number.isNaN(at.getTime()) ? null : clockOf(at);
}

/* --------------------------------- week --------------------------------- */

export interface WeekDay {
  day: string;
  /** Null when nothing was logged that day — an honest gap, not a zero. */
  totals: Nutrients | null;
  entryCount: number;
}

export interface WeekAggregates {
  /** Seven days ending on (and including) `endDay`, oldest first. */
  days: WeekDay[];
  loggedDays: number;
  /** Mean kcal over LOGGED days only; null when no day is logged. */
  avgKcal: number | null;
  /** Mean protein over LOGGED days only; null when no day is logged. */
  avgProteinG: number | null;
  /** Mean carbs over LOGGED days only; null when no day is logged. */
  avgCarbsG: number | null;
  /** Mean fat over LOGGED days only; null when no day is logged. */
  avgFatG: number | null;
  /** Logged days whose protein reached ≥ 90% of the target. Null when
   *  there is no protein target to judge against. */
  proteinHitDays: number | null;
}

/** The 7-day window ending on the selected day, with logged-day averages. */
export function weekAggregates(
  entries: readonly LogEntry[],
  endDay: string,
  proteinTargetG: number | null,
): WeekAggregates {
  const days: WeekDay[] = [];
  for (let back = 6; back >= 0; back -= 1) {
    const day = shiftDay(endDay, -back);
    const log = dayLogOf(entries, day);
    days.push({
      day,
      totals: log.entries.length > 0 ? log.totals : null,
      entryCount: log.entries.length,
    });
  }
  const logged = days.filter((d) => d.totals !== null);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    days,
    loggedDays: logged.length,
    avgKcal:
      logged.length > 0
        ? Math.round(logged.reduce((s, d) => s + d.totals!.kcal, 0) / logged.length)
        : null,
    avgProteinG:
      logged.length > 0
        ? round1(logged.reduce((s, d) => s + d.totals!.proteinG, 0) / logged.length)
        : null,
    avgCarbsG:
      logged.length > 0
        ? round1(logged.reduce((s, d) => s + d.totals!.carbsG, 0) / logged.length)
        : null,
    avgFatG:
      logged.length > 0
        ? round1(logged.reduce((s, d) => s + d.totals!.fatG, 0) / logged.length)
        : null,
    proteinHitDays:
      proteinTargetG !== null && proteinTargetG > 0
        ? logged.filter((d) => d.totals!.proteinG >= 0.9 * proteinTargetG).length
        : null,
  };
}

/* ------------------------------- spectrum ------------------------------- */

/**
 * Reference intakes for the micronutrient spectrum: ICMR-NIN Recommended
 * Dietary Allowances 2020 for adults (the values the panel cites in its
 * footnote). Magnesium, iron and vitamin C are sex-specific in the RDA;
 * potassium, calcium are stated as single adult values; fibre follows
 * the ICMR-NIN guidance figure; sodium is a CEILING (the RDA's upper
 * guidance), drawn as a limit, not a goal. When the profile does not
 * state a sex, the sex-specific rows use the male values as the stated
 * default and the panel's footnote stays generic ("common reference
 * intakes") — the default is named here rather than assumed silently.
 *
 * M-219 (audit F-09): magnesium used to carry the EAR figures
 * (370/310) under an RDA citation — the RDA is 440 (M) / 370 (F) —
 * which overstated magnesium coverage ~19% and desensitised the
 * adaptation engine's micro-gap detection; vitamin C was coded 80
 * for both sexes where the RDA is 80 (M) / 65 (F). Both are now the
 * RDA values the footnote claims. (Iron 19/29 and calcium 1,000 were
 * already correct RDAs; potassium and fibre were left as coded —
 * the audit marked them unverified against the ICMR table, and an
 * unverified value is not silently "corrected".)
 */
export type SpectrumSex = "male" | "female" | null;

export interface SpectrumReference {
  key: OptionalNutrientKey;
  label: string;
  unit: "g" | "mg";
  /** The reference value, in the nutrient's own unit (g for fibre). */
  reference: number;
  /** True for sodium: a ceiling to stay under, not a target to reach. */
  limit: boolean;
}

export function spectrumReferences(sex: SpectrumSex): SpectrumReference[] {
  return [
    { key: "fibreG", label: "Fibre", unit: "g", reference: 30, limit: false },
    { key: "potassiumMg", label: "Potassium", unit: "mg", reference: 3500, limit: false },
    {
      key: "magnesiumMg",
      label: "Magnesium",
      unit: "mg",
      reference: sex === "female" ? 370 : 440,
      limit: false,
    },
    { key: "calciumMg", label: "Calcium", unit: "mg", reference: 1000, limit: false },
    {
      key: "ironMg",
      label: "Iron",
      unit: "mg",
      reference: sex === "female" ? 29 : 19,
      limit: false,
    },
    {
      key: "vitaminCMg",
      label: "Vitamin C",
      unit: "mg",
      reference: sex === "female" ? 65 : 80,
      limit: false,
    },
    { key: "sodiumMg", label: "Sodium", unit: "mg", reference: 2000, limit: true },
  ];
}

export interface SpectrumRow extends SpectrumReference {
  /** The day's total for this nutrient, or null when NO logged food
   *  reported it — the row then reads "not reported", never zero. */
  value: number | null;
  /** True when at least one logged food did not report this nutrient:
   *  the value is a floor over the foods that did. */
  incomplete: boolean;
}

/** The day's spectrum rows: totals + per-nutrient incompleteness. */
export function spectrumForDay(
  entries: readonly LogEntry[],
  sex: SpectrumSex,
): SpectrumRow[] {
  const totals = sumNutrients(entries.map((e) => e.nutrients));
  const incomplete = incompleteOptionalFields(entries.map((e) => e.nutrients));
  return spectrumReferences(sex).map((ref) => ({
    ...ref,
    value: totals[ref.key] ?? null,
    incomplete: incomplete.has(ref.key),
  }));
}
