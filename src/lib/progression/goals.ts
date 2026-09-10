/**
 * Bloom Progression — the goal catalog.
 *
 * Every goal below is verifiable from records Bloom genuinely holds:
 * `habit_logs` (a tick per habit per local day), `tracker_days` (sleep, water,
 * movement, study, energy, screen — each with the person's own targets from
 * Trackers → Goals) and `mood_entries` (the Mood record). Nothing is
 * decorative, nothing is estimated, and nothing is fabricated.
 *
 * Points are deliberately substantial: a verified goal pays 400–10,000, so a
 * milestone *feels* like one. Habit ticks keep paying their own 5–500 points
 * (default 10) exactly as they always have — goals are the bonus layer on top.
 *
 * Copy rules held throughout: no medical claims, no body judgement, no
 * "streak lost" framing, no fear. Missing a day never erases anything — the
 * run simply begins again from here.
 */

import type { GoalDef, GoalProgress } from "./types";

/* ------------------------------- daily ----------------------------------- */
/* Small, resettable, pressure-free: today's version of the journey.          */

const DAILY: GoalDef[] = [
  {
    id: "daily-routine",
    title: "Complete today's habit routine",
    detail: "Every habit you keep today counts towards this. Whatever today allows.",
    domain: "habits",
    source: "habits",
    spec: { on: "habitTicks", window: 1 },
    target: 1,
    targetMode: "todayHabits",
    cadence: "daily",
    points: 50,
    length: "One day",
    featured: true,
  },
  {
    id: "daily-move",
    title: "Log movement today",
    detail: "A walk, a stretch, a swim — anything you count as moving.",
    domain: "movement",
    source: "movement",
    spec: { on: "trackerDays", tracker: "movement", window: 1 },
    target: 1,
    cadence: "daily",
    points: 60,
    length: "One day",
    featured: true,
  },
  {
    id: "daily-mood",
    title: "Check in with how today feels",
    detail: "One entry is enough. Naming a feeling is the whole practice.",
    domain: "mood",
    source: "mood",
    spec: { on: "moodDays", window: 1 },
    target: 1,
    cadence: "daily",
    points: 50,
    length: "One day",
    featured: true,
  },
  {
    id: "daily-water",
    title: "Log hydration today",
    detail: "Your own line, your own glass. No targets pushed on you here.",
    domain: "hydration",
    source: "hydration",
    spec: { on: "trackerDays", tracker: "water", window: 1 },
    target: 1,
    cadence: "daily",
    points: 50,
    length: "One day",
  },
  {
    id: "daily-sleep",
    title: "Log last night's sleep",
    detail: "Sleep is progress too. Logging it is how the rest of the picture forms.",
    domain: "sleep",
    source: "sleep",
    spec: { on: "trackerDays", tracker: "sleep", window: 1 },
    target: 1,
    cadence: "daily",
    points: 60,
    length: "One day",
  },
];

/* ------------------------------- weekly ---------------------------------- */

const WEEKLY: GoalDef[] = [
  {
    id: "week-consistency",
    title: "Keep 5 days of habit consistency this week",
    detail: "Five days of any habit at all — the same ones, or different ones.",
    domain: "habits",
    source: "consistency",
    spec: { on: "habitDays", window: 7 },
    target: 5,
    cadence: "weekly",
    points: 500,
    length: "One week",
    featured: true,
  },
  {
    id: "week-movement",
    title: "Complete 5 movement sessions this week",
    detail: "Five days with movement logged. Rest days are part of the plan, not a gap in it.",
    domain: "movement",
    source: "fitness",
    spec: { on: "movementSessions", window: 7 },
    target: 5,
    cadence: "weekly",
    points: 600,
    length: "One week",
    featured: true,
  },
  {
    id: "week-mood",
    title: "Log your mood on 5 days this week",
    detail: "Consistent reflection — not being happy. Every feeling is welcome here.",
    domain: "mindfulness",
    source: "mindfulness",
    spec: { on: "moodDays", window: 7 },
    target: 5,
    cadence: "weekly",
    points: 400,
    length: "One week",
  },
  {
    id: "week-hydration",
    title: "Log hydration on 5 days this week",
    detail: "Five days of logging. Your amounts, at your pace.",
    domain: "hydration",
    source: "hydration",
    spec: { on: "trackerDays", tracker: "water", window: 7 },
    target: 5,
    cadence: "weekly",
    points: 450,
    length: "One week",
  },
  {
    id: "week-sleep-rhythm",
    title: "Keep your sleep rhythm on 5 nights",
    detail: "Nights that met the sleep goal you set for yourself in Trackers.",
    domain: "sleep",
    source: "sleep",
    spec: { on: "trackerGoalDays", tracker: "sleep", window: 7 },
    target: 5,
    cadence: "weekly",
    points: 500,
    length: "One week",
  },
  {
    id: "week-balance",
    title: "Check in with Bloom on 5 days",
    detail: "A habit, a tracker or a mood entry — any one of them counts as showing up.",
    domain: "self-care",
    source: "recovery",
    spec: { on: "balanceDays", window: 7 },
    target: 5,
    cadence: "weekly",
    points: 500,
    length: "One week",
  },
  {
    id: "week-study",
    title: "Study on 4 days this week",
    detail: "Four days with a study session logged, however short.",
    domain: "study",
    source: "study",
    spec: { on: "trackerDays", tracker: "study", window: 7 },
    target: 4,
    cadence: "weekly",
    points: 450,
    length: "One week",
  },
  {
    id: "week-recovery",
    title: "Honour rest on 3 days",
    detail: "Nights where sleep met your own goal and felt decent. Recovery is progress.",
    domain: "recovery",
    source: "recovery",
    spec: { on: "recoveryDays", window: 7 },
    target: 3,
    cadence: "weekly",
    points: 500,
    length: "One week",
  },
];

