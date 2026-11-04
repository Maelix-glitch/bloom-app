/**
 * Engine 5 — Variability and change detection.
 *
 * Compares the most recent cycles with the person's own earlier history. It
 * only speaks when the sample supports it, and it never labels a change as a
 * condition: the language stays observational and points to a clinician only
 * as a general option, not a diagnosis.
 */

import { longDay } from "./dates";
import { UNUSUAL_MAX, bleedingDaysFor } from "./baseline";
import { mad, median } from "./stats";
import type { Baseline, ChangeFinding, CycleRecord } from "./types";

export function detectChanges(record: CycleRecord, baseline: Baseline): ChangeFinding[] {
  const out: ChangeFinding[] = [];
  const intervals = baseline.plausible;

  if (intervals.length >= 4) {
    const recent = intervals.slice(-2);
    const earlier = intervals.slice(0, -2);
    const recentMed = median(recent);
    const earlierMed = median(earlier);
    if (recentMed !== null && earlierMed !== null) {
      const delta = recentMed - earlierMed;
      if (Math.abs(delta) >= 3) {
        out.push({
          id: "length-shift",
          kind: "length",
          headline: `Your last two cycles were ${delta > 0 ? "longer" : "shorter"} than your earlier ones`,
          detail: `Median of ${Math.round(recentMed)} days in your two most recent cycles, against ${Math.round(earlierMed)} days across the ${earlier.length} before them. One shift is common; it is worth watching rather than acting on.`,
          deltaDays: delta,
          evidence: [
            { label: "Recent median", value: `${Math.round(recentMed)} days` },
            { label: "Earlier median", value: `${Math.round(earlierMed)} days` },
            { label: "Cycles compared", value: `${intervals.length}` },
          ],
        });
      }
    }
  }

  if (intervals.length >= 5) {
    const recentMad = mad(intervals.slice(-3));
    const earlierMad = mad(intervals.slice(0, -3));
    if (recentMad !== null && earlierMad !== null && Math.abs(recentMad - earlierMad) >= 1.5) {
      const rising = recentMad > earlierMad;
      out.push({
        id: "variability-shift",
        kind: "variability",
        headline: `Your recent cycle lengths have varied ${rising ? "more" : "less"} than before`,
        detail: `Spread of about ±${recentMad.toFixed(1)} days in your last three cycles, against ±${earlierMad.toFixed(1)} in the earlier ones. Wider spread is why a forecast window widens too.`,
        deltaDays: Number((recentMad - earlierMad).toFixed(1)),
        evidence: [
          { label: "Recent spread", value: `±${recentMed(recentMad)} days` },
          { label: "Earlier spread", value: `±${recentMed(earlierMad)} days` },
          { label: "Cycles compared", value: `${intervals.length}` },
        ],
      });
    }
  }

  const bleeds = record.periods
    .map(bleedingDaysFor)
    .filter((d): d is number => d !== null && d >= 1 && d <= 15);

  if (bleeds.length >= 4) {
    const recent = median(bleeds.slice(-2));
    const earlier = median(bleeds.slice(0, -2));
    if (recent !== null && earlier !== null && Math.abs(recent - earlier) >= 2) {
      out.push({
        id: "bleeding-shift",
        kind: "bleeding",
        headline: `Your last two recorded bleeds were ${recent > earlier ? "longer" : "shorter"} than before`,
        detail: `Median of ${Math.round(recent)} days against ${Math.round(earlier)} across ${bleeds.length} periods with a recorded end. Only periods you closed with an end date are counted.`,
        deltaDays: recent - earlier,
        evidence: [
          { label: "Recent median", value: `${Math.round(recent)} days` },
          { label: "Earlier median", value: `${Math.round(earlier)} days` },
          { label: "Periods measured", value: `${bleeds.length}` },
        ],
      });
    }
  }

  const long = baseline.intervals.filter((d) => d > UNUSUAL_MAX);
  if (long.length > 0) {
    out.push({
      id: "unusual-interval",
      kind: "unusual",
      headline: "One recorded gap is longer than a typical cycle",
      detail: `Your record contains ${long.length} start-to-start ${long.length === 1 ? "gap" : "gaps"} longer than ${UNUSUAL_MAX} days (${long.join(", ")}). It stays in your history as recorded, and is left out of the typical-length statistics rather than deleted or silently averaged in. A missed log is the commonest reason.`,
      deltaDays: null,
      evidence: [
        { label: "Longest recorded", value: `${Math.max(...long)} days` },
        { label: "Kept in history", value: "yes" },
        { label: "Used for median", value: "no" },
      ],
    });
  }

  return out;
}

const recentMed = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Plain, calm sentence for a change, safe to quote out of context. */
export function changeSentence(finding: ChangeFinding): string {
  return `${finding.headline}. ${finding.detail}`;
}

/** Kept for callers that want a date-anchored reminder of the window. */
export function windowLabel(from: string, to: string): string {
  return `${longDay(from)} – ${longDay(to)}`;
}
