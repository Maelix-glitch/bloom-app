import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ledger integrity for habit points.
 *
 * The bug (found live): a 375-point balance whose `point_transactions` rows
 * summed to 70. The balance had been moved by the fallback in the old
 * `adjustPoints` — the legacy increment/decrement RPCs, or a direct profile
 * update when those failed — none of which write a ledger row.
 *
 * The contracts pinned here:
 *
 *  1. The fallback (`adjustHabitPoints`) goes through the ledgered
 *     `adjust_habit_points` RPC, carrying the award's stable identity
 *     (habit + local day) — the same identity the server's unique award key
 *     dedupes on, so a retry can never pay twice.
 *  2. When that RPC is missing too, the fallback returns null and touches
 *     nothing: no legacy RPC call, no direct `profiles` write. An unlogged
 *     balance change must be impossible, not just unlikely.
 *  3. The primary award/revoke RPCs keep their behaviour, including
 *     returning null on a missing function so the hook falls through to
 *     the ledgered fallback.
 *  4. Structurally: the unlogged writers cannot creep back into the two
 *     files that move habit points.
 */

const h = vi.hoisted(() => {
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const rpcResults = new Map<string, { data: unknown; error: unknown }>();
  const fromTables: string[] = [];

  const supabase = {
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return Promise.resolve(rpcResults.get(name) ?? { data: null, error: null });
    },
    from: (table: string) => {
      fromTables.push(table);
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "update", "insert", "upsert", "delete", "eq"]) {
        chain[method] = () => chain;
      }
      chain["maybeSingle"] = () => Promise.resolve({ data: null, error: null });
      chain["single"] = () => Promise.resolve({ data: null, error: null });
      return chain;
    },
  };

  return {
    supabase,
    rpcCalls,
    fromTables,
    setRpc: (name: string, result: { data: unknown; error: unknown }) =>
      rpcResults.set(name, result),
    reset: () => {
      rpcCalls.length = 0;
      rpcResults.clear();
      fromTables.length = 0;
    },
  };
});

vi.mock("@/lib/supabase", () => ({ supabase: h.supabase, hasSupabaseConfig: true }));

import { adjustHabitPoints, awardHabitPoints, revokeHabitPoints } from "@/lib/home/habits";

const PROFILE = "profile-1";
const HABIT = "habit-1";
const DATE = "2026-11-06";

const MISSING_RPC = {
  data: null,
  error: { code: "PGRST202", message: "Could not find the function in the schema cache" },
};

beforeEach(() => h.reset());

