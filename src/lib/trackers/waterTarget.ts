/**
 * The day's water target — ONE source (Brief v7 WATER slice; owner
 * directive 2026-11-20: the target is auto-set, and Nutrition and
 * Trackers stay synced).
 *
 * The figure is the body guide's: `bodyTargetsOf` in lib/health/body.ts
 * (35 ml/kg + an activity allowance, clamped and rounded to the 50 ml
 * grid). That is not a new formula and not a copy of one — it is the
 * exact function the plan composer consults for the day's hydration
 * schedule, both through `targetsFor` (the gated outcome wraps it) and
 * through usePlan's fallback input (`body.targets.waterMl`). A plan's
 * `hydration.targetMl` and this resolver are the same number from the
 * same computation; the tests in waterTarget.test.ts prove it through
 * the real generator.
 *
 * What this module adds is the single call site every non-composer
 * surface reads, so the Trackers tile, the flower and the Targets list
 * can never drift back to the old manual default (2,200 ml) while a
 * guide value exists. The stored manual goal is never rewritten — it
 * is superseded while a guide value exists and returns if the body
 * profile is cleared.
 */

import { bodyTargetsOf, type BodyProfile } from "@/lib/health/body";

import type { Goals } from "./core";

/** The guide's water target for this body profile, or null when the
 *  profile cannot produce targets (no height/weight/age yet). */
export function waterTargetMlOf(profile: BodyProfile, today: string): number | null {
  return bodyTargetsOf(profile, today)?.waterMl ?? null;
}

/** The goals a surface should measure against: the stored goals with
 *  the water goal replaced by the guide's target when one exists. */
export function goalsWithWaterTarget(goals: Goals, waterTargetMl: number | null): Goals {
  return waterTargetMl === null ? goals : { ...goals, waterMl: waterTargetMl };
}
