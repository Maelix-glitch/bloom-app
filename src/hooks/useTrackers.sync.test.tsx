// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as { user: { id: string } } | null,
  rows: [] as Record<string, unknown>[],
  upserts: [] as Record<string, unknown>[],
  deletes: [] as string[],
  failPull: false,
  failPush: false,
};

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: state.session } })),
    },
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        upsert: vi.fn((payload: Record<string, unknown>) => {
          state.upserts.push(payload);
          return Object.assign(chain, {
            then: (onOk: (v: unknown) => unknown) =>
              Promise.resolve(
                state.failPush ? { data: null, error: { message: "nope" } } : { data: null, error: null },
              ).then(onOk),
          });
        }),
      };
      chain["then"] = (onOk: (v: unknown) => unknown) =>
        Promise.resolve(
          state.failPull
            ? { data: null, error: { message: "boom" } }
            : { data: table === "tracker_days" ? state.rows : [], error: null },
        ).then(onOk);
      return chain;
    }),
  },
}));

import { useTrackers } from "@/hooks/useTrackers";
import { emptyDay } from "@/lib/trackers/core";
import { todayKey } from "@/lib/cycle/predict";

const withWater = (ml: number) => ({ ...emptyDay(todayKey()), waterMl: ml });

describe("trackers sync", () => {
  beforeEach(() => {
    state.session = null;
    state.rows = [];
    state.upserts = [];
    state.deletes = [];
    state.failPull = false;
    state.failPush = false;
    window.localStorage.clear();
  });

  it("says it's device-only when nobody is signed in", async () => {
    const { result } = renderHook(() => useTrackers());
    await waitFor(() => expect(result.current.sync.state).toBe("signed-out"));
    expect(result.current.sync.message).toMatch(/device/i);
  });

  it("pulls the table and shows the days it found", async () => {
    state.session = { user: { id: "p1" } };
    state.rows = [
      {
        date: todayKey(),
        sleep_minutes: 420,
        water_ml: 2000,
        sessions: [{ subject: "Maths", minutes: 60, startAt: "09:00" }],
        energy: 4,
        movement_minutes: 30,
        screen_minutes: 120,
        updated_at: "2026-08-30T10:00:00.000Z",
      },
    ];
    const { result } = renderHook(() => useTrackers());
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));
    await waitFor(() => expect(result.current.days.length).toBe(1));
    expect(result.current.days[0]).toMatchObject({ date: todayKey(), sleepMinutes: 420, energy: 4 });
  });

  it("pushes a saved day up to the table", async () => {
    state.session = { user: { id: "p1" } };
    const { result } = renderHook(() => useTrackers());
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));

    act(() => {
      expect(result.current.saveDay(withWater(1500)).ok).toBe(true);
    });
    await waitFor(() => expect(state.upserts.length).toBe(1), { timeout: 3000 });
    expect(state.upserts[0]).toMatchObject({ profile_id: "p1", date: todayKey(), water_ml: 1500 });
    expect(typeof state.upserts[0]!["updated_at"]).toBe("string");
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));
  });

  it("keeps the day on the device when the table can't be reached", async () => {
    state.session = { user: { id: "p1" } };
    state.failPush = true;
    const { result } = renderHook(() => useTrackers());
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));

    act(() => {
      result.current.saveDay(withWater(1500));
    });
    await waitFor(() => expect(result.current.sync.state).toBe("error"), { timeout: 3000 });
    expect(result.current.days.map((d) => d.date)).toContain(todayKey());
    expect(result.current.sync.message).toMatch(/safe on this device/i);
  });
});
