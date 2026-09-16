/**
 * Bloom Progression — shared types.
 *
 * Rewards is a *journey*, not a shop. Everything in this module describes the
 * progression spine:
 *
 *   meaningful action → verified goal → Bloom Points → milestone → rank
 *     → achievement → celebration → the journey continues
 *
 * Four distinct systems live here, deliberately kept apart:
 *
 *   POINTS        — the earned total (authoritative: profiles.total_points).
 *   GOALS         — active, verifiable tasks the person can complete.
 *   RANKS         — cumulative progression derived *only* from earned points.
 *   ACHIEVEMENTS  — special accomplishments, each with a real condition.
 *
 * Nothing in this file invents data: every goal and achievement carries a
 * verification spec that is resolved against Bloom's real records (habit logs,
 * tracker days, mood entries, earned points) in `evaluate.ts`.
 */

/**
 * The journals a goal or achievement can belong to. This is the progression
 * vocabulary — deliberately its own, so the journey is never described in
 * shop language. Health and fitness lead; rest, mood and care are equal
 * citizens of the same journey.
 */
export type JourneyDomain =
  | "fitness"
  | "movement"
  | "health"
  | "sleep"
  | "hydration"
  | "recovery"
  | "energy"
  | "habits"
  | "consistency"
  | "mood"
  | "mindfulness"
  | "study"
  | "self-care"
  | "milestones";

export const JOURNEY_DOMAINS: JourneyDomain[] = [
  "fitness",
  "movement",
  "health",
  "sleep",
  "hydration",
  "recovery",
  "energy",
  "habits",
  "consistency",
  "mood",
  "mindfulness",
  "study",
  "self-care",
  "milestones",
];

export const JOURNEY_DOMAIN_LABELS: Record<JourneyDomain, string> = {
  fitness: "Fitness",
  movement: "Movement",
  health: "Health",
  sleep: "Sleep",
  hydration: "Hydration",
  recovery: "Recovery",
  energy: "Energy",
  habits: "Habits",
  consistency: "Consistency",
  mood: "Mood",
  mindfulness: "Mindfulness",
  study: "Study",
  "self-care": "Self-care",
  milestones: "Milestones",
};

/* --------------------------------- points -------------------------------- */

/** Where a point award came from. Shown verbatim in Point Activity. */
export type PointSource =
  | "habits"
  | "consistency"
  | "movement"
  | "fitness"
  | "sleep"
  | "hydration"
  | "recovery"
  | "mood"
  | "mindfulness"
  | "study"
  | "self-care"
  | "milestones";

export const POINT_SOURCE_LABELS: Record<PointSource, string> = {
  habits: "Habits",
  consistency: "Consistency",
  movement: "Movement",
  fitness: "Fitness",
  sleep: "Sleep",
  hydration: "Hydration",
  recovery: "Recovery",
  mood: "Mood",
  mindfulness: "Mindfulness",
  study: "Study",
  "self-care": "Self-care",
  milestones: "Milestones",
};

/* --------------------------------- goals --------------------------------- */

/** How often a goal can award points. Recurring goals reset on their period. */
export type GoalCadence =
  /** Resets every local day (today's routine, a single session). */
  | "daily"
  /** Resets every ISO week (weekly movement milestone). */
  | "weekly"
  /** Resets every calendar month. */
  | "monthly"
  /** Awards exactly once, ever. */
  | "one-time";

export const CADENCE_LABELS: Record<GoalCadence, string> = {
  daily: "Today",
  weekly: "This week",
  monthly: "This month",
  "one-time": "Milestone",
};

/**
 * A verification spec — the single source of truth for "is this goal done?".
 * Every variant reads real records only. `evaluate.ts` resolves them; the
 * Supabase migration resolves the same ids server-side before awarding.
 */
