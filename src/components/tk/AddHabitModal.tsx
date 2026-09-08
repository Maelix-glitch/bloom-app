/**
 * AddHabitModal — Bloom's "Add a habit" dialog.
 *
 * A faithful React port of public/bloom/bloom-add-habit-modal-v3-latest.html
 * ("Bloom — Add Habit v3, advanced"): the same markup and class names, the same
 * three steps (Basics · Schedule · Details), live preview card, icon search +
 * custom image upload, colour accent that re-tints the whole dialog, custom-day
 * picker, weekly target stepper, measurable goal, start date, points stepper,
 * priority, daily reminder, tags, per-step validation, keyboard handling
 * (Esc closes, Cmd/Ctrl+Enter submits, Tab is trapped) and the success overlay.
 *
 * The styles are the HTML's own <style> block scoped under `.bloom-add-habit`
 * — see src/styles/add-habit-modal.css.
 *
 * State handling mirrors the HTML on purpose: one `state` object, every change
 * goes through `set(patch)`, and the JSX below is the HTML's `render()`.
 *
 * Integration surface (the HTML's `BloomAddHabit` API):
 *   <AddHabitModal open onClose={…} onSubmit={async (payload) => …} prefill={…} />
 * `onSubmit` receives the payload contract documented in the HTML header
 * (`AddHabitPayload`). If it throws, the dialog shows "Could not save. Try
 * again." under the name field, exactly like the original.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import "@/styles/add-habit-modal.css";

/* ============================ PUBLIC TYPES ================================ */

export type HabitColor = "amber" | "sage" | "rose" | "sky" | "violet";
export type HabitFrequency = "daily" | "weekly" | "custom";
export type HabitPriority = "low" | "medium" | "high";
export interface HabitIcon {
  type: "emoji" | "image";
  /** emoji character, or a data URL for uploaded images */
  value: string;
}

/** Payload handed to `onSubmit` — stable contract, match your DB columns to this. */
export interface AddHabitPayload {
  name: string; // required, 1..60
  note: string; // optional
  icon: HabitIcon;
  color: HabitColor;
  frequency: HabitFrequency;
  days: number[]; // 0=Sun..6=Sat, only when custom
  timesPerWeek: number | null; // only when weekly
  goal: { enabled: boolean; target: number | null; unit: string | null };
  points: number; // 5..500 step 5
  priority: HabitPriority;
  reminder: { enabled: boolean; time: string | null }; // "HH:MM"
  tags: string[];
  startDate: string; // "YYYY-MM-DD"
  createdAt: string; // ISO
}

/** Pass an existing habit to edit instead of create (switches the heading). */
export interface AddHabitPrefill {
  name?: string | undefined;
  note?: string | undefined;
  icon?: HabitIcon | undefined;
  color?: HabitColor | undefined;
  frequency?: HabitFrequency | undefined;
  days?: number[] | undefined;
  timesPerWeek?: number | null | undefined;
  goal?: { enabled: boolean; target: number | null; unit: string | null } | undefined;
  points?: number | undefined;
  priority?: HabitPriority | undefined;
  reminder?: { enabled: boolean; time: string | null } | undefined;
  tags?: string[] | undefined;
  startDate?: string | undefined;
}

export interface AddHabitModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: ((habit: AddHabitPayload) => Promise<void> | void) | undefined;
  prefill?: AddHabitPrefill | undefined;
}

/* --- ICON CATALOGUE ---------------------------------------------------------
   Add/remove freely. `k` = search keywords. Grid is rendered from this array,
   so the search box works automatically for anything you add. */
