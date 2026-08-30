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

const chain = (result: unknown) => {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "upsert", "delete", "insert"]) {
    c[m] = vi.fn(() => c);
  }
  c["then"] = (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) => {
    if (state.failPull) return Promise.resolve({ data: null, error: { message: "boom" } }).then(onOk, onErr);
    return Promise.resolve(result).then(onOk, onErr);
  };
  return c;
};

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: state.session } })),
    },
    from: vi.fn((table: string) => {
      const c: Record<string, unknown> = {
        select: vi.fn(() => c),
        eq: vi.fn(() => c),
        order: vi.fn(() => c),
        delete: vi.fn(() => c),
        upsert: vi.fn((payload: Record<string, unknown>) => {
          state.upserts.push(payload);
          return Object.assign(c, {
            then: (onOk: (v: unknown) => unknown) =>
              Promise.resolve(
                state.failPush ? { data: null, error: { message: "nope" } } : { data: null, error: null },
              ).then(onOk),
          });
        }),
      };
      // delete().eq().eq() -> thenable
      c["then"] = (onOk: (v: unknown) => unknown) => {
        if (table === "cycle_entries") {
          return Promise.resolve(
            state.failPull ? { data: null, error: { message: "boom" } } : { data: state.rows, error: null },
          ).then(onOk);
        }
        return Promise.resolve({ data: null, error: null }).then(onOk);
      };
      return c;
    }),
  },
}));

import { usePeriodLog } from "@/hooks/usePeriodLog";

describe("cycle sync", () => {
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
    const { result } = renderHook(() => usePeriodLog());
    await waitFor(() => expect(result.current.sync.state).toBe("signed-out"));
    expect(result.current.sync.message).toMatch(/device/i);
  });

  it("pulls the table and shows the days it found", async () => {
    state.session = { user: { id: "p1" } };
    state.rows = [
      {
        date: "2026-08-28",
        flow: "medium",
        pain_level: 2,
        sleep_hours: 7,
        energy: 4,
        updated_at: "2026-08-28T10:00:00.000Z",
      },
    ];
    const { result } = renderHook(() => usePeriodLog());
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));
    await waitFor(() => expect(result.current.days.length).toBe(1));
    expect(result.current.days[0]).toMatchObject({ date: "2026-08-28", pain: 2, sleep: 7, energy: 4 });
  });

  it("pushes a new day up to the table", async () => {
    state.session = { user: { id: "p1" } };
    const { result } = renderHook(() => usePeriodLog());
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));

    act(() => {
      const r = result.current.saveDay({ date: "2026-08-30", flow: "light", pain: 1, energy: 3 });
      expect(r.ok).toBe(true);
    });
    await waitFor(() => expect(state.upserts.length).toBe(1), { timeout: 3000 });
    expect(state.upserts[0]).toMatchObject({ profile_id: "p1", date: "2026-08-30", flow: "light", pain_level: 1, energy: 3 });
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));
  });

  it("keeps the day on the device when the table can't be reached", async () => {
    state.session = { user: { id: "p1" } };
    state.failPush = true;
    const { result } = renderHook(() => usePeriodLog());
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));

    act(() => {
      result.current.saveDay({ date: "2026-08-30", flow: "light" });
    });
    await waitFor(() => expect(result.current.sync.state).toBe("error"), { timeout: 3000 });
    expect(result.current.days.map((d) => d.date)).toContain("2026-08-30");
    expect(result.current.sync.message).toMatch(/safe on this device/i);
  });
});
