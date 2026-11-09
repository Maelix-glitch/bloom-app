/**
 * Rewards data — a person's delivered rewards and the admin workspace —
 * on react-query (see lib/query.ts: this surface is pure server state,
 * so it gets the query client instead of another hand-rolled copy of
 * the loading/error/reload plumbing).
 *
 * The public API is the hand-rolled version's, field for field, so the
 * consumers didn't change: same loading/error surfaces, same imperative
 * reloads, same throwing mutation wrappers. What changed underneath:
 * caching + dedupe + refetch are the client's job, the session comes
 * from the shared useSession store instead of a private auth listener,
 * and claiming a reward updates the cached list optimistically —
 * rolling back if the server refuses — instead of waiting a round-trip
 * to show the claim.
 */

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/hooks/useSession";
import { queryKeys } from "@/lib/query";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";

export type RewardStatus = "draft" | "published" | "claimed" | "expired" | "revoked";

export interface UserReward {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  reward_type: string;
  value_details: string | null;
  admin_message: string | null;
  publish_at: string | null;
  expires_at: string | null;
  delivery_state: Extract<RewardStatus, "published" | "claimed">;
  claimed_at: string | null;
}

export interface AdminUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
}

export interface AdminReward {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  reward_type: string;
  value_details: string | null;
  admin_message: string | null;
  state: RewardStatus;
  publish_at: string | null;
  expires_at: string | null;
  created_at: string;
  recipient_ids: string[];
  assignment_states: { user_id: string; state: RewardStatus; claimed_at: string | null }[];
}

export interface RewardDraftInput {
  title: string;
  description: string;
  imageUrl: string;
  rewardType: string;
  valueDetails: string;
  adminMessage: string;
  publishAt: string;
  expiresAt: string;
}

function messageFrom(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return error instanceof Error ? error.message : "Something went wrong with Rewards.";
}

function toTimestamp(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function ensureSupabase() {
  if (!hasSupabaseConfig) {
    throw new Error("Bloom isn't connected to a database in this environment, so rewards can't be claimed here.");
  }
}

const UNCONFIGURED_USER =
  "Bloom isn't connected to a database in this environment, so rewards can't be loaded here.";
const UNCONFIGURED_ADMIN = "Bloom isn't connected to a database in this environment.";
const ADMIN_REQUIRED = "Rewards administrator access required.";

async function fetchMyRewards(): Promise<UserReward[]> {
  const { data, error } = await supabase.rpc("get_my_rewards");
  if (error) throw error;
  return (data ?? []) as UserReward[];
}

async function fetchIsRewardsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_rewards_admin");
  if (error) throw error;
  return Boolean(data);
}

interface AdminWorkspace {
  rewards: AdminReward[];
  users: AdminUser[];
}

async function fetchAdminWorkspace(): Promise<AdminWorkspace> {
  const [rewardsResult, usersResult] = await Promise.all([
    supabase.rpc("admin_list_rewards"),
    supabase.rpc("admin_list_reward_users"),
  ]);
  if (rewardsResult.error) throw rewardsResult.error;
  if (usersResult.error) throw usersResult.error;
  return {
    rewards: (rewardsResult.data ?? []) as AdminReward[],
    users: (usersResult.data ?? []) as AdminUser[],
  };
}

