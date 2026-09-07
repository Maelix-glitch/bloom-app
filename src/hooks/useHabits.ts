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
  applyDraft,
  deleteHabitRow,
  deleteLog,
  draftToLocalHabit,
  fetchHabits,
  fetchLogs,
  LOG_WINDOW_DAYS,
  hasHabitCloud,
  insertHabit,
  insertLog,
  isDueOn,
  isLocalHabitId,
  isPausedOn,
  isWeekly,
  loadLocalHabits,
  loadLocalLogs,
  patchHabit,
  PauseColumnsMissing,
  readPoints,
  saveLocal,
  updateHabit,
  uploadLocalHabits,
  weeklyProgress,
  type Habit,
  type HabitDraft,
  type HabitLog,
} from "@/lib/home/habits";
import { shiftDay, todayLocal } from "@/lib/localDay";
import { UNDO_WINDOW_MS, type Undoable } from "@/lib/undo";

export type HabitsAuth = "checking" | "signed-out" | "signed-in" | "off";

export interface HabitToday extends Habit {
  done: boolean;
  doneAt: string | null;
  due: boolean;
  /** "N× a week" habits: how the week is going. Null for daily/custom. */
  week: { done: number; target: number } | null;
  /**
   * Yesterday's date when a streak is at risk: the day before was ticked,
   * yesterday was due and is NOT ticked — the tick was probably forgotten
   * before bed. Null otherwise (already ticked, not due, weekly habits, or
   * no streak to keep). Any day in the last week can still be ticked from
   * the row menu.
   */
  missedYesterday: string | null;
}

/** How far back a tick can be placed (inclusive of today). */
export const BACKFILL_DAYS = 7;

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
  /**
   * Tick or untick a habit. `date` defaults to today; any local day within the
   * last `BACKFILL_DAYS` is accepted — the same insert/delete, just dated.
   */
  toggle: (habitId: string, date?: string) => Promise<void>;
  addHabit: (draft: HabitDraft) => Promise<void>;
  /** Change anything about a habit. Id and history are kept. */
  editHabit: (habitId: string, draft: HabitDraft) => Promise<void>;
  /** Neutral days from today through `until` (inclusive). Streaks survive. */
  pauseHabit: (habitId: string, until: string) => Promise<void>;
  resumeHabit: (habitId: string) => Promise<void>;
  /** Out of the day, history kept, restorable from the archive. */
  archiveHabit: (habitId: string) => Promise<void>;
  restoreHabit: (habitId: string) => Promise<void>;
  /** Gone for good once the undo window closes. */
  deleteHabit: (habitId: string) => Promise<void>;
  /** Habits that are paused today or archived — for the "manage" view. */
  pausedHabits: Habit[];
  archivedHabits: Habit[];
  /** The last archive / delete, while it can still be taken back. */
  undoable: Undoable | null;
  undo: () => void;
  dismissUndo: () => void;
  refresh: () => void;
}

