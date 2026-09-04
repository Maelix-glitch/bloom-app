/**
 * The reflect sheet — everything for today, in one pass.
 *
 * Premium redesign: gradient header, animated input fields, visual tracker cards,
 * instant feedback, and pro-level copy.
 *
 * States:
 *  - editing: active input form with real-time validation
 *  - loading: saving to backend, disabled inputs
 *  - success: confirmation with checkmark and metric summary
 *  - error: validation or save errors with per-field feedback
 *  - reset_confirm: destructive action confirmation
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import type { TrackerStore } from "@/hooks/useTrackers";
import { TRACKERS, trackerDef, type TrackerId } from "@/lib/trackers/core";

import {
  CURTAIN_STYLE,
  Overlay,
  PANEL_STYLE,
  SAVE_STYLE,
  readTrackerValue,
  setTrackerValues,
} from "./shared";

type ModalState = "editing" | "loading" | "success" | "error" | "reset_confirm";

const HEADER_STYLE: CSSProperties = {
  background: "linear-gradient(135deg, #FF0055 0%, #8A2BE2 100%)",
  padding: "24px 32px",
  borderRadius: "24px 24px 0 0",
  marginBottom: 24,
  marginLeft: -32,
  marginRight: -32,
  marginTop: -32,
};

const HEADER_TEXT: CSSProperties = {
  margin: 0,
  fontSize: "1.4rem",
  fontWeight: 700,
  color: "#ffffff",
  letterSpacing: "-0.02em",
};

const HEADER_SUBTITLE: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "0.9rem",
  color: "rgba(255, 255, 255, 0.85)",
  fontWeight: 400,
};

const CARD_GRID_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
  marginTop: 24,
};

const TRACKER_CARD_STYLE: CSSProperties = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(255, 255, 255, 0.03)",
  backdropFilter: "blur(12px)",
  transition: "all 0.2s ease",
};

const TRACKER_LABEL_STYLE: CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "rgba(255, 255, 255, 0.5)",
  marginBottom: 8,
  display: "block",
};

const TRACKER_INPUT_STYLE: CSSProperties = {
  width: "100%",
  padding: "12px 0",
  border: "none",
  borderBottom: "2px solid rgba(255, 255, 255, 0.2)",
  background: "transparent",
  color: "#ffffff",
  fontSize: "1.8rem",
  fontWeight: 700,
  fontFamily: "var(--ci-font-mono), ui-monospace, monospace",
  textAlign: "center",
  transition: "all 0.2s ease",
};

const ERROR_TEXT_STYLE: CSSProperties = {
  fontSize: "0.75rem",
  color: "#FF0055",
  marginTop: 6,
  fontWeight: 500,
  display: "block",
};

const SUCCESS_ICON_STYLE: CSSProperties = {
  width: 80,
  height: 80,
  margin: "0 auto 20px",
  borderRadius: "50%",
  background: "rgba(0, 230, 118, 0.15)",
  border: "2px solid #00E676",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "40px",
};

const SUCCESS_TITLE_STYLE: CSSProperties = {
  textAlign: "center",
  fontSize: "1.3rem",
  fontWeight: 700,
  color: "#ffffff",
  marginBottom: 8,
};

const SUCCESS_SUBTITLE_STYLE: CSSProperties = {
  textAlign: "center",
  fontSize: "0.9rem",
  color: "rgba(255, 255, 255, 0.7)",
  marginBottom: 24,
};

const SUMMARY_GRID_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12,
  marginBottom: 24,
};

const SUMMARY_ITEM_STYLE: CSSProperties = {
  textAlign: "center",
  padding: 12,
  borderRadius: 12,
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
};

const SUMMARY_LABEL_STYLE: CSSProperties = {
  fontSize: "0.65rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "rgba(255, 255, 255, 0.5)",
  marginBottom: 4,
};

const SUMMARY_VALUE_STYLE: CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "#ffffff",
};

const RESET_CONFIRM_ICON_STYLE: CSSProperties = {
  width: 64,
  height: 64,
  margin: "0 auto 16px",
  borderRadius: "50%",
  background: "rgba(255, 0, 85, 0.15)",
  border: "2px solid #FF0055",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
};

const RESET_TITLE_STYLE: CSSProperties = {
  textAlign: "center",
  fontSize: "1.2rem",
  fontWeight: 700,
  color: "#ffffff",
  marginBottom: 8,
};

const RESET_DESCRIPTION_STYLE: CSSProperties = {
  textAlign: "center",
  fontSize: "0.9rem",
  color: "rgba(255, 255, 255, 0.7)",
  marginBottom: 24,
};

const RESET_BUTTON_STYLE: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 12,
  padding: "12px 16px",
  borderRadius: 12,
  border: 0,
  background: "#FF0055",
  color: "#ffffff",
  fontSize: "0.85rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const CANCEL_BUTTON_STYLE: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 8,
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255, 255, 255, 0.2)",
  background: "transparent",
  color: "#ffffff",
  fontSize: "0.85rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

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
  const [fieldErrors, setFieldErrors] = useState<Record<TrackerId, string | null>>({});
  const [touched, setTouched] = useState<Set<TrackerId>>(new Set());
  const [state, setState] = useState<ModalState>("editing");
  const [successData, setSuccessData] = useState<{ id: TrackerId; value: number }[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  /* open on what today already holds */
  useEffect(() => {
    if (!open) return;
    const next: Partial<Record<TrackerId, string>> = {};
    for (const def of TRACKERS) {
      const value = readTrackerValue(store, def.id);
      next[def.id] = value === null || value === 0 ? "" : String(value);
    }
    setDrafts(next);
    setFieldErrors({});
    setTouched(new Set());
    setState("editing");
    setShowResetConfirm(false);
    const id = window.setTimeout(() => firstRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open, store]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* Real-time validation as user types */
  const validateField = (id: TrackerId, value: string): string | null => {
    if (value.trim() === "") return null; // empty is okay
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return "Must be a valid number";
    const def = trackerDef(id);
    if (parsed > def.max) return `Max is ${def.max}${def.kind === "duration" || def.kind === "volume" ? "" : ""}`;
    if (id === "energy" && parsed < 1) return "Must be between 1-5";
    return null;
  };

  const handleFieldChange = (id: TrackerId, value: string) => {
    setDrafts((prev) => ({ ...prev, [id]: value }));
    const error = validateField(id, value);
    setFieldErrors((prev) => ({ ...prev, [id]: error }));
  };

  const handleFieldBlur = (id: TrackerId) => {
    setTouched((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const changed = useMemo(() => {
    return TRACKERS.map((def) => {
      const raw = drafts[def.id] ?? "";
      const current = readTrackerValue(store, def.id);
      if (raw.trim() === "") return null;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) return null;
      if (current !== null && Math.round(current) === Math.round(parsed)) return null;
      return { id: def.id, value: parsed };
    }).filter((entry): entry is { id: TrackerId; value: number } => entry !== null);
  }, [drafts, store]);

  const hasErrors = Object.values(fieldErrors).some((e) => e !== null);
  const canSubmit = changed.length > 0 && !hasErrors;

  const handleSave = () => {
    try {
      setState("loading");
      const result = setTrackerValues(store, changed);
      if (result) {
        setState("error");
        setFieldErrors({});
        return;
      }
      setSuccessData(changed);
      setState("success");
      const closeTimer = window.setTimeout(() => {
        onClose();
      }, 2000);
      return () => window.clearTimeout(closeTimer);
    } catch (err) {
      console.error("[ReflectSheet] Save error:", err);
      setState("error");
      setFieldErrors({});
    }
  };

  const handleResetConfirm = () => {
    setDrafts({});
    setFieldErrors({});
    setTouched(new Set());
    setShowResetConfirm(false);
    setState("editing");
    const id = window.setTimeout(() => firstRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  };

  if (!open) return null;

  /* Success state */
  if (state === "success") {
    return (
      <Overlay>
        <div className="tk2-curtain" style={CURTAIN_STYLE} onClick={onClose} aria-hidden />
        <div
          className="tk2-modal tk2-sheet"
          style={{ ...PANEL_STYLE, maxWidth: 480, padding: 0, overflow: "hidden", textAlign: "center" }}
          role="dialog"
          aria-modal="true"
          aria-label="Metrics saved"
        >
          <button type="button" className="tk2-modal-close" onClick={onClose} aria-label="Close" style={{ top: 20, right: 20, zIndex: 10 }}>
            ×
          </button>

          <div style={HEADER_STYLE}>
            <p style={HEADER_TEXT}>Saved!</p>
            <p style={HEADER_SUBTITLE}>Your metrics for today have been recorded.</p>
          </div>

          <div style={{ padding: "0 32px 32px" }}>
            <div style={SUCCESS_ICON_STYLE}>✓</div>

            <div style={SUMMARY_GRID_STYLE}>
              {successData.map((item) => {
                const def = trackerDef(item.id);
                return (
                  <div key={item.id} style={SUMMARY_ITEM_STYLE}>
                    <div style={SUMMARY_LABEL_STYLE}>{def.name}</div>
                    <div style={SUMMARY_VALUE_STYLE}>{def.format(item.value)}</div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              style={{
                ...SAVE_STYLE,
                marginTop: 8,
                width: "100%",
              }}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  /* Reset confirmation state */
  if (showResetConfirm) {
    return (
      <Overlay>
        <div className="tk2-curtain" style={CURTAIN_STYLE} onClick={() => setShowResetConfirm(false)} aria-hidden />
        <div
          className="tk2-modal tk2-sheet"
          style={{ ...PANEL_STYLE, maxWidth: 380, padding: 0, overflow: "hidden", textAlign: "center" }}
          role="dialog"
          aria-modal="true"
          aria-label="Clear all entries?"
        >
          <button type="button" className="tk2-modal-close" onClick={() => setShowResetConfirm(false)} aria-label="Close" style={{ top: 20, right: 20, zIndex: 10 }}>
            ×
          </button>

          <div style={HEADER_STYLE}>
            <p style={HEADER_TEXT}>Clear all fields?</p>
            <p style={HEADER_SUBTITLE}>This will clear the highlighted fields.</p>
          </div>

          <div style={{ padding: "0 32px 32px" }}>
            <div style={RESET_CONFIRM_ICON_STYLE}>🗑</div>

            <p style={{ ...RESET_DESCRIPTION_STYLE, marginTop: 0 }}>
              You can't undo this action.
            </p>

            <button
              type="button"
              style={RESET_BUTTON_STYLE}
              onClick={handleResetConfirm}
            >
              Yes, clear all
            </button>
            <button
              type="button"
              style={CANCEL_BUTTON_STYLE}
              onClick={() => setShowResetConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  /* Main editing state */
  const headerSubtitle =
    state === "error"
      ? "Please fix the highlighted fields."
      : changed.length > 0
      ? "You're doing great — one day at a time."
      : "Enter your metrics now";

  return (
    <Overlay>
      <div className="tk2-curtain" style={CURTAIN_STYLE} onClick={onClose} aria-hidden />

      <div
        className="tk2-modal tk2-sheet"
        style={{ ...PANEL_STYLE, maxWidth: 540, padding: 0, overflow: "hidden" }}
        role="dialog"
        aria-modal="true"
        aria-label="Log today"
      >
        <button type="button" className="tk2-modal-close" onClick={onClose} aria-label="Close" style={{ top: 20, right: 20, zIndex: 10 }}>
          ×
        </button>

        <div style={HEADER_STYLE}>
          <p style={HEADER_TEXT}>Today's snapshot</p>
          <p style={HEADER_SUBTITLE}>{headerSubtitle}</p>
        </div>

        <div style={{ padding: "0 32px 24px" }}>
          <div style={CARD_GRID_STYLE}>
            {TRACKERS.map((def, i) => {
              const value = drafts[def.id] ?? "";
              const isFocused = touched.has(def.id);
              const error = fieldErrors[def.id];
              const hasError = isFocused && error;
              const isEmpty = value === "";
              const isValid = !isEmpty && !error;

              let borderColor = "rgba(255, 255, 255, 0.1)";
              let bottomBorderColor = "rgba(255, 255, 255, 0.2)";

              if (hasError) {
                borderColor = "rgba(255, 0, 85, 0.6)";
                bottomBorderColor = "#FF0055";
              } else if (isValid) {
                borderColor = "rgba(0, 230, 118, 0.4)";
                bottomBorderColor = "#00E676";
              } else if (value) {
                borderColor = "rgba(255, 0, 85, 0.3)";
                bottomBorderColor = "rgba(255, 0, 85, 0.4)";
              }

              return (
                <div
                  key={def.id}
                  style={{
                    ...TRACKER_CARD_STYLE,
                    borderColor,
                    background: hasError
                      ? "rgba(255, 0, 85, 0.08)"
                      : isValid
                      ? "rgba(0, 230, 118, 0.05)"
                      : "rgba(255, 255, 255, 0.03)",
                    boxShadow: hasError ? "0 0 16px rgba(255, 0, 85, 0.2)" : isValid ? "0 0 12px rgba(0, 230, 118, 0.15)" : "none",
                  }}
                >
                  <label>
                    <span style={TRACKER_LABEL_STYLE}>{def.name}</span>
                    <input
                      ref={i === 0 ? firstRef : undefined}
                      style={{
                        ...TRACKER_INPUT_STYLE,
                        borderBottomColor,
                        color: isEmpty ? "rgba(255, 255, 255, 0.6)" : "#ffffff",
                      }}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={def.max}
                      placeholder="—"
                      value={value}
                      onChange={(event) => handleFieldChange(def.id, event.target.value)}
                      onBlur={() => handleFieldBlur(def.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && canSubmit) handleSave();
                      }}
                      disabled={state === "loading"}
                    />
                  </label>
                  {hasError && <span style={ERROR_TEXT_STYLE}>{error}</span>}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button
              type="button"
              style={{
                ...SAVE_STYLE,
                flex: 1,
                marginTop: 0,
                opacity: canSubmit ? 1 : 0.5,
                pointerEvents: canSubmit ? "auto" : "none",
              }}
              onClick={handleSave}
              disabled={state === "loading" || !canSubmit}
            >
              {state === "loading" ? "Saving..." : changed.length > 0 ? `Save ${changed.length}` : "Confirm"}
            </button>
            {changed.length > 0 && (
              <button
                type="button"
                style={{
                  ...SAVE_STYLE,
                  flex: 0.4,
                  marginTop: 0,
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  boxShadow: "none",
                }}
                onClick={() => setShowResetConfirm(true)}
                disabled={state === "loading"}
                title="Clear all entries"
              >
                🗑
              </button>
            )}
          </div>

          {state === "error" && (
            <p style={{ marginTop: 16, fontSize: "0.85rem", color: "#FF0055", textAlign: "center" }} role="alert">
              Unable to save. Please try again.
            </p>
          )}
        </div>
      </div>
    </Overlay>
  );
}
