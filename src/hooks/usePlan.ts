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

import { EMPTY_MODES_VALUE, MODES_KEY, parseModesValue } from "@/lib/modes/modes";
import { getPref, setPref } from "@/lib/prefs";
import { usePrefValue } from "@/lib/prefsStore";
import { useAssessment } from "@/hooks/useAssessment";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useNutrition } from "@/hooks/useNutrition";
import { useSession } from "@/hooks/useSession";
import { todayLocal } from "@/lib/localDay";
import { ASSESSMENT_KEY, parseAssessmentState, toHealthProfile } from "@/lib/assessment/state";
import { toSafetyInput, type HealthProfile, type VitalisGoal } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor, type BodyTargetsOutcome } from "@/lib/vitalis/calc/body";
import type { SafetyAssessment } from "@/lib/vitalis/domain/safety";
import {
  DISH_LIBRARY,
  PLAN_KEY,
  PLAN_LOG_KEY,
  TARGET_ADJUSTMENT_KEY,
  USDA_REFERENCE_FOODS,
  clearTargetAdjustment,
  parseTargetAdjustment,
  generatePlan,
  nutritionTargetsFromBodyTargets,
  parsePlanLogValue,
  parsePlanValue,
  planInputsSnapshotOf,
  planWithDishSwapped,
  planLoggedEntryIdFrom,
  planStaleness,
  recordPlanLog,
  writePlan,
  type DailyPlan,
  type LogEntry,
  type Meal,
  type NutritionTargets,
  type PlanGenerationInput,
  type PlanGoalProfile,
  type PlanMeal,
  type PlanOutcome,
  type PlanRefusal,
  type PlanStaleness,
  type PlanSuggestion,
  type TargetAdjustment,
} from "@/lib/nutrition";

export type PlanSectionState =
  | { kind: "refused"; refusal: PlanRefusal }
  | { kind: "ready"; plan: DailyPlan; staleness: PlanStaleness }
  | { kind: "outdated"; plan: DailyPlan }
  | { kind: "can_generate" };

