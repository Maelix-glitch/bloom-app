/**
 * MoodPage — the Mood page, laid out exactly like the harmonious-dashboard
 * model (hero window → log your mood → your mood journey → mood distribution
 * → quick insights → streak & consistency → closing banner), with every
 * number read from the real Mood record:
 *
 *   • the six faces are quick check-ins — tapping one saves a MoodEntry
 *     (mood / energy / stress / emotion) through the same storage the
 *     Composer uses; the face lit up is today's latest entry;
 *   • "Log an entry" opens the full Composer (note, context signals, edits);
 *   • journey = the last 7 logged days, distribution = the real buckets over
 *     the selected range, insights = evidence-backed lines only, streak = the
 *     analytics layer's streak; the rest of Mood Intelligence (heatmap,
 *     correlations, patterns, calendar, history) lives one tap away.
 *
 * The model's own sidebar is ignored on purpose: Bloom's shared rail (AppNav)
 * is the chrome here, and the avatar block the model shows under its sidebar
 * lives at the foot of that rail (HomeSidebar → RailProfile).
 */

import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Bell,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  Leaf,
  Loader2,
  Plus,
  Quote,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";

import heroWindow from "@/assets/mood/hero-window.jpg";
import flowerBranch from "@/assets/mood/flower-branch.jpg";
import flowerDetail from "@/assets/mood/flower-detail.jpg";
import bokeh from "@/assets/mood/bokeh.jpg";
import candle from "@/assets/mood/candle.jpg";
import mountainLake from "@/assets/mood/mountain-lake.jpg";

import type { MoodSystem } from "@/hooks/useMoodSystem";
import type { MoodEntry, RangeKey } from "@/lib/mood/types";
import { contextFromTrackerDay, fillContext } from "@/lib/mood/context";
import { loadDays as loadTrackerDays } from "@/lib/trackers/store";
import { hasSupabaseConfig } from "@/lib/supabase";
import {
  PAGE_MOODS,
  distributionNote,
  distributionSlices,
  entryFromFace,
  faceForEntry,
  journeyPoints,
  localDay,
  quickInsights,
  streakLine,
  todayEntry,
  weekDots,
  consistencyDelta,
  type PageMood,
} from "@/lib/mood/page";
import { longDate } from "@/lib/home/today";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import type { BloomAccent } from "@/lib/profile/types";

import { MOOD_LABELS, MoodBlob } from "./MoodBlob";
import { MoodJourneyChart } from "./MoodJourneyChart";
import { MoodDonut } from "./MoodDonut";
import { MoodGraph } from "./MoodGraph";

export type MoodPageIdentity = {
  displayName: string | null;
  avatarPath: string | null;
  accent: BloomAccent;
  signedIn: boolean;
};

export function MoodPage({
  system,
  identity,
  onCompose,
  onEdit,
}: {
  system: MoodSystem;
  identity: MoodPageIdentity;
  onCompose: () => void;
  onEdit: (entry: MoodEntry) => void;
}) {
  const { entries, analytics: a, loading, sync, range, rangeKey, setRangeKey } = system;
  const today = useMemo(() => localDay(new Date().toISOString()), []);
  const todays = useMemo(() => todayEntry(entries, today), [entries, today]);
  const selected: PageMood | null = todays ? faceForEntry(todays) : null;
  const [saving, setSaving] = useState<PageMood | null>(null);

  /* Device first: a check-in is always possible; the account catches up. */
  const canSave = true;

  const tap = async (face: PageMood) => {
    if (!canSave || saving) return;
    setSaving(face);
    try {
      // Re-logging today replaces today's quick entry instead of stacking a
      // second one; a Composer entry with a note is left alone.
      const replace = todays && todays.tags.includes("quick-log") ? todays : null;
      const fresh = withTrackerContext(entryFromFace(face));
      await system.saveEntry(replace ? { ...fresh, id: replace.id } : fresh);
    } finally {
      setSaving(null);
    }
  };

  const journey = useMemo(() => journeyPoints(a.days, 7), [a.days]);
  const slices = useMemo(() => distributionSlices(a.days), [a.days]);
  const insights = useMemo(
    () =>
      quickInsights({
        entries: a.periodEntries,
        days: a.days,
        avg: a.avg,
        prevAvg: a.prevAvg,
        changePct: a.changePct,
        volatility: a.volatility.avgDelta,
        emotions: a.emotions,
      }),
    [a],
  );
  const dots = useMemo(() => weekDots(a.allDays, today), [a.allDays, today]);
  const delta = useMemo(() => consistencyDelta(a.allDays, today), [a.allDays, today]);
  const loggedThisWeek = dots.filter(Boolean).length;

  const firstName = identity.displayName ? identity.displayName.split(" ")[0]! : null;

  return (
    <div className="w-full space-y-10 px-5 pt-6 sm:px-8 sm:pt-7 md:space-y-14 lg:px-10 lg:pt-7">
      <TopBar identity={identity} />

      <Hero
        firstName={firstName}
        todays={todays}
        selected={selected}
        onCompose={onCompose}
        onEdit={onEdit}
      />

      <LogMood
        selected={selected}
        saving={saving}
        disabled={!canSave}
        sync={sync}
        onRetry={() => void system.retrySync()}
        onSelect={(m) => void tap(m)}
        onCompose={onCompose}
      />

      <MoodJourney
        loading={loading}
        points={journey}
        rangeKey={rangeKey}
        rangeLabel={range.label}
        onRange={setRangeKey}
        avg={a.avg}
        changePct={a.changePct}
        best={a.bestDay?.date ?? null}
      />

      <MoodGraph days={a.allDays} entries={entries} correlations={a.correlations} />

      <MoodDistribution
        slices={slices}
        total={a.days.length}
        note={distributionNote(a.days, range.label)}
        rangeKey={rangeKey}
        rangeLabel={range.label}
        onRange={setRangeKey}
      />

      <QuickInsights insights={insights} entries={entries.length} />

      <Streak
        streak={a.streak}
        dots={dots}
        delta={delta}
        line={streakLine(a.streak, delta, loggedThisWeek)}
      />

      <ClosingBanner />
    </div>
  );
}

