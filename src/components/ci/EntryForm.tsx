/**
 * EntryForm — start date required, everything else optional. Validation runs
 * at entry time (never silently) so duplicates, backwards dates and future
 * dates can't reach the averaging logic, and every error says what's wrong and
 * how to fix it.
 */

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

import { Button, Card } from "./primitives";
import {
  FLOW_LABEL,
  formatDate,
  validateLogDraft,
  type FieldErrors,
  type FlowLevel,
  type LogDraft,
  type PeriodLog,
} from "@/lib/cycle/predict";

const FLOWS: (FlowLevel | null)[] = ["light", "medium", "heavy", null];

export interface EntryFormProps {
  logs: PeriodLog[];
  today: string;
  editing?: PeriodLog | null;
  /** A date suggested by an insight ("add the period you probably missed"). */
  pendingStart?: string | null;
  onPendingConsumed?: () => void;
  disabled?: boolean;
  compact?: boolean;
  onSubmit: (draft: LogDraft) => { ok: true; id: string } | { ok: false; errors: FieldErrors };
  onCancelEdit?: () => void;
}

export function EntryForm({
  logs,
  today,
  editing = null,
  pendingStart = null,
  onPendingConsumed,
  disabled = false,
  compact = false,
  onSubmit,
  onCancelEdit,
}: EntryFormProps) {
  const uid = useId();
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [flow, setFlow] = useState<FlowLevel | null>(null);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  /* load the entry being edited, reset when it changes */
  useEffect(() => {
    setStart(editing?.start ?? "");
    setEnd(editing?.end ?? "");
    setFlow(editing?.flow ?? null);
    setNotes(editing?.notes ?? "");
    setErrors({});
    setAttempted(false);
    setStatus(null);
  }, [editing]);

  /* an insight suggested a date — prefill it so it only needs confirming */
  useEffect(() => {
    if (!pendingStart) return;
    setStart(pendingStart);
    setAttempted(false);
    setErrors({});
    setStatus(null);
    onPendingConsumed?.();
    startRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStart]);

  const draft: LogDraft = { start, end: end === "" ? null : end, flow, notes };
  const liveErrors = attempted ? validateLogDraft(draft, logs, today, editing?.id ?? null) : errors;
  const shownErrors = attempted ? liveErrors : errors;
  const errorCount = Object.keys(shownErrors).length;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    setAttempted(true);
    const nextErrors = validateLogDraft(draft, logs, today, editing?.id ?? null);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus(null);
      if (nextErrors.start) startRef.current?.focus();
      else if (nextErrors.end) endRef.current?.focus();
      return;
    }
    const result = onSubmit({ ...draft, notes: notes.trim() === "" ? null : notes.trim() });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (!editing) {
      setStart("");
      setEnd("");
      setFlow(null);
      setNotes("");
    }
    setAttempted(false);
    setErrors({});
    setStatus(
      editing
        ? "Entry updated. Every prediction below was recalculated from your remaining data."
        : "Logged. Predictions updated from your record.",
    );
  };

  const fieldError = (key: keyof FieldErrors) => shownErrors[key];

  return (
    <Card>
      <p className="ci-eyebrow">{editing ? "Edit entry" : "Log a period"}</p>
      <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
        {editing ? "Change what you logged" : "Add the days you bled"}
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-[12.5px] leading-relaxed ci-soft">
        Only the first day is required. Everything optional still makes the picture sharper.
      </p>

      <form onSubmit={submit} noValidate className={compact ? "mt-4" : "mt-5"}>
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

        <div className={compact ? "grid gap-3" : "grid gap-4 sm:grid-cols-2"}>
          <div className="ci-field">
            <label className="ci-label" htmlFor={`${uid}-start`}>
              First day of bleeding <span style={{ color: "var(--ci-danger)" }}>*</span>
            </label>
            <input
              id={`${uid}-start`}
              ref={startRef}
              type="date"
              required
              max={today}
              value={start}
              disabled={disabled}
              onChange={(e) => setStart(e.target.value)}
              aria-invalid={fieldError("start") ? true : undefined}
              aria-describedby={`${uid}-start-hint${fieldError("start") ? ` ${uid}-start-error` : ""}`}
              className="ci-input"
            />
            {fieldError("start") ? (
              <p id={`${uid}-start-error`} className="ci-error">
                <AlertCircle size={13} aria-hidden />
                {fieldError("start")}
              </p>
            ) : (
              <p id={`${uid}-start-hint`} className="ci-hint">
                The one date every prediction hangs on.
              </p>
            )}
          </div>

          <div className="ci-field">
            <label className="ci-label" htmlFor={`${uid}-end`}>
              Last day <span className="ci-muted">(optional)</span>
            </label>
            <input
              id={`${uid}-end`}
              ref={endRef}
              type="date"
              max={today}
              min={start || undefined}
              value={end}
              disabled={disabled}
              onChange={(e) => setEnd(e.target.value)}
              aria-invalid={fieldError("end") ? true : undefined}
              aria-describedby={`${uid}-end-hint${fieldError("end") ? ` ${uid}-end-error` : ""}`}
              className="ci-input"
            />
            {fieldError("end") ? (
              <p id={`${uid}-end-error`} className="ci-error">
                <AlertCircle size={13} aria-hidden />
                {fieldError("end")}
              </p>
            ) : (
              <p id={`${uid}-end-hint`} className="ci-hint">
                Leave it blank if bleeding hasn't stopped — we'll estimate.
              </p>
            )}
          </div>
        </div>

        <fieldset className="ci-field mt-4" disabled={disabled}>
          <legend className="ci-label mb-1.5">Flow (optional)</legend>
          <div className="ci-seg">
            {FLOWS.map((level) => (
              <button
                key={level ?? "none"}
                type="button"
                className="ci-seg-item"
                aria-pressed={flow === level}
                onClick={() => setFlow(level)}
              >
                {level ? FLOW_LABEL[level] : "Not sure"}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="ci-field mt-4">
          <label className="ci-label" htmlFor={`${uid}-notes`}>
            Notes <span className="ci-muted">(optional)</span>
          </label>
          <textarea
            id={`${uid}-notes`}
            value={notes}
            disabled={disabled}
            maxLength={400}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering about this cycle — sleep, stress, travel, pain, energy."
            className="ci-input"
            aria-describedby={`${uid}-notes-hint`}
          />
          <p id={`${uid}-notes-hint`} className="ci-hint">
            {notes.length}/400 · private to this device
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" disabled={disabled}>
            {editing ? "Save changes" : "Save period"}
          </Button>
          {start === "" && !editing ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStart(today)}
              disabled={disabled}
            >
              Use today ({formatDate(today)})
            </Button>
          ) : null}
          {editing ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onCancelEdit?.();
                setStart("");
                setEnd("");
                setFlow(null);
                setNotes("");
                setErrors({});
                setAttempted(false);
              }}
            >
              Cancel
            </Button>
          ) : null}
          <p aria-live="polite" className="text-[12px]" style={{ color: "var(--ci-follicular)" }}>
            {status}
          </p>
        </div>
      </form>
    </Card>
  );
}
