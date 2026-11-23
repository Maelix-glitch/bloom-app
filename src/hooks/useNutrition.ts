/**
 * Nutrition (W4-3 N4) — the UI's one door into the nutrition lib.
 *
 * Device-first and account-synced through the shared preferences document,
 * exactly the pattern `useAssessment` / `useBodyProfile` set: reads come
 * through `usePrefValue`, so a remount can never flicker, and writes go
 * through the lib's pref-backed operations, which re-validate everything
 * they store.
 *
 * Targets resolve through the safety-gated engine (`targetsFor` over
 * the Assessment's domain profile): a `safety_blocked` outcome means NO
 * targets, ever — no body-profile fallback resurrects a number the gate
 * refused, and since M-219 (audit F-02) that holds for absence blocks
 * exactly as for substantive ones: unanswered safety questions fail
 * closed. The body profile still feeds the micronutrient spectrum's
 * sex default and the Trackers surfaces; it never supplies a calorie
 * or protein target here.
 *
 * One distinction inside `safety_blocked` remains, and it is purely
 * presentational: a block whose blocking findings are all absence
 * rules (the person was never asked) renders as the "no target yet"
 * state, which names the next step; a block carrying any substantive
 * finding renders as the refusal. Neither state carries a target.
 */

import { useCallback, useMemo } from "react";

import { usePrefValue } from "@/lib/prefsStore";
import { useAssessment } from "@/hooks/useAssessment";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useSession } from "@/hooks/useSession";
import { shiftDay, todayLocal } from "@/lib/localDay";
import { toHealthProfile } from "@/lib/assessment/state";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import {
  FOODS_KEY,
  FOODLOG_KEY,
  TARGET_ADJUSTMENT_KEY,
  REFERENCE_FOODS,
  adjustedTargets,
  compareTotalsToTargets,
  createEntryFromFood,
  dayLogOf,
  deleteLogEntry,
  editLogEntry,
  eligiblePool,
  entriesForDay,
  entryNutrientsFor,
  findUsdaReference,
  logEntry,
  nutritionTargetsFromOutcome,
  parseFoodLogValue,
  parseFoodsValue,
  parseTargetAdjustment,
  recentFoods,
  saveCustomFood,
  swapLogEntry,
  swapsFor,
  type Amount,
  type CustomFoodInput,
  type DayLog,
  type EntrySource,
  type Food,
  type LogEntry,
  type LogEntryPatch,
  type Meal,
  type NutritionTargets,
  type SpectrumSex,
  type SwapFocus,
  type SwapOption,
  type TotalsComparison,
} from "@/lib/nutrition";
import { newNutritionId } from "@/lib/nutrition/ids";

export type NutritionTargetState =
  | { kind: "ready"; targets: NutritionTargets }
  /** The safety gate refused: no targets and no deficit framing (§4.5). */
  | { kind: "blocked" }
  /** Not enough body information yet to compute an honest target. */
  | { kind: "none" };

