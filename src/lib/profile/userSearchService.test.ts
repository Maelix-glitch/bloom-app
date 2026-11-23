import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * searchProfiles is the only door to other people in Bloom, so its rules
 * are pinned here:
 *
 *   · The RPC is `search_profiles`, called with the trimmed term — the
 *     client never queries `profiles` or `account_verifications` itself.
 *   · `verified` is a literal-true boolean from the server (the
 *     account_verifications record), never inferred from the profile.
 *   · The searcher is filtered out client-side too, and the list is
 *     capped at 20 here as well as in the function — defence in depth.
 *   · A short term makes no call; a failed call is an honest error
 *     outcome, never a throw and never an empty list dressed as success.
 */

const h = vi.hoisted(() => {
  const state = {
    config: true,
    rpcResult: { data: [] as unknown, error: null as unknown },
    rpcCalls: [] as { name: string; args: unknown }[],
  };
  const supabase = {
    rpc: (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args });
      return Promise.resolve(state.rpcResult);
    },
  };
  return { state, supabase };
});

vi.mock("@/lib/supabase", () => ({
  get hasSupabaseConfig() {
    return h.state.config;
  },
  supabase: h.supabase,
}));
vi.mock("./errors", () => ({ report: () => {} }));

import { searchProfiles, USER_SEARCH_LIMIT } from "./userSearchService";

const row = (over: Record<string, unknown> = {}) => ({
  user_id: "u-ivy",
  display_name: "Ivy Chen",
  username: "ivy",
  avatar_path: null,
  accent: "sage",
  verified: true,
  is_trainer: false,
  badges: [] as unknown,
  ...over,
});

beforeEach(() => {
  h.state.config = true;
  h.state.rpcResult = { data: [], error: null };
  h.state.rpcCalls = [];
});

describe("searchProfiles", () => {
  it("calls the search_profiles RPC with the trimmed term", async () => {
    h.state.rpcResult = { data: [row()], error: null };
    const outcome = await searchProfiles("  ivy  ", "me");
    expect(h.state.rpcCalls).toEqual([{ name: "search_profiles", args: { p_term: "ivy" } }]);
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.results).toEqual([
        {
          userId: "u-ivy",
          displayName: "Ivy Chen",
          username: "ivy",
          avatarPath: null,
          accent: "sage",
          verified: true,
          badges: [],
        },
      ]);
    }
  });

  it("derives badges from the RPC's trainer flag and granted kinds, in display order", async () => {
    h.state.rpcResult = {
      data: [
        row({ user_id: "a", is_trainer: true, badges: ["tester", "founder"] }),
        row({ user_id: "b", is_trainer: false, badges: ["founder"] }),
        row({ user_id: "c", is_trainer: "yes", badges: "founder" }),
        row({ user_id: "d", is_trainer: true, badges: ["admin", "trainer", 42] }),
      ],
      error: null,
    };
    const outcome = await searchProfiles("iv", "me");
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.results.map((r) => r.badges.map((b) => b.kind))).toEqual([
        ["founder", "trainer", "tester"],
        ["founder"],
        [],
        /* The trainer flag is the trainer badge's only truth here too:
           a "trainer" string in the kinds array earns nothing, and
           surprise values are dropped, never rendered. */
        ["trainer"],
      ]);
    }
  });

  it("shows the tick only for a literal true — the record, nothing else", async () => {
    h.state.rpcResult = {
      data: [
        row({ user_id: "a", verified: true }),
        row({ user_id: "b", verified: false }),
        row({ user_id: "c", verified: null }),
        row({ user_id: "d", verified: "yes" }),
      ],
      error: null,
    };
    const outcome = await searchProfiles("iv", "me");
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.results.map((r) => r.verified)).toEqual([true, false, false, false]);
    }
  });

  it("excludes the searcher even when the server returns them", async () => {
    h.state.rpcResult = {
      data: [row({ user_id: "me", username: "me" }), row({ user_id: "u-ivy" })],
      error: null,
    };
    const outcome = await searchProfiles("iv", "me");
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.results.map((r) => r.userId)).toEqual(["u-ivy"]);
    }
  });

  it("caps the list at the limit even if the server sends more", async () => {
    h.state.rpcResult = {
      data: Array.from({ length: USER_SEARCH_LIMIT + 5 }, (_, i) =>
        row({ user_id: `u-${i}`, username: `user${i}` }),
      ),
      error: null,
    };
    const outcome = await searchProfiles("us", "me");
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") expect(outcome.results).toHaveLength(USER_SEARCH_LIMIT);
  });

  it("makes no call for a term under two characters", async () => {
    for (const term of ["", " ", "i"]) {
      const outcome = await searchProfiles(term, "me");
      expect(outcome).toEqual({ status: "ok", results: [] });
    }
    expect(h.state.rpcCalls).toEqual([]);
  });

  it("reports an RPC failure as an error outcome, never a throw", async () => {
    h.state.rpcResult = { data: null, error: { message: "function does not exist" } };
    const outcome = await searchProfiles("ivy", "me");
    expect(outcome).toEqual({ status: "error" });
  });

  it("reports no-config as an error outcome without calling", async () => {
    h.state.config = false;
    const outcome = await searchProfiles("ivy", "me");
    expect(outcome).toEqual({ status: "error" });
    expect(h.state.rpcCalls).toEqual([]);
  });

  it("normalises surprise shapes instead of trusting them", async () => {
    h.state.rpcResult = {
      data: [
        row({ user_id: "ok", username: "@MixedCase", display_name: "  Kay  " }),
        row({ user_id: null }),
        row({ user_id: "  " }),
        "not-a-row",
        row({ user_id: "no-name", display_name: null, username: null, accent: "neon" }),
      ],
      error: null,
    };
    const outcome = await searchProfiles("ka", "me");
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.results).toEqual([
        {
          userId: "ok",
          displayName: "Kay",
          username: "mixedcase",
          avatarPath: null,
          accent: "sage",
          verified: true,
          badges: [],
        },
        {
          userId: "no-name",
          displayName: "Bloom User",
          username: null,
          avatarPath: null,
          /* M-225: an unknown accent falls back to the amber default (was violet). */
          accent: "amber",
          verified: true,
          badges: [],
        },
      ]);
    }
  });

  it("treats a non-array payload as an empty result, not a crash", async () => {
    h.state.rpcResult = { data: { nope: true }, error: null };
    const outcome = await searchProfiles("ivy", "me");
    expect(outcome).toEqual({ status: "ok", results: [] });
  });
});
