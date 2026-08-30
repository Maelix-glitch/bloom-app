/**
 * Bloom — Cycle Intelligence (pure core).
 *
 * This file is the whole "intelligence" layer and nothing else: no React, no
 * DOM, no storage, no network, no `Date.now()`. It takes a list of logged
 * periods and a "today" key, and returns predictions, confidence, phase and
 * plain-language flags.
 *
 * Because it is pure and dependency-free it can be lifted into any frontend,
 * a Cloudflare Worker, a Supabase edge function or a test harness unchanged.
 *
 * All day arithmetic runs on local calendar keys (YYYY-MM-DD) converted to UTC
 * epochs, so a DST shift can never move a logged day.
 */

/* --------------------------------- model --------------------------------- */

export type FlowLevel = "light" | "medium" | "heavy";

/** What the user logs. `start` is the only required field. */
export interface PeriodLog {
  id: string;
  /** First day of bleeding — local calendar day, YYYY-MM-DD. */
  start: string;
  /** Optional last day of bleeding, inclusive. */
  end?: string | null | undefined;
  flow?: FlowLevel | null | undefined;
  notes?: string | null | undefined;
}

export type Phase = "menstrual" | "follicular" | "ovulation" | "luteal" | "late";
export type Confidence = "none" | "low" | "medium" | "high";

export const PHASE_LABEL: Record<Phase, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulation",
  luteal: "Luteal",
  late: "Past predicted date",
};

export const FLOW_LABEL: Record<FlowLevel, string> = {
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
};

/* ------------------------------ date helpers ----------------------------- */

const DAY_MS = 86_400_000;
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, "0");

