/**
 * PhaseCard — Today's cycle read.
 *
 * The one place a daily user meets the cycle science without opening the
 * Cycle page: which phase the record says today sits in, one hedged line
 * about what that phase tends to do (never what *you* will feel), and a
 * planning hint. Rendered only when the person tracks a cycle with real
 * entries and predictions on — otherwise the card doesn't exist, exactly
 * like every other cycle surface in Bloom.
 *
 * Every line cites its honesty: the phase label comes from the engine with
 * its confidence, and the science line admits when the phase is from the
 * general pattern rather than the person's logs.
 */

import { Droplets } from "lucide-react";
import { Link } from "@tanstack/react-router";

import type { CycleAnalysis } from "@/lib/cycle/predict";
import { describeNextPeriodShort } from "@/lib/cycle/predict";
import { pickStable } from "@/lib/voice/messages";
import { phaseScienceLine } from "@/lib/cycle/phaseScience";

/** Planning hints per phase — preference-shaped, never a rule. */
const PHASE_HINTS: Record<string, string[]> = {
  Menstrual: [
    "A softer week is a strategy, not a retreat — put the gentlest plan on the hardest days.",
    "Keep one small comfort prepped — heat pad, easy dinner — and let the plan bend around it.",
  ],
  Follicular: [
    "Energy tends to climb from here — a good stretch to point at the thing you've been postponing.",
    "If there's a habit to start, this is the window where starting is cheapest.",
  ],
  "Ovulation window": [
    "Some people feel their strongest days here — worth spending on what matters most to you.",
  ],
  Luteal: [
    "Lower the bar, not the plan — pre-period weeks reward smaller, finished things.",
    "If the afternoons dip, front-load the day; the record says this week forgives it.",
  ],
};

export function PhaseCard({ analysis, today }: { analysis: CycleAnalysis; today: string }) {
  /* The card only exists for a live, evidenced cycle — paused tracking,
     nothing logged, or an unplaced day all mean no card, like every other
     cycle surface in Bloom. */
  if (!analysis.expecting || analysis.entryCount === 0) return null;
  if (analysis.cycleDay === null || analysis.phaseLabel === "Unknown") return null;

  const science = phaseScienceLine(
    analysis.phaseLabel,
    analysis.confidence,
    `${analysis.phaseLabel}-${today}`,
  );
  const hintPool = PHASE_HINTS[analysis.phaseLabel];
  const hint = hintPool ? pickStable(hintPool, `phase-hint-${today}`) : null;
  const next = describeNextPeriodShort(analysis);

  return (
    <section className="home-panel home-phase p-5 sm:p-6" aria-labelledby="home-phase-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Your cycle</p>
          <h2 id="home-phase-title" className="mt-1 font-display text-xl leading-tight sm:text-2xl">
            Day {analysis.cycleDay}
            {analysis.phaseLabel ? (
              <span className="home-phase-sep" aria-hidden>
                {" · "}
              </span>
            ) : null}
            {analysis.phaseLabel ? (
              <em className="home-text-gradient not-italic">{analysis.phaseLabel}</em>
            ) : null}
          </h2>
        </div>
        <span
          className="mt-1 inline-flex size-9 flex-none items-center justify-center rounded-full border"
          style={{
            borderColor: "color-mix(in oklab, var(--home-cycle, var(--gold)) 32%, transparent)",
            color: "var(--home-cycle, var(--gold))",
          }}
          aria-hidden
        >
          <Droplets className="size-4" />
        </span>
      </div>

      {science ? (
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{science}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {next ? (
          <span className="home-chip text-[11px]" title="Estimated from your own record">
            {next}
          </span>
        ) : null}
        {hint ? <span className="home-chip text-[11px]">{hint}</span> : null}
        <Link to="/cycle" className="home-chip text-[11px]">
          Open Cycle
        </Link>
      </div>
    </section>
  );
}
