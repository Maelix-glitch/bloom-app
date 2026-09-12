/**
 * The logging modal — one number, one category.
 *
 * The dashboard is a reading surface: the dial and six cards, nothing that
 * can be typed into. Everything that writes happens here, in a panel that
 * mounts only when a card is opened and unmounts the moment it closes.
 *
 * The field takes the *total* for the category, not an increment — you type
 * 1750 for water because that's what you've drunk, not +250 on top of
 * something you have to remember.
 *
 * Sleep, study and movement let the person pick hours or minutes — typing 8
 * hours beats typing 480 minutes. The store always keeps minutes; the switch
 * only changes what the field shows and accepts.
 *
 * The store is passed in rather than created here: useTrackers holds its own
 * state per instance, so a fresh one inside the modal would write to a copy
 * the dial never sees.
 */

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

import type { TrackerStore } from "@/hooks/useTrackers";
import { trackerDef, type TrackerId } from "@/lib/trackers/core";

import {
  CURTAIN_STYLE,
  Overlay,
  PANEL_STYLE,
  SAVE_STYLE,
  readTrackerValue,
  setTrackerValue,
} from "./shared";

/** The word under the field, so nobody has to guess what the number means. */
const PROMPT: Record<TrackerId, string> = {
  sleep: "Enter total minutes slept",
  water: "Enter total millilitres",
  study: "Enter total minutes studied",
  movement: "Enter total minutes moved",
  energy: "Enter energy out of five",
  screen: "Enter total minutes on screen",
};

/** The hours wording, for the three trackers with a unit switch. */
const PROMPT_HRS: Partial<Record<TrackerId, string>> = {
  sleep: "Enter total hours slept",
  study: "Enter total hours studied",
  movement: "Enter total hours moved",
};

/** The three durations stored in minutes but typed either way. */
const UNIT_CHOICE: TrackerId[] = ["sleep", "study", "movement"];

type Unit = "min" | "hrs";

/** Sleep and study open in hours, movement in minutes — one tap flips either. */
const defaultUnit = (id: TrackerId): Unit => (id === "movement" ? "min" : "hrs");

/** 2dp arithmetic, printed without trailing zeros ("8", "1.5", never "8.00"). */
const stripNum = (v: number): string => String(Math.round(v * 100) / 100);

/**
 * The required target, said out loud at the point of logging. Inline like the
 * panel itself: the modal is portalled to <body>, outside the token scope.
 */
const TARGET_STYLE: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  textAlign: "center",
  color: "rgba(255, 255, 255, 0.55)",
};

/** The hours/minutes switch. Inline for the same portalled reason. */
const TOGGLE_STYLE: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 8,
  marginTop: 14,
};

const unitButton = (active: boolean): CSSProperties => ({
  padding: "7px 18px",
  borderRadius: 999,
  border: active ? "1px solid rgba(255, 255, 255, 0.55)" : "1px solid rgba(255, 255, 255, 0.16)",
  background: active ? "rgba(255, 255, 255, 0.12)" : "transparent",
  color: active ? "#ffffff" : "rgba(255, 255, 255, 0.55)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
});

export function TrackerModal({
  store,
  tracker,
  onClose,
  onSaved,
}: {
  store: TrackerStore;
  tracker: TrackerId | null;
  onClose: () => void;
  onSaved?: (id: TrackerId) => void;
}) {
  const [draft, setDraft] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit>("min");
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const def = tracker ? trackerDef(tracker) : null;
  const hasChoice = tracker !== null && UNIT_CHOICE.includes(tracker);
  const prompt = unit === "hrs" && tracker && PROMPT_HRS[tracker] ? PROMPT_HRS[tracker]! : tracker ? PROMPT[tracker] : "";

  /* start from what's already logged, so the field is a correction not a blank */
  useEffect(() => {
    if (!tracker) return;
    const choice = UNIT_CHOICE.includes(tracker);
    const startUnit = defaultUnit(tracker);
    setUnit(choice ? startUnit : "min");
    const current = readTrackerValue(store, tracker);
    if (current == null || current === 0) {
      setDraft("");
    } else {
      setDraft(choice && startUnit === "hrs" ? stripNum(current / 60) : String(current));
    }
    setError(null);
  }, [tracker, store.days, store.today]);

  /* escape closes, and focus lands in the field so typing works straight away */
  useEffect(() => {
    if (!tracker) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [tracker, onClose]);

  if (!tracker || !def) return null;

  /** Flipping the switch converts what's typed — nothing is ever lost. */
  const switchUnit = (next: Unit) => {
    if (next === unit) return;
    const cur = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(cur)) {
      const stored = unit === "hrs" ? cur * 60 : cur;
      setDraft(stripNum(next === "hrs" ? stored / 60 : stored));
    }
    setError(null);
    setUnit(next);
  };

  const commit = (value: string) => {
    const parsed = Number(value);
    if (value.trim() === "" || !Number.isFinite(parsed) || parsed < 0) {
      setError("Type a number first.");
      return;
    }
    const stored = hasChoice && unit === "hrs" ? Math.round(parsed * 60) : parsed;
    const message = setTrackerValue(store, tracker, stored);
    if (message) {
      setError(message);
      return;
    }
    onSaved?.(tracker);
    onClose();
  };

  return (
    <Overlay>
      <div className="tk2-curtain" style={CURTAIN_STYLE} onClick={onClose} aria-hidden />

      <div
        className="tk2-modal"
        style={{ ...PANEL_STYLE, maxWidth: 420 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button type="button" className="tk2-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <p className="tk2-modal-kicker" id={titleId}>
          Log {def.name}
        </p>
        <p style={TARGET_STYLE}>
          Target · {def.format(store.goals[def.goalKey])}
        </p>

        {hasChoice ? (
          <div style={TOGGLE_STYLE} role="group" aria-label="Hours or minutes">
            {(["hrs", "min"] as const).map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={unit === u}
                onClick={() => switchUnit(u)}
                style={unitButton(unit === u)}
              >
                {u === "hrs" ? "Hours" : "Min"}
              </button>
            ))}
          </div>
        ) : null}

        {tracker === "energy" ? (
          <div className="tk2-numbers" role="group" aria-label="Energy out of five">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="tk2-number"
                data-active={Number(draft) === n ? "true" : "false"}
                aria-pressed={Number(draft) === n}
                onClick={() => {
                  setError(null);
                  setDraft(String(n));
                }}
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}

        <input
          ref={inputRef}
          className="tk2-modal-input"
          type="number"
          inputMode={unit === "hrs" ? "decimal" : "numeric"}
          min={0}
          max={hasChoice && unit === "hrs" ? stripNum(def.max / 60) : def.max}
          step="any"
          placeholder="0"
          aria-label={prompt}
          value={draft}
          onChange={(event) => {
            setError(null);
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit(draft);
          }}
        />
        <p className="tk2-modal-unit">{prompt}</p>

        {error ? (
          <p className="tk2-modal-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="tk2-modal-save"
          style={SAVE_STYLE}
          onClick={() => commit(draft)}
        >
          Save &amp; close
        </button>
      </div>
    </Overlay>
  );
}