const ICONS: { e: string; k: string }[] = [
  { e: "⭐", k: "star favourite" },
  { e: "🌱", k: "grow plant seed" },
  { e: "📚", k: "read book study" },
  { e: "💧", k: "water drink hydrate" },
  { e: "🧘", k: "meditate calm yoga" },
  { e: "🏃", k: "run exercise cardio" },
  { e: "✍️", k: "write journal note" },
  { e: "🍎", k: "eat food fruit" },
  { e: "😴", k: "sleep rest bed" },
  { e: "🎯", k: "goal focus target" },
  { e: "🎨", k: "art draw create" },
  { e: "💪", k: "gym strength workout" },
  { e: "🧹", k: "clean tidy chore" },
  { e: "💊", k: "medicine pill health" },
  { e: "🚶", k: "walk steps outside" },
  { e: "☀️", k: "morning sun wake" },
  { e: "🌙", k: "night evening moon" },
  { e: "💰", k: "save money budget" },
  { e: "📵", k: "no phone screen detox" },
  { e: "🧠", k: "learn brain think" },
  { e: "🎧", k: "music listen podcast" },
  { e: "🧴", k: "skincare routine" },
  { e: "🦷", k: "teeth brush dental" },
  { e: "📞", k: "call family friend" },
  { e: "🌿", k: "nature outdoors green" },
  { e: "🍵", k: "tea drink calm" },
  { e: "🚴", k: "bike cycle ride" },
  { e: "🧺", k: "laundry chore home" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* --- STATE ------------------------------------------------------------------
   THE single source of truth. Never read UI values off the DOM; read state. */
interface Errors {
  name?: string | undefined;
  days?: string | undefined;
  goal?: string | undefined;
  icon?: string | undefined;
}
interface State {
  step: number;
  maxStepSeen: number;
  name: string;
  note: string;
  icon: HabitIcon;
  color: HabitColor;
  frequency: HabitFrequency;
  days: number[];
  timesPerWeek: number;
  goal: { enabled: boolean; target: number | string; unit: string };
  points: number;
  priority: HabitPriority;
  reminder: { enabled: boolean; time: string };
  tags: string[];
  startDate: string;
  errors: Errors;
  submitting: boolean;
  iconQuery: string;
}

/** Today in the person's own timezone (the HTML used the UTC date). */
const localDate = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const DEFAULT_STATE = (): State => ({
  step: 0,
  maxStepSeen: 0,
  name: "",
  note: "",
  icon: { type: "emoji", value: "⭐" },
  color: "amber",
  frequency: "daily",
  days: [1, 2, 3, 4, 5],
  timesPerWeek: 3,
  goal: { enabled: false, target: 10, unit: "min" },
  points: 10,
  priority: "medium",
  reminder: { enabled: false, time: "08:00" },
  tags: [],
  startDate: localDate(),
  errors: {},
  submitting: false,
  iconQuery: "",
});

function initialState(prefill: AddHabitPrefill | undefined): State {
  const base = DEFAULT_STATE();
  if (!prefill) return base;
  return {
    ...base,
    ...(prefill.name !== undefined && { name: prefill.name }),
    ...(prefill.note !== undefined && { note: prefill.note }),
    ...(prefill.icon && { icon: { ...prefill.icon } }),
    ...(prefill.color && { color: prefill.color }),
    ...(prefill.frequency && { frequency: prefill.frequency }),
    ...(prefill.days && prefill.days.length > 0 && { days: [...prefill.days] }),
    ...(prefill.timesPerWeek != null && { timesPerWeek: prefill.timesPerWeek }),
    ...(prefill.goal && {
      goal: {
        enabled: prefill.goal.enabled,
        target: prefill.goal.target ?? base.goal.target,
        unit: prefill.goal.unit ?? base.goal.unit,
      },
    }),
    ...(prefill.points !== undefined && { points: prefill.points }),
    ...(prefill.priority && { priority: prefill.priority }),
    ...(prefill.reminder && {
      reminder: {
        enabled: prefill.reminder.enabled,
        time: prefill.reminder.time ?? base.reminder.time,
      },
    }),
    ...(prefill.tags && { tags: [...prefill.tags] }),
    ...(prefill.startDate && { startDate: prefill.startDate }),
  };
}

/* --- VALIDATION -------------------------------------------------------------
   Returns an errors map for the step passed in. Extend here for new rules. */
function validate(state: State, step = state.step): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!state.name.trim()) e.name = "Give your habit a name.";
    else if (state.name.trim().length < 2) e.name = "A little longer, please.";
  }
  if (step === 1) {
    if (state.frequency === "custom" && state.days.length === 0) e.days = "Pick at least one day.";
    if (state.goal.enabled) {
      if (!(Number(state.goal.target) > 0)) e.goal = "Target must be greater than zero.";
      else if (!state.goal.unit.trim()) e.goal = "Add a unit (min, pages, glasses…).";
    }
  }
  return e;
}

