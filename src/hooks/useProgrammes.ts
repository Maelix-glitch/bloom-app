/**
 * Transformation Programmes — the composing hook.
 *
 * Reads the enrolment record and the four real record streams the
 * engine counts (food log, habit logs, weigh-ins, plan-log) and
 * hands the section pure progress. Every stream is read through
 * the same prefs/subscription patterns the Nutrition and Body
 * hooks use, so a log made anywhere re-renders the programme
 * where it stands.
 */

import { useCallback, useMemo } from "react";

import { usePrefValue } from "@/lib/prefsStore";
import { todayLocal } from "@/lib/localDay";
import { WEIGHINS_KEY, parseWeighIns, type WeighIn } from "@/lib/health/body";
import { FOODLOG_KEY, parseFoodLogValue } from "@/lib/nutrition/store";
import { PLAN_LOG_KEY, parsePlanLogValue } from "@/lib/nutrition/planLog";
import type { LogEntry } from "@/lib/nutrition/types";
import {
  EMPTY_PROGRAMMES_VALUE,
  PROGRAMMES_KEY,
  activeRunOf,
  enrolRun,
  parseProgrammesValue,
  progressForRun,
  quitRun,
  readProgrammesValue,
  writeProgrammesValue,
  type ProgrammeProgress,
  type ProgrammeRecords,
  type ProgrammeRun,
} from "@/lib/programmes/programmes";
import { useHabits } from "./useHabits";

const NO_ENTRIES: LogEntry[] = [];
const NO_WEIGHINS: WeighIn[] = [];
const NO_PLAN_LOG: Record<string, string> = {};

export interface ProgrammesStore {
  today: string;
  runs: ProgrammeRun[];
  activeRun: ProgrammeRun | null;
  activeProgress: ProgrammeProgress | null;
  /** Progress for every run, in the runs' stored order. */
  history: ProgrammeProgress[];
  enrol: (programmeId: string) => void;
  quit: (runId: string) => void;
}

export function useProgrammes(): ProgrammesStore {
  const value = usePrefValue(PROGRAMMES_KEY, parseProgrammesValue, EMPTY_PROGRAMMES_VALUE);
  const entries = usePrefValue(FOODLOG_KEY, parseFoodLogValue, NO_ENTRIES);
  const planLog = usePrefValue(PLAN_LOG_KEY, parsePlanLogValue, NO_PLAN_LOG);
  const weighIns = usePrefValue(WEIGHINS_KEY, parseWeighIns, NO_WEIGHINS);
  const { logs: habitLogs } = useHabits();
  const today = todayLocal();

  const records: ProgrammeRecords = useMemo(
    () => ({
      foodLogDays: entries.map((e) => e.day),
      habitTickDays: habitLogs.map((l) => l.date),
      weighInDays: weighIns.map((w) => w.date),
      planDays: Object.keys(planLog).map((k) => k.split(":")[0]!),
    }),
    [entries, habitLogs, weighIns, planLog],
  );

  const activeRun = useMemo(() => activeRunOf(value, today), [value, today]);

  const history = useMemo(
    () =>
      value.runs
        .map((run) => progressForRun(run, records, today))
        .filter((p): p is ProgrammeProgress => p !== null),
    [value, records, today],
  );

  const activeProgress = useMemo(
    () => history.find((p) => p.run.id === activeRun?.id) ?? null,
    [history, activeRun],
  );

  const enrol = useCallback(
    (programmeId: string) => {
      const runId = `run-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
      writeProgrammesValue(enrolRun(readProgrammesValue(), programmeId, runId, todayLocal()));
    },
    [],
  );

  const quit = useCallback((runId: string) => {
    writeProgrammesValue(quitRun(readProgrammesValue(), runId, todayLocal()));
  }, []);

  return { today, runs: value.runs, activeRun, activeProgress, history, enrol, quit };
}
