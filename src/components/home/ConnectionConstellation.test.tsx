// @vitest-environment jsdom
/**
 * Connections — the Orbit (Brief v6 Slice 4), pinned:
 *  · the strongest connection is the section's HEADLINE, in the
 *    insights engine's words where the pair matches; the panel opens
 *    on it with the pair's figures and its paired-day count;
 *  · strength is words (the lib's bands), never a percentage; nodes
 *    are buttons labelled by their logged days, not a "%" figure;
 *  · selecting a node opens the panel on that signal's strongest
 *    pair; spoken insights with no drawn link are rows of their own,
 *    so no finding the old Patterns card carried is lost;
 *  · pending pairs live in "Pairs still forming" with a meter and
 *    Slice 1's honest paired counts;
 *  · the section renders its SKELETON — never data — until the page's
 *    settled latch AND the cycle store have both settled; settled
 *    with a genuinely empty record, it renders the honest empty state.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { analyzeCycle } from "@/lib/cycle/predict";
import { shiftDay } from "@/lib/localDay";
import type { WholeLifeInsight, WholeLifePending } from "@/lib/insights/insights";
import type { MoodEntry } from "@/lib/mood/types";
import { analyzeTrackers, DEFAULT_GOALS, type DayEntry } from "@/lib/trackers/core";
import type { Connection, CrossLink } from "@/lib/home/today";
import {
  ConnectionConstellation,
  ConnectionConstellationEmpty,
  ConnectionConstellationView,
} from "./ConnectionConstellation";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

/* Mutable store fixtures for the section tests — the factories read
   the current value at render time, so each case sets the world. */
const world = vi.hoisted(() => ({
  current: {
    periodHydrated: true,
    periodSyncState: "saved",
    moodEntries: [] as MoodEntry[],
    trackerDays: [] as DayEntry[],
  },
}));

vi.mock("@/hooks/useTrackers", () => ({
  useTrackers: () => ({
    analysis: analyzeTrackers(world.current.trackerDays, DEFAULT_GOALS, "2026-11-18"),
    today: "2026-11-18",
    days: world.current.trackerDays,
  }),
}));
vi.mock("@/hooks/useHabits", () => ({
  useHabits: () => ({ habits: [], logs: [], completedToday: 0, dueToday: 0 }),
}));
vi.mock("@/hooks/useMoodSystem", () => ({
  useMoodSystem: () => ({ entries: world.current.moodEntries }),
}));
vi.mock("@/hooks/useNutrition", () => ({
  useNutrition: () => ({ entries: [] }),
}));
vi.mock("@/hooks/useBodyProfile", () => ({
  useBodyProfile: () => ({ weighIns: [] }),
}));
vi.mock("@/hooks/usePeriodLog", () => ({
  usePeriodLog: () => ({
    hydrated: world.current.periodHydrated,
    sync: { state: world.current.periodSyncState, message: "", signedIn: true },
    analysis: analyzeCycle([], "2026-11-18"),
    mode: "tracking" as const,
    settings: { personalMaxPlausible: null, mode: "tracking" as const, pause: null },
  }),
}));

afterEach(cleanup);

/* ------------------------------ view fixtures --------------------------- */

const NODES: Connection[] = [
  { id: "mood", strength: 0.8, days: 24, note: "24 mood days this month." },
  { id: "sleep", strength: 0.6, days: 18, note: "Averaging 7h 20m this week." },
  { id: "habits", strength: 0.3, days: 9, note: "2 of 5 done today." },
];
const LINKS: CrossLink[] = [
  {
    from: "mood",
    to: "sleep",
    weight: 0.8,
    sentence: "On better-slept nights, your mood runs higher.",
    days: 21,
  },
  {
    from: "habits",
    to: "mood",
    weight: 0.5,
    sentence: "Habit-complete days lift your mood.",
    days: 14,
  },
];
const INSIGHTS: WholeLifeInsight[] = [
  {
    kind: "sleep-mood",
    headline: "Mood tends to run higher after longer sleep",
    detail: "After longer nights, your mood averaged 9/10.",
    figures: [
      { label: "Longer nights · about 8.5 hours", value: "Mood 9/10" },
      { label: "Shorter nights · about 5.5 hours", value: "Mood 5/10" },
    ],
    sampleDays: 21,
    windowDays: 56,
    strength: 1.4,
  },
  {
    kind: "food-mood",
    headline: "Mood tends to run higher on days you log your food",
    detail: "On the 6 days you logged food, your mood averaged 8/10.",
    figures: [
      { label: "Days you logged food · 6 days", value: "Mood 8/10" },
      { label: "Days you didn't · 6 days", value: "Mood 6/10" },
    ],
    sampleDays: 12,
    windowDays: 56,
    strength: 0.9,
  },
];
const PENDING: WholeLifePending[] = [
  { kind: "movement-mood", label: "Movement & mood", sampleDays: 5, neededDays: 8 },
];

