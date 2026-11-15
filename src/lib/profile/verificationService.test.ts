import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * loadVerificationFacts is the data half of the blue tick, and its rules
 * are the conservative ones:
 *
 *   · Only a literal `true` from is_email_invited counts as invited.
 *   · A record that cannot be read is no record — never a tick.
 *   · The claim RPC is asked ONLY when the account is invited and no
 *     record exists yet; it is the server's gates that decide, and an
 *     empty answer leaves hasRecord false.
 *   · Nothing here ever throws: a broken read degrades to unproven.
 */

const h = vi.hoisted(() => {
  const state = {
    user: { id: "u1", email: "ivy@bloom.app" } as { id: string; email: string } | null,
    getUserError: false,
    inviteResult: { data: true as unknown, error: null as unknown },
    recordResult: { data: null as unknown, error: null as unknown },
    claimResult: { data: [] as unknown, error: null as unknown },
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
      if (name === "is_email_invited") return Promise.resolve(state.inviteResult);
      if (name === "claim_account_verification") return Promise.resolve(state.claimResult);
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
  h.state.inviteResult = { data: true, error: null };
  h.state.recordResult = { data: null, error: null };
  h.state.claimResult = { data: [], error: null };
  h.state.rpcCalls = [];
});

describe("loadVerificationFacts", () => {
  it("reads an existing record without asking for a claim", async () => {
    h.state.recordResult = { data: { user_id: "u1" }, error: null };
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ invited: true, hasRecord: true });
    expect(h.state.rpcCalls).toEqual(["is_email_invited"]);
  });

  it("claims the record for an invited member who has none yet", async () => {
    h.state.claimResult = { data: [{ user_id: "u1" }], error: null };
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ invited: true, hasRecord: true });
    expect(h.state.rpcCalls).toEqual(["is_email_invited", "claim_account_verification"]);
  });

  it("stays unrecorded when the server-side gates refuse the claim", async () => {
    /* Invited, but e.g. the profile is incomplete: the function returns
       no rows and that is the whole answer. */
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ invited: true, hasRecord: false });
    expect(h.state.rpcCalls).toEqual(["is_email_invited", "claim_account_verification"]);
  });

  it("never asks for a claim when the account is not invited", async () => {
    h.state.inviteResult = { data: false, error: null };
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ invited: false, hasRecord: false });
    expect(h.state.rpcCalls).toEqual(["is_email_invited"]);
  });

  it("treats an invite-check error as not invited", async () => {
    h.state.inviteResult = { data: null, error: { message: "boom" } };
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ invited: false, hasRecord: false });
    expect(h.state.rpcCalls).not.toContain("claim_account_verification");
  });

  it("treats an unreadable record as no record — and does not claim over it", async () => {
    /* E.g. the table isn't on this project yet: claiming would fail the
       same way, so the honest answer is simply unproven. */
    h.state.recordResult = { data: null, error: { message: "relation does not exist", code: "42P01" } };
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ invited: true, hasRecord: false });
    expect(h.state.rpcCalls).not.toContain("claim_account_verification");
  });

  it("degrades to unproven when there is no session user", async () => {
    h.state.user = null;
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ invited: false, hasRecord: false });
    expect(h.state.rpcCalls).toEqual([]);
  });

  it("degrades to unproven when the auth read itself fails", async () => {
    h.state.getUserError = true;
    const facts = await loadVerificationFacts();
    expect(facts).toEqual({ invited: false, hasRecord: false });
  });
});