const localDate = (d = new Date()) => todayLocal(d);

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
  const habitsRef = useRef<Habit[]>(habits);
  habitsRef.current = habits;
  const logsRef = useRef<HabitLog[]>(logs);
  logsRef.current = logs;
  /* archive / delete keep a snapshot for a moment */
  const [undoable, setUndoable] = useState<Undoable | null>(null);
  const undoSeq = useRef(0);
  const snapshot = useRef<{
    id: number;
    habit: Habit;
    logs: HabitLog[];
    /** what to do on the account if the window closes without an undo */
    commit: (() => Promise<void>) | null;
  } | null>(null);

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
        /* habits made before signing in join the account instead of
           disappearing — every one of them, with every tick. The device
           mirror is the source here: on a cold signed-in load the React
           state hasn't caught up with it yet. */
        const mirrorHabits = loadLocalHabits();
        const mirrorLogs = loadLocalLogs();
        const localOnly = mirrorHabits.filter((h) => isLocalHabitId(h.id));
        let carried: Habit[] = [];
        let carriedLogs: HabitLog[] = [];
        let keptLocal: Habit[] = [];
        let keptLocalLogs: HabitLog[] = [];
        if (localOnly.length > 0) {
          const moved = await uploadLocalHabits(profileId, localOnly, mirrorLogs);
          const replaced = new Set(moved.replacedIds);
          carried = moved.uploaded;
          carriedLogs = moved.logs;
          keptLocal = localOnly.filter((h) => !replaced.has(h.id));
          const keptIds = new Set(keptLocal.map((h) => h.id));
          keptLocalLogs = mirrorLogs.filter((l) => keptIds.has(l.habitId));
          if (moved.failed > 0 && mounted) {
            setError(
              `${moved.failed} ${moved.failed === 1 ? "habit" : "habits"} from this device couldn't be moved to your account yet — they're still here and will be retried.`,
            );
          }
        }
        const [remoteHabits, remoteLogs, pts] = await Promise.all([
          fetchHabits(profileId),
          fetchLogs(profileId, daysAgo(LOG_WINDOW_DAYS)),
          readPoints(profileId),
        ]);
        if (!mounted) return;
        const known = new Set(remoteHabits.map((h) => h.id));
        const nextHabits = [
          ...remoteHabits,
          ...carried.filter((h) => !known.has(h.id)),
          ...keptLocal,
        ];
        const logKey = (l: HabitLog) => `${l.habitId}|${l.date}`;
        const seen = new Set(remoteLogs.map(logKey));
        const nextLogs = [
          ...remoteLogs,
          ...[...carriedLogs, ...keptLocalLogs].filter((l) => !seen.has(logKey(l))),
        ];
        setHabits(nextHabits);
        setLogs(nextLogs);
        setPoints(pts);
        saveLocal(nextHabits, nextLogs);
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
    const yesterday = shiftDay(today, -1);
    const dayBefore = shiftDay(today, -2);
    const doneYesterday = new Set<string>();
    const doneDayBefore = new Set<string>();
    for (const l of logs) {
      if (l.date === today) doneMap.set(l.habitId, l.completedAt);
      else if (l.date === yesterday) doneYesterday.add(l.habitId);
      else if (l.date === dayBefore) doneDayBefore.add(l.habitId);
    }
    return habits
      .filter((h) => isDueOn(h, today, logs))
      .map((h) => {
        const week = isWeekly(h) ? weeklyProgress(h, logs, today) : null;
        const streakAtRisk =
          !week &&
          doneDayBefore.has(h.id) &&
          !doneYesterday.has(h.id) &&
          isDueOn(h, yesterday, logs);
        const missedYesterday = streakAtRisk ? yesterday : null;
        return {
          ...h,
          due: true,
          done: doneMap.has(h.id),
          doneAt: doneMap.get(h.id) ?? null,
          week: week ? { done: week.done, target: week.target } : null,
          missedYesterday,
        };
      });
  }, [habits, logs, today]);

  const pausedHabits = useMemo(
    () => habits.filter((h) => !h.archived && isPausedOn(h, today)),
    [habits, today],
  );
  const archivedHabits = useMemo(() => habits.filter((h) => h.archived), [habits]);

  const completedToday = todayHabits.filter((h) => h.done).length;
  const dueToday = todayHabits.length;

  const toggle = useCallback(
    async (habitId: string, date: string = today) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      /* only the recent past: never the future, never months back */
      if (date > today || date < shiftDay(today, -(BACKFILL_DAYS - 1))) return;
      const wasDone = logs.some((l) => l.habitId === habitId && l.date === date);
      const nowIso = new Date().toISOString();
      const nextLogs = wasDone
        ? logs.filter((l) => !(l.habitId === habitId && l.date === date))
        : [...logs, { habitId, date, completedAt: nowIso }];
      // optimistic — the ring moves before the network does
      setLogs(nextLogs);
      saveLocal(habits, nextLogs);
      if (auth !== "signed-in" || !profileId || isLocalHabitId(habitId)) return;
      try {
        if (wasDone) await deleteLog(profileId, habitId, date);
        else await insertLog(profileId, habitId, date);
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

  /** Replace one habit in the list and mirror it. */
  const putHabit = useCallback((next: Habit) => {
    const prev = habitsRef.current;
    const list = prev.some((h) => h.id === next.id)
      ? prev.map((h) => (h.id === next.id ? next : h))
      : [...prev, next];
    habitsRef.current = list;
    setHabits(list);
    saveLocal(list, logsRef.current);
  }, []);

  const editHabit = useCallback(
    async (habitId: string, draft: HabitDraft) => {
      const habit = habitsRef.current.find((h) => h.id === habitId);
      if (!habit || !draft.name.trim()) return;
      const optimistic = applyDraft(habit, draft);
      putHabit(optimistic);
      if (auth !== "signed-in" || !profileId || isLocalHabitId(habitId)) return;
      try {
        const saved = await updateHabit(profileId, habitId, draft);
        putHabit({
          ...saved,
          archived: habit.archived,
          pausedFrom: habit.pausedFrom,
          pausedUntil: habit.pausedUntil,
        });
      } catch (e) {
        console.warn("[bloom:habits] edit:", e);
        putHabit(habit);
        setError("That change didn't reach your account. Try again in a moment.");
        throw e;
      }
    },
    [auth, profileId, putHabit],
  );

  const setPause = useCallback(
    async (habitId: string, from: string | null, until: string | null) => {
      const habit = habitsRef.current.find((h) => h.id === habitId);
      if (!habit) return;
      putHabit({ ...habit, pausedFrom: from, pausedUntil: until });
      if (auth !== "signed-in" || !profileId || isLocalHabitId(habitId)) return;
      try {
        await patchHabit(profileId, habitId, { pausedFrom: from, pausedUntil: until });
      } catch (e) {
        console.warn("[bloom:habits] pause:", e);
        if (e instanceof PauseColumnsMissing) {
          /* the pause holds on this device; the account learns it once the
             migration has been run and the habit is saved again */
          setError(
            "Paused on this device. To keep pauses on your account, run the habit_pause migration once.",
          );
          return;
        }
        putHabit(habit);
        setError("That change didn't reach your account. Try again in a moment.");
      }
    },
    [auth, profileId, putHabit],
  );

  const pauseHabit = useCallback(
    (habitId: string, until: string) => setPause(habitId, today, until < today ? today : until),
    [setPause, today],
  );
  const resumeHabit = useCallback((habitId: string) => setPause(habitId, null, null), [setPause]);

  /* ------------------------------- undo ---------------------------------- */

  const keepForUndo = useCallback(
    (habit: Habit, message: string, commit: (() => Promise<void>) | null) => {
      const id = ++undoSeq.current;
      snapshot.current = {
        id,
        habit,
        logs: logsRef.current.filter((l) => l.habitId === habit.id),
        commit,
      };
      setUndoable({ id, message, until: Date.now() + UNDO_WINDOW_MS });
    },
    [],
  );

  const settle = useCallback((id: number) => {
    const snap = snapshot.current;
    if (!snap || snap.id !== id) return;
    snapshot.current = null;
    setUndoable((u) => (u && u.id === id ? null : u));
    if (snap.commit) {
      void snap.commit().catch((e) => {
        console.warn("[bloom:habits] commit after undo window:", e);
        setError("That change didn't reach your account. It will show again on refresh.");
      });
    }
  }, []);

  /* the window closes by itself — and the account change happens then */
  useEffect(() => {
    if (!undoable) return;
    const ms = Math.max(0, undoable.until - Date.now());
    const t = window.setTimeout(() => settle(undoable.id), ms);
    return () => window.clearTimeout(t);
  }, [undoable, settle]);

  const undo = useCallback(() => {
    const snap = snapshot.current;
    if (!snap) return;
    snapshot.current = null;
    setUndoable(null);
    const have = new Set(logsRef.current.map((l) => `${l.habitId}|${l.date}`));
    const back = snap.logs.filter((l) => !have.has(`${l.habitId}|${l.date}`));
    const nextLogs = [...logsRef.current, ...back];
    const nextHabits = habitsRef.current.some((h) => h.id === snap.habit.id)
      ? habitsRef.current.map((h) => (h.id === snap.habit.id ? snap.habit : h))
      : [...habitsRef.current, snap.habit];
    logsRef.current = nextLogs;
    habitsRef.current = nextHabits;
    setLogs(nextLogs);
    setHabits(nextHabits);
    saveLocal(nextHabits, nextLogs);
  }, []);

  const dismissUndo = useCallback(() => {
    if (snapshot.current) settle(snapshot.current.id);
  }, [settle]);

  const archiveHabit = useCallback(
    async (habitId: string) => {
      const habit = habitsRef.current.find((h) => h.id === habitId);
      if (!habit || habit.archived) return;
      // anything still undoable is settled first — one thing at a time
      if (snapshot.current) settle(snapshot.current.id);
      putHabit({ ...habit, archived: true });
      const remote =
        auth === "signed-in" && profileId && !isLocalHabitId(habitId)
          ? () => patchHabit(profileId, habitId, { archived: true })
          : null;
      keepForUndo(habit, `Archived "${habit.name}". Its history is kept.`, remote);
    },
    [auth, keepForUndo, profileId, putHabit, settle],
  );

  const restoreHabit = useCallback(
    async (habitId: string) => {
      const habit = habitsRef.current.find((h) => h.id === habitId);
      if (!habit || !habit.archived) return;
      putHabit({ ...habit, archived: false });
      if (auth !== "signed-in" || !profileId || isLocalHabitId(habitId)) return;
      try {
        await patchHabit(profileId, habitId, { archived: false });
      } catch (e) {
        console.warn("[bloom:habits] restore:", e);
        putHabit(habit);
        setError("That change didn't reach your account. Try again in a moment.");
      }
    },
    [auth, profileId, putHabit],
  );

  const deleteHabit = useCallback(
    async (habitId: string) => {
      const habit = habitsRef.current.find((h) => h.id === habitId);
      if (!habit) return;
      if (snapshot.current) settle(snapshot.current.id);
      const ownLogs = logsRef.current.filter((l) => l.habitId === habitId);
      const nextHabits = habitsRef.current.filter((h) => h.id !== habitId);
      const nextLogs = logsRef.current.filter((l) => l.habitId !== habitId);
      habitsRef.current = nextHabits;
      logsRef.current = nextLogs;
      setHabits(nextHabits);
      setLogs(nextLogs);
      saveLocal(nextHabits, nextLogs);
      const remote =
        auth === "signed-in" && profileId && !isLocalHabitId(habitId)
          ? () => deleteHabitRow(profileId, habitId)
          : null;
      keepForUndo(
        habit,
        `Deleted "${habit.name}"${ownLogs.length ? ` and ${ownLogs.length} ${ownLogs.length === 1 ? "tick" : "ticks"}` : ""}.`,
        remote,
      );
    },
    [auth, keepForUndo, profileId, settle],
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
    editHabit,
    pauseHabit,
    resumeHabit,
    archiveHabit,
    restoreHabit,
    deleteHabit,
    pausedHabits,
    archivedHabits,
    undoable,
    undo,
    dismissUndo,
    refresh,
  };
}
