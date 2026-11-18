/**
 * Whole-Life Insights — Today's cross-source pattern section (System 6).
 *
 * Presentation only: every headline, average and count comes from
 * `buildWholeLifeInsights` (lib/insights), computed on read from the
 * same stores the rest of Today reads — mood check-ins, the trackers,
 * habit ticks, the food log and weigh-ins. The engine's honesty rules
 * arrive with the data: a pair below its minimum sample is shown as a
 * count toward that minimum, a weak association is simply absent, and
 * the language is associative throughout.
 *
 * Readiness follows the page's own discipline: the section sits behind
 * the same latched settled gate as the Overview pieces (`ready`), so
 * interim mirror numbers never paint. The food log and weigh-ins ride
 * the prefs document the Nutrition card already reads on this page.
 */

import { useMemo } from "react";

import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useHabits } from "@/hooks/useHabits";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import { useNutrition } from "@/hooks/useNutrition";
import { useTrackers } from "@/hooks/useTrackers";
import { buildWholeLifeInsights } from "@/lib/insights/insights";

export function WholeLifeInsights({ ready }: { ready: boolean }) {
  const trackers = useTrackers();
  const habits = useHabits();
  const mood = useMoodSystem();
  const nutrition = useNutrition();
  const body = useBodyProfile();

  const result = useMemo(
    () =>
      buildWholeLifeInsights({
        today: trackers.today,
        moodEntries: mood.entries,
        trackerDays: trackers.days,
        habitLogs: habits.logs,
        foodEntries: nutrition.entries,
        weighIns: body.weighIns,
      }),
    [trackers.today, mood.entries, trackers.days, habits.logs, nutrition.entries, body.weighIns],
  );

  const hasRecord =
    result.coverage.moodDays > 0 ||
    result.coverage.sleepDays > 0 ||
    result.coverage.habitDays > 0 ||
    result.coverage.foodDays > 0 ||
    result.coverage.weighInDays > 0;

  return (
    <section
      className="home-panel home-rise p-5 sm:p-7"
      style={{ animationDelay: "190ms" }}
      aria-labelledby="home-whole-life-title"
      aria-busy={!ready}
    >
      <div>
        <p className="home-eyebrow">Whole-life insights</p>
        <h2 id="home-whole-life-title" className="home-band-title mt-1">
          Patterns across your days
        </h2>
      </div>

      {ready ? (
        result.insights.length > 0 ? (
          <>
            <ul className="mt-5 grid gap-3 lg:grid-cols-2">
              {result.insights.map((insight) => (
                <li
                  key={insight.kind}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors duration-[var(--motion-standard)] hover:border-white/[0.14] hover:bg-white/[0.04]"
                >
                  <p className="text-[length:var(--text-body)] font-medium leading-snug text-foreground">
                    {insight.headline}
                  </p>
                  <p className="mt-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
                    {insight.detail}
                  </p>
                  <p className="mt-2 text-[length:var(--text-caption)] text-muted-foreground">
                    Based on {insight.sampleDays}{" "}
                    {insight.kind === "weight-trend"
                      ? insight.sampleDays === 1
                        ? "weigh-in"
                        : "weigh-ins"
                      : insight.sampleDays === 1
                        ? "paired day"
                        : "paired days"}{" "}
                    · last {insight.windowDays} days
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4 px-1 text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
              Patterns from your own logs — what tends to go together, never what causes what.
              More appear as your record grows.
            </p>
          </>
        ) : (
          <div className="mt-4 max-w-[62ch]">
            <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
              {hasRecord
                ? "Not enough paired days yet to name a pattern honestly. A pattern needs at least 8 days where both sides were logged — here's where each one stands:"
                : "Nothing to read yet. Once your days carry a couple of signals at once — a mood check-in next to a night of sleep, a habit tick next to a mood — the patterns between them appear here."}
            </p>
            {result.pending.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {result.pending.map((p) => (
                  <li
                    key={p.kind}
                    className="flex items-baseline justify-between gap-3 text-[length:var(--text-support)] text-muted-foreground"
                  >
                    <span>{p.label}</span>
                    <span className="whitespace-nowrap tabular-nums">
                      {p.sampleDays} of {p.neededDays} paired days
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2" aria-hidden="true">
          <span className="block h-28 animate-pulse rounded-2xl bg-surface-2/50" />
          <span className="block h-28 animate-pulse rounded-2xl bg-surface-2/50" />
        </div>
      )}
    </section>
  );
}
