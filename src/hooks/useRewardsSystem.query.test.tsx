// @vitest-environment jsdom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  configured: true,
  session: { userId: "user-1" as string | null, ready: true },
}));

vi.mock("@/lib/supabase", () => ({
  get hasSupabaseConfig() {
    return mocks.configured;
  },
  supabaseConfigProblem: () => null,
  supabase: { rpc: mocks.rpc },
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => mocks.session,
}));

import { useRewardsSystem, type UserReward } from "./useRewardsSystem";

const REWARD: UserReward = {
  id: "r1",
  title: "Tea for two",
  description: "A reward",
  image_url: null,
  reward_type: "treat",
  value_details: null,
  admin_message: null,
  publish_at: null,
  expires_at: null,
  delivery_state: "published",
  claimed_at: null,
};

function rpcRouter(overrides: Record<string, unknown> = {}) {
  const table: Record<string, unknown> = {
    get_my_rewards: { data: [REWARD], error: null },
    is_rewards_admin: { data: false, error: null },
    admin_list_rewards: { data: [], error: null },
    admin_list_reward_users: { data: [], error: null },
    claim_reward: {
      data: { id: "r1", title: "Tea for two", delivery_state: "claimed", claimed_at: "2026-11-09T10:00:00Z" },
      error: null,
    },
    ...overrides,
  };
  return async (name: string) => table[name] ?? { data: null, error: null };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mocks.configured = true;
  mocks.session = { userId: "user-1", ready: true };
  mocks.rpc.mockReset().mockImplementation(rpcRouter());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("useRewardsSystem on react-query", () => {
  it("loads my rewards and settles loading", async () => {
    const { result } = renderHook(() => useRewardsSystem(), { wrapper });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rewards).toHaveLength(1);
    expect(result.current.rewards[0]!.title).toBe("Tea for two");
    expect(result.current.error).toBeNull();
    expect(result.current.userId).toBe("user-1");
  });

  it("signed out: no fetch, empty list, no error", async () => {
    mocks.session = { userId: null, ready: true };
    const { result } = renderHook(() => useRewardsSystem(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rewards).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalledWith("get_my_rewards");
  });

  it("surfaces a load failure as the error", async () => {
    mocks.rpc.mockImplementation(
      rpcRouter({ get_my_rewards: { data: null, error: { message: "rpc exploded" } } }),
    );
    const { result } = renderHook(() => useRewardsSystem(), { wrapper });
    await waitFor(() => expect(result.current.error).toBe("rpc exploded"));
    expect(result.current.rewards).toEqual([]);
  });

  it("fails the admin gate closed when the RPC errors", async () => {
    mocks.rpc.mockImplementation(
      rpcRouter({ is_rewards_admin: { data: null, error: { message: "nope" } } }),
    );
    const { result } = renderHook(() => useRewardsSystem(), { wrapper });
    await act(async () => {
      expect(await result.current.checkAdmin()).toBe(false);
    });
    expect(result.current.isAdmin).toBe(false);
  });

  it("refuses the admin workspace to a non-admin without calling the admin RPCs", async () => {
    const { result } = renderHook(() => useRewardsSystem(), { wrapper });
    await act(async () => {
      await result.current.loadAdminWorkspace();
    });
    expect(result.current.adminError).toBe("Rewards administrator access required.");
    expect(result.current.adminRewards).toEqual([]);
    expect(mocks.rpc).not.toHaveBeenCalledWith("admin_list_rewards");
  });

  it("loads the admin workspace for an admin", async () => {
    mocks.rpc.mockImplementation(
      rpcRouter({
        is_rewards_admin: { data: true, error: null },
        admin_list_rewards: {
          data: [{ ...REWARD, state: "draft", created_at: "2026-11-01T00:00:00Z", recipient_ids: [], assignment_states: [] }],
          error: null,
        },
        admin_list_reward_users: {
          data: [{ user_id: "user-2", email: "two@bloom.test", display_name: "Two" }],
          error: null,
        },
      }),
    );
    const { result } = renderHook(() => useRewardsSystem(), { wrapper });
    await act(async () => {
      await result.current.loadAdminWorkspace();
    });
    expect(result.current.adminError).toBeNull();
    expect(result.current.adminRewards).toHaveLength(1);
    expect(result.current.adminUsers).toHaveLength(1);
    expect(result.current.isAdmin).toBe(true);
  });

  it("claim settles the optimistic update with the server's timestamp", async () => {
    const { result } = renderHook(() => useRewardsSystem(), { wrapper });
    await waitFor(() => expect(result.current.rewards).toHaveLength(1));
    await act(async () => {
      await result.current.claimReward("r1");
    });
    expect(result.current.rewards[0]!.delivery_state).toBe("claimed");
    expect(result.current.rewards[0]!.claimed_at).toBe("2026-11-09T10:00:00Z");
    expect(result.current.error).toBeNull();
  });

  it("claim rolls back and reports when the server refuses", async () => {
    mocks.rpc.mockImplementation(
      rpcRouter({ claim_reward: { data: null, error: { message: "already claimed" } } }),
    );
    const { result } = renderHook(() => useRewardsSystem(), { wrapper });
    await waitFor(() => expect(result.current.rewards).toHaveLength(1));
    await act(async () => {
      await expect(result.current.claimReward("r1")).rejects.toThrow();
    });
    expect(result.current.rewards[0]!.delivery_state).toBe("published");
    expect(result.current.error).toBe("already claimed");
  });
});
