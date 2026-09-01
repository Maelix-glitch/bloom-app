/**
 * LogPanel — one day, six trackers, one save.
 *
 * Every field writes to the same date, so logging a night's sleep and a
 * glass of water is one action rather than a tour of six forms. Validation is
 * inline and specific; nothing is written unless the whole day is sound.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertCircle, Plus, Trash2, X } from "lucide-react";

import { Button, Card } from "@/components/ci/primitives";

import { TrackerIcon, TRACKER_ACCENT } from "@/components/tk/icons";
import {
  SUBJECTS,
  emptyDay,
  minutesBetween,
  trackerDef,
  type DayEntry,
  type DayFieldErrors,
  type StudySession,
  type TrackerId,
} from "@/lib/trackers/core";
import { formatDate } from "@/lib/cycle/predict";
import { CapsuleDock, Metric } from "@/components/tk/designs/shared";

const QUALITY_LABEL = ["", "Rough", "Fair", "Okay", "Good", "Deep"];
const ENERGY_LABEL = ["", "Drained", "Low", "Steady", "Bright", "Wired"];

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="ci-field">
      <span className="ci-label">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="ci-error">
          <AlertCircle size={13} aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="ci-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export interface LogPanelProps {
  days: DayEntry[];
  today: string;
  date: string;
  onDateChange: (date: string) => void;
  onSave: (draft: DayEntry) => { ok: true } | { ok: false; errors: DayFieldErrors };
  onDelete: (date: string) => void;
  disabled?: boolean;
  /** Which tracker the page wants the eye on, set by tapping a dial. */
  focus?: TrackerId | null | undefined;
}

