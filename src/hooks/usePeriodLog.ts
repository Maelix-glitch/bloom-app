/**
 * usePeriodLog — entries + live analysis for Cycle Intelligence.
 *
 * Nothing is cached: every mutation writes the list and the analysis is
 * recomputed from whatever remains, so deleting or editing an entry updates
 * every prediction in the same frame.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  analyzeCycle,
  newLogId,
  todayKey,
  validateLogDraft,
  type CycleAnalysis,
  type FieldErrors,
  type LogDraft,
  type PeriodLog,
} from "@/lib/cycle/predict";
import {
  analyzeDayLogs,
  validateDayLog,
  type DayFieldErrors,
  type DayLog,
  type DayLogAnalysis,
} from "@/lib/cycle/dayLogs";
import {
  loadDays,
  loadLogs,
  loadThemeId,
  legacyPeriodCandidates,
  PERIODS_CHANGED,
  saveDays,
  saveLogs,
} from "@/lib/cycle/periodStore";
import { DEFAULT_THEME_ID } from "@/lib/cycle/themes";

export type SaveResult = { ok: true; id: string } | { ok: false; errors: FieldErrors };
export type SaveDayResult = { ok: true } | { ok: false; errors: DayFieldErrors };

export interface PeriodLogStore {
  logs: PeriodLog[];
  analysis: CycleAnalysis;
  /** Advanced daily log, newest first. */
  days: DayLog[];
  dayAnalysis: DayLogAnalysis;
  today: string;
  /** False until localStorage has been read (server render has no storage). */
  hydrated: boolean;
  legacyAvailable: boolean;
  add: (draft: LogDraft) => SaveResult;
  update: (id: string, draft: LogDraft) => SaveResult;
  remove: (id: string) => void;
  clearAll: () => void;
  importLegacy: () => number;
  /** Upsert a daily log by date; merges with whatever is already there. */
  saveDay: (draft: DayLog) => SaveDayResult;
  removeDay: (date: string) => void;
  clearDays: () => void;
}

export function usePeriodLog(): PeriodLogStore {
  const [logs, setLogs] = useState<PeriodLog[]>([]);
  const [days, setDays] = useState<DayLog[]>([]);
  const [today, setToday] = useState<string>(() => todayKey());
  const [hydrated, setHydrated] = useState(false);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const skipPersist = useRef(true);
  const skipDayPersist = useRef(true);

  /* read once on mount, then keep in sync with other instances of the hook */
  useEffect(() => {
    const read = () => {
      setLogs(loadLogs());
      setDays(loadDays());
      setToday(todayKey());
      setHydrated(true);
    };
    read();
    const onExternal = () => {
      setLogs(loadLogs());
      setDays(loadDays());
    };
    window.addEventListener(PERIODS_CHANGED, onExternal);
    window.addEventListener("storage", onExternal);
    return () => {
      window.removeEventListener(PERIODS_CHANGED, onExternal);
      window.removeEventListener("storage", onExternal);
    };
  }, []);

  useEffect(() => {
    setLegacyAvailable(legacyPeriodCandidates().length > 0);
  }, [hydrated]);

  /* roll the clock over at midnight / when the tab comes back */
  useEffect(() => {
    const tick = () => setToday(todayKey());
    const id = window.setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  /* persist every change (but not the initial empty render) */
  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    if (!hydrated) return;
    saveLogs(logs);
  }, [logs, hydrated]);

  useEffect(() => {
    if (skipDayPersist.current) {
      skipDayPersist.current = false;
      return;
    }
    if (!hydrated) return;
    saveDays(days);
  }, [days, hydrated]);

  const add = useCallback((draft: LogDraft): SaveResult => {
    const errors = validateLogDraft(draft, loadLogs(), todayKey());
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    const entry: PeriodLog = {
      id: newLogId(),
      start: draft.start,
      end: draft.end && draft.end !== "" ? draft.end : null,
      flow: draft.flow ?? null,
      notes: draft.notes && draft.notes.trim() ? draft.notes.trim() : null,
    };
    setLogs((prev) => [...prev, entry]);
    return { ok: true, id: entry.id };
  }, []);

  const update = useCallback((id: string, draft: LogDraft): SaveResult => {
    const current = loadLogs();
    const errors = validateLogDraft(draft, current, todayKey(), id);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    setLogs((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              start: draft.start,
              end: draft.end && draft.end !== "" ? draft.end : null,
              flow: draft.flow ?? null,
              notes: draft.notes && draft.notes.trim() ? draft.notes.trim() : null,
            }
          : l,
      ),
    );
    return { ok: true, id };
  }, []);

  const remove = useCallback((id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setLogs([]);
  }, []);

  const importLegacy = useCallback(() => {
    const candidates = legacyPeriodCandidates();
    if (candidates.length === 0) return 0;
    setLogs((prev) => {
      const seen = new Set(prev.map((l) => l.start));
      const fresh = candidates.filter((c) => !seen.has(c.start));
      return [...prev, ...fresh].sort((a, b) => a.start.localeCompare(b.start));
    });
    setLegacyAvailable(false);
    return candidates.length;
  }, []);

  const saveDay = useCallback((draft: DayLog): SaveDayResult => {
    const errors = validateDayLog(draft, todayKey());
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    setDays((prev) => {
      const next = prev.filter((d) => d.date !== draft.date);
      next.push({ ...draft, updatedAt: new Date().toISOString() });
      return next.sort((a, b) => a.date.localeCompare(b.date));
    });
    return { ok: true };
  }, []);

  const removeDay = useCallback((date: string) => {
    setDays((prev) => prev.filter((d) => d.date !== date));
  }, []);

  const clearDays = useCallback(() => setDays([]), []);

  const analysis = useMemo(() => analyzeCycle(logs, today), [logs, today]);
  const dayAnalysis = useMemo(() => analyzeDayLogs(days, analysis), [days, analysis]);

  return {
    logs,
    analysis,
    days: useMemo(() => [...days].sort((a, b) => b.date.localeCompare(a.date)), [days]),
    dayAnalysis,
    today,
    hydrated,
    legacyAvailable,
    add,
    update,
    remove,
    clearAll,
    importLegacy,
    saveDay,
    removeDay,
    clearDays,
  };
}

/**
 * Applied design direction, live-updated when the styles page changes it.
 * Starts from the default so server and client hydration agree, then syncs.
 */
export function useCycleTheme(): [string, (id: string) => void] {
  const [id, setId] = useState<string>(DEFAULT_THEME_ID);
  useEffect(() => {
    const sync = () => setId(loadThemeId());
    sync();
    window.addEventListener(PERIODS_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PERIODS_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return [id, setId];
}
