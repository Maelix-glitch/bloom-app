// @vitest-environment jsdom
/**
 * The First Bloom guard (M-174) — the rebuilt mobile Today, pinned:
 *   · the journey renders the correct CURRENT step from real store
 *     fixtures, with the progression system's own points on it;
 *   · meeting Vitalis completes on the orb's live opened signal —
 *     the only signal that exists for it, by design;
 *   · the journey retires when the record completes it, renders
 *     nothing while the record is unsettled, and never gates the
 *     page: "Explore freely" folds it for the session and back;
 *   · the story card carries the synthesis's own headline, priority
 *     and action — and waits while the record is empty (the journey
 *     is the lead then);
 *   · the hero's rank strip reads the same wallet + ladder as the
 *     Level card;
 *   · source pins: the mobile lead is lg:hidden, the assessment
 *     prompt cell is desktop-only while unfinished, the StatTiles
 *     prose yields on mobile, the orb answers the open bus — and the
 *     desktop stack's composition strings are exactly what they were.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { OverviewSynthesis } from "@/lib/overview/synthesis";

import { FirstBloomJourney } from "./FirstBloomJourney";
import { LevelStrip } from "./LevelCard";
import { TodayStoryCard } from "./TodayStoryCard";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    hash,
    children,
    ...rest
  }: {
    to: string;
    hash?: string;
    children: React.ReactNode;
  }) => (
    <a href={hash ? `${to}#${hash}` : to} {...rest}>
      {children}
    </a>
  ),
}));

/* Mutable store fixtures — the factories read the world at render
   time, so each case sets the record it wants. */
const world = vi.hoisted(() => ({
  current: {
    waterDays: 0,
    sleepDays: 0,
    habitLogs: 0,
    todayHabits: [] as { id: string; name: string; done: boolean }[],
    habitsList: [] as { id: string }[],
    moodEntries: 0,
    assessmentStatus: "not_started" as "not_started" | "in_progress" | "complete",
    assessmentGoal: null as "lose" | "maintain" | "gain" | "recomp" | null,
    planState: { kind: "can_generate" } as unknown,
    walletBalance: 965,
    walletLoading: false,
  },
}));

vi.mock("@/hooks/useTrackers", () => ({
  useTrackers: () => ({
    analysis: {
      trackers: {
        water: { daysLogged: world.current.waterDays },
        sleep: { daysLogged: world.current.sleepDays },
      },
    },
  }),
}));
vi.mock("@/hooks/useHabits", () => ({
  useHabits: () => ({
    logs: Array.from({ length: world.current.habitLogs }),
    todayHabits: world.current.todayHabits,
    habits: world.current.habitsList,
  }),
}));
vi.mock("@/hooks/useMoodSystem", () => ({
  useMoodSystem: () => ({ entries: Array.from({ length: world.current.moodEntries }) }),
}));
vi.mock("@/hooks/useAssessment", () => ({
  useAssessment: () => ({
    state: {
      status: world.current.assessmentStatus,
      answers: { goal: world.current.assessmentGoal },
    },
  }),
}));
vi.mock("@/hooks/usePlan", () => ({
  usePlan: () => ({ state: world.current.planState }),
}));
vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({ balance: world.current.walletBalance, loading: world.current.walletLoading }),
}));

const resetWorld = () => {
  world.current = {
    waterDays: 0,
    sleepDays: 0,
    habitLogs: 0,
    todayHabits: [],
    habitsList: [],
    moodEntries: 0,
    assessmentStatus: "not_started",
    assessmentGoal: null,
    planState: { kind: "can_generate" },
    walletBalance: 965,
    walletLoading: false,
  };
};

const doors = () => ({
  onLogMetrics: vi.fn(),
  onOpenMood: vi.fn(),
  onToggleHabit: vi.fn(),
  onAddHabit: vi.fn(),
});

afterEach(() => {
  cleanup();
  resetWorld();
});

