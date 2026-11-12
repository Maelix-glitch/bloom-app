// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The quest-claim path, end to end at the hook level.
 *
 * The 2026-11-12 defect: claiming a completed quest appeared to succeed
 * but the points balance never moved. Two failures compounded —
 * `award_progress()` raised 42702 server-side on every verified award
 * (fixed by migration 20261112_award_progress_fix), and the client
 * settled ANY server failure in the local ledger, displaying "Awarded."
 * while the account — the only balance a signed-in person sees — was
 * never credited, with the local mark blocking every retry.
 *
 * These tests pin the repaired contract:
 *   · a server award credits exactly once and the balance moves;
 *   · a second claim cannot double-credit;
 *   · the balance shown is the account read, and it reflects the credit;
 *   · a server failure settles NOTHING — the goal stays claimable and a
 *     retry lands the credit;
 *   · a local-only claim mark from the old fallback (server has no award
 *     for a still-open period) is re-offered, not treated as paid.
 */

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  readPoints: vi.fn(),
  balance: 485,
  serverAwards: [] as { goal_id: string; period_key: string }[],
  rpcMode: "ok" as "ok" | "error42702" | "missing",
  habits: {} as Record<string, unknown>,
  trackers: {} as Record<string, unknown>,
}));

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabaseConfigProblem: () => null,
  supabase: { rpc: mocks.rpc, from: mocks.from },
  watchAuth: () => () => {},
}));

vi.mock("@/lib/home/habits", () => ({
  readPoints: mocks.readPoints,
}));

vi.mock("@/hooks/useHabits", () => ({
  useHabits: () => mocks.habits,
}));

vi.mock("@/hooks/useTrackers", () => ({
  useTrackers: () => mocks.trackers,
}));

vi.mock("@/hooks/useMoodSystem", () => ({
  useMoodSystem: () => ({ entries: [], loading: false }),
}));

import { todayLocal } from "@/lib/localDay";
import { hasClaim, recordAward } from "@/lib/progression/store";
import { useProgression, type AwardResult } from "./useProgression";

const TODAY = todayLocal();
const FIRST_BLOOM_POINTS = 100;

function rpcRouter(name: string, args?: Record<string, unknown>) {
  if (name === "award_progress") {
    if (mocks.rpcMode === "error42702") {
      // The live incident's exact failure (pre-fix function).
      return {
        data: null,
        error: { code: "42702", message: 'column reference "period_key" is ambiguous' },
      };
    }
    if (mocks.rpcMode === "missing") {
      return {
        data: null,
        error: { code: "PGRST202", message: "Could not find the function public.award_progress" },
      };
    }
    const goalId = String(args?.p_goal_id ?? "");
    const period = goalId === "first-bloom" ? "once" : String(args?.p_today ?? TODAY);
    if (mocks.serverAwards.some((a) => a.goal_id === goalId && a.period_key === period)) {
      return {
        data: [
          {
            awarded: false,
            points: FIRST_BLOOM_POINTS,
            balance: mocks.balance,
            reason: "Already earned for this period.",
            period_key: period,
          },
        ],
        error: null,
      };
    }
    mocks.serverAwards.push({ goal_id: goalId, period_key: period });
    mocks.balance += FIRST_BLOOM_POINTS;
    return {
      data: [
        {
          awarded: true,
          points: FIRST_BLOOM_POINTS,
          balance: mocks.balance,
          reason: "Awarded.",
          period_key: period,
        },
      ],
      error: null,
    };
  }
  if (name === "award_achievement") {
    return { data: [{ awarded: true, reason: "Earned." }], error: null };
  }
  return { data: null, error: null };
}

function fromRouter(table: string) {
  if (table !== "goal_awards") throw new Error(`unexpected table ${table}`);
  return {
    select: () => ({
      eq: async () => ({ data: mocks.serverAwards.map((a) => ({ ...a })), error: null }),
    }),
  };
}

function awardProgressCalls(): number {
  return mocks.rpc.mock.calls.filter((call) => call[0] === "award_progress").length;
}

