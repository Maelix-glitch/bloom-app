import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";

import { useEverReady } from "@/hooks/useEverReady";
import { HabitsSection } from "@/components/home/HabitsSection";
import { HabitUndo } from "@/components/home/HabitUndo";
import { AssessmentPromptCard } from "@/components/assessment/AssessmentEntry";
import { ChangesCard, StatTiles } from "@/components/home/OverviewBand";
import { LevelCard } from "@/components/home/LevelCard";
import { MoodCard } from "@/components/home/MoodCard";
import { TopBar } from "@/components/home/TopBar";
import { WeekChart } from "@/components/home/WeekChart";
import { weekTicks } from "@/lib/home/weekChart";
import { useAssessment } from "@/hooks/useAssessment";
import { summaryOf } from "@/lib/assessment/summary";
import { overviewRecordsSettled, synthesizeOverview } from "@/lib/overview/synthesis";
import { MetricsEntryModal } from "@/components/tk/MetricsEntryModal";
import { Composer } from "@/components/mood/Composer";
import { AddHabitModal } from "@/components/tk/AddHabitModal";

import { useTrackers } from "@/hooks/useTrackers";
import { useHabits } from "@/hooks/useHabits";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import { useProfileSpace } from "@/hooks/useProfileSpace";
import { greetingFor, moodToday } from "@/lib/home/today";
import { habitToDraft, type HabitDraft } from "@/lib/home/habits";
import { entryFromFace, type PageMood } from "@/lib/mood/page";
import { formatClock, usualHabitTime, usualMood } from "@/lib/smart/usual";
import { readPersonalVoice } from "@/lib/voice/personal";
import type { AddHabitPrefill } from "@/components/tk/AddHabitModal";

import windowDusk from "@/assets/home/window-dusk.jpg";
import { componentsById } from "@/lib/rewards/catalog";
import { loadRewardsStore, subscribeRewards } from "@/lib/rewards/store";
import { genuineFirstDay, sublineFor } from "@/lib/home/subline";
import { localDay } from "@/lib/localDay";

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

/**
 * The hero ambience on Today. When a wallpaper reward is equipped it becomes
 * the hero artwork (the same asset the Rewards page shows) — customization is
 * real, not a preview-only flourish.
 */
function WallpaperFigure() {
  const [art, setArt] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => {
      const equipped = loadRewardsStore().equipped;
      const wallpaperId = equipped.wallpaperId;
      setArt(wallpaperId ? (componentsById.get(wallpaperId)?.art ?? null) : null);
    };
    sync();
    return subscribeRewards(sync);
  }, []);
  const isCustom = art !== null;
  return (
    <img
      src={art ?? windowDusk}
      alt={
        isCustom
          ? "An equipped Bloom wallpaper brightening the day"
          : "A journal open on a desk beside a window at dusk"
      }
      width={928}
      height={720}
      className="h-full w-full object-cover transition-transform duration-[2500ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
    />
  );
}

