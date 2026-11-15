/**
 * Nutrition — the Overview synthesis input (W4-3 N5, design §4.6).
 *
 * A pure reader that turns the food log + the day's targets into the
 * one shape the Overview synthesis will speak from: today's totals
 * against target when both stand, totals alone when the targets
 * engine refuses (safety or an incomplete profile — totals are shown
 * as totals, never dressed up as a deficit), and null when nothing
 * was logged today — absence is an answer, not a zero.
 *
 * Provenance survives the shape: `includesEstimates` says whether any
 * of today's entries is a Coach photo estimate, so any surface that
 * prints these totals can say the numbers include estimates. The
 * 7-day logging pattern rides along as a plain count of logged days —
 * the raw material for §4.6's quiet-log discipline, computed here so
 * the synthesis never re-derives it.
 *
 * This module is the input only. The Overview feed that speaks it is
 * its own later slice (§4.6); `OverviewInput.nutrition` carries the
 * field so that slice needs no signature change.
 */

import { shiftDay } from "@/lib/localDay";
import { isEstimateProvenance } from "./labels";
import { dayLogOf } from "./math";
import { readFoodLog } from "./store";
import {
  compareTotalsToTargets,
  type NutritionTargets,
  type TotalsComparison,
} from "./targets";
import type { LogEntry, Nutrients } from "./types";

interface OverviewNutritionBase {
  /** The local day this summary describes. */
  day: string;
  /** Today's totals, summed from the day's stored entry nutrients. */
  totals: Nutrients;
  entryCount: number;
  /** True when any of today's entries is a Coach photo estimate —
   *  the totals include estimated numbers, and a surface printing
   *  them must say so. */
  includesEstimates: boolean;
  /** Distinct days carrying at least one entry in the last 7 days,
   *  today included. */
  daysLoggedLast7: number;
}

export type OverviewNutrition =
  | (OverviewNutritionBase & {
      kind: "vs-target";
      targets: NutritionTargets;
      comparison: TotalsComparison;
    })
  | (OverviewNutritionBase & {
      kind: "entries-only";
      targets: null;
    });

/**
 * Today's nutrition summary for the Overview synthesis, or null when
 * nothing was logged today. Targets are re-validated through the
 * comparison itself: a malformed targets object degrades the shape
 * to entries-only, exactly like an engine refusal.
 */
export function overviewNutritionFor(input: {
  entries: readonly LogEntry[];
  today: string;
  targets: NutritionTargets | null;
}): OverviewNutrition | null {
  const dayLog = dayLogOf(input.entries, input.today);
  if (dayLog.entries.length === 0) return null;

  const windowStart = shiftDay(input.today, -6);
  const loggedDays = new Set(
    input.entries
      .filter((e) => e.day >= windowStart && e.day <= input.today)
      .map((e) => e.day),
  );
  const base: OverviewNutritionBase = {
    day: input.today,
    totals: dayLog.totals,
    entryCount: dayLog.entries.length,
    includesEstimates: dayLog.entries.some((e) => isEstimateProvenance(e.provenance)),
    daysLoggedLast7: loggedDays.size,
  };

  const comparison = input.targets
    ? compareTotalsToTargets(dayLog.totals, input.targets)
    : null;
  if (!comparison || !comparison.targets) {
    return { ...base, kind: "entries-only", targets: null };
  }
  return { ...base, kind: "vs-target", targets: comparison.targets, comparison };
}

/** The same summary read from the stored food log — the one line the
 *  Overview caller will need when the feed slice lands. */
export function readOverviewNutrition(
  today: string,
  targets: NutritionTargets | null,
): OverviewNutrition | null {
  return overviewNutritionFor({ entries: readFoodLog(), today, targets });
}
