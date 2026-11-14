/**
 * Habits — the one place the Today page reads and toggles routines.
 *
 * Signed in: Supabase `habits` + `habit_logs` are the record, with optimistic
 * updates and a realtime subscription so a tick on the phone shows up on the
 * laptop. Signed out (or no Supabase config): the same shape lives in
 * localStorage, so the page is fully usable and nothing is invented.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { watchAuth } from "@/lib/supabase";
import { subscribeToHabitChanges } from "@/lib/home/habitRealtime";
import {
  HABITS_CHANGED,
  adjustHabitPoints,
  applyDraft,
  awardHabitPoints,
  deleteHabitRow,
  habitNameKey,
  isDuplicateHabit,
  revokeHabitPoints,
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
import { noteAccountBalance } from "@/hooks/useWallet";
import { UNDO_WINDOW_MS, type Undoable } from "@/lib/undo";
import {
  announcePointsChanged,
  habitPointKey,
  recordPointEvent,
  revokePointEvent,
} from "@/lib/points/ledger";

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

/* Session cache (P2-5, R15). The root remounts the page on every tab
   switch, and this hook's state dies with the mount — so a return to
   Today used to replay the skeleton and the full refetch before any
   content showed, while the URL had already moved. The last SETTLED
   account rows live here for the session instead: a warm remount
   renders them immediately and revalidates behind them. The PR #88
   contract is unchanged — a cold load (no cache entry for this
   profile) still holds the list empty behind the skeleton, and the
   device mirror still never renders as account rows. */
type HabitsSessionCache = {
  profileId: string;
  habits: Habit[];
  logs: HabitLog[];
  points: number | null;
};
let sessionCache: HabitsSessionCache | null = null;

/* The account this tab session has established, if any. Every hook
   instance opens its OWN watchAuth subscription, and a fresh
   subscription can report a transient signed-out while its session
   recovery races the token refresh (the race the rail identity hook's
   nullAnswerEndsSession guards against). PR #95 held a bare null only
   AFTER establishment — and the 2026-11-14 live re-check showed that
   was not enough: a warm return landing in a FRESH copy of this
   module's state (the owner hard-refreshed; a route chunk can carry
   its own copy) starts with nothing established, so its transient
   first null was honoured as signed-out, the mirror branch seeded the
   device record with loading=false, and Today painted the false empty
   state ("No habits yet", mirror-derived Overview numbers) for as
   long as the real account fetch took (~6s live). So now a bare null
   is held ALWAYS, before and after establishment: it is never proof
   of signed-out on its own. The session's real end is adjudicated by
   the root gate (useSession / AccessControl), which replaces the
   whole app and unmounts this hook with it, so holding a null cannot
   strand a signed-out person inside their account — with a database
   configured, a genuinely signed-out visitor meets the gate, not this
   hook's mirror. Device-only builds never reach the subscription at
   all: with no database the auth state is "off" and the mirror IS the
   record, exactly as before. */
let establishedProfileId: string | null = null;

/** Test seam: forget the session cache and the established account
 *  (the next load is a cold load, and the next auth answer counts). */
