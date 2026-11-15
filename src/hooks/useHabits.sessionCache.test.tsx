// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Habit, HabitLog } from "@/lib/home/habits";

/**
 * Round 3 — the Profile → Today empty-settled flash, pinned at the hook
 * level.
 *
 * The live signature (post-deploy sweep, 2026-11-15): Profile → Today
 * trip 2 rendered "No habits yet" with empty stat/week regions — NOT a
 * skeleton — for ~6s, then self-corrected. Trip 1 passed. No mirror
 * numbers, no error line.
 *
 * The mechanism, reproduced below with honest (slow) fetches only:
 * pages mount SEVERAL useHabits instances in one commit (Profile: the
 * route, useProfileRecord, useReminders; Today: the route and the
 * LevelCard's progression store). A fresh instance's load effect
 * warm-seeds from the session cache and marks itself settled
 * (`signedInLoaded`) SYNCHRONOUSLY — but the seed's setState has not
 * rendered yet, so the cache-writer effect, running later in the same
 * commit with the mount's INITIAL state (habits [], logs [], points
 * null) still in its closure, passes its settled guard and overwrites
 * the healthy cache with empty rows. A sibling whose load effect runs
 * after that write warm-seeds the poisoned cache: empty list,
 * loading=false — settled-looking emptiness — until its own
 * revalidation lands seconds later. If the sibling unmounts first
 * (a quick tab tap), the poison is the last cache write and the next
 * page inherits it.
 *
 * The invariant: a signed-in page NEVER renders empty as account truth
 * unless an account fetch has settled AND returned zero habits. A
 * warm seed must hand a sibling the rows the session actually settled.
 *
 * Each fetch call gets its own deferred so sibling instances' fetches
 * can be held in flight and resolved in any order.
 */

type Def<T> = {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
};
const deferred = <T,>(): Def<T> => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const ctrl = vi.hoisted(() => ({
  authCbs: new Set<(uid: string | null) => void>(),
  habitsCalls: [] as Def<Habit[]>[],
  logsCalls: [] as Def<HabitLog[]>[],
  pointsCalls: [] as Def<number | null>[],
  reset() {
    this.authCbs.clear();
    this.habitsCalls = [];
    this.logsCalls = [];
    this.pointsCalls = [];
  },
}));

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: {},
  watchAuth: (onUser: (uid: string | null) => void) => {
    ctrl.authCbs.add(onUser);
    return () => {
      ctrl.authCbs.delete(onUser);
    };
  },
}));

vi.mock("@/lib/home/habitRealtime", () => ({
  subscribeToHabitChanges: () => () => {},
}));

vi.mock("@/lib/home/habits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/home/habits")>();
  return {
    ...actual,
    hasHabitCloud: () => true,
    fetchHabits: () => {
      const d = deferred<Habit[]>();
      ctrl.habitsCalls.push(d);
      return d.promise;
    },
    fetchLogs: () => {
      const d = deferred<HabitLog[]>();
      ctrl.logsCalls.push(d);
      return d.promise;
    },
    readPoints: () => {
      const d = deferred<number | null>();
      ctrl.pointsCalls.push(d);
      return d.promise;
    },
    uploadLocalHabits: async () => ({ uploaded: [], replacedIds: [], logs: [], failed: 0 }),
  };
});

import { __resetHabitsSessionCache, useHabits } from "./useHabits";

const habit = (id: string, name: string): Habit => ({
  id,
  name,
  icon: "💧",
  iconType: "emoji",
  iconUrl: null,
  color: "amber",
  frequency: "daily",
  points: 10,
  reminderTime: null,
  priority: "medium",
  tags: [],
  goal: null,
  days: [],
  timesPerWeek: null,
  startDate: null,
  note: null,
  createdAt: null,
  archived: false,
  pausedFrom: null,
  pausedUntil: null,
});

const REAL = [habit("r1", "Drink water"), habit("r2", "Log sleep")];

