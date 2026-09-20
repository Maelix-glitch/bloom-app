import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Flame, Plus, Sparkles, Target, TrendingUp, CalendarDays } from "lucide-react";

import { BloomHeader } from "@/components/BloomHeader";
import { useTrackers } from "@/hooks/useTrackers";
import { AddHabitModal } from "@/components/tk/AddHabitModal";
import { useHabits } from "@/hooks/useHabits";
import { TRACKERS } from "@/lib/trackers/core";
import { greetingFor } from "@/lib/home/today";
import { dayGreeting, readPersonalVoice } from "@/lib/voice/personal";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Bloom — Dashboard" },
      {
        name: "description",
        content:
          "Your personal wellness dashboard. Track habits, sleep, energy, study, movement, and more. Premium analytics and insights powered by your data.",
      },
    ],
  }),
  component: DashboardRoute,
});

/**
 * The analytics overview behind the admin door.
 *
 * This page had been left behind by two design generations — emoji stat
 * tiles, a hot-pink gradient button, hardcoded hexes and a Google Fonts
 * request of its own — while everything around it moved to the token
 * system. It now speaks the same language as Today: the same greeting shape
 * (time of day + name, from the person's own onboarding answer), the same
 * panels, chips and accents, no third-party fonts, no emoji. The numbers and
 * the actions are unchanged.
 */
function DashboardRoute() {
  const store = useTrackers();
  const habits = useHabits();
  const { analysis, hydrated } = store;
  const [addHabitOpen, setAddHabitOpen] = useState(false);

  /* Who the page is talking to — same source the coach uses. */
  const [voice] = useState(() => readPersonalVoice());

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Reading your record…</p>
      </div>
    );
  }

  const completion = Math.round(analysis.completion * 100);
  const stats = [
    { label: "Completion", value: `${completion}%`, icon: Target, color: "var(--home-movement)" },
    { label: "Streak", value: `${analysis.streak}d`, icon: Flame, color: "var(--home-energy)" },
    {
      label: "Days logged",
      value: `${analysis.daysLogged}`,
      icon: CalendarDays,
      color: "var(--home-sleep)",
    },
    {
      label: "Best streak",
      value: `${analysis.bestStreak}d`,
      icon: Sparkles,
      color: "var(--home-gold)",
    },
  ];

  return (
    <>
      <BloomHeader />
      <main className="min-h-dvh bg-background">
        <div className="mx-auto max-w-6xl px-4 py-10">
          {/* Hero — the same greeting shape as Today */}
          <header className="mb-10 text-center">
            <h1 className="font-display text-3xl leading-tight text-foreground sm:text-5xl">
              {dayGreeting(voice)}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {completion}% of your goals met today
            </p>
          </header>

          {/* Stats */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="home-panel p-5">
                <stat.icon className="size-5" style={{ color: stat.color }} aria-hidden="true" />
                <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {stat.label}
                </div>
                <div className="mt-1 font-display text-3xl tabular-nums text-foreground">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mb-10 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => setAddHabitOpen(true)} className="home-chip">
              <Plus className="size-4" aria-hidden="true" />
              Add a habit
            </button>
            <a href="/trackers" className="home-chip">
              <TrendingUp className="size-4" aria-hidden="true" />
              Open the trackers
            </a>
          </div>

          {/* Trackers */}
          <section aria-labelledby="dash-trackers-title" className="mb-10">
            <h2
              id="dash-trackers-title"
              className="mb-4 font-display text-xl text-foreground sm:text-2xl"
            >
              Your trackers
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {TRACKERS.map((def) => {
                const stat = analysis.trackers[def.id];
                const progress = Math.min(Math.max(stat.progress * 100, 0), 100);
                const isMet = stat.met === true;

                return (
                  <div key={def.id} className="home-panel p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-[15px] font-medium text-foreground">{def.name}</h3>
                      {isMet ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px]"
                          style={{
                            borderColor:
                              "color-mix(in oklab, var(--home-movement) 35%, transparent)",
                            color: "var(--home-movement)",
                          }}
                        >
                          <Check className="size-3" aria-hidden="true" />
                          Met
                        </span>
                      ) : null}
                    </div>

                    <div
                      className="mb-4 h-1.5 overflow-hidden rounded-full"
                      style={{
                        background: "color-mix(in oklab, var(--foreground) 10%, transparent)",
                      }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          background: def.accent,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted/40 px-2 py-2">
                        <div className="text-sm font-semibold tabular-nums text-foreground">
                          {stat.today === null ? "—" : def.format(Math.round(stat.today))}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                          Today
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/40 px-2 py-2">
                        <div className="text-sm font-semibold tabular-nums text-foreground">
                          {stat.avg7 === null ? "—" : def.format(Math.round(stat.avg7))}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                          7-day avg
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/40 px-2 py-2">
                        <div className="text-sm font-semibold tabular-nums text-foreground">
                          {def.format(stat.goal)}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                          Target
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Insights */}
          {analysis.observations.length > 0 ? (
            <section className="home-panel p-5 sm:p-7" aria-labelledby="dash-insights-title">
              <h2
                id="dash-insights-title"
                className="mb-3 flex items-center gap-2 font-display text-xl text-foreground"
              >
                <TrendingUp
                  className="size-5"
                  style={{ color: "var(--home-mood)" }}
                  aria-hidden="true"
                />
                Insights
              </h2>
              <ul>
                {analysis.observations.slice(0, 3).map((obs, i) => (
                  <li
                    key={i}
                    className="py-2.5 text-sm leading-relaxed text-muted-foreground odd:border-b odd:border-border/50"
                  >
                    {obs}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>

      {/* Add Habit Modal */}
      <AddHabitModal
        open={addHabitOpen}
        onClose={() => setAddHabitOpen(false)}
        onSubmit={async (habit) => {
          /* Writes to the same store Today uses — no separate path, no fake success. */
          await habits.addHabit(habit);
        }}
      />
    </>
  );
}
