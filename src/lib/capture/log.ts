/**
 * Food Capture — the confirm write (SYSTEM 7).
 *
 * The one place a capture becomes a log entry, reached only from the
 * sheet's explicit confirm. It writes through the nutrition lib's
 * existing estimate-entry path — the same two calls the Coach "Log
 * this" handoff funnels into:
 *
 *   · `createEstimateEntry` builds the entry, and it is the ONLY way
 *     an estimate entry can be built: it stamps the inline snapshot
 *     {name, totals}, the `coach_estimate` provenance and the
 *     `coach_photo` source, and the amount {1 × "Photo portion"}.
 *   · `logEntry` appends it to the food log.
 *
 * What that guarantees, by construction (and pinned in log.test.ts):
 * the totals stored are the portion totals the user confirmed — the
 * analysis's own numbers when unedited — and they are NEVER converted
 * into a per-100 g profile (PR #118: inventing that basis would be
 * fabricating data). No reusable Food is created; the entry is an
 * estimate in the log, labelled one, forever.
 *
 * Why not `logCoachEstimate` (nutrition/coachLog)? That wrapper is
 * keyed to a Coach message: it deduplicates through the
 * `health.coachlog.v1` thread record so a message reads "Logged". A
 * capture has no Coach message, and writing capture ids into the
 * thread's record would corrupt what that record means. The factory
 * and the log writer it wraps are the shared path; they are reused
 * exactly.
 */

import { createEstimateEntry } from "@/lib/nutrition/entries";
import { logEntry } from "@/lib/nutrition/log";
import type { LogEntry, Meal, Nutrients } from "@/lib/nutrition/types";

/**
 * Log a confirmed capture estimate. Returns the entry written, or null
 * when the factory refused it (totals beyond the engine's entry caps)
 * — in which case nothing was written.
 */
export function logCaptureEstimate(input: {
  /** The dish name the user confirmed (the sheet's field, trimmed). */
  name: string;
  /** The portion totals the user confirmed — the analysis's totals,
   *  or the user's own edits of them, validated by the sheet through
   *  `parseEditedTotals`. Stored exactly as given. */
  totals: Nutrients;
  meal: Meal;
  day: string;
  now: string;
}): LogEntry | null {
  const entry = createEstimateEntry({
    name: input.name,
    totals: input.totals,
    meal: input.meal,
    day: input.day,
    now: input.now,
  });
  if (!entry) return null;
  logEntry(entry);
  return entry;
}
