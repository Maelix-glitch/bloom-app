/**
 * Transformation Programmes — enrolments and the progress engine.
 *
 * Storage is one versioned prefs key, `health.programmes.v1`,
 * holding every run the person has started (newest first). Because
 * the value lives in the shared preferences document it inherits
 * sync, export (`loadDoc()` wholesale) and erasure (device wipe +
 * `erase_my_data()` on `user_prefs`) by construction — the pattern
 * the Assessment history and the target adjustment set. No new
 * table, no per-key wiring anywhere.
 *
 * Enrolment rules (all pure transitions, all pinned by tests):
 *   · one ACTIVE run at a time — enrolling while one is live
 *     writes nothing;
 *   · quitting keeps the run in history, marked quit, with its
 *     end date;
 *   · restarting is a NEW run record — runs are never merged or
 *     resumed, so a run's weeks always mean one continuous arc;
 *   · a run whose weeks have all passed reads as completed —
 *     derived from the calendar, never a stored flag someone
 *     could set early.
 *
 * The progress engine is honest by construction: it counts only
 * the day keys the caller hands it from the person's real records
 * (food log, habit logs, weigh-ins, plan-log). A week with no
 * records at all reads "no_record" — never zero-filled success,
 * never failure theatre: the summary reports met / missed /
 * no-record weeks as three separate counts, exactly as they are.
 */

import { clearPref, getPref, setPref } from "@/lib/prefs";
import { shiftDay } from "@/lib/localDay";
import {
  programmeById,
  type ProgrammeDefinition,
  type ProgrammeTarget,
  type ProgrammeTargetKind,
} from "./definitions";

export const PROGRAMMES_KEY = "health.programmes.v1";
export const PROGRAMMES_VERSION = 1;
/** At most this many runs are kept (active + history). */
export const PROGRAMMES_RUN_CAP = 20;

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/* ---------------------------------- runs ---------------------------------- */

export interface ProgrammeRun {
  id: string;
  programmeId: string;
  /** Local day key the run started on. */
  startedOn: string;
  status: "active" | "quit";
  /** Local day key the run was quit on; null while active. */
  endedOn: string | null;
}

export interface ProgrammesValue {
  version: typeof PROGRAMMES_VERSION;
  /** Newest first. */
  runs: ProgrammeRun[];
}

export const EMPTY_PROGRAMMES_VALUE: ProgrammesValue = {
  version: PROGRAMMES_VERSION,
  runs: [],
};

function parseRun(raw: unknown): ProgrammeRun | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r["id"] !== "string" || r["id"].length === 0) return null;
  if (typeof r["programmeId"] !== "string" || !programmeById(r["programmeId"])) return null;
  if (typeof r["startedOn"] !== "string" || !DAY_KEY.test(r["startedOn"])) return null;
  if (r["status"] !== "active" && r["status"] !== "quit") return null;
  const endedOn =
    typeof r["endedOn"] === "string" && DAY_KEY.test(r["endedOn"]) ? r["endedOn"] : null;
  if (r["status"] === "quit" && !endedOn) return null;
  return {
    id: r["id"],
    programmeId: r["programmeId"],
    startedOn: r["startedOn"],
    status: r["status"],
    endedOn: r["status"] === "quit" ? endedOn : null,
  };
}

export function parseProgrammesValue(raw: unknown): ProgrammesValue | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== PROGRAMMES_VERSION) return null;
  const rawRuns = Array.isArray(r["runs"]) ? r["runs"] : [];
  const runs: ProgrammeRun[] = [];
  const seen = new Set<string>();
  for (const item of rawRuns) {
    const run = parseRun(item);
    if (run && !seen.has(run.id)) {
      seen.add(run.id);
      runs.push(run);
    }
    if (runs.length >= PROGRAMMES_RUN_CAP) break;
  }
  return { version: PROGRAMMES_VERSION, runs };
}

/* ------------------------------- transitions ------------------------------ */

/** The last day of a run's final week (inclusive). */
export function runEndDay(run: ProgrammeRun, definition: ProgrammeDefinition): string {
  return shiftDay(run.startedOn, definition.weeks.length * 7 - 1);
}

