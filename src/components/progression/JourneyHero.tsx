/**
 * The top of the journey.
 *
 * Deliberately quiet: a rank, a number, one line about what is next. Everything
 * else the old hero said — the running commentary, the three-way point
 * breakdown — now lives where it belongs (Point activity), so the first screen
 * says one thing at a time.
 *
 * Screen-reader order matches visual importance: rank → progress within the
 * rank → Bloom Points → what is next.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import type { GoalProgress, RankState } from "@/lib/progression/types";
import { formatPoints } from "@/lib/progression/format";
import { Emblem } from "./Emblem";
import { RankBanner } from "./RankBadge";

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
          <stop offset="0%" stopColor="color-mix(in oklab, var(--gold) 55%, transparent)" />
          <stop offset="55%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="color-mix(in oklab, var(--violet) 75%, var(--gold))" />
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
  nextMilestone,
  onStartGoal,
}: {
  rank: RankState;
  points: number;
  loading: boolean;
  todayPoints: number;
  weekPoints: number;
  nextMilestone: GoalProgress | null;
  /** Kept for callers that still pass the breakdown; no longer shown here. */
  awardedTotal?: number;
  earnedFromHabits?: number;
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

  const next = rank.next;
  const toNext =
    next && rank.remaining > 0
      ? `${formatPoints(rank.remaining)} points to ${next.name}`
      : "The garden keeps growing";

  return (
    <section className="pg-hero" aria-labelledby="pg-journey-title">
      {/* ornamental hairline corners — the hero reads as a struck plaque */}
      <span className="pg-hero-corner pg-hero-corner-tl" aria-hidden />
      <span className="pg-hero-corner pg-hero-corner-tr" aria-hidden />
      <span className="pg-hero-corner pg-hero-corner-bl" aria-hidden />
      <span className="pg-hero-corner pg-hero-corner-br" aria-hidden />
      <span className="pg-hero-beam" aria-hidden />

      <div className="pg-hero-copy">
        <p className="pg-eyebrow">
          <span className="pg-eyebrow-rule" aria-hidden />
          Your journey
        </p>
        <h1 id="pg-journey-title" className="pg-title pg-hero-title">
          {rank.rank.name}
        </h1>
        <p className="pg-hero-line">{toNext}</p>
        {/* Silent when there is nothing to report — no row of zeroes. */}
        {todayPoints > 0 || weekPoints > 0 ? (
          <p className="pg-hero-micro">
            {todayPoints > 0 ? (
              <span>
                <strong>+{formatPoints(todayPoints)}</strong> today
              </span>
            ) : null}
            {todayPoints > 0 && weekPoints > 0 ? <span aria-hidden>·</span> : null}
            {weekPoints > 0 ? (
              <span>
                <strong>+{formatPoints(weekPoints)}</strong> this week
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="pg-emblem-stage">
        <div className="pg-emblem-ring">
          <RankRing progress={rank.progress} />
          {/* a slow constellation of sparks orbits the emblem */}
          <span className="pg-orbit" aria-hidden>
            <i className="pg-orbit-spark" />
            <i className="pg-orbit-spark pg-orbit-spark-2" />
            <i className="pg-orbit-spark pg-orbit-spark-3" />
          </span>
          <span className="pg-orbit pg-orbit-reverse" aria-hidden>
            <i className="pg-orbit-spark pg-orbit-spark-4" />
          </span>
          <div className="pg-emblem-core">
            <span className="pg-halo" aria-hidden />
            <span className="pg-emblem-shimmer" aria-hidden />
            <span className="pg-emblem-mark" style={{ color: rank.rank.tone }}>
              <Emblem id={rank.rank.emblem} size={88} strokeWidth={1.25} />
            </span>
          </div>
        </div>

        {/* the rank's banner ribbon — the crest's nameplate, worn under the ring */}
        <div className="pg-hero-banner" aria-hidden>
          <RankBanner tone={rank.rank.tone}>{rank.rank.name}</RankBanner>
        </div>

        <p className="pg-rank-points-label">Bloom points</p>
        <p
          className={`pg-rank-points pg-count${bumped ? " pg-count-bump" : ""}`}
          aria-live="polite"
        >
          {loading ? "—" : formatPoints(shown)}
        </p>
        {loading ? <span className="sr-only">Loading your points</span> : null}
        <p className="pg-rank-meta">
          <span>Rank {rank.rank.tier}</span>
        </p>
        {/* The ring is the progress; this states it for anyone who cannot see it. */}
        <p className="sr-only">
          {rank.intoRank.toLocaleString()} of {rank.span.toLocaleString()} points through{" "}
          {rank.rank.name}
          {next && rank.remaining > 0 ? `, ${rank.remaining.toLocaleString()} to ${next.name}` : ""}
        </p>
      </div>

      {nextMilestone ? (
        <div className="pg-next">
          <div className="pg-next-main">
            <p className="pg-eyebrow">
              <span className="pg-eyebrow-rule" aria-hidden />
              Your next milestone
            </p>
            <p className="pg-next-title">{nextMilestone.goal.title}</p>
          </div>

          <div className="pg-next-meter">
            <span
              className="pg-rail"
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
            <span className="pg-next-count">
              {nextMilestone.progress}
              <span className="pg-next-count-total"> / {nextMilestone.goal.target}</span>
            </span>
          </div>

          <div className="pg-next-pay">
            <span className="pg-points">
              +{formatPoints(nextMilestone.goal.points)}
              <small>points</small>
            </span>
            {onStartGoal ? (
              <button
                type="button"
                className="pg-icon-btn"
                aria-label={`Find ${nextMilestone.goal.title} in the goals list`}
                onClick={() => onStartGoal(nextMilestone.goal.id)}
              >
                <ArrowUpRight width={14} height={14} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
