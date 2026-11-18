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
 *
 * The outline carries the measurement rule (system slice, diagnosis
 * §N): a SOLID outline means measured, a DASHED outline means
 * estimated — the same rule on every chip, so it is learned once.
 * `data-estimate` is what the stylesheet keys the dashed border off.
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
    <span
      className="nut-badge"
      data-kind={kind}
      data-estimate={estimate ? true : undefined}
      data-testid="provenance-badge"
    >
      {estimate ? `≈ ${label}` : label}
    </span>
  );
}

/**
 * The Estimate chip for a number that is an estimate by construction
 * rather than by provenance — the day's targets, computed from the
 * person's body numbers (Mifflin–St Jeor), never measured. Dashed by
 * the same rule as every estimated chip.
 */
export function EstimateChip({ label = "Estimate" }: { label?: string }) {
  return (
    <span className="nut-badge" data-estimate={true} data-testid="estimate-chip">
      {label}
    </span>
  );
}
