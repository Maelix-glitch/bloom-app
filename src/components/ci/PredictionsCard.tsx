/**
 * PredictionsCard — next period, ovulation, fertile window, average length
 * and a confidence badge. It never shows a date without showing how much
 * that date can be trusted.
 */

import { Card, ConfidenceBadge, SectionHead, Stat } from "./primitives";
import {
  describeCountdown,
  formatDate,
  formatDateShort,
  type CycleAnalysis,
} from "@/lib/cycle/predict";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function PredictionsCard({
  analysis,
  compact = false,
}: {
  analysis: CycleAnalysis;
  compact?: boolean;
}) {
  const { nextStart, daysUntilNext, nextWindow } = analysis;
  const countdown = describeCountdown(daysUntilNext);
  /* A start dated after today (import, wrong clock): nothing about "now"
     follows from it — say so instead of printing "day 0 · menstrual". */
  const upcoming = analysis.upcomingStart;
  /* "Late" is the engine's call, not a raw sign flip: never against the
     population fallback, and only past a wider margin while the estimate is
     rough. Before that, a passed date is just "around now". */
  const late = analysis.isLate;
  const pastEstimate = !late && daysUntilNext !== null && daysUntilNext < 0;
  /* A single date only when the record can vouch for one; otherwise the
     honest answer is a window. */
  const showWindow = nextWindow !== null && analysis.confidence !== "high";

  return (
    <Card className={compact ? "p-4" : undefined}>
      <SectionHead
        eyebrow="Predictions"
        title="What your record points to next"
        aside={<ConfidenceBadge level={analysis.confidence} reason={analysis.confidenceReason} />}
      />

      <p className="mt-3 text-[12.5px] leading-relaxed ci-muted">{analysis.confidenceReason}</p>

      <div
        className={
          compact
            ? "mt-4 grid grid-cols-2 gap-x-4 gap-y-5"
            : "mt-5 grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        <Stat
          emphasis
          label={
            upcoming
              ? "Upcoming (dated ahead)"
              : showWindow
                ? "Next period (window)"
                : "Next period"
          }
          value={
            upcoming
              ? formatDate(upcoming)
              : !nextStart
                ? "—"
                : showWindow && nextWindow
                  ? `${formatDateShort(nextWindow.from)} – ${formatDateShort(nextWindow.to)}`
                  : formatDate(nextStart)
          }
          sub={
            <span className={late ? "text-[var(--ci-ovulation)]" : undefined}>
              {upcoming
                ? "your latest entry starts in the future — check the date"
                : !nextStart
                  ? "log a period to start predicting"
                  : analysis.confidence === "none"
                    ? `a generic ${Math.round(analysis.averageLength)}-day guide, not your pattern yet · ${countdown}`
                    : showWindow && nextWindow
                      ? `${analysis.confidence === "low" ? "a rough estimate — " : ""}most likely around ${formatDateShort(nextStart)} · ${countdown}`
                      : countdown}
            </span>
          }
          testId="cycle-next-period"
        />

        <Stat
          label={late ? "Days late" : pastEstimate ? "Past the estimate" : "Days until"}
          value={
            <span className={late ? "text-[var(--ci-ovulation)]" : undefined}>
              {daysUntilNext === null ? "—" : Math.abs(daysUntilNext)}
            </span>
          }
          unit={daysUntilNext === null ? undefined : plural(Math.abs(daysUntilNext), "day", "days")}
          sub={
            late
              ? "later than predicted — see insights"
              : pastEstimate
                ? analysis.isGeneric
                  ? "a generic guess, not your pattern — nothing is late"
                  : "within the normal range for a rough estimate"
                : "until the predicted start"
          }
        />

        <Stat
          label="Ovulation (estimate)"
          value={analysis.ovulationDate ? formatDate(analysis.ovulationDate) : "—"}
          sub="counted back 14 days from the next period"
        />

        <Stat
          label="Fertile window"
          value={
            analysis.fertileStart && analysis.fertileEnd
              ? `${formatDateShort(analysis.fertileStart)} – ${formatDateShort(analysis.fertileEnd)}`
              : "—"
          }
          sub="five days before ovulation to one day after"
        />

        <Stat
          label="Average cycle"
          value={analysis.averageLength.toFixed(1)}
          unit="days"
          sub={
            analysis.isGeneric
              ? "generic placeholder — not yours yet"
              : `from ${analysis.cycleLengths.length} logged ${plural(analysis.cycleLengths.length, "cycle", "cycles")} · ±${analysis.variability.toFixed(1)}d`
          }
        />

        <Stat
          label="Where you are"
          value={analysis.cycleDay ? `Day ${analysis.cycleDay}` : "—"}
          unit={analysis.cycleDay ? `of ~${Math.round(analysis.averageLength)}` : undefined}
          sub={
            upcoming
              ? "not placeable — the entry is dated ahead"
              : analysis.phase
                ? `${analysis.phaseLabel} — estimated`
                : "nothing logged yet"
          }
        />
      </div>

      <p className="mt-5 border-t pt-3 text-[11.5px] leading-relaxed ci-muted ci-hair">
        Ovulation is estimated by counting back from your next period, assuming a standard ~14-day
        luteal phase — the steadier half of the cycle. Real bodies vary, and this estimate is a map,
        not a measurement.
      </p>
    </Card>
  );
}
