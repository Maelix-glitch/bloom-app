import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";

import { useEverReady } from "@/hooks/useEverReady";
import { HabitsSection } from "@/components/home/HabitsSection";
import { VoiceMic } from "@/components/home/VoiceMic";
import { HabitUndo } from "@/components/home/HabitUndo";
import { AssessmentPromptCard } from "@/components/assessment/AssessmentEntry";
import { NutritionTodayCard } from "@/components/nutrition/NutritionEntryCards";
import { ChangesCard, StatTiles } from "@/components/home/OverviewBand";
import { FirstBloomJourney } from "@/components/home/FirstBloomJourney";
import { LevelCard, LevelStrip } from "@/components/home/LevelCard";
import { TodayStoryCard } from "@/components/home/TodayStoryCard";
import { MoodCard } from "@/components/home/MoodCard";
import { TopBar } from "@/components/home/TopBar";
import { FeelIn, useFeelIn } from "@/components/system/FeelIn";
import { WeekChart } from "@/components/home/WeekChart";
import { ConnectionConstellation } from "@/components/home/ConnectionConstellation";
import { weekTicks } from "@/lib/home/weekChart";
import { useAssessment } from "@/hooks/useAssessment";
import { summaryOf } from "@/lib/assessment/summary";
import {
  overviewRecordsSettled,
  synthesizeOverview,
  type OverviewAction,
} from "@/lib/overview/synthesis";
import { MetricsEntryModal } from "@/components/tk/MetricsEntryModal";
import { NudgeCard } from "@/components/behaviour/NudgeCard";
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
import { offlineNotice } from "@/lib/offline/syncState";
import { useConnectivity } from "@/lib/offline/useConnectivity";

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
  return (
    <img
      src={art ?? windowDusk}
      alt=""
      width={928}
      height={720}
      className="h-full w-full object-cover transition-transform duration-[2500ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
    />
  );
}