function TodayPage() {
  const trackers = useTrackers();
  const habits = useHabits();
  const mood = useMoodSystem();
  const assessment = useAssessment();
  const space = useProfileSpace();
  const now = useNow();

  const [metricsOpen, setMetricsOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  /** Which habit the dialog is editing; null = creating a new one. */
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [habitNotice, setHabitNotice] = useState<string | null>(null);

  const today = trackers.today;
  const identity = space.identity?.identity ?? null;
  const [personalVoice] = useState(() => readPersonalVoice());
  const displayName =
    identity && identity.displayName && identity.displayName !== "Bloom User"
      ? identity.displayName
      : null;
  const firstName = displayName ? displayName.split(" ")[0]! : null;

  const moodEntry = useMemo(() => moodToday(mood.entries, today), [mood.entries, today]);

  /* When editing a habit, its tick history may know a usual finish time —
     offered once as a reminder suggestion, never set silently. */
  const habitUsualReminder = useMemo(() => {
    if (!editingHabitId || !habitOpen) return null;
    const time = usualHabitTime(habits.logs, editingHabitId);
    if (!time) return null;
    const existing = habits.habits.find((h) => h.id === editingHabitId);
    if (existing?.reminderTime) return null; // a reminder already lives there
    return { time: time.reminderTime, around: formatClock(time.minutes), samples: time.samples };
  }, [editingHabitId, habitOpen, habits.logs, habits.habits]);

  /* Their usual check-in readings — feeds the composer's honest markers. */
  const moodUsual = useMemo(() => usualMood(mood.entries, today), [mood.entries, today]);

  const openCount = habits.todayHabits.filter((h) => !h.done).length;
  /* Latched readiness. `hydrated` and `loading` both flip again during
     background refetches, and the server pass can never see them — reading them
     directly made this line alternate between the reading state and the day's
     summary on a loop. Once the stores have loaded once, the hero stays in its
     loaded state; the sentence itself is derived only from today's data.
     Slice B: device hydration alone is NOT readiness — the tracker store
     hydrates from the device mirror instantly and merges the account pull
     later, so latching on `hydrated` presented mirror numbers as the
     record until the pull landed. The settled predicate (the Profile /
     Rewards discipline) waits for every source's account answer. */
  const recordsSettled = overviewRecordsSettled({
    auth: habits.auth,
    habitsLoading: habits.loading,
    moodLoading: mood.loading,
    trackersHydrated: trackers.hydrated,
    trackerSyncState: trackers.sync.state,
  });
  const recordReady = useEverReady(recordsSettled);
  /* Day one is a property of the record, not of this device's onboarding
     answer — see genuineFirstDay. The stores on this page are the record:
     habit ticks, mood check-ins and tracker days, by distinct day. */
  const recordDayCount = useMemo(() => {
    const keys = new Set<string>();
    for (const l of habits.logs) keys.add(l.date);
    for (const e of mood.entries) keys.add(localDay(e.timestamp));
    for (const d of trackers.days) keys.add(d.date);
    return keys.size;
  }, [habits.logs, mood.entries, trackers.days]);

  /* W4-2 — the command centre's synthesis: the record, read once, answering
     how you're doing / what changed / what matters / what's next. Its day
     count is the same distinct-day union as recordDayCount above (the lib
     computes it from the same three sources), so the tiles and the hero can
     never disagree. The summary is null until the assessment is complete. */
  const assessmentSummary = useMemo(() => summaryOf(assessment.state), [assessment.state]);
  const overview = useMemo(
    () =>
      synthesizeOverview({
        today,
        habits: {
          all: habits.habits,
          logs: habits.logs,
          todayHabits: habits.todayHabits,
          completedToday: habits.completedToday,
          dueToday: habits.dueToday,
          points: habits.points,
        },
        moodEntries: mood.entries,
        trackerDays: trackers.days,
        trackers: trackers.analysis,
        assessment: { state: assessment.state, summary: assessmentSummary },
      }),
    [
      today,
      habits.habits,
      habits.logs,
      habits.todayHabits,
      habits.completedToday,
      habits.dueToday,
      habits.points,
      mood.entries,
      trackers.days,
      trackers.analysis,
      assessment.state,
      assessmentSummary,
    ],
  );
  /* Latched like the hero, on the same settled predicate: once the
     records have settled once, the Overview pieces never fall back to
     their placeholders on a background refetch — and never latch early
     onto mirror-derived numbers while an account pull is in flight. */
  const overviewReady = recordReady;
  /* The week chart's bars — the same habit logs, counted per day over the
     synthesis's own window pair (last 7 days vs the 7 days before). */
  const weekData = useMemo(() => weekTicks(habits.logs, today), [habits.logs, today]);
  const subline = sublineFor({
    ready: recordReady,
    firstDay: genuineFirstDay(personalVoice.firstDay, recordDayCount),
    openCount,
  });

  /* Settled states only: while the account check runs there is no line at
     all (the sync lines' shared rule — a printed "checking" can outlive
     the check and read as stuck). The store's watchdog guarantees a
     settled state follows. */
  const syncLine =
    trackers.sync.state === "loading"
      ? null
      : trackers.sync.state === "off"
        ? "Saved on this device"
        : trackers.sync.state === "signed-out"
          ? "Saved on this device — sign in to sync"
          : trackers.sync.message || null;

  const addHabit = async (draft: HabitDraft) => {
    try {
      if (editingHabitId) await habits.editHabit(editingHabitId, draft);
      else await habits.addHabit(draft);
      setHabitNotice(null);
    } catch (e) {
      console.warn("[bloom:home] save habit:", e);
      setHabitNotice(
        editingHabitId
          ? "That change couldn't reach your account. Try again in a moment."
          : "That habit couldn't be saved to your account. It's kept on this device for now.",
      );
      throw e;
    }
  };

  const openNewHabit = () => {
    setEditingHabitId(null);
    setHabitOpen(true);
  };
  const openEditHabit = (id: string) => {
    setEditingHabitId(id);
    setHabitOpen(true);
  };
  const editingHabit = editingHabitId
    ? (habits.habits.find((h) => h.id === editingHabitId) ?? null)
    : null;
  const habitPrefill: AddHabitPrefill | undefined = editingHabit
    ? (habitToDraft(editingHabit) as AddHabitPrefill)
    : undefined;

  /* The MoodCard's one-tap check-in — the Mood page's own quick-log path:
     a face builds a real entry from its preset; re-tapping today replaces
     today's quick entry instead of stacking a second one, and a Composer
     entry (words, detail) is never replaced by a face tap. */
  const pickMoodFace = (face: PageMood) => {
    const replace = moodEntry && moodEntry.tags.includes("quick-log") ? moodEntry : null;
    const fresh = entryFromFace(face);
    void mood.saveEntry(replace ? { ...fresh, id: replace.id } : fresh);
  };

  return (
    <div className="home-page app-shell min-h-screen bg-background text-foreground">
      <main className="home-main min-w-0 px-5 pb-28 pt-5 sm:px-8 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7">
        {/* TopBar — the prototype's top row in Bloom's build: the live
            date, the honest sync pill ("Synced with your account" and
            its settled kin), the real notifications bell and rewards. */}
        <TopBar
          now={now}
          syncState={trackers.sync.state}
          syncLabel={syncLine}
          points={habits.points}
        />

        {/* Hero — the slice-3 build, unchanged: greeting, the day's
            subline, the check-in chips (the mood chip settles sage once
            today's mood is logged), and the photo panel. */}
        <header className="home-rise mt-5 grid gap-6 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            {/* suppressHydrationWarning: the greeting is LOCAL time by
                design, but the server renders on a UTC clock — its band can
                legitimately differ from the reader's (React #418). The
                client value wins on hydration; the swap is one word. */}
            <h1
              className="font-display text-4xl font-light leading-[1.02] tracking-tight sm:text-6xl"
              suppressHydrationWarning
            >
              {firstName ? (
                <>
                  {greetingFor(now.getHours())},{" "}
                  <em className="home-text-gradient italic">{firstName}.</em>
                </>
              ) : (
                <em className="home-text-gradient italic">{greetingFor(now.getHours())}.</em>
              )}
            </h1>
            <p
              className="mt-1.5 flex min-h-[1.5em] items-center font-display text-xl text-muted-foreground sm:text-3xl"
              aria-live="polite"
            >
              {/* While the record settles, the hero holds a shaped placeholder
                  in the same line box — a loading sentence is a state, not
                  copy, and must never read as the day's permanent subtitle.
                  Once ready (latched), the real sentence takes the same box,
                  so nothing jumps. */}
              {recordReady ? (
                subline
              ) : (
                <span
                  className="block h-[0.72em] w-64 max-w-[70%] animate-pulse rounded-full bg-surface-2/80"
                  aria-hidden="true"
                />
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMoodOpen(true)}
                className={`home-chip ${moodEntry ? "home-chip--done" : "home-chip--primary"}`}
              >
                {moodEntry ? `Mood ${Math.round(moodEntry.mood)}/10 logged` : "Log today's mood"}
              </button>
              <button
                type="button"
                onClick={() => setMetricsOpen(true)}
                className="home-chip home-chip--primary"
              >
                {trackers.analysis.goalsMetToday > 0
                  ? `${trackers.analysis.goalsMetToday} of 6 goals met`
                  : "Log today's metrics"}
              </button>
              <Link to="/trackers" hash="body-tools" className="home-chip">
                BMI &amp; daily targets
              </Link>
              <Link to="/report" className="home-chip home-chip--quiet">
                Weekly report
              </Link>
            </div>
            {space.authState === "signed-out" ? (
              <p className="mt-4 text-[length:var(--text-caption)] text-muted-foreground">
                You're browsing on this device only.{" "}
                <Link to="/profile" className="underline underline-offset-2 hover:text-foreground">
                  Sign in
                </Link>{" "}
                to sync habits, mood, cycle and trackers to your account.
              </p>
            ) : null}
            {habits.error || habitNotice ? (
              <p className="mt-3 text-[length:var(--text-caption)] text-rose" role="status">
                {habitNotice ?? habits.error}
              </p>
            ) : null}
          </div>

          <figure className="group relative hidden overflow-hidden rounded-[1.75rem] border border-white/[0.08] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] lg:block">
            <WallpaperFigure />
            <div
              className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/10"
              aria-hidden
            />
            <figcaption className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/20 to-black/10 p-5">
              {/* One tagline for the whole product — the sidebar's line.
                  This panel used to stack two competing slogans of its own. */}
              <span className="font-display text-2xl leading-snug">
                A calmer you, a brighter tomorrow.
              </span>
            </figcaption>
          </figure>
        </header>

        <div className="home-hairline mt-8 lg:mt-10" aria-hidden />

        {/* The prototype stack, exactly (Reskin slice A): Focus + Level,
            StatTiles, WeekChart + Changes, Habits + Mood, and the small
            centred footer line. Everything else that used to live here —
            the Coach card, the Stories band, the highlight rail, the
            tracker/flow/insights/activity panels, the connection map,
            the cycle phase card, and the Overview priority strip — is
            gone from Today; every one of those features keeps its own
            tab or page, untouched, and every priority the synthesis can
            name still has its door in this stack (habits card, mood
            card, hero chips, assessment card). */}
        <div className="home-stack">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 [&>*]:h-full">
              {/* W4-1: the ASSESS step's door — the prototype's FocusCard
                  in Bloom's build: segmented gold progress, the existing
                  flow behind it, the PR #87 slab untouched. Renders only
                  while the assessment is unfinished and undismissed; when
                  it steps aside, the LevelCard takes the row alone. */}
              <AssessmentPromptCard />
            </div>
            <div className="lg:col-span-5 [&>*]:h-full">
              <LevelCard />
            </div>
          </div>

          <StatTiles overview={overview} ready={overviewReady} />

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 [&>*]:h-full">
              {/* The week in ticks — real habit logs, this week vs the
                  week before, in the prototype's chart language. Gated
                  on the same latched settled flag as the Overview: the
                  section shell is always present, interim bars never
                  paint, and the real chart never unmounts once shown. */}
              <WeekChart data={weekData} ready={overviewReady} />
            </div>
            <div className="lg:col-span-5 [&>*]:h-full">
              <ChangesCard overview={overview} ready={overviewReady} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 [&>*]:h-full">
              <HabitsSection
                habits={habits.todayHabits}
                logs={habits.logs}
                today={habits.today}
                loading={habits.loading}
                signedIn={habits.auth === "signed-in" || habits.auth === "checking"}
                onToggle={(id, date) => void habits.toggle(id, date)}
                onAdd={openNewHabit}
                paused={habits.pausedHabits}
                archived={habits.archivedHabits}
                actions={{
                  onEdit: openEditHabit,
                  onPause: (id, until) => void habits.pauseHabit(id, until),
                  onResume: (id) => void habits.resumeHabit(id),
                  onArchive: (id) => void habits.archiveHabit(id),
                  onRestore: (id) => void habits.restoreHabit(id),
                  onDelete: (id) => void habits.deleteHabit(id),
                }}
              />
            </div>
            <div id="mood" className="scroll-mt-20 lg:col-span-5 [&>*]:h-full">
              <MoodCard
                entry={moodEntry}
                onPick={pickMoodFace}
                onOpenComposer={() => setMoodOpen(true)}
              />
            </div>
          </div>

          <footer className="flex items-center justify-center gap-2 pt-2 text-[length:var(--text-caption)] text-muted-foreground">
            <Leaf className="size-3" aria-hidden />
            Last 7 days vs the 7 days before
          </footer>
        </div>
      </main>

      {/* the same entry surfaces the rest of Bloom uses — one data path each */}
      <MetricsEntryModal
        store={trackers}
        open={metricsOpen}
        onClose={() => setMetricsOpen(false)}
      />
      <Composer
        open={moodOpen}
        initial={moodEntry}
        onClose={() => setMoodOpen(false)}
        onSave={mood.saveEntry}
        onDelete={(entry) => mood.removeEntry(entry.id)}
        firstMoment={mood.entries.length === 0 && !moodEntry}
        usual={moodUsual}
      />
      <AddHabitModal
        open={habitOpen}
        onClose={() => {
          setHabitOpen(false);
          setEditingHabitId(null);
        }}
        onSubmit={addHabit}
        prefill={habitPrefill}
        suggestReminder={habitUsualReminder}
      />
      <HabitUndo undoable={habits.undoable} onUndo={habits.undo} onDismiss={habits.dismissUndo} />

      {/* No global "Loading" pill: the trackers store hydrates from a local
          read on mount, so the pill could only ever flash on arrival — and
          every card on this page already carries its own in-place loading
          state (hero placeholder, tile placeholders, habits skeleton). */}
    </div>
  );
}