export type GoalSpec =
  /** Distinct local days with at least one habit tick, within `window` days. */
  | { on: "habitDays"; window: number }
  /** Total habit ticks within `window` days. */
  | { on: "habitTicks"; window: number }
  /** Longest run of consecutive days with a tick (missing a day never erases
   *  earlier progress — the run simply starts again). */
  | { on: "habitRun" }
  /** Distinct days a given tracker was filled in, within `window` days. */
  | { on: "trackerDays"; tracker: TrackedField; window: number }
  /** Distinct days a tracker met the person's *own* goal, within `window` days. */
  | { on: "trackerGoalDays"; tracker: TrackedField; window: number }
  /** Movement sessions logged (a day counts each session it records). */
  | { on: "movementSessions"; window: number }
  /** Study sessions logged. */
  | { on: "studySessions"; window: number }
  /** Distinct days a mood entry exists, within `window` days. */
  | { on: "moodDays"; window: number }
  /** Days where rest was honoured: sleep met the person's own goal and the
   *  night was rated 3+. Recovery is progress, never a debt. */
  | { on: "recoveryDays"; window: number }
  /** Days that began before `before` (local "HH:MM"), within `window` days.
   *  Read from the wake time the person logged — never inferred. */
  | { on: "earlyDays"; before: string; window: number }
  /** Days with *any* check-in at all (habits, a tracker or a mood entry) —
   *  the balance goal. */
  | { on: "balanceDays"; window: number }
  /** The very first habit tick. */
  | { on: "firstTick" }
  /** Lifetime earned points (used by long-horizon milestones). */
  | { on: "points"; amount: number }
  /** Reaching a rank tier (used by achievements). */
  | { on: "rankTier"; tier: number };

export type TrackedField = "sleep" | "water" | "movement" | "study" | "energy" | "screen";

export const TRACKED_FIELD_LABELS: Record<TrackedField, string> = {
  sleep: "Sleep",
  water: "Hydration",
  movement: "Movement",
  study: "Study",
  energy: "Energy",
  screen: "Screen time",
};

export interface GoalDef {
  id: string;
  /** The instruction, in the person's own terms: "Complete 5 movement sessions". */
  title: string;
  /** One calm sentence of context under the title. */
  detail: string;
  domain: JourneyDomain;
  source: PointSource;
  spec: GoalSpec;
  /** What the counter counts to. */
  target: number;
  /**
   * "todayHabits" resolves the target to however many habits are scheduled
   * today — the routine goal is the person's own routine, not a fixed number.
   */
  targetMode?: "fixed" | "todayHabits";
  cadence: GoalCadence;
  /** Bloom Points awarded on verified completion. */
  points: number;
  /** Rough length of the road, in words — never "easy/hard". */
  length: string;
  /** Shown first: reachable soon, or newly opened. */
  featured?: boolean;
}

/* ------------------------------ goal progress ---------------------------- */

export interface GoalProgress {
  goal: GoalDef;
  /** Verified counter, clamped to the target. */
  progress: number;
  /** 0–1. */
  ratio: number;
  complete: boolean;
  /** The period this completion belongs to (daily/weekly/monthly/one-time). */
  periodKey: string;
  /** Already awarded for this period — a completed goal is never re-charged. */
  claimed: boolean;
  /** Verified complete, not yet awarded: the one moment points can move. */
  claimable: boolean;
  /** How much is still missing, in the goal's own unit. */
  remaining: number;
}

/* --------------------------------- ranks --------------------------------- */

export interface RankDef {
  /** 1-based position in the endless ladder. */
  tier: number;
  id: string;
  name: string;
  /** Earned points at which this rank begins. */
  threshold: number;
  /** The line shown on a profile: "In Bloom". */
  title: string;
  /** Signature colour used by the emblem and the journey path. */
  tone: string;
  /** Emblem key resolved by components/progression/Emblem.tsx. */
  emblem: string;
  /** The ceremony line. Short, human, never congratulatory noise. */
  affirmation: string;
  /** Cycle number for the endless ranks past the named ladder (1 = first). */
  cycle: number;
}

