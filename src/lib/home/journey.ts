/**
 * The First Bloom journey — Today's guided first run, as a pure model.
 *
 * After onboarding, a new person used to land in the whole app at once:
 * a plain greeting, chores and an assessment prompt, nothing leading
 * anywhere. This model is the path that replaces that on mobile: seven
 * steps, each introducing ONE part of Bloom with ONE small real action,
 * presented one at a time — the first unfinished step is the page's
 * single clear action, and the rest wait quietly behind it.
 *
 * The discipline is the record's own, the same the Profile Getting
 * Started card already keeps:
 *
 *   · A step is done only when the real thing is done. Every `done`
 *     below reads a real completion signal from the app's stores —
 *     tracker days logged, habit ticks, mood entries, a composed plan,
 *     the assessment's own status. Nothing is seeded or assumed.
 *   · The one exception is Vitalis, and it is honest about why: the
 *     orb's sessions are ephemeral BY DESIGN (nothing is persisted
 *     anywhere), so there is no durable record of a meeting to read.
 *     Its signal is the live one — the window opened in this session
 *     (lib/vitalis-ai/openRequest) — and it is never stored.
 *   · Points are the progression system's own, read from its goal
 *     catalogue by id (GOAL_BY_ID), never restated here: the daily
 *     hydration / sleep / mood goals and the first-tick milestone pay
 *     for exactly the actions these steps ask for. Steps the system
 *     pays nothing for show no points at all.
 *   · Copy ties to the person's own goal only when the assessment has
 *     actually stated one (answers.goal). The body profile's goal is
 *     NOT used: it defaults to "maintain" for every account, so it
 *     would put a goal in the mouth of someone who never chose one.
 *
 * Pure: no React, no storage, no clock. The component feeds it the
 * hooks' current shapes; the same inputs always give the same path.
 */

import { GOAL_LABEL } from "@/lib/assessment/questions";
import type { AssessmentStatus } from "@/lib/assessment/state";
import { GOAL_BY_ID } from "@/lib/progression/goals";
import type { VitalisGoal } from "@/lib/vitalis/domain/profile";

export type JourneyStepId =
  "water" | "habit" | "vitalis" | "dish" | "sleep" | "mood" | "assessment";

export interface JourneyStep {
  id: JourneyStepId;
  title: string;
  /** One line: what this step is, in the person's own terms. */
  line: string;
  /** The single action's label (the habit step's may be specialised
      by the component when it can name the habit). */
  actionLabel: string;
  done: boolean;
  /**
   * The points the progression system itself pays for this step's
   * action — read from its catalogue, null where it pays nothing.
   */
  points: number | null;
}

export interface JourneySignals {
  /** Days carrying a water log, ever (tracker analysis). */
  waterDaysLogged: number;
  /** Habit ticks in the record, ever (habit logs). */
  habitTicks: number;
  /** Vitalis's window opened in this session (the live signal). */
  vitalisMet: boolean;
  /** A plan exists in the record — composed for today, or a past day's. */
  planExists: boolean;
  /** The anchor dish of today's composed plan, when one is ready. */
  todayDish: string | null;
  /** Days carrying a sleep log, ever (tracker analysis). */
  sleepDaysLogged: number;
  /** Mood check-ins in the record, ever. */
  moodEntries: number;
  assessmentStatus: AssessmentStatus;
  /** The goal the assessment itself stated, or null when it hasn't. */
  goal: VitalisGoal | null;
}

export interface JourneyState {
  steps: JourneyStep[];
  /** Index of the first unfinished step; -1 when the path is complete. */
  current: number;
  complete: boolean;
  doneCount: number;
}

/** The catalogue's own price for an action — null when it pays nothing. */
const pointsFor = (goalId: string): number | null => GOAL_BY_ID.get(goalId)?.points ?? null;

export function journeyStateOf(signals: JourneySignals): JourneyState {
  const goalLine = signals.goal ? GOAL_LABEL[signals.goal].toLowerCase() : null;
  const inProgress = signals.assessmentStatus === "in_progress";

  const steps: JourneyStep[] = [
    {
      id: "water",
      title: "Meet your Bloom",
      line: "Your Bloom drinks when you do. Log a glass of water and watch it answer.",
      actionLabel: "Log water",
      done: signals.waterDaysLogged > 0,
      points: pointsFor("daily-water"),
    },
    {
      id: "habit",
      title: "Tick your first habit",
      line: "One small routine, done once, starts your record — and earns your first milestone.",
      actionLabel: "Tick a habit",
      done: signals.habitTicks > 0,
      points: pointsFor("first-bloom"),
    },
    {
      id: "vitalis",
      title: "Meet Vitalis",
      line: "The orb at the corner of your screen is Vitalis — Bloom's nutrition mind. Say hello, and ask it anything about your food.",
      actionLabel: "Meet Vitalis",
      done: signals.vitalisMet,
      points: null,
    },
    {
      id: "dish",
      title: "See today's dish",
      line: signals.todayDish
        ? goalLine
          ? `Today's dish is ${signals.todayDish} — composed around ${goalLine}.`
          : `Today's dish is ${signals.todayDish} — see what Bloom composed for you.`
        : goalLine
          ? `Bloom composes a plan around ${goalLine}. See what today's dish looks like.`
          : "See the dish Bloom composes for a day like yours.",
      actionLabel: "See today's dish",
      done: signals.planExists,
      points: null,
    },
    {
      id: "sleep",
      title: "Log last night's sleep",
      line: "Sleep is progress too. Logging it is how the rest of your picture forms.",
      actionLabel: "Log sleep",
      done: signals.sleepDaysLogged > 0,
      points: pointsFor("daily-sleep"),
    },
    {
      id: "mood",
      title: "Check in your mood",
      line: "Thirty seconds: name how today feels. It's the signal everything else in Bloom connects to.",
      actionLabel: "Check in",
      done: signals.moodEntries > 0,
      points: pointsFor("daily-mood"),
    },
    {
      id: "assessment",
      title: "Unlock your full plan",
      line: inProgress
        ? "You're part-way through. Finish the last sections and Bloom composes your full plan from your answers."
        : goalLine
          ? `Seven short sections on how you eat, move, sleep and recover. Finish, and Bloom composes your full plan around ${goalLine}.`
          : "Seven short sections on how you eat, move, sleep and recover. Finish, and Bloom composes your full plan around you.",
      actionLabel: inProgress ? "Continue the assessment" : "Begin the assessment",
      done: signals.assessmentStatus === "complete",
      points: null,
    },
  ];

  const current = steps.findIndex((s) => !s.done);
  return {
    steps,
    current,
    complete: current === -1,
    doneCount: steps.filter((s) => s.done).length,
  };
}
