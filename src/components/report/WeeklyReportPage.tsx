/**
 * /report — the Weekly Bloom Report.
 *
 * Seven days of the real record, read back in one calm page: mood, habits,
 * body, cycle, and at most one insight that earned its sentence. Everything
 * comes from buildWeeklyReport — the same pure module the tests exercise —
 * so the page can never say a number the data doesn't contain.
 */

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Flame,
  GlassWater,
  MoonStar,
  PersonStanding,
  Smile,
  Sparkles,
} from "lucide-react";

import { AppNav } from "@/components/home/HomeSidebar";
import { useHabits } from "@/hooks/useHabits";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { useTrackers } from "@/hooks/useTrackers";
import { buildWeeklyReport } from "@/lib/report/weekly";
import { readPersonalVoice } from "@/lib/voice/personal";

function Delta({ now, prev, unit }: { now: number | null; prev: number | null; unit?: string }) {
  if (now === null || prev === null) return null;
  const d = Math.round((now - prev) * 10) / 10;
  if (d === 0) {
    return <span className="text-[11px] text-muted-foreground">level with last week</span>;
  }
  const up = d > 0;
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {up ? (
        <ArrowUpRight className="size-3 text-primary" />
      ) : (
        <ArrowDownRight className="size-3" />
      )}
      {Math.abs(d)}
      {unit ?? ""} vs last week
    </span>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface-1/60 p-5 sm:p-6">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const Stat = ({
  icon,
  value,
  caption,
}: {
  icon: React.ReactNode;
  value: string;
  caption: string;
}) => (
  <div className="flex items-start gap-3">
    <span className="mt-1 text-muted-foreground">{icon}</span>
    <span>
      <span className="block font-display text-[22px] leading-tight text-foreground">{value}</span>
      <span className="block text-[11.5px] text-muted-foreground">{caption}</span>
    </span>
  </div>
);

