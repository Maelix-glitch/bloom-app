import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Droplet, Gift, Loader2, PenLine, Smile } from "lucide-react";

import { BloomHeader } from "@/components/BloomHeader";
import { BloomMark, HomeMobileNav, HomeSidebar } from "@/components/home/HomeSidebar";
import { ConnectionMap } from "@/components/home/ConnectionMap";
import { CoachPanel } from "@/components/home/CoachPanel";
import {
  ActivityPanel,
  FlowPanel,
  FocusPanel,
  HabitsPanel,
  InsightsPanel,
  ProgressPanel,
  TrackersPanel,
} from "@/components/home/panels";
import { MetricsEntryModal } from "@/components/tk/MetricsEntryModal";
import { Composer } from "@/components/mood/Composer";
import { AddHabitModal } from "@/components/tk/AddHabitModal";

import { useTrackers } from "@/hooks/useTrackers";
import { useHabits } from "@/hooks/useHabits";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { useProfileSpace } from "@/hooks/useProfileSpace";
import {
  activityOf,
  connections,
  flowOf,
  focusOf,
  greetingFor,
  insightsOf,
  longDate,
  moodToday,
  readings,
  scoreOf,
} from "@/lib/home/today";
import type { HabitDraft } from "@/lib/home/habits";

import windowDusk from "@/assets/home/window-dusk.jpg";
import leafDark from "@/assets/home/leaf-dark.jpg";

const TITLE = "Bloom — Today";
const DESCRIPTION =
  "Bloom is a calm daily companion: track mood, sleep, habits, study, cycle and energy, and see how they connect in one living map.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TodayPage,
});

function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    const tick = () => setNow(new Date());
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, [intervalMs]);
  return now;
}

