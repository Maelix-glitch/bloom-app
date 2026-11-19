/**
 * Whole-Life Insights — the cross-source pattern reader (System 6).
 *
 * The Overview synthesis reads the record week over week; the Mood page
 * correlates mood against mood's own context fields; the constellation
 * maps which signals are present. This module does the one job none of
 * them does: it looks for honest patterns ACROSS the whole record —
 * mood check-ins, the sleep/movement/screen trackers, habit ticks, the
 * food log and weigh-ins — and says, in plain associative language,
 * what tends to go with what in this person's own logged life.
 *
 * METHOD — grouped averages (chosen over Pearson, deliberately):
 * Pearson's r is compact but unreadable on the page ("r = 0.42" means
 * nothing to most people, and invites a precision the record can't
 * support). So each candidate pair is tested the way a person would
 * eyeball it:
 *
 *   1. Build one row per calendar day in the window, from the real
 *      stores only. A day enters a pair only when BOTH sides were
 *      actually logged that day (paired days) — an unlogged day is
 *      missing, never a zero.
 *   2. Rank the paired days by the driver and split them into a lower
 *      half and an upper half (a rank split, so tied values can never
 *      unbalance the groups). Binary drivers (food logged or not) use
 *      their natural two groups.
 *   3. Compare the outcome's mean in the two halves. The strength is
 *      the standardised difference, d = (meanUpper − meanLower) /
 *      SD(outcome across the paired days) — how big the gap is
 *      relative to how much the outcome normally moves.
 *
 * HONESTY RULES — pinned by tests, not just promised:
 *
 *   · A pair needs at least MIN_PAIRED_DAYS paired days before it can
 *     be spoken at all. Below that it is reported as pending, WITH its
 *     real count, so the page can say "5 of 8 days" instead of either
 *     dressing five days up as a pattern or pretending nothing exists.
 *   · Each group needs at least MIN_GROUP_DAYS days.
 *   · An association weaker than MIN_EFFECT is NOT surfaced — not
 *     softened, not footnoted: absent. Weak noise does not become a
 *     "slight tendency".
 *   · A driver that never varies (every paired day identical) can
 *     support no comparison and yields nothing.
 *   · Every insight carries its sample size and its window, in the
 *     object and in the rendered copy.
 *   · The language is associative, always: "tends to", "on days…",
 *     "after nights…". Nothing here causes anything, and no sentence
 *     in this module claims it does. No scores, no health claims, no
 *     advice — the same discipline as the tracker core.
 *   · The weight "insight" is a plain description, held to its own
 *     bar: at least 4 weigh-ins spanning at least 14 days, and an
 *     earlier-half vs later-half mean shift of at least 0.5 kg —
 *     below that, scale noise stays unspoken.
 *
 * Pure: no React, no storage, no clock. The caller passes `today` and
 * the stores' current shapes; the same inputs always give the same
 * answer.
 */

import type { WeighIn } from "@/lib/health/body";
import type { HabitLog } from "@/lib/home/habits";
import { localDay, shiftDay } from "@/lib/localDay";
import type { MoodEntry } from "@/lib/mood/types";
import type { LogEntry } from "@/lib/nutrition/types";
import { valueOf, type DayEntry } from "@/lib/trackers/core";

/* ------------------------------ thresholds ------------------------------- */

/** The window every pair is read over, in days (today included). */
export const WHOLE_LIFE_WINDOW_DAYS = 56;

/** A pair is only spoken with at least this many paired days behind it. */
export const MIN_PAIRED_DAYS = 8;

/** Each compared group needs at least this many days. */
export const MIN_GROUP_DAYS = 3;

/**
 * The weakest standardised difference that earns a sentence. Below it,
 * the association is not surfaced at all.
 */
export const MIN_EFFECT = 0.35;

/** Weight: the smallest earlier→later mean shift (kg) that is spoken. */
export const MIN_WEIGHT_SHIFT_KG = 0.5;

/** Weight: at least this many weigh-ins… */
export const MIN_WEIGH_INS = 4;

/** …spanning at least this many days. */
export const MIN_WEIGH_IN_SPAN_DAYS = 14;

/** The page shows the strongest few, never a wall of weak claims. */
export const MAX_INSIGHTS = 4;