/* ------------------------------- monthly --------------------------------- */

const MONTHLY: GoalDef[] = [
  {
    id: "month-consistency",
    title: "Keep 20 days of habit consistency this month",
    detail: "Twenty days across the month. They do not need to be consecutive.",
    domain: "habits",
    source: "consistency",
    spec: { on: "habitDays", window: 30 },
    target: 20,
    cadence: "monthly",
    points: 1_500,
    length: "One month",
    featured: true,
  },
  {
    id: "month-movement",
    title: "Move on 12 days this month",
    detail: "Twelve days with movement logged — spread however your life allows.",
    domain: "fitness",
    source: "fitness",
    spec: { on: "trackerDays", tracker: "movement", window: 30 },
    target: 12,
    cadence: "monthly",
    points: 1_200,
    length: "One month",
  },
  {
    id: "month-reflection",
    title: "Reflect on 15 days this month",
    detail: "Fifteen days of mood entries. Depth of feeling is not being scored.",
    domain: "mindfulness",
    source: "mindfulness",
    spec: { on: "moodDays", window: 30 },
    target: 15,
    cadence: "monthly",
    points: 1_000,
    length: "One month",
  },
  {
    id: "month-study",
    title: "Study on 10 days this month",
    detail: "Ten days with a study session. Quiet focus, kept.",
    domain: "study",
    source: "study",
    spec: { on: "trackerDays", tracker: "study", window: 30 },
    target: 10,
    cadence: "monthly",
    points: 1_000,
    length: "One month",
  },
];

/* ----------------------------- lifetime milestones ------------------------ */
/* One-time. Awards land once, ever — and the run keeps going afterwards.     */

