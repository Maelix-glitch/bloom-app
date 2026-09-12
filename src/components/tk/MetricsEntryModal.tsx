/**
 * MetricsEntryModal — "Today's snapshot".
 *
 * The markup, classes and flow (form → saved / reset) are the design from
 * the data-entry prototype, kept as-is. Only the data layer underneath
 * was swapped for Bloom's tracker store:
 *
 *   • opens on today's real values (readTrackerValue) instead of blank
 *   • shows only the trackers this person tracks (store.active) and saves
 *     whatever is filled in — a blank field leaves that tracker untouched,
 *     so logging sleep and water on their own is a complete, valid entry
 *   • validation ranges come from Bloom's tracker definitions, so the form
 *     can never accept a number the store would reject
 *   • sleep / study / screen are typed in hours (decimal ok) and stored in
 *     minutes; water in ml, movement in minutes, energy on Bloom's 1–5 scale
 *   • portalled to <body> like every other Bloom sheet
 *   • no keyboard anywhere: every field is a − / + stepper over a read-only
 *     value, so tapping a field never summons the phone keyboard. Stepping
 *     below the minimum clears the field back to blank (untouched).
 *   • roomy steppers: 32px buttons flank a large centred value with its unit
 *     tucked underneath, so wide values (2200ml) never squeeze.
 *
 * Colour tokens (--metric-*, --brand, --success, --danger, --metric-surface*)
 * live on :root in src/styles.css.
 */

