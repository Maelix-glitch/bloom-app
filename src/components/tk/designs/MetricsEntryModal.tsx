/**
 * MetricsEntryModal — premium metrics entry modal with validation
 * Adapted from lovable-data-entry repo
 *
 * Features:
 * - 2-column grid layout for 6 metrics
 * - Real-time validation with error messages
 * - Success state with checkmark and summary
 * - Reset confirmation before clearing
 * - Keyboard support (Escape to close, Enter to confirm)
 * - Accessible with focus management
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { X, Moon, Droplets, BookOpen, Activity, Zap, Smartphone, Check, Trash2 } from "lucide-react";

import type { TrackerStore } from "@/hooks/useTrackers";
import { TRACKERS, trackerDef, type TrackerId } from "@/lib/trackers/core";
import { Overlay, CURTAIN_STYLE, PANEL_STYLE } from "./shared";

type View = "form" | "saved" | "reset";

const ICON_MAP: Record<TrackerId, typeof Moon> = {
  sleep: Moon,
  water: Droplets,
  study: BookOpen,
  movement: Activity,
  energy: Zap,
  screen: Smartphone,
};

const COLOR_MAP: Record<TrackerId, string> = {
  sleep: "#00E676",
  water: "#00D9A3",
  study: "#7FA0C9",
  movement: "#FF6B35",
  energy: "#FFD700",
  screen: "#FF0055",
};

const VALIDATORS: Record<TrackerId, (v: number) => string | null> = {
  sleep: (v) => (v < 0 || v > 1440 ? "Enter 0–1440 minutes" : null),
  water: (v) => (v < 0 || v > 20000 ? "Enter 0–20000 ml" : null),
  study: (v) => (v < 0 || v > 1440 ? "Enter 0–1440 minutes" : null),
  movement: (v) => (v < 0 || v > 1440 ? "Enter 0–1440 minutes" : null),
  energy: (v) => (v < 1 || v > 5 ? "Must be 1–5" : null),
  screen: (v) => (v < 0 || v > 1440 ? "Enter 0–1440 minutes" : null),
};

const HEADERS: Record<TrackerId, CSSProperties> = {
  sleep: { background: "linear-gradient(135deg, #00E676 0%, #00D9A3 100%)" },
  water: { background: "linear-gradient(135deg, #00D9A3 0%, #00E676 100%)" },
  study: { background: "linear-gradient(135deg, #7FA0C9 0%, #00E676 100%)" },
  movement: { background: "linear-gradient(135deg, #FF6B35 0%, #FFD700 100%)" },
  energy: { background: "linear-gradient(135deg, #FFD700 0%, #FF6B35 100%)" },
  screen: { background: "linear-gradient(135deg, #FF0055 0%, #8A2BE2 100%)" },
};

const CARD_GRID_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 16,
  marginTop: 16,
};

const CARD_STYLE: CSSProperties = {
  padding: 16,
  borderRadius: 12,
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(255, 255, 255, 0.03)",
  backdropFilter: "blur(12px)",
  transition: "all 0.2s ease",
};

const LABEL_STYLE: CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "rgba(255, 255, 255, 0.5)",
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const INPUT_STYLE: CSSProperties = {
  fontSize: "1.6rem",
  fontWeight: 700,
  color: "#ffffff",
  background: "transparent",
  border: "none",
  borderBottom: "2px solid rgba(255, 255, 255, 0.2)",
  outline: "none",
  width: "100%",
  padding: "8px 0",
  fontFamily: "var(--ci-font-mono), ui-monospace, monospace",
  transition: "all 0.2s ease",
};

const UNIT_STYLE: CSSProperties = {
  fontSize: "0.75rem",
  color: "rgba(255, 255, 255, 0.5)",
  marginLeft: 6,
  fontWeight: 400,
};

const ERROR_STYLE: CSSProperties = {
  fontSize: "0.7rem",
  color: "#FF0055",
  marginTop: 6,
  display: "flex",
  alignItems: "center",
  gap: 4,
};

const SUCCESS_ICON_STYLE: CSSProperties = {
  width: 80,
  height: 80,
  margin: "0 auto 16px",
  borderRadius: "50%",
  background: "rgba(0, 230, 118, 0.15)",
  border: "2px solid #00E676",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "40px",
};

const BUTTON_STYLE: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px 16px",
  marginTop: 12,
  borderRadius: 12,
  border: 0,
  background: "linear-gradient(135deg, #FF0055 0%, #8A2BE2 100%)",
  color: "#ffffff",
  fontSize: "0.85rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

export function MetricsEntryModal({
  store,
  open,
  onClose,
}: {
  store: TrackerStore;
  open: boolean;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>("form");
  const [values, setValues] = useState<Partial<Record<TrackerId, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<TrackerId, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setView("form");
    setValues({});
    setErrors({});
    setSubmitted(false);
    setLoading(false);
    const id = window.setTimeout(() => firstRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Enter" && view === "form" && submitted) handleConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, view, submitted]);

  if (!open) return null;

  const isEmpty = TRACKERS.every((def) => !(values[def.id] ?? "").trim());

  const setValue = (id: TrackerId, v: string) => {
    setValues((prev) => ({ ...prev, [id]: v }));
    if (submitted) {
      const def = trackerDef(id);
      const validator = VALIDATORS[id];
      const msg = v.trim() === "" ? null : validateField(id, v);
      setErrors((prev) => ({ ...prev, [id]: msg ?? undefined }));
    }
  };

  const validateField = (id: TrackerId, raw: string): string | null => {
    const n = Number(raw);
    if (raw.trim() === "" || Number.isNaN(n)) return "Enter a number";
    const validator = VALIDATORS[id];
    return validator(n);
  };

  const handleConfirm = async () => {
    setSubmitted(true);
    const nextErrors: Partial<Record<TrackerId, string>> = {};

    for (const def of TRACKERS) {
      const raw = values[def.id] ?? "";
      if (raw.trim() === "") continue;
      const msg = validateField(def.id, raw);
      if (msg) nextErrors[def.id] = msg;
    }

    setErrors(nextErrors);

    const anyValue = TRACKERS.some((def) => (values[def.id] ?? "").trim() !== "");
    const allFilled = TRACKERS.every((def) => (values[def.id] ?? "").trim() !== "");
    const hasErrors = Object.keys(nextErrors).length > 0;

    if (hasErrors || !anyValue) return;

    // Save to store
    setLoading(true);
    try {
      const today = store.today;
      const current = store.days.find((d) => d.date === today);
      const next = current ? { ...current, date: today } : { date: today, sessions: [], tags: [], notes: "" };

      // Apply values to the day entry
      for (const def of TRACKERS) {
        const raw = values[def.id] ?? "";
        if (raw.trim() === "") continue;
        const value = Number(raw);

        if (def.id === "sleep") next.sleepMinutes = value;
        if (def.id === "water") next.waterMl = value;
        if (def.id === "movement") next.movementMinutes = value;
        if (def.id === "screen") next.screenMinutes = value;
        if (def.id === "energy") next.energy = value;
        if (def.id === "study") {
          next.sessions = [{ subject: "General", minutes: value, startAt: null }];
        }
      }

      // Save via store
      const result = store.saveDay(next);
      if (!result.ok) {
        console.error("[MetricsEntryModal] Save failed:", result.errors);
        setErrors(result.errors as any);
        setLoading(false);
        return;
      }

      setView("saved");
      const closeTimer = window.setTimeout(() => {
        onClose();
      }, 2000);
      return () => window.clearTimeout(closeTimer);
    } catch (err) {
      console.error("[MetricsEntryModal] Error:", err);
      setLoading(false);
    }
  };

  const clearAll = () => {
    setValues({});
    setErrors({});
    setSubmitted(false);
    setView("form");
    const id = window.setTimeout(() => firstRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  };

  const hasErrors = Object.values(errors).some(Boolean);
  const allFilled = TRACKERS.every((def) => (values[def.id] ?? "").trim() !== "");

  const headerSubtitle =
    view === "saved"
      ? "Metrics saved to your day"
      : view === "reset"
      ? "Clear all fields?"
      : hasErrors
      ? "Please fix the highlighted fields."
      : allFilled
      ? "You're doing great — one day at a time."
      : isEmpty
      ? "Enter your metrics now"
      : "Fill in the remaining fields.";

  if (view === "saved") {
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

          <div style={{ ...HEADERS.sleep, padding: "24px 32px 20px", marginBottom: 20, marginLeft: -32, marginRight: -32, marginTop: -32, borderRadius: "24px 24px 0 0" }}>
            <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>Saved!</p>
            <p style={{ margin: "8px 0 0", fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.85)", fontWeight: 400 }}>Your metrics for today have been recorded.</p>
          </div>

          <div style={{ padding: "0 32px 32px" }}>
            <div style={SUCCESS_ICON_STYLE}>✓</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
              {TRACKERS.map((def) => {
                const raw = values[def.id] ?? "";
                if (raw.trim() === "") return null;
                return (
                  <div
                    key={def.id}
                    style={{
                      textAlign: "center",
                      padding: 12,
                      borderRadius: 12,
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <div style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255, 255, 255, 0.5)", marginBottom: 4 }}>
                      {def.name}
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff" }}>{def.format(Number(raw))}</div>
                  </div>
                );
              })}
            </div>

            <button type="button" style={BUTTON_STYLE} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  if (view === "reset") {
    return (
      <Overlay>
        <div className="tk2-curtain" style={CURTAIN_STYLE} onClick={() => setView("form")} aria-hidden />
        <div
          className="tk2-modal tk2-sheet"
          style={{ ...PANEL_STYLE, maxWidth: 380, padding: 0, overflow: "hidden", textAlign: "center" }}
          role="dialog"
          aria-modal="true"
          aria-label="Clear all entries?"
        >
          <button type="button" className="tk2-modal-close" onClick={() => setView("form")} aria-label="Close" style={{ top: 20, right: 20, zIndex: 10 }}>
            ×
          </button>

          <div style={{ ...HEADERS.screen, padding: "24px 32px 20px", marginBottom: 20, marginLeft: -32, marginRight: -32, marginTop: -32, borderRadius: "24px 24px 0 0" }}>
            <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>Clear all fields?</p>
            <p style={{ margin: "8px 0 0", fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.85)", fontWeight: 400 }}>This will clear all values you've entered.</p>
          </div>

          <div style={{ padding: "0 32px 32px" }}>
            <div style={{ width: 64, height: 64, margin: "0 auto 16px", borderRadius: "50%", background: "rgba(255, 0, 85, 0.15)", border: "2px solid #FF0055", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>
              🗑
            </div>

            <button type="button" style={{ ...BUTTON_STYLE, background: "#FF0055", marginTop: 16 }} onClick={clearAll}>
              Yes, clear all
            </button>
            <button
              type="button"
              style={{
                ...BUTTON_STYLE,
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                boxShadow: "none",
                marginTop: 8,
              }}
              onClick={() => setView("form")}
            >
              Cancel
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

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

        <div style={{ ...HEADERS.sleep, padding: "24px 32px", marginBottom: 24, marginLeft: -32, marginRight: -32, marginTop: -32, borderRadius: "24px 24px 0 0" }}>
          <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>Today's snapshot</p>
          <p style={{ margin: "8px 0 0", fontSize: "0.9rem", color: "rgba(255, 255, 255, 0.85)", fontWeight: 400 }}>{headerSubtitle}</p>
        </div>

        <div style={{ padding: "0 32px 24px" }}>
          <div style={CARD_GRID_STYLE}>
            {TRACKERS.map((def, i) => {
              const raw = values[def.id] ?? "";
              const err = errors[def.id];
              const isEmpty = raw.trim() === "";
              const isValid = !isEmpty && !err;
              const Icon = ICON_MAP[def.id];

              let borderColor = "rgba(255, 255, 255, 0.1)";
              let bottomBorderColor = "rgba(255, 255, 255, 0.2)";

              if (err) {
                borderColor = "rgba(255, 0, 85, 0.6)";
                bottomBorderColor = "#FF0055";
              } else if (isValid) {
                borderColor = "rgba(0, 230, 118, 0.4)";
                bottomBorderColor = "#00E676";
              }

              return (
                <div
                  key={def.id}
                  style={{
                    ...CARD_STYLE,
                    borderColor,
                    background: err ? "rgba(255, 0, 85, 0.08)" : isValid ? "rgba(0, 230, 118, 0.05)" : "rgba(255, 255, 255, 0.03)",
                    boxShadow: err ? "0 0 16px rgba(255, 0, 85, 0.2)" : isValid ? "0 0 12px rgba(0, 230, 118, 0.15)" : "none",
                  }}
                >
                  <label style={LABEL_STYLE}>
                    <Icon size={14} color={COLOR_MAP[def.id]} />
                    {def.name}
                  </label>

                  <div style={{ display: "flex", alignItems: "baseline", borderBottom: `2px solid ${bottomBorderColor}`, paddingBottom: 8 }}>
                    <input
                      ref={i === 0 ? firstRef : undefined}
                      type="number"
                      inputMode="decimal"
                      value={raw}
                      onChange={(event) => setValue(def.id, event.target.value)}
                      onBlur={() => {
                        if (raw.trim() !== "") {
                          const msg = validateField(def.id, raw);
                          setErrors((prev) => ({ ...prev, [def.id]: msg ?? undefined }));
                        }
                      }}
                      placeholder="—"
                      disabled={loading}
                      style={{
                        ...INPUT_STYLE,
                        color: isEmpty ? "rgba(255, 255, 255, 0.6)" : "#ffffff",
                        borderBottomColor: bottomBorderColor,
                      }}
                    />
                    <span style={UNIT_STYLE}>{def.unit}</span>
                  </div>

                  {err && (
                    <p style={ERROR_STYLE}>
                      <span>⚠</span>
                      {err}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button
              type="button"
              style={{
                ...BUTTON_STYLE,
                marginTop: 0,
                flex: 1,
                opacity: submitted && hasErrors ? 0.5 : 1,
                pointerEvents: submitted && hasErrors ? "none" : "auto",
              }}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Saving..." : submitted && hasErrors ? "Fix errors" : "Confirm"}
            </button>

            {!isEmpty && (
              <button
                type="button"
                style={{
                  ...BUTTON_STYLE,
                  marginTop: 0,
                  flex: 0.4,
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  boxShadow: "none",
                }}
                onClick={() => setView("reset")}
                disabled={loading}
                title="Clear all entries"
              >
                🗑
              </button>
            )}
          </div>

          {submitted && hasErrors && (
            <p style={{ marginTop: 16, fontSize: "0.85rem", color: "#FF0055", textAlign: "center" }} role="alert">
              Please fix the highlighted fields to save.
            </p>
          )}
        </div>
      </div>
    </Overlay>
  );
}
