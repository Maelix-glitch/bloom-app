import { beforeEach, describe, expect, it } from "vitest";

import { hashSeed, pick, pickStable, resetVoice } from "./messages";

/**
 * These tests exist because the whole point of the voice layer is *not
 * repeating itself*. That property is easy to break silently — a bad memory
 * write and every user sees "Saved." forever — and impossible to notice by
 * hand, so it is pinned here.
 */

/** vitest runs in node; the module guards on `window`, so supply a minimal one. */
function installStorage(): void {
  const map = new Map<string, string>();
  (globalThis as Record<string, unknown>)["window"] = {
    localStorage: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    },
  };
}

beforeEach(() => {
  installStorage();
  resetVoice();
});

describe("pick", () => {
  it("returns a member of the pool", () => {
    const pool = ["a", "b", "c"];
    expect(pool).toContain(pick("k", pool));
  });

  it("handles the degenerate pools without throwing", () => {
    expect(pick("empty", [])).toBe("");
    expect(pick("one", ["only"])).toBe("only");
  });

  it("exhausts the whole pool before repeating anything", () => {
    const pool = ["a", "b", "c", "d"];
    const seen = new Set<string>();
    for (let i = 0; i < pool.length; i += 1) seen.add(pick("cycle", pool));
    expect(seen.size).toBe(pool.length);
  });

  it("starts over once every line has been used", () => {
    const pool = ["a", "b"];
    const out = Array.from({ length: 6 }, () => pick("wrap", pool));
    /* still only ever real members, and both keep appearing */
    expect(new Set(out)).toEqual(new Set(pool));
  });

  it("keeps separate memory per key", () => {
    const pool = ["a", "b"];
    pick("one", pool);
    pick("one", pool);
    /* "two" has its own history, so both options are still fresh for it */
    const first = pick("two", pool);
    const second = pick("two", pool);
    expect(first).not.toBe(second);
  });

  it("is deterministic for a given seed", () => {
    const pool = ["a", "b", "c", "d", "e"];
    resetVoice();
    const a = pick("seeded", pool, "2026-09-08");
    resetVoice();
    const b = pick("seeded", pool, "2026-09-08");
    expect(a).toBe(b);
  });
});

describe("pickStable", () => {
  it("gives the same line for the same seed and writes nothing", () => {
    const pool = ["a", "b", "c"];
    expect(pickStable(pool, "x")).toBe(pickStable(pool, "x"));
  });

  it("spreads different seeds across the pool", () => {
    const pool = ["a", "b", "c", "d"];
    const seen = new Set(
      Array.from({ length: 60 }, (_, i) => pickStable(pool, `seed-${i}`)),
    );
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("hashSeed", () => {
  it("is stable and non-negative", () => {
    expect(hashSeed("bloom")).toBe(hashSeed("bloom"));
    expect(hashSeed("bloom")).toBeGreaterThanOrEqual(0);
  });

  it("separates similar strings", () => {
    expect(hashSeed("2026-09-08")).not.toBe(hashSeed("2026-09-09"));
  });
});
