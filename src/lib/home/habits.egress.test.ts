import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Egress hardening pins (2026-11 follow-up to the 47 GB incident).
 *
 * The incident's shape: the hottest read in the app — the habits fetch —
 * asked PostgREST for `*`, so a column nobody was watching (`icon_url`,
 * carrying a 1.5 MB data: blob) rode along on every pull, and every
 * `useHabits` instance on a screen paid for its own copy of the same rows.
 * These tests pin both halves of the fix:
 *
 *   1. the habits reads name their columns (`HABIT_COLUMNS`), and no
 *      `select("*")` survives anywhere in src;
 *   2. concurrent identical account reads share one network pull, while a
 *      later, sequential read still fetches fresh.
 */

const mocks = vi.hoisted(() => ({
  fromCalls: [] as string[],
  selectArgs: [] as string[],
}));

vi.mock("@/lib/supabase", () => {
  /* A thenable PostgREST-shaped chain: every builder method returns the
     chain, awaiting it resolves the canned page, maybeSingle resolves the
     canned row. */
  const makeChain = (table: string) => {
    const result =
      table === "profiles"
        ? { data: { total_points: 42 }, error: null }
        : { data: [], error: null };
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "gte", "range", "insert", "update"]) {
      chain[method] = (...args: unknown[]) => {
        if (method === "select") mocks.selectArgs.push(String(args[0]));
        return chain;
      };
    }
    chain["maybeSingle"] = () => Promise.resolve(result);
    chain["single"] = () => Promise.resolve({ data: null, error: null });
    chain["then"] = (resolve: (v: unknown) => void) => resolve(result);
    return chain;
  };
  return {
    hasSupabaseConfig: true,
    supabase: {
      from: (table: string) => {
        mocks.fromCalls.push(table);
        return makeChain(table);
      },
    },
  };
});

import { HABIT_COLUMNS, fetchHabits, fetchLogs, readPoints } from "./habits";

beforeEach(() => {
  mocks.fromCalls = [];
  mocks.selectArgs = [];
});

describe("HABIT_COLUMNS — the habits fetch names its columns", () => {
  it("is exactly the set rowToHabit consumes", () => {
    expect(HABIT_COLUMNS.split(",").map((c) => c.trim())).toEqual([
      "id",
      "name",
      "note",
      "icon_type",
      "icon_value",
      "icon_url",
      "color",
      "frequency",
      "days",
      "times_per_week",
      "goal_enabled",
      "goal_target",
      "goal_unit",
      "point_value",
      "priority",
      "reminder_enabled",
      "reminder_time",
      "tags",
      "start_date",
      "is_archived",
      "paused_from",
      "paused_until",
      "created_at",
    ]);
  });

  it("fetchHabits selects that list, never the star", async () => {
    await fetchHabits("profile-1");
    expect(mocks.selectArgs).toEqual([HABIT_COLUMNS]);
  });
});

describe("concurrent identical reads share one pull", () => {
  it("two simultaneous fetchHabits calls hit the table once; a later call refetches", async () => {
    const [a, b] = await Promise.all([fetchHabits("profile-1"), fetchHabits("profile-1")]);
    expect(a).toEqual([]);
    expect(b).toEqual([]);
    expect(mocks.fromCalls.filter((t) => t === "habits")).toHaveLength(1);

    await fetchHabits("profile-1");
    expect(mocks.fromCalls.filter((t) => t === "habits")).toHaveLength(2);
  });

  it("fetchLogs dedupes per (profile, since) window", async () => {
    await Promise.all([fetchLogs("profile-1", "2025-01-01"), fetchLogs("profile-1", "2025-01-01")]);
    expect(mocks.fromCalls.filter((t) => t === "habit_logs")).toHaveLength(1);

    await Promise.all([fetchLogs("profile-1", "2025-01-01"), fetchLogs("profile-1", "2025-06-01")]);
    expect(mocks.fromCalls.filter((t) => t === "habit_logs")).toHaveLength(3);
  });

  it("readPoints dedupes simultaneous balance reads", async () => {
    const [a, b] = await Promise.all([readPoints("profile-1"), readPoints("profile-1")]);
    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(mocks.fromCalls.filter((t) => t === "profiles")).toHaveLength(1);
  });
});

describe("no select-star survives in src", () => {
  const SRC = join(process.cwd(), "src");

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      if (name.startsWith("_backup") || name === "node_modules") continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
    }
    return out;
  }

  const STAR = /\.select\(\s*["'`]\*["'`]\s*\)/;

  it("has no .select(\"*\") in any shipped module", () => {
    const offenders = walk(SRC)
      .map((path) => ({ rel: path.slice(SRC.length + 1).split(sep).join("/"), text: readFileSync(path, "utf8") }))
      .filter((f) => STAR.test(f.text))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });
});
