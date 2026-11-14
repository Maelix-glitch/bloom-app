import { useEffect, useMemo, useRef, useState } from "react";
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
import { toast } from "sonner";
import { STREAK_KEPT } from "@/lib/voice/copy";
import { pick } from "@/lib/voice/messages";
import { BloomIcon } from "@/components/icons/BloomIcon";
import { resolveHabitIcon } from "@/components/icons/habitIcons";
import { habitImageFailed, useHabitImage } from "@/components/icons/habitImage";
import { cn } from "@/lib/utils";

/**
 * Streak milestones that earn a quiet word of celebration. Deliberately
 * sparse: a tick that extends a streak to one of these gets a line from the
 * STREAK_KEPT pool, once — anything more frequent turns encouragement into
 * noise. Per-habit, remembered, and only fired on a tick made in this
 * session, never on opening the app with an old streak already standing.
 */
const STREAK_MILESTONES = [7, 14, 21, 30, 50, 100, 180, 250, 365];

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
 * The one line of real meta under a habit's name — its stored note first,
 * then its schedule (this week's count, a reminder time), then its streak.
 * Every part is read off the habit's own record; a habit with nothing real
 * to say gets NO line at all — the prototype's hint slot is never filled
 * with invented copy.
 */
function habitHint(h: HabitToday, streak: number, unit: string): string | null {
  const parts: string[] = [];
  if (h.note) parts.push(h.note);
  if (h.week) parts.push(`${h.week.done} of ${h.week.target} this week`);
  if (h.reminderTime) parts.push(`Around ${h.reminderTime}`);
  if (streak >= 2) parts.push(`${streak}${unit === "week" ? "-week" : "-day"} streak`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * HabitsSection — Today's rituals card, rebuilt to the prototype's
 * HabitsCard: a glass card whose header carries the day's count as a
 * serif title and a segmented pill per habit (gold when done), then one
 * full-width row per habit divided by hairlines — a 40px icon tile, the
 * name, a hint line only when the habit has real meta, its real points
 * value, and the round gold medallion check. The whole row is the toggle.
 *
 * Bloom's own life stays in the card: the "…" menu (edit, pause, backfill,
 * archive, delete), the missed-yesterday tick, the paused/archived shelf,
 * the streak-milestone toasts, and the Add Habit pill in the card footer
 * opening the same add-habit flow as everywhere else.
 *
 * One tap toggles a habit (the same path the points and the Coach read
 * from); streaks are computed from the same logs. Habit icons always show
 * something premium: photo → emoji → monogram, never a broken-image glyph.
 */
export function HabitsSection({
  habits,
  logs,
  today,
  loading,
  signedIn = false,
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
  /** Signed in, the account is the record: while it is still loading, any
      rows in state are the device mirror, not the account — show the
      skeleton instead of flashing them as real rows (defaults-flash). */
  signedIn?: boolean | undefined;
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
  /* While the account is still answering, the list is the skeleton — even
     if stale rows are sitting in state. (The hook holds the list empty on a
     signed-in cold load; this is the second line of defence.) */
  const showSkeleton = loading && (due === 0 || signedIn);

  /* Milestone celebrations: watch the streaks, celebrate only a crossing that
     happened here (previous streaks captured on mount, never toasted), once
     per habit per milestone, remembered across sessions. */
  const seenStreaks = useRef<Map<string, number> | null>(null);
  useEffect(() => {
    const prev = seenStreaks.current;
    if (prev === null) {
      /* First read after mount — baseline only, no celebration for history. */
      seenStreaks.current = new Map(habits.map((h) => [h.id, streaks.get(h.id) ?? 0]));
      return;
    }
    const next = new Map(prev);
    for (const habit of habits) {
      const now = streaks.get(habit.id) ?? 0;
      const before = prev.get(habit.id) ?? 0;
      next.set(habit.id, now);
      const crossed = STREAK_MILESTONES.find((m) => before < m && now >= m);
      if (crossed === undefined) continue;
      const storeKey = "bloom.voice.celebrated.v1";
      let celebrated: Record<string, number> = {};
      try {
        celebrated = JSON.parse(window.localStorage.getItem(storeKey) ?? "{}") as Record<
          string,
          number
        >;
      } catch {
        celebrated = {};
      }
      if ((celebrated[habit.id] ?? 0) >= crossed) continue;
      celebrated[habit.id] = crossed;
      try {
        window.localStorage.setItem(storeKey, JSON.stringify(celebrated));
      } catch {
        /* private mode — celebration just repeats after a reload, harmless */
      }
      toast(pick("voice.streak-kept", STREAK_KEPT), {
        description: `${crossed} days of ${habit.name}.`,
      });
    }
    seenStreaks.current = next;
  }, [habits, streaks]);

  const title = showSkeleton
    ? "Your habits today"
    : due === 0
      ? "No habits yet"
      : done === due
        ? `All ${due} habits are done.`
        : `${done} of ${due} habits done`;

  return (
    <section
      className="home-panel home-rise h-full p-5 sm:p-7"
      style={{ animationDelay: "130ms" }}
      aria-labelledby="home-habits-title"
      data-testid="home-habits-section"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="home-eyebrow">Today's rituals</p>
          <h2 id="home-habits-title" className="home-band-title mt-1">
            {title}
          </h2>
        </div>
        {/* Segmented pill progress — one segment per habit, gold when done. */}
        {due > 0 && !showSkeleton ? (
          <div
            className="flex items-center gap-1.5 pt-1"
            role="progressbar"
            aria-label="Habits completed today"
            aria-valuemin={0}
            aria-valuemax={due}
            aria-valuenow={done}
            data-testid="home-habits-segments"
          >
            {habits.map((h) => (
              <span
                key={h.id}
                className={cn(
                  "h-1.5 w-5 rounded-full transition-all duration-[var(--motion-page)]",
                  h.done ? "bg-gold" : "bg-white/10",
                )}
              />
            ))}
          </div>
        ) : null}
      </header>

      {showSkeleton ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Loading your habits…
        </p>
      ) : due === 0 ? (
        <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="font-display text-lg">No habits yet.</p>
            <p className="mt-1 max-w-[52ch] text-sm leading-snug text-muted-foreground">
              Add one small routine. It earns points when you tick it, and the Coach starts noticing
              it.
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
        <ul className="mt-2 divide-y divide-white/[0.05]">
          {habits.map((h) => {
            const streak = streaks.get(h.id) ?? 0;
            const unit = streakUnitOf(h);
            const tone = `var(--${habitColorVar(h.color)})`;
            const hint = habitHint(h, streak, unit);
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
                  className={cn(
                    "group flex w-full items-center gap-4 rounded-xl py-3.5 text-left transition-colors",
                    hasMenu && "pr-11",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl border text-lg transition-all duration-[var(--motion-standard)]",
                      h.done
                        ? "border-gold/25 bg-gold/10 text-gold"
                        : "border-white/10 bg-white/[0.03]",
                    )}
                    style={h.done ? undefined : { color: tone }}
                  >
                    <HabitIcon habit={h} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-[length:var(--text-body)] font-medium transition-colors",
                        h.done ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {h.name}
                    </span>
                    {hint ? (
                      <span className="mt-0.5 flex items-center gap-1.5 truncate text-[length:var(--text-caption)] text-muted-foreground">
                        {streak >= 2 ? (
                          <Flame
                            className="size-3 shrink-0"
                            style={{ color: "var(--home-energy)" }}
                            aria-hidden
                          />
                        ) : null}
                        <span className="truncate">{hint}</span>
                      </span>
                    ) : null}
                  </span>
                  {/* The habit's own points value — the same `h.points` the
                      toggle awards in useHabits (awardHabitPoints). */}
                  <span
                    className={cn(
                      "text-[length:var(--text-caption)] tabular-nums transition-colors",
                      h.done ? "text-gold/80" : "text-muted-foreground",
                    )}
                  >
                    +{h.points}
                  </span>
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border transition-all duration-[var(--motion-standard)]",
                      h.done
                        ? "scale-100 border-transparent text-[color:var(--gold-ink)]"
                        : "border-white/20 text-transparent group-hover:border-white/40",
                    )}
                    style={h.done ? { backgroundImage: "var(--gold-gradient)" } : undefined}
                    aria-hidden="true"
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                </button>
                {h.missedYesterday ? (
                  <button
                    type="button"
                    onClick={() => onToggle(h.id, h.missedYesterday!)}
                    className="mb-2 inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[length:var(--text-meta)] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
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

      {/* The owner's one addition to the prototype card: Bloom's Add Habit
          flow, kept — a quiet gold-outline pill in the card footer. */}
      {!showSkeleton && due > 0 ? (
        <div className="mt-4 border-t border-white/[0.05] pt-4">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/[0.07] px-4 py-2 text-[length:var(--text-support)] text-gold-soft transition-colors hover:bg-gold/[0.12]"
            data-testid="home-habits-add"
          >
            <Plus className="size-3.5" /> Add habit
          </button>
        </div>
      ) : null}

      {paused.length > 0 || archived.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4" data-testid="home-habits-aside">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[length:var(--text-meta)] uppercase tracking-[var(--tracking-wide)] text-muted-foreground">
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
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {paused.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-3 py-2.5 text-sm"
                  data-testid={`home-habit-paused-${h.id}`}
                >
                  <AsideGlyph habit={h} className="opacity-70" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{h.name}</span>
                    <span className="block text-[length:var(--text-meta)] text-muted-foreground">
                      Paused until {h.pausedUntil ? formatDateShort(h.pausedUntil) : "—"} · streak
                      kept
                    </span>
                  </span>
                  {actions.onResume ? (
                    <button
                      type="button"
                      className="home-chip text-[length:var(--text-meta)]"
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
                  <AsideGlyph habit={h} className="opacity-60" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{h.name}</span>
                    <span className="block text-[length:var(--text-meta)] text-muted-foreground">
                      Archived · history kept
                    </span>
                  </span>
                  {actions.onRestore ? (
                    <button
                      type="button"
                      className="home-chip text-[length:var(--text-meta)]"
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
 * if the picture is genuinely missing (or fails every load attempt), a letter
 * monogram in the habit's own colour steps in — the row never shows a
 * broken-image glyph.
 *
 * A photo that exists owns its tile while it loads (icons/habitImage): the
 * space is held and the photo fades in, so the tile no longer flip-flops
 * between the photo and the monogram on a transient decode error.
 *
 * Everything else resolves through the U4 rule (icons/habitIcons): bespoke
 * glyphs render as registry marks, catalogue emoji render as their bespoke
 * twins, and an emoji a person chose themselves still renders as itself.
 */
function HabitIcon({ habit }: { habit: Pick<Habit, "name" | "icon" | "iconType" | "iconUrl"> }) {
  const image = useHabitImage(habit.iconUrl);
  if (habit.iconUrl && !habitImageFailed(image.state)) {
    return (
      <span className="inline-block size-5 rounded bg-surface-2/60">
        <img
          key={image.state.attempt}
          src={habit.iconUrl}
          alt=""
          onLoad={image.onLoad}
          onError={image.onError}
          className={`size-5 rounded object-cover transition-opacity duration-[var(--motion-standard)] ${
            image.state.phase === "ready" ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>
    );
  }
  const resolved = resolveHabitIcon(habit.iconType, habit.icon);
  if (resolved.kind === "glyph") {
    return <BloomIcon name={resolved.name} size={17} />;
  }
  if (resolved.kind === "emoji") {
    return <>{resolved.value}</>;
  }
  return (
    <span aria-hidden="true" className="font-display text-base font-semibold leading-none">
      {habitMonogram(habit.name)}
    </span>
  );
}

/** First letter of the habit's name — the premium fallback when its picture is missing. */
function habitMonogram(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "★";
}

/** Paused/archived rows show the same resolved mark, quieter — same "never broken" rule. */
function AsideGlyph({
  habit,
  className,
}: {
  habit: Pick<Habit, "name" | "icon" | "iconType" | "iconUrl">;
  className?: string;
}) {
  const image = useHabitImage(habit.iconUrl);
  if (habit.iconUrl && !habitImageFailed(image.state)) {
    return (
      <span className={`inline-block size-4 rounded bg-surface-2/60 ${className ?? ""}`}>
        <img
          key={image.state.attempt}
          src={habit.iconUrl}
          alt=""
          onLoad={image.onLoad}
          onError={image.onError}
          className={`size-4 rounded object-cover transition-opacity duration-[var(--motion-standard)] ${
            image.state.phase === "ready" ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>
    );
  }
  const resolved = resolveHabitIcon(habit.iconType, habit.icon);
  if (resolved.kind === "glyph") {
    return (
      <span className={className}>
        <BloomIcon name={resolved.name} size={16} />
      </span>
    );
  }
  if (resolved.kind === "emoji") {
    return <span className={`text-base ${className ?? ""}`}>{resolved.value}</span>;
  }
  return (
    <span
      aria-hidden="true"
      className={`font-display text-base font-semibold leading-none ${className ?? ""}`}
    >
      {habitMonogram(habit.name)}
    </span>
  );
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
