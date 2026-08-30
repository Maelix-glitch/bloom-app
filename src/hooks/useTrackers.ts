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
  clearDays,
  loadDays,
  loadGoals,
  saveDays,
  saveGoals,
  TRACKERS_CHANGED,
} from "@/lib/trackers/store";

export type SaveDayResult = { ok: true } | { ok: false; errors: DayFieldErrors };

export interface TrackerStore {
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
      if (!isEmptyDay(draft)) next.push(draft);
      return next.sort((a, b) => a.date.localeCompare(b.date));
    });
    return { ok: true };
  }, []);

  const removeDay = useCallback((date: string) => {
    setDays((prev) => prev.filter((d) => d.date !== date));
  }, []);

  const clearAll = useCallback(() => {
    setDays([]);
    clearDays();
  }, []);

  const setGoal = useCallback((key: keyof Goals, value: number) => {
    setGoals((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetGoals = useCallback(() => {
    setGoals({ ...DEFAULT_GOALS });
  }, []);

  const analysis = useMemo(() => analyzeTrackers(days, goals, today), [days, goals, today]);

  return {
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
