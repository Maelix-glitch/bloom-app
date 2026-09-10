/**
 * useProgression — the front door to the journey.
 *
 * Assembles the real records (habits + logs, tracker days, mood entries, the
 * earned-point balance) into a `ProgressionSnapshot`, and performs awards.
 *
 * Award path, in order:
 *   1. the goal is verified against real records (client engine);
 *   2. signed in, the server re-verifies and awards atomically through
 *      `award_progress()` — it is the authority, and the only writer of
 *      `profiles.total_points`;
 *   3. signed out (or no database), the same verification runs locally and the
 *      ledger records the award in the shared preferences document, so the
 *      page stays honest and complete;
 *   4. the local ledger mirrors the award, which is what makes a second click,
 *      a refresh or a second tab a no-op.
 *
 * The balance is never written from here. `refreshPoints()` re-reads
 * `profiles.total_points` after an award so the number on screen is the
 * account's, not a guess.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useHabits, type HabitsStore } from "@/hooks/useHabits";
import { useTrackers } from "@/hooks/useTrackers";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import { todayLocal, shiftDay } from "@/lib/localDay";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { readPoints } from "@/lib/home/habits";
import {
  buildSnapshot,
  evaluateAchievements,
  evaluateGoals,
  goalTarget,
  moodDayOf,
  resolveSpec,
} from "@/lib/progression/evaluate";
import { ACHIEVEMENTS } from "@/lib/progression/achievements";
import { rankFor } from "@/lib/progression/ranks";
import {
  achievedAtOf,
  hasClaim,
  loadLedger,
  recordAward,
  recordRank,
  subscribeProgression,
} from "@/lib/progression/store";
import type {
  GoalProgress,
  LedgerKind,
  PointEntry,
  PointSource,
  ProgressionInput,
  RankEvent,
  RankState,
} from "@/lib/progression/types";

/** How the award went — the UI only ever needs this. */
export interface AwardResult {
  awarded: boolean;
  points: number;
  /** Set when the award crossed a rank threshold, for the ceremony. */
  rankUp: RankState | null;
  /** Set when the award unlocked an achievement, for the toast. */
  unlocked: { id: string; title: string }[];
  /** Calm, never scolding: "Not completed yet.", "Already earned." */
  message: string;
}

export interface ProgressionStore {
  loading: boolean;
  points: number;
  today: string;
  rank: RankState;
  /** Distances to the next named ranks, for the journey path. */
  goals: GoalProgress[];
  featuredGoals: GoalProgress[];
  nextMilestone: GoalProgress | null;
  achievements: ReturnType<typeof evaluateAchievements>;
  ledger: PointEntry[];
  rankEvents: RankEvent[];
  awardedTotal: number;
  earnedFromHabits: number;
  earnedFromMilestones: number;
  /** Everything earned today: habit ticks plus verified awards. */
  todayPoints: number;
  todayGoals: number;
  weekPoints: number;
  /** Verify + award. Safe to call repeatedly; only the first call pays. */
  claim: (goalId: string) => Promise<AwardResult>;
  /** Verify + award an achievement (once ever). */
  unlockAchievement: (achievementId: string) => Promise<AwardResult>;
  /** Re-read the authoritative balance. */
  refreshPoints: () => void;
  /** Re-verify everything (after a tick, a log or a mood entry). */
  refresh: () => void;
  /** True while a claim is in flight. */
  busy: boolean;
  /** Recent awards from the real ledger, for Point Activity. */
  error: string | null;
}

const MAX_AUTO_UNLOCKS = 6;

