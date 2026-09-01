/**
 * The logging modal — one category at a time.
 *
 * The dashboard cards are read-only: they show where the day stands and do
 * nothing else. Everything that writes goes through here, so the grid stays
 * quiet and a log is a deliberate act rather than a row of buttons you have to
 * walk past.
 *
 * The store is passed in rather than created here: useTrackers holds its own
 * state per instance, so a fresh one inside the modal would write to a copy
 * the dial never sees.
 */

import { useEffect, useId, useRef, useState } from "react";

import type { TrackerStore } from "@/hooks/useTrackers";
import { trackerDef, type TrackerId } from "@/lib/trackers/core";

import { applyQuickAdd } from "./shared";

/** What the header reads for each category. */
const HEADLINE: Record<TrackerId, string> = {
  sleep: "Log last night",
  water: "Log water",
  study: "Log study session",
  movement: "Log movement",
  energy: "Log energy",
  screen: "Log screen time",
};

/** The unit sitting under the number field, so nobody has to guess. */
const UNIT: Record<TrackerId, string> = {
  sleep: "minutes",
  water: "millilitres",
  study: "minutes",
  movement: "minutes",
  energy: "out of five",
  screen: "minutes",
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
  const [amount, setAmount] = useState<string>("");
  const [level, setLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const def = tracker ? trackerDef(tracker) : null;

  /* reset each time a different category opens */
  useEffect(() => {
    setAmount("");
    setError(null);
    if (tracker === "energy") {
      const today = store.days.find((d) => d.date === store.today);
      setLevel(today?.energy ?? null);
    } else {
      setLevel(null);
    }
  }, [tracker, store.days, store.today]);

  /* escape closes, and focus goes to the field so typing works immediately */
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

  const isEnergy = tracker === "energy";
  const pending = isEnergy ? level : Number(amount);

  const commit = () => {
    if (pending === null || Number.isNaN(pending) || pending <= 0) {
      setError("Enter a number first.");
      return;
    }
    const message = applyQuickAdd(store, tracker, pending);
    if (message) {
      setError(message);
      return;
    }
    onSaved?.(tracker);
    onClose();
  };

  const bump = (step: number) => {
    setError(null);
    setAmount((current) => String(Math.max((Number(current) || 0) + step, 0)));
  };

  return (
    <div className="tk2-modal-root">
      <div
        className="tk2-curtain"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="tk2-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
      >
        <button type="button" className="tk2-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <p className="tk2-modal-kicker" id={titleId}>
          {HEADLINE[tracker]}
        </p>

        {isEnergy ? (
          <>
            <p className="tk2-modal-hint">Where your energy sits right now</p>
            <div className="tk2-numbers" role="group" aria-label="Energy out of five">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="tk2-number"
                  data-active={level === n ? "true" : "false"}
                  aria-pressed={level === n}
                  onClick={() => {
                    setError(null);
                    setLevel(n);
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="tk2-modal-hint">Quick taps</p>
            <div className="tk2-modal-taps">
              {def.quickAdds.map((step) => (
                <button key={step} type="button" className="tk2-modal-tap" onClick={() => bump(step)}>
                  +{step}
                </button>
              ))}
            </div>

            <label className="tk2-modal-label" htmlFor={`${titleId}-amount`}>
              or type it
            </label>
            <input
              id={`${titleId}-amount`}
              ref={inputRef}
              className="tk2-modal-input"
              type="number"
              inputMode="numeric"
              min={0}
              max={def.max}
              placeholder="0"
              value={amount}
              onChange={(event) => {
                setError(null);
                setAmount(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") commit();
              }}
            />
            <p className="tk2-modal-unit">{UNIT[tracker]}</p>
          </>
        )}

        {error ? (
          <p className="tk2-modal-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="button" className="tk2-modal-save" onClick={commit}>
          Confirm &amp; save
        </button>
      </div>
    </div>
  );
}
