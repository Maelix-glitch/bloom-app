/**
 * Nutrition — totals vs targets (design §4.1/§4.5).
 *
 * Bloom's targets engine (`bodyTargetsOf` / the safety-gated `targetsFor`)
 * sets exactly two intake targets: kcal and protein. Carbs and fat are
 * totals only — this module never invents macro targets the engine does
 * not set. When the engine says no (safety blocked, profile incomplete),
 * the comparison carries totals with `targets: null` and the surface shows
 * totals as totals, with no deficit framing.
 */

import type { BodyTargets } from "@/lib/health/body";
import type { BodyTargetsOutcome } from "@/lib/vitalis/calc/body";
import type { Nutrients } from "./types";

export interface NutritionTargets {
  kcal: number;
  proteinG: number;
}

/** From the legacy engine output (`useBodyProfile`'s shape). */
export function nutritionTargetsFromBodyTargets(targets: BodyTargets | null): NutritionTargets | null {
  if (!targets) return null;
  return { kcal: targets.calories, proteinG: targets.proteinG };
}

/** From the safety-gated Vitalis outcome. Any `ok: false` — safety_blocked
 *  or profile_incomplete — means no targets at all (§4.5). */
export function nutritionTargetsFromOutcome(outcome: BodyTargetsOutcome): NutritionTargets | null {
  if (!outcome.ok) return null;
  return { kcal: outcome.targets.calorieTargetKcal, proteinG: outcome.targets.proteinG };
}

export interface TotalsComparison {
  totals: Nutrients;
  targets: NutritionTargets | null;
  /** Null exactly when targets is null. Negative means over target. */
  kcalRemaining: number | null;
  proteinRemaining: number | null;
  /** totals ÷ target, unclamped — presentation decides how to draw it. */
  kcalFraction: number | null;
  proteinFraction: number | null;
}

export function compareTotalsToTargets(
  totals: Nutrients,
  targets: NutritionTargets | null,
): TotalsComparison {
  if (!targets) {
    return {
      totals,
      targets: null,
      kcalRemaining: null,
      proteinRemaining: null,
      kcalFraction: null,
      proteinFraction: null,
    };
  }
  return {
    totals,
    targets,
    kcalRemaining: Math.round(targets.kcal - totals.kcal),
    proteinRemaining: Math.round((targets.proteinG - totals.proteinG) * 10) / 10,
    kcalFraction: targets.kcal > 0 ? totals.kcal / targets.kcal : null,
    proteinFraction: targets.proteinG > 0 ? totals.proteinG / targets.proteinG : null,
  };
}
