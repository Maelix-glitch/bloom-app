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

import { useEffect, useMemo, useState } from "react";

import { TRACKERS, type TrackerAnalysis, type TrackerId } from "@/lib/trackers/core";
import type { TrackerStore } from "@/hooks/useTrackers";

const unit = (kind: "duration" | "volume" | "rating") =>
  kind === "volume" ? "ml" : kind === "rating" ? "of 5" : "min";

const step = (kind: "duration" | "volume" | "rating") =>
  kind === "volume" ? 100 : kind === "rating" ? 1 : 15;

/**
 * A target field you can actually clear and retype. The draft lives here
 * while typing; the store only hears about it on blur/Enter (clamped), so
 * deleting the number no longer snaps it back mid-edit. Leaving it empty
 * reverts to the saved goal instead of writing zero.
 */
function TargetInput({
  def,
  value,
  onCommit,
}: {
  def: { id: TrackerId; min: number; max: number };
  value: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value]);
  return (
    <input
      id={`target-${def.id}`}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      min={def.min}
      max={def.max}
      value={draft ?? String(value)}
      onChange={(event) => {
        const next = event.target.value;
        if (/^\d*$/.test(next)) setDraft(next);
      }}
      onBlur={() => {
        if (draft === null) return;
        if (draft !== "") onCommit(Number(draft));
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
      }}
    />
  );
}

export function TargetSheet({ store }: { store: TrackerStore }) {
  return (
    <div className="tk2-targets">
      <div className="tk2-active" role="group" aria-label="Which trackers you track">
        <p className="tk2-active-head">
          What you track
          <span>
            Switch off anything you don't measure — it leaves the rings, the quick log and today's
            score. Nothing is deleted.
          </span>
        </p>
        <ul className="tk2-active-list">
          {TRACKERS.map((def) => {
            const on = store.active.includes(def.id);
            const last = on && store.active.length === 1;
            return (
              <li key={def.id} data-id={def.id}>
                <button
                  type="button"
                  className="tk2-active-toggle"
                  role="switch"
                  aria-checked={on}
                  data-on={on ? "true" : "false"}
                  disabled={last}
                  title={
                    last
                      ? "At least one tracker stays on"
                      : on
                        ? `Stop tracking ${def.name.toLowerCase()}`
                        : `Track ${def.name.toLowerCase()}`
                  }
                  onClick={() => store.toggleActive(def.id)}
                  data-testid={`tk-active-${def.id}`}
                >
                  <i aria-hidden />
                  {def.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <ul className="tk2-targets-grid">
        {TRACKERS.filter((def) => store.active.includes(def.id)).map((def) => (
          <li key={def.id} data-id={def.id}>
            <label htmlFor={`target-${def.id}`}>{def.name}</label>
            <span className="tk2-target-field">
              <TargetInput
                def={def}
                value={store.goals[def.goalKey]}
                onCommit={(v) => store.setGoal(def.goalKey, Math.min(def.max, Math.max(def.min, v)))}
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
    const longest = Math.max(...analysis.active.map((id) => analysis.trackers[id].streak), 0);
    const n = analysis.goalsCounted;
    const words = ["", "one", "two", "three", "four", "five", "six"];
    return [
      {
        label: n === 6 ? "All six in one day" : `All ${words[n] ?? n} in one day`,
        detail: analysis.goalsMetToday === n ? "today" : `${analysis.goalsMetToday} of ${n} today`,
        earned: analysis.goalsMetToday === n,
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