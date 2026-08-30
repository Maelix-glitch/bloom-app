/**
 * TodayStrip — the day in one line.
 *
 * A ring for how many of the six targets are met, then the four figures that
 * say whether the record is being kept: day streak, days logged, longest run
 * and average sleep. Numbers count up the first time they come into view.
 */

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { CountUp } from "@/components/ci/motion";
import { Card } from "@/components/ci/primitives";
import {
  TRACKERS,
  trackerDef,
  type Goals,
  type TrackerAnalysis,
} from "@/lib/trackers/core";

function CompletionRing({ share, met, total }: { share: number; met: number; total: number }) {
  const size = 132;
  const c = size / 2;
  const r = 54;
  const circ = Math.round(2 * Math.PI * r * 100) / 100;
  const offset = Math.round(circ * (1 - share) * 100) / 100;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${met} of ${total} targets met today`}>
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="color-mix(in oklab, var(--ci-text) 12%, transparent)"
          strokeWidth={10}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--ci-follicular)"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${c} ${c})`}
        />
        <text
          x={c}
          y={c - 2}
          textAnchor="middle"
          fontSize={30}
          fontFamily="var(--ci-font-display)"
          fill="var(--ci-text)"
        >
          {met}
        </text>
        <text
          x={c}
          y={c + 16}
          textAnchor="middle"
          fontSize={10}
          letterSpacing={1.4}
          fontFamily="var(--ci-font-mono)"
          fill="var(--ci-text)"
          opacity={0.6}
        >
          {`OF ${total}`}
        </text>
      </svg>
    </div>
  );
}

export function TodayStrip({
  analysis,
  goals,
  onGoalChange,
  onResetGoals,
}: {
  analysis: TrackerAnalysis;
  goals: Goals;
  onGoalChange?: ((key: keyof Goals, value: number) => void) | undefined;
  onResetGoals?: (() => void) | undefined;
}) {
  const [openGoals, setOpenGoals] = useState(false);
  const sleep = analysis.trackers.sleep;

  return (
    <Card className="ci-card--pad">
      <div className="flex flex-wrap items-center gap-6">
        <CompletionRing
          share={analysis.completion}
          met={analysis.goalsMetToday}
          total={TRACKERS.length}
        />

        <div className="min-w-[220px] flex-1">
          <p className="ci-eyebrow">Today</p>
          <p className="ci-display mt-1 text-[20px] leading-tight sm:text-[24px]">
            {analysis.goalsMetToday === TRACKERS.length
              ? "All six targets, met."
              : analysis.goalsMetToday === 0
                ? "Nothing logged today yet."
                : `${analysis.goalsMetToday} of ${TRACKERS.length} targets met.`}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">
            Targets are yours to set — they aren't recommendations, and missing one is not a
            failure. They're only there to give the rings something to fill towards.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-x-6 gap-y-4 sm:w-auto sm:grid-cols-4 lg:w-full lg:grid-cols-4">
          <div>
            <p className="ci-eyebrow">Day streak</p>
            <p className="ci-num mt-1 text-[22px] leading-none">
              <CountUp value={analysis.streak} />
            </p>
            <p className="mt-1 text-[11px] ci-muted">days in a row</p>
          </div>
          <div>
            <p className="ci-eyebrow">Logged</p>
            <p className="ci-num mt-1 text-[22px] leading-none">
              <CountUp value={analysis.daysLogged} />
            </p>
            <p className="mt-1 text-[11px] ci-muted">days in the record</p>
          </div>
          <div>
            <p className="ci-eyebrow">Best run</p>
            <p className="ci-num mt-1 text-[22px] leading-none">
              <CountUp value={analysis.bestStreak} />
            </p>
            <p className="mt-1 text-[11px] ci-muted">longest, whenever it was</p>
          </div>
          <div>
            <p className="ci-eyebrow">Sleep avg</p>
            <p className="ci-num mt-1 text-[22px] leading-none">
              {sleep.avg7 === null ? (
                "—"
              ) : (
                <CountUp value={Math.round((sleep.avg7 / 60) * 10) / 10} decimals={1} />
              )}
              <span className="ml-1 text-[12px] ci-muted">h</span>
            </p>
            <p className="mt-1 text-[11px] ci-muted">last seven nights</p>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t pt-4 ci-hair">
        <button
          type="button"
          className="ci-eyebrow flex items-center gap-2"
          aria-expanded={openGoals}
          onClick={() => setOpenGoals((v) => !v)}
        >
          <SlidersHorizontal size={12} aria-hidden />
          Targets
          <span className="ci-muted">{openGoals ? "hide" : "edit"}</span>
        </button>

        {openGoals ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TRACKERS.map((def) => {
              const goal = goals[def.goalKey];
              return (
                <label key={def.id} className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] ci-soft">{def.name}</span>
                  <span className="flex items-center gap-2">
                    <input
                      className="tk-goal-input"
                      type="number"
                      min={1}
                      max={def.kind === "rating" ? 5 : 20000}
                      step={def.kind === "rating" ? 1 : def.kind === "volume" ? 100 : 15}
                      value={goal}
                      disabled={!onGoalChange}
                      aria-label={`${def.name} target`}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isFinite(next) || next <= 0) return;
                        onGoalChange?.(def.goalKey, next);
                      }}
                    />
                    <span className="w-[52px] text-[11px] ci-muted">
                      {def.kind === "rating" ? "/5" : def.format(goal)}
                    </span>
                  </span>
                </label>
              );
            })}
            <div className="flex items-end">
              {onResetGoals ? (
                <button
                  type="button"
                  className="ci-btn ci-btn--ghost ci-btn--sm"
                  onClick={onResetGoals}
                >
                  Reset to defaults
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <p className="mt-3 text-[11px] leading-relaxed ci-muted">
          {TRACKERS.map((def) => `${def.name} ${def.format(goals[def.goalKey])}`).join(" · ")}
          {trackerDef("screen").direction === "less" ? " — screen is a ceiling, not a target." : ""}
        </p>
      </div>
    </Card>
  );
}

export default TodayStrip;
