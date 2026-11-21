/**
 * TodayStoryCard — the mobile day's lead once the record has begun.
 *
 * Below the First Bloom path, the rebuilt mobile Today opens the day
 * itself with exactly two things: ONE story line and the single next
 * meaningful action. Both come from the app's existing Overview
 * intelligence (lib/overview/synthesis) — the same headline and the
 * same explainable priority the desktop page computes — so there is
 * no second brain and no second opinion: this card only gives the
 * synthesis a phone-first composition (the desktop StatTiles keep
 * their prose at lg, where this card never renders).
 *
 * While the First Bloom journey is the lead (an empty record), the
 * synthesis priority is literally "make your first log" — the
 * journey's own job — so this card waits until the record has begun
 * (recordDays > 0). From then on it leads the day, including after
 * the journey retires.
 *
 * Actions resolve through the doors the page already owns: a habit
 * tick, the mood composer, the metrics sheet, the add-habit sheet.
 * The assessment actions go to the assessment's permanent home (the
 * Profile card) — on mobile Today the assessment lives as journey
 * step (g) and there, never as a standalone prompt.
 */

import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import type { OverviewAction, OverviewSynthesis } from "@/lib/overview/synthesis";

export interface TodayStoryCardProps {
  overview: OverviewSynthesis;
  /** The page's latched settled flag. */
  ready: boolean;
  /** Resolve the synthesis action through the page's own doors. */
  onAction: (action: OverviewAction) => void;
}

export function TodayStoryCard({ overview, ready, onAction }: TodayStoryCardProps) {
  if (!ready) {
    /* Hold the panel's shape while the record settles, the page's own
       placeholder discipline — never a flash of the wrong day. */
    return (
      <section className="home-panel p-5 lg:hidden" aria-hidden="true">
        <span className="block h-24 animate-pulse rounded-[var(--radius)] bg-white/[0.04]" />
      </section>
    );
  }
  if (overview.state.recordDays === 0) return null;

  const { state, priority, action } = overview;

  return (
    <section
      className="home-panel home-rise p-5 lg:hidden"
      data-testid="today-story"
      aria-labelledby="today-story-title"
    >
      <p className="home-eyebrow">What matters now</p>
      <p className="mt-2 font-display text-[length:var(--text-lead)] italic leading-[var(--leading-snug)] text-foreground">
        {state.headline}
      </p>
      <h2 id="today-story-title" className="home-band-title mt-4">
        {priority.title}
      </h2>
      <p className="mt-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        {priority.reason}
      </p>
      <div className="mt-4">
        {action.kind === "link" && action.to ? (
          <Button type="button" size="sm" className="home-press" asChild>
            <Link to={action.to}>{action.label}</Link>
          </Button>
        ) : action.kind === "assessment" || action.kind === "assessment-summary" ? (
          <Button type="button" size="sm" className="home-press" asChild>
            <Link to="/profile" hash="pf-assessment">
              {action.label}
            </Link>
          </Button>
        ) : (
          <Button type="button" size="sm" className="home-press" onClick={() => onAction(action)}>
            {action.label}
          </Button>
        )}
      </div>
    </section>
  );
}
