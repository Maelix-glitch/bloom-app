/**
 * Engine 3 — Phase estimation.
 *
 * Calendar phases are *estimates*. Ovulation is placed where the arithmetic
 * puts it (expected length minus a 14-day luteal assumption), and the result is
 * always labelled `estimated`; nothing here claims that ovulation occurred.
 */

import { addDays, diffDays } from "./dates";
import { PLAUSIBLE_MAX } from "./baseline";
import { clamp } from "./stats";
import type { Baseline, CycleRecord, ForecastResult, PhaseResult } from "./types";
import type { PhaseKey } from "../types";

const LABEL: Record<PhaseKey, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Estimated ovulation window",
  luteal: "Luteal",
};

export function phaseEstimate(input: {
  record: CycleRecord;
  baseline: Baseline;
  forecast: ForecastResult;
}): PhaseResult {
  const { baseline, forecast, record } = input;
  const start = baseline.lastStart;

  if (!start) {
    return {
      key: null,
      label: "No cycle recorded",
      day: null,
      expectedLength: null,
      certainty: "unknown",
      window: null,
      note: "Log the first day of a period to begin — nothing is estimated until then.",
      overdueDays: 0,
    };
  }

  const day = diffDays(start, record.today) + 1;
  if (day < 1) {
    return {
      key: null,
      label: "Starts in the future",
      day: null,
      expectedLength: null,
      certainty: "unknown",
      window: null,
      note: "Your latest entry is dated after today, so there is no current day to place.",
      overdueDays: 0,
    };
  }

  const expectedLength =
    forecast.cycleLength?.point ?? (baseline.median !== null ? Math.round(baseline.median) : null);

  if (expectedLength === null) {
    return {
      key: null,
      label: "Cycle day recorded",
      /* No measured length yet, so the day is capped at the plausible
         bound the baseline itself uses: a single start logged months ago
         must not present as "day 212" of a cycle that has no length. */
      day: Math.min(day, PLAUSIBLE_MAX),
      expectedLength: null,
      certainty: "observed",
      window: null,
      note: "One start is observed, but a phase needs a cycle length. Log the next start to create one.",
      overdueDays: 0,
    };
  }

  if (day > expectedLength) {
    return {
      key: null,
      label: "Past your usual length",
      /* The day never exceeds the expected length: past it, the honest
         statement is "the last expected day, N days past", carried by
         `overdueDays` — not "day 61" of a ~28-day cycle, which reads as
         a broken counter on every surface that prints the day. */
      day: expectedLength,
      expectedLength,
      certainty: "estimated",
      window: null,
      note: `Your recent cycles ran about ${expectedLength} days. A cycle restarts when you log its first day; Bloom will not move the anchor for you.`,
      overdueDays: day - expectedLength,
    };
  }

  const menstrualDays = clamp(Math.round(baseline.bleedingMedian ?? 5), 2, 8);
  const ovulationDay = Math.max(menstrualDays + 3, expectedLength - 14);

  let key: PhaseKey;
  let fromDay: number;
  let toDay: number;
  if (day <= menstrualDays) {
    key = "menstrual";
    fromDay = 1;
    toDay = menstrualDays;
  } else if (day < ovulationDay - 1) {
    key = "follicular";
    fromDay = menstrualDays + 1;
    toDay = ovulationDay - 2;
  } else if (day <= ovulationDay + 1) {
    key = "ovulation";
    fromDay = ovulationDay - 1;
    toDay = ovulationDay + 1;
  } else {
    key = "luteal";
    fromDay = ovulationDay + 2;
    toDay = expectedLength;
  }

  const certainty: PhaseResult["certainty"] = day <= menstrualDays ? "observed" : "estimated";
  const note =
    key === "ovulation"
      ? "Placed by counting back from your expected next period. A calendar estimate is not evidence that ovulation happened."
      : key === "menstrual"
        ? "Inside the days you logged as bleeding."
        : certainty === "estimated"
          ? `Estimated from your ${expectedLength}-day expected cycle; the boundary shifts when your history does.`
          : "Observed from your recorded period.";

  return {
    key,
    label: LABEL[key],
    day,
    expectedLength,
    certainty,
    window: {
      from: addDays(start, fromDay - 1),
      to: addDays(start, toDay - 1),
    },
    note,
    overdueDays: 0,
  };
}
