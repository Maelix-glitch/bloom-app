/**
 * Nutrition — core shapes (W4-3, design §4.1).
 *
 * A Food is a reusable item with per-100 g values and a provenance that is
 * part of the type, not a display afterthought: a nutrient number in Bloom
 * never travels without where it came from. Optional nutrients (fibre,
 * sodium) exist only when the source actually provides them — they are
 * absent, never zero-filled guesses.
 *
 * A LogEntry is one eaten instance. It stores its computed nutrients (not
 * just a food reference) so history stays stable if a food is later edited —
 * the same append-only instinct as the evidence registry.
 */

export interface Nutrients {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Only when the source provides it. Absent is not zero. */
  fibreG?: number;
  /** Only when the source provides it. Absent is not zero. */
  sodiumMg?: number;
}

export type FoodProvenanceKind = "usda" | "user_entered" | "off" | "ifct";

export interface FoodProvenance {
  kind: FoodProvenanceKind;
  /** The source's own id for this food (USDA fdcId, OFF barcode, …). For a
   *  user-entered food, the food's own id. */
  sourceId: string;
  /** USDA data type ("Foundation" | "SR Legacy" | "Branded"), when relevant. */
  dataType?: string;
  /** The source's display label, as shipped by the source. */
  label: string;
}

export interface FoodServing {
  /** User-meaningful label, e.g. "1 katori". The gram weight is explicit. */
  label: string;
  grams: number;
}

export interface Food {
  id: string;
  name: string;
  per100g: Nutrients;
  servings: FoodServing[];
  provenance: FoodProvenance;
}

/**
 * A Coach photo estimate is provenance for an entry, never for a reusable
 * Food — an estimate must not become reference data (design §4.4).
 */
export interface CoachEstimateProvenance {
  kind: "coach_estimate";
  label: string;
}

export type EntryProvenance = FoodProvenance | CoachEstimateProvenance;

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: readonly Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export type EntrySource = "search" | "custom" | "coach_photo" | "recent";

export type Amount = { grams: number } | { servings: number; servingLabel: string };

/** The inline copy an estimate entry carries — the estimated totals for the
 *  photographed portion, as the user confirmed them in the log sheet. */
export interface EstimateSnapshot {
  name: string;
  totals: Nutrients;
}

export interface LogEntry {
  id: string;
  /** Local day key (`YYYY-MM-DD`, via src/lib/localDay.ts conventions). */
  day: string;
  meal: Meal;
  /** The reusable Food this entry came from. Null for estimate entries. */
  foodId: string | null;
  /** Inline snapshot for estimate entries. Null for food-backed entries. */
  snapshot: EstimateSnapshot | null;
  /** Display name captured at log time (the food's name, or the name the
   *  user gave an estimate). */
  name: string;
  amount: Amount;
  /** Computed at log time from per-100 g × amount, stored with the entry. */
  nutrients: Nutrients;
  /** Inherited from the food; `coach_estimate` for photo estimates. */
  provenance: EntryProvenance;
  source: EntrySource;
  createdAt: string;
}

export interface DayLog {
  day: string;
  entries: LogEntry[];
  totals: Nutrients;
}
