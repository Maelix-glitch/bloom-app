import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * loadMyProfile is the read behind the whole Profile page. Two contracts are
 * load-bearing:
 *
 *  1. A missing row is NOT an error — accounts created before the profile
 *     trigger get defaults until their first save.
 *  2. A failed read (network, RLS, un-run migration) THROWS. It used to
 *     degrade silently to the default identity, which made "the request
 *     failed" look exactly like "Bloom forgot my profile" — the reverted-
 *     to-"Bloom User" report — and invited overwriting real data from the
 *     fake defaults.
 *
 * The banner regression is pinned too: banner_path must be selected, or the
 * banner silently resets on every visit even though the column exists.
 */

const h = vi.hoisted(() => {
  /** Queued `{ data, error }` results, consumed by terminal query methods. */
  const results: { data: unknown; error: unknown }[] = [];
  /** The last `.select()` column list seen, per table. */
  const selects: Record<string, string> = {};

  const builder = (table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of ["eq", "update", "insert", "upsert"]) {
      chain[method] = () => chain;
    }
    chain["select"] = (columns: string) => {
      selects[table] = columns;
      return chain;
    };
    chain["maybeSingle"] = () => Promise.resolve(results.shift() ?? { data: null, error: null });
    return chain;
  };

  const supabase = {
    auth: {
      getUser: async () => ({
        data: { user: { email: "ivy@bloom.app", created_at: "2026-01-05T00:00:00Z" } },
      }),
    },
    from: (table: string) => builder(table),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
      }),
    },
  };

  return { supabase, results, selectOf: (table: string) => selects[table] ?? null };
});

vi.mock("@/lib/supabase", () => ({ supabase: h.supabase }));

import { loadMyProfile, ProfileLoadError } from "./profileService";

beforeEach(() => {
  h.results.length = 0;
});

describe("loadMyProfile", () => {
  it("maps a saved row into the snapshot — banner included", async () => {
    h.results.push(
      {
        data: {
          id: "u1",
          display_name: "  Ivy  ",
          username: "ivy",
          bio: " Slow mornings. ",
          avatar_path: "u1/avatar.jpg",
          banner_path: "u1/banner.jpg",
          accent: "sky",
          featured: { kind: "story", id: "s1" },
        },
        error: null,
      },
      { data: null, error: null }, // privacy row — absent is fine
    );

    const snap = await loadMyProfile("u1");
    expect(snap.identity).toEqual({
      displayName: "Ivy",
      username: "ivy",
      bio: "Slow mornings.",
      avatarPath: "u1/avatar.jpg",
      bannerPath: "u1/banner.jpg",
      accent: "sky",
      featured: { kind: "story", id: "s1" },
    });
    expect(snap.email).toBe("ivy@bloom.app");
    expect(snap.memberSince).toBe("2026-01-05T00:00:00Z");
    /* banner_path must be requested, or it can never come back */
    expect(h.selectOf("profiles")).toContain("banner_path");
  });

  it("returns defaults (no throw) when the account has no profile row yet", async () => {
    h.results.push({ data: null, error: null }, { data: null, error: null });

    const snap = await loadMyProfile("u1");
    expect(snap.identity.displayName).toBe("Bloom User");
    expect(snap.identity.username).toBeNull();
    expect(snap.privacy.profileVisibility).toBe("private");
  });

  it("throws ProfileLoadError when the row cannot be read", async () => {
    h.results.push({ data: null, error: { message: "relation does not exist", code: "42P01" } });

    await expect(loadMyProfile("u1")).rejects.toBeInstanceOf(ProfileLoadError);
  });
});
