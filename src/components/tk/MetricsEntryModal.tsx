/**
 * MetricsEntryModal — "Today's snapshot".
 *
 * The flow (form → saved / reset) is the design from the data-entry
 * prototype; the chrome was re-skinned in the popup-premium slice to the
 * quick-log sheet's treatment (solid panel, editorial header, kit save
 * pill — see the tk2-snap-* rules in trackers.css). Only the data layer
 * underneath was swapped for Bloom's tracker store:
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
import { Minus, Plus, Sparkles, Trash2 } from "lucide-react";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { BloomSheet } from "@/components/ui/bloom-sheet";
import { Button } from "@/components/ui/button";
import type { TrackerStore } from "@/hooks/useTrackers";
import { trackerDef, type TrackerId } from "@/lib/trackers/core";
import { usualDay } from "@/lib/smart/usual";
import { readTrackerValue, setTrackerValues } from "@/components/tk/shared";

type MetricKey = TrackerId;

type MetricDef = {
  key: MetricKey;
  label: string;
  unit: string;
  placeholder: string;
  /** Hours ↔ minutes for the three duration trackers the user thinks of in hours. */
  scale: number;
  min: number;
  max: number;
  validate: (v: number) => string | null;
};

/**
 * Each metric's chart hue as utility classes (the @theme bridges for
 * --metric-* in styles.css). Written out in full so Tailwind's scanner
 * sees them; the glyph itself is the registry glyph of the same name as
 * the tracker (U4), coloured by the text class via currentColor.
 */
const METRIC_COLOR: Record<MetricKey, { text: string; border: string }> = {
  sleep: { text: "text-metric-sleep", border: "border-metric-sleep" },
  water: { text: "text-metric-water", border: "border-metric-water" },
  study: { text: "text-metric-study", border: "border-metric-study" },
  movement: { text: "text-metric-movement", border: "border-metric-movement" },
  energy: { text: "text-metric-energy", border: "border-metric-energy" },
  screen: { text: "text-metric-screen", border: "border-metric-screen" },
};

const HOURS = 60;

function metric(key: MetricKey, unit: string, placeholder: string, scale = 1): MetricDef {
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
    unit,
    placeholder,
    scale,
    min,
    max,
    validate: (v) => (v < min || v > max ? message : null),
  };
}

