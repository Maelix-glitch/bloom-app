import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * loadBadgeFacts is the data half of the member badges (M-209), and
 * like the verification facts service beside it, it is READ-ONLY:
 *
 *   · The facts are two stored records and nothing else: the caller's
 *     own trainer_profiles row (the trainer badge's one truth) and
 *     their own member_badges rows (founder/tester). No RPC is ever
 *     called — the grant functions are service-role only and no
 *     client path may even ask.
 *   · Each read degrades on its own: an unreadable table (the badges
 *     migration not applied yet) reads as "not held", never as held,
 *     and never takes the other fact down with it.
 *   · Nothing here ever throws.
 */

const h = vi.hoisted(() => {
  const state = {
    user: { id: "u1", email: "ivy@bloom.app" } as { id: string; email: string } | null,
    getUserError: false,
    trainerResult: { data: null as unknown, error: null as unknown },
    badgesResult: { data: [] as unknown, error: null as unknown },
    rpcCalls: [] as string[],
    tablesRead: [] as string[],
  };

  const supabase = {
    auth: {
      getUser: async () => {
        if (state.getUserError) throw new Error("no session");
        return { data: { user: state.user } };
      },
    },
    rpc: (name: string) => {
      state.rpcCalls.push(name);
      return Promise.resolve({ data: null, error: null });
    },
    from: (table: string) => {
      state.tablesRead.push(table);
      const chain: Record<string, unknown> = {};
      chain["select"] = () => chain;
      chain["eq"] = () => chain;
      if (table === "trainer_profiles") {
        chain["maybeSingle"] = () => Promise.resolve(state.trainerResult);
      }
      /* The member_badges read is awaited straight off the eq() chain,
         the way PostgREST builders are thenables. */
      chain["then"] = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(state.badgesResult).then(resolve);
      return chain;
    },
  };

  return { state, supabase };
});

vi.mock("@/lib/supabase", () => ({ hasSupabaseConfig: true, supabase: h.supabase }));
vi.mock("./errors", () => ({ report: () => {} }));

import { loadBadgeFacts, UNPROVEN_BADGE_FACTS } from "./badgeService";

beforeEach(() => {
  h.state.user = { id: "u1", email: "ivy@bloom.app" };
  h.state.getUserError = false;
  h.state.trainerResult = { data: null, error: null };
  h.state.badgesResult = { data: [], error: null };
  h.state.rpcCalls = [];
  h.state.tablesRead = [];
});

describe("loadBadgeFacts", () => {
  it("reads both records — and calls no RPC at all", async () => {
    h.state.trainerResult = { data: { user_id: "u1" }, error: null };
    h.state.badgesResult = { data: [{ badge: "founder" }, { badge: "tester" }], error: null };
    const facts = await loadBadgeFacts();
    expect(facts).toEqual({ hasTrainerRow: true, memberBadgeKinds: ["founder", "tester"] });
    expect(h.state.tablesRead).toEqual(["trainer_profiles", "member_badges"]);
    expect(h.state.rpcCalls).toEqual([]);
  });

  it("reports no badges for a member who holds none", async () => {
    const facts = await loadBadgeFacts();
    expect(facts).toEqual({ hasTrainerRow: false, memberBadgeKinds: [] });
    expect(h.state.rpcCalls).toEqual([]);
  });

  it("treats an unreadable member_badges table as no granted badges — the trainer fact still lands", async () => {
    /* The migration not applied yet is the expected early state: the
       founder/tester read fails, the trainer read is unaffected. */
    h.state.trainerResult = { data: { user_id: "u1" }, error: null };
    h.state.badgesResult = {
      data: null,
      error: { message: "relation does not exist", code: "42P01" },
    };
    const facts = await loadBadgeFacts();
    expect(facts).toEqual({ hasTrainerRow: true, memberBadgeKinds: [] });
  });

  it("treats an unreadable trainer table as no trainer row", async () => {
    h.state.trainerResult = {
      data: null,
      error: { message: "relation does not exist", code: "42P01" },
    };
    h.state.badgesResult = { data: [{ badge: "tester" }], error: null };
    const facts = await loadBadgeFacts();
    expect(facts).toEqual({ hasTrainerRow: false, memberBadgeKinds: ["tester"] });
  });

  it("drops surprise badge values instead of passing them through", async () => {
    h.state.badgesResult = {
      data: [{ badge: "founder" }, { badge: 42 }, { badge: null }, {}, "founder"],
      error: null,
    };
    const facts = await loadBadgeFacts();
    expect(facts).toEqual({ hasTrainerRow: false, memberBadgeKinds: ["founder"] });
  });

  it("degrades to unproven when there is no session user", async () => {
    h.state.user = null;
    const facts = await loadBadgeFacts();
    expect(facts).toEqual(UNPROVEN_BADGE_FACTS);
    expect(h.state.rpcCalls).toEqual([]);
  });

  it("degrades to unproven when the auth read itself fails", async () => {
    h.state.getUserError = true;
    const facts = await loadBadgeFacts();
    expect(facts).toEqual(UNPROVEN_BADGE_FACTS);
  });
});
