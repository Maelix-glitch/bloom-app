/**
 * The one QueryClient, and the key registry for server state.
 *
 * Bloom is local-first: habits, mood, cycle, coach and the profile all
 * live in their own sync engines with local snapshots, and they stay
 * there — react-query is not a sync engine and pretending otherwise
 * would trade working offline semantics for a cache. What react-query
 * owns here is PURE server state: reads with no local counterpart,
 * where hand-rolling meant another copy of the same loading/error/
 * reload-after-mutation plumbing (the pattern behind the old
 * settle-gating bug class). Rewards administration was the first
 * adopter; new pure-server reads should land here too.
 *
 * Defaults, chosen for that job:
 *   · staleTime 30s — RPC snapshots (an admin workspace, a rewards
 *     list) don't change second-to-second; a 30s freshness window
 *     kills duplicate fetches when several surfaces mount at once.
 *   · retry 1 for queries — one quiet retry for a transient network
 *     blip; fail-closed surfaces (admin gates) set retry: false
 *     themselves and decide on the first answer.
 *   · NO retry for mutations — a write is never silently repeated;
 *     the caller sees the failure and decides.
 *   · refetchOnWindowFocus off — Bloom's own auth and sync events
 *     drive invalidation; a focus refetch would double-fetch against
 *     the local-first engines' refreshes.
 */

import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

/**
 * Query keys, one registry so invalidations can't drift from the
 * queries they target. Tuple shape: [domain, surface, ...identity].
 */
export const queryKeys = {
  /** A person's delivered rewards (get_my_rewards). */
  rewardsMine: (userId: string | null) => ["rewards", "mine", userId] as const,
  /** Whether a person is a rewards admin (is_rewards_admin). */
  rewardsIsAdmin: (userId: string | null) => ["rewards", "is-admin", userId] as const,
  /** The admin workspace: every reward + every recipient candidate. */
  rewardsAdminWorkspace: ["rewards", "admin-workspace"] as const,
};
