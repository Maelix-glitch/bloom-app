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
  formatDate,
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
  loadCheckInMemory,
  loadDays,
  loadLogs,
  loadThemeId,
  legacyPeriodCandidates,
  PERIODS_CHANGED,
  saveCheckInMemory,
  saveDays,
  saveLogs,
} from "@/lib/cycle/periodStore";
import {
  EMPTY_MEMORY,
  pruneMemory,
  reconcile,
  remember,
  type CheckIn,
  type CheckInMemory,
  type CheckInResolution,
} from "@/lib/cycle/reconcile";
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

/** A deletion that can still be taken back. */
export interface Undoable {
  id: number;
  message: string;
  /** Epoch ms after which the snapshot is dropped. */
  until: number;
}

/** How long a delete / clear can be undone for. */
export const UNDO_WINDOW_MS = 8000;

/** What the page should do after a check-in answer that needs the form. */
export type CheckInFollowUp =
  | { type: "focus-form"; date: string; startPeriod: boolean }
  | { type: "edit-period"; periodId: string }
  | { type: "saved"; message: string }
  | { type: "none" };

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
  /** Questions the record is asking right now, most pressing first. */
  checkIns: CheckIn[];
  /** Apply one answer. Returns what the page should do next, if anything. */
  answerCheckIn: (checkIn: CheckIn, actionId: string) => CheckInFollowUp;
  /** Change just the last day of an entry (used by check-ins and the form). */
  setPeriodEnd: (id: string, end: string | null) => SaveResult;
  /** The most recent delete / clear that can still be taken back. */
  undoable: Undoable | null;
  undo: () => void;
  dismissUndo: () => void;
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
  const [memory, setMemory] = useState<CheckInMemory>(EMPTY_MEMORY);
  const [undoable, setUndoable] = useState<Undoable | null>(null);
  /** The record as it was just before the last delete / clear. */
  const snapshot = useRef<{ id: number; at: number; logs: PeriodLog[]; days: DayLog[] } | null>(
    null,
  );
  const undoSeq = useRef(0);
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
      setMemory(loadCheckInMemory());
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

  /* ------------------------------- undo ---------------------------------- */

  /** Keep a copy of the record, then let the caller change it. */
  const keepForUndo = useCallback((message: string) => {
    const id = ++undoSeq.current;
    const at = Date.now();
    snapshot.current = { id, at, logs: loadLogs(), days: daysRef.current };
    setUndoable({ id, message, until: at + UNDO_WINDOW_MS });
  }, []);

  /* the snapshot expires by itself */
  useEffect(() => {
    if (!undoable) return;
    const ms = Math.max(0, undoable.until - Date.now());
    const t = window.setTimeout(() => {
      setUndoable((u) => (u && u.id === undoable.id ? null : u));
      if (snapshot.current?.id === undoable.id) snapshot.current = null;
    }, ms);
    return () => window.clearTimeout(t);
  }, [undoable]);

  const undo = useCallback(() => {
    const snap = snapshot.current;
    if (!snap) return;
    snapshot.current = null;
    setUndoable(null);
    setLogs(snap.logs);
    setDays((current) => {
      /* restore days that were removed; re-queue them for the account */
      const have = new Set(current.map((d) => d.date));
      const restored = snap.days.filter((d) => !have.has(d.date));
      for (const d of restored) {
        deletedDates.current.delete(d.date);
        dirtyDates.current.add(d.date);
      }
      return [...current, ...restored].sort((a, b) => a.date.localeCompare(b.date));
    });
  }, []);

  const dismissUndo = useCallback(() => {
    snapshot.current = null;
    setUndoable(null);
  }, []);

  const remove = useCallback(
    (id: string) => {
      const entry = loadLogs().find((l) => l.id === id);
      keepForUndo(
        entry
          ? `Removed the period that started ${formatDate(entry.start)}.`
          : "Removed the entry.",
      );
      setLogs((prev) => prev.filter((l) => l.id !== id));
    },
    [keepForUndo],
  );

  const clearAll = useCallback(() => {
    keepForUndo("Cleared your whole record.");
    setLogs([]);
  }, [keepForUndo]);

  const setPeriodEnd = useCallback((id: string, end: string | null): SaveResult => {
    const current = loadLogs();
    const entry = current.find((l) => l.id === id);
    if (!entry) return { ok: false, errors: { start: "That entry no longer exists." } };
    const draft: LogDraft = {
      start: entry.start,
      end,
      flow: entry.flow ?? null,
      notes: entry.notes ?? null,
    };
    const errors = validateLogDraft(draft, current, todayKey(), id);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, end } : l)));
    return { ok: true, id };
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

  const removeDay = useCallback(
    (date: string) => {
      keepForUndo(`Cleared what you logged for ${formatDate(date)}.`);
      setDays((prev) => {
        for (const d of prev) if (d.date === date) deletedDates.current.add(date);
        return prev.filter((d) => d.date !== date);
      });
      dirtyDates.current.delete(date);
    },
    [keepForUndo],
  );

  const clearDays = useCallback(() => {
    /* When this follows clearAll in the same tick, that snapshot already holds
       the days too — one undo brings everything back. */
    const fresh = snapshot.current && Date.now() - snapshot.current.at < 250;
    if (!fresh) keepForUndo("Cleared your daily log.");
    setDays((prev) => {
      for (const d of prev) deletedDates.current.add(d.date);
      return [];
    });
    dirtyDates.current.clear();
  }, [keepForUndo]);

  const analysis = useMemo(() => analyzeCycle(logs, today), [logs, today]);
  const daysRef = useRef<DayLog[]>(days);
  const analysisRef = useRef(analysis);
  daysRef.current = days;
  analysisRef.current = analysis;
  const dayAnalysis = useMemo(() => analyzeDayLogs(days, analysis), [days, analysis]);

  /* --------------------------- check-in questions ------------------------ */

  const checkIns = useMemo(
    () => (hydrated ? reconcile({ logs, days, today, analysis, memory }) : []),
    [logs, days, today, analysis, memory, hydrated],
  );

  const rememberAnswer = useCallback(
    (id: string, how: "dismiss" | "snooze") => {
      setMemory((prev) => {
        const next = pruneMemory(remember(prev, id, how, today), loadLogs(), today);
        saveCheckInMemory(next);
        return next;
      });
    },
    [today],
  );

  const answerCheckIn = useCallback(
    (checkIn: CheckIn, actionId: string): CheckInFollowUp => {
      const action = checkIn.actions.find((a) => a.id === actionId);
      if (!action) return { type: "none" };
      const resolution: CheckInResolution = action.resolution;
      switch (resolution.type) {
        case "set-end": {
          const result = setPeriodEnd(resolution.periodId, resolution.end);
          if (!result.ok) {
            /* the record moved under us — park it rather than loop */
            rememberAnswer(checkIn.id, "snooze");
            return { type: "none" };
          }
          rememberAnswer(checkIn.id, "dismiss");
          return {
            type: "saved",
            message: `Last day recorded as ${formatDate(resolution.end)} — everything below was recalculated.`,
          };
        }
        case "add-period": {
          const result = add({
            start: resolution.start,
            end: resolution.end,
            flow: resolution.flow,
            notes: null,
          });
          rememberAnswer(checkIn.id, "dismiss");
          if (!result.ok) {
            return { type: "focus-form", date: resolution.start, startPeriod: true };
          }
          return {
            type: "saved",
            message: `Period logged from ${formatDate(resolution.start)} — predictions updated.`,
          };
        }
        case "focus-form":
          rememberAnswer(checkIn.id, "snooze");
          return { type: "focus-form", date: resolution.date, startPeriod: resolution.startPeriod };
        case "edit-period":
          rememberAnswer(checkIn.id, "snooze");
          return { type: "edit-period", periodId: resolution.periodId };
        case "dismiss":
          rememberAnswer(checkIn.id, "dismiss");
          return { type: "none" };
        case "snooze":
        default:
          rememberAnswer(checkIn.id, "snooze");
          return { type: "none" };
      }
    },
    [add, rememberAnswer, setPeriodEnd],
  );

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
    checkIns,
    answerCheckIn,
    setPeriodEnd,
    undoable,
    undo,
    dismissUndo,
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
