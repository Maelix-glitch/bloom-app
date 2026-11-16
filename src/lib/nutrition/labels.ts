/**
 * Nutrition — labelling rules as code (design §4.1/§4.7 N1).
 *
 * A nutrient value's display label derives from its provenance, full stop.
 * The lib's display-ready accessors (`labelledFoodNutrients`,
 * `labelledEntryNutrients`) return numbers and their label as one bundle —
 * there is no lib function that hands a UI a bare nutrient number for
 * display, so a screen built on this lib cannot show a number without
 * saying where it came from.
 */

import type { EntryProvenance, Food, FoodProvenance, LogEntry, Nutrients } from "./types";

export const USER_ENTERED_LABEL = "Your value";

const KIND_FALLBACK: Record<FoodProvenance["kind"], string> = {
  usda: "USDA FoodData Central",
  user_entered: USER_ENTERED_LABEL,
  off: "Open Food Facts",
  ifct: "ICMR-NIN IFCT",
  recipe: "Built from USDA ingredient data",
};

/** The display label for a provenance. A source's own shipped label wins;
 *  user-entered values are always "Your value" — that is the badge the
 *  custom-food flow promises (design §4.2). */
export function provenanceLabel(provenance: EntryProvenance): string {
  // A whitespace-only stored label is no label — fall back rather than
  // render a blank badge next to a number.
  const stored = provenance.label.trim();
  if (provenance.kind === "coach_estimate") {
    return stored || "Estimate — based on your photo";
  }
  if (provenance.kind === "user_entered") return USER_ENTERED_LABEL;
  return stored || KIND_FALLBACK[provenance.kind];
}

export function isEstimateProvenance(provenance: EntryProvenance): boolean {
  return provenance.kind === "coach_estimate";
}

/** Nutrients bundled with the label they must be displayed under. */
export interface LabelledNutrients {
  nutrients: Nutrients;
  label: string;
  /** True when the numbers are an estimate (Coach photo) — the UI renders
   *  them with estimate wording and the ≈ convention. */
  estimate: boolean;
}

export function labelledFoodNutrients(food: Food): LabelledNutrients {
  return {
    nutrients: food.per100g,
    label: provenanceLabel(food.provenance),
    estimate: false,
  };
}

export function labelledEntryNutrients(entry: LogEntry): LabelledNutrients {
  return {
    nutrients: entry.nutrients,
    label: provenanceLabel(entry.provenance),
    estimate: isEstimateProvenance(entry.provenance),
  };
}
