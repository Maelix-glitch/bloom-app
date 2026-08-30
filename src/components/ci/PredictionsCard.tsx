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
  const { nextStart, daysUntilNext } = analysis;
  const countdown = describeCountdown(daysUntilNext);
  const late = daysUntilNext !== null && daysUntilNext < 0;

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
          label="Next period"
          value={nextStart ? formatDate(nextStart) : "—"}
          sub={
            <span className={late ? "text-[var(--ci-ovulation)]" : undefined}>
              {nextStart ? countdown : "log a period to start predicting"}
              {analysis.isGeneric ? " · generic estimate" : ""}
            </span>
          }
        />

        <Stat
          label={late ? "Days late" : "Days until"}
          value={
            <span className={late ? "text-[var(--ci-ovulation)]" : undefined}>
              {daysUntilNext === null ? "—" : Math.abs(daysUntilNext)}
            </span>
          }
          unit={daysUntilNext === null ? undefined : plural(Math.abs(daysUntilNext), "day", "days")}
          sub={late ? "later than predicted — see insights" : "until the predicted start"}
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
          sub={analysis.phase ? `${analysis.phaseLabel} — estimated` : "nothing logged yet"}
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
