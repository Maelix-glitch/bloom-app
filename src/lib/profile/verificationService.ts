/**
 * Bloom — verification facts service. The data half of the blue tick:
 * everything `lib/profile/verification.ts` needs to know that lives in
 * Supabase, read in one place so callers never speak to the tables.
 *
 * Two facts, both conservative — unknown always reads as "no":
 *
 *   · **invited** — the account email is on `app_invites`, asked through
 *     the boolean-only `is_email_invited` RPC (the list itself is never
 *     readable by clients, by design).
 *   · **hasRecord** — a row exists in `account_verifications` for the
 *     caller (RLS lets a person read exactly their own row).
 *
 * When there is no record yet but the account IS invited, this asks
 * `claim_account_verification()` to record the grant. The function is the
 * only grant path and re-checks every gate server-side (invite, confirmed
 * email, real name + @username), so asking is always safe: an ineligible
 * account simply gets no row back. That is the whole self-serve flow — no
 * admin screen, nothing a client can set or fake.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { report } from "./errors";

export interface VerificationFacts {
  invited: boolean;
  hasRecord: boolean;
}

/** What an unproven read says: not invited, no record — never a tick. */
export const UNPROVEN_FACTS: VerificationFacts = { invited: false, hasRecord: false };

type VerificationRow = { user_id: string };

/**
 * Read the signed-in person's verification facts, claiming the record
 * first when the invite gate passes and no record exists yet. Resolves
 * the person from the auth session itself, so callers need no plumbing.
 * Never throws: every failure degrades to UNPROVEN_FACTS, because a tick
 * that cannot be proven must not be shown — and a missing migration on a
 * not-yet-updated project must not break the pages that show the badge.
 */
export async function loadVerificationFacts(): Promise<VerificationFacts> {
  if (!hasSupabaseConfig) return UNPROVEN_FACTS;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user?.email) return UNPROVEN_FACTS;

    const { data: invitedData, error: inviteError } = await supabase.rpc(
      "is_email_invited",
      { p_email: user.email },
    );
    /* Only a literal true counts — null, an error, a surprise shape: no. */
    const invited = !inviteError && invitedData === true;

    const { data: row, error: rowError } = await supabase
      .from("account_verifications")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (rowError) {
      /* Table not there yet (un-migrated project) or unreadable: the
         invite fact is still honest, the record is unproven. */
      return { invited, hasRecord: false };
    }
    if (row) return { invited, hasRecord: true };
    if (!invited) return { invited, hasRecord: false };

    /* Invited, eligible-looking, no record yet: ask the grant function.
       It decides — this call can only ever record what the server-side
       gates already allow. */
    const { data: claimed, error: claimError } = await supabase.rpc(
      "claim_account_verification",
    );
    if (claimError) return { invited, hasRecord: false };
    const rows = (claimed ?? []) as VerificationRow[];
    return { invited, hasRecord: Array.isArray(rows) && rows.length > 0 };
  } catch (error) {
    report("profile:verification-facts", error);
    return UNPROVEN_FACTS;
  }
}
