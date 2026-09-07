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
  DEFAULT_CYCLE_SETTINGS,
  effectiveMode,
  loadCheckInMemory,
  loadCycleSettings,
  loadDays,
  loadLogs,
  loadPeriodMeta,
  loadThemeId,
  legacyPeriodCandidates,
  PERIODS_CHANGED,
  saveCheckInMemory,
  saveCycleSettings,
  saveDays,
  saveLogs,
  savePeriodMeta,
  type CycleMode,
  type CyclePause,
  type CycleSettings,
  type PeriodMeta,
} from "@/lib/cycle/periodStore";
import {
  isEmptyState,
  liveLogs,
  mergePeriodRecords,
  mergeState,
  PeriodTablesMissing,
  periodTablesReady,
  pruneTombstones,
  reprobePeriodTables,
  pullPeriods,
  pullState,
  pushPeriods,
  pushState,
  recordsFromLogs,
  sameState,
  type CycleState,
  type PeriodRecord,
} from "@/lib/cycle/periodCloud";
import { UNDO_WINDOW_MS, type Undoable } from "@/lib/undo";
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
  /**
   * Set when the account syncs the daily log but not yet the period entries —
   * the project hasn't run the 20260907_cycle_periods migration.
   */
  periodsOnDevice?: boolean;
}

export type SaveResult = { ok: true; id: string } | { ok: false; errors: FieldErrors };
export type SaveDayResult = { ok: true } | { ok: false; errors: DayFieldErrors };

/* the undo contract is shared with the trackers — see lib/undo */
export { UNDO_WINDOW_MS, type Undoable };

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
  /** What the person has told the engine about their own body. */
  settings: CycleSettings;
  /** "It really was that long" — count gaps up to `days` as real cycles from now on. */
  acceptLongCycles: (days: number) => void;
  /**
   * The mode as it applies today (a dated pause that has passed reads as
   * tracking). `tracking` predicts; `paused` keeps history and the daily
   * log but predicts nothing and is never "late"; `off` also takes the
   * cycle out of Today, the nav and the coach.
   */
  mode: CycleMode;
  /** "I'm not expecting periods right now / I don't track a cycle." */
  setMode: (mode: CycleMode, pause?: Partial<Omit<CyclePause, "since">>) => void;
  /** The most recent delete / clear that can still be taken back. */
  undoable: Undoable | null;
  undo: () => void;
  dismissUndo: () => void;
}

/**
 * The device's plain list + its sync sidecar → records the sync layer reasons
 * about. An entry with no known stamp (logged before sync existed) is dated to
 * its own first day — certainly no later than that — so a real edit made
 * anywhere since wins over it.
 */
function recordsFromMeta(logs: readonly PeriodLog[], meta: PeriodMeta): PeriodRecord[] {
  const alive = logs.map((log) => ({
    log,
    updatedAt: meta.updatedAt[log.id] ?? `${log.start}T12:00:00.000Z`,
    deletedAt: null,
  }));
  const dead = Object.entries(meta.deleted).map(([id, d]) => ({
    log: { ...d.log, id },
    updatedAt: d.at,
    deletedAt: d.at,
  }));
  return [...alive, ...dead];
}