export function LogPanel({
  days,
  today,
  date,
  onDateChange,
  onSave,
  onDelete,
  disabled = false,
  focus = null,
}: LogPanelProps) {
  const uid = useId();
  const sleepRef = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLDivElement>(null);
  const studyRef = useRef<HTMLDivElement>(null);
  const movementRef = useRef<HTMLDivElement>(null);
  const energyRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  const existing = useMemo(() => days.find((d) => d.date === date) ?? null, [days, date]);

  const [draft, setDraft] = useState<DayEntry>(() => existing ?? emptyDay(date));
  const [errors, setErrors] = useState<DayFieldErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [subject, setSubject] = useState<string>("General");
  const [sessionMinutes, setSessionMinutes] = useState("");
  const [startAt, setStartAt] = useState("");
  const justSaved = useRef(false);

  /* reload when the date changes, or when the stored day changes under us */
  const storedShape = existing ? JSON.stringify(existing) : "";
  useEffect(() => {
    if (justSaved.current) {
      justSaved.current = false;
      return;
    }
    setDraft(existing ?? emptyDay(date));
    setErrors({});
    setStatus(null);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, storedShape]);

  /* a dial was tapped — bring that tracker into view */
  useEffect(() => {
    if (!focus) return;
    const target = {
      sleep: sleepRef,
      water: waterRef,
      study: studyRef,
      movement: movementRef,
      energy: energyRef,
      screen: screenRef,
    }[focus];
    target?.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
  }, [focus]);

  const set = <K extends keyof DayEntry>(key: K, value: DayEntry[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setStatus(null);
  };

  const numField = (value: number | null) => (value === null ? "" : String(value));

  const sleepPreview =
    draft.bedTime && draft.wakeTime ? minutesBetween(draft.bedTime, draft.wakeTime) : null;

  const addSession = () => {
    const minutes = Number(sessionMinutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 960) return;
    const next: StudySession = {
      subject: subject.trim() || "General",
      minutes: Math.round(minutes),
      startAt: startAt.trim() === "" ? null : startAt.trim(),
    };
    set("sessions", [...draft.sessions, next]);
    setSessionMinutes("");
    setStartAt("");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    const result = onSave({ ...draft, date });
    if (!result.ok) {
      setErrors(result.errors);
      setStatus(null);
      return;
    }
    setErrors({});
    justSaved.current = true;
    setStatus(existing ? "Day updated — the charts already moved." : "Logged. The rings filled.");
  };

  const errorCount = Object.keys(errors).length;
  const studyTotal = draft.sessions.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ci-eyebrow">Log</p>
          <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
            {existing ? "Edit this day" : "Add a day"}
          </h2>
        </div>
        <div className="ci-field min-w-[160px]">
          <label className="ci-label" htmlFor={`${uid}-date`}>
            Date
          </label>
          <input
            id={`${uid}-date`}
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
        {formatDate(date)}
        {existing ? " · already logged — saving updates it" : ""}
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

        {/* --------------------------------- sleep ---------------------------- */}
        <div ref={sleepRef} className="tk-block" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.sleep }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="ci-label flex items-center gap-1.5">
              <TrackerIcon id="sleep" size={13} />
              Sleep
            </span>
            {sleepPreview !== null ? (
              <span className="ci-num text-[12px]" style={{ color: "var(--ci-luteal)" }}>
                {Math.floor(sleepPreview / 60)}h {sleepPreview % 60}m
              </span>
            ) : null}
          </div>

          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <Field label="Bed" error={errors.bedTime}>
              <input
                type="time"
                className="ci-input"
                value={draft.bedTime ?? ""}
                disabled={disabled}
                onChange={(e) => set("bedTime", e.target.value === "" ? null : e.target.value)}
              />
            </Field>
            <Field label="Wake" error={errors.wakeTime}>
              <input
                type="time"
                className="ci-input"
                value={draft.wakeTime ?? ""}
                disabled={disabled}
                onChange={(e) => set("wakeTime", e.target.value === "" ? null : e.target.value)}
              />
            </Field>
            <Field label="Hours" error={errors.sleepMinutes} hint="Or type it directly">
              <input
                type="number"
                step="0.25"
                min={0}
                max={18}
                className="ci-input"
                placeholder="7.5"
                value={
                  draft.sleepMinutes === null ? "" : String(Math.round(draft.sleepMinutes / 15) * 15 / 60)
                }
                disabled={disabled}
                onChange={(e) =>
                  set(
                    "sleepMinutes",
                    e.target.value === "" ? null : Math.round(Number(e.target.value) * 60),
                  )
                }
              />
            </Field>
          </div>

          <div className="mt-3">
            <span className="ci-label">Quality</span>
            <CapsuleDock
              options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: QUALITY_LABEL[n]! }))}
              value={draft.sleepQuality}
              onSelect={(n) => set("sleepQuality", draft.sleepQuality === n ? null : n)}
              disabled={disabled}
            />
            {errors.sleepQuality ? (
              <p className="ci-error">
                <AlertCircle size={13} aria-hidden />
                {errors.sleepQuality}
              </p>
            ) : null}
          </div>
        </div>

        {/* --------------------------------- water ---------------------------- */}
        <div ref={waterRef} className="mt-3 tk-block" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.water }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="ci-label flex items-center gap-1.5">
              <TrackerIcon id="water" size={13} />
              Water
            </span>
            <span className="ci-num text-[12px]" style={{ color: "TRACKER_ACCENT.water" }}>
              <Metric value={draft.waterMl === null ? "0ml" : trackerDef("water").format(draft.waterMl)} />
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="number"
              step="50"
              min={0}
              max={8000}
              className="ci-input max-w-[140px]"
              placeholder="ml"
              aria-label="Water in millilitres"
              value={numField(draft.waterMl)}
              disabled={disabled}
              onChange={(e) => set("waterMl", e.target.value === "" ? null : Number(e.target.value))}
            />
            <div className="tk-quick" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.water }}>
              {[250, 500, 1000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  disabled={disabled}
                  onClick={() => set("waterMl", (draft.waterMl ?? 0) + amount)}
                >
                  +{amount >= 1000 ? "1L" : `${amount}`}
                </button>
              ))}
            </div>
          </div>
          {errors.waterMl ? (
            <p className="ci-error">
              <AlertCircle size={13} aria-hidden />
              {errors.waterMl}
            </p>
          ) : null}
        </div>

        {/* --------------------------------- study ---------------------------- */}
        <div ref={studyRef} className="mt-3 tk-block" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.study }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="ci-label flex items-center gap-1.5">
              <TrackerIcon id="study" size={13} />
              Study
            </span>
            <span className="ci-num text-[12px]" style={{ color: "TRACKER_ACCENT.study" }}>
              <Metric value={studyTotal === 0 ? "no sessions" : trackerDef("study").format(studyTotal)} />
            </span>
          </div>

          <CapsuleDock
            options={SUBJECTS.map((s) => ({ value: s, label: s }))}
            value={subject}
            onSelect={setSubject}
            disabled={disabled}
          />

          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="ci-field min-w-[110px]">
              <label className="ci-label" htmlFor={`${uid}-minutes`}>
                Minutes
              </label>
              <input
                id={`${uid}-minutes`}
                type="number"
                min={1}
                max={960}
                className="ci-input"
                placeholder="45"
                value={sessionMinutes}
                disabled={disabled}
                onChange={(e) => setSessionMinutes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSession();
                  }
                }}
              />
            </div>
            <div className="ci-field min-w-[110px]">
              <label className="ci-label" htmlFor={`${uid}-start`}>
                Started <span className="ci-muted">(optional)</span>
              </label>
              <input
                id={`${uid}-start`}
                type="time"
                className="ci-input"
                value={startAt}
                disabled={disabled}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={addSession}
              disabled={disabled || sessionMinutes.trim() === ""}
            >
              <Plus size={13} aria-hidden />
              Add
            </Button>
          </div>

          {draft.sessions.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {draft.sessions.map((s, i) => (
                <div className="tk-session" key={`${s.subject}-${i}`}>
                  <span>
                    {s.subject} · {trackerDef("study").format(s.minutes)}
                    {s.startAt ? ` · from ${s.startAt}` : ""}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${s.subject} session`}
                    disabled={disabled}
                    onClick={() =>
                      set(
                        "sessions",
                        draft.sessions.filter((_, index) => index !== i),
                      )
                    }
                  >
                    <X size={13} aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {errors.sessions ? (
            <p className="ci-error">
              <AlertCircle size={13} aria-hidden />
              {errors.sessions}
            </p>
          ) : null}
        </div>

        {/* ----------------------- movement · energy · screen ------------------ */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div ref={movementRef} className="tk-block" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.movement }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="ci-label flex items-center gap-1.5">
                <TrackerIcon id="movement" size={13} />
                Movement
              </span>
              <span className="ci-num text-[12px]" style={{ color: "TRACKER_ACCENT.movement" }}>
                {draft.movementMinutes === null
                  ? "—"
                  : <Metric value={trackerDef("movement").format(draft.movementMinutes)} />}
              </span>
            </div>
            <input
              type="number"
              min={0}
              max={480}
              step={5}
              className="ci-input mt-2"
              placeholder="minutes"
              aria-label="Movement minutes"
              value={numField(draft.movementMinutes)}
              disabled={disabled}
              onChange={(e) =>
                set("movementMinutes", e.target.value === "" ? null : Number(e.target.value))
              }
            />
            <div className="tk-quick mt-2" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.movement }}>
              {[10, 20, 30].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  disabled={disabled}
                  onClick={() => set("movementMinutes", (draft.movementMinutes ?? 0) + amount)}
                >
                  +{amount}
                </button>
              ))}
            </div>
            {errors.movementMinutes ? (
              <p className="ci-error">
                <AlertCircle size={13} aria-hidden />
                {errors.movementMinutes}
              </p>
            ) : null}
          </div>

          <div ref={energyRef} className="tk-block" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.energy }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="ci-label flex items-center gap-1.5">
                <TrackerIcon id="energy" size={13} />
                Energy
              </span>
              <span className="ci-num text-[12px]" style={{ color: "TRACKER_ACCENT.energy" }}>
                {draft.energy === null ? "—" : ENERGY_LABEL[draft.energy]}
              </span>
            </div>
            <CapsuleDock
              options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
              value={draft.energy}
              onSelect={(n) => set("energy", draft.energy === n ? null : n)}
              disabled={disabled}
            />
            {errors.energy ? (
              <p className="ci-error">
                <AlertCircle size={13} aria-hidden />
                {errors.energy}
              </p>
            ) : null}
          </div>

          <div ref={screenRef} className="tk-block" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.screen }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="ci-label flex items-center gap-1.5">
                <TrackerIcon id="screen" size={13} />
                Screen
              </span>
              <span className="ci-num text-[12px]" style={{ color: "TRACKER_ACCENT.screen" }}>
                {draft.screenMinutes === null
                  ? "—"
                  : <Metric value={trackerDef("screen").format(draft.screenMinutes)} />}
              </span>
            </div>
            <input
              type="number"
              min={0}
              max={20}
              step={0.25}
              className="ci-input mt-2"
              placeholder="hours"
              aria-label="Screen hours"
              value={
                draft.screenMinutes === null
                  ? ""
                  : String(Math.round((draft.screenMinutes / 60) * 100) / 100)
              }
              disabled={disabled}
              onChange={(e) =>
                set("screenMinutes", e.target.value === "" ? null : Math.round(Number(e.target.value) * 60))
              }
            />
            <div className="tk-quick mt-2" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.screen }}>
              {[30, 60, 120].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  disabled={disabled}
                  onClick={() => set("screenMinutes", (draft.screenMinutes ?? 0) + amount)}
                >
                  +{amount >= 60 ? `${amount / 60}h` : `${amount}m`}
                </button>
              ))}
            </div>
            {errors.screenMinutes ? (
              <p className="ci-error">
                <AlertCircle size={13} aria-hidden />
                {errors.screenMinutes}
              </p>
            ) : null}
          </div>
        </div>

        {/* --------------------------------- notes ---------------------------- */}
        <div className="ci-field mt-3">
          <label className="ci-label" htmlFor={`${uid}-notes`}>
            Notes <span className="ci-muted">(optional)</span>
          </label>
          <textarea
            id={`${uid}-notes`}
            className="ci-input"
            maxLength={400}
            value={draft.notes ?? ""}
            disabled={disabled}
            placeholder="Anything that made this day what it was."
            onChange={(e) => set("notes", e.target.value === "" ? null : e.target.value)}
          />
          <p className="ci-hint">{(draft.notes ?? "").length}/400 · private to this device</p>
          {errors.notes ? (
            <p className="ci-error">
              <AlertCircle size={13} aria-hidden />
              {errors.notes}
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
            {status}
          </p>
        </div>
      </form>
    </Card>
  );
}

export default LogPanel;
