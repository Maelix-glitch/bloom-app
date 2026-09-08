/**
 * reconcile — the check-ins that keep a period record honest.
 *
 * A cycle is different for every body, so nothing here is a wall. The engine
 * reads the period entries and the daily log together, notices where the two
 * disagree with each other (or with the person's own average), and turns each
 * disagreement into ONE plain question with a small set of answers:
 *
 *   "Bleeding stopped on day 4 — did your period end early?"   Yes · No, it's continuing · Not now
 *   "You logged bleeding the day after your period ended — did it continue?"
 *   "Bleeding on 12 Sep — the same period, or a new one?"
 *   "Your period was due 4 days ago — has it started?"
 *
 * Every answer maps to a concrete edit of the record (`CheckInResolution`) that
 * the hook applies; "Not now" just parks the question. Answers are remembered
 * per (question, entry, day) so the same thing is never asked twice, and a
 * question disappears by itself the moment the record stops needing it.
 *
 * Pure: no storage, no clock — `today` is passed in, like `analyzeCycle`.
 */

import {
  addDays,
  analyzeCycle,
  CYCLE_DEFAULTS,
  diffDays,
  formatDate,
  formatDateShort,
  isValidDateKey,
  LONG_BLEED_DAYS,
  type CycleAnalysis,
  type FlowLevel,
  type PeriodLog,
} from "./predict";
import type { DayLog } from "./dayLogs";

/* --------------------------------- types --------------------------------- */

export type CheckInKind =
  | "future-start" // the latest entry is dated after today — an import or a wrong clock
  | "start-day" // "no bleeding" logged on the very day the period is said to start
  | "ended-early" // bleeding stopped before the recorded / usual length
  | "continued" // bleeding logged after the recorded last day
  | "same-period" // a bleed day sits right after a period, not a new one
  | "new-period" // bleeding logged well after the last period, no start recorded
  | "still-open" // an open period has run past its usual length with no news
  | "long-bleed" // many bleeding days in a row — recorded, gently noted
  | "late" // predicted start has passed
  | "missed-log"; // an implausibly long gap that probably hides a period

export type CheckInTone = "calm" | "info" | "attention";

export type CheckInResolution =
  | { type: "set-end"; periodId: string; end: string }
  /** Move a period's first day (its end, if any, is kept when still valid). */
  | { type: "set-start"; periodId: string; start: string }
  /** Remove the entry outright — for a start that never happened. */
  | { type: "remove-period"; periodId: string }
  | { type: "add-period"; start: string; end: string | null; flow: FlowLevel | null }
  | { type: "focus-form"; date: string; startPeriod: boolean }
  | { type: "edit-period"; periodId: string }
  /** "It really was that long": raise this person's plausible-cycle ceiling. */
  | { type: "accept-long-cycles"; days: number }
  /** "I'm not expecting a period": pause predictions and late logic until they say. */
  | { type: "pause-tracking" }
  | { type: "dismiss" }
  | { type: "snooze" };

export interface CheckInAction {
  id: string;
  label: string;
  /** What applying this answer does to the record. */
  resolution: CheckInResolution;
  /** Rendered as the primary button. */
  primary?: boolean;
}

export interface CheckIn {
  /** Stable across days for the same situation — used to remember answers. */
  id: string;
  kind: CheckInKind;
  tone: CheckInTone;
  title: string;
  body: string;
  actions: CheckInAction[];
  /** The entry this is about, when there is one. */
  periodId: string | null;
  /** The date this is about, when there is one. */
  date: string | null;
}

/** What the person already said. Persisted by the hook, read here. */
export interface CheckInMemory {
  /** id → YYYY-MM-DD the answer was given. Dismissed = never ask this exact thing again. */
  dismissed: Record<string, string>;
  /** id → YYYY-MM-DD until which the question is parked. */
  snoozed: Record<string, string>;
}

export const EMPTY_MEMORY: CheckInMemory = { dismissed: {}, snoozed: {} };

