import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { X } from "lucide-react";

import { EMOTIONS, type EmotionKey, type MoodEntry, type Weather } from "@/lib/mood/types";
import { moodLabel } from "@/lib/mood/analytics";
import { accentVar, type Accent } from "./primitives";
import { cn } from "@/lib/utils";

const WEATHERS: { key: Weather; label: string }[] = [
  { key: "clear", label: "Clear" },
  { key: "cloudy", label: "Cloudy" },
  { key: "rain", label: "Rain" },
  { key: "storm", label: "Storm" },
  { key: "snow", label: "Snow" },
  { key: "fog", label: "Fog" },
];

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

function toDraft(entry: MoodEntry | null): Draft {
  if (!entry) {
    return {
      timestamp: dayjs().format("YYYY-MM-DDTHH:mm"),
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
  }
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

function Slider({
  label,
  value,
  onChange,
  accent,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: Accent;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="eyebrow">{label}</p>
        <p className="numeric text-[18px]" style={{ color: accentVar[accent] }}>
          {value}
          <span className="mono ml-1 text-[10px] text-faint">/10</span>
        </p>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mood-slider w-full"
        style={{
          background: `linear-gradient(90deg, ${accentVar[accent]} ${((value - 1) / 9) * 100}%, var(--surface-3) ${((value - 1) / 9) * 100}%)`,
        }}
      />
      {hint ? <p className="mono mt-1.5 text-[10px] text-faint">{hint}</p> : null}
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
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <span className="flex items-center gap-2 rounded-[10px] border border-border bg-surface-2 px-3 py-2 transition-colors focus-within:border-border-strong">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="numeric w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-faint"
        />
        <span className="mono text-[10px] text-faint">{unit}</span>
      </span>
    </label>
  );
}

export function Composer({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: MoodEntry | null;
  onClose: () => void;
  onSave: (entry: MoodEntry) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));

  useEffect(() => {
    if (open) setDraft(toDraft(initial));
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleEmotion = (k: EmotionKey) =>
    setDraft((d) => ({
      ...d,
      emotions: d.emotions.includes(k) ? d.emotions.filter((e) => e !== k) : [...d.emotions, k],
    }));

  const valid = useMemo(() => draft.timestamp.length > 0, [draft.timestamp]);

  if (!open) return null;

  const submit = () => {
    if (!valid) return;
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
    onSave(entry);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={initial ? "Edit entry" : "Log an entry"}
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="panel animate-rise relative max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-t-[20px] p-6 sm:rounded-[20px] sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">{initial ? "Edit entry" : "New entry"}</p>
            <h2 className="display text-[24px] leading-tight">
              {initial ? "Refine this record" : "How are you, really?"}
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Only mood, energy and stress are required — every context field you add sharpens the
              analysis.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close composer"
            className="rounded-full border border-border p-2 text-faint transition-colors hover:border-border-strong hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="mb-6 block">
          <span className="eyebrow mb-1.5 block">When</span>
          <input
            type="datetime-local"
            value={draft.timestamp}
            max={dayjs().format("YYYY-MM-DDTHH:mm")}
            onChange={(e) => set("timestamp", e.target.value)}
            className="mono rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[12px] text-foreground outline-none focus:border-border-strong"
          />
        </label>

        <div className="grid gap-6 sm:grid-cols-3">
          <Slider
            label="Mood"
            value={draft.mood}
            onChange={(v) => set("mood", v)}
            accent="violet"
            hint={moodLabel(draft.mood)}
          />
          <Slider label="Energy" value={draft.energy} onChange={(v) => set("energy", v)} accent="sage" />
          <Slider label="Stress" value={draft.stress} onChange={(v) => set("stress", v)} accent="rose" />
        </div>

        <div className="mt-7">
          <p className="eyebrow mb-3">Emotions present</p>
          <div className="flex flex-wrap gap-1.5">
            {EMOTIONS.map((e) => {
              const on = draft.emotions.includes(e.key);
              return (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => toggleEmotion(e.key)}
                  aria-pressed={on}
                  className={cn(
                    "mono rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] transition-all duration-300",
                    on
                      ? "border-border-strong text-foreground"
                      : "border-border text-faint hover:text-muted-foreground",
                  )}
                  style={
                    on
                      ? {
                          background: `color-mix(in oklab, ${accentVar[e.accent]} 16%, transparent)`,
                          borderColor: `color-mix(in oklab, ${accentVar[e.accent]} 55%, transparent)`,
                          color: accentVar[e.accent],
                        }
                      : undefined
                  }
                >
                  {e.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow mb-1.5 block">Tags</span>
            <input
              type="text"
              value={draft.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="work, family, gym — comma separated"
              className="w-full rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-faint focus:border-border-strong"
            />
          </label>
          <label className="block">
            <span className="eyebrow mb-1.5 block">Weather</span>
            <select
              value={draft.weather}
              onChange={(e) => set("weather", e.target.value as Weather | "")}
              className="mono w-full rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[12px] text-foreground outline-none focus:border-border-strong"
            >
              <option value="">—</option>
              {WEATHERS.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="eyebrow mb-1.5 block">Note</span>
          <textarea
            value={draft.note}
            onChange={(e) => set("note", e.target.value)}
            rows={3}
            placeholder="What shaped this moment?"
            className="w-full resize-none rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-border-strong"
          />
        </label>

        <div className="mt-7">
          <p className="eyebrow mb-3">Context signals · optional</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumField label="Sleep" unit="hrs" value={draft.sleep} onChange={(v) => set("sleep", v)} />
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
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="mono rounded-full border border-border px-5 py-2.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            className="rounded-full px-6 py-2.5 text-[13px] font-medium text-background transition-transform duration-300 hover:scale-[1.03] disabled:opacity-40"
            style={{ background: "var(--grad-violet)", boxShadow: "var(--glow-violet)" }}
          >
            {initial ? "Save changes" : "Record entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