function metaFromRecords(records: readonly PeriodRecord[]): PeriodMeta {
  const meta: PeriodMeta = { updatedAt: {}, deleted: {} };
  for (const r of records) {
    if (r.deletedAt) meta.deleted[r.log.id] = { log: r.log, at: r.deletedAt };
    else meta.updatedAt[r.log.id] = r.updatedAt;
  }
  return meta;
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
  const [settings, setSettings] = useState<CycleSettings>(DEFAULT_CYCLE_SETTINGS);
  /** Per-entry change stamps + tombstones — what the period sync reasons about. */
  const periodRecords = useRef<PeriodRecord[]>([]);
  /** Period ids changed here and not yet on the account. */
  const dirtyPeriods = useRef<Set<string>>(new Set());
  /** Memory/settings changed here and not yet on the account. */
  const dirtyState = useRef(false);
  const logsRef = useRef<PeriodLog[]>([]);
  const memoryRef = useRef<CheckInMemory>(EMPTY_MEMORY);
  const settingsRef = useRef<CycleSettings>(DEFAULT_CYCLE_SETTINGS);
  const stateStamp = useRef<string>(new Date(0).toISOString());
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
      const logs = loadLogs();
      const memory = loadCheckInMemory();
      const settings = loadCycleSettings();
      periodRecords.current = recordsFromMeta(logs, loadPeriodMeta());
      logsRef.current = logs;
      memoryRef.current = memory;
      settingsRef.current = settings;
      setLogs(logs);
      setDays(days);
      setMemory(memory);
      setSettings(settings);
      setToday(todayKey());
      setHydrated(true);
    };
    read();
    const onExternal = () => {
      const logs = loadLogs();
      periodRecords.current = recordsFromMeta(logs, loadPeriodMeta());
      logsRef.current = logs;
      setLogs(logs);
      setDays(loadDays());
      setSettings(loadCycleSettings());
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
    const periodIds = [...dirtyPeriods.current];
    const periods = periodRecords.current.filter((r) => periodIds.includes(r.log.id));
    const stateDirty = dirtyState.current;
    if (pushes.length === 0 && removals.length === 0 && periods.length === 0 && !stateDirty) return;

    syncing.current = true;
    dirtyDates.current.clear();
    deletedDates.current.clear();
    dirtyPeriods.current.clear();
    dirtyState.current = false;
    setSync((prev) => ({ ...prev, state: "pending", message: "Saving to your account…" }));
    try {
      if (periodTablesReady()) {
        try {
          await pushPeriods(pid, periods);
          if (stateDirty) {
            await pushState(pid, {
              memory: memoryRef.current,
              settings: settingsRef.current,
              updatedAt: stateStamp.current,
            });
          }
        } catch (e) {
          if (!(e instanceof PeriodTablesMissing)) throw e;
          /* the daily log still goes up; periods wait for the migration */
        }
      }
      for (const { day } of pushes) {
        if (!day) continue;
        const placement = placeDate(analysisRef.current, day.date);
        await pushDay(pid, day, {
          cycleDay: placement?.cycleDay ?? null,
          phase: placement?.phase ?? null,
        });
      }
      for (const date of removals) await deleteDay(pid, date);
      const periodsOnDevice = !periodTablesReady();
      setSync({
        state: "saved",
        message: "Saved to your account.",
        signedIn: true,
        periodsOnDevice,
      });
      if (periodsOnDevice) {
        /* keep them queued: they go up the moment the tables exist */
        for (const id of periodIds) dirtyPeriods.current.add(id);
        if (stateDirty) dirtyState.current = true;
      }
    } catch {
      /* Put them back so the next attempt (or the next save) retries. */
      for (const { date } of pushes) dirtyDates.current.add(date);
      for (const date of removals) deletedDates.current.add(date);
      for (const id of periodIds) dirtyPeriods.current.add(id);
      if (stateDirty) dirtyState.current = true;
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
        reprobePeriodTables();
        const [remote, periodSide] = await Promise.all([
          pullDays(pid),
          Promise.all([pullPeriods(pid), pullState(pid)]).catch((e: unknown) => {
            if (e instanceof PeriodTablesMissing) return null;
            throw e;
          }),
        ]);
        const merged = mergeDayLists(daysRef.current, remote);
        setDays(merged.days);
        for (const date of merged.newerLocal) dirtyDates.current.add(date);

        if (!periodSide) {
          /* the project hasn't run the period migration yet — the daily log
             syncs as before; periods and answers stay on this device for now */
          setSync({
            state: "saved",
            message:
              "Daily log synced. Period entries stay on this device until the cycle_periods migration is run.",
            signedIn: true,
            periodsOnDevice: true,
          });
          if (merged.newerLocal.length > 0) void pushPending();
          return;
        }
        const [remotePeriods, remoteState] = periodSide;

        /* period entries: per id, the later change wins — tombstones too */
        const mergedPeriods = mergePeriodRecords(periodRecords.current, remotePeriods);
        periodRecords.current = mergedPeriods.records;
        const nextLogs = liveLogs(mergedPeriods.records);
        logsRef.current = nextLogs;
        setLogs(nextLogs);
        for (const id of mergedPeriods.newerLocal) dirtyPeriods.current.add(id);
        /* anything the table has never seen (first sign-in) goes up as well */
        const remoteIds = new Set(remotePeriods.map((r) => r.log.id));
        for (const r of mergedPeriods.records)
          if (!remoteIds.has(r.log.id)) dirtyPeriods.current.add(r.log.id);

        /* check-in memory + settings: answers given anywhere count everywhere */
        const localState: CycleState = {
          memory: memoryRef.current,
          settings: settingsRef.current,
          updatedAt: stateStamp.current,
        };
        const combined = remoteState ? mergeState(localState, remoteState) : localState;
        if (!sameState(combined, localState)) {
          memoryRef.current = combined.memory;
          settingsRef.current = combined.settings;
          setMemory(combined.memory);
          setSettings(combined.settings);
          saveCheckInMemory(combined.memory);
          saveCycleSettings(combined.settings);
        }
        const worthWriting = remoteState
          ? !sameState(combined, remoteState)
          : !isEmptyState(combined);
        if (worthWriting) {
          stateStamp.current = new Date().toISOString();
          dirtyState.current = true;
        }

        setSync({ state: "saved", message: "Synced with your account.", signedIn: true });
        if (merged.newerLocal.length > 0 || dirtyPeriods.current.size > 0 || dirtyState.current)
          void pushPending();
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
  }, [days, logs, memory, settings, hydrated, pushPending]);

  /* persist every change (but not the initial empty render) */
  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    if (!hydrated) return;
    saveLogs(logs);
    /* stamp what changed, tombstone what vanished, queue both for the account */
    const now = new Date().toISOString();
    const { records, changed } = recordsFromLogs(logs, periodRecords.current, now);
    periodRecords.current = pruneTombstones(records, now);
    logsRef.current = logs;
    for (const id of changed) dirtyPeriods.current.add(id);
    savePeriodMeta(metaFromRecords(periodRecords.current));
  }, [logs, hydrated]);

  /* memory and settings ride along in one state row */
  useEffect(() => {
    if (!hydrated) return;
    if (memoryRef.current === memory && settingsRef.current === settings) return;
    memoryRef.current = memory;
    settingsRef.current = settings;
    stateStamp.current = new Date().toISOString();
    dirtyState.current = true;
  }, [memory, settings, hydrated]);

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

  /** Move a period's first day. The recorded end is kept when it still makes sense. */
  const setPeriodStart = useCallback((id: string, start: string): SaveResult => {
    const current = loadLogs();
    const entry = current.find((l) => l.id === id);
    if (!entry) return { ok: false, errors: { start: "That entry no longer exists." } };
    const end = entry.end && entry.end >= start ? entry.end : null;
    const draft: LogDraft = { start, end, flow: entry.flow ?? null, notes: entry.notes ?? null };
    const errors = validateLogDraft(draft, current, todayKey(), id);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, start, end } : l)));
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

  const mode = effectiveMode(settings, today);
  const analysis = useMemo(
    () =>
      analyzeCycle(logs, today, {
        personalMaxPlausible: settings.personalMaxPlausible,
        expecting: mode === "tracking",
      }),
    [logs, today, settings.personalMaxPlausible, mode],
  );

  const setMode = useCallback(
    (nextMode: CycleMode, pause?: Partial<Omit<CyclePause, "since">>) => {
      setSettings((prev) => {
        const next: CycleSettings = {
          ...prev,
          mode: nextMode,
          pause:
            nextMode === "paused"
              ? {
                  until: pause?.until ?? prev.pause?.until ?? null,
                  reason: pause?.reason ?? prev.pause?.reason ?? null,
                  since: prev.mode === "paused" && prev.pause ? prev.pause.since : today,
                }
              : null,
          modeChangedAt: new Date().toISOString(),
        };
        saveCycleSettings(next);
        return next;
      });
    },
    [today],
  );

  /* a dated pause that has run out becomes plain tracking in storage too */
  useEffect(() => {
    if (!hydrated) return;
    if (settings.mode === "paused" && mode === "tracking") setMode("tracking");
  }, [hydrated, settings.mode, mode, setMode]);

  const acceptLongCycles = useCallback((days: number) => {
    setSettings((prev) => {
      const next: CycleSettings = {
        ...prev,
        personalMaxPlausible: Math.max(prev.personalMaxPlausible ?? 0, Math.round(days)),
      };
      saveCycleSettings(next);
      return next;
    });
  }, []);
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
        case "set-start": {
          const result = setPeriodStart(resolution.periodId, resolution.start);
          if (!result.ok) {
            rememberAnswer(checkIn.id, "snooze");
            return { type: "edit-period", periodId: resolution.periodId };
          }
          rememberAnswer(checkIn.id, "dismiss");
          return {
            type: "saved",
            message: `First day moved to ${formatDate(resolution.start)} — everything below was recalculated.`,
          };
        }
        case "remove-period": {
          rememberAnswer(checkIn.id, "dismiss");
          remove(resolution.periodId);
          return { type: "saved", message: "Entry removed — you can undo this for a few seconds." };
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
        case "accept-long-cycles":
          acceptLongCycles(resolution.days);
          rememberAnswer(checkIn.id, "dismiss");
          return {
            type: "saved",
            message: `Understood — cycles up to ${resolution.days} days now count as yours. Average and predictions recalculated.`,
          };
        case "pause-tracking":
          setMode("paused");
          rememberAnswer(checkIn.id, "dismiss");
          return {
            type: "saved",
            message:
              "Understood — predictions are paused and nothing will be called late. Your history stays; turn tracking back on from the Cycle page whenever you like.",
          };
        case "dismiss":
          rememberAnswer(checkIn.id, "dismiss");
          return { type: "none" };
        case "snooze":
        default:
          rememberAnswer(checkIn.id, "snooze");
          return { type: "none" };
      }
    },
    [acceptLongCycles, add, remove, rememberAnswer, setMode, setPeriodEnd, setPeriodStart],
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
    settings,
    acceptLongCycles,
    mode,
    setMode,
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