export function __resetHabitsSessionCache(): void {
  sessionCache = null;
  establishedProfileId = null;
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
  /** The account whose rows are currently in state, once its first load settled. */
  const signedInLoaded = useRef<string | null>(null);
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
    /*
     * watchAuth, not a bare supabase.auth call. The previous version put
     * onAuthStateChange OUTSIDE the .catch(), so with no project configured it
     * threw synchronously and killed this whole effect — auth never resolved,
     * habits never loaded, and the page showed "couldn't load your habits"
     * forever. See src/lib/supabase.ts.
     */
    let mounted = true;
    const stop = watchAuth((uid) => {
      if (!mounted) return;
      if (!uid) {
        /* A bare null — hold this instance's state exactly as it is.
           See the note on establishedProfileId: a null is never proof
           of signed-out on its own (transient before establishment,
           a neighbour's flicker after it), and the root gate, not this
           subscription, decides when the session has actually ended. */
        return;
      }
      establishedProfileId = uid;
      setProfileId(uid);
      setAuth("signed-in");
    });
    return () => {
      mounted = false;
      stop();
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

  /* load: the device mirror first (instant) when it IS the record, the
     account first when it is — never the mirror dressed up as account rows.
     On a signed-in cold load the mirror is stale by definition (habits
     deleted, renamed or ticked on another device since this device last
     synced), and rendering it first is the defaults-flash: rows that are
     not the account's flash on screen, then get replaced. So while signed
     in, the list stays empty behind the skeleton until the account answers
     (success or error). The mirror is still read inside the fetch below,
     for the upload-local-habits path — this only governs what renders. */
  useEffect(() => {
    if (auth === "checking") return;
    if (auth !== "signed-in" || !profileId) {
      /* Device mode (no database — auth "off"): the device mirror IS
         the record, so it renders instantly. With a database configured
         this branch is not how signed-out arrives: a bare null is held
         in the auth subscription above, and a genuine sign-out is
         adjudicated by the root gate, which unmounts the app. The
         session cache is NOT cleared here: it is keyed by profile and
         only ever read back for that same profile, so one instance
         landing in this branch must not destroy the warm return of an
         account that is, in fact, still signed in — that destruction
         is what turned Profile → Today into a cold load flashing a
         false empty state in the 2026-11-14 sweep. */
      signedInLoaded.current = null;
      hydrated.current = true;
      setHabits(loadLocalHabits());
      setLogs(loadLocalLogs());
      setLoading(false);
      return;
    }
    /* Warm return (R15): this mount has not loaded the account yet, but
       the session cache holds its last settled rows — render those now
       and let the fetch below reconcile, instead of skeleton + wait. */
    if (
      signedInLoaded.current !== profileId &&
      sessionCache?.profileId === profileId
    ) {
      setHabits(sessionCache.habits);
      setLogs(sessionCache.logs);
      setPoints(sessionCache.points);
      setLoading(false);
      signedInLoaded.current = profileId;
    }
    const cold = signedInLoaded.current !== profileId;
    if (cold) {
      hydrated.current = true;
      setHabits([]);
      setLogs([]);
      setLoading(true);
    }
    let mounted = true;
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
        /* Only a settled fetch counts: an error leaves the account unloaded,
           so a retry (refresh, realtime) is a cold load again — empty list
           behind the skeleton, not the mirror and not a stale empty state. */
        signedInLoaded.current = profileId;
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

  /* Keep the session cache in step with the settled account rows, so
     ticks and edits made on this mount are what a warm remount seeds
     (R15). Only a settled profile writes — a cold load in flight must
     never cache its empty list. */
  useEffect(() => {
    if (
      auth === "signed-in" &&
      profileId &&
      signedInLoaded.current === profileId
    ) {
      sessionCache = { profileId, habits, logs, points };
    }
  }, [auth, profileId, habits, logs, points]);

  /* realtime: another device ticks a habit → this ring moves. Multiple
     consumers use this hook on the same screen, so the helper shares one
     Supabase channel instead of adding callbacks after it has subscribed. */
  useEffect(() => {
    if (auth !== "signed-in" || !profileId) return;
    return subscribeToHabitChanges(profileId, () => setReload((r) => r + 1));
  }, [auth, profileId]);

  /*
   * Other tabs, another hook instance and the coach all write the same
   * mirror. In device mode, re-reading the mirror is enough; signed in,
   * the account is the record, so a structural change asks the loader to
   * run again. Debounced so a page with several habit consumers makes
   * one call. While auth is still "checking" the event is IGNORED: the
   * mirror must never seed this instance before the auth answer lands
   * (the loader owns that window) — treating "checking" as device mode
   * here painted mirror rows on a signed-in mount whose account fetch
   * was still in flight.
   */
  useEffect(() => {
    let timer: number | undefined;
    const onExternal = () => {
      if (auth === "checking") return;
      if (auth !== "signed-in") {
        setHabits(loadLocalHabits());
        setLogs(loadLocalLogs());
        return;
      }
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setReload((r) => r + 1), 250);
    };
    window.addEventListener(HABITS_CHANGED, onExternal);
    window.addEventListener("storage", onExternal);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener(HABITS_CHANGED, onExternal);
      window.removeEventListener("storage", onExternal);
    };
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
      const pointKey = habitPointKey(habitId, date);
      const nowIso = new Date().toISOString();
      const nextLogs = wasDone
        ? logs.filter((l) => !(l.habitId === habitId && l.date === date))
        : [...logs, { habitId, date, completedAt: nowIso }];
      // optimistic — the ring moves before the network does
      setLogs(nextLogs);
      saveLocal(habits, nextLogs);
      /* The device ledger always records the receipt — even signed in, and
         even for a habit that only exists on this device. The account balance
         is still the server's to write. */
      const recordLocal = () => {
        if (wasDone) {
          revokePointEvent(pointKey);
          announcePointsChanged();
          return;
        }
        const event = recordPointEvent({
          key: pointKey,
          points: habit.points,
          kind: "habit",
          label: habit.name,
          refId: habitId,
          at: `${date}T12:00:00.000Z`,
        });
        if (!event) announcePointsChanged();
      };

      if (auth !== "signed-in" || !profileId || isLocalHabitId(habitId)) {
        recordLocal();
        return;
      }
      try {
        if (wasDone) {
          await deleteLog(profileId, habitId, date);
          /* Both the primary revoke and the fallback move the balance only
             together with the award's ledger row — never one without the
             other. If neither function exists on the project, the balance
             is left alone rather than adjusted without a receipt. */
          const result =
            (await revokeHabitPoints(profileId, habitId, date)) ??
            (await adjustHabitPoints(profileId, habitId, date, -habit.points));
          if (result) {
            setPoints(result.balance);
            noteAccountBalance(result.balance);
          }
        } else {
          await insertLog(profileId, habitId, date);
          const result =
            (await awardHabitPoints(profileId, habitId, date, habit.points)) ??
            (await adjustHabitPoints(profileId, habitId, date, habit.points));
          if (result) {
            setPoints(result.balance);
            noteAccountBalance(result.balance);
          }
        }
        recordLocal();
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
      const name = draft.name.trim();
      if (!name) return;
      /*
       * Idempotent by name. The coach, the Today page and the Trackers page
       * all create habits, and the old paths could each insert their own row
       * (and the coach also mirrored a device copy, which was uploaded later
       * as a *second* row). A duplicate name now resolves to the habit that
       * already exists instead of creating another one.
       */
      const key = habitNameKey(name);
      const existing = habitsRef.current.find(
        (habit) => !habit.archived && habitNameKey(habit.name) === key,
      );
      if (existing) return;

      if (auth === "signed-in" && profileId) {
        try {
          const habit = await insertHabit(profileId, { ...draft, name });
          setHabits((prev) => {
            const next = [...prev.filter((h) => h.id !== habit.id), habit];
            saveLocal(next, logs);
            return next;
          });
          window.dispatchEvent(new Event(HABITS_CHANGED));
        } catch (error) {
          /* The database's unique index caught a race with another tab or
             another device. Refresh so this view shows the surviving habit. */
          if (isDuplicateHabit(error)) {
            setError("You already have a habit with that name.");
            setReload((r) => r + 1);
            return;
          }
          throw error;
        }
        return;
      }
      const habit = draftToLocalHabit({ ...draft, name });
      setHabits((prev) => {
        const next = [...prev, habit];
        saveLocal(next, logs);
        return next;
      });
      window.dispatchEvent(new Event(HABITS_CHANGED));
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
      const key = habitNameKey(draft.name);
      const collision = habitsRef.current.find(
        (h) => h.id !== habitId && !h.archived && habitNameKey(h.name) === key,
      );
      if (collision) {
        setError("Another habit already uses that name.");
        return;
      }
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
        window.dispatchEvent(new Event(HABITS_CHANGED));
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
