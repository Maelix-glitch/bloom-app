/**
 * Legacy personal rewards — the private deliveries Bloom admins publish to one
 * account (the original reward flow). They are real, already-earned items, so
 * they keep working exactly as before: the same `get_my_rewards` and
 * `claim_reward` RPCs from 20260826_reward_delivery.sql, the same fields.
 *
 * Nothing here awards points or unlocks ranks; these are deliveries, not
 * progression. They simply remain visible and claimable on the journey page.
 */

import { useCallback, useEffect, useState } from "react";

import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export interface LegacyDelivery {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  reward_type: string;
  claimed_at: string | null;
  delivery_state: "published" | "claimed";
  publish_at: string | null;
}

export interface LegacyRewardsState {
  loading: boolean;
  items: LegacyDelivery[];
  claim: (rewardId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function useLegacyRewards(): LegacyRewardsState {
  const [items, setItems] = useState<LegacyDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hasSupabaseConfig) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        setItems([]);
        return;
      }
      const { data, error } = await supabase.rpc("get_my_rewards");
      if (error) throw error;
      setItems((data ?? []) as LegacyDelivery[]);
    } catch (err) {
      // No console.error — a missing table or offline state should not show as a broken claim button.
      console.warn("Could not load legacy rewards:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await load();
      if (!alive) return;
    })();
    let sub: { data: { subscription: { unsubscribe: () => void } } } | null = null;
    try {
      sub = hasSupabaseConfig ? supabase.auth.onAuthStateChange(() => void load()) : null;
    } catch {
      sub = null;
    }
    return () => {
      alive = false;
      try {
        sub?.data.subscription.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [load]);

  const claim = useCallback(async (rewardId: string) => {
    if (!hasSupabaseConfig) return { ok: false, error: "No database connection." };
    try {
      const { error } = await supabase.rpc("claim_reward", { p_reward_id: rewardId });
      if (error) throw error;
      setItems((list) =>
        list.map((item) =>
          item.id === rewardId
            ? { ...item, delivery_state: "claimed", claimed_at: new Date().toISOString() }
            : item,
        ),
      );
      return { ok: true };
    } catch (cause) {
      // Log as warn, not error, so the console doesn't show a scary red error when
      // the reward is simply not available or the network is offline.
      console.warn("Legacy claim failed (handled):", cause);
      return { ok: false, error: "We couldn't open that right now. Nothing was changed." };
    }
  }, []);

  return { loading, items, claim };
}