describe("FirstBloomJourney — the current step from the real record", () => {
  it("a fresh record opens on the water step, with the catalogue's points", () => {
    const d = doors();
    render(<FirstBloomJourney ready {...d} />);
    expect(screen.getByTestId("first-bloom-journey")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Meet your Bloom" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log water" })).toBeTruthy();
    expect(screen.getByText("+100 points")).toBeTruthy();
    /* What's ahead is listed quietly; the path shows all 7 stations. */
    expect(screen.getByText("Unlock your full plan")).toBeTruthy();
    expect(screen.getByLabelText("Your First Bloom progress").children).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: "Log water" }));
    expect(d.onLogMetrics).toHaveBeenCalledTimes(1);
  });

  it("renders nothing while the record is unsettled", () => {
    const { container } = render(<FirstBloomJourney ready={false} {...doors()} />);
    expect(container.firstChild).toBeNull();
  });

  it("the habit step names the open habit and ticks it through the page's door", () => {
    world.current.waterDays = 1;
    world.current.todayHabits = [{ id: "h1", name: "Drink water", done: false }];
    world.current.habitsList = [{ id: "h1" }];
    const d = doors();
    render(<FirstBloomJourney ready {...d} />);
    const btn = screen.getByRole("button", { name: "Tick Drink water" });
    fireEvent.click(btn);
    expect(d.onToggleHabit).toHaveBeenCalledWith("h1");
  });

  it("with no habits at all, the habit step opens the add door", () => {
    world.current.waterDays = 1;
    const d = doors();
    render(<FirstBloomJourney ready {...d} />);
    fireEvent.click(screen.getByRole("button", { name: "Add your first habit" }));
    expect(d.onAddHabit).toHaveBeenCalledTimes(1);
  });

  it("meeting Vitalis: the step asks the orb to open, and the opened signal completes it", () => {
    world.current.waterDays = 1;
    world.current.habitLogs = 1;
    const opened = vi.fn();
    window.addEventListener("bloom:vitalis-open", opened);
    render(<FirstBloomJourney ready {...doors()} />);
    expect(screen.getByRole("heading", { name: "Meet Vitalis" })).toBeTruthy();
    /* No points are invented for a step the catalogue doesn't price. */
    expect(screen.queryByText(/\+\d+ points/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Meet Vitalis" }));
    expect(opened).toHaveBeenCalledTimes(1);
    /* The orb answers: its window opened in this session. */
    act(() => {
      window.dispatchEvent(new Event("bloom:vitalis-opened"));
    });
    expect(screen.getByRole("heading", { name: "See today's dish" })).toBeTruthy();
    window.removeEventListener("bloom:vitalis-open", opened);
  });

  it("retires when the record completes every step", () => {
    world.current.waterDays = 1;
    world.current.habitLogs = 1;
    world.current.sleepDays = 1;
    world.current.moodEntries = 1;
    world.current.planState = { kind: "ready", plan: { meals: [] } };
    world.current.assessmentStatus = "complete";
    render(<FirstBloomJourney ready {...doors()} />);
    /* Only Vitalis is outstanding — its signal is live, not stored. */
    expect(screen.getByTestId("first-bloom-journey")).toBeTruthy();
    act(() => {
      window.dispatchEvent(new Event("bloom:vitalis-opened"));
    });
    expect(screen.queryByTestId("first-bloom-journey")).toBeNull();
  });

  it("the assessment is the final step — framed as the unlock, tied to the stated goal", () => {
    world.current.waterDays = 1;
    world.current.habitLogs = 1;
    world.current.sleepDays = 1;
    world.current.moodEntries = 1;
    world.current.planState = { kind: "outdated", plan: { meals: [] } };
    world.current.assessmentGoal = "lose";
    render(<FirstBloomJourney ready {...doors()} />);
    act(() => {
      window.dispatchEvent(new Event("bloom:vitalis-opened"));
    });
    expect(screen.getByRole("heading", { name: "Unlock your full plan" })).toBeTruthy();
    expect(screen.getByText(/Seven small steps toward lose weight/)).toBeTruthy();
    const link = screen.getByRole("link", { name: "Begin the assessment" });
    expect(link.getAttribute("href")).toBe("/profile#pf-assessment");
  });

  it("explore freely folds the path for the session — and it comes back", () => {
    render(<FirstBloomJourney ready {...doors()} />);
    fireEvent.click(screen.getByRole("button", { name: "Explore freely" }));
    expect(screen.queryByTestId("first-bloom-journey")).toBeNull();
    expect(screen.getByTestId("first-bloom-journey-folded")).toBeTruthy();
    expect(screen.getByText(/0 of 7 steps/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show the path" }));
    expect(screen.getByTestId("first-bloom-journey")).toBeTruthy();
  });
});

describe("TodayStoryCard — the synthesis, phone-first", () => {
  const synthesis = (recordDays: number) =>
    ({
      state: {
        headline: "Your record is taking shape.",
        lines: [],
        facts: [],
        recordDays,
        streak: 1,
      },
      priority: { id: "mood-today", title: "Name today's mood", reason: "It anchors the day." },
      action: { kind: "mood", label: "Log today's mood" },
    }) as unknown as OverviewSynthesis;

  it("carries the headline, the priority and its action door", () => {
    const onAction = vi.fn();
    render(<TodayStoryCard overview={synthesis(3)} ready onAction={onAction} />);
    expect(screen.getByText("Your record is taking shape.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Name today's mood" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Log today's mood" }));
    expect(onAction).toHaveBeenCalledWith({ kind: "mood", label: "Log today's mood" });
  });

  it("waits while the record is empty — the journey is the lead then", () => {
    const { container } = render(
      <TodayStoryCard overview={synthesis(0)} ready onAction={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("LevelStrip — the hero's rank element", () => {
  it("reads the same wallet and ladder as the Level card", () => {
    render(<LevelStrip />);
    const strip = screen.getByTestId("home-level-strip");
    expect(strip.textContent).toContain("First Bloom");
    expect(strip.textContent).toContain("965");
    expect(strip.textContent).toContain("235 to Sprout");
  });

  it("shows no provisional number while the balance settles", () => {
    world.current.walletLoading = true;
    const { container } = render(<LevelStrip />);
    expect(container.firstChild).toBeNull();
  });
});

describe("source pins — mobile scoping and the untouched desktop", () => {
  const SRC = join(process.cwd(), "src");
  const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

  it("the mobile lead is lg:hidden and the stack's rows are the originals", () => {
    const index = read("routes/index.tsx");
    expect(index).toContain("<FirstBloomJourney");
    expect(index).toContain("<TodayStoryCard");
    expect(index).toContain("<LevelStrip />");
    expect(index).toContain("empty:hidden lg:hidden");
    /* The desktop stack's composition strings, exactly as they were. */
    expect(
      index.match(/feel-in grid gap-\[var\(--bloom-section-gap\)\] lg:grid-cols-12/g),
    ).toHaveLength(3);
    expect(index).toContain(
      'className="font-display text-4xl font-light leading-[1.02] tracking-tight sm:text-6xl"',
    );
    expect(index).toContain("<StatTiles overview={overview} ready={overviewReady} />");
  });

  it("the unfinished assessment prompt is desktop-only; the settled card is not", () => {
    const index = read("routes/index.tsx");
    expect(index).toContain('"hidden lg:block lg:col-span-7 [&>*]:h-full"');
    expect(index).toContain('"lg:col-span-7 [&>*]:h-full"');
  });

  it("StatTiles prose yields on mobile; the facts are a telemetry strip below lg", () => {
    const band = read("components/home/OverviewBand.tsx");
    expect(band).toContain("hidden max-w-[62ch] px-1 font-display");
    expect(band).toContain('className="home-fact"');
    const css = read("styles.css");
    expect(css).toContain(".home-fact");
    expect(css).toContain("@media (min-width: 1024px)");
  });

  it("the orb answers the open bus and announces its openings", () => {
    const orb = read("components/coach/CoachOrb.tsx");
    expect(orb).toContain("onVitalisOpenRequest(() => setOpen(true))");
    expect(orb).toContain("announceVitalisOpened()");
  });

  it("no glass material reaches the new Today surfaces", () => {
    for (const rel of [
      "components/home/FirstBloomJourney.tsx",
      "components/home/TodayStoryCard.tsx",
    ]) {
      const src = read(rel);
      expect(src).not.toContain("glass.css");
      expect(src).not.toContain("--lg-");
      expect(src).not.toContain("backdrop-blur");
    }
  });
});
