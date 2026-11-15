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

/**
 * A target is only a target when it is a positive, finite number. The
 * adapters and the comparison all fail closed on anything else — a NaN,
 * zero or negative value arriving from a malformed engine outcome means
 * "no targets", exactly like a refusal, never a NaN deficit on screen.
 */
function validTargets(kcal: number, proteinG: number): NutritionTargets | null {
  if (!Number.isFinite(kcal) || !Number.isFinite(proteinG)) return null;
  if (kcal <= 0 || proteinG <= 0) return null;
  return { kcal, proteinG };
}

/** From the legacy engine output (`useBodyProfile`'s shape). */
export function nutritionTargetsFromBodyTargets(targets: BodyTargets | null): NutritionTargets | null {
  if (!targets) return null;
  return validTargets(targets.calories, targets.proteinG);
}

/** From the safety-gated Vitalis outcome. Any `ok: false` — safety_blocked
 *  or profile_incomplete — means no targets at all (§4.5). */
export function nutritionTargetsFromOutcome(outcome: BodyTargetsOutcome): NutritionTargets | null {
  if (!outcome.ok) return null;
  return validTargets(outcome.targets.calorieTargetKcal, outcome.targets.proteinG);
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
  // Re-validate at the comparison itself: a hand-built or deserialised
  // targets object that never passed an adapter gets the refusal shape,
  // not a computed deficit.
  if (targets && !validTargets(targets.kcal, targets.proteinG)) targets = null;
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
