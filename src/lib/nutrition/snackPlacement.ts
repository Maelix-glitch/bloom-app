/**
 * Nutrition — the snack-placement preference (P14, M-161).
 *
 * Where the day's snack sits is the person's choice, stored as a
 * preference in the shared preferences document under its own
 * versioned key — so it syncs, exports and erases with every
 * other preference, exactly like the plan itself (see PLAN_KEY).
 * The composer reads it as a generation input (plan.ts
 * PlanGenerationInput.snackPlacement) and records it on the
 * plan's inputs snapshot, so changing it names a stored plan
 * stale ("where your snack sits") and the person's own
 * regenerate tap re-composes the day under it — no silent
 * rewrites, the house rule for everything the plan shows.
 *
 * The value is one of the composer's own placements
 * (SnackPlacement in ./plan): "widest_gap" — the widest-gap rule
 * that has placed the snack since P12 — is the default, and a
 * stored value that names neither placement reads as no
 * preference at all, never as a guess.
 */

import type { SnackPlacement } from "./plan";

export const SNACK_PLACEMENT_KEY = "health.snackPlacement.v1";

/** The placement a person who has never chosen gets: the rule
 *  the timeline has always used, bit-for-bit. */
export const DEFAULT_SNACK_PLACEMENT: SnackPlacement = "widest_gap";

/** Parse a stored preference value. Only the two placements the
 *  composer speaks are a preference; anything else is not. */
export function parseSnackPlacement(raw: unknown): SnackPlacement | null {
  return raw === "widest_gap" || raw === "morning" ? raw : null;
}
