/**
 * LogPanel — one form for both records.
 *
 * A period start and a daily log used to be two separate cards, which asked
 * people to decide between them before they'd typed anything. Now there is one
 * date and one save: pick a bleed level and it can start a period (and feed the
 * predictions), open the advanced log and the same day carries symptoms, mood,
 * energy, pain, sleep and fertility signs.
 *
 * Both writes are independent — a failed period entry never blocks the day log,
 * and neither one is saved silently. Validation is inline and specific.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Plus, Sparkles, Trash2, X } from "lucide-react";

import { Button, Card } from "./primitives";
import {
  MOOD_LABEL,
  MOOD_VALUES,
  MUCUS_LABEL,
  SYMPTOMS,
  isEmptyDay,
  placeDate,
  validateDayLog,
  type DayFieldErrors,
  type DayFlow,
  type DayLog,
  type LhValue,
  type MoodValue,
  type MucusValue,
} from "@/lib/cycle/dayLogs";
import {
  FLOW_LABEL,
  formatDate,
  type CycleAnalysis,
  type FieldErrors,
  type FlowLevel,
  type LogDraft,
  type PeriodLog,
} from "@/lib/cycle/predict";

const BLEEDS: { value: DayFlow; label: string }[] = [
  { value: "none", label: "None" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
];
const MUCUS_VALUES: MucusValue[] = ["dry", "sticky", "creamy", "watery", "egg-white"];
const LH_VALUES: { value: LhValue; label: string }[] = [
  { value: "negative", label: "Negative" },
  { value: "positive", label: "Positive" },
];

export interface LogPanelProps {
  logs: PeriodLog[];
  days: DayLog[];
  today: string;
  analysis: CycleAnalysis;
  date: string;
  onDateChange: (date: string) => void;
  editing?: PeriodLog | null;
  onCancelEdit?: () => void;
  pendingStart?: string | null;
  onPendingConsumed?: () => void;
  disabled?: boolean;
  onSavePeriod: (draft: LogDraft) => { ok: true; id: string } | { ok: false; errors: FieldErrors };
  onSaveDay: (draft: DayLog) => { ok: true } | { ok: false; errors: DayFieldErrors };
  onDeleteDay: (date: string) => void;
  /**
   * A message to show when this panel has nothing of its own to say — the one
   * case where the panel is remounted by the page switching out of its
   * first-run layout right as it saves.
   */
  notice?: string | null;
}

