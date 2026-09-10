/**
 * The top of the journey: who you are becoming, how far along, and the one
 * thing worth doing next.
 *
 * Order of importance on screen (and in the DOM, so screen readers agree):
 *   1. the current rank — the emblem is the centrepiece
 *   2. Bloom Points, earned for real
 *   3. how close the next rank is
 *   4. your next milestone
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

import type { GoalProgress, RankState } from "@/lib/progression/types";
import { formatPoints } from "@/lib/progression/format";
import { Emblem } from "./Emblem";

/**
 * Smoothly counts a number from its previous value to the new one. Respects
 * reduced motion by snapping, and never animates on first paint.
 */
export function useCountUp(value: number, durationMs = 1100): number {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || durationMs <= 0) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic — arrives gently, never overshoots
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs]);

  return display;
}

/** The radial progress ring around the rank emblem. */
function RankRing({ progress }: { progress: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <svg viewBox="0 0 104 104" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pg-ring-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="color-mix(in oklab, var(--gold) 70%, transparent)" />
          <stop offset="55%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="color-mix(in oklab, var(--violet) 80%, var(--gold))" />
        </linearGradient>
      </defs>
      <circle className="pg-ring-track" cx="52" cy="52" r={radius} />
      <circle
        className="pg-ring-value"
        cx="52"
        cy="52"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
      />
    </svg>
  );
}

export function JourneyHero({
  rank,
  points,
  loading,
  todayPoints,
  weekPoints,
  awardedTotal,
  earnedFromHabits,
  nextMilestone,
  onStartGoal,
}: {
  rank: RankState;
  points: number;
  loading: boolean;
  todayPoints: number;
  weekPoints: number;
  awardedTotal: number;
  earnedFromHabits: number;
  nextMilestone: GoalProgress | null;
  onStartGoal?: (goalId: string) => void;
}) {
  const shown = useCountUp(points);
  const [bumped, setBumped] = useState(false);
  const lastPoints = useRef(points);

  useEffect(() => {
    if (lastPoints.current !== points) {
      lastPoints.current = points;
      setBumped(true);
      const id = window.setTimeout(() => setBumped(false), 1500);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [points]);

  const ringProgress = rank.progress;
  const next = rank.next;

  return (
    <section className="pg-hero" aria-labelledby="pg-journey-title">
      <div className="pg-hero-copy">
        <p className="pg-eyebrow">
          <span className="pg-eyebrow-rule" aria-hidden />
          Your journey
        </p>
        <h1 id="pg-journey-title" className="pg-title pg-hero-title">
          {rank.rank.name}
        </h1>
        <p className="pg-hero-sub">
          Every small step becomes part of the bigger picture — {formatPoints(points)} Bloom Points
          earned so far.
        </p>
        <p className="pg-hero-note">
          {next && rank.remaining > 0 ? (
            <>
              {formatPoints(rank.remaining)} points to {next.name}. Nothing here expires, and a
              quiet week costs you nothing you have already earned.
            </>
          ) : (
            <>The garden keeps growing — there is always another season ahead.</>
          )}
        </p>

        <div className="pg-hero-stat-row">
          <span className="pg-hero-stat">
            <strong>{formatPoints(todayPoints)}</strong> earned today
          </span>
          <span className="pg-hero-stat">
            <strong>{formatPoints(weekPoints)}</strong> earned in the last 7 days
          </span>
          <span className="pg-hero-stat">
            <strong>{formatPoints(earnedFromHabits)}</strong> from habits ·{" "}
            <strong>{formatPoints(awardedTotal)}</strong> from milestones
          </span>
        </div>

        {next ? (
          <p className="pg-to-next">
            <Sparkles width={12} height={12} aria-hidden />
            {rank.remaining > 0
              ? `${formatPoints(rank.remaining)} points to ${next.name}`
              : `Reaching ${next.name}`}
          </p>
        ) : null}
      </div>

      <div className="pg-emblem-stage">
        <div className="pg-emblem-ring">
          <RankRing progress={ringProgress} />
          <div className="pg-emblem-core">
            <span className="pg-halo" aria-hidden />
            <span className="pg-emblem-mark" style={{ color: rank.rank.tone }}>
              <Emblem id={rank.rank.emblem} size={92} strokeWidth={1.3} />
            </span>
            <p className="pg-rank-name">{rank.rank.name}</p>
            <p className="pg-rank-meta">
              <span>Rank {rank.rank.tier}</span>
              <span aria-hidden>·</span>
              <span>{Math.round(ringProgress * 100)}%</span>
            </p>
          </div>
        </div>

        <p className="pg-rank-points-label">Bloom points</p>
        <p
          className={`pg-rank-points pg-count${bumped ? " pg-count-bump" : ""}`}
          aria-live="polite"
        >
          {loading ? "—" : formatPoints(shown)}
        </p>
        <p className="pg-rank-meta">
          {loading ? (
            <span>Loading your points…</span>
          ) : (
            <>
              <span>
                {formatPoints(rank.rank.threshold)} – {formatPoints(next.threshold)}
              </span>
              <span aria-hidden>·</span>
              <span>
                {formatPoints(rank.intoRank)} / {formatPoints(rank.span)}
              </span>
            </>
          )}
        </p>
      </div>

      {nextMilestone ? (
        <div className="pg-next" style={{ gridColumn: "1 / -1" }}>
          <div>
            <p className="pg-eyebrow">
              <span className="pg-eyebrow-rule" aria-hidden />
              Your next milestone
            </p>
            <p className="pg-next-title" style={{ marginTop: "0.5rem" }}>
              {nextMilestone.goal.title}
            </p>
            <p className="pg-next-detail">{nextMilestone.goal.detail}</p>
            <div className="pg-next-progress">
              <span>
                {nextMilestone.progress} / {nextMilestone.goal.target}
              </span>
              <span
                className="pg-rail"
                style={{ flex: "1 1 auto", maxWidth: 220 }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={nextMilestone.goal.target}
                aria-valuenow={nextMilestone.progress}
                aria-label={nextMilestone.goal.title}
              >
                <span
                  className="pg-rail-fill"
                  style={{ width: `${Math.round(nextMilestone.ratio * 100)}%` }}
                />
              </span>
              <span>{nextMilestone.remaining} to go</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.7rem" }}>
            <span className="pg-points">
              +{formatPoints(nextMilestone.goal.points)}
              <small>points</small>
            </span>
            {onStartGoal ? (
              <button
                type="button"
                className="pg-btn pg-btn-quiet"
                onClick={() => onStartGoal(nextMilestone.goal.id)}
              >
                View progress
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
