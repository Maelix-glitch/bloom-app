/**
 * Habits — the one place the Today page reads and toggles routines.
 *
 * Signed in: Supabase `habits` + `habit_logs` are the record, with optimistic
 * updates and a realtime subscription so a tick on the phone shows up on the
 * laptop. Signed out (or no Supabase config): the same shape lives in
 * localStorage, so the page is fully usable and nothing is invented.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import {
  HABITS_CHANGED,
  adjustPoints,
  deleteLog,
  draftToLocalHabit,
  fetchHabits,
  fetchLogs,
  hasHabitCloud,
  insertHabit,
  insertLog,
  isDueOn,
  loadLocalHabits,
  loadLocalLogs,
  readPoints,
  saveLocal,
  type Habit,
  type HabitDraft,
  type HabitLog,
} from "@/lib/home/habits";

export type HabitsAuth = "checking" | "signed-out" | "signed-in" | "off";

export interface HabitToday extends Habit {
  done: boolean;
  doneAt: string | null;
  due: boolean;
}

export interface HabitsStore {
  auth: HabitsAuth;
  profileId: string | null;
  loading: boolean;
  error: string | null;
  habits: Habit[];
  logs: HabitLog[];
  today: string;
  /** Habits due today, with completion state. */
  todayHabits: HabitToday[];
  completedToday: number;
  dueToday: number;
  /** 0–1. 0 when nothing is due. */
  completion: number;
  points: number | null;
  toggle: (habitId: string) => Promise<void>;
  addHabit: (draft: HabitDraft) => Promise<void>;
  refresh: () => void;
}

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDate(d);
};

export function useHabits(): HabitsStore {
  const [auth, setAuth] = useState<HabitsAuth>("checking");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState(() => localDate());
  const [reload, setReload] = useState(0);
  const hydrated = useRef(false);

  /* session */
  useEffect(() => {
    if (!hasHabitCloud()) {
      setAuth("off");
      return;
    }
    let mounted = true;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const uid = data.session?.user.id ?? null;
        setProfileId(uid);
        setAuth(uid ? "signed-in" : "signed-out");
      })
      .catch(() => {
        if (mounted) setAuth("signed-out");
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const uid = session?.user.id ?? null;
      setProfileId(uid);
      setAuth(uid ? "signed-in" : "signed-out");
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* midnight rollover + tab return */
  useEffect(() => {
    const tick = () => setToday(localDate());
    const id = window.setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  /* load: local first (instant), then the account */
  useEffect(() => {
    if (auth === "checking") return;
    if (!hydrated.current) {
      hydrated.current = true;
      setHabits(loadLocalHabits());
      setLogs(loadLocalLogs());
    }
    if (auth !== "signed-in" || !profileId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [remoteHabits, remoteLogs, pts] = await Promise.all([
          fetchHabits(profileId),
          fetchLogs(profileId, daysAgo(45)),
          readPoints(profileId),
        ]);
        if (!mounted) return;
        setHabits(remoteHabits);
        setLogs(remoteLogs);
        setPoints(pts);
        saveLocal(remoteHabits, remoteLogs);
      } catch (e) {
        console.warn("[bloom:habits] load:", e);
        if (mounted) setError("Your habits couldn't be loaded from your account just now.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [auth, profileId, reload]);

  /* realtime: another device ticks a habit → this ring moves */
  useEffect(() => {
    if (auth !== "signed-in" || !profileId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`bloom-home-habits-${profileId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "habit_logs",
            filter: `profile_id=eq.${profileId}`,
          },
          () => setReload((r) => r + 1),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "habits", filter: `profile_id=eq.${profileId}` },
          () => setReload((r) => r + 1),
        )
        .subscribe();
    } catch (e) {
      console.warn("[bloom:habits] realtime unavailable:", e);
    }
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [auth, profileId]);

  /* other tabs / the coach mirror */
  useEffect(() => {
    if (auth === "signed-in") return;
    const onExternal = () => {
      setHabits(loadLocalHabits());
      setLogs(loadLocalLogs());
    };
    window.addEventListener("storage", onExternal);
    return () => window.removeEventListener("storage", onExternal);
  }, [auth]);

  const todayHabits = useMemo<HabitToday[]>(() => {
    const doneMap = new Map<string, string>();
    for (const l of logs) if (l.date === today) doneMap.set(l.habitId, l.completedAt);
    return habits
      .filter((h) => isDueOn(h, today))
      .map((h) => ({
        ...h,
        due: true,
        done: doneMap.has(h.id),
        doneAt: doneMap.get(h.id) ?? null,
      }));
  }, [habits, logs, today]);

  const completedToday = todayHabits.filter((h) => h.done).length;
  const dueToday = todayHabits.length;

  const toggle = useCallback(
    async (habitId: string) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      const wasDone = logs.some((l) => l.habitId === habitId && l.date === today);
      const nowIso = new Date().toISOString();
      const nextLogs = wasDone
        ? logs.filter((l) => !(l.habitId === habitId && l.date === today))
        : [...logs, { habitId, date: today, completedAt: nowIso }];
      // optimistic — the ring moves before the network does
      setLogs(nextLogs);
      saveLocal(habits, nextLogs);
      if (auth !== "signed-in" || !profileId || habitId.startsWith("local-")) return;
      try {
        if (wasDone) await deleteLog(profileId, habitId, today);
        else await insertLog(profileId, habitId, today);
        const pts = await adjustPoints(profileId, wasDone ? -habit.points : habit.points);
        if (pts !== null) setPoints(pts);
      } catch (e) {
        console.warn("[bloom:habits] toggle:", e);
        setLogs(logs);
        saveLocal(habits, logs);
        setError("That tick didn't reach your account. Try again in a moment.");
      }
    },
    [auth, habits, logs, profileId, today],
  );

  const addHabit = useCallback(
    async (draft: HabitDraft) => {
      if (!draft.name.trim()) return;
      if (auth === "signed-in" && profileId) {
        const habit = await insertHabit(profileId, draft);
        setHabits((prev) => {
          const next = [...prev.filter((h) => h.id !== habit.id), habit];
          saveLocal(next, logs);
          return next;
        });
        return;
      }
      const habit = draftToLocalHabit(draft);
      setHabits((prev) => {
        const next = [...prev, habit];
        saveLocal(next, logs);
        return next;
      });
    },
    [auth, logs, profileId],
  );

  const refresh = useCallback(() => setReload((r) => r + 1), []);

  // keep the Coach's mirror warm even when nothing changes here
  useEffect(() => {
    if (!hydrated.current) return;
    const onChanged = () => {
      /* no-op: this hook is the writer; listeners elsewhere may re-read */
    };
    window.addEventListener(HABITS_CHANGED, onChanged);
    return () => window.removeEventListener(HABITS_CHANGED, onChanged);
  }, []);

  return {
    auth,
    profileId,
    loading,
    error,
    habits,
    logs,
    today,
    todayHabits,
    completedToday,
    dueToday,
    completion: dueToday === 0 ? 0 : completedToday / dueToday,
    points,
    toggle,
    addHabit,
    refresh,
  };
}