/* --- SUBMIT -----------------------------------------------------------------
   Builds the payload contract documented at the top. */
function buildPayload(s: State): AddHabitPayload {
  return {
    name: s.name.trim(),
    note: s.note.trim(),
    icon: { ...s.icon },
    color: s.color,
    frequency: s.frequency,
    days: s.frequency === "custom" ? [...s.days].sort((a, b) => a - b) : [],
    timesPerWeek: s.frequency === "weekly" ? s.timesPerWeek : null,
    goal: s.goal.enabled
      ? { enabled: true, target: Number(s.goal.target), unit: s.goal.unit.trim() }
      : { enabled: false, target: null, unit: null },
    points: s.points,
    priority: s.priority,
    reminder: s.reminder.enabled
      ? { enabled: true, time: s.reminder.time }
      : { enabled: false, time: null },
    tags: [...s.tags],
    startDate: s.startDate,
    createdAt: new Date().toISOString(),
  };
}

/* ================================ SHELL =================================== */

/**
 * Renders nothing while closed. Each opening mounts a fresh dialog (state is
 * initialised from `prefill`), which is what `BloomAddHabit.open()` did.
 */
export function AddHabitModal({ open, onClose, onSubmit, prefill }: AddHabitModalProps) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="bloom-add-habit">
      <AddHabitDialog onClose={onClose} onSubmit={onSubmit} prefill={prefill} />
    </div>,
    document.body,
  );
}

/* =============================== DIALOG =================================== */

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

