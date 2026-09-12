/**
 * Composer — capturing a mood moment.
 *
 * This used to be a fourteen-field form: three sliders, a tag box, a weather
 * dropdown, a textarea and nine bordered number inputs, all visible at once.
 * It was accurate and it was exhausting, and it made the most human act in
 * Bloom feel like data entry.
 *
 * Now the sheet asks one question and lets you answer it in a few seconds:
 *
 *   How are you feeling?   →  six faces (the same quick check-ins the Mood
 *                             page uses, so a save here and a tap there
 *                             produce exactly the same kind of record)
 *   What's behind it?      →  a quiet line that unfolds the emotion words
 *                             only when they're wanted (the face already
 *                             carries one, and the line counts what's on)
 *   Optional note          →  one soft field, journal-like
 *   Save moment
 *
 * Nothing was removed from the record. Energy, stress, the nine context
 * signals, tags, weather and "when" all moved behind one quiet "More detail"
 * line — and the "don't ask twice" tracker prefill still fills them from the
 * day's sleep / movement / study / screen record, so opening the section shows
 * work already done rather than nine empty boxes.
 *
 * Built on BloomSheet as a centred pop, so the moment floats over the page
 * instead of owning the screen — with focus trap / escape / scroll lock from
 * Radix rather than from a hand-rolled overlay.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { EMOTIONS, type EmotionKey, type MoodEntry, type Weather } from "@/lib/mood/types";
import { moodLabel } from "@/lib/mood/analytics";
import {
  CONTEXT_LABEL,
  CONTEXT_KEYS,
  applyPrefill,
  contextFromTrackerDay,
  prefilledKeys,
  type ContextKey,
  type MoodContext,
} from "@/lib/mood/context";
import { loadDays as loadTrackerDays } from "@/lib/trackers/store";
import { PAGE_MOODS, PAGE_MOOD_PRESETS, faceForEntry, type PageMood } from "@/lib/mood/page";
import { accentVar, type Accent } from "./primitives";
import { MoodBlob, MOOD_LABELS } from "./page/MoodBlob";
import { BloomSheet } from "@/components/ui/bloom-sheet";

import "@/styles/mood-composer.css";

const WEATHERS: { key: Weather; label: string }[] = [
  { key: "clear", label: "Clear" },
  { key: "cloudy", label: "Cloudy" },
  { key: "rain", label: "Rain" },
  { key: "storm", label: "Storm" },
  { key: "snow", label: "Snow" },
  { key: "fog", label: "Fog" },
];

const FACE_COLOR: Record<PageMood, string> = {
  happy: "var(--mp-happy)",
  calm: "var(--mp-calm)",
  neutral: "var(--mp-neutral)",
  sad: "var(--mp-sad)",
  anxious: "var(--mp-anxious)",
  angry: "var(--mp-angry)",
};

/** The emotion each face stands for — a face tap and a face pick agree. */
const FACE_EMOTIONS: Record<PageMood, EmotionKey[]> = {
  happy: ["happy", "excited", "grateful", "confident", "motivated"],
  calm: ["calm", "focused"],
  neutral: ["neutral", "tired"],
  sad: ["sad", "lonely"],
  anxious: ["anxious", "overwhelmed"],
  angry: ["angry", "frustrated"],
};

interface Draft {
  timestamp: string;
  mood: number;
  energy: number;
  stress: number;
  emotions: EmotionKey[];
  tags: string;
  note: string;
  sleep: string;
  sleepQuality: string;
  exercise: string;
  steps: string;
  productivity: string;
  study: string;
  screenTime: string;
  social: string;
  workload: string;
  weather: Weather | "";
}

const BLANK: Draft = {
  timestamp: "",
  mood: 6,
  energy: 6,
  stress: 4,
  emotions: [],
  tags: "",
  note: "",
  sleep: "",
  sleepQuality: "",
  exercise: "",
  steps: "",
  productivity: "",
  study: "",
  screenTime: "",
  social: "",
  workload: "",
  weather: "",
};

