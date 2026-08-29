/**
 * Quick Log + Advanced Log. Same persistence path, two depths of intent.
 * Quick is one screen of the useful few; Advanced groups everything by
 * purpose with fertility observations behind progressive disclosure. Drafts
 * survive failures; saves are guarded against double-submission.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, SlidersHorizontal } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { localDateKey } from "@/lib/cycle/engine";
import type { CycleEntry, CycleModel, FlowValue, MoodValue } from "@/lib/cycle/types";

const FLOWS: { v: FlowValue; label: string }[] = [
  { v: "none", label: "None" },
  { v: "spotting", label: "Spotting" },
  { v: "light", label: "Light" },
  { v: "medium", label: "Medium" },
  { v: "heavy", label: "Heavy" },
];
const MOODS: MoodValue[] = ["Low", "Flat", "Okay", "Good", "Energized"];
const SYMPTOMS = [
  "Cramps",
  "Headache",
  "Fatigue",
  "Bloating",
  "Cravings",
  "Tender breasts",
  "Acne",
  "Insomnia",
  "Mood swings",
  "Back pain",
];
const MUCUS = [
  { v: "", label: "—" },
  { v: "dry", label: "Dry" },
  { v: "sticky", label: "Sticky" },
  { v: "creamy", label: "Creamy" },
  { v: "watery", label: "Watery" },
  { v: "egg-white", label: "Egg-white" },
] as const;
const LH = [
  { v: "", label: "—" },
  { v: "negative", label: "Negative" },
  { v: "positive", label: "Positive (surge)" },
] as const;

export interface DayDraft {
  date: string;
  flow: FlowValue | null;
  mood: MoodValue | null;
  energy: number | null;
  pain: number | null;
  symptoms: string[];
  notes: string;
  temperature: number | null;
  cervical_mucus: string | null;
  lh_test: string | null;
  sexual_activity: string | null;
  contraceptive: string | null;
  sleep_hours: number | null;
}

const emptyDraft = (date: string): DayDraft => ({
  date,
  flow: null,
  mood: null,
  energy: null,
  pain: null,
  symptoms: [],
  notes: "",
  temperature: null,
  cervical_mucus: null,
  lh_test: null,
  sexual_activity: null,
  contraceptive: null,
  sleep_hours: null,
});

function draftFrom(entry: CycleEntry | null, date: string): DayDraft {
  if (!entry) return emptyDraft(date);
  return {
    date,
    flow: entry.flow,
    mood: entry.mood,
    energy: entry.energy,
    pain: entry.pain_level,
    symptoms: entry.symptoms,
    notes: entry.notes ?? "",
    temperature: entry.temperature,
    cervical_mucus: entry.cervical_mucus,
    lh_test: entry.lh_test,
    sexual_activity: entry.sexual_activity,
    contraceptive: entry.contraceptive,
    sleep_hours: entry.sleep_hours,
  };
}

/* ----------------------------- shared controls ----------------------------- */

function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
  allowClear = true,
}: {
  value: T | null;
  options: { v: T; label: string }[];
  onChange: (v: T | null) => void;
  label: string;
  allowClear?: boolean;
}) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const on = value === o.v;
          return (
            <button
              key={String(o.v)}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(on && allowClear ? null : o.v)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12.5px] transition-all duration-[var(--motion-fast)]",
                on
                  ? "border-[color:var(--profile-accent-border,var(--border-strong))] bg-[color-mix(in_oklab,var(--violet)_12%,transparent)] text-foreground"
                  : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stepper({
  value,
  onChange,
  label,
  min,
  max,
  suffix,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  min: number;
  max: number;
  suffix?: string;
}) {
  const opts = [];
  for (let i = min; i <= max; i++) opts.push({ v: i, label: `${i}${suffix ?? ""}` });
  return <Seg value={value} options={opts} onChange={onChange} label={label} />;
}

function NumberField({
  value,
  onChange,
  label,
  unit,
  min,
  max,
  step,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  placeholder: string;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => setText(value === null ? "" : String(value)), [value]);
  const [err, setErr] = useState<string | null>(null);
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow">
        {label} · {unit}
      </span>
      <input
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value === "") {
            setErr(null);
            onChange(null);
            return;
          }
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= min && n <= max) {
            setErr(null);
            onChange(n);
          } else {
            setErr(`Between ${min} and ${max}`);
          }
        }}
        className={cn(
          "w-full rounded-lg border bg-surface/60 px-3 py-2 text-[14px] outline-none transition-colors focus:bg-surface-2/60",
          err ? "border-rose/60" : "border-border focus:border-border-strong",
        )}
      />
      {err ? <span className="text-[11px] text-rose">{err}</span> : null}
    </label>
  );
}

