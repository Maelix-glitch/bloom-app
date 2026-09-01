/**
 * The reflect sheet — everything for today, in one pass.
 *
 * The floating action opens this rather than a single-category panel: six
 * fields, each already holding what's logged, so a day gets filled in one
 * sitting instead of six separate dialogs.
 *
 * Saving writes each field that changed and closes. Blank fields are left
 * alone rather than being zeroed — an empty box means "no change", not "none".
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { TrackerStore } from "@/hooks/useTrackers";
import { TRACKERS, type TrackerId } from "@/lib/trackers/core";

import { readTrackerValue, setTrackerValues } from "./shared";

export function ReflectSheet({
  store,
  open,
  onClose,
}: {
  store: TrackerStore;
  open: boolean;
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<Partial<Record<TrackerId, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  /* open on what today already holds */
  useEffect(() => {
    if (!open) return;
    const next: Partial<Record<TrackerId, string>> = {};
    for (const def of TRACKERS) {
      const value = readTrackerValue(store, def.id);
      next[def.id] = value === null || value === 0 ? "" : String(value);
    }
    setDrafts(next);
    setError(null);
    const id = window.setTimeout(() => firstRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
    /* the store is deliberately read once per opening, not on every keystroke */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const changed = useMemo(() => {
    if (!open) return [];
    return TRACKERS.map((def) => {
      const raw = drafts[def.id] ?? "";
      const current = readTrackerValue(store, def.id);
      if (raw.trim() === "") return null;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) return null;
      if (current !== null && Math.round(current) === Math.round(parsed)) return null;
      return { id: def.id, value: parsed };
    }).filter((entry): entry is { id: TrackerId; value: number } => entry !== null);
  }, [open, drafts, store]);

  if (!open) return null;

  const save = () => {
    /* one write, so no field can overwrite another */
    const message = setTrackerValues(store, changed);
    if (message) {
      setError(message);
      return;
    }
    onClose();
  };

  return (
    <div className="tk2-modal-root">
      <div className="tk2-curtain" onClick={onClose} aria-hidden />

      <div
        className="tk2-modal tk2-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button type="button" className="tk2-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <p className="tk2-modal-kicker" id={titleId}>
          Reflect on today
        </p>
        <p className="tk2-sheet-lede">
          Every figure is a total for today. Leave a box empty to leave it as it is.
        </p>

        <div className="tk2-sheet-grid">
          {TRACKERS.map((def, i) => (
            <label key={def.id} className="tk2-sheet-field">
              <span>{def.name}</span>
              <input
                ref={i === 0 ? firstRef : undefined}
                className="tk2-sheet-input"
                type="number"
                inputMode="numeric"
                min={0}
                max={def.max}
                placeholder="—"
                value={drafts[def.id] ?? ""}
                onChange={(event) => {
                  setError(null);
                  setDrafts((prev) => ({ ...prev, [def.id]: event.target.value }));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") save();
                }}
              />
            </label>
          ))}
        </div>

        {error ? (
          <p className="tk2-modal-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="button" className="tk2-modal-save" onClick={save}>
          Save {changed.length > 0 ? `${changed.length} change${changed.length === 1 ? "" : "s"}` : "& close"}
        </button>
      </div>
    </div>
  );
}
