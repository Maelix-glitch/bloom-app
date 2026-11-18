/**
 * CycleContextCard — the Women's Health foundation surface (SYSTEM 16).
 *
 * One small card on the Cycle page's Overview tab that states today's
 * cycle context in plain words: the estimated phase and cycle day, how
 * much confidence the record itself supports (the engine's own level and
 * reason — never dressed up), the next predicted period window, and one
 * general educational note for the phase.
 *
 * Everything shown comes from `buildCycleContext` (src/lib/womens), which
 * passes the prediction module's values through verbatim. When the
 * context is unavailable — thin record, tracking paused or off — this
 * card renders nothing: the page's own start-here and paused cards
 * already explain those states, and a second "we don't know" card would
 * only repeat them.
 */

import { Card, ConfidenceBadge } from "./primitives";
import { formatDateShort } from "@/lib/cycle/predict";
import type { CyclePhaseContext } from "@/lib/womens/context";

export function CycleContextCard({ context }: { context: CyclePhaseContext }) {
  if (context.state !== "available") return null;

  const windowLine = context.nextWindow
    ? context.nextWindow.from === context.nextWindow.to
      ? `Next period estimated around ${formatDateShort(context.nextWindow.from)}`
      : `Next period estimated between ${formatDateShort(context.nextWindow.from)} and ${formatDateShort(context.nextWindow.to)}`
    : null;

  return (
    <Card data-testid="cycle-context-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ci-eyebrow">Cycle context</p>
          <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
            {context.phaseLabel} · day {context.cycleDay} of your cycle
          </h2>
        </div>
        <ConfidenceBadge level={context.confidence} reason={context.confidenceReason} />
      </div>

      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed ci-soft">
        {context.confidenceReason}
      </p>

      {windowLine ? (
        <p className="mt-2 text-[13px] leading-relaxed">
          {windowLine}
          {context.nextSummary && !context.nextSummary.startsWith("Next period") ? (
            <span className="ci-muted"> · {context.nextSummary}</span>
          ) : null}
        </p>
      ) : null}

      <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed ci-soft">{context.note}</p>

      <p className="mt-3 text-[11.5px] leading-relaxed ci-muted">
        {context.basis} Estimates from your own logged cycle — general information, not medical
        advice.
      </p>
    </Card>
  );
}
