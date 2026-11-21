/**
 * Targets and achievements.
 *
 * The page SHOWS the targets (Brief v6 §5.2; M-132): a display list in
 * human units — the same readings the tiles and the record use — with
 * one "Edit targets" button for the whole section. The form itself
 * lives in a BloomSheet behind that button, unchanged in function:
 * the six numbers every chart measures against, plus the "What you
 * track" switches. Change one and the flower, the territories and the
 * route all redraw against it.
 *
 * Achievements are read out of the record that's already there. Nothing
 * is invented, nothing is predicted: an item is either already true of
 * your own logged days or it says how far off it is. Earned items show
 * the date the record proves they were earned on, derived below from
 * the same entries the analysis was built from — never a guessed date.
 * A zero state never renders a bare "0" (M-133): it says what would
 * start the count instead.
 */

import { useEffect, useMemo, useState } from "react";

import { BloomSheet } from "@/components/ui/bloom-sheet";
import { fmtCount, fmtDate, fmtDuration, fmtLitres, plural } from "@/lib/format";
import { addDays, diffDays } from "@/lib/cycle/predict";
import {
  isEmptyDay,
  TRACKERS,
  type TrackerAnalysis,
  type TrackerDef,
  type TrackerId,
} from "@/lib/trackers/core";
import type { TrackerStore } from "@/hooks/useTrackers";
import {
  IconActivity,
  IconBolt,
  IconBook,
  IconDroplet,
  IconMonitor,
  IconMoon,
  IconSliders,
} from "@/components/profile/SettingsIcons";

const unit = (kind: "duration" | "volume" | "rating") =>
  kind === "volume" ? "ml" : kind === "rating" ? "of 5" : "min";

/** A target as the page displays it — human units, one unbreakable phrase. */
function targetDisplay(def: TrackerDef, value: number): string {
  if (def.kind === "volume") return fmtLitres(value);
  if (def.kind === "rating") return `${fmtCount(value)} of 5`;
  return fmtDuration(value);
}

/** The row's glyph — the icon family's tracker set (M-210). */
const TARGET_GLYPH: Record<TrackerId, (props: { className?: string }) => React.ReactNode> = {
  sleep: IconMoon,
  water: IconDroplet,
  study: IconBook,
  movement: IconActivity,
  energy: IconBolt,
  screen: IconMonitor,
};

/**
 * The displayed reading split into figure and unit, so the figure can
 * carry the size and the unit can stay quiet (M-210). The joined text
 * is exactly targetDisplay's — "8 h", "2.2 L", "1 h 30 min", "3 of 5".
 */
function targetParts(def: TrackerDef, value: number): { figure: string; unit: string } {
  const text = targetDisplay(def, value);
  if (def.kind === "rating") return { figure: text.replace(/ of 5$/, ""), unit: "of 5" };
  const cut = text.lastIndexOf(" ");
  return cut > 0 ? { figure: text.slice(0, cut), unit: text.slice(cut + 1) } : { figure: text, unit: "" };
}

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

/** One step per − / + press, per tracker: a quarter hour for the
 *  durations, 250 ml for water, a single point for the rating. The
 *  commit that receives the stepped value is the same clamped commit
 *  the typed field uses — a press can never write what typing can't. */
const TARGET_STEP: Record<TrackerId, number> = {
  sleep: 15,
  water: 250,
  study: 15,
  movement: 5,
  energy: 1,
  screen: 15,
};

/**
 * A target's edit control (M-197): a real field — filled, bordered,
 * the unit locked beside the figure — flanked by − / + steppers.
 * Before M-197 the field was a ghost (borderless, transparent, one
 * hairline under the number), so the sheet read as the display list
 * it was supposed to edit. The plan-set row (water under a guide)
 * wears the same field with no steppers and no input: a fact, in the
 * field's shape, so the grid stays one rhythm.
 */
function TargetControl({
  def,
  value,
  auto,
  onCommit,
}: {
  def: TrackerDef;
  value: number;
  auto: boolean;
  onCommit: (value: number) => void;
}) {
  if (auto) {
    return (
      <div className="tk2-target-control tk2-target-control--auto">
        <span className="tk2-target-field">
          <span className="tk2-target-auto-value">{value}</span>
          <span className="tk2-unit">{unit(def.kind)}</span>
        </span>
      </div>
    );
  }
  const step = TARGET_STEP[def.id];
  return (
    <div className="tk2-target-control">
      <button
        type="button"
        className="tk2-target-step"
        aria-label={`Decrease ${def.name} target`}
        disabled={value <= def.min}
        onClick={() => onCommit(value - step)}
      >
        <span aria-hidden>−</span>
      </button>
      <span className="tk2-target-field">
        <TargetInput def={def} value={value} onCommit={onCommit} />
        <span className="tk2-unit">{unit(def.kind)}</span>
      </span>
      <button
        type="button"
        className="tk2-target-step"
        aria-label={`Increase ${def.name} target`}
        disabled={value >= def.max}
        onClick={() => onCommit(value + step)}
      >
        <span aria-hidden>+</span>
      </button>
    </div>
  );
}

