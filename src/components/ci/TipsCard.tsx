/**
 * TipsCard — phase-matched wellness suggestions. General framing only:
 * never medical advice, never diagnostic language.
 */

import { Card } from "./primitives";
import { PHASE_LABEL, type CycleAnalysis } from "@/lib/cycle/predict";
import type { DayLogAnalysis } from "@/lib/cycle/dayLogs";

const PHASE_BLURB: Record<string, string> = {
  menstrual: "Bleeding days. Energy is often at its lowest here.",
  follicular: "Between the bleed and ovulation. Often the steadier, more capable stretch.",
  ovulation: "A short window around the estimated ovulation day.",
  luteal: "After ovulation, before the next period. The longer half for most people.",
  late: "Later than your predicted start. Common, and usually explainable.",
};

/**
 * Top symptom the person has actually logged in a given phase, phrased
 * against the number of days they logged there. Null below two occurrences —
 * one entry is not a pattern.
 */
function phaseSymptomNote(
  dayAnalysis: DayLogAnalysis | null | undefined,
  phase: string | null,
): string | null {
  if (!dayAnalysis || !phase) return null;
  if (phase === "late") return null;
  const key = phase as keyof DayLogAnalysis["symptomPhase"][number]["counts"];
  const row = [...dayAnalysis.symptomPhase]
    .map((r) => ({ label: r.key, count: r.counts[key] ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)[0];
  if (!row || row.count < 2) return null;
  return `In your own log, ${row.label} has come up on ${row.count} of the days you've logged in this phase.`;
}

export function TipsCard({
  analysis,
  dayAnalysis,
  compact = false,
}: {
  analysis: CycleAnalysis;
  dayAnalysis?: DayLogAnalysis | null;
  compact?: boolean;
}) {
  const phase = analysis.phase ?? "menstrual";
  const tips = analysis.tips;
  const note = phaseSymptomNote(dayAnalysis, analysis.phase);

  return (
    <Card data-phase={phase}>
      <p className="ci-eyebrow">For this phase</p>
      <h2
        className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]"
        style={{ color: "var(--phase, var(--ci-text))" }}
      >
        {PHASE_LABEL[phase]}
      </h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">{PHASE_BLURB[phase]}</p>

      {note ? (
        <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "var(--phase)" }}>
          {note}
        </p>
      ) : null}

      <div className="mt-2">
        {tips.map((tip) => (
          <div key={tip.title} className="ci-tip">
            <span className="ci-tip__mark" aria-hidden />
            <div>
              <p className="text-[13px] font-medium leading-snug">{tip.title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed ci-soft">{tip.body}</p>
            </div>
          </div>
        ))}
      </div>

      {!compact ? (
        <p className="mt-4 border-t pt-3 text-[11.5px] leading-relaxed ci-muted ci-hair">
          General wellness suggestions that tend to suit this phase — not medical advice, and not a
          diagnosis. Your own experience outranks any phase label on this page.
        </p>
      ) : null}
    </Card>
  );
}