/* --------------------------------- top bar -------------------------------- */

function TopBar({ identity }: { identity: MoodPageIdentity }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <p className="text-xs text-muted-foreground">{longDate(new Date())}</p>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          to="/rewards"
          aria-label="Rewards"
          title="Rewards"
          className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Bell className="h-4.5 w-4.5" strokeWidth={1.5} />
        </Link>
        <Link
          to="/profile"
          aria-label="Your profile"
          title="Your profile"
          className="hidden rounded-full lg:block"
        >
          <ProfileAvatar
            name={identity.displayName ?? "Bloom"}
            avatarPath={identity.avatarPath}
            accent={identity.accent}
            size={36}
          />
        </Link>
      </div>
    </header>
  );
}

/** A one-tap entry still carries what the day's trackers know (sleep, movement, study, screen). */
function withTrackerContext(entry: MoodEntry): MoodEntry {
  const day = loadTrackerDays().find((d) => d.date === localDay(entry.timestamp)) ?? null;
  return fillContext(entry, contextFromTrackerDay(day));
}

/** Where the record is — the same honest line trackers and cycle show. */
function MoodSyncLine({ sync, onRetry }: { sync: MoodSystem["sync"]; onRetry: () => void }) {
  if (sync.state === "loading") return null;
  const tone =
    sync.state === "error"
      ? "text-gold-soft"
      : sync.state === "signed-out"
        ? "text-muted-foreground"
        : "text-muted-foreground/80";
  return (
    <p
      className={`mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed ${tone}`}
      data-testid="mood-sync"
      data-state={sync.state}
      aria-live="polite"
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          sync.state === "saved"
            ? "bg-gold/70"
            : sync.state === "pending"
              ? "animate-pulse bg-gold/70"
              : sync.state === "error"
                ? "bg-gold-soft"
                : "bg-muted-foreground/50"
        }`}
        aria-hidden
      />
      <span>{sync.message}</span>
      {sync.state === "signed-out" && hasSupabaseConfig ? (
        <Link to="/profile" className="text-gold underline-offset-4 hover:underline">
          Sign in
        </Link>
      ) : null}
      {sync.state === "error" && sync.pending > 0 ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-gold underline-offset-4 hover:underline"
          data-testid="mood-sync-retry"
        >
          Retry now
        </button>
      ) : null}
    </p>
  );
}

/* ---------------------------------- hero ---------------------------------- */

function Hero({
  firstName,
  todays,
  selected,
  onCompose,
  onEdit,
}: {
  firstName: string | null;
  todays: MoodEntry | null;
  selected: PageMood | null;
  onCompose: () => void;
  onEdit: (entry: MoodEntry) => void;
}) {
  const dateLine = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <section className="relative overflow-hidden rounded-[calc(var(--radius)+0.5rem)]">
      <img
        src={heroWindow}
        alt="Arched window at golden hour with white flowers, books and a candle on the sill"
        width={1376}
        height={768}
        className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

      <div className="relative grid gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-12 lg:py-20">
        <div className="max-w-xl">
          <p className="mp-eyebrow">Mood tracker · {dateLine}</p>
          <h1 className="mt-6 font-display text-4xl leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
            {selected ? (
              <>
                Today you feel
                <span className="mt-1 block italic text-gold-soft">
                  {MOOD_LABELS[selected].toLowerCase()}
                  {firstName ? `, ${firstName}.` : "."}
                </span>
              </>
            ) : (
              <>
                How are you
                <span className="mt-1 block italic text-gold-soft">
                  feeling today{firstName ? `, ${firstName}` : ""}?
                </span>
              </>
            )}
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
            {todays ? (
              <>
                Logged at{" "}
                {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
                  new Date(todays.timestamp),
                )}
                {todays.note ? " with a note" : ""}.{" "}
                <button
                  type="button"
                  onClick={() => onEdit(todays)}
                  className="text-gold underline-offset-4 hover:underline"
                >
                  Refine it
                </button>{" "}
                or{" "}
                <button
                  type="button"
                  onClick={onCompose}
                  className="text-gold underline-offset-4 hover:underline"
                >
                  add another
                </button>
                .
              </>
            ) : (
              "A small check-in. A more mindful you."
            )}
          </p>
        </div>

        <div className="lg:pb-2 lg:text-right">
          <p className="font-display text-xl italic leading-relaxed text-gold-soft/90 sm:text-2xl">
            Feel it.
            <br />
            Understand it.
            <br />
            Grow from it.
          </p>
          <span className="mt-5 block h-px w-10 bg-gold/50 lg:ml-auto" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ section head ------------------------------ */

function SectionHead({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start gap-3.5">
        <Icon className="mt-1 h-5 w-5 shrink-0 text-gold" strokeWidth={1.5} />
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight text-foreground sm:text-[1.75rem]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* -------------------------------- log mood -------------------------------- */

function LogMood({
  selected,
  saving,
  disabled,
  sync,
  onRetry,
  onSelect,
  onCompose,
}: {
  selected: PageMood | null;
  saving: PageMood | null;
  disabled: boolean;
  sync: MoodSystem["sync"];
  onRetry: () => void;
  onSelect: (m: PageMood) => void;
  onCompose: () => void;
}) {
  return (
    <section className="mp-panel overflow-hidden" data-testid="mood-log">
      <div className="p-6 sm:p-9 lg:p-11">
        <SectionHead
          icon={Sparkles}
          title="Log your mood"
          subtitle="Take a moment. Be honest with yourself."
          action={
            <button
              type="button"
              onClick={onCompose}
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:px-6"
              style={{ backgroundImage: "var(--mp-gradient-gold)" }}
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">Log an entry</span>
            </button>
          }
        />

        <MoodSyncLine sync={sync} onRetry={onRetry} />

        <div className="mt-10 grid grid-cols-3 gap-x-4 gap-y-9 sm:grid-cols-6 sm:gap-x-6 lg:gap-x-8">
          {PAGE_MOODS.map((mood) => {
            const active = selected === mood;
            const busy = saving === mood;
            return (
              <button
                key={mood}
                type="button"
                onClick={() => onSelect(mood)}
                disabled={disabled || saving !== null}
                className="group flex flex-col items-center gap-4 disabled:cursor-not-allowed"
                aria-pressed={active}
                aria-label={`I feel ${MOOD_LABELS[mood].toLowerCase()}`}
                data-testid={`mood-face-${mood}`}
              >
                <span className={busy ? "animate-pulse" : undefined}>
                  <MoodBlob mood={mood} active={active} size={80} />
                </span>
                <span
                  className={`text-sm transition-colors ${
                    active ? "text-gold" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {MOOD_LABELS[mood]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative overflow-hidden border-t border-border">
        <img
          src={flowerBranch}
          alt=""
          width={1376}
          height={768}
          className="absolute inset-y-0 right-0 h-full w-2/3 object-cover opacity-30"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 to-surface/55" />

        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-11">
          <div className="flex min-w-0 items-start gap-4">
            <Quote className="mt-1 h-5 w-5 shrink-0 text-gold/60" strokeWidth={1.5} />
            <p className="font-display text-xl leading-relaxed text-foreground sm:text-2xl">
              Every emotion is valid.
              <br />
              It&rsquo;s part of your story.
            </p>
          </div>
          <p className="font-display text-lg italic leading-relaxed text-gold-soft/90 sm:text-xl lg:text-right">
            Same you.
            <br />
            Softer days.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- range pill ------------------------------- */

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
];

function RangePill({
  value,
  label,
  onChange,
}: {
  value: RangeKey;
  label: string;
  onChange: (k: RangeKey) => void;
}) {
  return (
    <label className="relative inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2.5 text-xs text-foreground/80 transition-colors hover:bg-secondary sm:text-sm">
      <span>{label}</span>
      <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
      <select
        aria-label="Period"
        value={RANGES.some((r) => r.key === value) ? value : "30d"}
        onChange={(e) => onChange(e.target.value as RangeKey)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {RANGES.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ------------------------------ mood journey ------------------------------ */

function MoodJourney({
  loading,
  points,
  rangeKey,
  rangeLabel,
  onRange,
  avg,
  changePct,
  best,
}: {
  loading: boolean;
  points: ReturnType<typeof journeyPoints>;
  rangeKey: RangeKey;
  rangeLabel: string;
  onRange: (k: RangeKey) => void;
  avg: number;
  changePct: number | null;
  best: string | null;
}) {
  const bestLabel = best
    ? new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(`${best}T12:00:00`))
    : null;
  return (
    <section className="mp-panel p-6 sm:p-9 lg:p-11" data-testid="mood-journey">
      <SectionHead
        icon={ChartNoAxesColumn}
        title="Your mood journey"
        subtitle="See how your mood flows over time."
        action={<RangePill value={rangeKey} label={rangeLabel} onChange={onRange} />}
      />

      <div className="mt-10 flex gap-5 sm:gap-8">
        <div className="hidden shrink-0 flex-col justify-between py-4 sm:flex">
          <MoodBlob mood="happy" size={30} active />
          <MoodBlob mood="neutral" size={30} active />
          <MoodBlob mood="sad" size={30} active />
        </div>
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="flex h-44 items-center justify-center gap-3 text-muted-foreground sm:h-56">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Reading your record…</span>
            </div>
          ) : points.length >= 2 ? (
            <MoodJourneyChart data={points} />
          ) : (
            <EmptyLine
              text={
                points.length === 1
                  ? "One day on the record. The line appears with your second check-in."
                  : "Your journey draws itself from your check-ins — nothing here is a placeholder."
              }
            />
          )}
        </div>
      </div>

      <div className="relative mt-10 overflow-hidden rounded-2xl border border-border">
        <img
          src={flowerDetail}
          alt=""
          width={1376}
          height={768}
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/60" />
        <div className="relative grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-8">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Leaf className="h-4.5 w-4.5 shrink-0 text-gold" strokeWidth={1.5} />
              <span className="font-display text-xl text-foreground">A small insight</span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/80 sm:text-base">
              {points.length >= 2
                ? changePct !== null && Math.abs(changePct) >= 1
                  ? `Your average mood is ${avg.toFixed(1)} out of 10 — ${changePct > 0 ? "up" : "down"} ${Math.abs(changePct).toFixed(0)}% on the period before.${bestLabel ? ` ${bestLabel} was your brightest day.` : ""}`
                  : `Your average mood is ${avg.toFixed(1)} out of 10 across the ${rangeLabel.toLowerCase()}.${bestLabel ? ` ${bestLabel} was your brightest day.` : ""}`
                : "Once a few days are logged, this is where the first pattern shows up."}
            </p>
            <span className="mt-5 block h-px w-10 bg-gold/50" />
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/10 sm:justify-self-end">
            <Sun className="h-6 w-6 text-gold" strokeWidth={1.5} />
          </span>
        </div>
      </div>
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-border px-6 text-center sm:h-56">
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

/* ---------------------------- mood distribution --------------------------- */

function MoodDistribution({
  slices,
  total,
  note,
  rangeKey,
  rangeLabel,
  onRange,
}: {
  slices: ReturnType<typeof distributionSlices>;
  total: number;
  note: string;
  rangeKey: RangeKey;
  rangeLabel: string;
  onRange: (k: RangeKey) => void;
}) {
  return (
    <section className="mp-panel p-6 sm:p-9 lg:p-11" data-testid="mood-distribution">
      <SectionHead
        icon={Sun}
        title="Mood distribution"
        subtitle="Where your days have been landing lately."
        action={<RangePill value={rangeKey} label={rangeLabel} onChange={onRange} />}
      />
      <div className="mt-10 grid gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-14">
        <div className="lg:max-w-md">
          <MoodDonut slices={slices} total={total} unit={total === 1 ? "day" : "days"} />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border">
          <img
            src={bokeh}
            alt=""
            width={1376}
            height={768}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-card/95 to-card/70" />
          <div className="relative p-7 sm:p-9">
            <p className="font-display text-2xl leading-snug text-foreground">
              You feel.
              <br />
              You heal.
              <br />
              You grow.
            </p>
            <span className="mt-6 block h-px w-10 bg-gold/50" />
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ quick insights ---------------------------- */

const INSIGHT_ICON = { trend: ChartNoAxesColumn, leaf: Leaf, sun: Sun } as const;

function QuickInsights({
  insights,
  entries,
}: {
  insights: ReturnType<typeof quickInsights>;
  entries: number;
}) {
  return (
    <section className="mp-panel p-6 sm:p-9 lg:p-11" data-testid="mood-insights">
      <SectionHead
        icon={Sun}
        title="Quick insights"
        subtitle="Gentle patterns we noticed in your entries."
        action={
          <Link
            to="/mood/intelligence"
            className="inline-flex items-center gap-2 text-sm text-gold transition-opacity hover:opacity-80"
          >
            See all
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        }
      />

      {insights.length > 0 ? (
        <ul className="mt-10 space-y-4">
          {insights.map(({ id, icon, text }) => {
            const Icon = INSIGHT_ICON[icon];
            return (
              <li key={id}>
                <Link
                  to="/mood/intelligence"
                  className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 rounded-2xl border border-border bg-card/70 p-5 text-left transition-colors hover:bg-card sm:p-6"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary">
                    <Icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 text-sm leading-relaxed text-foreground/85 sm:text-base">
                    {text}
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground">
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-10">
          <EmptyLine
            text={
              entries === 0
                ? "Insights are computed only from your own check-ins. The first ones appear after a couple of days."
                : "A couple more days and the first patterns will be here — nothing is guessed."
            }
          />
        </div>
      )}
    </section>
  );
}

/* ---------------------------------- streak -------------------------------- */

function Streak({
  streak,
  dots,
  delta,
  line,
}: {
  streak: number;
  dots: boolean[];
  delta: number | null;
  line: string;
}) {
  return (
    <section className="mp-panel relative overflow-hidden" data-testid="mood-streak">
      <img
        src={candle}
        alt=""
        width={1376}
        height={768}
        className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-25"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/95 to-surface/60" />

      <div className="relative p-6 sm:p-9 lg:p-11">
        <SectionHead
          icon={Zap}
          title="Streak & consistency"
          subtitle="Small check-ins, kept up gently."
        />

        <div className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-12 sm:divide-x sm:divide-border">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
            <div>
              <p
                className="font-display text-6xl leading-none text-gold"
                data-testid="mood-streak-value"
              >
                {streak}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {streak === 1 ? "day streak" : "day streak"}
              </p>
            </div>
            <div className="flex items-center gap-2.5" aria-label="Last seven days">
              {dots.map((done, i) => (
                <span
                  key={i}
                  className={`grid h-8 w-8 place-items-center rounded-full border ${
                    done ? "border-gold/50 bg-gold/15 text-gold" : "border-border text-transparent"
                  }`}
                >
                  <Check className="h-4 w-4" strokeWidth={2} />
                </span>
              ))}
            </div>
          </div>

          <div className="sm:pl-12">
            <p className="max-w-xs text-sm leading-relaxed text-foreground/85 sm:text-base">
              {line}
            </p>
            <div className="mt-6 flex items-center gap-3 text-gold">
              {delta === null ? (
                <span className="text-sm text-muted-foreground">
                  {dots.filter(Boolean).length} of 7 days this week
                </span>
              ) : (
                <>
                  {delta >= 0 ? (
                    <ArrowUp className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <ArrowDown className="h-4 w-4" strokeWidth={2} />
                  )}
                  <span className="text-sm tabular-nums">{Math.abs(delta)}%</span>
                  <span className="text-sm text-muted-foreground">vs last week</span>
                </>
              )}
              <ChartNoAxesColumn className="ml-2 h-5 w-5" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ closing banner ---------------------------- */

function ClosingBanner() {
  return (
    <section className="relative overflow-hidden rounded-[calc(var(--radius)+0.25rem)] border border-border">
      <img
        src={mountainLake}
        alt=""
        width={1376}
        height={768}
        className="absolute inset-0 h-full w-full object-cover opacity-40"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />

      <div className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-14">
        <div className="min-w-0">
          <p className="font-display text-2xl leading-snug text-foreground sm:text-3xl">
            A calmer mind
            <br />
            creates a brighter you.
          </p>
          <span className="mt-6 block h-px w-10 bg-gold/50" />
        </div>
        <Link
          to="/mood/intelligence"
          className="inline-flex items-center justify-center gap-2.5 rounded-full border border-gold/40 px-7 py-4 text-sm text-gold transition-colors hover:bg-gold/10 lg:justify-self-end"
        >
          Explore your insights
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>
    </section>
  );
}