/** A run is live on `today` when it is stored active and its final
 *  week has not fully passed. A stored-active run past its end is
 *  completed, not active — so it never blocks a new enrolment. */
export function isLiveRun(run: ProgrammeRun, definition: ProgrammeDefinition, today: string): boolean {
  return run.status === "active" && today <= runEndDay(run, definition);
}

export function activeRunOf(value: ProgrammesValue, today: string): ProgrammeRun | null {
  for (const run of value.runs) {
    const definition = programmeById(run.programmeId);
    if (definition && isLiveRun(run, definition, today)) return run;
  }
  return null;
}

/** Enrol: prepend a fresh run. Returns the value UNCHANGED when a
 *  live run already exists or the programme is unknown — one
 *  active programme at a time, no exceptions written anywhere. */
export function enrolRun(
  value: ProgrammesValue,
  programmeId: string,
  runId: string,
  today: string,
): ProgrammesValue {
  if (!programmeById(programmeId)) return value;
  if (activeRunOf(value, today)) return value;
  const run: ProgrammeRun = {
    id: runId,
    programmeId,
    startedOn: today,
    status: "active",
    endedOn: null,
  };
  if (!parseRun(run)) return value;
  return { ...value, runs: [run, ...value.runs].slice(0, PROGRAMMES_RUN_CAP) };
}

/** Quit: the run stays in history with its end date. Quitting a run
 *  that is not live (already quit, or already completed) writes
 *  nothing. */
export function quitRun(value: ProgrammesValue, runId: string, today: string): ProgrammesValue {
  const runs = value.runs.map((run) => {
    if (run.id !== runId || run.status !== "active") return run;
    const definition = programmeById(run.programmeId);
    if (!definition || !isLiveRun(run, definition, today)) return run;
    return { ...run, status: "quit" as const, endedOn: today };
  });
  return { ...value, runs };
}

/* ----------------------------- progress engine ---------------------------- */

/** The person's real records, as day keys. Each list is the days
 *  (or, for weigh-ins, one entry per weigh-in taken — the engine
 *  counts entries, so two weigh-ins on one day count twice only
 *  if the caller passes the day twice) drawn from the actual
 *  stores: food log entries, habit logs, weigh-ins, plan-log. */
export interface ProgrammeRecords {
  foodLogDays: readonly string[];
  habitTickDays: readonly string[];
  weighInDays: readonly string[];
  planDays: readonly string[];
}

export const EMPTY_RECORDS: ProgrammeRecords = {
  foodLogDays: [],
  habitTickDays: [],
  weighInDays: [],
  planDays: [],
};

export type WeekState = "met" | "missed" | "in_progress" | "no_record" | "upcoming";
export type TargetState = "met" | "missed" | "in_progress" | "no_record" | "upcoming";

export interface ProgrammeTargetProgress {
  target: ProgrammeTarget;
  /** Records of this kind inside the week. */
  actual: number;
  state: TargetState;
}

export interface ProgrammeWeekProgress {
  /** 0-based week index. */
  index: number;
  focus: string;
  /** Inclusive local day keys bounding the week. */
  startsOn: string;
  endsOn: string;
  state: WeekState;
  targets: ProgrammeTargetProgress[];
}

export type RunState = "active" | "quit" | "completed";

export interface ProgrammeProgress {
  run: ProgrammeRun;
  definition: ProgrammeDefinition;
  state: RunState;
  /** 1-based current week, or null when the run is over (quit /
   *  completed) or has not reached its first day. */
  currentWeek: number | null;
  weeks: ProgrammeWeekProgress[];
  summary: {
    weeksMet: number;
    weeksMissed: number;
    weeksNoRecord: number;
    weeksInProgress: number;
    weeksUpcoming: number;
  };
}

function daysInWeek(days: readonly string[], startsOn: string, endsOn: string): Set<string> {
  const out = new Set<string>();
  for (const d of days) if (d >= startsOn && d <= endsOn) out.add(d);
  return out;
}