import { useEffect, useState } from "react";
import {
  X,
  Moon,
  Droplets,
  BookOpen,
  Activity,
  Zap,
  Smartphone,
  Check,
  Trash2,
  CircleAlert,
  Minus,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { BloomSheet } from "@/components/ui/bloom-sheet";
import type { TrackerStore } from "@/hooks/useTrackers";
import { trackerDef, type TrackerId } from "@/lib/trackers/core";
import { readTrackerValue, setTrackerValues } from "@/components/tk/designs/shared";

type MetricKey = TrackerId;

type MetricDef = {
  key: MetricKey;
  label: string;
  icon: LucideIcon;
  unit: string;
  placeholder: string;
  colorVar: string;
  /** Hours ↔ minutes for the three duration trackers the user thinks of in hours. */
  scale: number;
  min: number;
  max: number;
  validate: (v: number) => string | null;
};

const HOURS = 60;

function metric(
  key: MetricKey,
  icon: LucideIcon,
  unit: string,
  placeholder: string,
  scale = 1,
): MetricDef {
  const def = trackerDef(key);
  const min = def.min / scale;
  const max = Math.round((def.max / scale) * 100) / 100;
  const message =
    def.kind === "rating"
      ? `Must be between ${min}–${max}.`
      : `Please enter a value between ${min}–${max}.`;
  return {
    key,
    label: def.name,
    icon,
    unit,
    placeholder,
    colorVar: `var(--metric-${key})`,
    scale,
    min,
    max,
    validate: (v) => (v < min || v > max ? message : null),
  };
}

export const METRICS: MetricDef[] = [
  metric("sleep", Moon, "hrs", "e.g. 7.5", HOURS),
  metric("water", Droplets, "ml", "e.g. 2000"),
  metric("study", BookOpen, "hrs", "e.g. 3", HOURS),
  metric("movement", Activity, "min", "e.g. 30"),
  metric("energy", Zap, "/5", "e.g. 4"),
  metric("screen", Smartphone, "hrs", "e.g. 4", HOURS),
];

/** One tap of − / +, in the unit the field shows (a glass of water, half an hour…). */
const STEPS: Record<MetricKey, number> = {
  sleep: 0.5,
  water: 250,
  study: 0.5,
  movement: 5,
  energy: 1,
  screen: 0.5,
};

/** 2dp float arithmetic, printed without trailing zeros ("8", "7.5", never "8.00"). */
const strip = (v: number): string => String(Math.round(v * 100) / 100);

export type MetricsValues = Record<MetricKey, number>;

type View = "form" | "saved" | "reset";

/** What today holds, in the unit the field is typed in ("" when unlogged). */
function draftFromStore(store: TrackerStore): Partial<Record<MetricKey, string>> {
  const next: Partial<Record<MetricKey, string>> = {};
  for (const m of METRICS) {
    const stored = readTrackerValue(store, m.key);
    // Study reads back as 0 when there are no sessions — that's "unlogged".
    if (stored === null || (m.key === "study" && stored === 0)) continue;
    next[m.key] = String(Math.round((stored / m.scale) * 100) / 100);
  }
  return next;
}

export function MetricsEntryModal({
  store,
  open,
  onClose,
  onSaved,
}: {
  store: TrackerStore;
  open: boolean;
  onClose: () => void;
  onSaved?: (values: MetricsValues) => void;
}) {
  const [view, setView] = useState<View>("form");
  const [values, setValues] = useState<Partial<Record<MetricKey, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<MetricKey, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [partial, setPartial] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setView("form");
      setValues(draftFromStore(store));
      setErrors({});
      setSubmitted(false);
      setPartial(false);
      setSaveError(null);
    }
    return undefined;
    // Re-reading the store on every store change while open would stomp on typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const metrics = METRICS.filter((m) => store.active.includes(m.key));
  const filled = (key: MetricKey) => (values[key] ?? "").trim() !== "";
  const isEmpty = metrics.every((m) => !filled(m.key));
  const allFilled = metrics.every((m) => filled(m.key));
  const filledCount = metrics.filter((m) => filled(m.key)).length;

  function validateField(def: MetricDef, raw: string): string | null {
    const n = Number(raw);
    if (raw.trim() === "" || Number.isNaN(n)) return "Enter a number.";
    return def.validate(n);
  }

  const setValue = (key: MetricKey, v: string) => {
    setValues((p) => ({ ...p, [key]: v }));
    setSaveError(null);
    if (submitted) {
      const def = METRICS.find((m) => m.key === key)!;
      const msg = v.trim() === "" ? null : validateField(def, v);
      setErrors((p) => {
        const next = { ...p };
        if (msg) next[key] = msg;
        else delete next[key];
        return next;
      });
    }
  };

  /** − / + on a stepper. Blank + plus starts at the first step; stepping below the minimum clears back to blank. */
  const bump = (def: MetricDef, dir: 1 | -1) => {
    const raw = (values[def.key] ?? "").trim();
    const step = STEPS[def.key];
    if (raw === "") {
      if (dir < 0) return;
      setValue(def.key, strip(Math.max(def.min, step)));
      return;
    }
    const cur = Number(raw);
    if (!Number.isFinite(cur)) {
      setValue(def.key, strip(Math.max(def.min, step)));
      return;
    }
    const next = Math.round((cur + dir * step) * 100) / 100;
    if (next < def.min) {
      setValue(def.key, "");
      return;
    }
    if (next > def.max) {
      setValue(def.key, strip(def.max));
      return;
    }
    setValue(def.key, strip(next));
  };

  const handleConfirm = () => {
    setSubmitted(true);
    const nextErrors: Partial<Record<MetricKey, string>> = {};
    for (const def of metrics) {
      const raw = values[def.key] ?? "";
      if (raw.trim() === "") continue;
      const msg = validateField(def, raw);
      if (msg) nextErrors[def.key] = msg;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || isEmpty) return;

    /* a partial entry is a real entry: only the filled fields are written,
       blanks leave whatever today already holds untouched */
    setPartial(!allFilled);

    // Typed units → stored units, written in one go so no field overwrites another.
    const parsed = {} as MetricsValues;
    const entries = metrics
      .filter((m) => filled(m.key))
      .map((m) => {
        const typed = Number(values[m.key]);
        parsed[m.key] = typed;
        return { id: m.key, value: Math.round(typed * m.scale) };
      });
    const error = setTrackerValues(store, entries);
    if (error) {
      setSaveError(error);
      return;
    }
    setView("saved");
    onSaved?.(parsed);
  };

  const clearAll = () => {
    setValues({});
    setErrors({});
    setSubmitted(false);
    setPartial(false);
    setSaveError(null);
    setView("form");
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const subtitle =
    view === "saved"
      ? null
      : view === "reset"
        ? "Clear all fields?"
        : hasErrors
          ? "Please fix the highlighted fields."
          : allFilled
            ? "You're doing great — one day at a time."
            : !isEmpty
              ? `${filledCount} of ${metrics.length} filled — save what you have, or keep going.`
              : "Enter your metrics now";

  return (
    <BloomSheet
      open={open}
      onClose={onClose}
      title="Today's snapshot"
      description="Log the numbers you actually measured today. Anything left blank stays untouched."
      className="metrics-sheet"
      panelClassName="metrics-pop"
    >
      <div className="overflow-hidden" style={{ backgroundColor: "var(--metric-surface)" }}>
        {/* Header */}
        <div
          className="relative px-6 pb-5 pt-4"
          style={{
            background:
              "linear-gradient(100deg, var(--metric-screen) 0%, var(--brand) 55%, var(--metric-sleep) 100%)",
          }}
        >
          <h2 className="text-lg font-bold text-white">Today's snapshot</h2>
          {subtitle && <p className="mt-0.5 text-sm text-white/80">{subtitle}</p>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md p-1 text-white/80 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {view === "form" && (
          <div className="px-5 pb-6 pt-5">
            <div className="grid grid-cols-2 gap-3">
              {metrics.map((m) => {
                const raw = values[m.key] ?? "";
                const err = errors[m.key];
                const num = raw.trim() === "" ? null : Number(raw);
                return (
                  <div
                    key={m.key}
                    className="rounded-xl border p-3 transition-colors"
                    style={{
                      backgroundColor: "var(--metric-surface-raised)",
                      borderColor: err ? "var(--danger)" : "var(--border)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <m.icon className="h-4 w-4" style={{ color: m.colorVar }} strokeWidth={2.4} />
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {m.label}
                      </span>
                    </div>
                    <div
                      className="mt-2 flex items-center gap-2 border-b-2 pb-2"
                      style={{ borderColor: err ? "var(--danger)" : m.colorVar }}
                    >
                      <button
                        type="button"
                        onClick={() => bump(m, -1)}
                        disabled={num === null}
                        aria-label={`Decrease ${m.label}`}
                        className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-all hover:text-foreground active:scale-95 disabled:opacity-25"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1 text-center">
                        <input
                          type="text"
                          readOnly
                          inputMode="none"
                          value={raw}
                          placeholder=""
                          aria-label={`${m.label} (${m.unit})`}
                          aria-invalid={err ? true : undefined}
                          tabIndex={-1}
                          className="w-full min-w-0 bg-transparent text-center text-xl font-semibold text-foreground outline-none placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground/60"
                        />
                        <span className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground">
                          {m.unit}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => bump(m, 1)}
                        disabled={num !== null && num >= m.max}
                        aria-label={`Increase ${m.label}`}
                        className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-all hover:text-foreground active:scale-95 disabled:opacity-25"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {err && (
                      <p
                        className="mt-1.5 flex items-start gap-1 text-[11px] leading-tight"
                        style={{ color: "var(--danger)" }}
                      >
                        <CircleAlert className="mt-px h-3 w-3 shrink-0" />
                        {err}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={(submitted && hasErrors) || isEmpty}
              className="mt-4 w-full rounded-lg py-3 text-sm font-bold uppercase tracking-widest text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background:
                  "linear-gradient(90deg, var(--metric-screen), var(--brand), var(--metric-sleep))",
              }}
            >
              Save today
            </button>
            <p
              className="mt-3 text-center text-xs text-muted-foreground"
              style={saveError ? { color: "var(--danger)" } : undefined}
              role={saveError ? "alert" : undefined}
            >
              {saveError
                ? saveError
                : submitted && isEmpty
                  ? "Fill in at least one field."
                  : allFilled
                    ? "Real data only. No estimates."
                    : "Real data only — leave anything you didn't measure blank."}
            </p>
            {!isEmpty && (
              <button
                type="button"
                onClick={() => setView("reset")}
                className="mt-2 w-full text-center text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-destructive hover:underline"
              >
                Clear all fields
              </button>
            )}
          </div>
        )}

        {view === "saved" && (
          <div className="flex flex-col items-center px-6 pb-7 pt-8 text-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                boxShadow: "0 0 40px 4px color-mix(in oklch, var(--success) 45%, transparent)",
                color: "var(--success)",
                border: "2px solid var(--success)",
              }}
            >
              <Check className="h-9 w-9" strokeWidth={2.5} />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-foreground">Saved!</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {partial
                ? "What you filled in is on today's record. The rest stays open."
                : "Your metrics for today have been recorded."}
            </p>

            <div
              className="mt-6 grid w-full gap-1 rounded-xl border border-border p-3"
              style={{
                backgroundColor: "var(--metric-surface-raised)",
                gridTemplateColumns: `repeat(${Math.max(1, metrics.length)}, minmax(0, 1fr))`,
              }}
            >
              {metrics.map((m) => (
                <div key={m.key} className="flex flex-col items-center gap-1">
                  <m.icon className="h-3.5 w-3.5" style={{ color: m.colorVar }} />
                  <span className="text-sm font-bold text-foreground">
                    {filled(m.key) ? values[m.key] : "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{m.unit}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-lg py-3 text-sm font-semibold text-white"
              style={{
                background:
                  "linear-gradient(90deg, var(--metric-screen), var(--brand), var(--metric-sleep))",
              }}
            >
              Done
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="mt-3 w-full rounded-lg border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Add Another Entry
            </button>
          </div>
        )}

        {view === "reset" && (
          <div className="flex flex-col items-center px-6 pb-7 pt-8 text-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                color: "var(--danger)",
                border: "2px solid var(--danger)",
                boxShadow: "0 0 40px 4px color-mix(in oklch, var(--danger) 35%, transparent)",
              }}
            >
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-foreground">Reset today's entry?</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This will clear all the values you've entered. You can't undo this.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-6 w-full rounded-lg py-3 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(90deg, var(--danger), var(--metric-screen))" }}
            >
              Yes, clear all
            </button>
            <button
              type="button"
              onClick={() => setView("form")}
              className="mt-3 w-full rounded-lg border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </BloomSheet>
  );
}