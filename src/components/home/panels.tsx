import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Loader2,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { ProgressRing } from "./ProgressRing";
import { SIGNAL_COLOR, SIGNAL_ICON } from "./ConnectionMap";
import type {
  ActivityItem,
  FlowItem,
  FlowTimes,
  FocusItem,
  InsightItem,
  SignalReading,
  TodayScore,
} from "@/lib/home/today";
import { flowState } from "@/lib/home/today";

/* ------------------------------- progress -------------------------------- */

export function ProgressPanel({
  score,
  onLog,
  logging,
}: {
  score: TodayScore;
  onLog: () => void;
  logging?: boolean | undefined;
}) {
  return (
    <section className="home-panel flex flex-col gap-4 p-5" aria-labelledby="home-progress-title">
      <h2 id="home-progress-title" className="font-display text-xl">
        Today's progress
      </h2>
      <div className="mx-auto">
        <ProgressRing
          value={score.overall}
          caption={score.caption}
          label={`${score.overall}% ${score.caption}`}
        />
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground">
        <div>
          <dt>Habits</dt>
          <dd className="tabular-nums text-foreground">{score.habitPct}%</dd>
        </div>
        <div>
          <dt>Trackers</dt>
          <dd className="tabular-nums text-foreground">{score.trackerPct}%</dd>
        </div>
        <div>
          <dt>Mood</dt>
          <dd className="tabular-nums text-foreground">{score.moodPct}%</dd>
        </div>
      </dl>
      <div className="mt-auto flex items-end justify-between gap-3">
        <p className="font-display text-lg leading-snug text-muted-foreground">{score.note}</p>
        <button
          type="button"
          onClick={onLog}
          aria-label="Log today's metrics"
          title="Log today's metrics"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-surface-2/60 transition-colors hover:border-primary/60"
        >
          {logging ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </button>
      </div>
    </section>
  );
}

/* --------------------------------- focus --------------------------------- */

export function FocusPanel({
  items,
  onToggleHabit,
  onAddHabit,
}: {
  items: FocusItem[];
  onToggleHabit: (habitId: string) => void;
  onAddHabit: () => void;
}) {
  return (
    <section className="home-panel p-5" aria-labelledby="home-focus-title">
      <header className="flex items-center justify-between">
        <h2 id="home-focus-title" className="font-display text-xl">
          Today's focus
        </h2>
        <button
          type="button"
          onClick={onAddHabit}
          className="flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <Plus className="size-3.5" /> Habit
        </button>
      </header>
      {items.length === 0 ? (
        <p className="mt-4 text-sm leading-snug text-muted-foreground">
          Everything you track is logged for today. Nothing left to chase.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((f, i) => {
            const Icon: LucideIcon =
              f.kind === "habit"
                ? SIGNAL_ICON.habits
                : f.kind === "mood"
                  ? SIGNAL_ICON.mood
                  : f.kind === "cycle"
                    ? SIGNAL_ICON.cycle
                    : SIGNAL_ICON.energy;
            const body = (
              <>
                <span className="grid size-6 shrink-0 place-items-center rounded-md border border-border bg-surface-2/60 text-[11px] text-muted-foreground">
                  {i + 1}
                </span>
                <Icon className="size-4 text-primary" />
                <span className="min-w-0 flex-1 text-left">
                  <span
                    className={`block truncate text-sm ${f.done ? "line-through opacity-60" : ""}`}
                  >
                    {f.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{f.sub}</span>
                </span>
              </>
            );
            return (
              <li key={f.id} className="flex items-center gap-3">
                {f.habitId ? (
                  <button
                    type="button"
                    onClick={() => onToggleHabit(f.habitId!)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
                    aria-pressed={f.done}
                    aria-label={`${f.done ? "Undo" : "Complete"} ${f.title}`}
                  >
                    {body}
                    <span
                      className={`ml-auto grid size-4 shrink-0 place-items-center rounded-full border ${
                        f.done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      {f.done ? <Check className="size-3" /> : null}
                    </span>
                  </button>
                ) : (
                  <Link
                    to={f.to ?? "/"}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg"
                  >
                    {body}
                    <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------- trackers ------------------------------- */

export function TrackersPanel({ readings }: { readings: SignalReading[] }) {
  return (
    <section className="home-panel p-5" aria-labelledby="home-trackers-title">
      <header className="flex items-center justify-between">
        <h2 id="home-trackers-title" className="font-display text-xl">
          Trackers at a glance
        </h2>
        <Link
          to="/trackers"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          View all <ArrowUpRight className="size-3.5" />
        </Link>
      </header>
      <ul className="mt-5 grid grid-cols-3 gap-y-6 sm:grid-cols-6">
        {readings.map((t) => {
          const Icon = SIGNAL_ICON[t.id];
          const color = SIGNAL_COLOR[t.id];
          const r = 22;
          const c = 2 * Math.PI * r;
          return (
            <li
              key={t.id}
              className="group flex flex-col items-center gap-1.5"
              data-testid={`home-ring-${t.id}`}
            >
              <Link
                to={t.to}
                className="relative grid size-[52px] place-items-center rounded-full transition-transform duration-300 group-hover:scale-105"
                aria-label={`${t.label}: ${t.empty ? "nothing logged today" : t.value}`}
              >
                <svg width="52" height="52" className="absolute -rotate-90" aria-hidden>
                  <circle
                    cx="26"
                    cy="26"
                    r={r}
                    fill="none"
                    strokeWidth="3"
                    stroke="var(--home-secondary)"
                  />
                  <circle
                    cx="26"
                    cy="26"
                    r={r}
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke={color}
                    strokeDasharray={c}
                    strokeDashoffset={c - c * t.pct}
                    style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
                  />
                </svg>
                <Icon className="size-4" style={{ color, opacity: t.empty ? 0.55 : 1 }} />
              </Link>
              <span className="text-[11px]">{t.label}</span>
              <span className="text-[10px] tabular-nums text-muted-foreground">{t.value}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------------------------- flow --------------------------------- */

const FLOW_TIME_LABELS: { key: keyof FlowTimes; label: string }[] = [
  { key: "mood", label: "Mood check-in" },
  { key: "study", label: "Study block" },
  { key: "movement", label: "Movement" },
  { key: "reflection", label: "Evening reflection" },
];

export function FlowPanel({
  items,
  now,
  onToggleHabit,
  times,
  onTimeChange,
  onResetTimes,
  timesAreDefault = true,
}: {
  items: FlowItem[];
  now: Date;
  onToggleHabit: (habitId: string) => void;
  /** When given, a small clock button lets the person move the anchor times. */
  times?: FlowTimes | undefined;
  onTimeChange?: ((key: keyof FlowTimes, value: string) => void) | undefined;
  onResetTimes?: (() => void) | undefined;
  timesAreDefault?: boolean | undefined;
}) {
  const [editing, setEditing] = useState(false);
  const editable = Boolean(times && onTimeChange);
  return (
    <section className="home-panel p-5" aria-labelledby="home-flow-title">
      <header className="flex items-center justify-between gap-3">
        <h2 id="home-flow-title" className="font-display text-xl">
          Today's flow
        </h2>
        {editable ? (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
            aria-controls="home-flow-times"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            data-testid="home-flow-times-toggle"
          >
            <Clock3 className="size-3.5" /> {editing ? "Done" : "Times"}
          </button>
        ) : null}
      </header>
      {editable && editing && times && onTimeChange ? (
        <div
          id="home-flow-times"
          className="mt-3 rounded-xl border border-dashed border-border p-3"
          data-testid="home-flow-times"
        >
          <p className="text-[11px] leading-snug text-muted-foreground">
            When your day happens. Anything past its time reads as "missed", so set these to your
            own rhythm — a night shift can start at 21:00.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FLOW_TIME_LABELS.map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                {label}
                <input
                  type="time"
                  value={times[key]}
                  onChange={(e) => e.target.value && onTimeChange(key, e.target.value)}
                  className="rounded-lg border border-border bg-surface-2/40 px-2 py-1 text-sm tabular-nums text-foreground"
                  data-testid={`home-flow-time-${key}`}
                />
              </label>
            ))}
          </div>
          {!timesAreDefault && onResetTimes ? (
            <button
              type="button"
              onClick={onResetTimes}
              className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            >
              Back to the defaults
            </button>
          ) : null}
        </div>
      ) : null}
      <ol className="relative mt-4 space-y-5 pl-1">
        {items.map((f, i) => {
          const state = flowState(f, now);
          return (
            <li key={f.id} className="relative flex gap-4">
              <span className="w-11 pt-0.5 text-[11px] tabular-nums text-muted-foreground">
                {state === "now" ? <span className="text-primary">Now</span> : f.time}
              </span>
              <span className="relative flex flex-col items-center">
                <span
                  className={`size-3 rounded-full border ${
                    f.done
                      ? "border-primary bg-primary"
                      : state === "now"
                        ? "border-primary"
                        : "border-border bg-transparent"
                  }`}
                  style={
                    f.done && f.kind === "habit"
                      ? { background: f.color, borderColor: f.color }
                      : undefined
                  }
                />
                {i < items.length - 1 ? (
                  <span className="mt-1 w-px flex-1 border-l border-dashed border-border" />
                ) : null}
              </span>
              {f.habitId ? (
                <button
                  type="button"
                  onClick={() => onToggleHabit(f.habitId!)}
                  className="pb-1 text-left"
                  aria-pressed={f.done}
                  aria-label={`${f.done ? "Undo" : "Complete"} ${f.title}`}
                >
                  <span className={`block text-sm ${f.done ? "opacity-60" : ""}`}>{f.title}</span>
                  <span className="block text-xs text-muted-foreground">{f.sub}</span>
                </button>
              ) : (
                <span className="pb-1">
                  <span className={`block text-sm ${f.done ? "opacity-60" : ""}`}>{f.title}</span>
                  <span className="block text-xs text-muted-foreground">{f.sub}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* -------------------------------- insights ------------------------------- */

export function InsightsPanel({
  items,
  loading,
}: {
  items: InsightItem[];
  loading?: boolean | undefined;
}) {
  return (
    <section className="home-panel p-5" aria-labelledby="home-insights-title">
      <h2 id="home-insights-title" className="font-display text-xl">
        Insights for you
      </h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm leading-snug text-muted-foreground">
          {loading
            ? "Reading your record…"
            : "Insights appear once a few days of mood and tracker logs overlap. Nothing here is ever a guess."}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((ins) => {
            const Icon = SIGNAL_ICON[ins.signal];
            return (
              <li
                key={ins.id}
                className="flex gap-3 rounded-xl border border-border bg-surface-2/40 p-3 transition-colors hover:border-primary/40"
              >
                <span
                  className="home-node-glow grid size-9 shrink-0 place-items-center rounded-lg border bg-surface/70"
                  style={{ color: SIGNAL_COLOR[ins.signal], borderColor: "currentColor" }}
                >
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-[13px] leading-snug">{ins.title}</span>
                  <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                    {ins.sub}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------- activity ------------------------------- */

export function ActivityPanel({ items }: { items: ActivityItem[] }) {
  return (
    <section className="home-panel p-5" aria-labelledby="home-activity-title">
      <header className="flex items-center justify-between">
        <h2 id="home-activity-title" className="font-display text-xl">
          Recent activity
        </h2>
        <Link
          to="/profile"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          See all <ArrowUpRight className="size-3.5" />
        </Link>
      </header>
      {items.length === 0 ? (
        <p className="mt-4 text-sm leading-snug text-muted-foreground">
          Your first log will show up here.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((a) => {
            const Icon = SIGNAL_ICON[a.signal];
            return (
              <li key={a.id} className="flex items-center gap-3">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-lg border bg-surface/70"
                  style={{ color: SIGNAL_COLOR[a.signal], borderColor: "currentColor" }}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{a.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{a.sub}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
