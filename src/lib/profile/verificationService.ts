/**
 * Bloom — verification facts service. The data half of the blue tick:
 * the one fact `lib/profile/verification.ts` needs that lives in
 * Supabase, read in one place so callers never speak to the table.
 *
 * Grant-only (owner directive, 2026-11-22): the badge is a RECORD the
 * owner grants from a trusted session — there is no client-reachable
 * grant path any more, so this service only READS: a row exists in
 * `account_verifications` for the caller (RLS lets a person read
 * exactly their own row), or it does not. The v2 self-claim ask is
 * retired along with the function it called; nothing here can create,
 * request or influence a record.
 *
 * The one fact is conservative — unknown always reads as "no": a
 * record that cannot be read is no record, never a tick.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { report } from "./errors";

export interface VerificationFacts {
  hasRecord: boolean;
}

/** What an unproven read says: no record — never a tick. */
export const UNPROVEN_FACTS: VerificationFacts = { hasRecord: false };

/**
 * Read the signed-in person's verification fact. Resolves the person
 * from the auth session itself, so callers need no plumbing. Never
 * throws: every failure degrades to UNPROVEN_FACTS, because a tick that
 * cannot be proven must not be shown — and a missing migration on a
 * not-yet-updated project must not break the pages that show the badge.
 */
export async function loadVerificationFacts(): Promise<VerificationFacts> {
  if (!hasSupabaseConfig) return UNPROVEN_FACTS;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return UNPROVEN_FACTS;

    const { data: row, error: rowError } = await supabase
      .from("account_verifications")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (rowError) {
      /* Table not there yet (un-migrated project) or unreadable: the
         record is unproven, and unproven is no tick. */
      return UNPROVEN_FACTS;
    }
    return { hasRecord: Boolean(row) };
  } catch (error) {
    report("profile:verification-facts", error);
    return UNPROVEN_FACTS;
  }
}
