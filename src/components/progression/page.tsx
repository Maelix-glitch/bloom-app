/**
 * The Journey — Bloom's Rewards page, rebuilt as personal progression.
 *
 * Content order (also the mobile order, and the order a screen reader hears):
 *   1. Your Journey      — rank, points, closeness to the next rank
 *   2. Your next milestone
 *   3. Active goals      — today → this week → this month → milestones
 *   4. The path          — the ranks, walked
 *   5. Achievements
 *   6. Point activity    — where the points actually came from
 *   7. Milestone archive — what this journey has actually done
 *   8. Sent just to you  — the private rewards Bloom admins already published
 *
 * Nothing here is a shop. Customization lives in the Atelier, opened by ranks.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, CircleAlert, RefreshCw, Sparkles } from "lucide-react";

import { AppNav } from "@/components/home/HomeSidebar";
import { useProgression } from "@/hooks/useProgression";
import { rankFor } from "@/lib/progression/ranks";
import { formatPoints } from "@/lib/progression/format";
import { JourneyHero } from "@/components/progression/JourneyHero";
import { RankPath } from "@/components/progression/RankPath";
import { GoalsBoard } from "@/components/progression/Goals";
import { AchievementGallery } from "@/components/progression/Achievements";
import {
  PointActivity,
  MilestoneArchive,
  AtelierLinkContent,
} from "@/components/progression/History";
import { PointsFloat, RankCeremony } from "@/components/progression/RankCeremony";
import { LegacyRewards } from "@/components/progression/LegacyRewards";
import { PgReveal } from "@/components/progression/Reveal";

/**
 * The rising gold motes — embers drifting up through the page. Deterministic
 * (no Math.random at render) so SSR and the client always agree.
 */
const MOTES = Array.from({ length: 14 }, (_, i) => {
  const seed = (i * 2654435761) % 1000;
  return {
    left: `${(seed % 96) + 2}%`,
    size: 2 + (seed % 3),
    delay: `${-((seed % 260) / 10)}s`,
    duration: `${17 + (seed % 14)}s`,
    drift: `${((seed % 90) - 45) / 10}vw`,
  };
});

