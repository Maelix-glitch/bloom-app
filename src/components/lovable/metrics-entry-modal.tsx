import { useEffect, useRef, useState } from "react";
import { X, Moon, Droplets, BookOpen, Activity, Zap, Smartphone, Check, Trash2, CircleAlert, type LucideIcon } from "lucide-react";

type MetricKey = "sleep" | "water" | "study" | "movement" | "energy" | "screen";

type MetricDef = {
  key: MetricKey;
  label: string;
  icon: LucideIcon;
  unit: string;
  placeholder: string;
  colorVar: string;
  validate: (v: number) => string | null;
};

export const METRICS: MetricDef[] = [
  { key: "sleep", label: "Sleep", icon: Moon, unit: "hrs", placeholder: "e.g. 7.5", colorVar: "var(--metric-sleep)", validate: (v) => (v < 0 || v > 24 ? "Please enter a value between 0–24." : null) },
  { key: "water", label: "Water", icon: Droplets, unit: "ml", placeholder: "e.g. 2000", colorVar: "var(--metric-water)", validate: (v) => (v < 0 || v > 20000 ? "Please enter a value between 0–20000." : null) },
  { key: "study", label: "Study", icon: BookOpen, unit: "hrs", placeholder: "e.g. 3", colorVar: "var(--metric-study)", validate: (v) => (v < 0 || v > 24 ? "Please enter a value between 0–24." : null) },
  { key: "movement", label: "Movement", icon: Activity, unit: "min", placeholder: "e.g. 30", colorVar: "var(--metric-movement)", validate: (v) => (v < 0 || v > 1440 ? "Please enter a value between 0–1440." : null) },
  { key: "energy", label: "Energy", icon: Zap, unit: "/10", placeholder: "e.g. 5", colorVar: "var(--metric-energy)", validate: (v) => (v < 1 || v > 10 ? "Must be between 1–10." : null) },
  { key: "screen", label: "Screen", icon: Smartphone, unit: "hrs", placeholder: "e.g. 4", colorVar: "var(--metric-screen)", validate: (v) => (v < 0 || v > 24 ? "Please enter a value between 0–24." : null) },
];

export type MetricsValues = Record<MetricKey, number>;

type View = "form" | "saved" | "reset";