export interface ReconcileOptions {
  /** How many days a "Not now" parks a question. */
  snoozeDays?: number;
  /** An open period this many days past its usual length asks to be closed. */
  openGraceDays?: number;
  /**
   * …and stops asking this many days past it. Beyond that the period is
   * plainly over; the estimate assumes the usual length and the question
   * would only be noise.
   */
  openAskUntilDays?: number;
  /** Days past the predicted start before we ask "has it started?". */
  lateAfterDays?: number;
  /** A bleed day this many days (or fewer) after a period counts as the same one. */
  samePeriodWithinDays?: number;
  /** The longest run we ever propose folding into a single period. */
  maxBleedDays?: number;
}

const DEFAULTS: Required<ReconcileOptions> = {
  snoozeDays: 2,
  openGraceDays: 2,
  openAskUntilDays: 10,
  lateAfterDays: CYCLE_DEFAULTS.lateAfterDays,
  samePeriodWithinDays: 3,
  maxBleedDays: 14,
};

export const SNOOZE_DAYS = DEFAULTS.snoozeDays;

/* -------------------------------- helpers -------------------------------- */

/** Light, medium or heavy. Spotting is deliberately NOT a period day. */
export const isBleed = (day: DayLog | null | undefined): day is DayLog & { flow: FlowLevel } =>
  !!day && (day.flow === "light" || day.flow === "medium" || day.flow === "heavy");

const isNoBleed = (day: DayLog | null | undefined): boolean => !!day && day.flow === "none";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function sortedLogs(logs: readonly PeriodLog[]): PeriodLog[] {
  return logs
    .filter((l) => l && isValidDateKey(l.start))
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
}

function dayMap(days: readonly DayLog[]): Map<string, DayLog> {
  const m = new Map<string, DayLog>();
  for (const d of days) if (d && isValidDateKey(d.date)) m.set(d.date, d);
  return m;
}

/** The last day of `period` as recorded, or null when it's still open. */
export function recordedEnd(period: PeriodLog): string | null {
  return period.end && isValidDateKey(period.end) && period.end >= period.start ? period.end : null;
}

/**
 * Usual bleed length for this person: the average of the ends they logged,
 * then the default. Mirrors `analyzeCycle` so the two never disagree.
 */
export function usualBleedLength(analysis: CycleAnalysis): number {
  const avg = analysis.stats.averageBleed;
  if (avg && avg > 0) return Math.max(1, Math.round(avg));
  return CYCLE_DEFAULTS.defaultPeriodLength;
}

/** Strongest flow across a run of days — what a whole period gets recorded as. */
export function strongestFlow(days: readonly (DayLog | undefined)[]): FlowLevel | null {
  const rank: Record<FlowLevel, number> = { light: 1, medium: 2, heavy: 3 };
  let best: FlowLevel | null = null;
  for (const d of days) {
    if (!isBleed(d)) continue;
    if (!best || rank[d.flow] > rank[best]) best = d.flow;
  }
  return best;
}

/**
 * The bleeding days that belong to a period starting `start`: forward from
 * there while the daily log keeps saying "bleeding", tolerating `tolerance`
 * quiet days in between (a light day that wasn't logged). Oldest → newest.
 */
export function bleedRunFrom(
  start: string,
  byDate: Map<string, DayLog>,
  today: string,
  tolerance = 1,
  cap = 40,
): DayLog[] {
  const run: DayLog[] = [];
  let silent = 0;
  for (let i = 0; i < cap; i += 1) {
    const key = addDays(start, i);
    if (key > today) break;
    const day = byDate.get(key);
    if (isBleed(day)) {
      run.push(day);
      silent = 0;
    } else if (run.length > 0) {
      silent += 1;
      if (silent > tolerance) break;
    } else if (i >= 2) {
      /* nothing logged on the first days — the run never started */
      break;
    }
  }
  return run;
}

/* -------------------------------- memory --------------------------------- */

export function isRemembered(memory: CheckInMemory, id: string, today: string): boolean {
  if (memory.dismissed[id]) return true;
  const until = memory.snoozed[id];
  return !!until && until >= today;
}