export function JourneyPage() {
  const progress = useProgression();
  const [ceremony, setCeremony] = useState<ReturnType<typeof rankFor> | null>(null);
  const [float, setFloat] = useState<{ points: number; label: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [focusGoalId, setFocusGoalId] = useState<string | null>(null);

  /* Transient layers clean themselves up — nothing nags. */
  useEffect(() => {
    if (!float) return;
    const id = window.setTimeout(() => setFloat(null), 2400);
    return () => window.clearTimeout(id);
  }, [float]);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), 5200);
    return () => window.clearTimeout(id);
  }, [note]);

  const claim = useCallback(
    async (goalId: string) => {
      setClaimingId(goalId);
      const result = await progress.claim(goalId);
      setClaimingId(null);
      if (result.awarded) {
        setFloat({ points: result.points, label: "Bloom Points" });
        if (result.unlocked.length > 0) {
          setNote(
            result.unlocked.length === 1
              ? `Achievement earned — ${result.unlocked[0]?.title}`
              : `${result.unlocked.length} achievements earned`,
          );
        }
        // A rank-up owns the moment: one ceremony, never two animations.
        if (result.rankUp) setCeremony(result.rankUp);
      } else {
        setNote(result.message);
      }
    },
    [progress],
  );

  const jumpToGoal = useCallback((goalId: string) => {
    setFocusGoalId(goalId);
    document.getElementById("pg-goals")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const claimable = useMemo(() => progress.goals.filter((g) => g.claimable), [progress.goals]);
  const todayCount = useMemo(
    () => progress.goals.filter((g) => g.goal.cadence === "daily" && !g.claimed).length,
    [progress.goals],
  );

  return (
    <div className="pg-page app-shell relative min-h-screen bg-background text-foreground">
      <AppNav />

      <div className="pg-sky" aria-hidden>
        <span className="pg-sky-wall" />
        <span className="pg-sky-stars" />
        <span className="pg-sky-aurora" />
        <span className="pg-sky-orb pg-sky-orb-a" />
        <span className="pg-sky-orb pg-sky-orb-b" />
        <span className="pg-sky-orb pg-sky-orb-c" />
        <span className="pg-sky-rays" />
        <span className="pg-sky-leaf" />
        <span className="pg-sky-motes">
          {MOTES.map((m, i) => (
            <i
              key={i}
              className="pg-mote"
              style={{
                left: m.left,
                width: m.size,
                height: m.size,
                animationDelay: m.delay,
                animationDuration: m.duration,
                ["--pg-mote-drift" as string]: m.drift,
              }}
            />
          ))}
        </span>
        <span className="pg-sky-vignette" />
      </div>

      <main className="pg-main">
        <JourneyHero
          rank={progress.rank}
          points={progress.points}
          loading={progress.loading}
          todayPoints={progress.todayPoints}
          weekPoints={progress.weekPoints}
          awardedTotal={progress.awardedTotal}
          earnedFromHabits={progress.earnedFromHabits}
          nextMilestone={progress.nextMilestone}
          onStartGoal={jumpToGoal}
        />

        {progress.serverUnavailable ? (
          <div className="pg-banner pg-banner-quiet" role="status">
            <CircleAlert width={13} height={13} aria-hidden />
            Your account balance couldn&rsquo;t load right now. Everything below is still here —
            from your own records.
            <button type="button" className="pg-link" onClick={() => progress.refreshPoints()}>
              <RefreshCw width={12} height={12} aria-hidden /> Try again
            </button>
          </div>
        ) : null}

        {claimable.length > 0 ? (
          <div className="pg-banner" role="status">
            <Sparkles width={13} height={13} aria-hidden />
            {claimable.length === 1
              ? "One goal is complete and waiting for its points."
              : `${claimable.length} goals are complete and waiting for their points.`}
          </div>
        ) : null}

        {/* ---------------------------------------------------- goals --------- */}
        <PgReveal>
          <section className="pg-section" id="pg-goals" aria-labelledby="pg-goals-title">
            <div className="pg-section-head">
              <div className="pg-section-head-left">
                <p className="pg-eyebrow">
                  <span className="pg-eyebrow-rule" aria-hidden />
                  Active goals
                </p>
                <h2 id="pg-goals-title" className="pg-section-title">
                  What is in reach
                </h2>
              </div>
              <p className="pg-section-aside">
                {todayCount > 0 ? `${todayCount} for today · ` : ""}
                wellness first · verified from your own records
              </p>
            </div>
            <GoalsBoard
              goals={progress.goals}
              onClaim={(id) => void claim(id)}
              busy={progress.busy}
              claimingId={claimingId}
              focusGoalId={focusGoalId}
            />
          </section>
        </PgReveal>

        {/* ----------------------------------------------------- path --------- */}
        <PgReveal>
          <section className="pg-section" aria-labelledby="pg-path-title">
            <div className="pg-section-head">
              <div className="pg-section-head-left">
                <p className="pg-eyebrow">
                  <span className="pg-eyebrow-rule" aria-hidden />
                  The path
                </p>
                <h2 id="pg-path-title" className="pg-section-title">
                  Where you are walking
                </h2>
              </div>
              <p className="pg-section-aside">
                Read from your earned points. A quiet week costs you nothing.
              </p>
            </div>
            <RankPath points={progress.points} rankTier={progress.rank.rank.tier} />
          </section>
        </PgReveal>

        {/* ----------------------------------------------- achievements ------- */}
        <PgReveal>
          <section className="pg-section" aria-labelledby="pg-ach-title">
            <div className="pg-section-head">
              <div className="pg-section-head-left">
                <p className="pg-eyebrow">
                  <span className="pg-eyebrow-rule" aria-hidden />
                  Achievements
                </p>
                <h2 id="pg-ach-title" className="pg-section-title">
                  What you have done
                </h2>
              </div>
              <p className="pg-section-aside">
                {progress.achievements.filter((a) => a.unlocked).length} of{" "}
                {progress.achievements.length} earned — each one tied to a real condition.
              </p>
            </div>
            <AchievementGallery achievements={progress.achievements} />
          </section>
        </PgReveal>

        {/* ----------------------------------------------- point activity ----- */}
        <PgReveal>
          <section className="pg-section" aria-labelledby="pg-activity-title">
            <div className="pg-section-head">
              <div className="pg-section-head-left">
                <p className="pg-eyebrow">
                  <span className="pg-eyebrow-rule" aria-hidden />
                  Point activity
                </p>
                <h2 id="pg-activity-title" className="pg-section-title">
                  How you earn
                </h2>
              </div>
              <p className="pg-section-aside">Habit ticks pay 5–500. Goals pay 100–10,000.</p>
            </div>
            {progress.error ? (
              <p className="pg-empty" style={{ marginBottom: "1rem" }}>
                {progress.error}{" "}
                <button type="button" className="pg-link" onClick={() => progress.refresh()}>
                  <RefreshCw width={12} height={12} aria-hidden /> Try again
                </button>
              </p>
            ) : null}
            <PointActivity ledger={progress.ledger} today={progress.today} />
          </section>
        </PgReveal>

        {/* -------------------------------------------- milestone archive ----- */}
        <PgReveal>
          <section className="pg-section" aria-labelledby="pg-archive-title">
            <div className="pg-section-head">
              <div className="pg-section-head-left">
                <p className="pg-eyebrow">
                  <span className="pg-eyebrow-rule" aria-hidden />
                  Your milestones
                </p>
                <h2 id="pg-archive-title" className="pg-section-title">
                  The journey so far
                </h2>
              </div>
              <p className="pg-section-aside">
                {formatPoints(progress.points)} points earned · {progress.rank.rank.name}
              </p>
            </div>
            <MilestoneArchive
              ledger={progress.ledger}
              ranks={progress.rankEvents}
              today={progress.today}
            />
          </section>
        </PgReveal>

        {/* ------------------------------------------- personal rewards ------- */}
        <PgReveal>
          <LegacyRewards />
        </PgReveal>

        <footer className="pg-footer">
          <span className="pg-flourish" aria-hidden>
            <span className="pg-flourish-line" />
            <span className="pg-flourish-gem" />
            <span className="pg-flourish-line" />
          </span>
          <p className="pg-footer-phrase">
            No final rank, no finished state. Come back when you want to.
          </p>
          <p className="pg-footer-meta">
            <Check width={11} height={11} aria-hidden />
            Points shown here are the ones you actually earned.
          </p>
        </footer>

        <div style={{ marginTop: "2rem" }}>
          <Link to="/rewards/atelier" className="pg-link">
            <AtelierLinkContent />
          </Link>
        </div>
      </main>

      {ceremony ? <RankCeremony rank={ceremony} onClose={() => setCeremony(null)} /> : null}
      {float ? <PointsFloat points={float.points} label={float.label} /> : null}
      {note ? (
        <div className="pg-toast" role="status">
          <Sparkles width={12} height={12} aria-hidden />
          {note}
        </div>
      ) : null}
    </div>
  );
}