/** True for a real calendar day in YYYY-MM-DD form (rejects 2025-02-31). */
export function isValidDateKey(key: unknown): key is string {
  if (typeof key !== "string" || !KEY_RE.test(key)) return false;
  const [y, m, d] = key.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** YYYY-MM-DD → UTC midnight epoch for that calendar day. */
export function parseDateKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, days: number): string {
  const dt = new Date(parseDateKey(key) + days * DAY_MS);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function diffDays(from: string, to: string): number {
  return Math.round((parseDateKey(to) - parseDateKey(from)) / DAY_MS);
}

/** Today's local calendar key. Kept out of the pure functions on purpose. */
export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function formatDate(key: string, locale?: string): string {
  if (!isValidDateKey(key)) return "—";
  const dt = new Date(parseDateKey(key));
  return dt.toLocaleDateString(locale ?? undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateShort(key: string, locale?: string): string {
  if (!isValidDateKey(key)) return "—";
  const dt = new Date(parseDateKey(key));
  return dt.toLocaleDateString(locale ?? undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/* -------------------------------- options -------------------------------- */

export interface AnalyzeOptions {
  /** Gaps shorter than this are treated as duplicates / typos, not cycles. */
  minPlausible?: number;
  /** Gaps longer than this are treated as a missed log, not one long cycle. */
  maxPlausible?: number;
  /** How many of the most recent plausible cycles feed the average. */
  recentWindow?: number;
  /** Used until there is at least one plausible cycle. */
  fallbackLength?: number;
  /** Standard luteal-phase assumption, counted back from the next period. */
  lutealLength?: number;
  fertileBefore?: number;
  fertileAfter?: number;
  /** Days past the prediction before we call a period "late". */
  lateAfterDays?: number;
  /** Std-dev (days) above which we stop calling the pattern steady. */
  moderateVariability?: number;
  /** Std-dev (days) at or below which the pattern counts as steady. */
  lowVariability?: number;
  /** Minimum shift (days) before a lengthening/shortening trend is reported. */
  trendThreshold?: number;
  /** Assumed bleed length when nothing has been logged. */
  defaultPeriodLength?: number;
}

const DEFAULTS = {
  minPlausible: 15,
  maxPlausible: 45,
  recentWindow: 6,
  fallbackLength: 28,
  lutealLength: 14,
  fertileBefore: 5,
  fertileAfter: 1,
  lateAfterDays: 3,
  moderateVariability: 7,
  lowVariability: 3,
  trendThreshold: 3,
  defaultPeriodLength: 5,
} as const;

/* -------------------------------- results -------------------------------- */

/** One consecutive pair of logged starts — the raw cycle-length history. */
export interface CycleGap {
  /** 1-based cycle number, oldest cycle first. */
  index: number;
  fromId: string;
  toId: string;
  fromStart: string;
  toStart: string;
  days: number;
  plausible: boolean;
  /** Why the gap was excluded (null when it was used). */
  reason: string | null;
  /** Midpoint guess at the period that went unlogged. Long gaps only. */
  suggestedMissedDate: string | null;
}

export type FlagKind = "generic" | "anomaly" | "late" | "variability" | "trend" | "building";

export type FlagTone = "calm" | "info" | "attention";

export interface InsightFlag {
  id: string;
  kind: FlagKind;
  tone: FlagTone;
  title: string;
  body: string;
  /** Optional one-click fix — e.g. "add the period you probably missed". */
  action?: { label: string; start: string } | undefined;
}

export interface Tip {
  title: string;
  body: string;
}

export interface CycleAnalysis {
  /** Echoed back so callers can assert against a known "today". */
  today: string;
  entryCount: number;
  /** Chronological copy of the input — never the caller's array. */
  logs: PeriodLog[];
  gaps: CycleGap[];
  /** Plausible gap lengths, oldest → newest. */
  cycleLengths: number[];
  /** Recency-weighted average, in days (unrounded in `averageLengthRaw`). */
  averageLength: number;
  averageLengthRaw: number;
  /** True when no plausible cycle exists yet and the 28-day fallback is used. */
  isGeneric: boolean;
  /** Population standard deviation of the plausible cycle lengths. */
  variability: number;
  confidence: Confidence;
  /** Plain-language reason for the confidence level. Always show it. */
  confidenceReason: string;

  lastStart: string | null;
  /** 1-based day of the current cycle; null before anything is logged. */
  cycleDay: number | null;
  /** Logged or estimated bleed length in days. */
  periodLength: number;
  periodLengthIsLogged: boolean;

  phase: Phase | null;
  phaseLabel: string;

  /** lastStart + weighted average. Null with no entries. */
  nextStart: string | null;
  /** Positive = days until; negative = days late. */
  daysUntilNext: number | null;
  isLate: boolean;
  lateBy: number;

  ovulationDate: string | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  /** Day-of-cycle number of the ovulation estimate, for the phase map. */
  ovulationDay: number | null;

  trend: { direction: "lengthening" | "shortening"; days: number } | null;
  irregular: boolean;
  flags: InsightFlag[];
  tips: Tip[];
}

/* --------------------------------- maths --------------------------------- */

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population standard deviation — the list *is* the whole history. */
export function stdDev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

/**
 * Recency-weighted average: the newest cycle carries the most weight, the
 * oldest cycle in the window the least. Someone's most recent pattern
 * predicts their next cycle better than one from a year ago.
 */
export function weightedAverage(
  lengths: readonly number[],
  windowSize: number,
): { value: number; used: number[] } {
  const used = lengths.slice(-Math.max(1, windowSize));
  if (used.length === 0) return { value: 0, used: [] };
  let num = 0;
  let den = 0;
  used.forEach((len, i) => {
    const weight = i + 1; // oldest in window = 1 … newest = n
    num += len * weight;
    den += weight;
  });
  return { value: num / den, used };
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/* --------------------------------- tips ---------------------------------- */

/**
 * General wellness framing only — never medical advice, never diagnostic.
 */
export const PHASE_TIPS: Record<Phase, Tip[]> = {
  menstrual: [
    {
      title: "Replace what you lose",
      body: "Bleeding draws on iron. Lentils, leafy greens, tofu, eggs or red meat — paired with something rich in vitamin C (citrus, peppers, tomatoes) to help your body absorb it.",
    },
    {
      title: "Gentle movement beats total rest",
      body: "A walk, easy yoga or light mobility work often settles cramps better than lying still. Heat is a real tool too: a hot water bottle or warm bath for 10–15 minutes.",
    },
    {
      title: "Lowering the bar is allowed",
      body: "You don't need to hit your usual numbers this week. Treating these days as recovery — not as failure — tends to serve the rest of the month better.",
    },
    {
      title: "Note what actually helped",
      body: "If a tip, meal or walk made today easier, jot it in the notes field on your entry. Future-you reads those.",
    },
  ],
  follicular: [
    {
      title: "Energy often climbs here",
      body: "Rising oestrogen is associated with more usable energy for many people. If your month has a hard session, a difficult conversation or an avoided project, this is usually the easier week to put it in.",
    },
    {
      title: "Protein-forward meals",
      body: "Appetite tends to be steadier in this phase. Front-loading protein at breakfast is a low-effort way to keep it that way.",
    },
    {
      title: "Start things",
      body: "New routines stick more easily when you begin them in a week that already feels capable. This is that week for a lot of people.",
    },
  ],
  ovulation: [
    {
      title: "A short peak, if you notice it at all",
      body: "Some people feel a brief lift in energy, confidence or libido around ovulation. Some feel nothing. Both are completely normal.",
    },
    {
      title: "Water, and watchful tracking",
      body: "Cervical mucus changes and a small temperature shift are typical around here. Drink water, and know that neither sign is reliable on its own.",
    },
    {
      title: "Most fertile window",
      body: "This is the stretch of the cycle when pregnancy is most likely — relevant whether you're trying to conceive or trying to avoid it. A calendar estimate is not contraception.",
    },
  ],
  luteal: [
    {
      title: "A dip is chemistry, not character",
      body: "Progesterone rises and then falls across the back half of the cycle. Lower mood, lower patience and tiredness are common here — hormonal, not a willpower problem.",
    },
    {
      title: "Magnesium-rich foods",
      body: "Pumpkin seeds, nuts, oats, dark chocolate and leafy greens. Many people find these help with cramps, sleep and the second-half cravings.",
    },
    {
      title: "Consistency over intensity",
      body: "Steady, moderate movement — walking, strength work at a slightly lower load — usually beats either grinding through or stopping entirely.",
    },
    {
      title: "Cravings aren't a failure",
      body: "Hunger and cravings often rise here for real metabolic reasons. Planning for them beats fighting them.",
    },
  ],
  late: [
    {
      title: "First: this is common",
      body: "A period arriving later than predicted happens to most people at some point. One late cycle is rarely a signal of anything serious on its own.",
    },
    {
      title: "Ordinary reasons it happens",
      body: "Stress, travel or shifted sleep, being ill, a meaningful change in weight or exercise, and some medications can all push a cycle later. None of these are diagnoses.",
    },
    {
      title: "When it's worth asking someone",
      body: "If being this late is unusual for you, or it keeps happening, a doctor or nurse is the right person to ask. Nothing on this page can tell you why.",
    },
    {
      title: "Keep logging either way",
      body: "When it does arrive, log the first day — that single entry makes the next prediction better than any amount of waiting.",
    },
  ],
};

/* --------------------------------- analysis -------------------------------- */

/**
 * Turn a list of logged periods into predictions, confidence, phase and flags.
 * Pure: same input → same output, no side effects, input never mutated.
 */
export function analyzeCycle(
  logs: readonly PeriodLog[],
  today: string,
  options: AnalyzeOptions = {},
): CycleAnalysis {
  const o = { ...DEFAULTS, ...options };

  const usable = logs.filter((l) => l && typeof l.start === "string");
  const sorted = [...usable].sort(
    (a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id),
  );

  /* --- gaps: the raw cycle-length history -------------------------------- */
  const gaps: CycleGap[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (!prev || !cur) continue;
    const days = diffDays(prev.start, cur.start);
    const plausible = days >= o.minPlausible && days <= o.maxPlausible;
    let reason: string | null = null;
    if (days < o.minPlausible) {
      reason = `${days} ${plural(days, "day", "days")} apart — too short for a cycle. Usually a duplicate or a mistyped date rather than a real cycle.`;
    } else if (days > o.maxPlausible) {
      reason = `${days} days apart — longer than a plausible cycle. Almost always a period that went unlogged, not one long cycle.`;
    }
    gaps.push({
      index: i,
      fromId: prev.id,
      toId: cur.id,
      fromStart: prev.start,
      toStart: cur.start,
      days,
      plausible,
      reason,
      suggestedMissedDate: days > o.maxPlausible ? addDays(prev.start, Math.round(days / 2)) : null,
    });
  }

  const cycleLengths = gaps.filter((g) => g.plausible).map((g) => g.days);
  const isGeneric = cycleLengths.length === 0;
  const { value: weightedRaw } = weightedAverage(cycleLengths, o.recentWindow);
  const averageLengthRaw = isGeneric ? o.fallbackLength : weightedRaw;
  const cycleLength = Math.round(averageLengthRaw);
  const variability = stdDev(cycleLengths);

  /* --- confidence -------------------------------------------------------- */
  let confidence: Confidence;
  let confidenceReason: string;
  if (sorted.length === 0) {
    confidence = "none";
    confidenceReason = "Nothing logged yet, so there is nothing to be confident about.";
  } else if (isGeneric) {
    confidence = "none";
    confidenceReason = `Not personalised — the ${o.fallbackLength}-day figure below is a population average, not your pattern.`;
  } else if (cycleLengths.length < 3 || variability > o.moderateVariability) {
    confidence = "low";
    confidenceReason =
      cycleLengths.length < 3
        ? `Only ${cycleLengths.length} usable ${plural(cycleLengths.length, "cycle", "cycles")} so far — treat the dates as a rough guide.`
        : `Your cycle lengths vary by about ±${variability.toFixed(1)} days, which makes precise dates unlikely.`;
  } else if (cycleLengths.length >= 4 && variability <= o.lowVariability) {
    confidence = "high";
    confidenceReason = `Built from ${cycleLengths.length} steady cycles that vary by only ±${variability.toFixed(1)} days.`;
  } else {
    confidence = "medium";
    confidenceReason = `Built from ${cycleLengths.length} cycles that vary by about ±${variability.toFixed(1)} days.`;
  }

  /* --- anchors ----------------------------------------------------------- */
  const last = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const lastStart = last ? last.start : null;
  const cycleDay = lastStart ? diffDays(lastStart, today) + 1 : null;

  /* --- bleed length: logged first, then averaged history, then default --- */
  const loggedDurations = sorted
    .map((l) => (l.end && isValidDateKey(l.end) ? diffDays(l.start, l.end) + 1 : null))
    .filter((d): d is number => d !== null && d > 0 && d <= 15);
  const lastDuration =
    last?.end && isValidDateKey(last.end) ? diffDays(last.start, last.end) + 1 : null;
  const periodLength =
    lastDuration ??
    (loggedDurations.length > 0 ? Math.round(mean(loggedDurations)) : o.defaultPeriodLength);
  const periodLengthIsLogged = lastDuration !== null;

  /* --- predictions ------------------------------------------------------- */
  const nextStart = lastStart ? addDays(lastStart, cycleLength) : null;
  const daysUntilNext = nextStart ? diffDays(today, nextStart) : null;
  const lateBy = daysUntilNext !== null && daysUntilNext < 0 ? Math.abs(daysUntilNext) : 0;
  const isLate = lateBy >= o.lateAfterDays;

  // Ovulation is counted *backwards* from the next period: the luteal phase
  // (ovulation → bleed) is the steadier half, the follicular half is what
  // actually stretches and shrinks.
  const ovulationDate = nextStart ? addDays(nextStart, -o.lutealLength) : null;
  const fertileStart = ovulationDate ? addDays(ovulationDate, -o.fertileBefore) : null;
  const fertileEnd = ovulationDate ? addDays(ovulationDate, o.fertileAfter) : null;
  const ovulationDay = Math.max(1, cycleLength - o.lutealLength);

  /* --- current phase ----------------------------------------------------- */
  let phase: Phase | null = null;
  if (cycleDay !== null && cycleDay > 0 && lastStart) {
    if (cycleDay > cycleLength) {
      phase = "late";
    } else if (cycleDay <= periodLength) {
      phase = "menstrual";
    } else if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1) {
      phase = "ovulation";
    } else if (cycleDay < ovulationDay) {
      phase = "follicular";
    } else {
      phase = "luteal";
    }
  } else if (cycleDay !== null) {
    // A period logged with a future start date — show it as upcoming bleeding.
    phase = "menstrual";
  }

  /* --- trend: earliest half vs most recent half -------------------------- */
  let trend: CycleAnalysis["trend"] = null;
  const half = Math.floor(cycleLengths.length / 2);
  if (cycleLengths.length >= 4 && half >= 2) {
    const earlyAvg = mean(cycleLengths.slice(0, half));
    const recentAvg = mean(cycleLengths.slice(cycleLengths.length - half));
    const delta = recentAvg - earlyAvg;
    if (Math.abs(delta) >= o.trendThreshold) {
      trend = {
        direction: delta > 0 ? "lengthening" : "shortening",
        days: Math.round(Math.abs(delta)),
      };
    }
  }

  const irregular = cycleLengths.length >= 3 && variability > o.moderateVariability;

  /* --- flags (the loopholes, each with its own message) ------------------ */
  const flags: InsightFlag[] = [];

  if (sorted.length === 0) {
    // Edge case 1 — the page hides predictions entirely and prompts instead.
  } else if (isGeneric) {
    // Edge case 2 — one entry, or none of the gaps are usable.
    flags.push({
      id: "generic",
      kind: "generic",
      tone: "info",
      title: "This is a placeholder, not your pattern",
      body: `With ${sorted.length === 1 ? "one period logged" : "no usable cycle length yet"}, the ${o.fallbackLength}-day figure below is the population average — a starting point, not something derived from your body. Log one more period and it becomes yours.`,
    });
  } else if (cycleLengths.length < 3) {
    flags.push({
      id: "building",
      kind: "building",
      tone: "calm",
      title: `${cycleLengths.length} usable ${plural(cycleLengths.length, "cycle", "cycles")} in — still a rough guide`,
      body: "Predictions get noticeably steadier after three or four logged cycles. Until then the dates below are a direction, not a promise.",
    });
  }

  // Edge case 3 — implausible gaps, kept visible with a suggested fix.
  const anomalies = gaps.filter((g) => !g.plausible);
  for (const g of anomalies.slice(-3)) {
    flags.push({
      id: `anomaly-${g.toId}`,
      kind: "anomaly",
      tone: "attention",
      title: `A ${g.days}-day gap in your record`,
      body: g.suggestedMissedDate
        ? `Between ${formatDate(g.fromStart)} and ${formatDate(g.toStart)} there are ${g.days} days. That's almost always a period that went unlogged rather than one long cycle, so this gap is left out of your average. If you bled around ${formatDate(g.suggestedMissedDate)}, add it — the average corrects itself the moment you do.${
            g.days > o.maxPlausible * 2
              ? " A gap this long probably hides more than one period, so keep adding any you remember; each one sharpens the picture."
              : ""
          }`
        : `Between ${formatDate(g.fromStart)} and ${formatDate(g.toStart)} there are only ${g.days} days. That's usually a duplicate or a mistyped date, so it's left out of your average. Check the two entries and correct whichever is wrong.`,
      action: g.suggestedMissedDate
        ? { label: `Add ${formatDateShort(g.suggestedMissedDate)}`, start: g.suggestedMissedDate }
        : undefined,
    });
  }

  // Edge case 5 — meaningfully past the predicted start.
  if (isLate && lateBy > 0) {
    flags.push({
      id: "late",
      kind: "late",
      tone: "attention",
      title: `Your period is ${lateBy} ${plural(lateBy, "day", "days")} later than predicted`,
      body: "Late periods are very common and usually have ordinary explanations: stress, travel or shifted sleep, being ill, a big change in weight or exercise, or some medications. Nothing here can diagnose anything. If being this late is unusual for you, or it becomes a pattern, that's worth raising with a doctor or nurse.",
    });
  }

  // Edge case 6 — high variability across a real history.
  if (irregular) {
    flags.push({
      id: "variability",
      kind: "variability",
      tone: "attention",
      title: "Your cycle lengths move around a fair bit",
      body: `Across ${cycleLengths.length} cycles your lengths range roughly ±${variability.toFixed(1)} days from the average. Irregular cycles are common and have many ordinary causes — stress, sleep, weight change, coming off hormonal contraception, perimenopause, PCOS or thyroid conditions among them. Worth a conversation with a clinician if the pattern is persistent or a change from your own norm, not because a chart flagged it.`,
    });
  }

  // Edge case 7 — a detected trend.
  if (trend) {
    flags.push({
      id: "trend",
      kind: "trend",
      tone: "info",
      title:
        trend.direction === "lengthening"
          ? `Your cycles have been getting longer`
          : `Your cycles have been getting shorter`,
      body:
        trend.direction === "lengthening"
          ? `Comparing the earlier half of your record with the recent half, your cycles are running about ${trend.days} ${plural(trend.days, "day", "days")} longer. Worth noticing, not worrying about — patterns drift over time and this recalculates from whatever you log.`
          : `Comparing the earlier half of your record with the recent half, your cycles are running about ${trend.days} ${plural(trend.days, "day", "days")} shorter. Worth noticing, not worrying about — patterns drift over time and this recalculates from whatever you log.`,
    });
  }

  const tips = phase ? PHASE_TIPS[phase] : [];

  return {
    today,
    entryCount: sorted.length,
    logs: sorted,
    gaps,
    cycleLengths,
    averageLength: Math.round(averageLengthRaw * 10) / 10,
    averageLengthRaw,
    isGeneric,
    variability: Math.round(variability * 10) / 10,
    confidence,
    confidenceReason,
    lastStart,
    cycleDay,
    periodLength,
    periodLengthIsLogged,
    phase,
    phaseLabel: phase ? PHASE_LABEL[phase] : "Unknown",
    nextStart,
    daysUntilNext,
    isLate,
    lateBy,
    ovulationDate,
    fertileStart,
    fertileEnd,
    ovulationDay: lastStart ? ovulationDay : null,
    trend,
    irregular,
    flags,
    tips,
  };
}

/* ------------------------------- validation ------------------------------ */

export interface LogDraft {
  start: string;
  end?: string | null;
  flow?: FlowLevel | null;
  notes?: string | null;
}

export type FieldErrors = Partial<Record<"start" | "end" | "notes", string>>;

/**
 * Entry-time validation. Bad data is rejected here so it can never reach the
 * averaging logic: duplicates, backwards dates, impossible dates, future dates.
 */
export function validateLogDraft(
  draft: LogDraft,
  existing: readonly PeriodLog[],
  today: string = todayKey(),
  editingId?: string | null,
): FieldErrors {
  const errors: FieldErrors = {};
  const others = existing.filter((e) => e.id !== editingId);

  const start = draft.start?.trim() ?? "";
  if (start === "") {
    errors.start =
      "Add the first day of your period — it's the one date every prediction hangs on.";
  } else if (!isValidDateKey(start)) {
    errors.start =
      "That date isn't one the calendar recognises. Use the date picker, or type YYYY-MM-DD.";
  } else if (diffDays(today, start) > 0) {
    errors.start =
      "That date is in the future. Log a period that has already started, or use today.";
  } else if (diffDays(start, today) > 730) {
    errors.start =
      "That's more than two years back. It's allowed, but check the year — a typo here skews every average.";
  } else if (others.some((e) => e.start === start)) {
    errors.start = `You already have a period starting ${formatDate(start)}. Edit that entry instead of adding a second one.`;
  } else {
    const overlap = others.find((e) => {
      const endKey = e.end && isValidDateKey(e.end) ? e.end : e.start;
      return start >= e.start && start <= endKey;
    });
    if (overlap) {
      const span =
        overlap.end && isValidDateKey(overlap.end) && overlap.end !== overlap.start
          ? `${formatDateShort(overlap.start)} – ${formatDateShort(overlap.end)}`
          : formatDateShort(overlap.start);
      errors.start = `That date falls inside the period you already logged for ${span}. Pick the day bleeding actually began, or edit that entry.`;
    }
  }

  const end = draft.end?.trim() ?? "";
  if (end !== "") {
    if (!isValidDateKey(end)) {
      errors.end = "Use the date picker or type YYYY-MM-DD.";
    } else if (start !== "" && isValidDateKey(start) && diffDays(start, end) < 0) {
      errors.end = `The end date is before the start date (${formatDateShort(start)}). Swap them, or clear the end date — it's optional.`;
    } else if (diffDays(today, end) > 0) {
      errors.end = "The end date is in the future. Leave it blank until the bleeding stops.";
    } else if (start !== "" && isValidDateKey(start) && diffDays(start, end) > 14) {
      errors.end =
        "That's longer than 15 days of bleeding. Check the date, or leave the end date blank and we'll estimate it.";
    }
  }

  const notes = draft.notes ?? "";
  if (notes.length > 400) {
    errors.notes = "Notes are capped at 400 characters so your record stays readable.";
  }

  return errors;
}

/* --------------------------------- misc ---------------------------------- */

export function newLogId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `p-${Math.random().toString(36).slice(2, 10)}`;
  return rand;
}

/** "in 12 days" / "3 days late" / "today" — plain language, no false certainty. */
export function describeCountdown(daysUntilNext: number | null): string {
  if (daysUntilNext === null) return "—";
  if (daysUntilNext === 0) return "due today";
  if (daysUntilNext > 0) return `in ${daysUntilNext} ${plural(daysUntilNext, "day", "days")}`;
  const late = Math.abs(daysUntilNext);
  return `${late} ${plural(late, "day", "days")} late`;
}