export function LogPanel({
  logs,
  days,
  today,
  analysis,
  date,
  onDateChange,
  editing = null,
  onCancelEdit,
  pendingStart = null,
  onPendingConsumed,
  disabled = false,
  onSavePeriod,
  onSaveDay,
  onDeleteDay,
  notice = null,
}: LogPanelProps) {
  const uid = useId();
  const dateRef = useRef<HTMLInputElement>(null);

  const existing = useMemo(() => days.find((d) => d.date === date) ?? null, [days, date]);
  const existingPeriod = useMemo(
    () => (editing ? editing : (logs.find((l) => l.start === date) ?? null)),
    [editing, logs, date],
  );

  const [bleed, setBleed] = useState<DayFlow | null>(null);
  const [startPeriod, setStartPeriod] = useState(false);
  const [end, setEnd] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mood, setMood] = useState<MoodValue | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [sleep, setSleep] = useState("");
  const [temperature, setTemperature] = useState("");
  const [mucus, setMucus] = useState<MucusValue | null>(null);
  const [lh, setLh] = useState<LhValue | null>(null);
  const [notes, setNotes] = useState("");
  const [custom, setCustom] = useState("");
  const [open, setOpen] = useState(false);

  const [periodErrors, setPeriodErrors] = useState<FieldErrors>({});
  const [dayErrors, setDayErrors] = useState<DayFieldErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Set right after our own save so the reload effect doesn't eat the message. */
  const justSaved = useRef(false);

  /* --------------------------- load the chosen day -------------------------- */
  const storedShape = existing ? JSON.stringify(existing) : "";
  useEffect(() => {
    /* While a period entry is being edited, the edit effect below owns these
       fields — reloading the day here would wipe the flow it just set. */
    if (editing) return;
    if (justSaved.current) {
      justSaved.current = false;
      return;
    }
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
    setBleed(existing?.flow ?? null);
    setNotes(existing?.notes ?? "");
    setDayErrors({});
    setStatus(null);
    setConfirmDelete(false);
    if (existing && ((existing.symptoms ?? []).length > 0 || existing.mood !== null)) {
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, storedShape, editing]);

  /* ------------------------- load a period being edited --------------------- */
  useEffect(() => {
    if (!editing) return;
    onDateChange(editing.start);
    setBleed(editing.flow ?? "medium");
    setEnd(editing.end ?? "");
    setNotes(editing.notes ?? "");
    setStartPeriod(true);
    setPeriodErrors({});
    setStatus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  /* ----------------- an insight suggested a missed period ------------------- */
  useEffect(() => {
    if (!pendingStart) return;
    onDateChange(pendingStart);
    setStartPeriod(true);
    setBleed((b) => b ?? "medium");
    setStatus(null);
    setPeriodErrors({});
    onPendingConsumed?.();
    dateRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStart]);

  const placement = placeDate(analysis, date);
  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  const dayDraft: DayLog = {
    date,
    flow: bleed,
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
  const dayHasContent = !isEmptyDay({ ...dayDraft, flow: bleed ?? null });
  const advancedTouched =
    symptoms.length > 0 ||
    mood !== null ||
    energy !== null ||
    pain !== null ||
    sleep !== "" ||
    temperature !== "" ||
    mucus !== null ||
    lh !== null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (disabled) return;

    setPeriodErrors({});
    setDayErrors({});
    setStatus(null);

    if (!startPeriod && !dayHasContent) {
      setDayErrors({ notes: "Pick a bleed level or open the advanced log first." });
      setOpen(true);
      return;
    }

    /* Validate the day first: nothing is written unless both halves are
       sound, so a bad temperature can't leave a period logged with no
       explanation. */
    if (dayHasContent) {
      const problems = validateDayLog(dayDraft, today);
      if (Object.keys(problems).length > 0) {
        setDayErrors(problems);
        setOpen(true);
        return;
      }
    }

    let periodOk = false;
    if (startPeriod) {
      if (!bleed || bleed === "none") {
        setPeriodErrors({ flow: "Pick a bleed level for the day it started." });
        return;
      }
      const result = onSavePeriod({
        start: date,
        end: end === "" ? null : end,
        flow: bleed as FlowLevel,
        notes: notes.trim() === "" ? null : notes.trim(),
      });
      if (!result.ok) {
        setPeriodErrors(result.errors);
        return;
      }
      periodOk = true;
    }

    if (dayHasContent) {
      const result = onSaveDay(dayDraft);
      if (!result.ok) {
        setDayErrors(result.errors);
        setOpen(true);
        return;
      }
    }

    justSaved.current = true;
    setStatus(
      editing
        ? "Updated. Everything below was recalculated."
        : periodOk && dayHasContent
          ? "Period and day logged."
          : periodOk
            ? "Period logged — predictions updated."
            : existing
              ? "Day updated."
              : "Day logged.",
    );
    if (!editing) {
      setEnd("");
      setPeriodErrors({});
    }
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

  const pickBleed = (value: DayFlow) => {
    const next = bleed === value ? null : value;
    setBleed(next);
    setStartPeriod(next !== null && next !== "none");
    setPeriodErrors({});
  };

  const periodErrorCount = Object.keys(periodErrors).length;
  const dayErrorCount = Object.keys(dayErrors).length;
  const errorCount = periodErrorCount + dayErrorCount;
  const periodError = (key: keyof FieldErrors) => periodErrors[key];
  const dayError = (key: keyof DayFieldErrors) => dayErrors[key];

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ci-eyebrow">{editing ? "Edit entry" : "Log"}</p>
          <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
            {editing ? "Change what you logged" : "Add a day"}
          </h2>
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

      <p className="ci-num mt-3 text-[11.5px] ci-muted">
        {placement
          ? `${formatDate(date)} · cycle day ${placement.cycleDay} · ${placement.phase}${
              placement.reconstructed ? " (from your average)" : ""
            }`
          : `${formatDate(date)} · log a period start and this day gets placed in a cycle`}
        {existing ? " · already logged" : ""}
      </p>

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

        {/* ------------------------------- bleeding ------------------------------ */}
        <fieldset className="ci-field" disabled={disabled}>
          <legend className="ci-label mb-1.5">Bleeding</legend>
          <div className="ci-seg">
            {BLEEDS.map((b) => (
              <button
                key={b.value}
                type="button"
                className="ci-seg-item"
                aria-pressed={bleed === b.value}
                onClick={() => pickBleed(b.value)}
              >
                {b.label}
              </button>
            ))}
          </div>
          {periodError("flow") ? (
            <p className="ci-error">
              <AlertCircle size={13} aria-hidden />
              {periodError("flow")}
            </p>
          ) : null}
        </fieldset>

        {/* ---------------------------- period start ----------------------------- */}
        {bleed && bleed !== "none" ? (
          <div className="mt-4 rounded-[var(--ci-radius-md)] px-3.5 py-3 ci-hair">
            <label className="flex items-start gap-2.5 text-[12.5px] leading-snug">
              <input
                type="checkbox"
                className="ci-check"
                checked={startPeriod}
                disabled={disabled || Boolean(editing)}
                onChange={(e) => setStartPeriod(e.target.checked)}
              />
              <span>
                This is the <strong className="font-medium">first day of a period</strong>
                <span className="ci-muted"> — used for predictions</span>
              </span>
            </label>

            {startPeriod ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="ci-field">
                  <label className="ci-label" htmlFor={`${uid}-end`}>
                    Last day <span className="ci-muted">(optional)</span>
                  </label>
                  <input
                    id={`${uid}-end`}
                    type="date"
                    max={today}
                    min={date || undefined}
                    value={end}
                    disabled={disabled}
                    onChange={(e) => setEnd(e.target.value)}
                    aria-invalid={periodError("end") ? true : undefined}
                    className="ci-input"
                  />
                  {periodError("end") ? (
                    <p className="ci-error">
                      <AlertCircle size={13} aria-hidden />
                      {periodError("end")}
                    </p>
                  ) : null}
                </div>
                <div className="ci-field">
                  <span className="ci-label">Flow for the record</span>
                  <p className="mt-1 text-[12.5px] ci-soft">
                    {bleed ? FLOW_LABEL[bleed as FlowLevel] : "—"}
                  </p>
                </div>
              </div>
            ) : null}

            {periodError("start") ? (
              <p className="ci-error mt-2">
                <AlertCircle size={13} aria-hidden />
                {periodError("start")}
              </p>
            ) : null}
            {existingPeriod && !editing ? (
              <p className="mt-2 text-[11.5px] ci-muted">
                A period already starts on this date — saving will update it.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* --------------------------- advanced log ------------------------------ */}
        <button
          type="button"
          id={`${uid}-adv-toggle`}
          aria-expanded={open}
          aria-controls={`${uid}-adv`}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="ci-adv mt-4"
        >
          <span className="ci-adv__icon" aria-hidden>
            <Sparkles size={15} />
          </span>
          <span className="text-left">
            <span className="block text-[13px] font-medium leading-tight">Advanced log</span>
            <span className="block text-[11px] leading-snug ci-muted">
              symptoms · mood · energy · pain · sleep
            </span>
          </span>
          <span className="ci-adv__tag ci-num">Recommended</span>
          <ChevronDown
            size={16}
            aria-hidden
            className="ci-adv__chev"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          />
        </button>

        {open ? (
          <div id={`${uid}-adv`} className="ci-adv-body mt-4">
            {/* symptoms */}
            <fieldset className="ci-field" disabled={disabled}>
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

            {/* mood · energy */}
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
                {dayError("energy") ? (
                  <p className="ci-error">
                    <AlertCircle size={13} aria-hidden />
                    {dayError("energy")}
                  </p>
                ) : null}
              </fieldset>
            </div>

            {/* pain · sleep */}
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
                {dayError("pain") ? (
                  <p className="ci-error">
                    <AlertCircle size={13} aria-hidden />
                    {dayError("pain")}
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
                  placeholder="7.5"
                  value={sleep}
                  disabled={disabled}
                  onChange={(e) => setSleep(e.target.value)}
                  aria-invalid={dayError("sleep") ? true : undefined}
                />
                {dayError("sleep") ? (
                  <p className="ci-error">
                    <AlertCircle size={13} aria-hidden />
                    {dayError("sleep")}
                  </p>
                ) : null}
              </div>
            </div>

            {/* fertility signs */}
            <details className="group mt-4 rounded-[var(--ci-radius-md)] border px-3.5 py-2 ci-hair">
              <summary className="cursor-pointer list-none py-1 text-[12.5px] font-medium ci-soft [&::-webkit-details-marker]:hidden">
                <span className="ci-eyebrow">Fertility signs</span>
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
                    aria-invalid={dayError("temperature") ? true : undefined}
                  />
                  {dayError("temperature") ? (
                    <p className="ci-error">
                      <AlertCircle size={13} aria-hidden />
                      {dayError("temperature")}
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
            </details>

            {/* notes */}
            <div className="ci-field mt-4">
              <label className="ci-label" htmlFor={`${uid}-notes`}>
                Notes <span className="ci-muted">(optional)</span>
              </label>
              <textarea
                id={`${uid}-notes`}
                className="ci-input"
                maxLength={400}
                value={notes}
                disabled={disabled}
                placeholder="Anything that made this day different."
                onChange={(e) => setNotes(e.target.value)}
              />
              <p className="ci-hint">{notes.length}/400 · private to this device</p>
              {dayError("notes") ? (
                <p className="ci-error">
                  <AlertCircle size={13} aria-hidden />
                  {dayError("notes")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* -------------------------------- actions ------------------------------ */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" disabled={disabled}>
            {editing ? "Save changes" : existing ? "Update this day" : "Save"}
          </Button>
          {date !== today && !disabled && !editing ? (
            <Button type="button" variant="ghost" onClick={() => onDateChange(today)}>
              Jump to today
            </Button>
          ) : null}
          {editing ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onCancelEdit?.();
                setStartPeriod(false);
                setBleed(null);
                setEnd("");
                setNotes("");
                setPeriodErrors({});
                setStatus(null);
              }}
            >
              Cancel
            </Button>
          ) : null}
          {existing && !editing ? (
            confirmDelete ? (
              <span className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    onDeleteDay(date);
                    setConfirmDelete(false);
                    justSaved.current = true;
                    setStatus("Day cleared.");
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
            {status ?? notice}
          </p>
        </div>
      </form>
    </Card>
  );
}

export default LogPanel;