/* --------------------------------- input --------------------------------- */

export interface WholeLifeInput {
  /** Local day key, "YYYY-MM-DD". */
  today: string;
  moodEntries: readonly MoodEntry[];
  trackerDays: readonly DayEntry[];
  habitLogs: readonly HabitLog[];
  foodEntries: readonly LogEntry[];
  weighIns: readonly WeighIn[];
}

/* ------------------------------ daily series ----------------------------- */

/**
 * One calendar day of the record, every signal the pairs read. A field
 * is null when that signal was not logged that day — missing, not zero.
 * The exceptions are counts and flags whose absence IS the value:
 * habit ticks (no log row that day = no ticks recorded) and foodLogged.
 */
export interface DayPoint {
  date: string;
  /** Per-day mean of that day's check-ins (a series mean — the shared
   *  entry-weighted "average mood" in lib/stats is a different statistic
   *  and stays the headline definition elsewhere). */
  mood: number | null;
  /** Tracker energy, 1–5. */
  energy: number | null;
  /** Sleep logged that morning — the night that ended that day — in hours. */
  sleepHours: number | null;
  movementMinutes: number | null;
  screenMinutes: number | null;
  habitTicks: number;
  foodLogged: boolean;
  /** Summed kcal of the day's food entries, when any were logged. */
  foodKcal: number | null;
  weightKg: number | null;
}

const mean = (xs: readonly number[]): number | null =>
  xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

function stdDev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs)!;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
}

export const windowStart = (today: string): string =>
  shiftDay(today, -(WHOLE_LIFE_WINDOW_DAYS - 1));

const inWindow = (day: string, start: string, today: string) =>
  day >= start && day <= today;