export interface NutritionStore {
  today: string;
  /** The user's own foods (`health.foods.v1`). */
  foods: Food[];
  /** Every log entry, all days (`health.foodlog.v1`). */
  entries: LogEntry[];
  targetState: NutritionTargetState;
  /** Recents resolved to foods, most recent first (own log only). */
  recents: Food[];
  dayLog: (day: string) => DayLog;
  comparison: (day: string) => TotalsComparison;
  /** Resolve any logged food id — own foods first, then the reference set. */
  foodById: (id: string) => Food | null;
  /** Log a food-backed entry. Null when the lib refuses the entry. */
  logFood: (
    food: Food,
    amount: Amount,
    meal: Meal,
    day: string,
    source: Exclude<EntrySource, "coach_photo">,
  ) => LogEntry | null;
  /** Persist a custom food. Null on a parser refusal; throws
   *  FoodListFullError at the list cap — the sheet surfaces both. */
  addCustomFood: (input: CustomFoodInput) => Food | null;
  /** Edit an entry's meal and/or amount. Amount changes recompute the
   *  stored nutrients through the lib's math, never in the component. */
  editEntry: (entry: LogEntry, patch: { meal?: Meal; amount?: Amount }) => void;
  removeEntry: (entry: LogEntry) => void;
  /** Put a removed entry back, byte for byte — the undo path. */
  restoreEntry: (entry: LogEntry) => void;
  /** Copy one day's entries into another day (new ids, same foods,
   *  amounts, meals and nutrients). Returns how many entries landed. */
  copyDayInto: (fromDay: string, toDay: string) => number;
  /** The sex the micronutrient spectrum's sex-specific reference
   *  intakes key on: the Assessment's stated sex, else the body
   *  profile's, else null (the spectrum's stated default applies). */
  spectrumSex: SpectrumSex;
  /** Calorie-matched swap options for a USDA-backed entry, from the
   *  plan-eligible USDA pool (pattern + allergy filters applied). */
  swapsForEntry: (entry: LogEntry, focus: SwapFocus) => SwapOption[];
  /** Apply a swap through the lib's validated write path. Null when
   *  the swap is refused (either side not USDA-backed). */
  applySwap: (entry: LogEntry, option: SwapOption) => LogEntry | null;
}

const NO_FOODS: Food[] = [];
const NO_ENTRIES: LogEntry[] = [];

