// @vitest-environment jsdom
/**
 * The connection constellation (overnight Slice 2), pinned:
 *  · the populated view narrates the model's strongest link, lists the
 *    top connections as sentences, and links every node to its signal's
 *    real route with its real strength as the figure;
 *  · selecting a node narrates that signal's own note + strongest link;
 *  · the section renders its SKELETON — never data — until the page's
 *    settled latch AND the cycle store have both settled;
 *  · settled with a genuinely empty record, it renders the honest
 *    empty state, not a hollow stage.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { analyzeCycle } from "@/lib/cycle/predict";
import { analyzeTrackers, DEFAULT_GOALS } from "@/lib/trackers/core";
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
    onClick,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
  }) => (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

/* Mutable store fixtures for the section test — the factories read the
   current value at render time, so each case sets the world it needs. */
const world = vi.hoisted(() => ({
  current: {
    periodHydrated: true,
    periodSyncState: "saved",
  },
}));

vi.mock("@/hooks/useTrackers", () => ({
  useTrackers: () => ({
    analysis: analyzeTrackers([], DEFAULT_GOALS, "2026-11-15"),
    today: "2026-11-15",
  }),
}));
vi.mock("@/hooks/useHabits", () => ({
  useHabits: () => ({ habits: [], logs: [], completedToday: 0, dueToday: 0 }),
}));
vi.mock("@/hooks/useMoodSystem", () => ({
  useMoodSystem: () => ({ entries: [] }),
}));
vi.mock("@/hooks/usePeriodLog", () => ({
  usePeriodLog: () => ({
    hydrated: world.current.periodHydrated,
    sync: { state: world.current.periodSyncState, message: "", signedIn: true },
    analysis: analyzeCycle([], "2026-11-15"),
    mode: "tracking" as const,
  }),
}));

afterEach(cleanup);

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
  },
  { from: "habits", to: "mood", weight: 0.5, sentence: "Habit-complete days lift your mood." },
];

describe("ConnectionConstellationView — populated", () => {
  it("narrates the strongest connection and lists the top links as sentences", () => {
    render(<ConnectionConstellationView nodes={NODES} links={LINKS} loggedDays={26} />);
    /* the narration line carries the strongest sentence whole… */
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe("On better-slept nights, your mood runs higher.");
    /* …and the sentence list below the stage carries both top links */
    const rows = [...document.querySelectorAll("li")].map((li) => li.textContent ?? "");
    expect(rows.some((t) => t.includes("On better-slept nights, your mood runs higher."))).toBe(
      true,
    );
    expect(rows.some((t) => t.includes("Habit-complete days lift your mood."))).toBe(true);
    expect(screen.getByText("26 logged days")).toBeTruthy();
    expect(screen.getByText("Last 30 days · from your own logs")).toBeTruthy();
  });

  it("links each node to its signal route, figured by its real strength", () => {
    render(<ConnectionConstellationView nodes={NODES} links={LINKS} loggedDays={26} />);
    expect(screen.getByRole("link", { name: /Mood:/ }).getAttribute("href")).toBe("/mood");
    expect(screen.getByRole("link", { name: /Sleep:/ }).getAttribute("href")).toBe("/trackers");
    expect(screen.getByRole("link", { name: /Habits:/ }).getAttribute("href")).toBe("/");
    expect(screen.getByText("80%")).toBeTruthy();
    expect(screen.getByText("60%")).toBeTruthy();
  });

  it("selecting a node narrates its note and its strongest link", () => {
    render(<ConnectionConstellationView nodes={NODES} links={LINKS} loggedDays={26} />);
    fireEvent.click(screen.getByRole("link", { name: /Sleep:/ }));
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toContain("Averaging 7h 20m this week.");
    expect(live?.textContent).toContain("On better-slept nights, your mood runs higher.");
  });

  it("with nodes but no earned links, says so honestly instead of inventing an arc", () => {
    render(<ConnectionConstellationView nodes={NODES} links={[]} loggedDays={26} />);
    expect(
      screen.getByText("Arcs appear once two signals have enough shared days to correlate."),
    ).toBeTruthy();
  });
});

describe("ConnectionConstellationEmpty", () => {
  it("explains what makes a connection appear, with no fake stage data", () => {
    render(<ConnectionConstellationEmpty />);
    expect(screen.getByTestId("home-constellation-empty")).toBeTruthy();
    expect(
      screen.getByText(/Connections appear once two signals share enough logged days/),
    ).toBeTruthy();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

describe("ConnectionConstellation — the settled gate", () => {
  it("holds the skeleton while the page latch is unsettled", () => {
    world.current = { periodHydrated: true, periodSyncState: "saved" };
    render(<ConnectionConstellation ready={false} />);
    expect(screen.getByTestId("home-constellation-skeleton")).toBeTruthy();
    expect(screen.queryByTestId("home-constellation-empty")).toBeNull();
  });

  it("holds the skeleton while the cycle store is still checking the account", () => {
    world.current = { periodHydrated: true, periodSyncState: "loading" };
    render(<ConnectionConstellation ready={true} />);
    expect(screen.getByTestId("home-constellation-skeleton")).toBeTruthy();
  });

  it("holds the skeleton until the cycle store has read the device", () => {
    world.current = { periodHydrated: false, periodSyncState: "saved" };
    render(<ConnectionConstellation ready={true} />);
    expect(screen.getByTestId("home-constellation-skeleton")).toBeTruthy();
  });

  it("settled with an empty record, shows the honest empty state — and only then", () => {
    world.current = { periodHydrated: true, periodSyncState: "saved" };
    render(<ConnectionConstellation ready={true} />);
    expect(screen.queryByTestId("home-constellation-skeleton")).toBeNull();
    expect(screen.getByTestId("home-constellation-empty")).toBeTruthy();
  });
});