function TodayPage() {
  const trackers = useTrackers();
  const habits = useHabits();
  const mood = useMoodSystem();
  const cycle = usePeriodLog();
  const space = useProfileSpace();
  const now = useNow();

  const [metricsOpen, setMetricsOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [habitNotice, setHabitNotice] = useState<string | null>(null);

  const today = trackers.today;
  const identity = space.identity?.identity ?? null;
  const displayName =
    identity && identity.displayName && identity.displayName !== "Bloom User"
      ? identity.displayName
      : null;
  const firstName = displayName ? displayName.split(" ")[0]! : null;
  const initial = (firstName ?? "B").charAt(0).toUpperCase();

  const moodEntry = useMemo(() => moodToday(mood.entries, today), [mood.entries, today]);
  const moodDays = mood.analytics.days;

  const signalReadings = useMemo(
    () =>
      readings({
        trackers: trackers.analysis,
        habits: { completedToday: habits.completedToday, dueToday: habits.dueToday },
        mood: moodEntry,
        cycle: cycle.analysis,
      }),
    [trackers.analysis, habits.completedToday, habits.dueToday, moodEntry, cycle.analysis],
  );

  const score = useMemo(
    () =>
      scoreOf({
        trackers: trackers.analysis,
        habits: { completedToday: habits.completedToday, dueToday: habits.dueToday },
        mood: moodEntry,
      }),
    [trackers.analysis, habits.completedToday, habits.dueToday, moodEntry],
  );

  const map = useMemo(
    () =>
      connections({
        trackers: trackers.analysis,
        habits: {
          habits: habits.habits,
          logs: habits.logs,
          completedToday: habits.completedToday,
          dueToday: habits.dueToday,
        },
        moodEntries: mood.entries,
        moodDays,
        moodCorrelations: mood.analytics.correlations,
        cycle: cycle.analysis,
        today,
      }),
    [
      trackers.analysis,
      habits.habits,
      habits.logs,
      habits.completedToday,
      habits.dueToday,
      mood.entries,
      moodDays,
      mood.analytics.correlations,
      cycle.analysis,
      today,
    ],
  );

  const flow = useMemo(
    () => flowOf({ habits: habits.todayHabits, mood: moodEntry, trackers: trackers.analysis, now }),
    [habits.todayHabits, moodEntry, trackers.analysis, now],
  );

  const focus = useMemo(
    () =>
      focusOf({
        habits: habits.todayHabits,
        mood: moodEntry,
        trackers: trackers.analysis,
        cycle: cycle.analysis,
      }),
    [habits.todayHabits, moodEntry, trackers.analysis, cycle.analysis],
  );

  const insights = useMemo(
    () =>
      insightsOf({
        trackers: trackers.analysis,
        moodInsights: mood.analytics.insights,
        moodCorrelations: mood.analytics.correlations,
        habits: { habits: habits.habits, logs: habits.logs },
        cycle: cycle.analysis,
        today,
      }),
    [
      trackers.analysis,
      mood.analytics.insights,
      mood.analytics.correlations,
      habits.habits,
      habits.logs,
      cycle.analysis,
      today,
    ],
  );

  const activity = useMemo(
    () =>
      activityOf({
        habits: { habits: habits.habits, logs: habits.logs },
        moodEntries: mood.entries,
        trackers: trackers.analysis,
        cycle: cycle.analysis,
      }),
    [habits.habits, habits.logs, mood.entries, trackers.analysis, cycle.analysis],
  );

  const openCount = focus.filter((f) => !f.done).length;
  const subline =
    !trackers.hydrated || habits.loading
      ? "Reading today's record…"
      : openCount === 0
        ? "Everything you track is logged. Enjoy the quiet."
        : openCount === 1
          ? "One thing left to shape your day."
          : `${["Two", "Three"][openCount - 2] ?? openCount} things left to shape your day.`;

  const syncLine =
    trackers.sync.state === "off"
      ? "Saved on this device"
      : trackers.sync.state === "signed-out"
        ? "Saved on this device — sign in to sync"
        : trackers.sync.message || null;

  const addHabit = async (draft: HabitDraft) => {
    try {
      await habits.addHabit(draft);
      setHabitNotice(null);
    } catch (e) {
      console.warn("[bloom:home] add habit:", e);
      setHabitNotice(
        "That habit couldn't be saved to your account. It's kept on this device for now.",
      );
      throw e;
    }
  };

  return (
    <div className="home-page min-h-screen bg-background text-foreground">
      {/* Bloom's shared header — same brand mark and nav as every other page. */}
      <BloomHeader />

      <div className="flex min-h-[calc(100vh-54px)]">
        <HomeSidebar />

        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-7 lg:pb-8">
          {/* top bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:hidden">
              <BloomMark size={20} id="bloomBrandGradientTop" />
              <span className="font-display text-xl">Bloom</span>
            </div>
            <p className="hidden text-xs text-muted-foreground lg:block">
              {longDate(now)}
              {syncLine ? <span className="ml-3 text-faint">· {syncLine}</span> : null}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMoodOpen(true)}
                aria-label="Log your mood"
                title="Log your mood"
                className="grid size-9 place-items-center rounded-full border border-border bg-surface-2/50 text-muted-foreground transition-colors hover:text-foreground"
              >
                <PenLine className="size-4" />
              </button>
              <Link
                to="/rewards"
                aria-label="Rewards"
                title="Rewards"
                className="relative grid size-9 place-items-center rounded-full border border-border bg-surface-2/50 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Bell className="size-4" />
                {habits.points !== null && habits.points > 0 ? (
                  <span
                    className="absolute right-2 top-2 size-1.5 rounded-full"
                    style={{ background: "var(--home-cycle)" }}
                  />
                ) : null}
              </Link>
              <Link
                to="/profile"
                aria-label="Your profile"
                className="grid size-9 place-items-center rounded-full border border-primary/40 bg-surface-3/60 text-xs"
              >
                {initial}
              </Link>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground lg:hidden">{longDate(now)}</p>

          {/* hero */}
          <header className="home-rise mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <h1 className="font-display text-4xl leading-tight sm:text-5xl">
                {firstName ? (
                  <>
                    {greetingFor(now.getHours())},{" "}
                    <em className="home-text-gradient italic">{firstName}.</em>
                  </>
                ) : (
                  <em className="home-text-gradient italic">{greetingFor(now.getHours())}.</em>
                )}
              </h1>
              <p className="mt-1 font-display text-2xl text-muted-foreground sm:text-3xl">
                {subline}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => setMoodOpen(true)} className="home-chip">
                  <Smile className="size-4" style={{ color: "var(--home-habits)" }} />
                  {moodEntry ? `Mood ${Math.round(moodEntry.mood)}/10 logged` : "Log today's mood"}
                </button>
                <button type="button" onClick={() => setMetricsOpen(true)} className="home-chip">
                  <Droplet className="size-4" style={{ color: "var(--home-sleep)" }} />
                  {trackers.analysis.goalsMetToday > 0
                    ? `${trackers.analysis.goalsMetToday} of 6 goals met`
                    : "Log today's metrics"}
                </button>
                <Link to="/rewards" className="home-chip">
                  <Gift className="size-4" style={{ color: "var(--home-cycle)" }} />
                  {habits.points !== null ? `${habits.points.toLocaleString()} points` : "Rewards"}
                </Link>
              </div>
              {space.authState === "signed-out" ? (
                <p className="mt-4 text-[12px] text-muted-foreground">
                  You're browsing on this device only.{" "}
                  <Link
                    to="/profile"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Sign in
                  </Link>{" "}
                  to sync habits, mood, cycle and trackers to your account.
                </p>
              ) : null}
              {habits.error || habitNotice ? (
                <p className="mt-3 text-[12px] text-rose" role="status">
                  {habitNotice ?? habits.error}
                </p>
              ) : null}
            </div>

            <figure className="relative hidden overflow-hidden rounded-2xl border border-border lg:block">
              <img
                src={windowDusk}
                alt="A journal open on a desk beside a window at dusk"
                width={928}
                height={720}
                className="h-full w-full object-cover"
              />
              <figcaption className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-background/90 via-background/20 to-background/70 p-4">
                <span className="font-display text-sm italic leading-snug text-muted-foreground">
                  Discipline today, freedom tomorrow.
                  <span className="mt-2 block h-px w-8 bg-border" />
                </span>
                <span className="font-display text-2xl leading-snug">
                  Same person. A more intentional day.
                </span>
              </figcaption>
            </figure>
          </header>

          {/* main grid */}
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
                <ProgressPanel
                  score={score}
                  onLog={() => setMetricsOpen(true)}
                  logging={!trackers.hydrated}
                />
                <ConnectionMap nodes={map.nodes} links={map.links} name={firstName} />
              </div>
              <TrackersPanel readings={signalReadings} />
              <HabitsPanel
                habits={habits.todayHabits}
                loading={habits.loading}
                onToggle={(id) => void habits.toggle(id)}
                onAdd={() => setHabitOpen(true)}
                points={habits.points}
              />
              <div className="grid gap-5 md:grid-cols-2">
                <FlowPanel items={flow} now={now} onToggleHabit={(id) => void habits.toggle(id)} />
                <InsightsPanel items={insights} loading={mood.loading || !trackers.hydrated} />
              </div>
            </div>

            <div className="grid gap-5 lg:content-start">
              <FocusPanel
                items={focus}
                onToggleHabit={(id) => void habits.toggle(id)}
                onAddHabit={() => setHabitOpen(true)}
              />
              <CoachPanel entries={mood.entries} habitsStore={habits} />
              <figure className="relative overflow-hidden rounded-2xl border border-border">
                <img
                  src={leafDark}
                  alt="A single green leaf lit against darkness"
                  loading="lazy"
                  width={992}
                  height={672}
                  className="h-44 w-full object-cover"
                />
                <figcaption className="absolute inset-0 flex items-start bg-gradient-to-r from-background/95 via-background/60 to-transparent p-4 font-display text-xl leading-snug">
                  Small steps every day lead to big changes.
                </figcaption>
              </figure>
              <ActivityPanel items={activity} />
            </div>
          </div>

          <footer className="mt-10 hidden items-center justify-center gap-6 text-[11px] tracking-[0.3em] text-muted-foreground lg:flex">
            <span className="font-display text-base tracking-[0.5em]">BLOOM</span>
            <span className="h-px w-16 bg-border" />
            <span>A MORE INTENTIONAL DAY, EVERYWHERE</span>
          </footer>
        </main>
      </div>

      <HomeMobileNav />

      {/* the same three entry surfaces the rest of Bloom uses — one data path each */}
      <MetricsEntryModal
        store={trackers}
        open={metricsOpen}
        onClose={() => setMetricsOpen(false)}
      />
      <Composer
        open={moodOpen}
        initial={moodEntry}
        onClose={() => setMoodOpen(false)}
        onSave={(entry) => void mood.saveEntry(entry)}
      />
      <AddHabitModal open={habitOpen} onClose={() => setHabitOpen(false)} onSubmit={addHabit} />

      {!trackers.hydrated ? (
        <div className="pointer-events-none fixed bottom-20 right-4 flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-[11px] text-muted-foreground lg:bottom-4">
          <Loader2 className="size-3 animate-spin" /> Loading
        </div>
      ) : null}
    </div>
  );
}
