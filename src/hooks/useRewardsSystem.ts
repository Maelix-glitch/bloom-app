import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

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
    return String(error.message);
  }
  return error instanceof Error ? error.message : "Something went wrong with Rewards.";
}

function toTimestamp(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function useRewardsSystem() {
  const [rewards, setRewards] = useState<UserReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminRewards, setAdminRewards] = useState<AdminReward[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  const loadUserRewards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const id = session?.user?.id ?? null;
      setUserId(id);

      if (!id) {
        setRewards([]);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("get_my_rewards");
      if (rpcError) throw rpcError;
      setRewards((data ?? []) as UserReward[]);
    } catch (loadError) {
      console.error("Could not load Rewards:", loadError);
      setRewards([]);
      setError(messageFrom(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUserRewards();

    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      void loadUserRewards();
    });

    return () => listener.data.subscription.unsubscribe();
  }, [loadUserRewards]);

  const checkAdmin = useCallback(async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc("is_rewards_admin");
      if (rpcError) throw rpcError;
      const allowed = Boolean(data);
      setIsAdmin(allowed);
      return allowed;
    } catch (adminCheckError) {
      setIsAdmin(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (userId) void checkAdmin();
    else setIsAdmin(false);
  }, [checkAdmin, userId]);

  const claimReward = useCallback(async (rewardId: string) => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("claim_reward", {
      p_reward_id: rewardId,
    });
    if (rpcError) {
      setError(messageFrom(rpcError));
      throw rpcError;
    }

    const claimed = Array.isArray(data) ? data[0] : data;
    setRewards((current) =>
      current.map((reward) =>
        reward.id === rewardId
          ? {
              ...reward,
              delivery_state: "claimed",
              claimed_at: claimed?.claimed_at ?? new Date().toISOString(),
            }
          : reward,
      ),
    );
    return claimed as { id: string; title: string; delivery_state: string; claimed_at: string };
  }, []);

  const loadAdminWorkspace = useCallback(async () => {
    setAdminLoading(true);
    setAdminError(null);

    try {
      const allowed = await checkAdmin();
      if (!allowed) {
        setAdminRewards([]);
        setAdminUsers([]);
        setAdminError("Rewards administrator access required.");
        return;
      }

      const [rewardsResult, usersResult] = await Promise.all([
        supabase.rpc("admin_list_rewards"),
        supabase.rpc("admin_list_reward_users"),
      ]);
      if (rewardsResult.error) throw rewardsResult.error;
      if (usersResult.error) throw usersResult.error;
      setAdminRewards((rewardsResult.data ?? []) as AdminReward[]);
      setAdminUsers((usersResult.data ?? []) as AdminUser[]);
    } catch (workspaceError) {
      console.error("Could not load Rewards admin workspace:", workspaceError);
      setAdminError(messageFrom(workspaceError));
    } finally {
      setAdminLoading(false);
    }
  }, [checkAdmin]);

  const createDraft = useCallback(async (draft: RewardDraftInput) => {
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
    reload: loadUserRewards,
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