/** The daily series over the window, ascending by date. */
export function buildDailySeries(input: WholeLifeInput): DayPoint[] {
  const start = windowStart(input.today);
  const byDay = new Map<string, DayPoint>();
  const point = (date: string): DayPoint => {
    let p = byDay.get(date);
    if (!p) {
      p = {
        date,
        mood: null,
        energy: null,
        sleepHours: null,
        movementMinutes: null,
        screenMinutes: null,
        habitTicks: 0,
        foodLogged: false,
        foodKcal: null,
        weightKg: null,
      };
      byDay.set(date, p);
    }
    return p;
  };

  /* Mood — grouped per local day, averaged within the day. */
  const moodByDay = new Map<string, number[]>();
  for (const e of input.moodEntries) {
    const day = localDay(e.timestamp);
    if (!inWindow(day, start, input.today)) continue;
    const list = moodByDay.get(day) ?? [];
    list.push(e.mood);
    moodByDay.set(day, list);
  }
  for (const [day, values] of moodByDay) point(day).mood = mean(values);

  /* Trackers — the core's own value projection, so a "sleep day" here
     is a sleep day everywhere. */
  for (const day of input.trackerDays) {
    if (!inWindow(day.date, start, input.today)) continue;
    const p = point(day.date);
    const sleep = valueOf(day, "sleep");
    if (sleep !== null) p.sleepHours = sleep / 60;
    p.movementMinutes = valueOf(day, "movement");
    p.screenMinutes = valueOf(day, "screen");
    p.energy = valueOf(day, "energy");
  }

  /* Habits — ticks are completions; a day with no rows recorded none. */
  for (const l of input.habitLogs) {
    if (!inWindow(l.date, start, input.today)) continue;
    point(l.date).habitTicks += 1;
  }

  /* Food — a day is "logged" when it carries at least one entry; its
     kcal is the entries' own stored totals, summed. */
  for (const e of input.foodEntries) {
    if (!inWindow(e.day, start, input.today)) continue;
    const p = point(e.day);
    p.foodLogged = true;
    p.foodKcal = (p.foodKcal ?? 0) + e.nutrients.kcal;
  }

  /* Weight — the day's weigh-in, when one was recorded. */
  for (const w of input.weighIns) {
    if (!inWindow(w.date, start, input.today)) continue;
    point(w.date).weightKg = w.kg;
  }

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/* --------------------------------- output -------------------------------- */

export type WholeLifeInsightKind =
  | "sleep-mood"
  | "sleep-energy"
  | "habits-mood"
  | "movement-mood"
  | "movement-energy"
  | "screen-mood"
  | "food-mood"
  | "weight-trend";

export interface WholeLifeInsight {
  kind: WholeLifeInsightKind;
  /** Associative headline — "tends to", never a cause. */
  headline: string;
  /** The two group averages behind the headline, in plain words. */
  detail: string;
  /**
   * The same two group averages as structured figures — one row per
   * compared group: the group's plain name (with its driver average)
   * and the outcome average it carried. The Today card renders these
   * rows instead of the prose `detail`, so the numbers stand as data
   * rather than inside a sentence (diagnosis §G); both forms are built
   * from the same GroupComparison, so they can never disagree.
   */
  figures: { label: string; value: string }[];
  /** Paired days (or weigh-ins, for the weight trend) behind this. */
  sampleDays: number;
  windowDays: number;
  /** Signed standardised difference; sign = direction, magnitude = rank. */
  strength: number;
}

/** A pair that exists in the record but has not earned a sentence yet. */
export interface WholeLifePending {
  kind: WholeLifeInsightKind;
  /** "Sleep & mood" — the pair's plain name. */
  label: string;
  sampleDays: number;
  neededDays: number;
}

export interface WholeLifeCoverage {
  moodDays: number;
  sleepDays: number;
  habitDays: number;
  foodDays: number;
  weighInDays: number;
}

export interface WholeLifeResult {
  windowDays: number;
  insights: WholeLifeInsight[];
  pending: WholeLifePending[];
  coverage: WholeLifeCoverage;
}

/* ------------------------------ pair machinery ---------------------------- */

interface PairedDay {
  driver: number;
  outcome: number;
}

interface GroupComparison {
  lowerMean: number;
  upperMean: number;
  lowerDriverMean: number;
  upperDriverMean: number;
  lowerCount: number;
  upperCount: number;
  /** Standardised difference, (upper − lower) / SD(outcome). */
  d: number;
}

/**
 * Rank-split grouped comparison: sort by driver (date breaks ties, so
 * the split is deterministic), lower half vs upper half. Returns null
 * when the pair cannot honestly be compared — too few days, a group
 * too small, a driver that never varies, or an outcome that never
 * moves.
 */
function compareGroups(pairs: readonly PairedDay[]): GroupComparison | null {
  if (pairs.length < MIN_PAIRED_DAYS) return null;
  const outcomes = pairs.map((p) => p.outcome);
  const sd = stdDev(outcomes);
  if (sd === 0) return null;
  const drivers = pairs.map((p) => p.driver);
  if (stdDev(drivers) === 0) return null;

  const sorted = [...pairs].sort((a, b) => a.driver - b.driver);
  const half = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, half);
  const upper = sorted.slice(half);
  if (lower.length < MIN_GROUP_DAYS || upper.length < MIN_GROUP_DAYS) return null;

  const lowerMean = mean(lower.map((p) => p.outcome))!;
  const upperMean = mean(upper.map((p) => p.outcome))!;
  return {
    lowerMean,
    upperMean,
    lowerDriverMean: mean(lower.map((p) => p.driver))!,
    upperDriverMean: mean(upper.map((p) => p.driver))!,
    lowerCount: lower.length,
    upperCount: upper.length,
    d: (upperMean - lowerMean) / sd,
  };
}

/** The same comparison for a binary driver: its natural two groups. */
function compareBinary(
  yes: readonly number[],
  no: readonly number[],
): GroupComparison | null {
  if (yes.length + no.length < MIN_PAIRED_DAYS) return null;
  if (yes.length < MIN_GROUP_DAYS || no.length < MIN_GROUP_DAYS) return null;
  const sd = stdDev([...yes, ...no]);
  if (sd === 0) return null;
  const yesMean = mean(yes)!;
  const noMean = mean(no)!;
  return {
    lowerMean: noMean,
    upperMean: yesMean,
    lowerDriverMean: 0,
    upperDriverMean: 1,
    lowerCount: no.length,
    upperCount: yes.length,
    d: (yesMean - noMean) / sd,
  };
}

/* ------------------------------- formatting ------------------------------ */

