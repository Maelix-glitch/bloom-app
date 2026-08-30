/**
 * State for the daily trackers: loads from this browser, keeps every view in
 * sync, and recomputes the analysis whenever a day or a goal changes.
 *
 * Nothing here owns logic — that lives in core.ts. This hook is storage plus
 * React.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { todayKey } from "@/lib/cycle/predict";
import {
  DEFAULT_GOALS,
  analyzeTrackers,
  isEmptyDay,
  validateDay,
  type DayEntry,
  type DayFieldErrors,
  type Goals,
  type TrackerAnalysis,
} from "@/lib/trackers/core";
import {
  currentProfileId,
  deleteDay,
  hasCloud,
  mergeDayLists,
  pullDays,
  pushDay,
} from "@/lib/trackers/trackerCloud";
import {
  clearDays,
  loadDays,
  loadGoals,
  saveDays,
  saveGoals,
  TRACKERS_CHANGED,
} from "@/lib/trackers/store";

export type SaveDayResult = { ok: true } | { ok: false; errors: DayFieldErrors };

/** Where a day currently lives. Shown on the page, never as an error state. */
export type TrackerSyncState = "off" | "loading" | "signed-out" | "saved" | "pending" | "error";

export interface TrackerSyncStatus {
  state: TrackerSyncState;
  message: string;
  signedIn: boolean;
}

export interface TrackerStore {
  /** Whether these days are on the account, on the device, or on their way up. */
  sync: TrackerSyncStatus;
  /** Pull the table again and reconcile. Safe to call at any time. */
  syncNow: () => void;
  days: DayEntry[];
  goals: Goals;
  analysis: TrackerAnalysis;
  today: string;
  hydrated: boolean;
  saveDay: (draft: DayEntry) => SaveDayResult;
  removeDay: (date: string) => void;
  clearAll: () => void;
  setGoal: (key: keyof Goals, value: number) => void;
  resetGoals: () => void;
}

export function useTrackers(): TrackerStore {
  const [days, setDays] = useState<DayEntry[]>([]);
  const [goals, setGoals] = useState<Goals>(() => ({ ...loadGoals() }));
  const [today, setToday] = useState<string>(() => todayKey());
  const [hydrated, setHydrated] = useState(false);
  const skipPersist = useRef(true);
  const skipGoalPersist = useRef(true);
  const [sync, setSync] = useState<TrackerSyncStatus>({
    state: "off",
    message: "",
    signedIn: false,
  });
  const profileId = useRef<string | null>(null);
  /** Dates the device holds that the table hasn't seen yet. */
  const dirtyDates = useRef<Set<string>>(new Set());
  const deletedDates = useRef<Set<string>>(new Set());
  const syncing = useRef(false);
  const daysRef = useRef<DayEntry[]>(days);
  daysRef.current = days;

  /* read once on mount, then follow other instances of the hook */
  useEffect(() => {
    const read = () => {
      setDays(loadDays());
      setToday(todayKey());
      setHydrated(true);
    };
    read();
    const onExternal = () => setDays(loadDays());
    window.addEventListener(TRACKERS_CHANGED, onExternal);
    window.addEventListener("storage", onExternal);
    return () => {
      window.removeEventListener(TRACKERS_CHANGED, onExternal);
      window.removeEventListener("storage", onExternal);
    };
  }, []);

  /* roll the date over at midnight, or when the tab comes back */
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

  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    if (!hydrated) return;
    saveDays(days);
  }, [days, hydrated]);

  useEffect(() => {
    if (skipGoalPersist.current) {
      skipGoalPersist.current = false;
      return;
    }
    if (!hydrated) return;
    saveGoals(goals);
  }, [goals, hydrated]);

  const saveDay = useCallback((draft: DayEntry): SaveDayResult => {
    const errors = validateDay(draft, todayKey());
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    setDays((prev) => {
      const next = prev.filter((d) => d.date !== draft.date);
      if (!isEmptyDay(draft)) next.push({ ...draft, updatedAt: new Date().toISOString() });
      return next.sort((a, b) => a.date.localeCompare(b.date));
    });
    deletedDates.current.delete(draft.date);
    dirtyDates.current.add(draft.date);
    return { ok: true };
  }, []);

  const removeDay = useCallback((date: string) => {
    setDays((prev) => {
      if (prev.some((d) => d.date === date)) deletedDates.current.add(date);
      return prev.filter((d) => d.date !== date);
    });
    dirtyDates.current.delete(date);
  }, []);

  const clearAll = useCallback(() => {
    setDays((prev) => {
      for (const d of prev) deletedDates.current.add(d.date);
      return [];
    });
    dirtyDates.current.clear();
    clearDays();
  }, []);

  const setGoal = useCallback((key: keyof Goals, value: number) => {
    setGoals((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetGoals = useCallback(() => {
    setGoals({ ...DEFAULT_GOALS });
  }, []);

  /* ------------------------------ cloud sync ------------------------------ */

  const pushPending = useCallback(async () => {
    const pid = profileId.current;
    if (!pid || syncing.current) return;
    const pushes = [...dirtyDates.current]
      .map((date) => daysRef.current.find((d) => d.date === date) ?? null)
      .filter((d): d is DayEntry => d !== null);
    const removals = [...deletedDates.current];
    if (pushes.length === 0 && removals.length === 0) return;

    syncing.current = true;
    dirtyDates.current.clear();
    deletedDates.current.clear();
    setSync((prev) => ({ ...prev, state: "pending", message: "Saving to your account…" }));
    try {
      for (const day of pushes) await pushDay(pid, day);
      for (const date of removals) await deleteDay(pid, date);
      setSync({ state: "saved", message: "Saved to your account.", signedIn: true });
    } catch {
      /* put them back so the next attempt retries instead of losing them */
      for (const day of pushes) dirtyDates.current.add(day.date);
      for (const date of removals) deletedDates.current.add(date);
      setSync({
        state: "error",
        message: "Couldn't reach your account — these days are safe on this device.",
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
          message: "No database connected in this build — days stay on this device.",
          signedIn: false,
        });
        return;
      }
      setSync((prev) => ({ ...prev, state: "loading", message: "Fetching your record…" }));
      try {
        const pid = await currentProfileId();
        profileId.current = pid;
        if (!pid) {
          setSync({
            state: "signed-out",
            message: "Not signed in — days are saved on this device only.",
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

  /* pull once, after the device has been read */
  useEffect(() => {
    if (!hydrated) return;
    syncNow();
  }, [hydrated, syncNow]);

  /* flush whatever changed, a beat after the last edit */
  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => void pushPending(), 700);
    return () => window.clearTimeout(id);
  }, [days, hydrated, pushPending]);

  const analysis = useMemo(() => analyzeTrackers(days, goals, today), [days, goals, today]);

  return {
    sync,
    syncNow,
    days: useMemo(() => [...days].sort((a, b) => b.date.localeCompare(a.date)), [days]),
    goals,
    analysis,
    today,
    hydrated,
    saveDay,
    removeDay,
    clearAll,
    setGoal,
    resetGoals,
  };
}