function toDraft(entry: MoodEntry | null): Draft {
  if (!entry) return { ...BLANK, timestamp: dayjs().format("YYYY-MM-DDTHH:mm") };
  const num = (v: number | undefined) => (typeof v === "number" ? String(v) : "");
  return {
    timestamp: dayjs(entry.timestamp).format("YYYY-MM-DDTHH:mm"),
    mood: entry.mood,
    energy: entry.energy,
    stress: entry.stress,
    emotions: entry.emotions,
    tags: entry.tags.join(", "),
    note: entry.note ?? "",
    sleep: num(entry.sleep),
    sleepQuality: num(entry.sleepQuality),
    exercise: num(entry.exercise),
    steps: num(entry.steps),
    productivity: num(entry.productivity),
    study: num(entry.study),
    screenTime: num(entry.screenTime),
    social: num(entry.social),
    workload: num(entry.workload),
    weather: entry.weather ?? "",
  };
}

function describePrefill(keys: ContextKey[]): string {
  const names = CONTEXT_KEYS.filter((k) => keys.includes(k)).map((k) => CONTEXT_LABEL[k]);
  const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  if (names.length === 1) return `${capital(names[0]!)} from your trackers`;
  return `${capital(names.slice(0, -1).join(", "))} and ${names[names.length - 1]} from your trackers`;
}

/** What the trackers already know about a local day — nothing when they don't. */
function trackerContext(localDate: string): MoodContext {
  if (typeof window === "undefined") return {};
  const day = loadTrackerDays().find((d) => d.date === localDate) ?? null;
  return contextFromTrackerDay(day);
}

