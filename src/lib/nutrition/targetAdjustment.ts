/**
 * The confirmed target adjustment — the ONE path by which an
 * expenditure estimate may move a target (P7).
 *
 * The discipline, end to end:
 *   · the estimate (expenditure.ts) is a proposal, never an applied
 *     change: nothing here runs until the person taps Confirm on
 *     the proposal card;
 *   · what is stored is the DELTA against the engine's own
 *     maintenance estimate (estimated maintenance − engine TDEE), so
 *     the engine's goal delta — the deficit or surplus their pace
 *     implies — is preserved exactly when the delta is applied on
 *     top of whatever target the engine resolves;
 *   · the delta is bounded (±750 kcal) and the adjusted target must
 *     stay inside the sane band (800–6000 kcal) AND at or above the
 *     person's own calorie floor — the same sex-specific floor the
 *     engine applied to the unadjusted target — or the adjustment is
 *     refused at apply time and the engine's targets stand — never
 *     a silent clamp inventing a number nobody confirmed. (The floor
 *     half of that rule is M-219, audit F-01: the band alone let a
 *     floor-bound person confirm 800 kcal/day — very-low-calorie
 *     territory the floor exists to keep self-serve taps out of.)
 *   · dismissing a proposal stores nothing at all.
 *
 * Storage is a versioned prefs key, `health.targetAdjustment.v1`,
 * in the shared preferences document — sync, export (`loadDoc()`
 * wholesale) and erasure (device wipe + `erase_my_data()` on
 * `user_prefs`) are inherited by construction, the same pattern the
 * plan, the food log and the assessment history use. Targets stay
 * reproducible from stored inputs: profile + this delta, both in
 * the person's own record.
 */

import { calorieFloor, type BodySex } from "@/lib/health/body";
import { clearPref, getPref, setPref } from "@/lib/prefs";
import type { NutritionTargets } from "./targets";

export const TARGET_ADJUSTMENT_KEY = "health.targetAdjustment.v1";
export const TARGET_ADJUSTMENT_VERSION = 1;
/** A confirmed shift larger than this is not stored: at that size
 *  the honest act is a conversation about the inputs, not a tap. */
export const MAX_TARGET_ADJUSTMENT_KCAL = 750;
/** The band an adjusted target must land in (the engine's own
 *  working range, widened only by its floor logic). */
export const ADJUSTED_TARGET_MIN_KCAL = 800;
export const ADJUSTED_TARGET_MAX_KCAL = 6000;

/** The estimate the person confirmed, recorded with the delta so
 *  the surface can always show what the number rests on. */
export interface TargetAdjustmentBasis {
  maintenanceKcal: number;
  engineTdeeKcal: number;
  loggedDays: number;
  spanDays: number;
  weightChangeKg: number;
}

export interface TargetAdjustment {
  version: typeof TARGET_ADJUSTMENT_VERSION;
  /** Estimated maintenance minus the engine's TDEE, kcal. */
  kcalDelta: number;
  confirmedAt: string;
  basedOn: TargetAdjustmentBasis;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseTargetAdjustment(raw: unknown): TargetAdjustment | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== TARGET_ADJUSTMENT_VERSION) return null;
  if (!finite(r["kcalDelta"])) return null;
  const kcalDelta = Math.round(r["kcalDelta"]);
  if (kcalDelta === 0 || Math.abs(kcalDelta) > MAX_TARGET_ADJUSTMENT_KCAL) return null;
  if (typeof r["confirmedAt"] !== "string" || r["confirmedAt"].length === 0) return null;
  const based = r["basedOn"];
  if (!based || typeof based !== "object" || Array.isArray(based)) return null;
  const b = based as Record<string, unknown>;
  if (
    !finite(b["maintenanceKcal"]) ||
    !finite(b["engineTdeeKcal"]) ||
    !finite(b["loggedDays"]) ||
    !finite(b["spanDays"]) ||
    !finite(b["weightChangeKg"])
  ) {
    return null;
  }
  return {
    version: TARGET_ADJUSTMENT_VERSION,
    kcalDelta,
    confirmedAt: r["confirmedAt"],
    basedOn: {
      maintenanceKcal: b["maintenanceKcal"],
      engineTdeeKcal: b["engineTdeeKcal"],
      loggedDays: b["loggedDays"],
      spanDays: b["spanDays"],
      weightChangeKg: b["weightChangeKg"],
    },
  };
}

export function readTargetAdjustment(): TargetAdjustment | null {
  return getPref(TARGET_ADJUSTMENT_KEY, parseTargetAdjustment, null);
}

/** Store a confirmed adjustment. The value is re-parsed on the way
 *  in: what cannot survive the strict parser is never written. */
export function confirmTargetAdjustment(adjustment: Omit<TargetAdjustment, "version">): boolean {
  const value: TargetAdjustment = { ...adjustment, version: TARGET_ADJUSTMENT_VERSION };
  if (!parseTargetAdjustment(value)) return false;
  setPref(TARGET_ADJUSTMENT_KEY, value);
  return true;
}

export function clearTargetAdjustment(): void {
  clearPref(TARGET_ADJUSTMENT_KEY);
}

/**
 * Apply a confirmed delta to resolved targets. Null when the result
 * would leave the sane band OR drop below the person's calorie floor
 * (`calorieFloor(sex)` — the floor the engine itself applied) — the
 * caller then keeps the engine's targets untouched. A zero delta is
 * the targets themselves. Protein is never adjusted: it is a
 * per-kilogram figure, not an energy-balance figure.
 */
export function adjustedTargets(
  targets: NutritionTargets,
  kcalDelta: number,
  sex: BodySex,
): NutritionTargets | null {
  const delta = Math.round(kcalDelta);
  if (delta === 0) return targets;
  const kcal = targets.kcal + delta;
  if (kcal < ADJUSTED_TARGET_MIN_KCAL || kcal > ADJUSTED_TARGET_MAX_KCAL) return null;
  if (kcal < calorieFloor(sex)) return null;
  return { kcal, proteinG: targets.proteinG };
}