export function remember(
  memory: CheckInMemory,
  id: string,
  how: "dismiss" | "snooze",
  today: string,
  snoozeDays = DEFAULTS.snoozeDays,
): CheckInMemory {
  if (how === "dismiss") {
    const { [id]: _gone, ...snoozed } = memory.snoozed;
    return { dismissed: { ...memory.dismissed, [id]: today }, snoozed };
  }
  return { ...memory, snoozed: { ...memory.snoozed, [id]: addDays(today, snoozeDays) } };
}

/** Forget answers about entries that no longer exist, so storage can't grow forever. */
export function pruneMemory(
  memory: CheckInMemory,
  logs: readonly PeriodLog[],
  today: string,
): CheckInMemory {
  const ids = new Set(logs.map((l) => l.id));
  const keep = (id: string) => {
    const owner = id.split(":")[1];
    if (!owner) return true;
    return isValidDateKey(owner) ? diffDays(owner, today) <= 400 : ids.has(owner);
  };
  const dismissed: Record<string, string> = {};
  for (const [id, at] of Object.entries(memory.dismissed)) if (keep(id)) dismissed[id] = at;
  const snoozed: Record<string, string> = {};
  for (const [id, until] of Object.entries(memory.snoozed)) {
    if (keep(id) && until >= today) snoozed[id] = until;
  }
  return { dismissed, snoozed };
}

/* -------------------------------- the engine ------------------------------ */

export interface ReconcileInput {
  logs: readonly PeriodLog[];
  days: readonly DayLog[];
  today: string;
  analysis?: CycleAnalysis;
  memory?: CheckInMemory;
  options?: ReconcileOptions;
}

const ORDER: Record<CheckInKind, number> = {
  "future-start": -2,
  "start-day": -1,
  "same-period": 0,
  continued: 1,
  "ended-early": 2,
  "new-period": 3,
  late: 4,
  "still-open": 5,
  "long-bleed": 6,
  "missed-log": 7,
};

/**
 * Every check-in the record currently calls for, most pressing first. Already
 * answered ones are filtered out; the page shows the first one or two.
 */