export function useProgression(): ProgressionStore {
  const habits: HabitsStore = useHabits();
  const trackers = useTrackers();
  const mood = useMoodSystem();

  const [today, setToday] = useState(() => todayLocal());
  const [ledgerVersion, setLedgerVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloudPoints, setCloudPoints] = useState<number | null>(null);
  const [pointsNonce, setPointsNonce] = useState(0);
  const busyRef = useRef(false);

  /* ------------------------------- today ---------------------------------- */
  useEffect(() => {
    const sync = () => {
      const next = todayLocal();
      setToday((current) => (current === next ? current : next));
    };
    sync();
    const id = window.setInterval(sync, 60_000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  /* ------------------------- reactive local record ------------------------ */
  useEffect(() => subscribeProgression(() => setLedgerVersion((v) => v + 1)), []);

  /* --------------------------- authoritative points ----------------------- */
  const signedIn = habits.auth === "signed-in";
  const profileId = habits.profileId;

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!signedIn || !profileId || !hasSupabaseConfig) {
        if (alive) setCloudPoints(null);
        return;
      }
      const value = await readPoints(profileId);
      if (alive) setCloudPoints(value);
    }
    void load();
    return () => {
      alive = false;
    };
  }, [signedIn, profileId, habits.points, pointsNonce]);

  const refreshPoints = useCallback(() => setPointsNonce((n) => n + 1), []);

  /* -------------------------------- input --------------------------------- */
  const input: ProgressionInput = useMemo(() => {
    const trackerDays = trackers.days.map((day) => ({
      date: day.date,
      sleepMinutes: day.sleepMinutes,
      sleepQuality: day.sleepQuality,
      wakeTime: day.wakeTime,
      waterMl: day.waterMl,
      movementMinutes: day.movementMinutes,
      energy: day.energy,
      studyMinutes: day.sessions.reduce((sum, session) => sum + session.minutes, 0),
      studySessions: day.sessions.length,
    }));

    const moodDays = new Set<string>();
    for (const entry of mood.entries) {
      const day = moodDayOf(entry.timestamp);
      if (day) moodDays.add(day);
    }

    // Device-derived lifetime balance: the habit logs are the record. Signed
    // in, the account's number is authoritative and this is only the fallback
    // until it loads.
    const habitPoints = habits.habits.reduce(
      (sum, habit) =>
        sum +
        habit.points *
          habits.logs.filter((log) => log.habitId === habit.id).length,
      0,
    );
    const earnedLifetime = signedIn
      ? cloudPoints ?? habits.points
      : habitPoints;

    return {
      today,
      earnedLifetime,
      mode: signedIn ? "cloud" : "device",
      habits: habits.habits.map((h) => ({ id: h.id, name: h.name, points: h.points })),
      logs: habits.logs.map((log) => ({ habitId: log.habitId, date: log.date })),
      trackerDays,
      trackerGoals: {
        sleepMinutes: trackers.goals.sleepMinutes,
        waterMl: trackers.goals.waterMl,
        movementMinutes: trackers.goals.movementMinutes,
        studyMinutes: trackers.goals.studyMinutes,
        energy: trackers.goals.energy,
        screenMinutes: trackers.goals.screenMinutes,
      },
      moodDays: [...moodDays],
      moodCount: mood.entries.length,
    };
  }, [
    today,
    signedIn,
    cloudPoints,
    habits.habits,
    habits.logs,
    habits.points,
    trackers.days,
    trackers.goals,
    mood.entries,
  ]);

  /* ------------------------------- snapshot ------------------------------- */
  void ledgerVersion;
  const ledger = useMemo(() => loadLedger(), [ledgerVersion]);

  const claimedLookup = useMemo(
    () => ({ has: (goalId: string, periodKey: string) => hasClaim(goalId, periodKey) }),
    [ledgerVersion],
  );

  const goals = useMemo(() => evaluateGoals(input, claimedLookup), [input, claimedLookup]);

  const achievements = useMemo(
    () => evaluateAchievements(input, { achievedAt: (id) => achievedAtOf(id) }),
    [input, ledgerVersion],
  );

  const snapshot = useMemo(
    () =>
      buildSnapshot({
        input,
        goals,
        achievements,
        ledgerPoints: ledger.ledger.reduce((sum, entry) => sum + entry.points, 0),
      }),
    [input, goals, achievements, ledger],
  );

  /* ------------------------------ award engine ---------------------------- */

  /**
   * Server-side award. Returns null when there is no database (the caller
   * falls back to the local ledger), otherwise the server's decision.
   */
  const awardOnServer = useCallback(
    async (goalId: string): Promise<{ awarded: boolean; points: number; balance: number; reason: string } | null> => {
      if (!hasSupabaseConfig || !signedIn) return null;
      try {
        const { data, error: rpcError } = await supabase.rpc("award_progress", {
          p_goal_id: goalId,
          p_today: today,
        });
        if (rpcError) {
          // A server that has not run the progression migration must not stop
          // the journey: fall back to the verified local ledger.
          if (rpcError.code === "42883" || rpcError.code === "PGRST202") return null;
          throw rpcError;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return null;
        const record = row as Record<string, unknown>;
        return {
          awarded: record["awarded"] === true,
          points: typeof record["points"] === "number" ? record["points"] : 0,
          balance: typeof record["balance"] === "number" ? record["balance"] : 0,
          reason: typeof record["reason"] === "string" ? record["reason"] : "",
        };
      } catch (cause) {
        console.error("Progression award failed:", cause);
        return null;
      }
    },
    [signedIn, today],
  );

  const awardLocally = useCallback(
    (entry: {
      kind: LedgerKind;
      refId: string;
      periodKey: string | null;
      title: string;
      source: PointSource;
      points: number;
    }): boolean => {
      return Boolean(recordAward(entry));
    },
    [],
  );

  const awardAchievement = useCallback(
    async (achievementId: string): Promise<boolean> => {
      const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
      if (!def) return false;
      if (hasClaim(def.id, "once")) return false;

      if (hasSupabaseConfig && signedIn) {
        try {
          const { data, error: rpcError } = await supabase.rpc("award_achievement", {
            p_achievement_id: achievementId,
          });
          if (rpcError) {
            if (rpcError.code !== "42883" && rpcError.code !== "PGRST202") throw rpcError;
          } else {
            const row = Array.isArray(data) ? data[0] : data;
            const record = (row ?? {}) as Record<string, unknown>;
            if (record["awarded"] !== true) return false;
          }
        } catch (cause) {
          console.error("Achievement award failed:", cause);
          return false;
        }
      }

      const recorded = recordAward({
        kind: "achievement",
        refId: def.id,
        periodKey: "once",
        title: def.title,
        source: "milestones",
        points: 0,
      });
      return Boolean(recorded);
    },
    [signedIn],
  );

  /** Confirm ranks + achievements that a new balance has reached. */
  const settle = useCallback(
    async (
      balance: number,
      before: number,
    ): Promise<{ rankUp: RankState | null; unlocked: { id: string; title: string }[] }> => {
      const after = rankFor(balance);
      const beforeState = rankFor(before);
      let rankUp: RankState | null = null;
      if (after.rank.tier > beforeState.rank.tier) {
        // A rank-up only "happens" once; a re-cross cannot re-trigger it.
        const recorded = recordRank(after.rank.tier, after.rank.name, balance);
        if (recorded) rankUp = after;
      }

      const unlocked: { id: string; title: string }[] = [];
      for (const def of ACHIEVEMENTS) {
        if (unlocked.length >= MAX_AUTO_UNLOCKS) break;
        if (hasClaim(def.id, "once")) continue;
        const reached = resolveSpec(def.spec, { ...input, earnedLifetime: balance }) >= def.target;
        if (!reached) continue;
        if (await awardAchievement(def.id)) unlocked.push({ id: def.id, title: def.title });
      }
      return { rankUp, unlocked };
    },
    [input, awardAchievement],
  );

  const claim = useCallback(
    async (goalId: string): Promise<AwardResult> => {
      const target = goals.find((g) => g.goal.id === goalId);
      if (!target) return { awarded: false, points: 0, rankUp: null, unlocked: [], message: "That goal is no longer in the catalog." };
      if (target.claimed) {
        return { awarded: false, points: 0, rankUp: null, unlocked: [], message: "Already earned for this period." };
      }
      if (!target.complete) {
        const left = goalTarget(target.goal, input) - target.progress;
        return {
          awarded: false,
          points: 0,
          rankUp: null,
          unlocked: [],
          message: left > 0
            ? `Not completed yet — ${left} to go. You can pick this back up any time.`
            : "Not completed yet.",
        };
      }
      if (busyRef.current) return { awarded: false, points: 0, rankUp: null, unlocked: [], message: "Just finishing the last one." };

      busyRef.current = true;
      setBusy(true);
      setError(null);
      try {
        const before = snapshot.points;
        const server = await awardOnServer(goalId);

        if (server && !server.awarded) {
          // The server disagreed (already awarded, or verification stricter
          // than ours). Trust the server, and mirror the "already awarded"
          // state locally so the UI stops offering it.
          if (server.reason.toLowerCase().includes("already")) {
            recordAward({
              kind: "goal",
              refId: goalId,
              periodKey: target.periodKey,
              title: target.goal.title,
              source: target.goal.source,
              points: server.points,
            });
          }
          refreshPoints();
          return {
            awarded: false,
            points: server.points,
            rankUp: null,
            unlocked: [],
            message: server.reason || "Not completed yet.",
          };
        }

        if (server && server.awarded) {
          recordAward({
            kind: "goal",
            refId: goalId,
            periodKey: target.periodKey,
            title: target.goal.title,
            source: target.goal.source,
            points: server.points || target.goal.points,
          });
          setCloudPoints(server.balance);
          setPointsNonce((n) => n + 1);
          const settled = await settle(server.balance, before);
          return {
            awarded: true,
            points: server.points || target.goal.points,
            rankUp: settled.rankUp,
            unlocked: settled.unlocked,
            message: "Awarded.",
          };
        }

        // No database: the verified local path.
        const local = awardLocally({
          kind: "goal",
          refId: goalId,
          periodKey: target.periodKey,
          title: target.goal.title,
          source: target.goal.source,
          points: target.goal.points,
        });
        if (!local) {
          return { awarded: false, points: 0, rankUp: null, unlocked: [], message: "Already earned for this period." };
        }
        const settled = await settle(before + target.goal.points, before);
        return {
          awarded: true,
          points: target.goal.points,
          rankUp: settled.rankUp,
          unlocked: settled.unlocked,
          message: "Awarded.",
        };
      } catch (cause) {
        console.error("Claim failed:", cause);
        setError("Goals couldn't be saved right now. Nothing was lost — try again.");
        return { awarded: false, points: 0, rankUp: null, unlocked: [], message: "Nothing was charged. Try again." };
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [
      goals,
      input,
      snapshot.points,
      awardOnServer,
      awardLocally,
      refreshPoints,
      settle,
    ],
  );

  const unlockAchievement = useCallback(
    async (achievementId: string): Promise<AwardResult> => {
      const state = achievements.find((a) => a.def.id === achievementId);
      if (!state) return { awarded: false, points: 0, rankUp: null, unlocked: [], message: "Unknown achievement." };
      if (state.unlocked && state.achievedAt) {
        return { awarded: false, points: 0, rankUp: null, unlocked: [], message: "Already earned." };
      }
      const ok = await awardAchievement(achievementId);
      return {
        awarded: ok,
        points: 0,
        rankUp: null,
        unlocked: ok ? [{ id: achievementId, title: state.def.title }] : [],
        message: ok ? "Earned." : "Not earned yet.",
      };
    },
    [achievements, awardAchievement],
  );

  /**
   * Achievements can be earned without claiming anything — a first tick, a
   * longer run, a rank reached through habit points. Record those once, so the
   * archive shows a real date instead of silently implying it never happened.
   * Idempotent on both sides: the local ledger and the server RPC both refuse
   * a second award.
   */
  useEffect(() => {
    if (achievements.length === 0) return;
    let cancelled = false;
    void (async () => {
      const pending = achievements
        .filter((state) => state.unlocked && !state.achievedAt)
        .slice(0, 3);
      for (const state of pending) {
        if (cancelled) return;
        await awardAchievement(state.def.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [achievements, awardAchievement]);

  /* --------------------------- derived series ----------------------------- */
  // Habit ticks are worth the habit's own point value, so the day's real
  // earning is: (ticked habit values) + (verified awards recorded that day).
  const habitPointsOnDay = useMemo(() => {
    const value = new Map(input.habits.map((h) => [h.id, h.points]));
    const byDay = new Map<string, number>();
    for (const log of input.logs) {
      const points = value.get(log.habitId);
      if (!points) continue;
      byDay.set(log.date, (byDay.get(log.date) ?? 0) + points);
    }
    return byDay;
  }, [input.habits, input.logs]);

  const awardedToday = useMemo(() => {
    const list = ledger.ledger.filter((entry) => entry.at.slice(0, 10) === today);
    return {
      points: list.reduce((sum, entry) => sum + entry.points, 0),
      goals: list.filter((entry) => entry.kind === "goal").length,
    };
  }, [ledger, today]);

  const todayPoints = (habitPointsOnDay.get(today) ?? 0) + awardedToday.points;

  const weekStart = shiftDay(today, -6);
  const weekPoints = useMemo(() => {
    let habitPoints = 0;
    for (const [date, points] of habitPointsOnDay) {
      if (date >= weekStart && date <= today) habitPoints += points;
    }
    const awarded = ledger.ledger
      .filter((entry) => entry.at.slice(0, 10) >= weekStart && entry.at.slice(0, 10) <= today)
      .reduce((sum, entry) => sum + entry.points, 0);
    return habitPoints + awarded;
  }, [habitPointsOnDay, ledger, weekStart, today]);

  const featuredGoals = useMemo(() => {
    const claimable = goals.filter((g) => g.claimable);
    const close = goals
      .filter(
        (g) =>
          !g.claimed &&
          g.goal.featured &&
          !claimable.includes(g),
      )
      .sort((a, b) => b.ratio - a.ratio);
    return [...claimable, ...close].slice(0, 4);
  }, [goals]);

  return {
    loading: snapshot.loading,
    points: snapshot.points,
    today,
    rank: snapshot.rank,
    goals,
    featuredGoals,
    nextMilestone: snapshot.nextMilestone,
    achievements,
    ledger: ledger.ledger,
    rankEvents: ledger.ranks.filter((event) => event.name),
    awardedTotal: snapshot.awardedTotal,
    earnedFromHabits: snapshot.earnedFromHabits,
    earnedFromMilestones: snapshot.earnedFromMilestones,
    todayPoints,
    todayGoals: awardedToday.goals,
    weekPoints,
    claim,
    unlockAchievement,
    refreshPoints,
    refresh: () => setLedgerVersion((v) => v + 1),
    busy,
    error,
  };
}