function goal(result: { current: ReturnType<typeof useProgression> }, id: string) {
  return result.current.goals.find((g) => g.goal.id === id);
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.balance = 485;
  mocks.serverAwards = [];
  mocks.rpcMode = "ok";
  mocks.habits = {
    auth: "signed-in",
    profileId: "user-1",
    points: 485,
    loading: false,
    habits: [{ id: "h1", name: "Drink water", points: 10 }],
    logs: [{ habitId: "h1", date: TODAY }],
  };
  mocks.trackers = {
    days: [],
    goals: {
      sleepMinutes: 480,
      waterMl: 2200,
      movementMinutes: 30,
      studyMinutes: 60,
      energy: 7,
      screenMinutes: 120,
    },
    hydrated: true,
    sync: { state: "saved" },
  };
  mocks.rpc.mockReset().mockImplementation(rpcRouter);
  mocks.from.mockReset().mockImplementation(fromRouter);
  mocks.readPoints.mockReset().mockImplementation(async () => mocks.balance);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("useProgression claim — the credit must land on the account", () => {
  it("credits a completed quest exactly once and the balance moves by the quest's points", async () => {
    const { result } = renderHook(() => useProgression());
    await waitFor(() => expect(result.current.points).toBe(485));
    await waitFor(() => expect(goal(result, "first-bloom")?.claimable).toBe(true));

    let res: AwardResult | undefined;
    await act(async () => {
      res = await result.current.claim("first-bloom");
    });

    expect(res?.awarded).toBe(true);
    expect(res?.points).toBe(FIRST_BLOOM_POINTS);
    expect(awardProgressCalls()).toBe(1);
    // The displayed balance is the account's, and it moved 485 → 585.
    await waitFor(() => expect(result.current.points).toBe(585));
  });

  it("a second claim does not double-credit", async () => {
    const { result } = renderHook(() => useProgression());
    await waitFor(() => expect(result.current.points).toBe(485));

    await act(async () => {
      await result.current.claim("first-bloom");
    });
    await waitFor(() => expect(result.current.points).toBe(585));
    await waitFor(() => expect(goal(result, "first-bloom")?.claimed).toBe(true));

    let second: AwardResult | undefined;
    await act(async () => {
      second = await result.current.claim("first-bloom");
    });

    expect(second?.awarded).toBe(false);
    expect(second?.message).toMatch(/already/i);
    // The server was not asked to pay again, and the balance is unmoved.
    expect(awardProgressCalls()).toBe(1);
    expect(result.current.points).toBe(585);
    expect(mocks.balance).toBe(585);
  });

  it("the balance read reflects the credit after a refresh", async () => {
    const { result } = renderHook(() => useProgression());
    await waitFor(() => expect(result.current.points).toBe(485));

    await act(async () => {
      await result.current.claim("first-bloom");
    });
    await waitFor(() => expect(result.current.points).toBe(585));

    const readsBefore = mocks.readPoints.mock.calls.length;
    act(() => result.current.refreshPoints());
    await waitFor(() => expect(mocks.readPoints.mock.calls.length).toBeGreaterThan(readsBefore));
    expect(result.current.points).toBe(585);
  });

  it("a server failure settles nothing: no local mark, goal stays claimable, retry lands the credit", async () => {
    mocks.rpcMode = "error42702";
    const { result } = renderHook(() => useProgression());
    await waitFor(() => expect(result.current.points).toBe(485));
    await waitFor(() => expect(goal(result, "first-bloom")?.claimable).toBe(true));

    let res: AwardResult | undefined;
    await act(async () => {
      res = await result.current.claim("first-bloom");
    });

    expect(res?.awarded).toBe(false);
    expect(res?.message).toMatch(/wasn't saved/);
    // The old code recorded the award locally here — the goal showed as
    // claimed and could never be retried. Nothing may be recorded now.
    expect(hasClaim("first-bloom", "once")).toBe(false);
    expect(result.current.points).toBe(485);
    await waitFor(() => expect(goal(result, "first-bloom")?.claimable).toBe(true));

    // The server recovers (the fixed function is live): the same claim pays.
    mocks.rpcMode = "ok";
    let retry: AwardResult | undefined;
    await act(async () => {
      retry = await result.current.claim("first-bloom");
    });
    expect(retry?.awarded).toBe(true);
    await waitFor(() => expect(result.current.points).toBe(585));
  });

  it("a local-only claim mark for a still-open period is re-offered and pays on the server", async () => {
    // The state the old fallback left behind: the device ledger says the
    // quest was claimed and paid; the account has no award and no points.
    recordAward({
      kind: "goal",
      refId: "first-bloom",
      periodKey: "once",
      title: "Tick your first habit",
      source: "milestones",
      points: FIRST_BLOOM_POINTS,
    });
    expect(hasClaim("first-bloom", "once")).toBe(true);

    const { result } = renderHook(() => useProgression());
    await waitFor(() => expect(result.current.points).toBe(485));
    // Server has no award for this open period → offered again, not "paid".
    await waitFor(() => expect(goal(result, "first-bloom")?.claimable).toBe(true));

    let res: AwardResult | undefined;
    await act(async () => {
      res = await result.current.claim("first-bloom");
    });
    expect(res?.awarded).toBe(true);
    expect(awardProgressCalls()).toBe(1);
    await waitFor(() => expect(result.current.points).toBe(585));
    await waitFor(() => expect(goal(result, "first-bloom")?.claimed).toBe(true));
  });
});
