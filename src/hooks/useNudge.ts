/**
 * Behaviour Change (System 8) — the Today page's one gentle nudge.
 *
 * Assembles the engine's inputs from the record the page already
 * holds (habits + mood are passed in — the page owns those stores)
 * plus the prefs-backed sources the engine also reads (food log,
 * stored plan, weigh-ins), runs the pure selection, and owns the
 * nudge memory: what was shown is recorded, dismiss and snooze write
 * through to `health.nudges.v1`.
 *
 * `ready` is the page's latched settled flag: until every source has
 * answered from the account, no nudge is selected — a nudge computed
 * from a half-loaded device mirror could name a streak that isn't
 * real, and this surface's whole promise is that its evidence is.
 */

import { useEffect, useMemo } from "react";

import type { Habit, HabitLog } from "@/lib/home/habits";
import type { MoodEntry } from "@/lib/mood/types";
import type { LogEntry } from "@/lib/nutrition/types";
import type { WeighIn } from "@/lib/health/body";
import { usePrefValue } from "@/lib/prefsStore";
import { FOODLOG_KEY, parseFoodLogValue } from "@/lib/nutrition/store";
import { PLAN_KEY, parsePlanValue } from "@/lib/nutrition/plan";
import { WEIGHINS_KEY, parseWeighIns } from "@/lib/health/body";
import {
  EMPTY_NUDGE_STATE,
  NUDGES_KEY,
  dismissNudge,
  parseNudgeState,
  recordShown,
  snoozeNudge,
  writeNudgeState,
} from "@/lib/behaviour/state";
import { selectNudges, type Nudge, type NudgeSelection } from "@/lib/behaviour/engine";
import {
  ASSESSMENT_KEY,
  EMPTY_ASSESSMENT_STATE,
  parseAssessmentState,
} from "@/lib/assessment/state";

const EMPTY_ENTRIES: LogEntry[] = [];
const EMPTY_WEIGH_INS: WeighIn[] = [];

export interface UseNudgeArgs {
  habits: readonly Habit[];
  habitLogs: readonly HabitLog[];
  moodEntries: readonly MoodEntry[];
  /** Local day key for today. */
  today: string;
  /** The page's ticking clock. */
  now: Date;
  /** Latched "every source has settled" flag from the page. */
  ready: boolean;
}

export interface NudgeControls extends NudgeSelection {
  dismiss: (nudge: Nudge) => void;
  snooze: (nudge: Nudge) => void;
}

export function useNudge(args: UseNudgeArgs): NudgeControls {
  const { habits, habitLogs, moodEntries, today, now, ready } = args;

  const foodEntries = usePrefValue(FOODLOG_KEY, parseFoodLogValue, EMPTY_ENTRIES);
  const plan = usePrefValue(PLAN_KEY, parsePlanValue, null);
  const weighIns = usePrefValue(WEIGHINS_KEY, parseWeighIns, EMPTY_WEIGH_INS);
  const state = usePrefValue(NUDGES_KEY, parseNudgeState, EMPTY_NUDGE_STATE);
  /* The Assessment's emotional-eating answer (§10) is the mood
   * detector's context — read from the same pref the other sources
   * use, never estimated from behaviour. */
  const assessment = usePrefValue(ASSESSMENT_KEY, parseAssessmentState, EMPTY_ASSESSMENT_STATE);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const selection = useMemo<NudgeSelection>(() => {
    if (!ready) return { primary: null, secondary: null };
    return selectNudges(
      {
        today,
        nowMinutes,
        habits,
        habitLogs,
        foodEntries: foodEntries ?? EMPTY_ENTRIES,
        plan,
        weighIns,
        moodEntries,
        emotionalEating: assessment.answers.emotionalEating,
      },
      state,
    );
  }, [
    ready,
    today,
    nowMinutes,
    habits,
    habitLogs,
    foodEntries,
    plan,
    weighIns,
    moodEntries,
    assessment,
    state,
  ]);

  const primaryKey = selection.primary?.key ?? null;
  const secondaryKey = selection.secondary?.key ?? null;

  /* Remember what was shown — the consecutive-day quiet rule reads it
   * tomorrow. recordShown returns the same object when nothing
   * changes, so repeat renders never write twice. */
  useEffect(() => {
    const keys = [primaryKey, secondaryKey].filter((k): k is string => k !== null);
    if (keys.length === 0) return;
    const next = recordShown(state, keys, today);
    if (next !== state) writeNudgeState(next);
  }, [primaryKey, secondaryKey, state, today]);

  return {
    ...selection,
    dismiss: (nudge) => writeNudgeState(dismissNudge(state, nudge.kind, today)),
    snooze: (nudge) => writeNudgeState(snoozeNudge(state, nudge.key, today)),
  };
}