export function WeeklyReportPage() {
  const habits = useHabits();
  const mood = useMoodSystem();
  const trackers = useTrackers();
  const cycle = usePeriodLog();

  const report = useMemo(
    () =>
      buildWeeklyReport({
        today: cycle.today,
        habits: habits.habits.map((h) => ({ id: h.id, name: h.name })),
        habitLogs: habits.logs,
        moodEntries: mood.entries,
        trackerDays: trackers.days,
        goals: trackers.goals,
        cycle:
          cycle.mode === "tracking" && cycle.analysis.phase
            ? { phase: cycle.analysis.phaseLabel, cycleDay: cycle.analysis.cycleDay ?? 0 }
            : null,
      }),
    [habits.habits, habits.logs, mood.entries, trackers.days, trackers.goals, cycle],
  );

  const fmtHours = (min: number | null): string =>
    min === null ? "—" : `${Math.round((min / 60) * 10) / 10}h`;

  /* "Against your usual" — the week read against their own pre-week
     baseline. Only fields with real history on both sides appear. */
  const usualBodyLine = useMemo(() => {
    const u = report.usual;
    if (!u) return null;
    const parts: string[] = [];
    if (u.sleepMinutes !== null && report.trackers.sleepAvg !== null) {
      const delta = Math.round(report.trackers.sleepAvg - u.sleepMinutes);
      parts.push(
        `sleep ${delta === 0 ? "level with" : `${delta > 0 ? "+" : "−"}${fmtHours(Math.abs(delta))}`}`,
      );
    }
    if (u.waterMl !== null && report.trackers.waterAvg !== null) {
      const delta = Math.round((report.trackers.waterAvg - u.waterMl) / 50) * 50;
      parts.push(
        `water ${delta === 0 ? "level" : `${delta > 0 ? "+" : "−"}${Math.abs(delta) / 1000}L`}`,
      );
    }
    if (u.movementMinutes !== null && report.trackers.movementAvg !== null) {
      const delta = Math.round(report.trackers.movementAvg - u.movementMinutes);
      parts.push(
        `movement ${delta === 0 ? "level" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)}m`}`,
      );
    }
    return parts.length > 0 ? `Against your usual — ${parts.join(" · ")}` : null;
  }, [
    report.usual,
    report.trackers.sleepAvg,
    report.trackers.waterAvg,
    report.trackers.movementAvg,
  ]);

  /* Who the report is addressed to — name and honest tenure from onboarding,
     computed once. Absent an answer the header stays as it was. */
  const intro = useMemo(() => {
    const voice = readPersonalVoice();
    return {
      name: voice.name,
      tenureWeeks: voice.daysWithBloom === null ? null : Math.floor(voice.daysWithBloom / 7) + 1,
    };
  }, []);

  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="min-w-0 px-5 pb-28 pt-5 sm:px-8 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Today
        </Link>

        <header className="mt-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Weekly report · {report.weekStart} → {report.weekEnd}
          </p>
          <h1 className="mt-2 font-display text-[clamp(28px,5vw,44px)] italic leading-tight">
            {intro.name
              ? `Your week, ${intro.name} — read back to you.`
              : "Your week, read back to you."}
          </h1>
          {intro.tenureWeeks !== null ? (
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              Week {intro.tenureWeeks.toLocaleString()} of your Bloom record
              {report.insight ? " — one thing stands out below." : "."}
            </p>
          ) : null}
        </header>

        {report.insight ? (
          <p className="mt-6 flex max-w-2xl items-start gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-5 py-4 text-[14px] leading-relaxed text-foreground">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            {report.insight}
          </p>
        ) : null}

        {report.empty ? (
          <div className="mt-10 max-w-md rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-display text-[20px] italic">A quiet week so far.</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              The report writes itself from whatever you log — a mood, a tick, a night of sleep.
              Start small and come back on Sunday.
            </p>
            <Link
              to="/mood"
              className="mt-5 inline-block rounded-full bg-primary px-5 py-2 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Log a first mood
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid max-w-5xl gap-4 sm:grid-cols-2">
            <Card label="Mood">
              <div className="grid gap-5 sm:grid-cols-2">
                <Stat
                  icon={<Smile className="size-4" />}
                  value={String(report.mood.count)}
                  caption={report.mood.count === 1 ? "check-in this week" : "check-ins this week"}
                />
                <Stat
                  icon={<Sparkles className="size-4" />}
                  value={report.mood.avgMood !== null ? `${report.mood.avgMood}` : "—"}
                  caption="average mood / 10"
                />
              </div>
              <div className="mt-4 space-y-1.5">
                <Delta now={report.mood.avgMood} prev={report.mood.prevAvgMood} />
                {report.usual?.avgMood !== null &&
                report.usual?.avgMood !== undefined &&
                report.mood.avgMood !== null ? (
                  <p className="text-[12px] text-muted-foreground">
                    Against your usual check-in:{" "}
                    <span className="text-foreground">{report.mood.avgMood}</span> vs{" "}
                    {report.usual.avgMood} usually
                  </p>
                ) : null}
                {report.mood.dominant ? (
                  <p className="text-[12px] text-muted-foreground">
                    Most present feeling:{" "}
                    <span className="text-foreground">{report.mood.dominant}</span>
                  </p>
                ) : null}
                {report.mood.positiveShare !== null ? (
                  <div className="pt-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${Math.round(report.mood.positiveShare * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {Math.round(report.mood.positiveShare * 100)}% of check-ins carried a positive
                      feeling
                    </p>
                  </div>
                ) : null}
              </div>
            </Card>

            <Card label="Habits">
              <div className="grid gap-5 sm:grid-cols-2">
                <Stat
                  icon={<Flame className="size-4" />}
                  value={String(report.habits.ticks)}
                  caption={report.habits.ticks === 1 ? "tick this week" : "ticks this week"}
                />
                <Stat
                  icon={<Flame className="size-4 opacity-60" />}
                  value={report.habits.bestStreak ? `${report.habits.bestStreak.days}d` : "—"}
                  caption={
                    report.habits.bestStreak
                      ? `live streak · ${report.habits.bestStreak.name}`
                      : "no live streak yet"
                  }
                />
              </div>
              <div className="mt-4 space-y-1.5">
                <Delta now={report.habits.ticks} prev={report.habits.prevTicks} />
                {report.habits.topHabit ? (
                  <p className="text-[12px] text-muted-foreground">
                    Most ticked:{" "}
                    <span className="text-foreground">{report.habits.topHabit.name}</span> (
                    {report.habits.topHabit.ticks}×)
                  </p>
                ) : null}
              </div>
            </Card>

            <Card label="Body">
              <div className="grid gap-5 sm:grid-cols-3">
                <Stat
                  icon={<MoonStar className="size-4" />}
                  value={fmtHours(report.trackers.sleepAvg)}
                  caption="avg sleep"
                />
                <Stat
                  icon={<GlassWater className="size-4" />}
                  value={
                    report.trackers.waterAvg === null
                      ? "—"
                      : `${Math.round(report.trackers.waterAvg / 100) / 10}L`
                  }
                  caption="avg water"
                />
                <Stat
                  icon={<PersonStanding className="size-4" />}
                  value={
                    report.trackers.movementAvg === null
                      ? "—"
                      : `${Math.round(report.trackers.movementAvg)}m`
                  }
                  caption="avg movement"
                />
              </div>
              <div className="mt-4 space-y-1.5">
                <Delta
                  now={report.trackers.sleepAvg}
                  prev={report.trackers.sleepPrevAvg}
                  unit="m"
                />
                {usualBodyLine ? (
                  <p className="text-[12px] text-muted-foreground">{usualBodyLine}</p>
                ) : null}
                {report.trackers.sleepGoalShare !== null ? (
                  <p className="text-[12px] text-muted-foreground">
                    Sleep goal met on{" "}
                    <span className="text-foreground">
                      {Math.round(report.trackers.sleepGoalShare * 100)}%
                    </span>{" "}
                    of logged days
                  </p>
                ) : null}
              </div>
            </Card>

            <Card label="Cycle">
              {report.cycle ? (
                <div className="space-y-1">
                  <p className="font-display text-[22px] leading-tight">{report.cycle.phase}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {report.cycle.cycleDay > 0
                      ? `day ${report.cycle.cycleDay} of this cycle`
                      : "cycle day not yet placed"}
                  </p>
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Cycle isn't part of this Bloom, or is paused. The rest of the week still reads
                  fine without it.
                </p>
              )}
            </Card>
          </div>
        )}

        <p className="mt-10 max-w-md text-[11.5px] leading-relaxed text-muted-foreground">
          Computed on this device from what you logged. Estimates, not medical advice — and never a
          judgement.
        </p>
      </main>
    </div>
  );
}
