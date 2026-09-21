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
  /** Every `profiles` select, in order — the retry path is the point. */
  const profileSelects: string[] = [];
  let refreshes = 0;

  const builder = (table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of ["eq", "update", "insert", "upsert"]) {
      chain[method] = () => chain;
    }
    chain["select"] = (columns: string) => {
      selects[table] = columns;
      if (table === "profiles") profileSelects.push(columns);
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
      refreshSession: async () => {
        refreshes += 1;
        return { data: { session: { access_token: "fresh" } }, error: null };
      },
    },
    from: (table: string) => builder(table),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
      }),
    },
  };

  return {
    supabase,
    results,
    selectOf: (table: string) => selects[table] ?? null,
    profileSelects,
    refreshes: () => refreshes,
    resetRefreshes: () => {
      refreshes = 0;
    },
  };
});

vi.mock("@/lib/supabase", () => ({ supabase: h.supabase }));

import { loadMyProfile, ProfileLoadError } from "./profileService";

beforeEach(() => {
  h.results.length = 0;
  h.profileSelects.length = 0;
  h.resetRefreshes();
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

  it("carries the kind of failure out to the screen", async () => {
    /* Two: the first is answered with a session refresh and one more try. */
    h.results.push(
      { data: null, error: { message: "JWT expired", code: "PGRST301" } },
      { data: null, error: { message: "JWT expired", code: "PGRST301" } },
    );

    const error = await loadMyProfile("u1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProfileLoadError);
    expect((error as ProfileLoadError).problem.kind).toBe("session");
    expect((error as ProfileLoadError).problem.message).toMatch(/sign-in went stale/i);
    expect(h.refreshes()).toBe(1);
  });

  /**
   * A project that ran `20260909_core_tables.sql` but not
   * `20260828_profile_identity_stories.sql` has a `profiles` table with none of
   * the identity columns. The full select fails; the row is still perfectly
   * readable with fewer columns, and a working page beats an error wall.
   */
  it("reads what it can when an identity column is missing", async () => {
    h.results.push(
      {
        data: null,
        error: { message: "column profiles.featured does not exist", code: "42703" },
      },
      { data: { id: "u1", display_name: "Ivy", accent: "rose" }, error: null },
      { data: null, error: null }, // privacy
    );

    const snap = await loadMyProfile("u1");
    expect(snap.identity.displayName).toBe("Ivy");
    expect(snap.identity.accent).toBe("rose");
    /* Columns the project doesn't have come back as null, never undefined. */
    expect(snap.identity.username).toBeNull();
    expect(snap.identity.bannerPath).toBeNull();
    expect(snap.identity.featured).toBeNull();
    expect(h.profileSelects.length).toBe(2);
    expect(h.profileSelects[1]).not.toContain("featured");
  });

  it("does not keep narrowing the select when the whole table is missing", async () => {
    h.results.push({ data: null, error: { message: "relation does not exist", code: "42P01" } });

    await expect(loadMyProfile("u1")).rejects.toBeInstanceOf(ProfileLoadError);
    expect(h.profileSelects.length).toBe(1);
  });

  it("refreshes a stale session and reads again with the same columns", async () => {
    h.results.push(
      { data: null, error: { message: "JWT expired", code: "PGRST301" } },
      { data: { id: "u1", display_name: "Ivy", banner_path: "u1/banner.jpg" }, error: null },
      { data: null, error: null },
    );

    const snap = await loadMyProfile("u1");
    expect(h.refreshes()).toBe(1);
    expect(snap.identity.displayName).toBe("Ivy");
    expect(snap.identity.bannerPath).toBe("u1/banner.jpg");
    /* The retry asks for everything again — a token was the problem, not the schema. */
    expect(h.profileSelects.length).toBe(2);
    expect(h.profileSelects[1]).toBe(h.profileSelects[0]);
  });

  it("survives an auth client that cannot even answer getUser", async () => {
    const getUser = h.supabase.auth.getUser;
    h.supabase.auth.getUser = async () => {
      throw new Error("Bloom isn't connected to a database in this environment.");
    };
    h.results.push(
      { data: { id: "u1", display_name: "Ivy" }, error: null },
      { data: null, error: null },
    );

    const snap = await loadMyProfile("u1");
    expect(snap.identity.displayName).toBe("Ivy");
    expect(snap.email).toBeNull();
    h.supabase.auth.getUser = getUser;
  });
});