/** The form itself — switches and fields. Rendered inside the sheet. */
export function TargetSheet({ store }: { store: TrackerStore }) {
  return (
    <div className="tk2-targets">
      <div className="tk2-active" role="group" aria-label="Which trackers you track">
        <p className="tk2-active-head">
          What you track
          <span>
            Switch off anything you don't measure — it leaves the flower, the quick log and today's
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
                  <span className="tk2-active-state">{on ? "On" : "Off"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <ul className="tk2-targets-grid">
        {TRACKERS.filter((def) => store.active.includes(def.id)).map((def) => {
          /* Water is the one target the person does not set by hand
             while a plan guide exists (Brief v7 WATER): the guide's
             figure is shown as a fact, not a field. The stored manual
             goal stays in the record and returns if the guide goes. */
          const auto = def.id === "water" && store.waterTargetMl != null;
          const value = auto ? store.waterTargetMl! : store.goals[def.goalKey];
          const Glyph = TARGET_GLYPH[def.id];
          return (
            <li key={def.id} data-id={def.id}>
              <span className="tk2-target-top">
                <span className="tk2-target-cell-glyph" aria-hidden>
                  <Glyph className="size-4" />
                </span>
                {auto ? (
                  <span className="tk2-target-label">{def.name}</span>
                ) : (
                  <label htmlFor={`target-${def.id}`}>{def.name}</label>
                )}
              </span>
              <TargetControl
                def={def}
                value={value}
                auto={auto}
                onCommit={(v) =>
                  store.setGoal(def.goalKey, Math.min(def.max, Math.max(def.min, v)))
                }
              />
              {/* The same human reading the page displays, so the sheet
                  and the section can never disagree about a target. */}
              <span className="tk2-target-human">
                {targetDisplay(def, value)}
                {auto ? " · Set by your plan" : ""}
              </span>
            </li>
          );
        })}
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

/**
 * The Targets section as the page renders it: the targets as a display
 * list, and the one edit button that opens the form in a sheet.
 */
export function TargetsPanel({ store }: { store: TrackerStore }) {
  const [open, setOpen] = useState(false);
  const shown = TRACKERS.filter((def) => store.active.includes(def.id));
  return (
    <div className="tk2-targets-wrap">
      <ul className="tk2-targets-display">
        {shown.map((def) => {
          const auto = def.id === "water" && store.waterTargetMl != null;
          const value = auto ? store.waterTargetMl! : store.goals[def.goalKey];
          const parts = targetParts(def, value);
          const Glyph = TARGET_GLYPH[def.id];
          /* Today's honest progress toward this target, from the same
             analysis the flower and tiles read — the core's own
             progress (direction-aware: under a ceiling counts too).
             Nothing logged today, no whisper: the row is typography
             alone rather than an invented bar. */
          const stat = store.analysis?.trackers[def.id];
          const progress = stat && stat.today !== null ? stat.progress : null;
          return (
            <li key={def.id} data-id={def.id}>
              <span className="tk2-target-glyph" aria-hidden>
                <Glyph className="size-5" />
              </span>
              <span className="tk2-target-main">
                <span className="tk2-target-name">{def.name}</span>
                {progress !== null ? (
                  <span
                    className="tk2-target-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                    aria-label={`${def.name}: ${Math.round(progress * 100)}% of today's target`}
                  >
                    <span
                      className="tk2-target-fill"
                      style={{ transform: `scaleX(${progress})` }}
                    />
                  </span>
                ) : null}
              </span>
              <span className="tk2-target-value">
                <span className="tk2-target-figure">{parts.figure}</span>{" "}
                <span className="tk2-target-unit">{parts.unit}</span>
                {auto ? <span className="tk2-target-auto"> from your plan</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="ci-btn tk2-targets-edit" onClick={() => setOpen(true)}>
        <IconSliders />
        Edit targets
      </button>
      <BloomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Edit targets"
        description="The numbers every chart on this page measures against."
        className="tk2-targets-sheet"
        panelClassName="tk2-targets-panel"
      >
        <div className="px-5 pb-5 pt-5">
          <TargetSheet store={store} />
        </div>
      </BloomSheet>
    </div>
  );
}

/* ------------------------- earned dates, derived ------------------------ */

/**
 * When the current longest goal streak reached three days. The streak
 * is anchored to today (or yesterday, when today hasn't qualified) —
 * the core's own anchor — so the date is the anchor minus two days,
 * provable only when the run's third day sits inside the 14-day series
 * the analysis carries. Null when the record in hand can't prove it.
 */
function streakEarnedDate(analysis: TrackerAnalysis): string | null {
  let holder: TrackerId | null = null;
  let longest = 0;
  for (const id of analysis.active) {
    const s = analysis.trackers[id].streak;
    if (s > longest) {
      longest = s;
      holder = id;
    }
  }
  if (holder === null || longest < 3) return null;
  const series = analysis.trackers[holder].series;
  let anchor = series.length - 1;
  if (series[anchor]?.met !== true) anchor -= 1;
  if (anchor < 0 || series[anchor]?.met !== true) return null;
  let run = 0;
  for (let j = anchor; j >= 0 && series[j]?.met === true; j -= 1) run += 1;
  if (run < 3) return null;
  return series[anchor - 2]?.date ?? null;
}

/** The date the record reached its seventh logged day. */
function seventhLoggedDate(analysis: TrackerAnalysis): string | null {
  const logged = analysis.entries
    .filter((d) => !isEmptyDay(d))
    .map((d) => d.date)
    .sort();
  return logged.length >= 7 ? (logged[6] ?? null) : null;
}

/**
 * When the longest any-entry run reached seven days: the first run of
 * `bestStreak` consecutive logged days, plus six. Null when no run in
 * the entries matches the analysis's best streak.
 */
function bestRunEarnedDate(analysis: TrackerAnalysis): string | null {
  if (analysis.bestStreak < 7) return null;
  const logged = analysis.entries
    .filter((d) => !isEmptyDay(d))
    .map((d) => d.date)
    .sort();
  let runStart: string | null = null;
  let prev: string | null = null;
  let run = 0;
  for (const date of logged) {
    run = prev !== null && diffDays(prev, date) === 1 ? run + 1 : 1;
    if (run === 1) runStart = date;
    if (run >= analysis.bestStreak && runStart !== null) return addDays(runStart, 6);
    prev = date;
  }
  return null;
}

/* ------------------------------ achievements ---------------------------- */

interface AchievementItem {
  label: string;
  detail: string;
  /** For a locked tile: the one line that says what unlocks it. */
  hint?: string;
  earned: boolean;
}

export function Achievements({ analysis }: { analysis: TrackerAnalysis }) {
  const items = useMemo<AchievementItem[]>(() => {
    const longest = Math.max(...analysis.active.map((id) => analysis.trackers[id].streak), 0);
    const n = analysis.goalsCounted;
    const words = ["", "one", "two", "three", "four", "five", "six"];
    const met = analysis.goalsMetToday;

    const allInOne: AchievementItem =
      met === n && n > 0
        ? {
            label: n === 6 ? "All six in one day" : `All ${words[n] ?? n} in one day`,
            detail: `Earned today · ${fmtDate(analysis.today)}`,
            earned: true,
          }
        : {
            label: n === 6 ? "All six in one day" : `All ${words[n] ?? n} in one day`,
            detail:
              met > 0 ? `${met} of ${n} today` : "Not yet — every target met on one day earns this.",
            ...(met > 0 ? { hint: "Meet every target on one day to earn this." } : {}),
            earned: false,
          };

    const streakDate = longest >= 3 ? streakEarnedDate(analysis) : null;
    const threeRunning: AchievementItem =
      longest >= 3
        ? {
            label: "Three days running",
            detail: streakDate ? `Earned ${fmtDate(streakDate)}` : plural(longest, "day"),
            earned: true,
          }
        : longest > 0
          ? {
              label: "Three days running",
              detail: `${longest} of 3`,
              hint: "Meet a target three days in a row to earn this.",
              earned: false,
            }
          : {
              label: "Three days running",
              detail: "Not yet — meet a target three days in a row to start.",
              earned: false,
            };

    const weekDate = analysis.daysLogged >= 7 ? seventhLoggedDate(analysis) : null;
    const week: AchievementItem =
      analysis.daysLogged >= 7
        ? {
            label: "A week on the map",
            detail: weekDate ? `Earned ${fmtDate(weekDate)}` : plural(analysis.daysLogged, "day"),
            earned: true,
          }
        : analysis.daysLogged > 0
          ? {
              label: "A week on the map",
              detail: `${analysis.daysLogged} of 7`,
              hint: "Log seven days in total to earn this.",
              earned: false,
            }
          : {
              label: "A week on the map",
              detail: "Not yet — log seven days in total to earn this.",
              earned: false,
            };

    const runDate = analysis.bestStreak >= 7 ? bestRunEarnedDate(analysis) : null;
    const longestRun: AchievementItem =
      analysis.bestStreak >= 7
        ? {
            label: "Longest run yet",
            detail: runDate ? `Earned ${fmtDate(runDate)}` : plural(analysis.bestStreak, "day"),
            earned: true,
          }
        : analysis.bestStreak > 0
          ? {
              label: "Longest run yet",
              detail: plural(analysis.bestStreak, "day"),
              hint: "Seven days in a row earns this.",
              earned: false,
            }
          : {
              label: "Longest run yet",
              detail: "Not yet — a run starts with one logged day.",
              earned: false,
            };

    return [allInOne, threeRunning, week, longestRun];
  }, [analysis]);

  const earned = items.filter((i) => i.earned).length;

  return (
    <div className="tk2-badges">
      <p className="tk2-badges-count">
        {earned > 0 ? `${earned} of ${items.length} earned` : "None earned yet"}
      </p>
      <ul className="tk2-badges-grid">
        {items.map((item) => (
          <li key={item.label} data-earned={item.earned ? "true" : "false"}>
            <span className="tk2-badge-name">{item.label}</span>
            <span className="tk2-badge-detail">{item.detail}</span>
            {item.hint ? <span className="tk2-badge-hint">{item.hint}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
