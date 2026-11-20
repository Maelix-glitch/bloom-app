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
 *
 * THE RESOLUTION (fix, 2026-11-20 — live failure on the owner's own
 * account): the first cut of this module read the Trackers body pref
 * alone. A person whose numbers live in their **Assessment** — the
 * common case; the Assessment is where Bloom asks — has no body pref,
 * so the resolver returned null there and Trackers fell back to the
 * manual 2,200 ml while Nutrition's plan, resolved from the
 * Assessment, showed the real guide figure. `planWaterTargetMlOf`
 * below assembles the profile EXACTLY as `usePlan` assembles it and
 * applies `generatePlan`'s own source order, so the figure Trackers
 * shows is the plan's figure by construction, not by coincidence.
 */

import { bodyTargetsOf, type BodyProfile } from "@/lib/health/body";
import {
  toHealthProfile,
  type AssessmentState,
} from "@/lib/assessment/state";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { nutritionTargetsFromOutcome } from "@/lib/nutrition/targets";

import type { Goals } from "./core";

/** The guide's water target for this body profile, or null when the
 *  profile cannot produce targets (no height/weight/age yet). */
export function waterTargetMlOf(profile: BodyProfile, today: string): number | null {
  return bodyTargetsOf(profile, today)?.waterMl ?? null;
}

/**
 * The day's water target from the SAME resolved profile the plan
 * uses — single source in fact.
 *
 * The assembly mirrors `usePlan` step for step: the Assessment's
 * profile (`toHealthProfile`), with the goal filled from the body
 * profile when the Assessment never stated one; safety classified;
 * targets from the gated outcome. The choice between the two
 * candidate figures then follows `generatePlan`'s own order: when
 * the gated targets are the plan's targets, the gated water figure
 * stands (the body figure is its backup); when they are refused or
 * invalid, the body-profile figure leads and the gated one backs it
 * up. Either way the number is the body engine's, from the person's
 * own metrics — no formula lives here.
 *
 * `toHealthProfile`'s userId only stamps `HealthProfile.userId`; it
 * never reaches the safety classifier or the targets arithmetic
 * (neither reads it), so the resolver passes "local" — the same
 * fallback value `usePlan` itself uses when no session has answered.
 */
export function planWaterTargetMlOf(args: {
  assessmentState: AssessmentState;
  bodyProfile: BodyProfile;
  today: string;
}): number | null {
  const base = toHealthProfile(args.assessmentState, "local");
  const profile =
    base.goal === null ? { ...base, goal: args.bodyProfile.goal } : base;
  const safety = classifySafety(toSafetyInput(profile));
  const gated = targetsFor(profile, safety, args.today);
  const gatedWaterMl = gated.ok ? gated.targets.waterMl : null;
  const bodyWaterMl = waterTargetMlOf(args.bodyProfile, args.today);
  const gatedStands = gated.ok && nutritionTargetsFromOutcome(gated) !== null;
  return gatedStands
    ? (gatedWaterMl ?? bodyWaterMl)
    : (bodyWaterMl ?? gatedWaterMl);
}

/** The goals a surface should measure against: the stored goals with
 *  the water goal replaced by the guide's target when one exists. */
export function goalsWithWaterTarget(goals: Goals, waterTargetMl: number | null): Goals {
  return waterTargetMl === null ? goals : { ...goals, waterMl: waterTargetMl };
}