export const METRICS: MetricDef[] = [
  metric("sleep", "hrs", "e.g. 7.5", HOURS),
  metric("water", "ml", "e.g. 2000"),
  metric("study", "hrs", "e.g. 3", HOURS),
  metric("movement", "min", "e.g. 30"),
  metric("energy", "/5", "e.g. 4"),
  metric("screen", "hrs", "e.g. 4", HOURS),
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

  /* Their own typical numbers, so a tap can fill a field. Computed from the
     record only — never a guess, and today never predicts itself. */
  const usual = usualDay(store.days, store.today);

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

  /** The usual value for a metric, in the unit its field is typed in. */
  function usualFor(key: MetricKey): number | null {
    switch (key) {
      case "sleep":
        return usual.sleep?.value.minutes ?? null;
      case "water":
        return usual.water?.value ?? null;
      case "study":
        return usual.study?.value.minutes ?? null;
      case "movement":
        return usual.movement?.value ?? null;
      case "energy":
        return usual.energy?.value ?? null;
      case "screen":
        return usual.screen?.value ?? null;
      default:
        return null;
    }
  }

  /** Fields still blank that their own history can suggest a value for. */
  const usualChips = metrics
    .filter((m) => !filled(m.key) && usualFor(m.key) !== null)
    .map((m) => ({ def: m, value: usualFor(m.key) as number }));

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
            ? "Everything's filled — ready to save."
            : !isEmpty
              ? `${filledCount} of ${metrics.length} filled — save what you have, or keep going.`
              : "Today's measurements";

  return (
    /* Geometry (popup-premium slice): the family's default sheet, like the
       quick-log sheet — a centred card on desktop, a bottom sheet with the
       grab handle on phones. The tk2-snap-* classes in trackers.css narrow
       the card to a form's width and make the panel solid: the sheet
       family's glass let the page ghost through this form, the same defect
       the quick-log sheet's tk2-log-* treatment fixed. */
    <BloomSheet
      open={open}
      onClose={onClose}
      title="Today's snapshot"
      description="Log the numbers you actually measured today. Anything left blank stays untouched."
      className="tk2-snap-sheet"
      panelClassName="tk2-snap-panel"
    >
      {/*
       * This wrapper is the sheet's scroll area. It used to be
       * `overflow-hidden` with no scroll: on a phone the six metric cards plus
       * the usual-chips block and Save were taller than the 88dvh sheet, so
       * the bottom of the form — including Save — was clipped and could not be
       * tapped. `min-h-0` is what lets the flex child actually shrink; without
       * it the panel grows past the viewport instead of scrolling.
       */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-metric-surface">
        {/* Header — the calm editorial pattern the quick-log sheet wears:
            a small gold caps label, the Fraunces title, the muted state
            line, a hairline divider, and the family's round ×. (It used to
            be a loud gradient band with bold white text.) */}
        <div className="relative border-b border-border px-5 pb-4 pt-5 sm:px-6">
          <div className="pr-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Reflect &amp; log today
            </p>
            <h2 className="mt-1.5 font-display text-[24px] leading-tight text-foreground">
              Today&apos;s snapshot
            </h2>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="bsheet-icon absolute right-4 top-4 sm:right-5"
          >
            <BloomIcon name="close" size={16} />
          </button>
        </div>

        {view === "form" && (
          <div className="px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-5">
            <div className="metrics-grid grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
              {metrics.map((m) => {
                const raw = values[m.key] ?? "";
                const err = errors[m.key];
                const num = raw.trim() === "" ? null : Number(raw);
                return (
                  <div
                    key={m.key}
                    className={`rounded-xl border bg-metric-surface-raised p-3 transition-colors ${
                      err ? "border-danger" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={METRIC_COLOR[m.key].text}>
                        <BloomIcon name={m.key} size={16} />
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {m.label}
                      </span>
                    </div>
                    <div
                      className={`mt-2 flex items-center gap-2 border-b-2 pb-2 ${
                        err ? "border-danger" : METRIC_COLOR[m.key].border
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => bump(m, -1)}
                        disabled={num === null}
                        aria-label={`Decrease ${m.label}`}
                        className="relative grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-all after:absolute after:-inset-1.5 after:content-[''] hover:text-foreground active:scale-95 disabled:opacity-25"
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
                        className="relative grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-all after:absolute after:-inset-1.5 after:content-[''] hover:text-foreground active:scale-95 disabled:opacity-25"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {err && (
                      <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-tight text-danger">
                        <span className="mt-px shrink-0">
                          <BloomIcon name="error" size={12} />
                        </span>
                        {err}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {usualChips.length > 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-border p-3">
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Your usual · from your last logged days
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {usualChips.map(({ def, value }) => (
                    <button
                      key={`usual-${def.key}`}
                      type="button"
                      onClick={() => setValue(def.key, strip(value / def.scale))}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${METRIC_COLOR[def.key].border} ${METRIC_COLOR[def.key].text}`}
                      title={`Fills ${def.label} with what you usually log — ${value} ${def.unit}`}
                    >
                      <Sparkles className="h-3 w-3" aria-hidden />
                      {def.label} · {strip(value / def.scale)} {def.unit}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              size="lg"
              onClick={handleConfirm}
              disabled={(submitted && hasErrors) || isEmpty}
              className="mt-4 w-full"
            >
              Save today
            </Button>
            <p
              className={`mt-3 text-center text-xs ${saveError ? "text-danger" : "text-muted-foreground"}`}
              role={saveError ? "alert" : undefined}
            >
              {saveError
                ? saveError
                : submitted && isEmpty
                  ? "Fill in at least one field."
                  : "Leave blank anything you didn't measure."}
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
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-success text-success [box-shadow:0_0_40px_4px_color-mix(in_oklch,var(--success)_45%,transparent)]">
              <BloomIcon name="check-bloom" size={36} />
            </div>
            <h3 className="mt-5 font-display text-2xl text-foreground">Saved.</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {partial
                ? "What you filled in is on today's record. The rest stays open."
                : "Your metrics for today have been recorded."}
            </p>

            <div
              className="metrics-saved-grid mt-6 grid w-full gap-1 rounded-xl border border-border bg-metric-surface-raised p-3"
              style={{
                /* the column count is the number of metrics this person
                   tracks — data, not styling, so it stays inline */
                gridTemplateColumns: `repeat(${Math.max(1, metrics.length)}, minmax(0, 1fr))`,
              }}
            >
              {metrics.map((m) => (
                <div key={m.key} className="flex flex-col items-center gap-1">
                  <span className={METRIC_COLOR[m.key].text}>
                    <BloomIcon name={m.key} size={14} />
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {filled(m.key) ? values[m.key] : "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{m.unit}</span>
                </div>
              ))}
            </div>

            <Button type="button" size="lg" onClick={onClose} className="mt-6 w-full">
              Done
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={clearAll}
              className="mt-3 w-full"
            >
              Add another entry
            </Button>
          </div>
        )}

        {view === "reset" && (
          <div className="flex flex-col items-center px-6 pb-7 pt-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-danger text-danger [box-shadow:0_0_40px_4px_color-mix(in_oklch,var(--danger)_35%,transparent)]">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="mt-5 font-display text-xl text-foreground">Reset today&apos;s entry?</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This will clear all the values you've entered. You can't undo this.
            </p>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              onClick={clearAll}
              className="mt-6 w-full"
            >
              Yes, clear all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setView("form")}
              className="mt-3 w-full"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </BloomSheet>
  );
}