const MILESTONES: GoalDef[] = [
  {
    id: "first-bloom",
    title: "Tick your first habit",
    detail: "The very first step of the journey.",
    domain: "habits",
    source: "milestones",
    spec: { on: "firstTick" },
    target: 1,
    cadence: "one-time",
    points: 100,
    length: "Beginning",
    featured: true,
  },
  {
    id: "run-7",
    title: "Keep 7 days in a row",
    detail: "A full week of habit consistency. Missed days simply start a new run.",
    domain: "consistency",
    source: "consistency",
    spec: { on: "habitRun" },
    target: 7,
    cadence: "one-time",
    points: 500,
    length: "One week",
    featured: true,
  },
  {
    id: "days-30",
    title: "Keep 30 days of habit consistency",
    detail: "Thirty days in total — consecutive or not. Both count the same here.",
    domain: "consistency",
    source: "consistency",
    spec: { on: "habitDays", window: 400 },
    target: 30,
    cadence: "one-time",
    points: 1_000,
    length: "One month",
    featured: true,
  },
  {
    id: "run-14",
    title: "Keep 14 days in a row",
    detail: "Two weeks of showing up, in whatever way the days allowed.",
    domain: "consistency",
    source: "consistency",
    spec: { on: "habitRun" },
    target: 14,
    cadence: "one-time",
    points: 900,
    length: "Two weeks",
  },
  {
    id: "run-30",
    title: "Keep 30 days in a row",
    detail: "A month of consistency. This is the long game paying off.",
    domain: "consistency",
    source: "consistency",
    spec: { on: "habitRun" },
    target: 30,
    cadence: "one-time",
    points: 1_800,
    length: "One month",
  },
  {
    id: "movement-25",
    title: "Complete 25 movement sessions",
    detail: "Twenty-five days with movement logged, over as long as it takes.",
    domain: "fitness",
    source: "fitness",
    spec: { on: "movementSessions", window: 400 },
    target: 25,
    cadence: "one-time",
    points: 2_000,
    length: "Long road",
  },
  {
    id: "mood-30",
    title: "Reflect on 30 days",
    detail: "Thirty days of checking in with yourself. Self-awareness has its own rewards.",
    domain: "mindfulness",
    source: "mindfulness",
    spec: { on: "moodDays", window: 400 },
    target: 30,
    cadence: "one-time",
    points: 1_000,
    length: "Long road",
  },
  {
    id: "sleep-30",
    title: "Log 30 nights of sleep",
    detail: "Thirty nights recorded — the quiet foundation of everything else.",
    domain: "sleep",
    source: "sleep",
    spec: { on: "trackerDays", tracker: "sleep", window: 400 },
    target: 30,
    cadence: "one-time",
    points: 1_000,
    length: "Long road",
  },
  {
    id: "hydration-30",
    title: "Log hydration on 30 days",
    detail: "Thirty days of noticing. No amounts required beyond your own.",
    domain: "hydration",
    source: "hydration",
    spec: { on: "trackerDays", tracker: "water", window: 400 },
    target: 30,
    cadence: "one-time",
    points: 1_000,
    length: "Long road",
  },
  {
    id: "recovery-20",
    title: "Honour rest on 20 days",
    detail: "Twenty days where rest was given its place. Recovery counts as progress.",
    domain: "recovery",
    source: "recovery",
    spec: { on: "recoveryDays", window: 400 },
    target: 20,
    cadence: "one-time",
    points: 1_200,
    length: "Long road",
  },
  {
    id: "study-50",
    title: "Complete 50 study sessions",
    detail: "Fifty sessions of quiet focus, logged over time.",
    domain: "study",
    source: "study",
    spec: { on: "studySessions", window: 400 },
    target: 50,
    cadence: "one-time",
    points: 2_000,
    length: "Long road",
  },
  {
    id: "run-60",
    title: "Keep 60 days in a row",
    detail: "Sixty days of consistency — through every kind of week.",
    domain: "consistency",
    source: "consistency",
    spec: { on: "habitRun" },
    target: 60,
    cadence: "one-time",
    points: 3_200,
    length: "Two months",
  },
  {
    id: "days-100",
    title: "Keep 100 days of habit consistency",
    detail: "One hundred days in total. A hundred ordinary days, made to count.",
    domain: "consistency",
    source: "consistency",
    spec: { on: "habitDays", window: 400 },
    target: 100,
    cadence: "one-time",
    points: 3_000,
    length: "Long road",
  },
  {
    id: "movement-100",
    title: "Complete 100 movement sessions",
    detail: "One hundred days with movement logged. Consistency over intensity, always.",
    domain: "fitness",
    source: "fitness",
    spec: { on: "movementSessions", window: 400 },
    target: 100,
    cadence: "one-time",
    points: 6_000,
    length: "A season",
  },
  {
    id: "mood-100",
    title: "Reflect on 100 days",
    detail: "One hundred entries in the Mood record. A real map of a real person.",
    domain: "mindfulness",
    source: "mindfulness",
    spec: { on: "moodDays", window: 400 },
    target: 100,
    cadence: "one-time",
    points: 2_500,
    length: "A season",
  },
  {
    id: "run-90",
    title: "Keep 90 days in a row",
    detail: "Ninety days. The garden is established now.",
    domain: "consistency",
    source: "consistency",
    spec: { on: "habitRun" },
    target: 90,
    cadence: "one-time",
    points: 4_500,
    length: "Three months",
  },
  {
    id: "days-365",
    title: "A year of showing up",
    detail: "365 days of habit consistency, in total. However long it took.",
    domain: "consistency",
    source: "consistency",
    spec: { on: "habitDays", window: 400 },
    target: 365,
    cadence: "one-time",
    points: 10_000,
    length: "A year",
  },
];

export const GOALS: GoalDef[] = [...DAILY, ...WEEKLY, ...MONTHLY, ...MILESTONES];

export const GOAL_BY_ID = new Map<string, GoalDef>(GOALS.map((g) => [g.id, g]));

export const DAILY_GOALS = DAILY;
export const WEEKLY_GOALS = WEEKLY;
export const MONTHLY_GOALS = MONTHLY;
export const MILESTONE_GOALS = MILESTONES;

/**
 * The calm "your next milestone" pick: verified progress, not yet awarded,
 * closest to completion first, then the most valuable. Never fabricates —
 * an untouched goal only wins when nothing else has progress.
 */
export function recommendNext(progress: readonly GoalProgress[]): GoalProgress | null {
  let best: GoalProgress | null = null;
  let bestScore = -1;
  for (const item of progress) {
    if (item.complete || item.claimed) continue;
    // Distance to go dominates; value breaks ties. A goal with real progress
    // always beats an untouched one, so the recommendation is honest.
    const started = item.progress > 0 ? 1 : 0;
    const score = started * 1_000 + item.ratio * 100 + Math.min(item.goal.points, 9_999) / 100_000;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}
