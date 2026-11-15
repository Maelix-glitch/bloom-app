/**
 * The provenance badge — the visible half of the lib's labelling rule.
 *
 * Every nutrient number on a Nutrition surface arrives as a bundle
 * (numbers + label + estimate flag, from `labelledFoodNutrients` /
 * `labelledEntryNutrients`); this badge renders the label half of that
 * bundle, styled by provenance kind so the source is distinguishable at a
 * glance: USDA in sage, the user's own values in gold, a Coach photo
 * estimate in rose with the ≈ convention. There is deliberately no
 * unbadged way to render a number next to this component's call sites.
 */

import type { FoodProvenanceKind } from "@/lib/nutrition";

export function ProvenanceBadge({
  kind,
  label,
  estimate = false,
}: {
  /** A FoodProvenance kind, or "coach_estimate" for photo estimates. */
  kind: FoodProvenanceKind | "coach_estimate";
  label: string;
  estimate?: boolean;
}) {
  return (
    <span className="nut-badge" data-kind={kind} data-testid="provenance-badge">
      {estimate ? `≈ ${label}` : label}
    </span>
  );
}
