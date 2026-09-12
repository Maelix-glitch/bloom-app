import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  Flame,
  History,
  Loader2,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BACKFILL_DAYS, type HabitToday } from "@/hooks/useHabits";
import { streakOf, streakUnitOf, type Habit, type HabitLog } from "@/lib/home/habits";
import { habitColorVar } from "@/lib/home/today";
import { formatDateShort } from "@/lib/cycle/predict";
import { shiftDay } from "@/lib/localDay";

/** What the "…" menu on a habit row can do. All optional: read-only callers pass nothing. */
export interface HabitActions {
  onEdit?: ((id: string) => void) | undefined;
  onPause?: ((id: string, until: string) => void) | undefined;
  onResume?: ((id: string) => void) | undefined;
  onArchive?: ((id: string) => void) | undefined;
  onRestore?: ((id: string) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
}

/**
 * HabitsSection — the dedicated habits block that sits directly under the
 * hero on Today. One tap toggles a habit (the same path the ring, the points
 * and the Coach read from); streaks are computed from the same logs. The "…"
 * on each row edits, pauses, archives or deletes it — nothing about a habit
 * is permanent any more.
 *
 * Phone scale: the title sits one step smaller (text-xl) so the hero keeps its
 * air. Habit icons always show something premium: photo → emoji → monogram,
 * never a broken-image glyph.
 */
export function HabitsSection({
  habits,
  logs,
  today,
  loading,
  points,
  onToggle,
  onAdd,
  paused = [],
  archived = [],
  actions = {},
}: {
  habits: HabitToday[];
  logs: HabitLog[];
  today: string;
  loading: boolean;
  points: number | null;
  /** Tick/untick. `date` is a local day within the last week; omitted = today. */
  onToggle: (id: string, date?: string) => void;
  onAdd: () => void;
  paused?: Habit[] | undefined;
  archived?: Habit[] | undefined;
  actions?: HabitActions | undefined;
}) {
  const streaks = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of habits) m.set(h.id, streakOf(h, logs, today));
    return m;
  }, [habits, logs, today]);
  const [showArchive, setShowArchive] = useState(false);
  const hasMenu = Boolean(
    actions.onEdit || actions.onPause || actions.onArchive || actions.onDelete,
  );

  const done = habits.filter((h) => h.done).length;
  const due = habits.length;
  const pct = due === 0 ? 0 : Math.round((done / due) * 100);
  const bestStreak = Math.max(0, ...habits.map((h) => streaks.get(h.id) ?? 0));

  const summary =
    loading && due === 0
      ? "Reading your routines…"
      : due === 0
        ? "Small routines that shape the day — add your first one."
        : done === due
          ? `All ${due} done today. Lovely.`
          : `${done} of ${due} done today${due - done === 1 ? " — one to go." : "."}`;

  return (
    <section
      className="home-panel home-rise p-5 sm:p-7"
      style={{ animationDelay: "70ms" }}
      aria-labelledby="home-habits-title"
      data-testid="home-habits-section"
    >
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Habits</p>
          <h2
            id="home-habits-title"
            className="mt-1 font-display text-xl leading-tight sm:text-3xl"
          >
            Your habits today
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {points !== null ? (
            <span className="home-chip text-[11px] tabular-nums" title="Bloom points">
              <Sparkles className="size-3.5" style={{ color: "var(--home-gold)" }} />
              {points.toLocaleString()} pts
            </span>
          ) : null}
          {bestStreak >= 2 ? (
            <span className="home-chip text-[11px] tabular-nums" title="Longest current streak">
              <Flame className="size-3.5" style={{ color: "var(--home-energy)" }} />
              {bestStreak}-day streak
            </span>
          ) : null}
          <button
            type="button"
            onClick={onAdd}
            className="home-chip text-xs"
            data-testid="home-habits-add"
          >
            <Plus className="size-3.5" /> Add habit
          </button>
        </div>
      </header>

      {due > 0 ? (
        <div
          className="mt-5 h-1.5 overflow-hidden rounded-full"
          style={{ background: "var(--home-secondary)" }}
          role="progressbar"
          aria-label="Habits completed today"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--home-habits), var(--home-study))",
              transition: "width 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </div>
      ) : null}

      {loading && due === 0 ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Loading your habits…
        </p>
      ) : due === 0 ? (
        <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="font-display text-lg">No habits yet.</p>
            <p className="mt-1 max-w-[52ch] text-sm leading-snug text-muted-foreground">
              Add one small routine. It becomes part of today's ring, earns points when you tick it,
              and the Coach starts noticing it.
            </p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" /> Add your first habit
          </button>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {habits.map((h) => {
            const streak = streaks.get(h.id) ?? 0;
            const unit = streakUnitOf(h);
            const tone = `var(--${habitColorVar(h.color)})`;
            return (
              <li key={h.id} className="relative">
                {hasMenu ? (
                  <HabitMenu habit={h} today={today} actions={actions} onToggle={onToggle} />
                ) : null}
                <button
                  type="button"
                  onClick={() => onToggle(h.id)}
                  aria-pressed={h.done}
                  data-testid={`home-habit-${h.id}`}
                  className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                    hasMenu ? "pr-11" : ""
                  } ${
                    h.done
                      ? "border-primary/50 bg-primary/10"
                      : "border-border bg-surface-2/40 hover:border-primary/40"
                  }`}
                >
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-lg"
                    style={{
                      background: `color-mix(in oklab, ${tone} 16%, transparent)`,
                      color: tone,
                    }}
                  >
                    <HabitIcon habit={h} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm font-medium ${h.done ? "text-muted-foreground line-through decoration-border" : ""}`}
                    >
                      {h.name}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                      <span>
                        {h.week
                          ? h.done
                            ? `${h.week.done} of ${h.week.target} this week`
                            : `${h.week.done} of ${h.week.target} this week${
                                h.reminderTime ? ` · around ${h.reminderTime}` : ""
                              }`
                          : h.done
                            ? "Done"
                            : h.reminderTime
                              ? `Around ${h.reminderTime}`
                              : "Anytime today"}
                      </span>
                      <span className="tabular-nums">· +{h.points} pts</span>
                      {streak >= 2 ? (
                        <span
                          className="inline-flex items-center gap-0.5 tabular-nums"
                          style={{ color: "var(--home-energy)" }}
                          title={`${streak}-${unit} streak`}
                        >
                          <Flame className="size-3" /> {streak}
                          {unit === "week" ? "w" : ""}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border transition-colors ${
                      h.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border group-hover:border-primary/60"
                    }`}
                    aria-hidden="true"
                  >
                    {h.done ? <Check className="size-3.5" /> : null}
                  </span>
                </button>
                {h.missedYesterday ? (
                  <button
                    type="button"
                    onClick={() => onToggle(h.id, h.missedYesterday!)}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                    data-testid={`home-habit-yesterday-${h.id}`}
                    title="Forgot to tick it before bed? Add yesterday's tick and keep the streak."
                  >
                    <History className="size-3" /> Did it yesterday? Tick it — keeps your streak
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {paused.length > 0 || archived.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4" data-testid="home-habits-aside">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {paused.length > 0 && archived.length > 0
                ? "Paused & archived"
                : paused.length > 0
                  ? "Paused"
                  : "Archived"}
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setShowArchive((v) => !v)}
              aria-expanded={showArchive}
              data-testid="home-habits-aside-toggle"
            >
              {showArchive ? "Hide" : `Show ${paused.length + archived.length}`}
            </button>
          </div>
          {showArchive ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {paused.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-3 py-2.5 text-sm"
                  data-testid={`home-habit-paused-${h.id}`}
                >
                  <span className="text-base opacity-70">{asideGlyph(h)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{h.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      Paused until {h.pausedUntil ? formatDateShort(h.pausedUntil) : "—"} · streak
                      kept
                    </span>
                  </span>
                  {actions.onResume ? (
                    <button
                      type="button"
                      className="home-chip text-[11px]"
                      onClick={() => actions.onResume?.(h.id)}
                    >
                      <PlayCircle className="size-3.5" /> Resume
                    </button>
                  ) : null}
                </li>
              ))}
              {archived.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-3 py-2.5 text-sm opacity-80"
                  data-testid={`home-habit-archived-${h.id}`}
                >
                  <span className="text-base opacity-60">{asideGlyph(h)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{h.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      Archived · history kept
                    </span>
                  </span>
                  {actions.onRestore ? (
                    <button
                      type="button"
                      className="home-chip text-[11px]"
                      onClick={() => actions.onRestore?.(h.id)}
                    >
                      <ArchiveRestore className="size-3.5" /> Restore
                    </button>
                  ) : null}
                  {actions.onDelete ? (
                    <button
                      type="button"
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={`Delete ${h.name}`}
                      onClick={() => actions.onDelete?.(h.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * The little picture tile on a habit row. Custom photos crop to fill the tile;
 * if the picture is missing or fails to load, a letter monogram in the habit's
 * own colour steps in — the row never shows a broken-image glyph.
 */
function HabitIcon({ habit }: { habit: Pick<Habit, "name" | "icon" | "iconUrl"> }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = habit.iconUrl && habit.iconUrl !== failedSrc ? habit.iconUrl : null;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="size-5 rounded object-cover"
        onError={() => setFailedSrc(src)}
      />
    );
  }
  if (isMissingIcon(habit.icon)) {
    return (
      <span aria-hidden="true" className="font-display text-base font-semibold leading-none">
        {habitMonogram(habit.name)}
      </span>
    );
  }
  return <>{habit.icon}</>;
}

/** True when the saved icon is the "custom picture went missing" placeholder (or nothing). */
function isMissingIcon(icon: string): boolean {
  return icon === "" || icon === "🖼️";
}

/** First letter of the habit's name — the premium fallback when its picture is missing. */
function habitMonogram(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "★";
}

/** Paused/archived rows render the icon as plain text — same "never broken" rule. */
function asideGlyph(habit: Pick<Habit, "name" | "icon">): string {
  return isMissingIcon(habit.icon) ? habitMonogram(habit.name) : habit.icon;
}

/** The "…" on a habit row. Edit, pause (with three sensible lengths), archive, delete. */
function HabitMenu({
  habit,
  today,
  actions,
  onToggle,
}: {
  habit: HabitToday;
  today: string;
  actions: HabitActions;
  onToggle: (id: string, date?: string) => void;
}) {
  const pauseOptions: { label: string; until: string }[] = [
    { label: "Pause for the rest of today", until: today },
    { label: "Pause for 3 days", until: shiftDay(today, 2) },
    { label: "Pause for a week", until: shiftDay(today, 6) },
    { label: "Pause for two weeks", until: shiftDay(today, 13) },
  ];
  /* the last week, most recent first — the same tick, just dated */
  const backfill = Array.from({ length: BACKFILL_DAYS - 1 }, (_, i) => shiftDay(today, -(i + 1)));
  const label = (date: string, i: number) =>
    i === 0
      ? "Yesterday"
      : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="absolute right-2 top-2 z-[1] grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          aria-label={`More for ${habit.name}`}
          data-testid={`home-habit-menu-${habit.id}`}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[230px] border-border bg-surface-2">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger data-testid={`home-habit-backfill-${habit.id}`}>
            <History className="size-4" /> Tick a past day
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-[200px] border-border bg-surface-2">
            {backfill.map((date, i) => (
              <DropdownMenuItem
                key={date}
                onSelect={() => onToggle(habit.id, date)}
                data-testid={`home-habit-backfill-${habit.id}-${date}`}
              >
                {label(date, i)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {actions.onEdit ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => actions.onEdit?.(habit.id)}>
              <Pencil className="size-4" /> Edit habit
            </DropdownMenuItem>
          </>
        ) : null}
        {actions.onPause ? (
          <>
            <DropdownMenuSeparator />
            {pauseOptions.map((o) => (
              <DropdownMenuItem key={o.until} onSelect={() => actions.onPause?.(habit.id, o.until)}>
                <PauseCircle className="size-4" /> {o.label}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        {actions.onArchive || actions.onDelete ? <DropdownMenuSeparator /> : null}
        {actions.onArchive ? (
          <DropdownMenuItem onSelect={() => actions.onArchive?.(habit.id)}>
            <Archive className="size-4" /> Archive — keep its history
          </DropdownMenuItem>
        ) : null}
        {actions.onDelete ? (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => actions.onDelete?.(habit.id)}
          >
            <Trash2 className="size-4" /> Delete habit and its ticks
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}