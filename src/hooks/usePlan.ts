/**
 * Plan generation (P1) — the Nutrition tab's door into the plan engine.
 *
 * The engine is pure; this hook assembles its inputs from the same
 * sources the Nutrition tab already reads (Assessment → domain profile →
 * safety classification → the gated targets outcome, with the Trackers
 * body profile as the fallback pool), runs a non-saving preview so the
 * surface can explain every state before any tap, and writes ONLY on the
 * explicit generate action — a plan the person is following is never
 * silently rewritten underneath them (spec §10/§13: no silent changes).
 *
 * State resolution, in order:
 *   · a substantive safety refusal outranks even a stored plan — the
 *     gate's answer today is the answer, whatever yesterday's plan says;
 *   · a plan made for today shows, with its staleness named;
 *   · a plan made for another day is history, not today's plan;
 *   · no plan: the preview says whether one can be made, and if not, why.
 */

import { useCallback, useMemo } from "react";

import { usePrefValue } from "@/lib/prefsStore";
import { useAssessment } from "@/hooks/useAssessment";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useNutrition } from "@/hooks/useNutrition";
import { useSession } from "@/hooks/useSession";
import { todayLocal } from "@/lib/localDay";
import { toHealthProfile } from "@/lib/assessment/state";
import { toSafetyInput, type HealthProfile } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor, type BodyTargetsOutcome } from "@/lib/vitalis/calc/body";
import type { SafetyAssessment } from "@/lib/vitalis/domain/safety";
import {
  PLAN_KEY,
  USDA_REFERENCE_FOODS,
  generatePlan,
  nutritionTargetsFromBodyTargets,
  parsePlanValue,
  planInputsSnapshotOf,
  planStaleness,
  writePlan,
  type DailyPlan,
  type LogEntry,
  type NutritionTargets,
  type PlanGenerationInput,
  type PlanMeal,
  type PlanOutcome,
  type PlanRefusal,
  type PlanStaleness,
  type PlanSuggestion,
} from "@/lib/nutrition";

export type PlanSectionState =
  | { kind: "refused"; refusal: PlanRefusal }
  | { kind: "ready"; plan: DailyPlan; staleness: PlanStaleness }
  | { kind: "outdated"; plan: DailyPlan }
  | { kind: "can_generate" };

export interface PlanStore {
  today: string;
  state: PlanSectionState;
  /** Generate today's plan from the current inputs and save it. The
   *  outcome is returned so the caller can surface a refusal directly. */
  generate: () => PlanOutcome;
  /** Log a plan suggestion into today's food log, through the nutrition
   *  lib's normal entry path — the entry keeps the food's provenance and
   *  records `plan` as its source. Null when the food is gone. */
  logSuggestion: (meal: PlanMeal, suggestion: PlanSuggestion) => LogEntry | null;
}

interface AssembledInputs {
  profile: HealthProfile;
  safety: SafetyAssessment;
  gatedOutcome: BodyTargetsOutcome;
  fallbackTargets: NutritionTargets | null;
}

export function usePlan(): PlanStore {
  const assessment = useAssessment();
  const body = useBodyProfile();
  const session = useSession();
  const nutrition = useNutrition();
  const plan = usePrefValue(PLAN_KEY, parsePlanValue, null);
  const today = todayLocal();

  const assembled = useMemo<AssembledInputs>(() => {
    const base = toHealthProfile(assessment.state, session.userId ?? "local");
    /* The goal is the one input both forms can state: the Assessment
       seeds its goal from the body profile when it begins, and the plan
       reads it the same way — a person who only ever set their goal on
       Trackers has still told Bloom their goal. The fill happens BEFORE
       classification, so safety judges the effective goal too (the
       underweight-loss rule depends on it). */
    const profile = base.goal === null ? { ...base, goal: body.profile.goal } : base;
    const safety = classifySafety(toSafetyInput(profile));
    return {
      profile,
      safety,
      gatedOutcome: targetsFor(profile, safety, today),
      fallbackTargets: nutritionTargetsFromBodyTargets(body.targets),
    };
  }, [assessment.state, session.userId, body.profile.goal, body.targets, today]);

  const buildInput = useCallback(
    (now: string): PlanGenerationInput => ({
      ...assembled,
      foods: [...nutrition.foods, ...USDA_REFERENCE_FOODS],
      day: today,
      now,
    }),
    [assembled, nutrition.foods, today],
  );

  /* The preview runs the real generator and discards the plan — the
     section's explanations are the engine's own verdicts, not a second,
     drifting implementation of them. */
  const preview = useMemo(() => generatePlan(buildInput("preview")), [buildInput]);

  const state = useMemo<PlanSectionState>(() => {
    if (!preview.ok && preview.refusal.kind === "safety_blocked") {
      return { kind: "refused", refusal: preview.refusal };
    }
    if (plan && plan.day === today) {
      /* Staleness compares the plan's inputs with today's. When today's
         inputs can no longer produce targets at all, compare against a
         snapshot carrying the plan's own targets, so the change is named
         by the fields that actually moved, not by their consequence. */
      const current = preview.ok
        ? preview.plan.inputs
        : planInputsSnapshotOf(assembled.profile, assembled.safety, plan.targets);
      return { kind: "ready", plan, staleness: planStaleness(plan, current) };
    }
    if (plan) {
      return preview.ok
        ? { kind: "outdated", plan }
        : { kind: "refused", refusal: preview.refusal };
    }
    return preview.ok ? { kind: "can_generate" } : { kind: "refused", refusal: preview.refusal };
  }, [preview, plan, today, assembled]);

  const generate = useCallback((): PlanOutcome => {
    const outcome = generatePlan(buildInput(new Date().toISOString()));
    if (outcome.ok) writePlan(outcome.plan);
    return outcome;
  }, [buildInput]);

  const logSuggestion = useCallback<PlanStore["logSuggestion"]>(
    (meal, suggestion) => {
      const food = nutrition.foodById(suggestion.foodId);
      if (!food) return null;
      return nutrition.logFood(food, { grams: suggestion.grams }, meal.meal, today, "plan");
    },
    [nutrition, today],
  );

  return { today, state, generate, logSuggestion };
}
