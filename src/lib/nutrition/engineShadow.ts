/**
 * Phase B shadow check — the app still plans with its in-browser
 * engine; this module ALSO asks the server engine to compute the
 * same day, purely so the two answers can be compared.
 *
 * The server's answer is never shown, never stored on the device and
 * never allowed to change what the person sees. The server records
 * both hashes and whether they agreed in `engine_shadow_log`; a
 * mismatch is a porting bug to hunt, not a user-facing event.
 *
 * Fire-and-forget by design: no session, no network or a missing
 * function all end here silently. Planning must never wait on, or
 * fail because of, its own shadow.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { planOutcomeHash } from "@/lib/nutrition/engineCanonical";
import type { PlanOutcome } from "@/lib/nutrition/plan";

export function shadowCheckPlan(day: string, outcome: PlanOutcome): void {
  if (!hasSupabaseConfig) return;
  void (async () => {
    try {
      const clientHash = await planOutcomeHash(outcome);
      await supabase.functions.invoke("engine", {
        body: { day, clientHash },
      });
    } catch {
      /* shadow traffic is best-effort — silence is the contract */
    }
  })();
}