const fmt1 = (v: number): string => (Math.round(v * 10) / 10).toString();

const fmtHours = (minutes: number): string =>
  minutes < 90
    ? `${Math.round(minutes)} minutes`
    : `${fmt1(minutes / 60)} hours`;

const fmtDuration = (minutes: number): string =>
  minutes < 60 ? `${Math.round(minutes)} minutes` : fmtHours(minutes);

/* --------------------------------- pairs --------------------------------- */

interface PairDef {
  kind: WholeLifeInsightKind;
  label: string;
  /** Driver value for a day, or null when that side wasn't logged. */
  driver: (p: DayPoint) => number | null;
  outcome: (p: DayPoint) => number | null;
  headline: (higher: boolean) => string;
  detail: (c: GroupComparison) => string;
  /** The comparison as two figure rows — upper group first, matching
   *  the order `detail` states them in. */
  figures: (c: GroupComparison) => { label: string; value: string }[];
}

const moodText = (v: number) => `${fmt1(v)}/10`;
const energyText = (v: number) => `${fmt1(v)} of 5`;

const PAIRS: PairDef[] = [
  {
    kind: "sleep-mood",
    label: "Sleep & mood",
    driver: (p) => p.sleepHours,
    outcome: (p) => p.mood,
    headline: (higher) =>
      higher
        ? "Mood tends to run higher after longer sleep"
        : "Mood tends to run lower after longer sleep",
    detail: (c) =>
      `After longer nights (about ${fmt1(c.upperDriverMean)} hours), your mood averaged ${moodText(c.upperMean)}. After shorter nights (about ${fmt1(c.lowerDriverMean)} hours), it averaged ${moodText(c.lowerMean)}.`,
    figures: (c) => [
      {
        label: `Longer nights · about ${fmt1(c.upperDriverMean)} hours`,
        value: `Mood ${moodText(c.upperMean)}`,
      },
      {
        label: `Shorter nights · about ${fmt1(c.lowerDriverMean)} hours`,
        value: `Mood ${moodText(c.lowerMean)}`,
      },
    ],
  },
  {
    kind: "sleep-energy",
    label: "Sleep & energy",
    driver: (p) => p.sleepHours,
    outcome: (p) => p.energy,
    headline: (higher) =>
      higher
        ? "Energy tends to run higher after longer sleep"
        : "Energy tends to run lower after longer sleep",
    detail: (c) =>
      `After longer nights (about ${fmt1(c.upperDriverMean)} hours), your energy averaged ${energyText(c.upperMean)}. After shorter nights (about ${fmt1(c.lowerDriverMean)} hours), it averaged ${energyText(c.lowerMean)}.`,
    figures: (c) => [
      {
        label: `Longer nights · about ${fmt1(c.upperDriverMean)} hours`,
        value: `Energy ${energyText(c.upperMean)}`,
      },
      {
        label: `Shorter nights · about ${fmt1(c.lowerDriverMean)} hours`,
        value: `Energy ${energyText(c.lowerMean)}`,
      },
    ],
  },
  {
    kind: "habits-mood",
    label: "Habit ticks & mood",
    driver: (p) => p.habitTicks,
    outcome: (p) => p.mood,
    headline: (higher) =>
      higher
        ? "Mood tends to run higher on days you tick more habits"
        : "Mood tends to run lower on days you tick more habits",
    detail: (c) =>
      `On days you ticked more habits (about ${fmt1(c.upperDriverMean)} a day), your mood averaged ${moodText(c.upperMean)}. On days you ticked fewer (about ${fmt1(c.lowerDriverMean)} a day), it averaged ${moodText(c.lowerMean)}.`,
    figures: (c) => [
      {
        label: `More habit ticks · about ${fmt1(c.upperDriverMean)} a day`,
        value: `Mood ${moodText(c.upperMean)}`,
      },
      {
        label: `Fewer habit ticks · about ${fmt1(c.lowerDriverMean)} a day`,
        value: `Mood ${moodText(c.lowerMean)}`,
      },
    ],
  },
  {
    kind: "movement-mood",
    label: "Movement & mood",
    driver: (p) => p.movementMinutes,
    outcome: (p) => p.mood,
    headline: (higher) =>
      higher
        ? "Mood tends to run higher on days you move more"
        : "Mood tends to run lower on days you move more",
    detail: (c) =>
      `On days you moved more (about ${fmtDuration(c.upperDriverMean)}), your mood averaged ${moodText(c.upperMean)}. On days you moved less (about ${fmtDuration(c.lowerDriverMean)}), it averaged ${moodText(c.lowerMean)}.`,
    figures: (c) => [
      {
        label: `Moved more · about ${fmtDuration(c.upperDriverMean)}`,
        value: `Mood ${moodText(c.upperMean)}`,
      },
      {
        label: `Moved less · about ${fmtDuration(c.lowerDriverMean)}`,
        value: `Mood ${moodText(c.lowerMean)}`,
      },
    ],
  },
  {
    kind: "movement-energy",
    label: "Movement & energy",
    driver: (p) => p.movementMinutes,
    outcome: (p) => p.energy,
    headline: (higher) =>
      higher
        ? "Energy tends to run higher on days you move more"
        : "Energy tends to run lower on days you move more",
    detail: (c) =>
      `On days you moved more (about ${fmtDuration(c.upperDriverMean)}), your energy averaged ${energyText(c.upperMean)}. On days you moved less (about ${fmtDuration(c.lowerDriverMean)}), it averaged ${energyText(c.lowerMean)}.`,
    figures: (c) => [
      {
        label: `Moved more · about ${fmtDuration(c.upperDriverMean)}`,
        value: `Energy ${energyText(c.upperMean)}`,
      },
      {
        label: `Moved less · about ${fmtDuration(c.lowerDriverMean)}`,
        value: `Energy ${energyText(c.lowerMean)}`,
      },
    ],
  },
  {
    kind: "screen-mood",
    label: "Screen time & mood",
    driver: (p) => p.screenMinutes,
    outcome: (p) => p.mood,
    headline: (higher) =>
      higher
        ? "Mood tends to run higher on days with more screen time"
        : "Mood tends to run lower on days with more screen time",
    detail: (c) =>
      `On days with more screen time (about ${fmtHours(c.upperDriverMean)}), your mood averaged ${moodText(c.upperMean)}. On days with less (about ${fmtHours(c.lowerDriverMean)}), it averaged ${moodText(c.lowerMean)}.`,
    figures: (c) => [
      {
        label: `More screen time · about ${fmtHours(c.upperDriverMean)}`,
        value: `Mood ${moodText(c.upperMean)}`,
      },
      {
        label: `Less screen time · about ${fmtHours(c.lowerDriverMean)}`,
        value: `Mood ${moodText(c.lowerMean)}`,
      },
    ],
  },
];

