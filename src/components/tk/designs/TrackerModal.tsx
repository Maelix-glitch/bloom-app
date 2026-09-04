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
 * The store is passed in rather than created here: useTrackers holds its own
 * state per instance, so a fresh one inside the modal would write to a copy
 * the dial never sees.
 */

import { useEffect, useId, useRef, useState } from "react";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const def = tracker ? trackerDef(tracker) : null;

  /* start from what's already logged, so the field is a correction not a blank */
  useEffect(() => {
    if (!tracker) return;
    const current = readTrackerValue(store, tracker);
    setDraft(current == null || current === 0 ? "" : String(current));
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

  const commit = (value: string) => {
    const parsed = Number(value);
    if (value.trim() === "" || !Number.isFinite(parsed) || parsed < 0) {
      setError("Type a number first.");
      return;
    }
    const message = setTrackerValue(store, tracker, parsed);
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
          inputMode="numeric"
          min={0}
          max={def.max}
          placeholder="0"
          aria-label={PROMPT[tracker]}
          value={draft}
          onChange={(event) => {
            setError(null);
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit(draft);
          }}
        />
        <p className="tk2-modal-unit">{PROMPT[tracker]}</p>

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
