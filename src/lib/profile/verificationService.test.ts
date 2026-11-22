import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * loadVerificationFacts is the data half of the blue tick, and since
 * grant-only (owner directive, 2026-11-22) its rules are read-only:
 *
 *   · The only fact is the record: a row in account_verifications for
 *     the caller. There is nothing else to ask — no invite check, and
 *     above all NO claim: the retired self-claim RPC must never be
 *     called, whatever the account looks like. Every scenario below
 *     pins the RPC log empty.
 *   · A record that cannot be read is no record — never a tick.
 *   · Nothing here ever throws: a broken read degrades to unproven.
 */

const h = vi.hoisted(() => {
  const state = {
    user: { id: "u1", email: "ivy@bloom.app" } as { id: string; email: string } | null,
    getUserError: false,
    recordResult: { data: null as unknown, error: null as unknown },
    rpcCalls: [] as string[],
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
    from: () => {
      const chain: Record<string, unknown> = {};
      chain["select"] = () => chain;
      chain["eq"] = () => chain;
      chain["maybeSingle"] = () => Promise.resolve(state.recordResult);
      return chain;
    },
  };

  return { state, supabase };
});

vi.mock("@/lib/supabase", () => ({ hasSupabaseConfig: true, supabase: h.supabase }));
vi.mock("./errors", () => ({ report: () => {} }));

import { loadVerificationFacts } from "./verificationService";

beforeEach(() => {
  h.state.user = { id: "u1", email: "ivy@bloom.app" };
  h.state.getUserError = false;
  h.state.recordResult = { data: null, error: null };
  h.state.rpcCalls = [];
});

describe("loadVerificationFacts", () => {
  it("reads an existing record — and calls no RPC at all", async () => {
    h.state.recordResult = { data: { user_id: "u1" }, error: null };
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ hasRecord: true });
    expect(h.state.rpcCalls).toEqual([]);
  });

  it("reports no record — and never asks for one to be granted", async () => {
    /* The v2 service claimed the record here for an invited member.
       Grant-only: the read is the whole service. An eligible-looking
       account with no record simply has no record. */
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ hasRecord: false });
    expect(h.state.rpcCalls).toEqual([]);
    expect(h.state.rpcCalls).not.toContain("claim_account_verification");
  });

  it("treats an unreadable record as no record", async () => {
    /* E.g. the table isn't on this project yet: the honest answer is
       simply unproven — never a tick, and never a claim attempt over
       the failure. */
    h.state.recordResult = { data: null, error: { message: "relation does not exist", code: "42P01" } };
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ hasRecord: false });
    expect(h.state.rpcCalls).toEqual([]);
  });

  it("degrades to unproven when there is no session user", async () => {
    h.state.user = null;
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ hasRecord: false });
    expect(h.state.rpcCalls).toEqual([]);
  });

  it("degrades to unproven when the auth read itself fails", async () => {
    h.state.getUserError = true;
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ hasRecord: false });
    expect(h.state.rpcCalls).toEqual([]);
  });
});