/* ------------------------------- weight trend ---------------------------- */

/**
 * The weight description: earlier half of the window's weigh-ins vs the
 * later half, spoken only past its own bar (count, span, and a shift
 * that is more than scale noise). Not an association — a description,
 * worded as one.
 */
function weightInsight(input: WholeLifeInput): WholeLifeInsight | null {
  const start = windowStart(input.today);
  const ins = input.weighIns
    .filter((w) => inWindow(w.date, start, input.today))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (ins.length < MIN_WEIGH_INS) return null;
  const first = ins[0]!;
  const last = ins[ins.length - 1]!;
  if (shiftDay(first.date, MIN_WEIGH_IN_SPAN_DAYS) > last.date) return null;

  const half = Math.floor(ins.length / 2);
  const earlier = ins.slice(0, half);
  const later = ins.slice(half);
  const earlierMean = mean(earlier.map((w) => w.kg))!;
  const laterMean = mean(later.map((w) => w.kg))!;
  const shift = laterMean - earlierMean;
  if (Math.abs(shift) < MIN_WEIGHT_SHIFT_KG) return null;
  const sd = stdDev(ins.map((w) => w.kg));
  if (sd === 0) return null;

  return {
    kind: "weight-trend",
    headline:
      shift < 0
        ? "Your weight has been drifting down over recent weeks"
        : "Your weight has been drifting up over recent weeks",
    detail: `Across ${ins.length} weigh-ins, your weight averaged ${fmt1(earlierMean)} kg in the earlier half of the window and ${fmt1(laterMean)} kg in the later half.`,
    figures: [
      { label: "Earlier half", value: `${fmt1(earlierMean)} kg` },
      { label: "Later half", value: `${fmt1(laterMean)} kg` },
    ],
    sampleDays: ins.length,
    windowDays: WHOLE_LIFE_WINDOW_DAYS,
    strength: Math.round((shift / sd) * 100) / 100,
  };
}

