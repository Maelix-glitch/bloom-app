// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Habit, HabitLog } from "@/lib/home/habits";

/**
 * The defaults-flash, pinned at the hook level.
 *
 * On a signed-in cold load the device mirror (localStorage `bloom.habits`)
 * is stale by definition — habits deleted, renamed or ticked on another
 * device since this device last synced — so it must never render as the
 * account's rows. The list stays empty behind the skeleton until the
 * account answers. Signed out, the mirror IS the record and still renders
 * instantly. The upload-local-habits path is untouched: a device-only
 * habit still joins the account.
 *
 * The remote fetch is held behind deferred promises so the test can look
 * at the list *while* the account is still answering.
 */

const ctrl = vi.hoisted(() => {
  const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
  return {
    authCb: null as ((uid: string | null) => void) | null,
    fetchHabitsCalls: 0,
    fetchHabits: deferred<Habit[]>(),
    fetchLogs: deferred<HabitLog[]>(),
    readPoints: deferred<number | null>(),
    uploadResult: {
      uploaded: [] as Habit[],
      replacedIds: [] as string[],
      logs: [] as HabitLog[],
      failed: 0,
    },
    reset() {
      this.authCb = null;
      this.fetchHabitsCalls = 0;
      this.fetchHabits = deferred<Habit[]>();
      this.fetchLogs = deferred<HabitLog[]>();
      this.readPoints = deferred<number | null>();
      this.uploadResult = { uploaded: [], replacedIds: [], logs: [], failed: 0 };
    },
  };
});

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: {},
  watchAuth: (onUser: (uid: string | null) => void) => {
    ctrl.authCb = onUser;
    return () => {
      ctrl.authCb = null;
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
    fetchHabits: () => {
      ctrl.fetchHabitsCalls += 1;
      return ctrl.fetchHabits.promise;
    },
    fetchLogs: () => ctrl.fetchLogs.promise,
    readPoints: () => ctrl.readPoints.promise,
    uploadLocalHabits: async () => ctrl.uploadResult,
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

/** Seed the device mirror the way saveLocal writes it (snake_case rows). */
const seedMirror = (rows: { id: string; name: string }[]) => {
  window.localStorage.setItem("bloom.habits", JSON.stringify(rows));
  window.localStorage.setItem("bloom.habit_logs", JSON.stringify([]));
};

const emitAuth = (uid: string | null) => {
  act(() => {
    ctrl.authCb?.(uid);
  });
};

beforeEach(() => {
  ctrl.reset();
  __resetHabitsSessionCache();
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("useHabits — signed-in cold load never renders the device mirror", () => {
  it("shows the skeleton with zero habit rows until the account answers, then exactly the remote list", async () => {
    seedMirror([
      { id: "mirror-1", name: "Stale mirror habit" },
      { id: "mirror-2", name: "Another stale habit" },
    ]);
    const view = renderHook(() => useHabits());
    emitAuth("profile-1");

    /* The account fetch has started — and the mirror has not rendered. */
    await waitFor(() => expect(ctrl.fetchHabitsCalls).toBeGreaterThan(0));
    expect(view.result.current.loading).toBe(true);
    expect(view.result.current.habits).toHaveLength(0);
    expect(view.result.current.todayHabits).toHaveLength(0);

    /* The account answers: only its rows appear, the mirror never does. */
    const remote = [habit("remote-1", "Drink water"), habit("remote-2", "Log sleep")];
    await act(async () => {
      ctrl.fetchHabits.resolve(remote);
      ctrl.fetchLogs.resolve([]);
      ctrl.readPoints.resolve(405);
    });
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(view.result.current.habits.map((h) => h.name)).toEqual(["Drink water", "Log sleep"]);
    expect(view.result.current.todayHabits.map((h) => h.name)).toEqual([
      "Drink water",
      "Log sleep",
    ]);
    view.unmount();
  });

  it("shows the existing error copy — not mirror rows — when the account fetch fails", async () => {
    seedMirror([{ id: "mirror-1", name: "Stale mirror habit" }]);
    const view = renderHook(() => useHabits());
    emitAuth("profile-1");

    await waitFor(() => expect(ctrl.fetchHabitsCalls).toBeGreaterThan(0));
    expect(view.result.current.habits).toHaveLength(0);

    await act(async () => {
      ctrl.fetchHabits.reject(new Error("network down"));
    });
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(view.result.current.error).toBe(
      "Your habits couldn't be loaded from your account just now.",
    );
    expect(view.result.current.habits).toHaveLength(0);
    expect(view.result.current.todayHabits).toHaveLength(0);
    view.unmount();
  });

  it("still uploads a device-only habit onto the account", async () => {
    seedMirror([{ id: "local-abc", name: "Before-sign-in habit" }]);
    const uploaded = habit("cloud-9", "Before-sign-in habit");
    ctrl.uploadResult = {
      uploaded: [uploaded],
      replacedIds: ["local-abc"],
      logs: [],
      failed: 0,
    };
    const view = renderHook(() => useHabits());
    emitAuth("profile-1");

    await waitFor(() => expect(ctrl.fetchHabitsCalls).toBeGreaterThan(0));
    /* Nothing renders while the account is still answering. */
    expect(view.result.current.habits).toHaveLength(0);

    await act(async () => {
      ctrl.fetchHabits.resolve([]);
      ctrl.fetchLogs.resolve([]);
      ctrl.readPoints.resolve(0);
    });
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(view.result.current.habits.map((h) => h.id)).toEqual(["cloud-9"]);
    view.unmount();
  });
});

describe("useHabits — signed out, the mirror is the record", () => {
  it("shows local habits instantly, with no account fetch", async () => {
    seedMirror([{ id: "mirror-1", name: "Local habit" }]);
    const view = renderHook(() => useHabits());
    emitAuth(null);

    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(ctrl.fetchHabitsCalls).toBe(0);
    expect(view.result.current.habits.map((h) => h.name)).toEqual(["Local habit"]);
    expect(view.result.current.todayHabits.map((h) => h.name)).toEqual(["Local habit"]);
    view.unmount();
  });
});

describe("useHabits — warm remount renders the settled rows at once (R15)", () => {
  it("seeds a remount from the session cache while the revalidation is still in flight, then reconciles", async () => {
    const view = renderHook(() => useHabits());
    emitAuth("profile-1");
    await waitFor(() => expect(ctrl.fetchHabitsCalls).toBeGreaterThan(0));
    const remote = [habit("remote-1", "Drink water"), habit("remote-2", "Log sleep")];
    await act(async () => {
      ctrl.fetchHabits.resolve(remote);
      ctrl.fetchLogs.resolve([]);
      ctrl.readPoints.resolve(405);
    });
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    expect(view.result.current.habits).toHaveLength(2);
    view.unmount();

    /* The tab switch: a fresh mount, and this time the network hangs.
       The settled rows are simply there — no skeleton, no empty list —
       because the session cache seeded them; the fetch still runs. */
    ctrl.reset();
    const back = renderHook(() => useHabits());
    emitAuth("profile-1");
    await waitFor(() => expect(ctrl.fetchHabitsCalls).toBeGreaterThan(0));
    expect(back.result.current.loading).toBe(false);
    expect(back.result.current.habits.map((h) => h.name)).toEqual([
      "Drink water",
      "Log sleep",
    ]);

    /* The revalidation lands with a third habit: state reconciles. */
    await act(async () => {
      ctrl.fetchHabits.resolve([...remote, habit("remote-3", "Stretch")]);
      ctrl.fetchLogs.resolve([]);
      ctrl.readPoints.resolve(415);
    });
    await waitFor(() => expect(back.result.current.habits).toHaveLength(3));
    expect(back.result.current.points).toBe(415);
    back.unmount();
  });
});

describe("useHabits — the Profile path: a neighbour's auth flicker cannot poison the return", () => {
  /* The 2026-11-14 post-deploy sweep: Today → Trackers → Today returned
     instantly (above), but Profile → Today flashed a FALSE empty state —
     "No habits yet", an Overview day-count missing the habit-log days —
     for seconds before the account data landed. The asymmetry is
     structural: the Profile page mounts fresh useHabits instances (the
     route itself, and another inside useProfileRecord); Trackers mounts
     none. Every instance opens its own watchAuth subscription, and a
     fresh subscription can report a transient signed-out while its
     session recovery races the token refresh. Two poisons followed:
     the transient flipped the instance to its signed-out branch, which
     (a) seeded the device mirror as the record and (b) destroyed the
     shared session cache — so the next mount of Today inherited a cold
     load and every unlatched surface computed from an empty store. */
  const settleFirstMount = async () => {
    const first = renderHook(() => useHabits());
    emitAuth("profile-1");
    await waitFor(() => expect(ctrl.fetchHabitsCalls).toBeGreaterThan(0));
    const remote = [habit("remote-1", "Drink water"), habit("remote-2", "Log sleep")];
    await act(async () => {
      ctrl.fetchHabits.resolve(remote);
      ctrl.fetchLogs.resolve([]);
      ctrl.readPoints.resolve(405);
    });
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();
    return remote;
  };

  it("a transient signed-out heard on the Profile page does not destroy Today's warm return", async () => {
    seedMirror([{ id: "mirror-1", name: "Stale mirror habit" }]);
    await settleFirstMount();

    /* The Profile page: a fresh instance whose subscription first reports
       a transient signed-out, then the account — and the page is left
       before its own load settles (its fetch hangs). */
    ctrl.reset();
    const profile = renderHook(() => useHabits());
    emitAuth(null);
    emitAuth("profile-1");
    await waitFor(() => expect(ctrl.fetchHabitsCalls).toBeGreaterThan(0));
    profile.unmount();

    /* Back on Today: the settled rows are simply there while the
       revalidation is still in flight — no cold load, no empty state. */
    ctrl.reset();
    const back = renderHook(() => useHabits());
    emitAuth("profile-1");
    await waitFor(() => expect(ctrl.fetchHabitsCalls).toBeGreaterThan(0));
    expect(back.result.current.loading).toBe(false);
    expect(back.result.current.habits.map((h) => h.name)).toEqual([
      "Drink water",
      "Log sleep",
    ]);
    back.unmount();
  });

  it("a warm remount that hears signed-out first holds — it never seeds the mirror or flips state", async () => {
    seedMirror([{ id: "mirror-1", name: "Stale mirror habit" }]);
    await settleFirstMount();

    ctrl.reset();
    const back = renderHook(() => useHabits());
    /* The fresh subscription's first answer is the transient null. An
       account is established in this session, so the null is held: the
       instance stays in its checking state, the mirror never renders,
       and the list stays empty behind the skeleton — not dressed up as
       a signed-out record. */
    emitAuth(null);
    expect(back.result.current.auth).toBe("checking");
    expect(back.result.current.habits).toHaveLength(0);
    expect(back.result.current.loading).toBe(true);

    /* The real answer lands: warm seed from the cache, at once. */
    emitAuth("profile-1");
    await waitFor(() => expect(ctrl.fetchHabitsCalls).toBeGreaterThan(0));
    expect(back.result.current.loading).toBe(false);
    expect(back.result.current.habits.map((h) => h.name)).toEqual([
      "Drink water",
      "Log sleep",
    ]);
    back.unmount();
  });
});
