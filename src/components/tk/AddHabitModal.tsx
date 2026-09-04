/**
 * AddHabitModal — Premium add habit dialog
 *
 * Ported from bloom-add-habit-modal-v3-latest.html
 * Multi-step form with live preview, validation, and analytics tracking
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";

const MODAL_BACKDROP: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(10, 10, 16, 0.66)",
  backdropFilter: "blur(8px)",
  display: "none",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  padding: "1.5rem",
};

const MODAL_BACKDROP_OPEN: CSSProperties = {
  ...MODAL_BACKDROP,
  display: "flex",
  animation: "fadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both",
};

const MODAL_CONTAINER: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: "520px",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  background: "linear-gradient(180deg, #1C1E2B, #23263A)",
  border: "1px solid #2E3145",
  borderRadius: "18px",
  boxShadow: "0 40px 90px -20px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)",
  animation: "modalIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
  overflow: "hidden",
};

const MODAL_HEAD: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "1rem",
  padding: "2rem",
  paddingBottom: "1rem",
};

const MODAL_EYEBROW: CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "11px",
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "#5A5D75",
  marginBottom: "6px",
};

const MODAL_TITLE: CSSProperties = {
  fontFamily: "'Fraunces', serif",
  fontWeight: 500,
  fontSize: "24px",
  letterSpacing: "-0.01em",
  color: "#F0EFEA",
  margin: 0,
};

const MODAL_CLOSE: CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  border: "1px solid #2E3145",
  background: "#1C1E2B",
  color: "#8B8CA3",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "14px",
  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
  flexShrink: 0,
};

const MODAL_BODY: CSSProperties = {
  position: "relative",
  overflowY: "auto",
  padding: "0 2rem 1rem",
};

const MODAL_FOOT: CSSProperties = {
  display: "flex",
  gap: "1rem",
  padding: "1rem 2rem 2rem",
  borderTop: "1px solid #2E3145",
  background: "#23263A",
};

const BUTTON: CSSProperties = {
  flex: 1,
  padding: "13px",
  borderRadius: "10px",
  fontFamily: "'Inter', sans-serif",
  fontWeight: 600,
  fontSize: "14px",
  cursor: "pointer",
  border: "1px solid transparent",
  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
};

const BUTTON_PRIMARY: CSSProperties = {
  ...BUTTON,
  background: "linear-gradient(135deg, #E8B75E, color-mix(in oklab, #E8B75E 78%, #000))",
  color: "#14151F",
};

const BUTTON_SECONDARY: CSSProperties = {
  ...BUTTON,
  background: "#23263A",
  borderColor: "#2E3145",
  color: "#8B8CA3",
};

const PREVIEW_CARD: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  background: "#23263A",
  border: "1px solid #2E3145",
  borderRadius: "10px",
  padding: "0.75rem 1rem",
  marginBottom: "1.5rem",
};

const PREVIEW_ICON: CSSProperties = {
  width: "52px",
  height: "52px",
  borderRadius: "10px",
  background: "rgba(232, 183, 94, 0.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "25px",
  flexShrink: 0,
};

const PREVIEW_META: CSSProperties = {
  minWidth: 0,
  flex: 1,
};

const PREVIEW_NAME: CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: "#F0EFEA",
};

const PREVIEW_SUB: CSSProperties = {
  fontSize: "12px",
  color: "#5A5D75",
  marginTop: "2px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const PREVIEW_POINTS: CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "13px",
  color: "#E8B75E",
  flexShrink: 0,
};

const FIELD_LABEL: CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#8B8CA3",
  marginBottom: "0.5rem",
  display: "block",
};

const INPUT_FIELD: CSSProperties = {
  width: "100%",
  background: "#23263A",
  border: "1px solid #2E3145",
  borderRadius: "10px",
  padding: "13px 14px",
  color: "#F0EFEA",
  fontFamily: "'Inter', sans-serif",
  fontSize: "15px",
  marginBottom: "1.5rem",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

interface AddHabitModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (habit: any) => Promise<void>;
}

export function AddHabitModal({ open, onClose, onSubmit }: AddHabitModalProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [icon, setIcon] = useState("⭐");
  const [color, setColor] = useState("amber");
  const [frequency, setFrequency] = useState("daily");
  const [priority, setPriority] = useState("medium");
  const [points, setPoints] = useState(10);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => firstInputRef.current?.focus(), 60);
    }
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        note: note.trim(),
        icon: { type: "emoji", value: icon },
        color,
        frequency,
        priority,
        points,
        reminder: { enabled: reminderEnabled, time: reminderTime },
        tags: [],
        startDate: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      };

      if (onSubmit) {
        await onSubmit(payload);
      }

      setName("");
      setNote("");
      setIcon("⭐");
      setColor("amber");
      setFrequency("daily");
      setPriority("medium");
      setPoints(10);
      setReminderTime("08:00");
      setStep(0);
      onClose();
    } catch (err) {
      console.error("[AddHabitModal] Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div style={MODAL_BACKDROP_OPEN}>
      <div style={MODAL_CONTAINER}>
        {/* Header */}
        <div style={MODAL_HEAD}>
          <div>
            <div style={MODAL_EYEBROW}>New habit</div>
            <div style={MODAL_TITLE}>Add a habit</div>
          </div>
          <button
            style={MODAL_CLOSE}
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={MODAL_BODY}>
          {step === 0 && (
            <>
              <div style={PREVIEW_CARD}>
                <div style={PREVIEW_ICON}>{icon}</div>
                <div style={PREVIEW_META}>
                  <div style={PREVIEW_NAME}>{name.trim() || "Untitled habit"}</div>
                  <div style={PREVIEW_SUB}>Daily · Medium priority</div>
                </div>
                <div style={PREVIEW_POINTS}>+{points}</div>
              </div>

              <label>
                <span style={FIELD_LABEL}>Name (1-60 chars)</span>
                <input
                  ref={firstInputRef}
                  style={INPUT_FIELD}
                  type="text"
                  maxLength={60}
                  placeholder="e.g. Morning walk"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              <label>
                <span style={FIELD_LABEL}>Why it matters (optional)</span>
                <textarea
                  style={{ ...INPUT_FIELD, resize: "vertical", minHeight: "72px", fontFamily: "'Inter', sans-serif" }}
                  maxLength={160}
                  placeholder="A short reason — shown when you tap the habit."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>

              <label>
                <span style={FIELD_LABEL}>Pick an icon</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  {["⭐", "🌱", "📚", "💧", "🧘", "🏃", "✍️"].map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setIcon(e)}
                      style={{
                        aspectRatio: "1",
                        borderRadius: "10px",
                        background: icon === e ? "rgba(232, 183, 94, 0.14)" : "#23263A",
                        border: icon === e ? "1px solid #E8B75E" : "1px solid #2E3145",
                        fontSize: "18px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <label>
                <span style={FIELD_LABEL}>Frequency</span>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  {["daily", "weekly", "custom"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      style={{
                        flex: 1,
                        padding: "9px 16px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        fontWeight: 500,
                        background: frequency === f ? "rgba(232, 183, 94, 0.14)" : "#23263A",
                        border: frequency === f ? "1px solid #E8B75E" : "1px solid #2E3145",
                        color: frequency === f ? "#E8B75E" : "#8B8CA3",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        textTransform: "capitalize",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <label>
                <span style={FIELD_LABEL}>Points per completion</span>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setPoints(Math.max(5, points - 5))}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      border: "1px solid #2E3145",
                      background: "#23263A",
                      color: "#F0EFEA",
                      cursor: "pointer",
                    }}
                  >
                    –
                  </button>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "18px", minWidth: "38px", textAlign: "center", color: "#E8B75E" }}>
                    {points}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPoints(Math.min(500, points + 5))}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      border: "1px solid #2E3145",
                      background: "#23263A",
                      color: "#F0EFEA",
                      cursor: "pointer",
                    }}
                  >
                    +
                  </button>
                </div>
              </label>

              <label>
                <span style={FIELD_LABEL}>Priority</span>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  {["low", "medium", "high"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      style={{
                        flex: 1,
                        padding: "9px 16px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        fontWeight: 500,
                        background: priority === p ? "rgba(232, 183, 94, 0.14)" : "#23263A",
                        border: priority === p ? "1px solid #E8B75E" : "1px solid #2E3145",
                        color: priority === p ? "#E8B75E" : "#8B8CA3",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        textTransform: "capitalize",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <span style={FIELD_LABEL}>Daily reminder at</span>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  disabled={!reminderEnabled}
                  style={{ ...INPUT_FIELD, flex: 1, marginBottom: 0 }}
                />
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={MODAL_FOOT}>
          <button
            style={BUTTON_SECONDARY}
            onClick={step === 0 ? onClose : () => setStep(step - 1)}
            disabled={submitting}
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button
            style={BUTTON_PRIMARY}
            onClick={step === 2 ? handleSubmit : () => setStep(step + 1)}
            disabled={submitting || (step === 0 && !name.trim())}
          >
            {submitting ? "Creating..." : step === 2 ? "Create habit" : "Continue"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

export default AddHabitModal;
