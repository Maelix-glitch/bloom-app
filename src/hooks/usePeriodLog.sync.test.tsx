// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as { user: { id: string } } | null,
  rows: [] as Record<string, unknown>[],
  periodRows: [] as Record<string, unknown>[],
  stateRow: null as Record<string, unknown> | null,
  upserts: [] as Record<string, unknown>[],
  periodUpserts: [] as Record<string, unknown>[],
  stateUpserts: [] as Record<string, unknown>[],
  deletes: [] as string[],
  failPull: false,
  failPush: false,
  /** Simulates a project that hasn't run 20260907_cycle_periods.sql. */
  missingPeriodTables: false,
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
        maybeSingle: vi.fn(() => c),
        delete: vi.fn(() => c),
        upsert: vi.fn((payload: Record<string, unknown> | Record<string, unknown>[]) => {
          if (table === "cycle_periods") state.periodUpserts.push(...(Array.isArray(payload) ? payload : [payload]));
          else if (table === "cycle_state") state.stateUpserts.push(payload as Record<string, unknown>);
          else state.upserts.push(payload as Record<string, unknown>);
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
        if (state.missingPeriodTables && (table === "cycle_periods" || table === "cycle_state"))
          return Promise.resolve({
            data: null,
            error: { code: "42P01", message: `relation "public.${table}" does not exist` },
          }).then(onOk);
        if (state.failPull) return Promise.resolve({ data: null, error: { message: "boom" } }).then(onOk);
        if (table === "cycle_entries") return Promise.resolve({ data: state.rows, error: null }).then(onOk);
        if (table === "cycle_periods") return Promise.resolve({ data: state.periodRows, error: null }).then(onOk);
        if (table === "cycle_state") return Promise.resolve({ data: state.stateRow, error: null }).then(onOk);
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
    state.periodRows = [];
    state.stateRow = null;
    state.upserts = [];
    state.periodUpserts = [];
    state.stateUpserts = [];
    state.deletes = [];
    state.failPull = false;
    state.failPush = false;
    state.missingPeriodTables = false;
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

describe("period entries sync (A5)", () => {
  beforeEach(() => {
    state.session = { user: { id: "p1" } };
    state.rows = [];
    state.periodRows = [];
    state.stateRow = null;
    state.upserts = [];
    state.periodUpserts = [];
    state.stateUpserts = [];
    state.failPull = false;
    state.failPush = false;
    state.missingPeriodTables = false;
    window.localStorage.clear();
  });

  it("shows the periods the account already has", async () => {
    state.periodRows = [
      { id: "r1", start_date: "2026-07-01", end_date: "2026-07-05", flow: "medium", notes: null, updated_at: "2026-07-05T10:00:00.000Z", deleted_at: null },
      { id: "r2", start_date: "2026-07-30", end_date: null, flow: null, notes: null, updated_at: "2026-07-30T10:00:00.000Z", deleted_at: null },
      { id: "gone", start_date: "2026-06-01", end_date: null, flow: null, notes: null, updated_at: "2026-06-02T10:00:00.000Z", deleted_at: "2026-06-02T10:00:00.000Z" },
    ];
    const { result } = renderHook(() => usePeriodLog());
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));
    await waitFor(() => expect(result.current.logs.map((l) => l.id)).toEqual(["r1", "r2"]));
    // and the device copy now has them too
    expect(JSON.parse(window.localStorage.getItem("bloom.cycle.periods.v1") ?? "[]")).toHaveLength(2);
  });

  it("sends a period logged here up to the account, and a deletion as a tombstone", async () => {
    const { result } = renderHook(() => usePeriodLog());
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));

    let id = "";
    act(() => {
      const r = result.current.add({ start: "2026-08-10", end: "2026-08-14", flow: "heavy", notes: null });
      expect(r.ok).toBe(true);
      if (r.ok) id = r.id;
    });
    await waitFor(() => expect(state.periodUpserts.some((u) => u["id"] === id)).toBe(true), { timeout: 3000 });
    expect(state.periodUpserts.find((u) => u["id"] === id)).toMatchObject({
      profile_id: "p1",
      start_date: "2026-08-10",
      end_date: "2026-08-14",
      flow: "heavy",
      deleted_at: null,
    });

    act(() => result.current.remove(id));
    await waitFor(
      () => expect(state.periodUpserts.filter((u) => u["id"] === id && u["deleted_at"]).length).toBe(1),
      { timeout: 3000 },
    );
    expect(result.current.logs.find((l) => l.id === id)).toBeUndefined();
  });

  it("carries a device-only history onto the account at first sign-in", async () => {
    window.localStorage.setItem(
      "bloom.cycle.periods.v1",
      JSON.stringify([{ id: "old-1", start: "2026-06-01", end: "2026-06-05" }, { id: "old-2", start: "2026-06-29" }]),
    );
    const { result } = renderHook(() => usePeriodLog());
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));
    await waitFor(() => expect(state.periodUpserts.map((u) => u["id"]).sort()).toEqual(["old-1", "old-2"]), { timeout: 3000 });
    expect(result.current.logs).toHaveLength(2);
  });

  it("a deletion made on another device removes the entry here", async () => {
    window.localStorage.setItem(
      "bloom.cycle.periods.v1",
      JSON.stringify([{ id: "shared", start: "2026-06-01", end: "2026-06-05" }]),
    );
    state.periodRows = [
      { id: "shared", start_date: "2026-06-01", end_date: "2026-06-05", flow: null, notes: null, updated_at: "2026-08-01T10:00:00.000Z", deleted_at: "2026-08-01T10:00:00.000Z" },
    ];
    const { result } = renderHook(() => usePeriodLog());
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));
    await waitFor(() => expect(result.current.logs).toEqual([]));
  });

  it("keeps syncing the daily log when the period tables don't exist yet", async () => {
    state.missingPeriodTables = true;
    window.localStorage.setItem(
      "bloom.cycle.periods.v1",
      JSON.stringify([{ id: "old-1", start: "2026-06-01", end: "2026-06-05" }]),
    );
    state.rows = [{ date: "2026-08-28", flow: "medium", updated_at: "2026-08-28T10:00:00.000Z" }];
    const { result } = renderHook(() => usePeriodLog());
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));
    expect(result.current.sync.periodsOnDevice).toBe(true);
    expect(result.current.days.map((d) => d.date)).toEqual(["2026-08-28"]);
    expect(result.current.logs.map((l) => l.id)).toEqual(["old-1"]); // untouched, still here

    act(() => {
      result.current.saveDay({ date: "2026-08-30", flow: "light" });
    });
    await waitFor(() => expect(state.upserts.length).toBe(1), { timeout: 3000 });
    expect(state.periodUpserts).toEqual([]);
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));
  });

  it("an answer given on another device is remembered here", async () => {
    state.stateRow = {
      checkins: { dismissed: { "late:abc": "2026-09-01" }, snoozed: {} },
      settings: { personalMaxPlausible: 55 },
      updated_at: "2026-09-01T10:00:00.000Z",
    };
    const { result } = renderHook(() => usePeriodLog());
    await waitFor(() => expect(result.current.sync.state).toBe("saved"));
    await waitFor(() => expect(result.current.settings.personalMaxPlausible).toBe(55));
    expect(JSON.parse(window.localStorage.getItem("bloom.cycle.checkins.v1") ?? "{}")).toMatchObject({
      dismissed: { "late:abc": "2026-09-01" },
    });
  });
});