/* --------------------------------- engine -------------------------------- */

export function buildWholeLifeInsights(input: WholeLifeInput): WholeLifeResult {
  const series = buildDailySeries(input);
  const insights: WholeLifeInsight[] = [];
  const pending: WholeLifePending[] = [];

  for (const def of PAIRS) {
    const pairs: PairedDay[] = [];
    for (const p of series) {
      const driver = def.driver(p);
      const outcome = def.outcome(p);
      if (driver !== null && outcome !== null) pairs.push({ driver, outcome });
    }
    if (pairs.length < MIN_PAIRED_DAYS) {
      if (pairs.length > 0) {
        pending.push({
          kind: def.kind,
          label: def.label,
          sampleDays: pairs.length,
          neededDays: MIN_PAIRED_DAYS,
        });
      }
      continue;
    }
    const comparison = compareGroups(pairs);
    if (comparison === null || Math.abs(comparison.d) < MIN_EFFECT) continue;
    insights.push({
      kind: def.kind,
      headline: def.headline(comparison.d > 0),
      detail: def.detail(comparison),
      figures: def.figures(comparison),
      sampleDays: pairs.length,
      windowDays: WHOLE_LIFE_WINDOW_DAYS,
      strength: Math.round(comparison.d * 100) / 100,
    });
  }

  /* Food & mood — the binary pair: days food was logged vs days it
     wasn't, among days mood was logged at all. */
  const moodDays = series.filter((p) => p.mood !== null);
  const foodYes = moodDays.filter((p) => p.foodLogged).map((p) => p.mood!);
  const foodNo = moodDays.filter((p) => !p.foodLogged).map((p) => p.mood!);
  const foodTotal = foodYes.length + foodNo.length;
  if (foodTotal < MIN_PAIRED_DAYS) {
    if (foodTotal > 0) {
      pending.push({
        kind: "food-mood",
        label: "Food logging & mood",
        sampleDays: foodTotal,
        neededDays: MIN_PAIRED_DAYS,
      });
    }
  } else {
    const comparison = compareBinary(foodYes, foodNo);
    if (comparison !== null && Math.abs(comparison.d) >= MIN_EFFECT) {
      insights.push({
        kind: "food-mood",
        headline:
          comparison.d > 0
            ? "Mood tends to run higher on days you log your food"
            : "Mood tends to run lower on days you log your food",
        detail: `On the ${comparison.upperCount} days you logged food, your mood averaged ${moodText(comparison.upperMean)}. On the ${comparison.lowerCount} days you didn't, it averaged ${moodText(comparison.lowerMean)}.`,
        figures: [
          {
            label: `Days you logged food · ${comparison.upperCount} ${comparison.upperCount === 1 ? "day" : "days"}`,
            value: `Mood ${moodText(comparison.upperMean)}`,
          },
          {
            label: `Days you didn't · ${comparison.lowerCount} ${comparison.lowerCount === 1 ? "day" : "days"}`,
            value: `Mood ${moodText(comparison.lowerMean)}`,
          },
        ],
        sampleDays: foodTotal,
        windowDays: WHOLE_LIFE_WINDOW_DAYS,
        strength: Math.round(comparison.d * 100) / 100,
      });
    }
  }

  const weight = weightInsight(input);
  if (weight) insights.push(weight);

  insights.sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength));

  return {
    windowDays: WHOLE_LIFE_WINDOW_DAYS,
    insights: insights.slice(0, MAX_INSIGHTS),
    pending,
    coverage: {
      moodDays: series.filter((p) => p.mood !== null).length,
      sleepDays: series.filter((p) => p.sleepHours !== null).length,
      habitDays: series.filter((p) => p.habitTicks > 0).length,
      foodDays: series.filter((p) => p.foodLogged).length,
      weighInDays: series.filter((p) => p.weightKg !== null).length,
    },
  };
}
