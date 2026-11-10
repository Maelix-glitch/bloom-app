/**
 * The Overview band — Today's command centre.
 *
 * Four answers, in order, all read off the record by the pure synthesis in
 * `lib/overview`: how you're doing (the headline + the state's own lines),
 * what changed (deltas against your own recent past, window labelled),
 * what matters today (one priority, with its reason), and the next
 * meaningful action (one button, paired with the priority).
 *
 * This component only presents and dispatches: every number and every
 * choice arrives already made. Its own state is just the two sheets it can
 * open — the assessment flow and the assessment summary — mirroring the
 * doors in `components/assessment/AssessmentEntry`.
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Minus, Sparkles, X } from "lucide-react";

import { BloomSheet } from "@/components/ui/bloom-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAssessment } from "@/hooks/useAssessment";
import { summaryOf } from "@/lib/assessment/summary";
import type { OverviewAction, OverviewSynthesis } from "@/lib/overview/synthesis";
import { AssessmentFlow } from "@/components/assessment/AssessmentFlow";
import { AssessmentSummaryView } from "@/components/assessment/AssessmentSummaryView";
import { cn } from "@/lib/utils";

export interface OverviewBandProps {
  overview: OverviewSynthesis;
  /** Latched readiness — while false the band holds shaped placeholders. */
  ready: boolean;
  onToggleHabit: (habitId: string) => void;
  onLogMood: () => void;
  onLogMetrics: () => void;
  onAddHabit: () => void;
}

const DELTA_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
  new: Sparkles,
} as const;

export function OverviewBand({
  overview,
  ready,
  onToggleHabit,
  onLogMood,
  onLogMetrics,
  onAddHabit,
}: OverviewBandProps) {
  const { state: assessmentState, retake } = useAssessment();
  const [flowOpen, setFlowOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const summary = summaryOf(assessmentState);

  const { state, changes, priority, action } = overview;

  const runAction = (a: OverviewAction) => {
    switch (a.kind) {
      case "habit":
        if (a.habitId) onToggleHabit(a.habitId);
        break;
      case "mood":
        onLogMood();
        break;
      case "metrics":
        onLogMetrics();
        break;
      case "add-habit":
        onAddHabit();
        break;
      case "assessment":
        if (assessmentState.status === "complete") retake();
        setFlowOpen(true);
        break;
      case "assessment-summary":
        setSummaryOpen(true);
        break;
      case "link":
        break; // rendered as a Link, never a button
    }
  };

  return (
    <section className="home-band" aria-labelledby="home-overview-title" aria-busy={!ready}>
      <div className="home-band-head px-1">
        <div>
          <p className="home-eyebrow">Overview</p>
          {ready ? (
            <h2 id="home-overview-title" className="home-band-title">
              {state.headline}
            </h2>
          ) : (
            <>
              <span id="home-overview-title" className="sr-only">
                Overview
              </span>
              <span
                className="mt-2 block h-[1.1em] w-72 max-w-[80%] animate-pulse rounded-full bg-surface-2/80 text-lg"
                aria-hidden="true"
              />
            </>
          )}
        </div>
        {ready ? (
          <p className="home-band-note hidden sm:block">{changes.windowLabel}</p>
        ) : null}
      </div>

      {ready ? (
        <>
          <div className="grid gap-5 px-1 pb-1 md:grid-cols-2">
            {/* How you're doing — the state's own lines, then the facts. */}
            <div>
              <ul className="space-y-1.5">
                {state.lines.map((line) => (
                  <li
                    key={line}
                    className="text-[13px] leading-[var(--leading-body)] text-muted-foreground"
                  >
                    {line}
                  </li>
                ))}
              </ul>
              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                {state.facts.map((fact) => (
                  <div key={fact.id}>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {fact.label}
                    </dt>
                    <dd className="mt-0.5 font-display text-lg leading-none text-foreground">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* What changed — every sentence carries its numbers and window. */}
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                What changed
              </p>
              {changes.note ? (
                <p className="mt-2 max-w-[46ch] text-[13px] leading-[var(--leading-body)] text-muted-foreground">
                  {changes.note}
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {changes.deltas.map((delta) => {
                    const Icon = DELTA_ICON[delta.direction];
                    return (
                      <li key={delta.id} className="flex items-start gap-2">
                        <Icon
                          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span className="text-[13px] leading-[var(--leading-body)] text-muted-foreground">
                          {delta.sentence}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* What matters today + the one next action. */}
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-gold/25 bg-gold/5 px-4 py-3.5">
            <div className="min-w-0 flex-1 basis-64">
              <p className="home-eyebrow">What matters today</p>
              <p className="mt-1 font-display text-lg leading-snug text-foreground">
                {priority.title}
              </p>
              <p className="mt-0.5 max-w-[58ch] text-[13px] leading-[var(--leading-body)] text-muted-foreground">
                {priority.reason}
              </p>
            </div>
            {action.kind === "link" && action.to ? (
              <Link
                to={action.to}
                className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
              >
                {action.label}
              </Link>
            ) : (
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                onClick={() => runAction(action)}
              >
                {action.label}
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-3 px-1 pb-2" aria-hidden="true">
          <span className="block h-3.5 w-full animate-pulse rounded-full bg-surface-2/70" />
          <span className="block h-3.5 w-5/6 animate-pulse rounded-full bg-surface-2/70" />
          <span className="block h-12 w-full animate-pulse rounded-xl bg-surface-2/50" />
        </div>
      )}

      <AssessmentFlow open={flowOpen} onClose={() => setFlowOpen(false)} />

      <BloomSheet
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Your assessment summary"
        size="lg"
      >
        <div className="flex max-h-[82vh] flex-col px-6 pb-6 pt-6 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
                Assessment
              </p>
              <h2 className="mt-2 font-display text-[24px] leading-tight text-foreground">
                Your summary
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setSummaryOpen(false)}
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
            {summary ? (
              <AssessmentSummaryView summary={summary} />
            ) : (
              <p className="text-[length:var(--text-support)] text-muted-foreground">
                No completed assessment yet.
              </p>
            )}
          </div>
        </div>
      </BloomSheet>
    </section>
  );
}