function SaveRow({
  saving,
  error,
  onSave,
  saveLabel = "Save",
  extra,
}: {
  saving: boolean;
  error: string | null;
  onSave: () => void;
  saveLabel?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-rose/40 bg-rose/5 px-3 py-2">
          <p className="text-[12.5px] text-rose">{error}</p>
          <button
            type="button"
            onClick={onSave}
            className="mono rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Try again
          </button>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        {extra}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium text-[var(--primary-foreground)] transition-transform duration-[var(--motion-med)] enabled:hover:scale-[1.02] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--violet), var(--sky))" }}
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- quick log -------------------------------- */

export function QuickLog({
  open,
  onClose,
  model,
  editing,
  defaultDate,
  onSave,
  onAdvanced,
}: {
  open: boolean;
  onClose: () => void;
  model: CycleModel | null;
  editing: CycleEntry | null;
  /** pre-selected calendar day (opens straight into "log this day") */
  defaultDate?: string | null;
  onSave: (draft: DayDraft) => Promise<void>;
  onAdvanced: () => void;
}) {
  const [draft, setDraft] = useState<DayDraft>(emptyDraft(localDateKey()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSave = useRef(0);

  useEffect(() => {
    if (open) {
      setDraft(draftFrom(editing, editing?.date ?? defaultDate ?? model?.today ?? localDateKey()));
      setError(null);
    }
  }, [open, editing, defaultDate, model]);

  const cycleDay = useMemo(() => {
    if (!model?.lastPeriodStart) return null;
    const d = new Date(`${draft.date}T00:00:00`);
    const s = new Date(`${model.lastPeriodStart}T00:00:00`);
    const diff = Math.floor((d.getTime() - s.getTime()) / 86_400_000) + 1;
    return diff > 0 ? diff : null;
  }, [draft.date, model]);

  const save = async () => {
    if (saving) return;
    if (Date.now() - lastSave.current < 400) return; // duplicate-submission guard
    lastSave.current = Date.now();
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that just now.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-1/2 left-1/2 max-h-[min(92dvh,720px)] w-[calc(100%-1.25rem)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border-border bg-background">
        <div className="flex items-center justify-between">
          <DialogTitle className="display text-[18px]">
            {editing ? "Edit day" : "Quick log"}
          </DialogTitle>
          {editing ? null : (
            <button
              type="button"
              onClick={onAdvanced}
              className="mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.07em] text-faint transition-colors hover:text-foreground"
            >
              <SlidersHorizontal className="size-3" aria-hidden /> More fields
            </button>
          )}
        </div>
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <span className="eyebrow">Day</span>
              <input
                type="date"
                value={draft.date}
                max={model?.today ?? localDateKey()}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                className="mono rounded-lg border border-border bg-surface/60 px-2.5 py-1.5 text-[12.5px] outline-none [color-scheme:dark] focus:border-border-strong"
              />
            </label>
            <p className="mono text-[11px] text-faint">
              {cycleDay ? `cycle day ${cycleDay}` : "no cycle running"}
            </p>
          </div>

          <Seg
            label="Flow"
            value={draft.flow}
            options={FLOWS.map((f) => ({ v: f.v, label: f.label }))}
            onChange={(v) => setDraft((d) => ({ ...d, flow: v as FlowValue | null }))}
          />
          <Seg
            label="Mood"
            value={draft.mood}
            options={MOODS.map((m) => ({ v: m, label: m }))}
            onChange={(v) => setDraft((d) => ({ ...d, mood: v as MoodValue | null }))}
          />
          <Stepper
            label="Energy"
            value={draft.energy}
            min={1}
            max={5}
            onChange={(v) => setDraft((d) => ({ ...d, energy: v }))}
          />
          <Stepper
            label="Pain"
            value={draft.pain}
            min={0}
            max={5}
            onChange={(v) => setDraft((d) => ({ ...d, pain: v }))}
          />
          <Stepper
            label="Slept (h)"
            value={draft.sleep_hours}
            min={0}
            max={16}
            onChange={(v) => setDraft((d) => ({ ...d, sleep_hours: v }))}
          />

          <div>
            <p className="eyebrow mb-1.5">Symptoms</p>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOMS.map((s) => {
                const on = draft.symptoms.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        symptoms: on ? d.symptoms.filter((x) => x !== s) : [...d.symptoms, s],
                      }))
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[12px] transition-all duration-[var(--motion-fast)]",
                      on
                        ? "border-[var(--cycle-menstrual)] bg-[color-mix(in_oklab,var(--cycle-menstrual)_12%,transparent)] text-foreground"
                        : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="eyebrow">A line, if you want</span>
            <textarea
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Optional — one honest sentence is plenty."
              className="w-full resize-none rounded-lg border border-border bg-surface/60 px-3 py-2 text-[13.5px] leading-relaxed outline-none transition-colors placeholder:text-faint/60 focus:border-border-strong focus:bg-surface-2/60"
            />
          </label>

          <SaveRow saving={saving} error={error} onSave={() => void save()} extra={null} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- advanced log ------------------------------- */

export function AdvancedCycleLog({
  open,
  onClose,
  model,
  editing,
  defaultDate,
  onSave,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  model: CycleModel | null;
  editing: CycleEntry | null;
  defaultDate?: string | null;
  onSave: (draft: DayDraft) => Promise<void>;
  onExport?: () => void;
}) {
  const [draft, setDraft] = useState<DayDraft>(emptyDraft(localDateKey()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFertility, setShowFertility] = useState(false);
  const lastSave = useRef(0);

  useEffect(() => {
    if (!open) return;
    setDraft(draftFrom(editing, editing?.date ?? model?.today ?? localDateKey()));
    setError(null);
    setShowFertility(
      Boolean(
        editing && (editing.temperature !== null || editing.lh_test || editing.cervical_mucus),
      ),
    );
  }, [open, editing, model]);

  const save = async () => {
    if (saving) return;
    if (Date.now() - lastSave.current < 400) return;
    lastSave.current = Date.now();
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that just now.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 border-border bg-background p-0 sm:max-w-[560px]"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-start justify-between border-b border-border px-5 py-4">
            <div>
              <SheetTitle className="display text-[17px]">Advanced log</SheetTitle>
              <SheetDescription className="mt-0.5 text-[12px] text-muted-foreground">
                Only what's true today. Every field is optional.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close advanced log"
              className="mono rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Close
            </button>
          </div>

          <div className="flex flex-col gap-6 px-5 py-5">
            {/* date + cycle */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="flex flex-col gap-1">
                <span className="eyebrow">Date</span>
                <input
                  type="date"
                  value={draft.date}
                  max={model?.today ?? localDateKey()}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                  className="mono rounded-lg border border-border bg-surface/60 px-2.5 py-1.5 text-[13px] outline-none [color-scheme:dark] focus:border-border-strong"
                />
              </label>
              <p className="text-[12px] text-faint">
                {model?.lastPeriodStart
                  ? "cycle day is calculated for you"
                  : "log a period start to anchor cycle days"}
              </p>
            </div>

            {/* physical */}
            <div className="flex flex-col gap-4">
              <p className="eyebrow">Physical</p>
              <Seg
                label="Flow"
                value={draft.flow}
                options={FLOWS.map((f) => ({ v: f.v, label: f.label }))}
                onChange={(v) => setDraft((d) => ({ ...d, flow: v as FlowValue | null }))}
              />
              <Stepper
                label="Pain"
                value={draft.pain}
                min={0}
                max={5}
                onChange={(v) => setDraft((d) => ({ ...d, pain: v }))}
              />
              <div>
                <p className="eyebrow mb-1.5">Symptoms</p>
                <div className="flex flex-wrap gap-1.5">
                  {SYMPTOMS.map((s) => {
                    const on = draft.symptoms.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            symptoms: on ? d.symptoms.filter((x) => x !== s) : [...d.symptoms, s],
                          }))
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[12px] transition-all duration-[var(--motion-fast)]",
                          on
                            ? "border-[var(--cycle-menstrual)] bg-[color-mix(in_oklab,var(--cycle-menstrual)_12%,transparent)] text-foreground"
                            : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* mood / energy / sleep */}
            <div className="flex flex-col gap-4">
              <p className="eyebrow">Mood · energy · sleep</p>
              <Seg
                label="Mood"
                value={draft.mood}
                options={MOODS.map((m) => ({ v: m, label: m }))}
                onChange={(v) => setDraft((d) => ({ ...d, mood: v as MoodValue | null }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <Stepper
                  label="Energy"
                  value={draft.energy}
                  min={1}
                  max={5}
                  onChange={(v) => setDraft((d) => ({ ...d, energy: v }))}
                />
                <NumberField
                  label="Slept"
                  unit="h"
                  min={0}
                  max={24}
                  step={0.5}
                  placeholder="7.5"
                  value={draft.sleep_hours}
                  onChange={(v) => setDraft((d) => ({ ...d, sleep_hours: v }))}
                />
              </div>
            </div>

            {/* fertility — progressive disclosure */}
            <div className="rounded-xl border border-border bg-surface/40">
              <button
                type="button"
                onClick={() => setShowFertility((s) => !s)}
                aria-expanded={showFertility}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span>
                  <span className="block text-[13px] font-medium">Fertility observations</span>
                  <span className="block text-[11.5px] text-muted-foreground">
                    Temperature, tests, mucus — only if you track them
                  </span>
                </span>
                <span className="mono text-[10px] uppercase tracking-[0.08em] text-faint">
                  {showFertility ? "hide" : "open"}
                </span>
              </button>
              {showFertility ? (
                <div className="flex flex-col gap-4 border-t border-border/60 px-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <NumberField
                      label="Basal temp"
                      unit="°C"
                      min={34}
                      max={40}
                      step={0.1}
                      placeholder="36.6"
                      value={draft.temperature}
                      onChange={(v) => setDraft((d) => ({ ...d, temperature: v }))}
                    />
                    <div>
                      <p className="eyebrow mb-1.5">Ovulation test</p>
                      <div className="flex gap-1.5" role="radiogroup" aria-label="Ovulation test">
                        {LH.map((o) => (
                          <button
                            key={o.v || "lh-empty"}
                            type="button"
                            role="radio"
                            aria-checked={(draft.lh_test ?? "") === o.v}
                            onClick={() =>
                              setDraft((d) => ({ ...d, lh_test: o.v === "" ? null : o.v }))
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                              (draft.lh_test ?? "") === o.v
                                ? "border-[var(--cycle-ovulation)] text-foreground"
                                : "border-border text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="eyebrow mb-1.5">Cervical mucus</p>
                    <div
                      className="flex flex-wrap gap-1.5"
                      role="radiogroup"
                      aria-label="Cervical mucus"
                    >
                      {MUCUS.map((o) => (
                        <button
                          key={o.v || "muc-empty"}
                          type="button"
                          role="radio"
                          aria-checked={(draft.cervical_mucus ?? "") === o.v}
                          onClick={() =>
                            setDraft((d) => ({ ...d, cervical_mucus: o.v === "" ? null : o.v }))
                          }
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                            (draft.cervical_mucus ?? "") === o.v
                              ? "border-[var(--cycle-ovulation)] text-foreground"
                              : "border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="eyebrow mb-1.5">Activity</p>
                      <div
                        className="flex flex-wrap gap-1.5"
                        role="radiogroup"
                        aria-label="Sexual activity"
                      >
                        {[
                          { v: "none", label: "None" },
                          { v: "protected", label: "Protected" },
                          { v: "unprotected", label: "Unprotected" },
                        ].map((o) => (
                          <button
                            key={o.v}
                            type="button"
                            role="radio"
                            aria-checked={draft.sexual_activity === o.v}
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                sexual_activity: d.sexual_activity === o.v ? null : o.v,
                              }))
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                              draft.sexual_activity === o.v
                                ? "border-[var(--cycle-ovulation)] text-foreground"
                                : "border-border text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="eyebrow mb-1.5">Contraception</p>
                      <div
                        className="flex flex-wrap gap-1.5"
                        role="radiogroup"
                        aria-label="Contraception"
                      >
                        {[
                          { v: "none", label: "None" },
                          { v: "pill", label: "Pill" },
                          { v: "condom", label: "Condom" },
                          { v: "iud", label: "IUD" },
                          { v: "other", label: "Other" },
                        ].map((o) => (
                          <button
                            key={o.v}
                            type="button"
                            role="radio"
                            aria-checked={draft.contraceptive === o.v}
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                contraceptive: d.contraceptive === o.v ? null : o.v,
                              }))
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                              draft.contraceptive === o.v
                                ? "border-[var(--cycle-ovulation)] text-foreground"
                                : "border-border text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <label className="flex flex-col gap-1">
              <span className="eyebrow">Notes</span>
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Anything worth remembering about today."
                className="w-full resize-y rounded-lg border border-border bg-surface/60 px-3 py-2 text-[13.5px] leading-relaxed outline-none transition-colors placeholder:text-faint/60 focus:border-border-strong focus:bg-surface-2/60"
              />
            </label>

            <SaveRow
              saving={saving}
              error={error}
              onSave={() => void save()}
              extra={
                onExport ? (
                  <button
                    type="button"
                    onClick={onExport}
                    className="mono inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Download className="size-3" aria-hidden /> Export
                  </button>
                ) : null
              }
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