export function MetricsEntryModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (values: MetricsValues) => void;
}) {
  const [view, setView] = useState<View>("form");
  const [values, setValues] = useState<Partial<Record<MetricKey, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<MetricKey, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [partial, setPartial] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setView("form");
      setErrors({});
      setSubmitted(false);
      setPartial(false);
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isEmpty = METRICS.every((m) => !(values[m.key] ?? "").trim());

  const setValue = (key: MetricKey, v: string) => {
    setValues((p) => ({ ...p, [key]: v }));
    if (submitted) {
      const def = METRICS.find((m) => m.key === key)!;
      const msg = v.trim() === "" ? null : validateField(def, v);
      setErrors((p) => ({ ...p, [key]: msg ?? undefined }));
    }
  };

  function validateField(def: MetricDef, raw: string): string | null {
    const n = Number(raw);
    if (raw.trim() === "" || Number.isNaN(n)) return "Enter a number.";
    return def.validate(n);
  }

  const handleConfirm = () => {
    setSubmitted(true);
    const nextErrors: Partial<Record<MetricKey, string>> = {};
    for (const def of METRICS) {
      const raw = values[def.key] ?? "";
      if (raw.trim() === "") continue;
      const msg = validateField(def, raw);
      if (msg) nextErrors[def.key] = msg;
    }
    setErrors(nextErrors);
    const anyValue = METRICS.some((m) => (values[m.key] ?? "").trim() !== "");
    if (Object.keys(nextErrors).length === 0 && anyValue) {
      setPartial(METRICS.some((m) => (values[m.key] ?? "").trim() === ""));
      if (!partial && METRICS.every((m) => (values[m.key] ?? "").trim() !== "")) {
        const parsed = {} as MetricsValues;
        for (const m of METRICS) parsed[m.key] = Number(values[m.key]);
        setView("saved");
        onSaved?.(parsed);
      }
    }
  };

  const clearAll = () => {
    setValues({});
    setErrors({});
    setSubmitted(false);
    setPartial(false);
    setView("form");
  };

  const hasErrors = Object.values(errors).some(Boolean);
  const allFilled = METRICS.every((m) => (values[m.key] ?? "").trim() !== "");

  const subtitle =
    view === "saved"
      ? null
      : view === "reset"
        ? "Clear all fields?"
        : hasErrors
          ? "Please fix the highlighted fields."
          : allFilled
            ? "You're doing great — one day at a time."
            : partial || (!isEmpty && !allFilled)
              ? "Fill in the remaining fields."
              : "Enter your metrics now";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Today's snapshot"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="dark w-full max-w-md overflow-hidden rounded-2xl border border-border shadow-2xl" style={{ backgroundColor: "var(--surface)" }}>
        {/* Header */}
        <div
          className="relative px-6 pb-5 pt-4"
          style={{ background: "linear-gradient(100deg, var(--metric-screen) 0%, var(--brand) 55%, var(--metric-sleep) 100%)" }}
        >
          <h2 className="text-lg font-bold text-white">Today's snapshot</h2>
          {subtitle && <p className="mt-0.5 text-sm text-white/80">{subtitle}</p>}
          <button
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
              {METRICS.map((m, i) => {
                const raw = values[m.key] ?? "";
                const err = errors[m.key];
                return (
                  <div
                    key={m.key}
                    className="rounded-xl border p-3 transition-colors"
                    style={{
                      backgroundColor: "var(--surface-raised)",
                      borderColor: err ? "var(--danger)" : "var(--border)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <m.icon className="h-4 w-4" style={{ color: m.colorVar }} strokeWidth={2.4} />
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{m.label}</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5 border-b-2 pb-1.5" style={{ borderColor: err ? "var(--danger)" : m.colorVar }}>
                      <input
                        ref={i === 0 ? firstInputRef : undefined}
                        type="number"
                        inputMode="decimal"
                        value={raw}
                        onChange={(e) => setValue(m.key, e.target.value)}
                        placeholder={m.placeholder}
                        className="w-full bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground/60"
                      />
                      <span className="text-xs text-muted-foreground">{m.unit}</span>
                    </div>
                    {err && (
                      <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-tight" style={{ color: "var(--danger)" }}>
                        <CircleAlert className="mt-px h-3 w-3 shrink-0" />
                        {err}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleConfirm}
              disabled={submitted && (hasErrors || !allFilled)}
              className="mt-4 w-full rounded-lg py-3 text-sm font-bold uppercase tracking-widest text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "linear-gradient(90deg, var(--metric-screen), var(--brand), var(--metric-sleep))",
              }}
            >
              Confirm
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {submitted && !allFilled ? "All fields are required." : "Real data only. No estimates, no blanks."}
            </p>
            {!isEmpty && (
              <button
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
              style={{ boxShadow: "0 0 40px 4px color-mix(in oklch, var(--success) 45%, transparent)", color: "var(--success)", border: "2px solid var(--success)" }}
            >
              <Check className="h-9 w-9" strokeWidth={2.5} />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-foreground">Saved!</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">Your metrics for today have been recorded.</p>

            <div className="mt-6 grid w-full grid-cols-6 gap-1 rounded-xl border border-border p-3" style={{ backgroundColor: "var(--surface-raised)" }}>
              {METRICS.map((m) => (
                <div key={m.key} className="flex flex-col items-center gap-1">
                  <m.icon className="h-3.5 w-3.5" style={{ color: m.colorVar }} />
                  <span className="text-sm font-bold text-foreground">{values[m.key]}</span>
                  <span className="text-[10px] text-muted-foreground">{m.unit}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-lg py-3 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(90deg, var(--metric-screen), var(--brand), var(--metric-sleep))" }}
            >
              View My Day
            </button>
            <button
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
              style={{ color: "var(--danger)", border: "2px solid var(--danger)", boxShadow: "0 0 40px 4px color-mix(in oklch, var(--danger) 35%, transparent)" }}
            >
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-foreground">Reset today's entry?</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">This will clear all the values you've entered. You can't undo this.</p>
            <button
              onClick={clearAll}
              className="mt-6 w-full rounded-lg py-3 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(90deg, var(--danger), var(--metric-screen))" }}
            >
              Yes, clear all
            </button>
            <button
              onClick={() => setView("form")}
              className="mt-3 w-full rounded-lg border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