export interface PlanStore {
  today: string;
  state: PlanSectionState;
  /** The goal the engine currently reads (Assessment first, body
   *  profile as its seed) — what the goal chips show as active. */
  currentGoal: VitalisGoal | null;
  /** Set the goal through the SAME sources the engine reads: the body
   *  profile always (it is the seed), and the Assessment's answers too
   *  once the Assessment has been started — status and step untouched.
   *  The stored plan is NOT regenerated: it goes stale by name, and the
   *  person's own tap on "Compose again" rebuilds it (no silent
   *  changes, §10/§13). */
  setGoal: (goal: PlanGoalProfile) => void;
  /** Generate today's plan from the current inputs and save it. The
   *  outcome is returned so the caller can surface a refusal directly. */
  generate: () => PlanOutcome;
  /** Swap one dish in the stored plan for another library dish (the
   *  apply path for Vitalis's confirmed swap_dish card): the plan's
   *  targets and inputs are untouched, only the plate changes. False
   *  when there is no stored plan, the dish is not in that meal, or
   *  the replacement is unknown or already in the meal. */
  swapPlanDish: (meal: Meal, fromDishId: string, toDishId: string) => boolean;
  /** Log a plan suggestion into today's food log, through the nutrition
   *  lib's normal entry path — the entry keeps the food's provenance and
   *  records `plan` as its source. Duplicate-safe via the plan-log
   *  record: re-logging a suggestion whose entry is still in the log
   *  returns that entry instead of writing a second copy. Null when
   *  the food is gone. */
  logSuggestion: (meal: PlanMeal, suggestion: PlanSuggestion) => LogEntry | null;
  /** Whether this suggestion's plan entry is currently in today's log. */
  suggestionLogged: (meal: PlanMeal, suggestion: PlanSuggestion) => boolean;
  /** Log every not-yet-logged suggestion of a meal (the meal card's
   *  "Log this meal"). Returns how many entries were written. */
  logMeal: (meal: PlanMeal) => number;
  /** The engine's maintenance estimate (TDEE) behind the current
   *  targets — the gated outcome's, or the body profile's — or null
   *  when the engine cannot speak. The expenditure proposal derives
   *  its delta against this number, never against the goal target. */
  engineTdeeKcal: number | null;
  /** The user-confirmed target adjustment currently in force, or
   *  null. Its delta is already inside the plan's targets. */
  targetAdjustment: TargetAdjustment | null;
  /** Remove the confirmed adjustment: targets return to the
   *  engine's, and an existing plan goes stale by name. */
  clearTargetAdjustment: () => void;
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
  const planLog = usePrefValue(PLAN_LOG_KEY, parsePlanLogValue, NO_PLAN_LOG);
  const targetAdjustment = usePrefValue(TARGET_ADJUSTMENT_KEY, parseTargetAdjustment, null);
  const modes = usePrefValue(MODES_KEY, parseModesValue, EMPTY_MODES_VALUE);
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
      /* P5: the plan composes dish-first from the shipped library;
         the engine judges every dish against the person's own gates. */
      dishes: DISH_LIBRARY,
      /* P6: the food log rides along — the recent logged days bias
         composition (never the targets) when at least two completed
         days are logged. The preview reads the same log, so what the
         section explains is the plan the tap will actually save. */
      recentLog: nutrition.entries,
      /* P7: the stored plan rides along too — the learning pass
         judges the dishes it served and the portions it serves —
         and a confirmed target adjustment shifts the resolved
         targets inside the engine, never around it. */
      storedPlan: plan,
      ...(targetAdjustment ? { targetAdjustmentKcal: targetAdjustment.kcalDelta } : {}),
      /* System 14: the person's switched-on Condition Modes ride
       * along — the dish pool judges them beside pattern + budget. */
      ...(modes.active.length > 0 ? { activeModes: modes.active } : {}),
      day: today,
      now,
    }),
    [assembled, nutrition.foods, nutrition.entries, plan, targetAdjustment, modes, today],
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

  const swapPlanDish = useCallback<PlanStore["swapPlanDish"]>(
    (meal, fromDishId, toDishId) => {
      if (!plan) return false;
      const dish = DISH_LIBRARY.find((d) => d.id === toDishId);
      if (!dish) return false;
      const next = planWithDishSwapped(plan, meal, fromDishId, dish);
      if (!next) return false;
      writePlan(next);
      return true;
    },
    [plan],
  );

  const setGoal = useCallback<PlanStore["setGoal"]>(
    (goal) => {
      body.save({ goal });
      /* The Assessment's answers outrank the body profile in the
         engine's read, so once an Assessment exists its goal must move
         too — a surgical answers patch that preserves status, step,
         consents and every other answer exactly. */
      const current = getPref(ASSESSMENT_KEY, parseAssessmentState, null);
      if (current && (current.startedAt !== null || current.answers.goal !== null)) {
        setPref(ASSESSMENT_KEY, {
          ...current,
          answers: { ...current.answers, goal },
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [body],
  );

  const logSuggestion = useCallback<PlanStore["logSuggestion"]>(
    (meal, suggestion) => {
      const existingId = planLoggedEntryIdFrom(
        planLog,
        nutrition.entries,
        today,
        meal.meal,
        suggestion.foodId,
      );
      if (existingId) {
        return nutrition.entries.find((e) => e.id === existingId) ?? null;
      }
      const food = nutrition.foodById(suggestion.foodId);
      if (!food) return null;
      const entry = nutrition.logFood(food, { grams: suggestion.grams }, meal.meal, today, "plan");
      if (entry) recordPlanLog(today, meal.meal, suggestion.foodId, entry.id);
      return entry;
    },
    [nutrition, planLog, today],
  );

  const suggestionLogged = useCallback<PlanStore["suggestionLogged"]>(
    (meal, suggestion) =>
      planLoggedEntryIdFrom(planLog, nutrition.entries, today, meal.meal, suggestion.foodId) !==
      null,
    [nutrition.entries, planLog, today],
  );

  const logMeal = useCallback<PlanStore["logMeal"]>(
    (meal) => {
      let logged = 0;
      for (const suggestion of meal.suggestions) {
        if (suggestionLogged(meal, suggestion)) continue;
        if (logSuggestion(meal, suggestion)) logged += 1;
      }
      return logged;
    },
    [logSuggestion, suggestionLogged],
  );

  const engineTdeeKcal = assembled.gatedOutcome.ok
    ? assembled.gatedOutcome.targets.tdeeKcal
    : (body.targets?.tdee ?? null);

  return {
    today,
    state,
    currentGoal: assembled.profile.goal,
    setGoal,
    generate,
    swapPlanDish,
    logSuggestion,
    suggestionLogged,
    logMeal,
    engineTdeeKcal,
    targetAdjustment,
    clearTargetAdjustment,
  };
}

const NO_PLAN_LOG: Record<string, string> = {};