const emitAuth = (uid: string | null) => {
  act(() => {
    for (const cb of [...ctrl.authCbs]) cb(uid);
  });
};

/** Resolve the fetch triple that started at index `i`. */
const resolveFetch = async (i: number, habits: Habit[], points: number | null = 405) => {
  await act(async () => {
    ctrl.habitsCalls[i]?.resolve(habits);
    ctrl.logsCalls[i]?.resolve([]);
    ctrl.pointsCalls[i]?.resolve(points);
  });
};

/** A first mount that settles the account's real rows into the cache. */
const settleFirstMount = async () => {
  const first = renderHook(() => useHabits());
  emitAuth("profile-1");
  await waitFor(() => expect(ctrl.habitsCalls.length).toBe(1));
  await resolveFetch(0, REAL);
  await waitFor(() => expect(first.result.current.loading).toBe(false));
  expect(first.result.current.habits.map((h) => h.name)).toEqual(["Drink water", "Log sleep"]);
  first.unmount();
};

beforeEach(() => {
  ctrl.reset();
  __resetHabitsSessionCache();
  window.localStorage.clear();
});

describe("useHabits — sibling instances cannot poison the session cache (round 3)", () => {
  it("two instances mounting together both warm-seed the settled rows, and a mid-flight unmount leaves the cache true for the next page", async () => {
    await settleFirstMount();

    /* The Profile shape: two fresh instances in the same commit, both
       revalidations still in flight (the slow live network). Neither
       may render — or cache — anything but the settled rows. */
    const b = renderHook(() => useHabits());
    const c = renderHook(() => useHabits());
    emitAuth("profile-1");
    await waitFor(() => expect(ctrl.habitsCalls.length).toBe(3));
    for (const sibling of [b, c]) {
      expect(sibling.result.current.loading).toBe(false);
      expect(sibling.result.current.habits.map((h) => h.name)).toEqual([
        "Drink water",
        "Log sleep",
      ]);
      expect(sibling.result.current.points).toBe(405);
    }

    /* The quick tab tap: both leave before either revalidation lands. */
    b.unmount();
    c.unmount();

    /* Today: the warm seed must still be the settled record — empty
       here is the flash ("No habits yet", settled, ~seconds long). */
    const today = renderHook(() => useHabits());
    emitAuth("profile-1");
    await waitFor(() => expect(ctrl.habitsCalls.length).toBe(4));
    expect(today.result.current.loading).toBe(false);
    expect(today.result.current.habits.map((h) => h.name)).toEqual([
      "Drink water",
      "Log sleep",
    ]);
    expect(today.result.current.points).toBe(405);

    /* And the revalidation reconciles as before. */
    await resolveFetch(3, REAL);
    await waitFor(() => expect(today.result.current.loading).toBe(false));
    expect(today.result.current.habits).toHaveLength(2);
    today.unmount();
  });

  it("a settled revalidation still refreshes the cache for the next mount (the writer keeps its R15 job)", async () => {
    await settleFirstMount();

    /* A warm remount whose revalidation brings a third habit. */
    const back = renderHook(() => useHabits());
    emitAuth("profile-1");
    await waitFor(() => expect(ctrl.habitsCalls.length).toBe(2));
    expect(back.result.current.habits).toHaveLength(2);
    await resolveFetch(1, [...REAL, habit("r3", "Stretch")], 415);
    await waitFor(() => expect(back.result.current.habits).toHaveLength(3));
    back.unmount();

    /* The next mount seeds the refreshed rows, not the stale ones. */
    const next = renderHook(() => useHabits());
    emitAuth("profile-1");
    await waitFor(() => expect(ctrl.habitsCalls.length).toBe(3));
    expect(next.result.current.loading).toBe(false);
    expect(next.result.current.habits.map((h) => h.name)).toEqual([
      "Drink water",
      "Log sleep",
      "Stretch",
    ]);
    expect(next.result.current.points).toBe(415);
    next.unmount();
  });
});