const renderView = (over: Partial<{ links: CrossLink[]; insights: WholeLifeInsight[] }> = {}) =>
  render(
    <ConnectionConstellationView
      nodes={NODES}
      links={over.links ?? LINKS}
      loggedDays={26}
      insights={over.insights ?? INSIGHTS}
      pending={PENDING}
    />,
  );

describe("ConnectionConstellationView — the Orbit", () => {
  it("headlines the strongest connection in the insights engine's words", () => {
    const { container } = renderView();
    const headline = container.querySelector(".orbit-headline");
    expect(headline?.textContent).toBe("Mood tends to run higher after longer sleep");
    /* the panel opens on the same pair: figures as rows, its basis stated */
    expect(container.textContent).toContain("Longer nights · about 8.5 hours");
    expect(container.textContent).toContain("Mood 9/10");
    expect(container.textContent).toContain("From 21 paired days · last 56 days");
    expect(container.textContent).toContain("Strong link");
    /* the header chip names its definition (v6 §1.2, M-113) and window */
    expect(screen.getByText("26 days with any log · last 30 days")).toBeTruthy();
  });

  it("grades every link in words and never prints a percentage", () => {
    const { container } = renderView();
    expect(container.textContent).toContain("Some link");
    expect(container.textContent).not.toContain("%");
    expect(screen.queryByText("80%")).toBeNull();
  });

  it("nodes are buttons labelled by days logged, opening their strongest pair", () => {
    const { container } = renderView();
    const sleep = screen.getByRole("button", { name: /Sleep, logged on 18/ });
    fireEvent.click(sleep);
    /* Re-contracted by M-204 (F-12): the panel no longer repeats the
       headline's sentence — the finding is stated ONCE, as the section
       headline, and the panel carries its figures and basis. */
    expect(container.querySelector(".orbit-panel")?.textContent).not.toContain(
      "Mood tends to run higher after longer sleep",
    );
    expect(container.querySelector(".orbit-headline")?.textContent).toBe(
      "Mood tends to run higher after longer sleep",
    );
    expect(container.querySelector(".orbit-panel")?.textContent).toContain(
      "From 21 paired days · last 56 days",
    );
    const habits = screen.getByRole("button", { name: /Habits, logged on 9/ });
    fireEvent.click(habits);
    const panel = container.querySelector(".orbit-panel");
    expect(panel?.textContent).toContain("Habit-complete days lift your mood.");
    expect(panel?.textContent).toContain("From 14 paired days · last 30 days");
    expect(panel?.textContent).toContain("Some link");
  });

  it("keeps unmatched spoken insights as rows — no finding is lost", () => {
    const { container } = renderView();
    const row = screen.getByRole("button", { name: /Food logging and mood/ });
    expect(row.textContent).toContain("12 paired days");
    fireEvent.click(row);
    const panel = container.querySelector(".orbit-panel");
    expect(panel?.textContent).toContain("Mood tends to run higher on days you log your food");
    expect(panel?.textContent).toContain("Days you logged food · 6 days");
  });

  it("lists pairs still forming with a meter and the honest count", () => {
    const { container } = renderView();
    expect(container.textContent).toContain("Pairs still forming");
    expect(container.textContent).toContain("Movement & mood");
    expect(container.textContent).toContain("5 of 8 paired days");
    const meter = container.querySelector('[role="progressbar"]');
    expect(meter?.getAttribute("aria-valuenow")).toBe("5");
    expect(meter?.getAttribute("aria-valuemax")).toBe("8");
  });

  it("with nodes but nothing spoken yet, says so honestly and offers the first step", () => {
    const { container } = renderView({ links: [], insights: [] });
    expect(container.querySelector(".orbit-headline")?.textContent).toBe(
      "Arcs appear once two signals have enough shared days to correlate.",
    );
    expect(container.textContent).toContain("Nothing to read yet.");
    expect(container.querySelectorAll("path[data-orbit-link]")).toHaveLength(0);
  });
});