function AddHabitDialog({ onClose, onSubmit, prefill }: Omit<AddHabitModalProps, "open">) {
  const [s, setS] = useState<State>(() => initialState(prefill));
  const [iconTab, setIconTab] = useState<"preset" | "custom">("preset");
  const [upload, setUpload] = useState<{ name: string; url: string } | null>(null);
  const [dragover, setDragover] = useState(false);
  const [tagText, setTagText] = useState("");
  const [success, setSuccess] = useState<{ icon: HabitIcon; name: string } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const closeTimer = useRef<number | null>(null);

  /* `set(patch)` — the ONLY way to mutate. Merges then React repaints. */
  const set = (patch: Partial<State> | ((prev: State) => Partial<State>)) =>
    setS((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));

  /* --- NAVIGATION -----------------------------------------------------------
     Forward moves validate; backward moves are always allowed. */
  const goStep = (next: number) => {
    if (next > s.step) {
      const errors = validate(s, s.step);
      if (Object.keys(errors).length) {
        set({ errors });
        return false;
      }
    }
    set({
      step: Math.max(0, Math.min(2, next)),
      errors: {},
      maxStepSeen: Math.max(s.maxStepSeen, next),
    });
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    return true;
  };

  const submit = async () => {
    if (s.submitting || success) return;
    /* validate every step, jump to the first one that fails */
    for (let i = 0; i <= 2; i++) {
      const errs = validate(s, i);
      if (Object.keys(errs).length) {
        set({ step: i, errors: errs });
        return;
      }
    }
    set({ submitting: true, errors: {} });
    const payload = buildPayload(s);
    try {
      await onSubmit?.(payload); // <-- persistence lives in the caller
      if (!alive.current) return;
      setSuccess({ icon: payload.icon, name: payload.name });
      closeTimer.current = window.setTimeout(() => onClose(), 1400);
    } catch (err) {
      console.error("[AddHabitModal] submit failed", err);
      if (alive.current) {
        set({ submitting: false, errors: { name: "Could not save. Try again." }, step: 0 });
      }
    }
  };

  const cancel = () => onClose();

  /* the document-level key handler always sees the latest handlers */
  const latest = useRef({ submit, cancel });
  useEffect(() => {
    latest.current = { submit, cancel };
  });

  /* mount: remember focus, lock the page, focus the name; unmount: undo */
  useEffect(() => {
    alive.current = true;
    const lastFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => nameRef.current?.focus(), 60);
    return () => {
      alive.current = false;
      window.clearTimeout(focusTimer);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      document.body.style.overflow = prevOverflow;
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    };
  }, []);

  /* keyboard: Esc closes, Cmd/Ctrl+Enter submits, Tab is trapped inside */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        latest.current.cancel();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void latest.current.submit();
      }
      if (e.key === "Tab" && modalRef.current) {
        const f = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>("button, input, textarea"),
        ).filter((n) => !(n as HTMLButtonElement).disabled && n.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* tags: Enter or comma commits, Backspace on empty removes the last */
  const onTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = tagText.trim().replace(/,$/, "");
      if (v && !s.tags.includes(v) && s.tags.length < 6) {
        setTagText("");
        set({ tags: [...s.tags, v] });
      }
    } else if (e.key === "Backspace" && !tagText && s.tags.length) {
      set({ tags: s.tags.slice(0, -1) });
    }
  };

  /* custom icon upload (click, drag & drop) — 2MB guard */
  const handleFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      set({ errors: { icon: "PNG, JPG or WEBP only." } });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      set({ errors: { icon: "That image is over 2MB." } });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = typeof ev.target?.result === "string" ? ev.target.result : "";
      if (!url || !alive.current) return; // data URL. Upload to storage in production.
      set({ icon: { type: "image", value: url }, errors: {} });
      setUpload({ name: file.name, url });
    };
    reader.readAsDataURL(file);
  };
  const resetDropzone = () => {
    if (fileRef.current) fileRef.current.value = "";
    setUpload(null);
    set({ icon: { type: "emoji", value: "⭐" } });
  };

  /* --- RENDER ------------------------------------------------------------- */
  const freqText =
    s.frequency === "daily"
      ? "Daily"
      : s.frequency === "weekly"
        ? `${s.timesPerWeek}× / week`
        : s.days.length
          ? [...s.days]
              .sort((a, b) => a - b)
              .map((d) => DAY_NAMES[d])
              .join(" · ")
          : "No days yet";
  const q = s.iconQuery.trim().toLowerCase();
  const iconList = q ? ICONS.filter((i) => i.k.includes(q)) : ICONS;
  const iconNode: ReactNode =
    s.icon.type === "image" ? <img src={s.icon.value} alt="" /> : s.icon.value;

  const errorFor = (key: keyof Errors, id: string) => (
    <div className={cx("error-msg", s.errors[key] && "show")} id={id} data-error-for={key}>
      {s.errors[key] ?? ""}
    </div>
  );

  return (
    <div
      className="backdrop open"
      id="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div
        className="modal"
        id="modal"
        data-accent={s.color}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
        ref={modalRef}
      >
        {/* HEADER */}
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow" id="modalEyebrow">
              {prefill ? "Edit habit" : "New habit"}
            </div>
            <div className="modal-title" id="modalTitle">
              {prefill ? "Edit this habit" : "Add a habit"}
            </div>
          </div>
          <button
            type="button"
            className="modal-close"
            id="btnClose"
            aria-label="Close dialog"
            onClick={cancel}
          >
            ✕
          </button>
        </div>

        {/* STEP PROGRESS: clicking a pill jumps back (never forward past validation) */}
        <div className="steps" id="steps">
          {["1 · Basics", "2 · Schedule", "3 · Details"].map((label, i) => (
            <button
              type="button"
              key={label}
              className={cx("step-pill", i === s.step && "active", i < s.step && "done")}
              data-goto={i}
              onClick={() => goStep(i)}
            >
              <span className="step-bar">
                <i />
              </span>
              <span className="step-name">{label}</span>
            </button>
          ))}
        </div>

        <div className="modal-body" ref={bodyRef}>
          {/* ============ STEP 0 — BASICS ============ */}
          <section data-step="0" className={cx(s.step === 0 && "active")}>
            {/* live preview of the habit row */}
            <div className="preview-card">
              <div className="icon-preview" id="iconPreview">
                {iconNode}
              </div>
              <div className="preview-meta">
                <div className="preview-name" id="previewName">
                  {s.name.trim() || "Untitled habit"}
                </div>
                <div className="preview-sub" id="previewSub">
                  {freqText} · {cap(s.priority)} priority
                </div>
              </div>
              <div className="preview-points" id="previewPoints">
                +{s.points}
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="nameInput">
                Name{" "}
                <span className="field-hint" id="nameCount">
                  {s.name.length}/60
                </span>
              </label>
              <input
                type="text"
                id="nameInput"
                ref={nameRef}
                placeholder="e.g. Morning walk"
                maxLength={60}
                aria-describedby="err-name"
                aria-invalid={s.errors.name ? "true" : "false"}
                autoComplete="off"
                value={s.name}
                onChange={(e) =>
                  set({ name: e.target.value, errors: { ...s.errors, name: undefined } })
                }
              />
              {errorFor("name", "err-name")}
            </div>

            <div>
              <label className="field-label" htmlFor="noteInput">
                Why it matters <span className="field-hint">optional</span>
              </label>
              <textarea
                id="noteInput"
                maxLength={160}
                placeholder="A short reason — shown when you tap the habit."
                value={s.note}
                onChange={(e) => set({ note: e.target.value })}
              />
            </div>

            <div>
              <label className="field-label">Icon</label>
              <div className="icon-tabs">
                <button
                  type="button"
                  className={cx("icon-tab", iconTab === "preset" && "active")}
                  data-tab="preset"
                  onClick={() => setIconTab("preset")}
                >
                  Choose icon
                </button>
                <button
                  type="button"
                  className={cx("icon-tab", iconTab === "custom" && "active")}
                  data-tab="custom"
                  onClick={() => setIconTab("custom")}
                >
                  Upload custom
                </button>
              </div>

              <div className={cx("icon-panel", iconTab === "preset" && "active")} id="panel-preset">
                <input
                  type="text"
                  className="icon-search"
                  id="iconSearch"
                  placeholder="Search icons — try “water”, “run”…"
                  autoComplete="off"
                  value={s.iconQuery}
                  onChange={(e) => set({ iconQuery: e.target.value })}
                />
                <div className="icon-grid" id="iconGrid">
                  {iconList.length ? (
                    iconList.map((i) => (
                      <button
                        type="button"
                        key={i.e}
                        className={cx(
                          "icon-opt",
                          s.icon.type === "emoji" && s.icon.value === i.e && "selected",
                        )}
                        data-icon={i.e}
                        aria-label={i.k.split(" ")[0]}
                        onClick={() => set({ icon: { type: "emoji", value: i.e } })}
                      >
                        {i.e}
                      </button>
                    ))
                  ) : (
                    <div className="icon-empty" style={{ gridColumn: "1/-1" }}>
                      No icons match “{q}”.
                    </div>
                  )}
                </div>
              </div>

              <div className={cx("icon-panel", iconTab === "custom" && "active")} id="panel-custom">
                <div
                  className={cx("dropzone", dragover && "dragover")}
                  id="dropzone"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragover(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragover(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragover(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragover(false);
                    handleFile(e.dataTransfer.files[0]);
                  }}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    id="fileInput"
                    ref={fileRef}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <div id="dropzoneContent">
                    {upload ? (
                      <div className="dropzone-preview">
                        <img src={upload.url} alt="Custom icon" />
                        <div>
                          <div className="dropzone-text">{upload.name}</div>
                          <button
                            className="dropzone-remove"
                            type="button"
                            id="removeIcon"
                            onClick={(e) => {
                              e.stopPropagation();
                              resetDropzone();
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="dropzone-icon">🖼️</div>
                        <div className="dropzone-text">Drop an image or click to upload</div>
                        <div className="dropzone-sub">
                          PNG, JPG or WEBP up to 2MB — square works best
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {errorFor("icon", "err-icon")}
              </div>
            </div>

            <div>
              <label className="field-label">Colour</label>
              <div className="swatch-row" id="swatchRow">
                {(
                  [
                    ["amber", "Amber"],
                    ["sage", "Sage"],
                    ["rose", "Rose"],
                    ["sky", "Sky"],
                    ["violet", "Violet"],
                  ] as const
                ).map(([c, label]) => (
                  <button
                    type="button"
                    key={c}
                    className={`swatch sw-${c}`}
                    data-color={c}
                    aria-label={label}
                    aria-pressed={s.color === c}
                    onClick={() => set({ color: c })}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* ============ STEP 1 — SCHEDULE ============ */}
          <section data-step="1" className={cx(s.step === 1 && "active")}>
            <div>
              <label className="field-label">Frequency</label>
              <div className="chip-row" id="freqRow">
                {(
                  [
                    ["daily", "Daily"],
                    ["weekly", "Weekly"],
                    ["custom", "Custom days"],
                  ] as const
                ).map(([f, label]) => (
                  <button
                    type="button"
                    key={f}
                    className="chip"
                    data-freq={f}
                    aria-pressed={s.frequency === f}
                    onClick={() => set({ frequency: f, errors: {} })}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* shown only when frequency = custom */}
              <div className={cx("conditional", s.frequency === "custom" && "open")} id="daysWrap">
                <div className="day-row" id="dayRow">
                  {["S", "M", "T", "W", "T", "F", "S"].map((label, d) => (
                    <button
                      type="button"
                      key={d}
                      className="day"
                      data-day={d}
                      aria-pressed={s.days.includes(d)}
                      onClick={() =>
                        set({
                          days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d],
                          errors: {},
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {errorFor("days", "err-days")}
              </div>

              {/* shown only when frequency = weekly */}
              <div
                className={cx("conditional", s.frequency === "weekly" && "open")}
                id="weeklyWrap"
              >
                <div className="row-box">
                  <div>
                    <div className="row-title">Times per week</div>
                    <div className="row-sub">Any day counts toward the target</div>
                  </div>
                  <div className="stepper">
                    <button
                      type="button"
                      className="step-btn"
                      data-step-times="-1"
                      aria-label="Fewer times"
                      onClick={() =>
                        set({ timesPerWeek: Math.max(1, Math.min(7, s.timesPerWeek - 1)) })
                      }
                    >
                      –
                    </button>
                    <span className="step-value" id="timesValue">
                      {s.timesPerWeek}
                    </span>
                    <button
                      type="button"
                      className="step-btn"
                      data-step-times="1"
                      aria-label="More times"
                      onClick={() =>
                        set({ timesPerWeek: Math.max(1, Math.min(7, s.timesPerWeek + 1)) })
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="row-box">
                <div>
                  <div className="row-title">Measurable goal</div>
                  <div className="row-sub">Track an amount, not just done/not done</div>
                </div>
                <button
                  type="button"
                  className="switch"
                  id="goalSwitch"
                  role="switch"
                  aria-checked={s.goal.enabled}
                  aria-label="Enable measurable goal"
                  onClick={() => set({ goal: { ...s.goal, enabled: !s.goal.enabled }, errors: {} })}
                />
              </div>
              <div className={cx("conditional", s.goal.enabled && "open")} id="goalWrap">
                <div className="row-box">
                  <div style={{ flex: 1 }}>
                    <label className="field-label" htmlFor="goalTarget">
                      Target
                    </label>
                    <input
                      type="number"
                      id="goalTarget"
                      min={1}
                      step={1}
                      value={s.goal.target}
                      onChange={(e) => set({ goal: { ...s.goal, target: e.target.value } })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="field-label" htmlFor="goalUnit">
                      Unit
                    </label>
                    <input
                      type="text"
                      id="goalUnit"
                      placeholder="glasses, pages, min"
                      value={s.goal.unit}
                      onChange={(e) => set({ goal: { ...s.goal, unit: e.target.value } })}
                    />
                  </div>
                </div>
                {errorFor("goal", "err-goal")}
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="startDate">
                Start date
              </label>
              <input
                type="date"
                id="startDate"
                value={s.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
              />
            </div>
          </section>

          {/* ============ STEP 2 — DETAILS ============ */}
          <section data-step="2" className={cx(s.step === 2 && "active")}>
            <div className="row-box">
              <div>
                <div className="row-title">Points</div>
                <div className="row-sub">Earned each time you complete this</div>
              </div>
              <div className="stepper">
                <button
                  type="button"
                  className="step-btn"
                  data-step-points="-5"
                  aria-label="Fewer points"
                  onClick={() => set({ points: Math.max(5, Math.min(500, s.points - 5)) })}
                >
                  –
                </button>
                <span className="step-value" id="pointsValue">
                  {s.points}
                </span>
                <button
                  type="button"
                  className="step-btn"
                  data-step-points="5"
                  aria-label="More points"
                  onClick={() => set({ points: Math.max(5, Math.min(500, s.points + 5)) })}
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="field-label">Priority</label>
              <div className="chip-row" id="priorityRow">
                {(
                  [
                    ["low", "Low"],
                    ["medium", "Medium"],
                    ["high", "High"],
                  ] as const
                ).map(([p, label]) => (
                  <button
                    type="button"
                    key={p}
                    className="chip"
                    data-priority={p}
                    aria-pressed={s.priority === p}
                    onClick={() => set({ priority: p })}
                  >
                    <span className={`priority-dot ${p}`} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="row-box">
                <div>
                  <div className="row-title">Daily reminder</div>
                  <div className="row-sub">A gentle nudge at a set time</div>
                </div>
                <button
                  type="button"
                  className="switch"
                  id="reminderSwitch"
                  role="switch"
                  aria-checked={s.reminder.enabled}
                  aria-label="Enable reminder"
                  onClick={() => set({ reminder: { ...s.reminder, enabled: !s.reminder.enabled } })}
                />
              </div>
              <div className={cx("conditional", s.reminder.enabled && "open")} id="reminderWrap">
                <input
                  type="time"
                  id="reminderTime"
                  value={s.reminder.time}
                  onChange={(e) => set({ reminder: { ...s.reminder, time: e.target.value } })}
                />
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="tagInput">
                Tags <span className="field-hint">enter or comma to add</span>
              </label>
              <div className="tag-input-wrap" id="tagWrap">
                {s.tags.map((t, i) => (
                  <span className="tag" key={t}>
                    {t}
                    <button
                      type="button"
                      data-remove-tag={i}
                      aria-label={`Remove ${t}`}
                      onClick={() => set({ tags: s.tags.filter((_, j) => j !== i) })}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  id="tagInput"
                  placeholder="health, morning…"
                  autoComplete="off"
                  value={tagText}
                  onChange={(e) => setTagText(e.target.value)}
                  onKeyDown={onTagKey}
                />
              </div>
            </div>
          </section>
        </div>

        {/* FOOTER: buttons change label/behaviour per step */}
        <div className="modal-foot">
          <button
            type="button"
            className="btn btn-secondary"
            id="btnBack"
            onClick={() => (s.step === 0 ? cancel() : goStep(s.step - 1))}
          >
            {s.step === 0 ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            className={cx("btn btn-primary", s.submitting && "loading")}
            id="btnNext"
            disabled={s.submitting}
            onClick={() => (s.step === 2 ? void submit() : goStep(s.step + 1))}
          >
            {s.submitting
              ? prefill
                ? "Saving…"
                : "Creating…"
              : s.step === 2
                ? prefill
                  ? "Save changes"
                  : "Create habit"
                : "Continue"}
          </button>
        </div>

        {/* SUCCESS state shown briefly after submit resolves */}
        <div className={cx("success", success && "show")} id="success">
          <div className="success-badge" id="successIcon">
            {success?.icon.type === "image" ? (
              <img
                src={success.icon.value}
                alt=""
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              (success?.icon.value ?? "⭐")
            )}
          </div>
          <h3 id="successTitle">
            {success
              ? `“${success.name}” ${prefill ? "updated" : "created"}`
              : prefill
                ? "Habit updated"
                : "Habit created"}
          </h3>
          <p id="successSub">
            {prefill
              ? "Your changes are saved — its history stays exactly as it was."
              : "It’s on your board — first check-in starts today."}
          </p>
        </div>
      </div>
    </div>
  );
}