export function Composer({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  initial: MoodEntry | null;
  onClose: () => void;
  /** May be async; a rejection keeps the sheet open and says why. */
  onSave: (entry: MoodEntry) => void | Promise<void>;
  /** When present, editing offers a calm inline delete. */
  onDelete?: ((entry: MoodEntry) => void | Promise<void>) | undefined;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  /** The tracker prefill currently shown, so a date change can swap it cleanly. */
  const [prefill, setPrefill] = useState<MoodContext>({});
  const [face, setFace] = useState<PageMood | null>(() => (initial ? faceForEntry(initial) : null));
  const [wordsOpen, setWordsOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  const editing = initial !== null;

  /* Reset on open — and read today's trackers so nothing has to be typed twice. */
  useEffect(() => {
    if (!open) return;
    const base = toDraft(initial);
    const fill = trackerContext(base.timestamp.slice(0, 10));
    setPrefill(fill);
    setDraft({ ...base, ...applyPrefill(base, {}, fill) });
    setFace(initial ? faceForEntry(initial) : null);
    /* Every open starts calm: the words stay folded (with their count shown). */
    setWordsOpen(false);
    /* Editing an old record usually means the measurements matter — show them. */
    setDetailOpen(Boolean(initial));
    setSaving(false);
    setSaved(false);
    setConfirming(false);
    setError(null);
  }, [open, initial]);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  /* Moving "when" to another day moves the prefill with it — typed values stay. */
  const draftDay = draft.timestamp.slice(0, 10);
  useEffect(() => {
    if (!open) return;
    const fill = trackerContext(draftDay);
    setPrefill((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(fill)) return prev;
      setDraft((d) => ({ ...d, ...applyPrefill(d, prev, fill) }));
      return fill;
    });
  }, [open, draftDay]);

  const fromTrackers = useMemo(
    () => prefilledKeys(prefill).filter((k) => draft[k] !== "" && draft[k] === String(prefill[k])),
    [prefill, draft],
  );

  const detailCount = useMemo(
    () => CONTEXT_KEYS.filter((k) => draft[k] !== "").length + (draft.weather ? 1 : 0),
    [draft],
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleEmotion = (k: EmotionKey) =>
    setDraft((d) => ({
      ...d,
      emotions: d.emotions.includes(k) ? d.emotions.filter((e) => e !== k) : [...d.emotions, k],
    }));

  /**
   * Picking a face is the answer to the question the sheet asks. It sets the
   * three readings from the same presets the Mood page's quick check-in uses,
   * and carries the face's emotion — without discarding any other emotion
   * already on the entry.
   */
  const chooseFace = (next: PageMood) => {
    setFace(next);
    setError(null);
    const p = PAGE_MOOD_PRESETS[next];
    setDraft((d) => {
      const others = d.emotions.filter((e) => !FACE_EMOTIONS[next].includes(e));
      const carried = others.filter((e) => !PAGE_MOODS.some((f) => FACE_EMOTIONS[f].includes(e)));
      return {
        ...d,
        mood: p.mood,
        energy: p.energy,
        stress: p.stress,
        emotions: [...carried, p.emotion],
      };
    });
  };

  const valid = draft.timestamp.length > 0 && face !== null;

  const submit = async () => {
    if (!valid || saving || saved) return;
    setSaving(true);
    setError(null);
    const num = (v: string) => {
      const n = Number(v);
      return v.trim() !== "" && Number.isFinite(n) ? n : undefined;
    };
    const entry: MoodEntry = {
      id: initial?.id ?? `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: dayjs(draft.timestamp).toISOString(),
      mood: draft.mood,
      energy: draft.energy,
      stress: draft.stress,
      emotions: draft.emotions,
      tags: draft.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      note: draft.note.trim() || undefined,
      sleep: num(draft.sleep),
      sleepQuality: num(draft.sleepQuality),
      exercise: num(draft.exercise),
      steps: num(draft.steps),
      productivity: num(draft.productivity),
      study: num(draft.study),
      screenTime: num(draft.screenTime),
      social: num(draft.social),
      workload: num(draft.workload),
      weather: draft.weather || undefined,
    };
    try {
      await onSave(entry);
      setSaving(false);
      setSaved(true);
      toast(editing ? "Moment updated." : "Moment saved.");
      /* A beat on the confirmation, then the sheet is out of the way. */
      closeTimer.current = window.setTimeout(onClose, 620);
    } catch {
      setSaving(false);
      setError("That didn't save just now. Your moment is still here — try again in a second.");
    }
  };

  const confirmDelete = async () => {
    if (!initial || !onDelete || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onDelete(initial);
      setSaving(false);
      toast("Moment deleted.");
      onClose();
    } catch {
      setSaving(false);
      setConfirming(false);
      setError("That couldn't be deleted just now. Try again in a second.");
    }
  };

  const accent: Accent = face
    ? (EMOTIONS.find((e) => e.key === PAGE_MOOD_PRESETS[face].emotion)?.accent ?? "violet")
    : "violet";
  const accentCss = accentVar[accent];

  const title = editing ? "Refine this moment" : "How are you feeling?";

  return (
    <BloomSheet
      open={open}
      onClose={onClose}
      title={editing ? "Refine this mood moment" : "Log a mood moment"}
      description="Choose the face that's closest, add anything you'd like to remember, and save."
      panelClassName="p-0"
      placement="pop"
    >
      <div className="bmood" style={{ ["--bmood-accent" as string]: accentCss }}>
        <header className="bmood-head">
          <p className="bmood-eyebrow">{editing ? "Mood · edit" : "Mood"}</p>
          <h2 className="bmood-title">
            {title.split(" ").slice(0, -1).join(" ")} <em>{title.split(" ").slice(-1)}</em>
          </h2>
          <p className="bmood-sub">
            {face
              ? `Feeling ${MOOD_LABELS[face].toLowerCase()} — ${moodLabel(draft.mood).toLowerCase()}.`
              : "Tap the face that fits."}
          </p>
        </header>

        {/* the question, answered with a face */}
        <div
          className="bmood-faces"
          data-has={face !== null}
          role="group"
          aria-label="How are you feeling?"
        >
          {PAGE_MOODS.map((m) => {
            const on = face === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => chooseFace(m)}
                aria-pressed={on}
                aria-label={`I feel ${MOOD_LABELS[m].toLowerCase()}`}
                className="bmood-face"
                style={{ ["--bmood-face-color" as string]: FACE_COLOR[m] }}
                data-testid={`mood-composer-face-${m}`}
              >
                <span className="bmood-face-halo" aria-hidden />
                <span className="bmood-face-disc">
                  <MoodBlob mood={m} size={58} active={on} />
                </span>
                <span className="bmood-face-label">{MOOD_LABELS[m]}</span>
                {on ? (
                  <span className="bmood-face-tick" aria-hidden>
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="bsheet-scroll">
          {/* what's behind it — folded until it's wanted; the face already carries one */}
          <div className="bmood-band">
            <button
              type="button"
              className="bmood-more"
              aria-expanded={wordsOpen}
              onClick={() => setWordsOpen((v) => !v)}
              data-testid="mood-composer-words"
            >
              <ChevronDown className="bmood-more-chevron size-4" />
              What's behind it?
              {draft.emotions.length > 0 ? (
                <span className="bmood-more-count">
                  {draft.emotions.length} {draft.emotions.length === 1 ? "word" : "words"}
                </span>
              ) : null}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {wordsOpen ? (
              <motion.div
                key="words"
                className="bmood-words-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="bmood-emotions">
                  {EMOTIONS.map((e) => {
                    const on = draft.emotions.includes(e.key);
                    return (
                      <button
                        key={e.key}
                        type="button"
                        onClick={() => toggleEmotion(e.key)}
                        aria-pressed={on}
                        className="bmood-chip"
                        style={{ ["--chip-accent" as string]: accentVar[e.accent] }}
                      >
                        {e.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* the note — a line to remember, not an admin textarea */}
          <div className="bmood-band">
            <label className="bmood-band-label" htmlFor="bmood-note">
              Optional note
            </label>
            <textarea
              id="bmood-note"
              className="bmood-note"
              value={draft.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="What shaped this moment…"
              rows={2}
            />
          </div>

          {/* everything measurable, out of the way until it's wanted */}
          <div className="bmood-band">
            <button
              type="button"
              className="bmood-more"
              aria-expanded={detailOpen}
              onClick={() => setDetailOpen((v) => !v)}
            >
              <ChevronDown className="bmood-more-chevron size-4" />
              More detail
              {detailCount > 0 ? (
                <span className="bmood-more-count">{detailCount} filled</span>
              ) : null}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {detailOpen ? (
              <motion.div
                key="detail"
                className="bmood-detail"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <div>
                  <p className="bmood-band-label">Readings</p>
                  <div className="bmood-detail-grid" style={{ marginTop: 12 }}>
                    <ReadingSlider
                      label="Energy"
                      value={draft.energy}
                      onChange={(v) => set("energy", v)}
                      accent="sage"
                    />
                    <ReadingSlider
                      label="Stress"
                      value={draft.stress}
                      onChange={(v) => set("stress", v)}
                      accent="rose"
                    />
                  </div>
                </div>

                <div>
                  <p className="bmood-band-label">Context · optional</p>
                  {fromTrackers.length > 0 ? (
                    <p
                      className="mt-2 text-[12px] text-muted-foreground"
                      data-testid="mood-context-prefill"
                    >
                      {describePrefill(fromTrackers)}.
                    </p>
                  ) : null}
                  <div className="bmood-detail-grid" style={{ marginTop: 12 }}>
                    <NumField
                      label="Sleep"
                      unit="hrs"
                      value={draft.sleep}
                      onChange={(v) => set("sleep", v)}
                    />
                    <NumField
                      label="Sleep quality"
                      unit="/10"
                      min={1}
                      max={10}
                      step={1}
                      value={draft.sleepQuality}
                      onChange={(v) => set("sleepQuality", v)}
                    />
                    <NumField
                      label="Exercise"
                      unit="min"
                      max={600}
                      step={5}
                      value={draft.exercise}
                      onChange={(v) => set("exercise", v)}
                    />
                    <NumField
                      label="Steps"
                      unit="steps"
                      max={60000}
                      step={500}
                      value={draft.steps}
                      onChange={(v) => set("steps", v)}
                    />
                    <NumField
                      label="Screen time"
                      unit="hrs"
                      value={draft.screenTime}
                      onChange={(v) => set("screenTime", v)}
                    />
                    <NumField
                      label="Productivity"
                      unit="/10"
                      min={1}
                      max={10}
                      step={1}
                      value={draft.productivity}
                      onChange={(v) => set("productivity", v)}
                    />
                    <NumField
                      label="Study / focus"
                      unit="min"
                      max={900}
                      step={5}
                      value={draft.study}
                      onChange={(v) => set("study", v)}
                    />
                    <NumField
                      label="Social"
                      unit="/10"
                      min={1}
                      max={10}
                      step={1}
                      value={draft.social}
                      onChange={(v) => set("social", v)}
                    />
                    <NumField
                      label="Workload"
                      unit="/10"
                      min={1}
                      max={10}
                      step={1}
                      value={draft.workload}
                      onChange={(v) => set("workload", v)}
                    />
                    <label className="bmood-field">
                      <span className="bmood-field-label">Weather</span>
                      <select
                        aria-label="Weather"
                        className="bmood-input bmood-input--mono"
                        value={draft.weather}
                        onChange={(e) => set("weather", e.target.value as Weather | "")}
                      >
                        <option value="">Not sure</option>
                        {WEATHERS.map((w) => (
                          <option key={w.key} value={w.key}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="bmood-detail-grid">
                  <label className="bmood-field">
                    <span className="bmood-field-label">When</span>
                    <input
                      type="datetime-local"
                      aria-label="When"
                      className="bmood-input bmood-input--mono"
                      value={draft.timestamp}
                      max={dayjs().format("YYYY-MM-DDTHH:mm")}
                      onChange={(e) => set("timestamp", e.target.value)}
                    />
                  </label>
                  <label className="bmood-field">
                    <span className="bmood-field-label">Tags</span>
                    <input
                      type="text"
                      aria-label="Tags"
                      className="bmood-input"
                      value={draft.tags}
                      onChange={(e) => set("tags", e.target.value)}
                      placeholder="work, family, gym"
                    />
                  </label>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div style={{ height: 8 }} />
        </div>

        {error ? (
          <p className="bmood-error" role="alert">
            <X className="size-3.5 shrink-0" />
            {error}
          </p>
        ) : null}

        <footer className="bmood-foot">
          {editing && onDelete && !confirming ? (
            <button
              type="button"
              className="bmood-danger"
              onClick={() => setConfirming(true)}
              data-testid="mood-composer-delete"
            >
              Delete
            </button>
          ) : null}

          {confirming ? (
            <div className="bmood-confirm" role="group" aria-label="Confirm delete">
              <span className="bmood-confirm-q">Delete this moment?</span>
              <button
                type="button"
                className="bmood-confirm-btn bmood-confirm-keep"
                onClick={() => setConfirming(false)}
              >
                Keep
              </button>
              <button
                type="button"
                className="bmood-confirm-btn bmood-confirm-go"
                onClick={() => void confirmDelete()}
                disabled={saving}
              >
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`bmood-save${saved ? " bmood-saved" : ""}`}
              onClick={() => void submit()}
              disabled={!valid || saving || saved}
              data-testid="mood-composer-save"
            >
              {saved ? (
                <>
                  <Check className="size-4" strokeWidth={2.5} /> Saved
                </>
              ) : saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving
                </>
              ) : (
                <>{editing ? "Save changes" : "Save moment"}</>
              )}
            </button>
          )}
        </footer>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="bmood-close bsheet-icon"
        >
          <X className="size-4" />
        </button>
      </div>
    </BloomSheet>
  );
}

/* --------------------------------- pieces --------------------------------- */

function ReadingSlider({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: Accent;
}) {
  return (
    <div className="bmood-field">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span className="bmood-field-label">{label}</span>
        <span className="bmood-value" style={{ color: accentVar[accent] }}>
          {value}
          <span className="bmood-unit">/10</span>
        </span>
      </div>
      <input
        type="range"
        className="bmood-slider"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        style={{
          background: `linear-gradient(90deg, ${accentVar[accent]} ${((value - 1) / 9) * 100}%, color-mix(in oklab, var(--foreground) 14%, transparent) ${((value - 1) / 9) * 100}%)`,
        }}
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  unit,
  min = 0,
  max = 24,
  step = 0.5,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="bmood-field">
      <span className="bmood-field-label">{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="number"
          inputMode="decimal"
          aria-label={label}
          className="bmood-input"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
        />
        <span className="bmood-unit">{unit}</span>
      </span>
    </label>
  );
}