export interface RankState {
  rank: RankDef;
  /** Always present: the ladder has no final rank. */
  next: RankDef;
  /** Points earned inside the current rank. */
  intoRank: number;
  /** Points the current rank spans (next.threshold − rank.threshold). */
  span: number;
  /** 0–1 through the current rank. */
  progress: number;
  /** Points still needed for the next rank. 0 when the ladder is endless. */
  remaining: number;
  /** True when the rank was reached in the endless cycle layer. */
  beyondNamed: boolean;
}

/* ------------------------------ achievements ----------------------------- */

export type AchievementRarity = "notable" | "rare" | "signature";

export const RARITY_ORDER: AchievementRarity[] = ["notable", "rare", "signature"];

export const ACHIEVEMENT_RARITY_LABELS: Record<AchievementRarity, string> = {
  notable: "Notable",
  rare: "Rare",
  signature: "Signature",
};

export interface AchievementDef {
  id: string;
  title: string;
  /** The condition, stated plainly: "Keep 7 days of habit consistency". */
  condition: string;
  /** A single human line shown when it is earned. */
  earnedLine: string;
  spec: GoalSpec;
  target: number;
  rarity: AchievementRarity;
  domain: JourneyDomain;
  tone: string;
  emblem: string;
}

export interface AchievementState {
  def: AchievementDef;
  progress: number;
  ratio: number;
  unlocked: boolean;
  achievedAt: string | null;
}

/* -------------------------------- ledger --------------------------------- */

export type LedgerKind = "goal" | "achievement" | "rank";

/** One real point movement. Mirrors the server's `point_transactions` row. */
export interface PointEntry {
  id: string;
  kind: LedgerKind;
  /** Goal/achievement/rank id. `null` for a manual adjustment. */
  refId: string | null;
  /** Period the award belongs to (goals only) — the idempotency key. */
  periodKey: string | null;
  title: string;
  source: PointSource;
  points: number;
  /** ISO timestamp. */
  at: string;
}

/** A rank the person has actually reached, in order. */
export interface RankEvent {
  tier: number;
  name: string;
  /** Earned points at the moment of reaching it. */
  atPoints: number;
  at: string;
}

/* ------------------------------- snapshot -------------------------------- */

/** Everything the engine is allowed to read. Assembled by useProgression. */
export interface ProgressionInput {
  /** Local yyyy-mm-dd. */
  today: string;
  /** Lifetime earned points. Null only while the account row is loading. */
  earnedLifetime: number | null;
  /** Whether the figure above came from the account (else device-derived). */
  mode: "cloud" | "device";
  habits: readonly { id: string; name: string; points: number }[];
  /** habitId + local date, exactly as habit_logs stores it. */
  logs: readonly { habitId: string; date: string }[];
  trackerDays: readonly {
    date: string;
    sleepMinutes: number | null;
    sleepQuality: number | null;
    /** Local "HH:MM" as logged; null when the person did not record it. */
    wakeTime: string | null;
    waterMl: number | null;
    movementMinutes: number | null;
    energy: number | null;
    studyMinutes: number;
    /** How many study sessions that day recorded (Trackers stores a list). */
    studySessions: number;
  }[];
  /** The person's own tracker targets (Trackers → Goals). */
  trackerGoals: {
    sleepMinutes: number;
    waterMl: number;
    movementMinutes: number;
    studyMinutes: number;
    energy: number;
    screenMinutes: number;
  };
  /** Distinct local days with a mood entry, and the total entry count. */
  moodDays: readonly string[];
  moodCount: number;
}

export interface ProgressionSnapshot {
  points: number;
  loading: boolean;
  rank: RankState;
  goals: GoalProgress[];
  /** The calm "your best next step" — closest incomplete goal with real progress. */
  nextMilestone: GoalProgress | null;
  achievements: AchievementState[];
  /** Point awards, newest first (real ledger only). */
  ledger: PointEntry[];
  /** Rank-ups that actually happened, newest first. */
  rankEvents: RankEvent[];
  /** Points that came from goal/achievement awards (never invented). */
  awardedTotal: number;
  /** Lifetime earned, split for transparency. */
  earnedFromHabits: number;
  earnedFromMilestones: number;
}
