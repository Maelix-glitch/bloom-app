/**
 * Bloom — badge facts service. The data half of the member badges
 * (M-209): the stored facts `lib/profile/badges.ts` needs, read in one
 * place so callers never speak to the tables.
 *
 * Read-only, like the verification service beside it: the facts are
 * the caller's OWN rows — `trainer_profiles` (RLS lets a person read
 * exactly their own row, and its existence is the trainer badge) and
 * `member_badges` (own-row reads; the founder/tester grants). The
 * grant itself is service-role only and has no client path at all —
 * this service never calls an RPC.
 *
 * Each fact degrades on its own, and unknown always reads as "not
 * held": a table that cannot be read (the badges migration not
 * applied yet) is no badge of that kind, never a badge — and never
 * takes the other fact down with it.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type { BadgeFactsInput } from "./badges";
import { report } from "./errors";

export type BadgeFacts = BadgeFactsInput;

/** What an unproven read says: no trainer row, no granted badges. */
export const UNPROVEN_BADGE_FACTS: BadgeFacts = { hasTrainerRow: false, memberBadgeKinds: [] };

/**
 * Read the signed-in person's badge facts. Resolves the person from
 * the auth session itself, so callers need no plumbing. Never throws:
 * every failure degrades toward UNPROVEN_BADGE_FACTS, fact by fact,
 * because a badge that cannot be proven must not be shown — and a
 * missing migration on a not-yet-updated project must not break the
 * pages that show badges.
 */
export async function loadBadgeFacts(): Promise<BadgeFacts> {
  if (!hasSupabaseConfig) return UNPROVEN_BADGE_FACTS;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return UNPROVEN_BADGE_FACTS;

    const [trainerResult, badgesResult] = await Promise.all([
      supabase.from("trainer_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("member_badges").select("badge").eq("user_id", user.id),
    ]);

    const hasTrainerRow = !trainerResult.error && Boolean(trainerResult.data);
    const memberBadgeKinds =
      !badgesResult.error && Array.isArray(badgesResult.data)
        ? badgesResult.data
            .map((row) => (row as { badge?: unknown }).badge)
            .filter((b): b is string => typeof b === "string")
        : [];
    return { hasTrainerRow, memberBadgeKinds };
  } catch (error) {
    report("profile:badge-facts", error);
    return UNPROVEN_BADGE_FACTS;
  }
}
