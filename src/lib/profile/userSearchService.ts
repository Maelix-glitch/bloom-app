/**
 * Bloom — people search service. The data half of the Profile page's
 * magnifying glass: given a term, find other members by display name or
 * @username.
 *
 * Every fact comes from the `search_profiles` RPC (migration 20261116),
 * a security-definer function that is the only way to see another person
 * at all: `profiles` RLS is owner-only, and `account_verifications` is
 * own-row-only, so no client query could assemble these rows — and no
 * policy was widened to make one possible. The function returns public
 * fields only (id, display name, @username, avatar path, accent) plus
 * `verified` — a row exists in `account_verifications`, which is exactly
 * the blue tick's truth for someone else (see verification.ts).
 *
 * The server already excludes the caller, caps at 20 rows and lists only
 * profiles their owners made public; the filters are repeated here as
 * defence in depth, so a surprising row can never put the searcher in
 * their own results or push the list past the cap.
 *
 * Never throws: an unreadable search is an honest "couldn't search"
 * outcome for the sheet, not a crash — the same conservatism as
 * verificationService.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { normalizeAccent, type BloomAccent } from "./types";
import { report } from "./errors";

export interface UserSearchResult {
  userId: string;
  displayName: string;
  username: string | null;
  avatarPath: string | null;
  accent: BloomAccent;
  /** A record exists in `account_verifications` — the blue tick. */
  verified: boolean;
}

export type UserSearchOutcome =
  | { status: "ok"; results: UserSearchResult[] }
  | { status: "error" };

/** The row cap, mirrored from the RPC so the client never shows more. */
export const USER_SEARCH_LIMIT = 20;

/** Below this, a term is a browse, not a search — no call is made. */
export const USER_SEARCH_MIN_TERM = 2;

type SearchRow = {
  user_id?: unknown;
  display_name?: unknown;
  username?: unknown;
  avatar_path?: unknown;
  accent?: unknown;
  verified?: unknown;
};

const asText = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

/** One RPC row, normalised — a surprise shape drops the row, not the list. */
function toResult(row: SearchRow): UserSearchResult | null {
  const userId = asText(row.user_id);
  if (!userId) return null;
  return {
    userId,
    displayName: asText(row.display_name) ?? "Bloom User",
    username: asText(row.username)?.replace(/^@/, "").toLowerCase() ?? null,
    avatarPath: asText(row.avatar_path),
    accent: normalizeAccent(row.accent),
    /* Only a literal true is a tick — the same rule as every other fact
       in the verification story. */
    verified: row.verified === true,
  };
}

/**
 * Search other members by display name or @username.
 *
 * `currentUserId` is the searcher: their own row is filtered out here as
 * well as server-side. A term shorter than USER_SEARCH_MIN_TERM resolves
 * to an empty ok outcome without a call — the sheet shows its idle hint
 * for those, so this is only reachable from a race, never from the UI.
 */
export async function searchProfiles(
  term: string,
  currentUserId: string | null,
): Promise<UserSearchOutcome> {
  const cleaned = term.trim();
  if (cleaned.length < USER_SEARCH_MIN_TERM) return { status: "ok", results: [] };
  if (!hasSupabaseConfig) return { status: "error" };
  try {
    const { data, error } = await supabase.rpc("search_profiles", { p_term: cleaned });
    if (error) {
      report("profile:user-search", error);
      return { status: "error" };
    }
    const rows = Array.isArray(data) ? (data as SearchRow[]) : [];
    const results = rows
      .map(toResult)
      .filter((r): r is UserSearchResult => r !== null)
      .filter((r) => r.userId !== currentUserId)
      .slice(0, USER_SEARCH_LIMIT);
    return { status: "ok", results };
  } catch (error) {
    report("profile:user-search", error);
    return { status: "error" };
  }
}