describe("ConnectionConstellationEmpty", () => {
  it("explains what makes a connection appear, with no fake stage data", () => {
    render(<ConnectionConstellationEmpty />);
    expect(screen.getByTestId("home-constellation-empty")).toBeTruthy();
    expect(
      screen.getByText(/Connections appear once two signals share enough logged days/),
    ).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

/* --------------------------- section: the gate -------------------------- */

const TODAY = "2026-11-18";
const day = (back: number): string => shiftDay(TODAY, -back);

let seq = 0;
const moodEntry = (date: string, value: number): MoodEntry => ({
  id: `m${(seq += 1)}`,
  timestamp: `${date}T09:00:00`,
  mood: value,
  energy: 5,
  stress: 5,
  emotions: [],
  tags: [],
});

const trackerDay = (date: string, sleepMinutes: number): DayEntry => ({
  date,
  sleepMinutes,
  bedTime: null,
  wakeTime: null,
  sleepQuality: null,
  waterMl: null,
  sessions: [],
  movementMinutes: null,
  energy: null,
  screenMinutes: null,
  notes: null,
});

function setRecord(pairedDays: number) {
  const moodEntries: MoodEntry[] = [];
  const trackerDays: DayEntry[] = [];
  for (let back = 1; back <= pairedDays; back += 1) {
    const long = back % 2 === 0;
    moodEntries.push(moodEntry(day(back), long ? 9 : 5));
    trackerDays.push(trackerDay(day(back), long ? 510 : 330));
  }
  world.current.moodEntries = moodEntries;
  world.current.trackerDays = trackerDays;
}

describe("ConnectionConstellation — the settled gate", () => {
  it("holds the skeleton while the page latch is unsettled", () => {
    world.current = { ...world.current, periodHydrated: true, periodSyncState: "saved" };
    setRecord(0);
    render(<ConnectionConstellation ready={false} />);
    expect(screen.getByTestId("home-constellation-skeleton")).toBeTruthy();
    expect(screen.queryByTestId("home-constellation-empty")).toBeNull();
  });

  it("holds the skeleton while the cycle store is still checking the account", () => {
    world.current = { ...world.current, periodHydrated: true, periodSyncState: "loading" };
    render(<ConnectionConstellation ready={true} />);
    expect(screen.getByTestId("home-constellation-skeleton")).toBeTruthy();
  });

  it("holds the skeleton until the cycle store has read the device", () => {
    world.current = { ...world.current, periodHydrated: false, periodSyncState: "saved" };
    render(<ConnectionConstellation ready={true} />);
    expect(screen.getByTestId("home-constellation-skeleton")).toBeTruthy();
  });

  it("settled with an empty record, shows the honest empty state — and only then", () => {
    world.current = { ...world.current, periodHydrated: true, periodSyncState: "saved" };
    setRecord(0);
    render(<ConnectionConstellation ready={true} />);
    expect(screen.queryByTestId("home-constellation-skeleton")).toBeNull();
    expect(screen.getByTestId("home-constellation-empty")).toBeTruthy();
  });

  it("settled with a real pattern, the Orbit carries it — headline, figures, basis", () => {
    world.current = { ...world.current, periodHydrated: true, periodSyncState: "saved" };
    setRecord(10);
    const { container } = render(<ConnectionConstellation ready={true} />);
    expect(container.querySelector(".orbit-headline")?.textContent).toBe(
      "Mood tends to run higher after longer sleep",
    );
    expect(container.textContent).toContain("Longer nights · about 8.5 hours");
    expect(container.textContent).toContain("Mood 9/10");
    /* the honesty foot is the brief §2.4 line now (the old Patterns
       card's "never what causes what" wording retired with it) */
    expect(container.textContent).toContain("They don't show cause");
  });

  it("settled with a thin record, pairs still forming carry the counts", () => {
    world.current = { ...world.current, periodHydrated: true, periodSyncState: "saved" };
    setRecord(5);
    const { container } = render(<ConnectionConstellation ready={true} />);
    expect(container.textContent).toContain("Pairs still forming");
    expect(container.textContent).toContain("Sleep & mood");
    expect(container.textContent).toContain("5 of 8 paired days");
    expect(container.querySelector(".orbit-headline")?.textContent).not.toContain(
      "tends to run higher after longer sleep",
    );
  });
});