describe("adjustHabitPoints — the ledgered fallback", () => {
  it("awards through adjust_habit_points with the award's stable identity", async () => {
    h.setRpc("adjust_habit_points", {
      data: [{ applied: true, points: 10, balance: 375 }],
      error: null,
    });
    const result = await adjustHabitPoints(PROFILE, HABIT, DATE, 10);
    expect(result).toEqual({ applied: true, points: 10, balance: 375 });
    expect(h.rpcCalls).toEqual([
      { name: "adjust_habit_points", args: { p_habit_id: HABIT, p_date: DATE, p_delta: 10 } },
    ]);
  });

  it("revokes through the same function with a negative delta", async () => {
    h.setRpc("adjust_habit_points", {
      data: [{ applied: true, points: 10, balance: 365 }],
      error: null,
    });
    const result = await adjustHabitPoints(PROFILE, HABIT, DATE, -10);
    expect(result).toEqual({ applied: true, points: 10, balance: 365 });
    expect(h.rpcCalls[0]?.args).toEqual({ p_habit_id: HABIT, p_date: DATE, p_delta: -10 });
  });

  it("is idempotent: a repeat of the same award reuses the same key and reports not-applied", async () => {
    h.setRpc("adjust_habit_points", {
      data: [{ applied: true, points: 10, balance: 375 }],
      error: null,
    });
    const first = await adjustHabitPoints(PROFILE, HABIT, DATE, 10);
    // The server's unique award key refuses the second insert: applied
    // false, balance unmoved. The client must pass the identical identity
    // for that refusal to be the same award, not a new one.
    h.setRpc("adjust_habit_points", {
      data: [{ applied: false, points: 0, balance: 375 }],
      error: null,
    });
    const second = await adjustHabitPoints(PROFILE, HABIT, DATE, 10);

    expect(first?.applied).toBe(true);
    expect(second).toEqual({ applied: false, points: 0, balance: 375 });
    expect(h.rpcCalls).toHaveLength(2);
    expect(h.rpcCalls[1]).toEqual(h.rpcCalls[0]);
  });

  it("does nothing for a zero delta", async () => {
    expect(await adjustHabitPoints(PROFILE, HABIT, DATE, 0)).toBeNull();
    expect(h.rpcCalls).toEqual([]);
    expect(h.fromTables).toEqual([]);
  });

  it("when the RPC is missing, returns null and never falls back to an unlogged write", async () => {
    h.setRpc("adjust_habit_points", MISSING_RPC);
    const result = await adjustHabitPoints(PROFILE, HABIT, DATE, 10);
    expect(result).toBeNull();
    // The whole point of the fix: no legacy balance-only RPC, and no
    // direct table write of any kind, happened on the way out.
    expect(h.rpcCalls.map((c) => c.name)).toEqual(["adjust_habit_points"]);
    expect(h.fromTables).toEqual([]);
  });

  it("throws on a real error instead of quietly adjusting anything", async () => {
    h.setRpc("adjust_habit_points", {
      data: null,
      error: { code: "42501", message: "Not allowed." },
    });
    await expect(adjustHabitPoints(PROFILE, HABIT, DATE, 10)).rejects.toMatchObject({
      code: "42501",
    });
    expect(h.fromTables).toEqual([]);
  });
});

describe("the primary award/revoke RPCs (already ledgered)", () => {
  it("awardHabitPoints still routes to award_habit_points and parses its row", async () => {
    h.setRpc("award_habit_points", {
      data: [{ awarded: true, points: 10, balance: 375 }],
      error: null,
    });
    await expect(awardHabitPoints(PROFILE, HABIT, DATE, 10)).resolves.toEqual({
      awarded: true,
      points: 10,
      balance: 375,
    });
    expect(h.rpcCalls.map((c) => c.name)).toEqual(["award_habit_points"]);
  });

  it("revokeHabitPoints still routes to revoke_habit_points and parses its row", async () => {
    h.setRpc("revoke_habit_points", {
      data: [{ revoked: true, points: 10, balance: 365 }],
      error: null,
    });
    await expect(revokeHabitPoints(PROFILE, HABIT, DATE)).resolves.toEqual({
      revoked: true,
      points: 10,
      balance: 365,
    });
    expect(h.rpcCalls.map((c) => c.name)).toEqual(["revoke_habit_points"]);
  });

  it("a missing primary RPC returns null, so the hook falls through to the ledgered fallback", async () => {
    h.setRpc("award_habit_points", MISSING_RPC);
    await expect(awardHabitPoints(PROFILE, HABIT, DATE, 10)).resolves.toBeNull();
    h.setRpc("revoke_habit_points", MISSING_RPC);
    await expect(revokeHabitPoints(PROFILE, HABIT, DATE)).resolves.toBeNull();
  });
});

describe("structural guard — the unlogged writers stay out", () => {
  const stripComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("neither habit-points file calls the balance-only RPCs or writes total_points directly", () => {
    for (const rel of ["src/lib/home/habits.ts", "src/hooks/useHabits.ts"]) {
      const code = stripComments(readFileSync(join(process.cwd(), rel), "utf8"));
      expect(code, rel).not.toContain("increment_points");
      expect(code, rel).not.toContain("decrement_points");
      expect(code, rel).not.toContain("adjustPoints(");
      expect(code, rel).not.toMatch(/\.update\(\s*\{\s*total_points/);
    }
  });
});