function countInWeek(days: readonly string[], startsOn: string, endsOn: string): number {
  let n = 0;
  for (const d of days) if (d >= startsOn && d <= endsOn) n += 1;
  return n;
}

function actualFor(kind: ProgrammeTargetKind, records: ProgrammeRecords, startsOn: string, endsOn: string): number {
  switch (kind) {
    case "food_log_days":
      return daysInWeek(records.foodLogDays, startsOn, endsOn).size;
    case "habit_tick_days":
      return daysInWeek(records.habitTickDays, startsOn, endsOn).size;
    case "plan_days":
      return daysInWeek(records.planDays, startsOn, endsOn).size;
    case "weigh_in_count":
      return countInWeek(records.weighInDays, startsOn, endsOn);
  }
}

function weekHasAnyRecord(records: ProgrammeRecords, startsOn: string, endsOn: string): boolean {
  return (
    actualFor("food_log_days", records, startsOn, endsOn) > 0 ||
    actualFor("habit_tick_days", records, startsOn, endsOn) > 0 ||
    actualFor("plan_days", records, startsOn, endsOn) > 0 ||
    actualFor("weigh_in_count", records, startsOn, endsOn) > 0
  );
}

export function progressForRun(
  run: ProgrammeRun,
  records: ProgrammeRecords,
  today: string,
): ProgrammeProgress | null {
  const definition = programmeById(run.programmeId);
  if (!definition) return null;

  const endDay = runEndDay(run, definition);
  const state: RunState =
    run.status === "quit" ? "quit" : today > endDay ? "completed" : "active";
  // A quit run is judged only up to the day it was quit: later
  // weeks were never attempted, so they are not progress at all.
  const horizon = run.status === "quit" && run.endedOn ? run.endedOn : today;

  const weeks: ProgrammeWeekProgress[] = definition.weeks.map((week, index) => {
    const startsOn = shiftDay(run.startedOn, index * 7);
    const endsOn = shiftDay(startsOn, 6);
    const isFuture = startsOn > horizon;
    const isPast = endsOn < horizon;
    const anyRecord = !isFuture && weekHasAnyRecord(records, startsOn, endsOn);

    const targets: ProgrammeTargetProgress[] = week.targets.map((target) => {
      const actual = isFuture ? 0 : actualFor(target.kind, records, startsOn, endsOn);
      const tState: TargetState = isFuture
        ? "upcoming"
        : actual >= target.count
          ? "met"
          : !anyRecord
            ? "no_record"
            : isPast
              ? "missed"
              : "in_progress";
      return { target, actual, state: tState };
    });

    const wState: WeekState = isFuture
      ? "upcoming"
      : targets.every((tp) => tp.state === "met")
        ? "met"
        : !anyRecord
          ? "no_record"
          : isPast
            ? "missed"
            : "in_progress";
    return { index, focus: week.focus, startsOn, endsOn, state: wState, targets };
  });

  const summary = {
    weeksMet: weeks.filter((w) => w.state === "met").length,
    weeksMissed: weeks.filter((w) => w.state === "missed").length,
    weeksNoRecord: weeks.filter((w) => w.state === "no_record").length,
    weeksInProgress: weeks.filter((w) => w.state === "in_progress").length,
    weeksUpcoming: weeks.filter((w) => w.state === "upcoming").length,
  };

  let currentWeek: number | null = null;
  if (state === "active" && today >= run.startedOn) {
    const idx = weeks.findIndex((w) => today >= w.startsOn && today <= w.endsOn);
    currentWeek = idx >= 0 ? idx + 1 : null;
  }

  return { run, definition, state, currentWeek, weeks, summary };
}

/* ------------------------------- pref access ------------------------------ */

export function readProgrammesValue(): ProgrammesValue {
  return getPref(PROGRAMMES_KEY, parseProgrammesValue, EMPTY_PROGRAMMES_VALUE);
}

export function writeProgrammesValue(value: ProgrammesValue): void {
  setPref(PROGRAMMES_KEY, value);
}

export function clearProgrammes(): void {
  clearPref(PROGRAMMES_KEY);
}
