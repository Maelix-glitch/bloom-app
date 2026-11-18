/**
 * Starting a checkout — the client half of the billing seam.
 *
 * Asks the billing edge function to open a provider checkout for the
 * signed-in person. The function's answers are states, not errors:
 * "payments_not_configured" is the honest pre-launch state (Bloom's
 * payment account is not connected yet) and the UI renders it as
 * such; "ready" carries the provider's hosted page URL. Nothing is
 * charged by asking, and nothing here can grant Premium — only the
 * provider's verified webhook can.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type { BillingPeriod, PlanTier } from "@/lib/billing/plans";

export type CheckoutResult =
  | { state: "ready"; shortUrl: string | null; subscriptionId: string | null }
  | { state: "payments_not_configured" }
  | { state: "provider_error" }
  | { state: "failed" };

export async function startCheckout(
  tier: Exclude<PlanTier, "free">,
  period: BillingPeriod,
): Promise<CheckoutResult> {
  if (!hasSupabaseConfig) return { state: "failed" };
  try {
    const { data, error } = await supabase.functions.invoke("billing", {
      body: { action: "create_checkout", tier, period },
    });
    if (error) return { state: "failed" };
    const d = (data ?? {}) as Record<string, unknown>;
    if (d["state"] === "payments_not_configured") return { state: "payments_not_configured" };
    if (d["state"] === "provider_error") return { state: "provider_error" };
    if (d["state"] === "ready") {
      return {
        state: "ready",
        shortUrl: typeof d["short_url"] === "string" ? d["short_url"] : null,
        subscriptionId: typeof d["subscription_id"] === "string" ? d["subscription_id"] : null,
      };
    }
    return { state: "failed" };
  } catch {
    return { state: "failed" };
  }
}
