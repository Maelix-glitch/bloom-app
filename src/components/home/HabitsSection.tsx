import { useMemo } from "react";
import { Check, Flame, Loader2, Plus, Sparkles } from "lucide-react";

import type { HabitToday } from "@/hooks/useHabits";
import { streakOf, type HabitLog } from "@/lib/home/habits";
import { habitColorVar } from "@/lib/home/today";

/**
 * HabitsSection — the dedicated habits block that sits directly under the
 * hero on Today. One tap toggles a habit (the same path the ring, the points
 * and the Coach read from); streaks are computed from the same logs.
 */
export function HabitsSection({
  habits,
  logs,
  today,
  loading,
  points,
  onToggle,
  onAdd,
}: {
  habits: HabitToday[];
  logs: HabitLog[];
  today: string;
  loading: boolean;
  points: number | null;
  onToggle: (id: string) => void;
  onAdd: () => void;
}) {
  const streaks = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of habits) m.set(h.id, streakOf(h, logs, today));
    return m;
  }, [habits, logs, today]);

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
            className="mt-1 font-display text-2xl leading-tight sm:text-3xl"
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
            const tone = `var(--${habitColorVar(h.color)})`;
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => onToggle(h.id)}
                  aria-pressed={h.done}
                  data-testid={`home-habit-${h.id}`}
                  className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
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
                    {h.iconUrl ? <img src={h.iconUrl} alt="" className="size-5 rounded" /> : h.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm font-medium ${h.done ? "text-muted-foreground line-through decoration-border" : ""}`}
                    >
                      {h.name}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                      <span>
                        {h.done
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
                          title={`${streak}-day streak`}
                        >
                          <Flame className="size-3" /> {streak}
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
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