export function reconcile(input: ReconcileInput): CheckIn[] {
  const o = { ...DEFAULTS, ...(input.options ?? {}) };
  const today = input.today;
  const logs = sortedLogs(input.logs);
  const byDate = dayMap(input.days);
  const analysis = input.analysis ?? analyzeCycle(logs, today);
  const memory = input.memory ?? EMPTY_MEMORY;
  const out: CheckIn[] = [];
  const usual = usualBleedLength(analysis);
  const ask = (c: CheckIn) => {
    if (!isRemembered(memory, c.id, today)) out.push(c);
  };

  const last = logs.length > 0 ? logs[logs.length - 1]! : null;

  /* ------------------------------------------------------------------ */
  /* 0 · a start that can't be right                                     */
  /* ------------------------------------------------------------------ */
  if (last && last.start > today) {
    /* dated AFTER today — an import or a device clock that was wrong. Nothing
       about "now" follows from it; ask, and offer today or removal. */
    const lastBleedBeforeToday = (() => {
      for (let i = 0; i <= 14; i += 1) {
        const key = addDays(today, -i);
        if (isBleed(byDate.get(key))) return key;
      }
      return null;
    })();
    ask({
      id: `future-start:${last.id}:${last.start}`,
      kind: "future-start",
      tone: "attention",
      periodId: last.id,
      date: last.start,
      title: `A period is logged as starting ${formatDateShort(last.start)} — that's in the future`,
      body: `Bloom can't place today in a cycle that hasn't started. This usually comes from an import or a device whose clock was wrong. Move the start to the right day, or remove the entry.`,
      actions: [
        ...(lastBleedBeforeToday
          ? [
              {
                id: "move-bleed",
                label: `It started ${formatDateShort(lastBleedBeforeToday)}`,
                primary: true,
                resolution: {
                  type: "set-start" as const,
                  periodId: last.id,
                  start: lastBleedBeforeToday,
                },
              },
            ]
          : []),
        {
          id: "move-today",
          label: "It started today",
          ...(lastBleedBeforeToday ? {} : { primary: true }),
          resolution: { type: "set-start", periodId: last.id, start: today },
        },
        {
          id: "edit",
          label: "Pick the date",
          resolution: { type: "edit-period", periodId: last.id },
        },
        {
          id: "remove",
          label: "Remove it",
          resolution: { type: "remove-period", periodId: last.id },
        },
        { id: "later", label: "Not now", resolution: { type: "snooze" } },
      ],
    });
    /* the rest of the engine reasons about "today inside this period" and
       would only add noise on top of a start that isn't real yet */
    return out.sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  }

  /* ------------------------------------------------------------------ */
  /* 1 · the most recent period — the one still being lived              */
  /* ------------------------------------------------------------------ */
  if (last) {
    const end = recordedEnd(last);
    const recordedLength = end ? diffDays(last.start, end) + 1 : null;
    const run = bleedRunFrom(last.start, byDate, today);
    const lastBleed = run.length > 0 ? run[run.length - 1]!.date : null;
    const dayOfPeriod = diffDays(last.start, today) + 1; // 1-based

    /* a0) START DAY — "no bleeding" logged on the very day the period is said
           to begin. The start is probably off by a day or two: point at the
           first bleed day that follows, or the day the person can pick. */
    if (isNoBleed(byDate.get(last.start))) {
      let firstBleed: string | null = null;
      for (let i = 1; i <= 3; i += 1) {
        const key = addDays(last.start, i);
        if (key > today) break;
        if (isBleed(byDate.get(key))) {
          firstBleed = key;
          break;
        }
      }
      ask({
        id: `start-day:${last.id}:${last.start}`,
        kind: "start-day",
        tone: "info",
        periodId: last.id,
        date: last.start,
        title: `Did your period really start on ${formatDateShort(last.start)}?`,
        body: `That day is logged as no bleeding${
          firstBleed
            ? `, and the first bleeding after it is ${formatDate(firstBleed)}. If that's the real first day, the start can move there`
            : ""
        }. Nothing changes until you say so.`,
        actions: [
          ...(firstBleed
            ? [
                {
                  id: "move",
                  label: `It started ${formatDateShort(firstBleed)}`,
                  primary: true,
                  resolution: { type: "set-start" as const, periodId: last.id, start: firstBleed },
                },
              ]
            : []),
          {
            id: "edit",
            label: firstBleed ? "Pick another day" : "Pick the right day",
            ...(firstBleed ? {} : { primary: true }),
            resolution: { type: "edit-period", periodId: last.id },
          },
          { id: "keep", label: "The date is right", resolution: { type: "dismiss" } },
          { id: "later", label: "Not now", resolution: { type: "snooze" } },
        ],
      });
    }

    /* a) ENDED (EARLY) — the daily log says "no bleeding" on a day the entry
          still covers (recorded last day, or the usual length while open).
          Ask instead of assuming. */
    if (dayOfPeriod >= 2) {
      const span = recordedLength ?? usual;
      let firstNone: string | null = null;
      for (let i = 1; i < span; i += 1) {
        const key = addDays(last.start, i);
        if (key > today) break;
        if (isNoBleed(byDate.get(key))) {
          firstNone = key;
          break;
        }
      }
      if (firstNone) {
        /* a bleed logged AFTER the quiet day means the record contradicts
           itself — the same-period / continued questions handle that better */
        let bleedAfter = false;
        for (let i = diffDays(last.start, firstNone) + 1; i < span + 2; i += 1) {
          const key = addDays(last.start, i);
          if (key > today) break;
          if (isBleed(byDate.get(key))) bleedAfter = true;
        }
        const proposedEnd = addDays(firstNone, -1);
        const stoppedOnDay = diffDays(last.start, proposedEnd) + 1;
        if (!bleedAfter && end !== proposedEnd && stoppedOnDay >= 1) {
          const early = stoppedOnDay < span;
          ask({
            id: `ended-early:${last.id}:${proposedEnd}`,
            kind: "ended-early",
            tone: "info",
            periodId: last.id,
            date: proposedEnd,
            title: early
              ? `Bleeding stopped on day ${stoppedOnDay} — did your period end early?`
              : `Bleeding stopped on day ${stoppedOnDay} — has your period ended?`,
            body: `You logged no bleeding on ${formatDate(firstNone)}. ${
              end
                ? `You had the last day down as ${formatDateShort(end)}.`
                : `Your periods usually run about ${usual} ${plural(usual, "day", "days")}.`
            } Nothing changes until you say so.`,
            actions: [
              {
                id: "yes",
                label: `Yes — it ended ${formatDateShort(proposedEnd)}`,
                primary: true,
                resolution: { type: "set-end", periodId: last.id, end: proposedEnd },
              },
              { id: "no", label: "No, it's continuing", resolution: { type: "dismiss" } },
              { id: "later", label: "Not now", resolution: { type: "snooze" } },
            ],
          });
        }
      }
    }

    /* b) CONTINUED — bleeding logged shortly after the recorded last day. */
    if (end) {
      let found: string | null = null;
      for (let i = 1; i <= o.samePeriodWithinDays; i += 1) {
        const key = addDays(end, i);
        if (key > today) break;
        if (isBleed(byDate.get(key))) {
          found = key;
          break;
        }
      }
      if (found) {
        const tail = bleedRunFrom(found, byDate, today);
        const newEnd = tail.length > 0 ? tail[tail.length - 1]!.date : found;
        const length = diffDays(last.start, newEnd) + 1;
        const gapDays = diffDays(end, found);
        if (length <= o.maxBleedDays * 2) {
          ask({
            id: `continued:${last.id}:${newEnd}`,
            kind: "continued",
            tone: "info",
            periodId: last.id,
            date: found,
            title:
              gapDays === 1
                ? "You logged bleeding the day after your period ended — did it continue?"
                : `Bleeding again ${gapDays} days after your period ended — was it the same one?`,
            body: `The period that started ${formatDate(last.start)} is recorded as ending ${formatDate(end)}, but ${formatDate(found)} has bleeding logged. If it carried on, the last day moves to ${formatDate(newEnd)}.`,
            actions: [
              {
                id: "yes",
                label: `Yes — it ran to ${formatDateShort(newEnd)}`,
                primary: true,
                resolution: { type: "set-end", periodId: last.id, end: newEnd },
              },
              { id: "spotting", label: "No — that was spotting", resolution: { type: "dismiss" } },
              {
                id: "new",
                label: "No — a new period started",
                resolution: { type: "focus-form", date: found, startPeriod: true },
              },
              { id: "later", label: "Not now", resolution: { type: "snooze" } },
            ],
          });
        }
      }
    }

    /* c) STILL OPEN — no last day, and today is well past the usual length
          with nothing in the daily log to settle it. Asked inside a window:
          past the grace days, but not weeks later when the answer is obvious
          and the question would only be noise. */
    if (
      !end &&
      dayOfPeriod > usual + o.openGraceDays &&
      dayOfPeriod <= usual + o.openAskUntilDays
    ) {
      const guess = lastBleed ?? addDays(last.start, usual - 1);
      const since = lastBleed ? diffDays(lastBleed, today) : null;
      ask({
        id: `still-open:${last.id}`,
        kind: "still-open",
        tone: "calm",
        periodId: last.id,
        date: guess,
        title: `Day ${dayOfPeriod} since your period started — has it finished?`,
        body: `You haven't logged a last day yet. Your periods usually run about ${usual} ${plural(usual, "day", "days")}${
          lastBleed
            ? `, and the last bleeding you logged was ${formatDate(lastBleed)}${
                since && since > 0 ? ` (${since} ${plural(since, "day", "days")} ago)` : ""
              }`
            : ""
        }. Recording the last day sharpens the bleed-length estimate; leaving it blank is fine too.`,
        actions: [
          {
            id: "yes",
            label: `Yes — it ended ${formatDateShort(guess)}`,
            primary: true,
            resolution: { type: "set-end", periodId: last.id, end: guess },
          },
          {
            id: "pick",
            label: "Pick the last day",
            resolution: { type: "edit-period", periodId: last.id },
          },
          { id: "no", label: "Still going", resolution: { type: "snooze" } },
          { id: "never", label: "Don't ask about this one", resolution: { type: "dismiss" } },
        ],
      });
    }

    /* d) LONG BLEED — the daily log keeps saying bleeding long past usual.
          Not a diagnosis; a note that it's recorded, and a gentle pointer. */
    if (run.length > LONG_BLEED_DAYS && lastBleed && diffDays(lastBleed, today) <= 1) {
      ask({
        id: `long-bleed:${last.id}`,
        kind: "long-bleed",
        tone: "attention",
        periodId: last.id,
        date: lastBleed,
        title: `${run.length} days of bleeding logged so far`,
        body: "That's longer than most periods. Bloom records it exactly as you logged it — it can't tell you why. If bleeds this long are new for you, or it's heavy throughout, that's worth raising with a doctor or nurse.",
        actions: [{ id: "ok", label: "Understood", resolution: { type: "dismiss" } }],
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* 2 · bleeding in the daily log that no period explains               */
  /* ------------------------------------------------------------------ */
  {
    const coveredBy = (date: string): PeriodLog | null => {
      for (const l of logs) {
        const end = recordedEnd(l) ?? addDays(l.start, usual - 1);
        if (date >= l.start && date <= end) return l;
      }
      return null;
    };
    const bleedDates = input.days
      .filter((d) => isBleed(d) && isValidDateKey(d.date) && d.date <= today)
      .map((d) => d.date)
      .sort();

    /* group into runs (a quiet day or two doesn't split a period) */
    const runs: string[][] = [];
    for (const date of bleedDates) {
      const current = runs[runs.length - 1];
      const prev = current?.[current.length - 1];
      if (current && prev && diffDays(prev, date) <= 2) current.push(date);
      else runs.push([date]);
    }

    for (const run of runs.slice(-3)) {
      const first = run[0]!;
      const lastDay = run[run.length - 1]!;
      if (coveredBy(first)) continue;
      const before = logs.filter((l) => l.start <= first).slice(-1)[0] ?? null;
      const after = logs.find((l) => l.start > first) ?? null;
      const sinceStart = before ? diffDays(before.start, first) : null;
      const beforeEnd = before ? (recordedEnd(before) ?? addDays(before.start, usual - 1)) : null;
      const sinceEnd = beforeEnd ? diffDays(beforeEnd, first) : null;
      const flow = strongestFlow(run.map((d) => byDate.get(d)));

      /* a) SAME PERIOD — right on the heels of the previous entry.
            (When that entry is the latest one AND has a recorded end, 1b
            already asked the sharper "did it continue?" question.) */
      if (before && sinceEnd !== null && sinceEnd >= 1 && sinceEnd <= o.samePeriodWithinDays) {
        if (before.id === last?.id && recordedEnd(before)) continue;
        const length = diffDays(before.start, lastDay) + 1;
        if (length <= o.maxBleedDays * 2) {
          ask({
            id: `same-period:${before.id}:${first}`,
            kind: "same-period",
            tone: "info",
            periodId: before.id,
            date: first,
            title: `Bleeding on ${formatDateShort(first)} — the same period, or a new one?`,
            body: `It's ${sinceStart} ${plural(sinceStart ?? 0, "day", "days")} after the period that started ${formatDate(before.start)}. Bleeding this close together is usually one period with a quiet day in it, not two — so it isn't counted as a new cycle unless you say so.`,
            actions: [
              {
                id: "same",
                label: `Same period — ends ${formatDateShort(lastDay)}`,
                primary: true,
                resolution: { type: "set-end", periodId: before.id, end: lastDay },
              },
              {
                id: "new",
                label: "A new period started",
                resolution: {
                  type: "add-period",
                  start: first,
                  end: run.length > 1 ? lastDay : null,
                  flow,
                },
              },
              { id: "spotting", label: "Just spotting", resolution: { type: "dismiss" } },
              { id: "later", label: "Not now", resolution: { type: "snooze" } },
            ],
          });
        }
        continue;
      }

      /* b) NEW PERIOD — far enough from the entries around it to be its own
            cycle, but nobody ticked "first day of a period". */
      const minPlausible = CYCLE_DEFAULTS.minPlausible;
      const plausibleNew =
        (!before || (sinceStart !== null && sinceStart >= minPlausible)) &&
        (!after || diffDays(first, after.start) >= minPlausible);
      if (plausibleNew) {
        ask({
          id: `new-period:${first}`,
          kind: "new-period",
          tone: "attention",
          periodId: null,
          date: first,
          title: `Bleeding logged from ${formatDateShort(first)} — was that a period starting?`,
          body: `${run.length === 1 ? "That day has" : `${run.length} days in a row have`} bleeding in your daily log, but no period starts there. Predictions only use period starts, so until this is logged as one your cycle count won't move.`,
          actions: [
            {
              id: "yes",
              label: `Yes — period started ${formatDateShort(first)}`,
              primary: true,
              resolution: {
                type: "add-period",
                start: first,
                end: run.length > 1 && lastDay < today ? lastDay : null,
                flow,
              },
            },
            { id: "spotting", label: "No — spotting", resolution: { type: "dismiss" } },
            { id: "later", label: "Not now", resolution: { type: "snooze" } },
          ],
        });
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* 3 · time passing without a word                                     */
  /* ------------------------------------------------------------------ */
  const askedAboutNewPeriod = out.some((c) => c.kind === "new-period");
  if (last && analysis.nextStart && analysis.daysUntilNext !== null) {
    const lateBy = -analysis.daysUntilNext;
    /* `analysis.isLate` already knows the difference between a personal
       average and the population fallback (never late against a guess) and
       widens the margin while the estimate is rough. A bleed the daily log
       already holds is a better question than this one, so it goes first. */
    if (analysis.isLate && lateBy > 0 && !askedAboutNewPeriod) {
      /* a bleed already in the daily log is the best guess for the first day */
      const floor = recordedEnd(last) ?? last.start;
      const suggested =
        input.days
          .filter((d) => isBleed(d) && d.date > floor && d.date <= today)
          .map((d) => d.date)
          .sort()[0] ?? null;
      ask({
        id: `late:${last.id}:${analysis.nextStart}`,
        kind: "late",
        tone: "attention",
        periodId: last.id,
        date: suggested,
        title:
          analysis.confidence === "low"
            ? `Your period was roughly expected ${lateBy} ${plural(lateBy, "day", "days")} ago — has it started?`
            : `Your period was due ${lateBy} ${plural(lateBy, "day", "days")} ago — has it started?`,
        body: `${
          analysis.confidence === "low"
            ? `Estimated around ${formatDate(analysis.nextStart)} from a short or uneven record, so a week either side is normal.`
            : `Predicted for ${formatDate(analysis.nextStart)} from your own average.`
        } Late periods are very common — stress, travel, illness, sleep, weight or exercise changes, some medications. If it has started, log the first day and everything recalculates; if not, Bloom simply keeps counting.`,
        actions: [
          {
            id: "yes",
            label: suggested
              ? `Yes — it started ${formatDateShort(suggested)}`
              : "Yes — log the first day",
            primary: true,
            resolution: { type: "focus-form", date: suggested ?? today, startPeriod: true },
          },
          { id: "no", label: "Not yet", resolution: { type: "snooze" } },
          { id: "never", label: "Don't ask this cycle", resolution: { type: "dismiss" } },
          {
            id: "not-expecting",
            label: "I'm not expecting a period",
            resolution: { type: "pause-tracking" },
          },
        ],
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* 4 · a gap in the history that probably hides a period               */
  /* ------------------------------------------------------------------ */
  const longGap = analysis.gaps.filter((g) => !g.plausible && g.suggestedMissedDate).slice(-1)[0];
  /* while periods aren't expected, a long gap is the point, not a puzzle */
  if (analysis.expecting && longGap && longGap.suggestedMissedDate) {
    ask({
      id: `missed-log:${longGap.toId}:${longGap.fromStart}`,
      kind: "missed-log",
      tone: "calm",
      periodId: longGap.toId,
      date: longGap.suggestedMissedDate,
      title: `${longGap.days} days between two starts — was a period missed?`,
      body: `Between ${formatDate(longGap.fromStart)} and ${formatDate(longGap.toStart)} is longer than a plausible cycle, so it's left out of your average rather than skewing it. If you remember roughly when you bled, add it — even an approximate date helps.`,
      actions: [
        {
          id: "add",
          label: `Add one around ${formatDateShort(longGap.suggestedMissedDate)}`,
          primary: true,
          resolution: {
            type: "focus-form",
            date: longGap.suggestedMissedDate,
            startPeriod: true,
          },
        },
        /* Up to the hard ceiling the person can vouch for it themselves;
           beyond that (months without a log) it really is a missed stretch,
           and the honest answer is just to stop asking. */
        longGap.days <= CYCLE_DEFAULTS.hardMaxPlausible
          ? {
              id: "none",
              label: "No — it really was that long",
              resolution: { type: "accept-long-cycles", days: longGap.days },
            }
          : { id: "none", label: "No — nothing to add", resolution: { type: "dismiss" } },
        { id: "later", label: "Not now", resolution: { type: "snooze" } },
      ],
    });
  }

  /* One situation, one card: once the record is past due and a still-open
     question is on the table for the same period, the late question is the
     one that matters. */
  const hasLate = out.some((c) => c.kind === "late" || c.kind === "new-period");
  const deduped = hasLate ? out.filter((c) => c.kind !== "still-open") : out;

  return deduped.sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
}

/* ------------------------------ form guidance ----------------------------- */

export type BleedContext =
  | { kind: "none" }
  | { kind: "inside"; period: PeriodLog; dayOfPeriod: number }
  | { kind: "adjacent"; period: PeriodLog; daysAfterEnd: number; dayOfPeriod: number }
  | { kind: "soon-after"; period: PeriodLog; daysSinceStart: number }
  | { kind: "new"; daysSinceStart: number | null };

/**
 * What a bleed logged on `date` most likely means, given the record. The form
 * uses this to decide whether "first day of a period" should be pre-ticked —
 * it is pre-ticked ONLY when the day plausibly starts a new cycle.
 */
export function classifyBleedDay(
  date: string,
  logs: readonly PeriodLog[],
  analysis: CycleAnalysis,
  options: { samePeriodWithinDays?: number; minPlausible?: number } = {},
): BleedContext {
  if (!isValidDateKey(date)) return { kind: "none" };
  const within = options.samePeriodWithinDays ?? DEFAULTS.samePeriodWithinDays;
  const minPlausible = options.minPlausible ?? CYCLE_DEFAULTS.minPlausible;
  const usual = usualBleedLength(analysis);
  const sorted = sortedLogs(logs);
  const before = sorted.filter((l) => l.start <= date).slice(-1)[0] ?? null;
  if (!before) return { kind: "new", daysSinceStart: null };
  if (before.start === date) return { kind: "inside", period: before, dayOfPeriod: 1 };

  const daysSinceStart = diffDays(before.start, date);
  const coveredEnd = recordedEnd(before) ?? addDays(before.start, usual - 1);
  if (date <= coveredEnd) {
    return { kind: "inside", period: before, dayOfPeriod: daysSinceStart + 1 };
  }
  const daysAfterEnd = diffDays(coveredEnd, date);
  if (daysAfterEnd <= within) {
    return { kind: "adjacent", period: before, daysAfterEnd, dayOfPeriod: daysSinceStart + 1 };
  }
  if (daysSinceStart < minPlausible) {
    return { kind: "soon-after", period: before, daysSinceStart };
  }
  return { kind: "new", daysSinceStart };
}