function TodayPage() {
  const trackers = useTrackers();
  const habits = useHabits();
  /* The browser's connectivity word: it downgrades the sync pill and
     carries the one honest offline line — it never upgrades a claim. */
  const online = useConnectivity();
  const offlineLine = offlineNotice(online);
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
  /* Feel layer (v6 §3): the stack's three grid rows carry .feel-in on
     their own shells via the hook pattern; the single-component rows
     below are wrapped in <FeelIn> instead. */
  const rowFocus = useFeelIn<HTMLDivElement>();
  const rowWeek = useFeelIn<HTMLDivElement>();
  const rowHabits = useFeelIn<HTMLDivElement>();
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

  /* The mobile story card's action door (M-174): the synthesis's
     chosen next action, resolved through the same doors the rest of
     the page uses. Link and assessment actions render as links
     inside the card itself and never reach here. */
  const runOverviewAction = (action: OverviewAction) => {
    switch (action.kind) {
      case "habit":
        if (action.habitId) void habits.toggle(action.habitId);
        break;
      case "mood":
        setMoodOpen(true);
        break;
      case "metrics":
        setMetricsOpen(true);
        break;
      case "add-habit":
        openNewHabit();
        break;
      default:
        break;
    }
  };

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
      <main className="home-main page min-w-0 pb-28 pt-5 sm:pt-6 lg:pb-16 lg:pt-7">
        {/* TopBar — the prototype's top row in Bloom's build: the live
            date, the honest sync pill ("Synced with your account" and
            its settled kin), the real notifications bell and rewards. */}
        <TopBar
          now={now}
          syncState={trackers.sync.state}
          syncLabel={syncLine}
          points={habits.points}
          online={online}
        />
        {offlineLine ? (
          <p
            role="status"
            data-testid="today-offline-line"
            className="mt-2 text-[length:var(--text-caption)] text-muted-foreground"
          >
            {offlineLine}
          </p>
        ) : null}

        {/* Hero (brief v6 Slice 5, M-116/M-117): greeting, the day's
            subline as sans support text under the one serif H1, the
            action cluster in ONE chip style (voice included), and the
            photo panel demoted to quiet decoration — the product
            tagline lives once, in the sidebar. */}
        <header className="home-rise mt-5 grid gap-6 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_200px]">
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
              className="mt-2 flex min-h-[1.5em] items-center text-[length:var(--text-body)] leading-[var(--leading-body)] text-muted-foreground"
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
            {/* M-174: on mobile the opening moment carries the
                person's standing too — the same wallet balance and
                rank maths as the Level card, as a designed strip
                under the greeting. Desktop's hero is unchanged (the
                strip never renders at lg). */}
            <LevelStrip />
            {/* ONE action style (brief v6, M-117): every hero action —
                mood, metrics, BMI, the weekly report, and voice — is
                the same `.home-chip`. State lives in the label, never
                in a second visual style. */}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setMoodOpen(true)} className="home-chip">
                {moodEntry ? `Mood ${Math.round(moodEntry.mood)}/10 logged` : "Log today's mood"}
              </button>
              <button type="button" onClick={() => setMetricsOpen(true)} className="home-chip">
                {trackers.analysis.goalsMetToday > 0
                  ? `${trackers.analysis.goalsMetToday} of 6 goals met`
                  : "Log today's metrics"}
              </button>
              <Link to="/trackers" hash="body-tools" className="home-chip">
                BMI &amp; daily targets
              </Link>
              <Link to="/report" className="home-chip">
                Weekly report
              </Link>
              {/* Voice-First India (System 11): speak a command, confirm
                  the chip, and only then does anything happen. It sits
                  in the cluster as the same-style chip; where the
                  browser has no speech recognition it renders one
                  honest line instead. */}
              <VoiceMic presentation="chip" />
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

          {/* Decoration, at reduced prominence (brief v6, M-116): the
              art is not a link and carries no caption — the tagline
              lives once, in the sidebar — so the panel is smaller,
              quieter, and hidden from assistive tech. */}
          <figure
            aria-hidden="true"
            className="group relative hidden self-start overflow-hidden rounded-card border border-white/[0.08] opacity-80 lg:block"
          >
            <WallpaperFigure />
            <div
              className="pointer-events-none absolute inset-0 rounded-card ring-1 ring-inset ring-white/10"
              aria-hidden
            />
          </figure>
        </header>

        <div className="home-hairline" aria-hidden />

        {/* M-174 — the rebuilt mobile lead, phones only: the First
            Bloom journey while it is unfinished (the path retires
            when the record completes it), then the day's story line
            and single next action from the same synthesis the stack
            below computes. Both children are lg:hidden and the
            wrapper steps aside entirely when both do (empty:hidden),
            so the desktop page renders exactly what it always did. */}
        <div className="mt-8 grid gap-8 empty:hidden lg:hidden">
          <FirstBloomJourney
            ready={recordReady}
            onLogMetrics={() => setMetricsOpen(true)}
            onOpenMood={() => setMoodOpen(true)}
            onToggleHabit={(id) => void habits.toggle(id)}
            onAddHabit={openNewHabit}
          />
          <TodayStoryCard overview={overview} ready={overviewReady} onAction={runOverviewAction} />
        </div>

        {/* The prototype stack, exactly (Reskin slice A): Focus + Level,
            StatTiles, WeekChart + Changes, Habits + Mood, and the small
            centred footer line. Everything else that used to live here —
            the Coach card, the Stories band, the highlight rail, the
            tracker/flow/insights/activity panels, the connection map,
            the cycle phase card, and the Overview priority strip — is
            gone from Today; every one of those features keeps its own
            tab or page, untouched, and every priority the synthesis can
            name still has its door in this stack (habits card, mood
            card, hero chips, assessment card). Every row gap below is
            the stack's own --bloom-section-gap token, so the column
            gutter and the row rhythm can never drift apart. */}
        <div className="home-stack">
          <div
            ref={rowFocus.ref}
            data-visible={rowFocus.inView}
            className="feel-in grid gap-[var(--bloom-section-gap)] lg:grid-cols-12"
          >
            <div
              className={
                assessment.state.status === "complete"
                  ? "lg:col-span-7 [&>*]:h-full"
                  : "hidden lg:block lg:col-span-7 [&>*]:h-full"
              }
            >
              {/* W4-1: the ASSESS step's door — the prototype's FocusCard
                  in Bloom's build: segmented gold progress, the existing
                  flow behind it, the PR #87 slab untouched. Renders only
                  while the assessment is unfinished and undismissed; when
                  it steps aside, the LevelCard takes the row alone.
                  M-174: while unfinished, the cell is desktop-only — on
                  mobile the assessment lives as the First Bloom path's
                  final step and in its Profile home, never as a
                  standalone prompt; the settled starting-point card
                  keeps rendering on mobile exactly as before. */}
              <AssessmentPromptCard />
            </div>
            <div className="lg:col-span-5 [&>*]:h-full">
              <LevelCard />
            </div>
          </div>

          <FeelIn delay={60}>
            <StatTiles overview={overview} ready={overviewReady} />
          </FeelIn>

          <div
            ref={rowWeek.ref}
            data-visible={rowWeek.inView}
            className="feel-in grid gap-[var(--bloom-section-gap)] lg:grid-cols-12"
          >
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

          {/* Behaviour Change (System 8): the one gentle nudge, when the
              record supports one — it sits directly above the habits and
              mood rows it most often points at, and renders nothing at
              all when no pattern is real enough to name. */}
          <FeelIn delay={180}>
            <NudgeCard
            habits={habits.habits}
            habitLogs={habits.logs}
            moodEntries={mood.entries}
            today={habits.today}
            now={now}
            ready={overviewReady}
            onToggleHabit={(id) => void habits.toggle(id)}
            onOpenMood={() => setMoodOpen(true)}
            />
          </FeelIn>

          <div
            ref={rowHabits.ref}
            data-visible={rowHabits.inView}
            className="feel-in grid gap-[var(--bloom-section-gap)] lg:grid-cols-12"
          >
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
            <div id="mood" className="scroll-mt-20 lg:col-span-5">
              <MoodCard
                entry={moodEntry}
                onPick={pickMoodFace}
                onOpenComposer={() => setMoodOpen(true)}
              />
            </div>
          </div>

          {/* W4-3: Nutrition's door on Today — today's kcal against the
              target when food is logged, an invitation when it isn't,
              in the assessment card's language. */}
          <FeelIn delay={240}>
            <NutritionTodayCard />
          </FeelIn>

          {/* Connections — the Orbit (Brief v6 Slice 4): the Whole-Life
              Insights section is absorbed into it (M-111) — one section
              holds the map, the headline finding, the spoken patterns
              and the pairs still forming. It synthesises the very rows
              above it (habits, mood, the week) into the connections
              between them, so it reads as the reflection after the
              actions. Full width, behind the same latched settled gate
              as the Overview pieces (overviewReady) plus its own cycle
              store's settling, folded in by the component itself. */}
          <FeelIn delay={300}>
            <ConnectionConstellation ready={overviewReady} />
          </FeelIn>

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
