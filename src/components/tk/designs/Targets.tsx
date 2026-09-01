/**
 * Targets and achievements.
 *
 * Targets are the six numbers every chart on the page measures against, so
 * they're editable here rather than buried in a settings screen — change one
 * and the compass, the territories and the route all redraw against it.
 *
 * Achievements are read out of the record that's already there. Nothing is
 * invented, nothing is predicted: an item is either already true of your own
 * logged days or it says how far off it is.
 */

import { useMemo } from "react";

import { TRACKERS, type TrackerAnalysis } from "@/lib/trackers/core";
import type { TrackerStore } from "@/hooks/useTrackers";

const unit = (kind: "duration" | "volume" | "rating") =>
  kind === "volume" ? "ml" : kind === "rating" ? "of 5" : "min";

const step = (kind: "duration" | "volume" | "rating") =>
  kind === "volume" ? 100 : kind === "rating" ? 1 : 15;

export function TargetSheet({ store }: { store: TrackerStore }) {
  return (
    <div className="tk2-targets">
      <ul className="tk2-targets-grid">
        {TRACKERS.map((def) => (
          <li key={def.id} data-id={def.id}>
            <label htmlFor={`target-${def.id}`}>{def.name}</label>
            <span className="tk2-target-field">
              <input
                id={`target-${def.id}`}
                type="number"
                inputMode="numeric"
                min={def.min}
                max={def.max}
                step={step(def.kind)}
                value={store.goals[def.goalKey]}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next)) return;
                  store.setGoal(def.goalKey, Math.min(def.max, Math.max(def.min, next)));
                }}
              />
              <span className="tk2-unit">{unit(def.kind)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="tk2-targets-foot">
        <button type="button" onClick={store.resetGoals}>
          Reset to defaults
        </button>
        <span>Every chart on this page measures against these.</span>
      </p>
    </div>
  );
}

export function Achievements({ analysis }: { analysis: TrackerAnalysis }) {
  const items = useMemo(() => {
    const longest = Math.max(...TRACKERS.map((t) => analysis.trackers[t.id].streak), 0);
    return [
      {
        label: "All six in one day",
        detail:
          analysis.goalsMetToday === 6
            ? "today"
            : `${analysis.goalsMetToday} of 6 today`,
        earned: analysis.goalsMetToday === 6,
      },
      {
        label: "Three days running",
        detail: longest >= 3 ? `${longest} days` : `${longest} of 3`,
        earned: longest >= 3,
      },
      {
        label: "A week on the map",
        detail:
          analysis.daysLogged >= 7 ? `${analysis.daysLogged} days` : `${analysis.daysLogged} of 7`,
        earned: analysis.daysLogged >= 7,
      },
      {
        label: "Longest run yet",
        detail: analysis.bestStreak > 0 ? `${analysis.bestStreak} days` : "—",
        earned: analysis.bestStreak >= 7,
      },
    ];
  }, [analysis]);

  const earned = items.filter((i) => i.earned).length;

  return (
    <div className="tk2-badges">
      <p className="tk2-badges-count">
        {earned} of {items.length} earned
      </p>
      <ul className="tk2-badges-grid">
        {items.map((item) => (
          <li key={item.label} data-earned={item.earned ? "true" : "false"}>
            <span className="tk2-badge-name">{item.label}</span>
            <span className="tk2-badge-detail">{item.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