export function useNutrition(): NutritionStore {
  const foods = usePrefValue(FOODS_KEY, parseFoodsValue, NO_FOODS);
  const entries = usePrefValue(FOODLOG_KEY, parseFoodLogValue, NO_ENTRIES);
  const targetAdjustment = usePrefValue(TARGET_ADJUSTMENT_KEY, parseTargetAdjustment, null);
  const assessment = useAssessment();
  const body = useBodyProfile();
  const session = useSession();
  const today = todayLocal();

  const targetState = useMemo<NutritionTargetState>(() => {
    const profile = toHealthProfile(assessment.state, session.userId ?? "local");
    const safety = classifySafety(toSafetyInput(profile));
    const outcome = targetsFor(profile, safety, today);
    /* A user-confirmed expenditure adjustment (P7) applies LAST, on
       top of the gated targets — the same rule the plan engine
       applies (targetAdjustment.ts), so the day view and the plan
       can never disagree about the target. The adjustment is judged
       against the person's own calorie floor (M-219, audit F-01). */
    const applyAdjustment = (targets: NutritionTargets): NutritionTargetState =>
      targetAdjustment
        ? {
            kind: "ready",
            targets:
              adjustedTargets(targets, targetAdjustment.kcalDelta, profile.sex) ?? targets,
          }
        : { kind: "ready", targets };
    if (outcome.ok) {
      const gated = nutritionTargetsFromOutcome(outcome);
      if (gated) return applyAdjustment(gated);
      return { kind: "none" };
    }
    /* M-219 (audit F-02): a safety block is FINAL here — including a
       block that rests only on unanswered questions. The legacy
       body-profile fallback that used to resurrect targets over an
       absence-only block is retired: no classification, no targets.
       The one distinction left is honesty of presentation, and it
       changes no number: a block whose blocking findings are ALL
       absence rules (age / safety answers never given) is an
       information gap, so the day view shows its "no target yet"
       state and names the next step; any substantive finding shows
       the refusal. Neither state carries a target. A merely
       incomplete profile (no block, missing measurements) is also
       "none" — totals show as totals until the Assessment exists. */
    if (outcome.reason === "safety_blocked") {
      const absenceOnly = safety.findings
        .filter((finding) => finding.blocking)
        .every(
          (finding) =>
            finding.ruleId === "age_missing" || finding.ruleId === "safety_answers_missing",
        );
      return absenceOnly ? { kind: "none" } : { kind: "blocked" };
    }
    return { kind: "none" };
  }, [assessment.state, session.userId, targetAdjustment, today]);

  const targets = targetState.kind === "ready" ? targetState.targets : null;

  const recents = useMemo(
    () => recentFoods(entries, [...foods, ...REFERENCE_FOODS], 8),
    [entries, foods],
  );

  const dayLog = useCallback((day: string) => dayLogOf(entries, day), [entries]);

  const comparison = useCallback(
    (day: string) => compareTotalsToTargets(dayLogOf(entries, day).totals, targets),
    [entries, targets],
  );

  const foodById = useCallback(
    (id: string) => foods.find((f) => f.id === id) ?? findUsdaReference(id),
    [foods],
  );

  const logFood = useCallback<NutritionStore["logFood"]>((food, amount, meal, day, source) => {
    const entry = createEntryFromFood({
      food,
      amount,
      meal,
      day,
      source,
      now: new Date().toISOString(),
    });
    if (!entry) return null;
    logEntry(entry);
    return entry;
  }, []);

  const addCustomFood = useCallback<NutritionStore["addCustomFood"]>((input) => {
    return saveCustomFood(input);
  }, []);

  const editEntry = useCallback<NutritionStore["editEntry"]>(
    (entry, patch) => {
      const libPatch: LogEntryPatch = {};
      if (patch.meal !== undefined) libPatch.meal = patch.meal;
      if (patch.amount !== undefined) {
        libPatch.amount = patch.amount;
        /* The stored nutrients move with the portion, recomputed by the
           lib from the food the entry came from. An entry whose food is
           gone keeps its stored nutrients — history does not rewrite
           itself around a deleted food. */
        const food = entry.foodId ? foodById(entry.foodId) : null;
        if (food) {
          const nutrients = entryNutrientsFor(food, patch.amount);
          if (nutrients) libPatch.nutrients = nutrients;
        }
      }
      editLogEntry(entry.id, libPatch);
    },
    [foodById],
  );

  const removeEntry = useCallback<NutritionStore["removeEntry"]>((entry) => {
    deleteLogEntry(entry.id);
  }, []);

  const restoreEntry = useCallback<NutritionStore["restoreEntry"]>((entry) => {
    /* appendToLog replaces by id, so re-logging the removed entry restores
       it exactly — same id, day, amount, nutrients and provenance. */
    logEntry(entry);
  }, []);

  const copyDayInto = useCallback<NutritionStore["copyDayInto"]>(
    (fromDay, toDay) => {
      const now = new Date().toISOString();
      let landed = 0;
      for (const entry of entriesForDay(entries, fromDay)) {
        const copy: LogEntry = {
          ...entry,
          id: newNutritionId("entry"),
          day: toDay,
          createdAt: now,
        };
        logEntry(copy);
        landed += 1;
      }
      return landed;
    },
    [entries],
  );

  const spectrumSex = useMemo<SpectrumSex>(() => {
    const assessed = toHealthProfile(assessment.state, session.userId ?? "local").sex;
    if (assessed === "female" || assessed === "male") return assessed;
    if (body.profile.sex === "female" || body.profile.sex === "male") return body.profile.sex;
    return null;
  }, [assessment.state, session.userId, body.profile.sex]);

  const swapsForEntry = useCallback<NutritionStore["swapsForEntry"]>(
    (entry, focus) => {
      if (!entry.foodId) return [];
      const entryFood = foodById(entry.foodId);
      if (!entryFood) return [];
      const profile = toHealthProfile(assessment.state, session.userId ?? "local");
      const pool = eligiblePool(profile, REFERENCE_FOODS);
      return swapsFor(entry, entryFood, pool, focus);
    },
    [assessment.state, session.userId, foodById],
  );

  const applySwap = useCallback<NutritionStore["applySwap"]>((entry, option) => {
    return swapLogEntry(entry, option);
  }, []);

  return {
    today,
    foods,
    entries,
    targetState,
    recents,
    dayLog,
    comparison,
    foodById,
    logFood,
    addCustomFood,
    editEntry,
    removeEntry,
    restoreEntry,
    copyDayInto,
    spectrumSex,
    swapsForEntry,
    applySwap,
  };
}

/** The day before a day key — for the copy-yesterday action. */
export function yesterdayOf(day: string): string {
  return shiftDay(day, -1);
}
