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
import {
  currentProfileId,
  deleteDay,
  hasCloud,
  legacyLocalDays,
  mergeDayLists,
  pullDays,
  pushDay,
} from "@/lib/cycle/cycleCloud";
import { placeDate } from "@/lib/cycle/dayLogs";
import { DEFAULT_THEME_ID } from "@/lib/cycle/themes";

/** Where a day currently lives. Shown on the page, never as an error state. */
export type SyncState = "off" | "loading" | "signed-out" | "saved" | "pending" | "error";

export interface SyncStatus {
  state: SyncState;
  message: string;
  signedIn: boolean;
}

export type SaveResult = { ok: true; id: string } | { ok: false; errors: FieldErrors };
export type SaveDayResult = { ok: true } | { ok: false; errors: DayFieldErrors };

export interface PeriodLogStore {
  /** Whether this day is on the account, on the device, or on its way up. */
  sync: SyncStatus;
  /** Pull the table again and reconcile. Safe to call at any time. */
  syncNow: () => void;
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
  const [sync, setSync] = useState<SyncStatus>({
    state: "off",
    message: "",
    signedIn: false,
  });
  const skipPersist = useRef(true);
  const skipDayPersist = useRef(true);
  const profileId = useRef<string | null>(null);
  /** Dates the device holds that the table hasn't seen yet. */
  const dirtyDates = useRef<Set<string>>(new Set());
  const deletedDates = useRef<Set<string>>(new Set());
  const syncing = useRef(false);

  /* read once on mount, then keep in sync with other instances of the hook */
  useEffect(() => {
    const read = () => {
      const stored = loadDays();
      /* First run on this device: pick up whatever the old page left behind,
         so the record doesn't look empty after a redesign. */
      const days = stored.length === 0 ? mergeDayLists([], legacyLocalDays()).days : stored;
      setLogs(loadLogs());
      setDays(days);
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

  /* ------------------------------ cloud sync ----------------------------- */

  const pushPending = useCallback(async () => {
    const pid = profileId.current;
    if (!pid || syncing.current) return;
    const pushes = [...dirtyDates.current].map((date) => ({
      date,
      day: daysRef.current.find((d) => d.date === date) ?? null,
    }));
    const removals = [...deletedDates.current];
    if (pushes.length === 0 && removals.length === 0) return;

    syncing.current = true;
    dirtyDates.current.clear();
    deletedDates.current.clear();
    setSync((prev) => ({ ...prev, state: "pending", message: "Saving to your account…" }));
    try {
      for (const { day } of pushes) {
        if (!day) continue;
        const placement = placeDate(analysisRef.current, day.date);
        await pushDay(pid, day, {
          cycleDay: placement?.cycleDay ?? null,
          phase: placement?.phase ?? null,
        });
      }
      for (const date of removals) await deleteDay(pid, date);
      setSync({ state: "saved", message: "Saved to your account.", signedIn: true });
    } catch {
      /* Put them back so the next attempt (or the next save) retries. */
      for (const { date } of pushes) dirtyDates.current.add(date);
      for (const date of removals) deletedDates.current.add(date);
      setSync({
        state: "error",
        message: "Couldn't reach your account — this day is safe on this device.",
        signedIn: true,
      });
    } finally {
      syncing.current = false;
    }
  }, []);

  const syncNow = useCallback(() => {
    void (async () => {
      if (!hasCloud()) {
        setSync({
          state: "off",
          message: "No database connected in this build — records stay on this device.",
          signedIn: false,
        });
        return;
      }
      setSync((prev) => ({ ...prev, state: "loading", message: "Fetching your records…" }));
      try {
        const pid = await currentProfileId();
        profileId.current = pid;
        if (!pid) {
          setSync({
            state: "signed-out",
            message: "Not signed in — saved on this device only.",
            signedIn: false,
          });
          return;
        }
        const remote = await pullDays(pid);
        const merged = mergeDayLists(daysRef.current, remote);
        setDays(merged.days);
        for (const date of merged.newerLocal) dirtyDates.current.add(date);
        setSync({ state: "saved", message: "Synced with your account.", signedIn: true });
        if (merged.newerLocal.length > 0) void pushPending();
      } catch {
        setSync({
          state: "error",
          message: "Couldn't reach your account — showing what's saved on this device.",
          signedIn: profileId.current !== null,
        });
      }
    })();
  }, [pushPending]);

  /* pull once on mount, after the device has been read */
  useEffect(() => {
    if (!hydrated) return;
    syncNow();
  }, [hydrated, syncNow]);

  /* flush whatever the person changed, a beat after they stop typing */
  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => void pushPending(), 700);
    return () => window.clearTimeout(id);
  }, [days, hydrated, pushPending]);

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
    deletedDates.current.delete(draft.date);
    dirtyDates.current.add(draft.date);
    return { ok: true };
  }, []);

  const removeDay = useCallback((date: string) => {
    setDays((prev) => {
      for (const d of prev) if (d.date === date) deletedDates.current.add(date);
      return prev.filter((d) => d.date !== date);
    });
    dirtyDates.current.delete(date);
  }, []);

  const clearDays = useCallback(() => {
    setDays((prev) => {
      for (const d of prev) deletedDates.current.add(d.date);
      return [];
    });
    dirtyDates.current.clear();
  }, []);

  const analysis = useMemo(() => analyzeCycle(logs, today), [logs, today]);
  const daysRef = useRef<DayLog[]>(days);
  const analysisRef = useRef(analysis);
  daysRef.current = days;
  analysisRef.current = analysis;
  const dayAnalysis = useMemo(() => analyzeDayLogs(days, analysis), [days, analysis]);

  return {
    sync,
    syncNow,
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