export function useRewardsSystem() {
  const queryClient = useQueryClient();
  const { userId, ready } = useSession();
  const [claimError, setClaimError] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);

  /* ------------------------------------------------------------ mine */

  const mineKey = queryKeys.rewardsMine(userId);
  const mineQuery = useQuery({
    queryKey: mineKey,
    queryFn: fetchMyRewards,
    enabled: hasSupabaseConfig && ready && !!userId,
  });

  const rewards = mineQuery.data ?? [];
  const loading = !hasSupabaseConfig
    ? false
    : !ready || (!!userId && mineQuery.isLoading);
  const loadError = mineQuery.error ? messageFrom(mineQuery.error) : null;
  const error = claimError ?? (hasSupabaseConfig ? loadError : UNCONFIGURED_USER);

  const reload = useCallback(async () => {
    setClaimError(null);
    await queryClient.refetchQueries({ queryKey: queryKeys.rewardsMine(userId), exact: true });
  }, [queryClient, userId]);

  /* ------------------------------------------------------------ admin gate */

  const checkAdmin = useCallback(async (): Promise<boolean> => {
    if (!hasSupabaseConfig || !userId) return false;
    try {
      /* staleTime 0: the imperative gate always re-asks, like the
         hand-rolled version did; the hook query below shares the cache. */
      return await queryClient.fetchQuery({
        queryKey: queryKeys.rewardsIsAdmin(userId),
        queryFn: fetchIsRewardsAdmin,
        retry: false,
        staleTime: 0,
      });
    } catch {
      return false;
    }
  }, [queryClient, userId]);

  const adminGateQuery = useQuery({
    queryKey: queryKeys.rewardsIsAdmin(userId),
    queryFn: fetchIsRewardsAdmin,
    enabled: hasSupabaseConfig && !!userId,
    retry: false, // fail closed on the first answer; never retry a gate
  });
  const isAdmin = adminGateQuery.data ?? false;

  /* ------------------------------------------------------------ claim */

  const claimMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      ensureSupabase();
      const { data, error: rpcError } = await supabase.rpc("claim_reward", {
        p_reward_id: rewardId,
      });
      if (rpcError) throw rpcError;
      return Array.isArray(data) ? data[0] : data;
    },
    onMutate: async (rewardId: string) => {
      setClaimError(null);
      await queryClient.cancelQueries({ queryKey: mineKey });
      const previous = queryClient.getQueryData<UserReward[]>(mineKey);
      queryClient.setQueryData<UserReward[]>(mineKey, (current) =>
        (current ?? []).map((reward) =>
          reward.id === rewardId
            ? { ...reward, delivery_state: "claimed" as const, claimed_at: new Date().toISOString() }
            : reward,
        ),
      );
      return { previous };
    },
    onSuccess: (claimed, rewardId) => {
      /* Settle the optimistic timestamp with the server's own. */
      const claimedAt = (claimed as { claimed_at?: string } | null)?.claimed_at;
      if (claimedAt) {
        queryClient.setQueryData<UserReward[]>(mineKey, (current) =>
          (current ?? []).map((reward) =>
            reward.id === rewardId ? { ...reward, claimed_at: claimedAt } : reward,
          ),
        );
      }
    },
    onError: (mutationError, _rewardId, context) => {
      if (context?.previous) queryClient.setQueryData(mineKey, context.previous);
      setClaimError(messageFrom(mutationError));
    },
  });

  const claimReward = useCallback(
    async (rewardId: string) => {
      try {
        const claimed = await claimMutation.mutateAsync(rewardId);
        return claimed as { id: string; title: string; delivery_state: string; claimed_at: string };
      } catch (err) {
        throw err instanceof Error ? err : new Error(messageFrom(err));
      }
    },
    [claimMutation],
  );

  /* ------------------------------------------------------------ admin workspace */

  const workspaceQuery = useQuery({
    queryKey: queryKeys.rewardsAdminWorkspace,
    queryFn: fetchAdminWorkspace,
    enabled: false, // loaded imperatively by loadAdminWorkspace, never on mount
  });

  const loadAdminWorkspace = useCallback(async () => {
    setAdminBusy(true);
    try {
      if (!hasSupabaseConfig) {
        setAdminError(UNCONFIGURED_ADMIN);
        return;
      }
      const allowed = await checkAdmin();
      if (!allowed) {
        queryClient.setQueryData<AdminWorkspace>(queryKeys.rewardsAdminWorkspace, {
          rewards: [],
          users: [],
        });
        setAdminError(ADMIN_REQUIRED);
        return;
      }
      setAdminError(null);
      await queryClient.fetchQuery({
        queryKey: queryKeys.rewardsAdminWorkspace,
        queryFn: fetchAdminWorkspace,
        staleTime: 0,
      });
    } catch (workspaceError) {
      console.error("Could not load Rewards admin workspace:", workspaceError);
      setAdminError(messageFrom(workspaceError));
    } finally {
      setAdminBusy(false);
    }
  }, [checkAdmin, queryClient]);

  const adminRewards = workspaceQuery.data?.rewards ?? [];
  const adminUsers = workspaceQuery.data?.users ?? [];
  const adminLoading = adminBusy || workspaceQuery.isFetching;

  /* ------------------------------------------------------------ admin mutations
     Plain throwing wrappers, as before: the admin page reloads the
     workspace itself after each one (its loadAdminWorkspace call is
     the invalidation). */

  const createDraft = useCallback(async (draft: RewardDraftInput) => {
    ensureSupabase();
    const { data, error: rpcError } = await supabase.rpc("admin_create_reward", {
      p_title: draft.title,
      p_description: draft.description,
      p_image_url: draft.imageUrl || null,
      p_reward_type: draft.rewardType,
      p_value_details: draft.valueDetails || null,
      p_admin_message: draft.adminMessage || null,
      p_publish_at: toTimestamp(draft.publishAt),
      p_expires_at: toTimestamp(draft.expiresAt),
    });
    if (rpcError) throw rpcError;
    return typeof data === "string" ? data : String(data);
  }, []);

  const updateDraft = useCallback(async (rewardId: string, draft: RewardDraftInput) => {
    ensureSupabase();
    const { error: rpcError } = await supabase.rpc("admin_update_reward", {
      p_reward_id: rewardId,
      p_title: draft.title,
      p_description: draft.description,
      p_image_url: draft.imageUrl || null,
      p_reward_type: draft.rewardType,
      p_value_details: draft.valueDetails || null,
      p_admin_message: draft.adminMessage || null,
      p_publish_at: toTimestamp(draft.publishAt),
      p_expires_at: toTimestamp(draft.expiresAt),
    });
    if (rpcError) throw rpcError;
  }, []);

  const publishReward = useCallback(
    async (rewardId: string, recipientIds: string[], publishAt: string, expiresAt: string) => {
      ensureSupabase();
      const { error: rpcError } = await supabase.rpc("admin_publish_reward", {
        p_reward_id: rewardId,
        p_user_ids: recipientIds,
        p_publish_at: toTimestamp(publishAt) ?? new Date().toISOString(),
        p_expires_at: toTimestamp(expiresAt),
      });
      if (rpcError) throw rpcError;
    },
    [],
  );

  const revokeReward = useCallback(async (rewardId: string) => {
    ensureSupabase();
    const { error: rpcError } = await supabase.rpc("admin_revoke_reward", {
      p_reward_id: rewardId,
    });
    if (rpcError) throw rpcError;
  }, []);

  const setDeliveryState = useCallback(
    async (
      rewardId: string,
      recipientId: string,
      state: Extract<RewardStatus, "published" | "claimed" | "expired" | "revoked">,
    ) => {
      ensureSupabase();
      const { error: rpcError } = await supabase.rpc("admin_set_reward_delivery_state", {
        p_reward_id: rewardId,
        p_user_id: recipientId,
        p_state: state,
      });
      if (rpcError) throw rpcError;
    },
    [],
  );

  return {
    rewards,
    loading,
    error,
    userId,
    isAdmin,
    checkAdmin,
    reload,
    claimReward,
    adminLoading,
    adminError,
    adminRewards,
    adminUsers,
    loadAdminWorkspace,
    createDraft,
    updateDraft,
    publishReward,
    revokeReward,
    setDeliveryState,
  };
}
