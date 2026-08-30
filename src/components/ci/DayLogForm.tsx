/**
 * DayLogForm — the advanced log. One calendar day at a time, everything
 * optional: flow, symptoms, mood, energy, pain, sleep, and (for anyone
 * tracking fertility signs) temperature, cervical mucus and LH results.
 *
 * Validation is inline and specific, and the whole thing is keyboard-first —
 * every control is a real button or input, not a styled div.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertCircle, Plus, Trash2, X } from "lucide-react";

import { Button, Card } from "./primitives";
import {
  MOOD_LABEL,
  MOOD_VALUES,
  MUCUS_LABEL,
  SYMPTOMS,
  validateDayLog,
  type DayFieldErrors,
  type DayFlow,
  type DayLog,
  type LhValue,
  type MoodValue,
  type MucusValue,
} from "@/lib/cycle/dayLogs";
import { formatDate, type CycleAnalysis } from "@/lib/cycle/predict";
import { placeDate } from "@/lib/cycle/dayLogs";

const FLOWS: { value: DayFlow; label: string }[] = [
  { value: "none", label: "No bleed" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
];

const MUCUS_VALUES: MucusValue[] = ["dry", "sticky", "creamy", "watery", "egg-white"];
const LH_VALUES: { value: LhValue; label: string }[] = [
  { value: "negative", label: "Negative" },
  { value: "positive", label: "Positive" },
];

export interface DayLogFormProps {
  days: DayLog[];
  today: string;
  analysis: CycleAnalysis;
  date: string;
  onDateChange: (date: string) => void;
  onSave: (draft: DayLog) => { ok: true } | { ok: false; errors: DayFieldErrors };
  onDelete: (date: string) => void;
  disabled?: boolean;
}

export function DayLogForm({
  days,
  today,
  analysis,
  date,
  onDateChange,
  onSave,
  onDelete,
  disabled = false,
}: DayLogFormProps) {
  const uid = useId();
  const dateRef = useRef<HTMLInputElement>(null);

  const existing = useMemo(() => days.find((d) => d.date === date) ?? null, [days, date]);

  const [flow, setFlow] = useState<DayFlow | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mood, setMood] = useState<MoodValue | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [sleep, setSleep] = useState<string>("");
  const [temperature, setTemperature] = useState<string>("");
  const [mucus, setMucus] = useState<MucusValue | null>(null);
  const [lh, setLh] = useState<LhValue | null>(null);
  const [notes, setNotes] = useState("");
  const [custom, setCustom] = useState("");
  const [errors, setErrors] = useState<DayFieldErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Set right after our own save so the reload effect doesn't eat the message. */
  const justSaved = useRef(false);

  /* load whatever is already logged for the chosen day */
  const storedShape = existing ? JSON.stringify(existing) : "";
  useEffect(() => {
    setFlow(existing?.flow ?? null);
    setSymptoms(existing?.symptoms ?? []);
    setMood(existing?.mood ?? null);
    setEnergy(existing?.energy ?? null);
    setPain(existing?.pain ?? null);
    setSleep(
      existing?.sleep !== null && existing?.sleep !== undefined ? String(existing.sleep) : "",
    );
    setTemperature(
      existing?.temperature !== null && existing?.temperature !== undefined
        ? String(existing.temperature)
        : "",
    );
    setMucus(existing?.mucus ?? null);
    setLh(existing?.lh ?? null);
    setNotes(existing?.notes ?? "");
    if (justSaved.current) {
      justSaved.current = false;
    } else {
      setErrors({});
      setStatus(null);
      setConfirmDelete(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, storedShape]);

  const placement = placeDate(analysis, date);
  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  const draft: DayLog = {
    date,
    flow,
    symptoms,
    mood,
    energy,
    pain,
    sleep: numOrNull(sleep),
    temperature: numOrNull(temperature),
    mucus,
    lh,
    notes: notes.trim() === "" ? null : notes.trim(),
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    const result = onSave(draft);
    if (!result.ok) {
      setErrors(result.errors);
      setStatus(null);
      return;
    }
    setErrors({});
    justSaved.current = true;
    setStatus(
      existing
        ? "Day updated — the charts below already reflect it."
        : "Logged. The charts below update from it.",
    );
  };

  const toggleSymptom = (key: string) => {
    setSymptoms((prev) =>
      prev.includes(key)
        ? prev.filter((s) => s !== key)
        : prev.length >= 12
          ? prev
          : [...prev, key],
    );
  };

  const addCustom = () => {
    const value = custom.trim().toLowerCase();
    if (!value || symptoms.includes(value) || symptoms.length >= 12) {
      setCustom("");
      return;
    }
    setSymptoms((prev) => [...prev, value]);
    setCustom("");
  };

  const errorCount = Object.keys(errors).length;
  const fieldError = (key: keyof DayFieldErrors) => errors[key];

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ci-eyebrow">Advanced log</p>
          <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
            Log what a day actually felt like
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-[12.5px] leading-relaxed ci-soft">
            Everything here is optional and every field feeds a chart below. Skip what you don't
            track — a day with just "cramps" on it is still useful.
          </p>
        </div>
        <div className="ci-field min-w-[160px]">
          <label className="ci-label" htmlFor={`${uid}-date`}>
            Date
          </label>
          <input
            id={`${uid}-date`}
            ref={dateRef}
            type="date"
            className="ci-input"
            max={today}
            value={date}
            disabled={disabled}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
      </div>

      {placement ? (
        <p className="ci-num mt-3 text-[11.5px] ci-muted">
          {formatDate(date)} · cycle day {placement.cycleDay} · {placement.phase}
          {placement.reconstructed ? " (reconstructed from your average)" : ""}
          {existing ? " · already logged — saving will update it" : ""}
        </p>
      ) : (
        <p className="mt-3 text-[11.5px] ci-muted">
          Log a period start first and days like this one get placed in a cycle automatically.
        </p>
      )}

      <form onSubmit={submit} noValidate className="mt-4">
        {errorCount > 0 ? (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-[var(--ci-radius-md)] border px-3 py-2.5 text-[12.5px]"
            style={{
              borderColor: "color-mix(in oklab, var(--ci-danger) 45%, transparent)",
              background: "color-mix(in oklab, var(--ci-danger) 10%, transparent)",
              color: "var(--ci-danger)",
            }}
          >
            <AlertCircle size={15} className="mt-[1px] shrink-0" aria-hidden />
            <span>
              {errorCount === 1
                ? "One field needs fixing before this can be saved."
                : `${errorCount} fields need fixing before this can be saved.`}
            </span>
          </div>
        ) : null}

        {/* -------------------------------- flow ------------------------------- */}
        <fieldset className="ci-field" disabled={disabled}>
          <legend className="ci-label mb-1.5">Bleeding</legend>
          <div className="ci-seg">
            {FLOWS.map((f) => (
              <button
                key={f.value}
                type="button"
                className="ci-seg-item"
                aria-pressed={flow === f.value}
                onClick={() => setFlow(flow === f.value ? null : f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* ------------------------------ symptoms ----------------------------- */}
        <fieldset className="ci-field mt-4" disabled={disabled}>
          <legend className="ci-label mb-1.5">
            Symptoms <span className="ci-muted">({symptoms.length}/12)</span>
          </legend>
          <div className="ci-seg">
            {SYMPTOMS.map((s) => (
              <button
                key={s}
                type="button"
                className="ci-seg-item"
                aria-pressed={symptoms.includes(s)}
                onClick={() => toggleSymptom(s)}
              >
                {s}
              </button>
            ))}
          </div>
          {symptoms.filter((s) => !(SYMPTOMS as readonly string[]).includes(s)).length > 0 ? (
            <div className="ci-seg mt-2">
              {symptoms
                .filter((s) => !(SYMPTOMS as readonly string[]).includes(s))
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="ci-seg-item"
                    aria-pressed
                    onClick={() => toggleSymptom(s)}
                  >
                    {s}
                    <X size={11} aria-hidden />
                  </button>
                ))}
            </div>
          ) : null}
          <div className="mt-2 flex gap-2">
            <input
              className="ci-input"
              value={custom}
              disabled={disabled}
              maxLength={24}
              placeholder="Add your own…"
              aria-label="Add a custom symptom"
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={addCustom}
              disabled={disabled || !custom.trim()}
            >
              <Plus size={13} aria-hidden />
              Add
            </Button>
          </div>
        </fieldset>

        {/* --------------------------- mood · energy --------------------------- */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <fieldset className="ci-field" disabled={disabled}>
            <legend className="ci-label mb-1.5">Mood</legend>
            <div className="ci-seg">
              {MOOD_VALUES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="ci-seg-item"
                  aria-pressed={mood === m}
                  onClick={() => setMood(mood === m ? null : m)}
                >
                  {MOOD_LABEL[m]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="ci-field" disabled={disabled}>
            <legend className="ci-label mb-1.5">Energy (1–5)</legend>
            <div className="ci-seg">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="ci-seg-item ci-num"
                  aria-pressed={energy === n}
                  onClick={() => setEnergy(energy === n ? null : n)}
                >
                  {n}
                </button>
              ))}
            </div>
            {fieldError("energy") ? (
              <p className="ci-error">
                <AlertCircle size={13} aria-hidden />
                {fieldError("energy")}
              </p>
            ) : null}
          </fieldset>
        </div>

        {/* ---------------------------- pain · sleep --------------------------- */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <fieldset className="ci-field" disabled={disabled}>
            <legend className="ci-label mb-1.5">Pain (0–5)</legend>
            <div className="ci-seg">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="ci-seg-item ci-num"
                  aria-pressed={pain === n}
                  onClick={() => setPain(pain === n ? null : n)}
                >
                  {n}
                </button>
              ))}
            </div>
            {fieldError("pain") ? (
              <p className="ci-error">
                <AlertCircle size={13} aria-hidden />
                {fieldError("pain")}
              </p>
            ) : null}
          </fieldset>

          <div className="ci-field">
            <label className="ci-label" htmlFor={`${uid}-sleep`}>
              Sleep (hours)
            </label>
            <input
              id={`${uid}-sleep`}
              type="number"
              step="0.5"
              min={0}
              max={24}
              inputMode="decimal"
              className="ci-input"
              placeholder="e.g. 7.5"
              value={sleep}
              disabled={disabled}
              onChange={(e) => setSleep(e.target.value)}
              aria-invalid={fieldError("sleep") ? true : undefined}
            />
            {fieldError("sleep") ? (
              <p className="ci-error">
                <AlertCircle size={13} aria-hidden />
                {fieldError("sleep")}
              </p>
            ) : null}
          </div>
        </div>

        {/* ------------------------- fertility signs --------------------------- */}
        <details className="group mt-4 rounded-[var(--ci-radius-md)] border px-3.5 py-2 ci-hair">
          <summary className="cursor-pointer list-none py-1 text-[12.5px] font-medium ci-soft [&::-webkit-details-marker]:hidden">
            <span className="ci-eyebrow">Fertility signs (optional)</span>
            <span className="ml-2 ci-muted">temperature · mucus · LH</span>
          </summary>
          <div className="mt-3 grid gap-4 pb-1 sm:grid-cols-3">
            <div className="ci-field">
              <label className="ci-label" htmlFor={`${uid}-temp`}>
                Temperature (°C)
              </label>
              <input
                id={`${uid}-temp`}
                type="number"
                step="0.01"
                min={34}
                max={42}
                inputMode="decimal"
                className="ci-input"
                placeholder="36.65"
                value={temperature}
                disabled={disabled}
                onChange={(e) => setTemperature(e.target.value)}
                aria-invalid={fieldError("temperature") ? true : undefined}
              />
              {fieldError("temperature") ? (
                <p className="ci-error">
                  <AlertCircle size={13} aria-hidden />
                  {fieldError("temperature")}
                </p>
              ) : null}
            </div>

            <fieldset className="ci-field" disabled={disabled}>
              <legend className="ci-label mb-1.5">Cervical mucus</legend>
              <div className="ci-seg">
                {MUCUS_VALUES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="ci-seg-item"
                    aria-pressed={mucus === m}
                    onClick={() => setMucus(mucus === m ? null : m)}
                  >
                    {MUCUS_LABEL[m]}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="ci-field" disabled={disabled}>
              <legend className="ci-label mb-1.5">LH test</legend>
              <div className="ci-seg">
                {LH_VALUES.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    className="ci-seg-item"
                    aria-pressed={lh === l.value}
                    onClick={() => setLh(lh === l.value ? null : l.value)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <p className="pb-1 text-[11px] leading-relaxed ci-muted">
            These change the charts, not the prediction: the ovulation estimate stays a calendar
            estimate unless you tell us otherwise.
          </p>
        </details>

        {/* -------------------------------- notes ------------------------------ */}
        <div className="ci-field mt-4">
          <label className="ci-label" htmlFor={`${uid}-notes`}>
            Notes
          </label>
          <textarea
            id={`${uid}-notes`}
            className="ci-input"
            maxLength={400}
            value={notes}
            disabled={disabled}
            placeholder="Anything that made today different."
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="ci-hint">{notes.length}/400 · private to this device</p>
          {fieldError("notes") ? (
            <p className="ci-error">
              <AlertCircle size={13} aria-hidden />
              {fieldError("notes")}
            </p>
          ) : null}
        </div>

        {/* -------------------------------- actions ---------------------------- */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" disabled={disabled}>
            {existing ? "Update this day" : "Save day"}
          </Button>
          {date !== today && !disabled ? (
            <Button type="button" variant="ghost" onClick={() => onDateChange(today)}>
              Jump to today
            </Button>
          ) : null}
          {existing ? (
            confirmDelete ? (
              <span className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    onDelete(date);
                    setConfirmDelete(false);
                  }}
                >
                  Delete this day
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep
                </Button>
              </span>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={13} aria-hidden />
                Clear this day
              </Button>
            )
          ) : null}
          <p aria-live="polite" className="text-[12px]" style={{ color: "var(--ci-follicular)" }}>
            {status}
          </p>
        </div>
      </form>
    </Card>
  );
}
