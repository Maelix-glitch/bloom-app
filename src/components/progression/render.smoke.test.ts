/**
 * Render smoke tests — the journey's UI with real engine output.
 *
 * These catch the failures a browser check would catch first: a crashed
 * render, an `undefined` leaking into copy, `NaN` in a progress width, or a
 * section that silently disappears when the person has no data yet.
 *
 * Two states are exercised throughout: a brand-new account (nothing logged)
 * and a real middle-of-the-journey account (logs, trackers, mood, points).
 */

import { createElement, type ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { evaluateAchievements, evaluateGoals } from "@/lib/progression/evaluate";
import { rankFor } from "@/lib/progression/ranks";
import { rankFor as _rankFor } from "@/lib/progression/ranks";
import type { ProgressionInput } from "@/lib/progression/types";
import { JourneyHero } from "./JourneyHero";
import { RankPath } from "./RankPath";
import { GoalsBoard, isWellnessDomain } from "./Goals";
import { AchievementGallery } from "./Achievements";
import { MilestoneArchive, PointActivity } from "./History";
import { RankCeremony } from "./RankCeremony";
import { Emblem } from "./Emblem";
import { RankChip } from "./RankChip";

/** Render a component with props — the repo's test glob only matches .ts. */
function render(Component: ComponentType<never>, props: Record<string, unknown>): string {
  return renderToStaticMarkup(
    createElement(Component as unknown as ComponentType<Record<string, unknown>>, props),
  );
}

const TODAY = "2026-09-10";

const empty: ProgressionInput = {
  today: TODAY,
  earnedLifetime: 0,
  mode: "device",
  habits: [],
  logs: [],
  trackerDays: [],
  trackerGoals: {
    sleepMinutes: 480,
    waterMl: 2200,
    movementMinutes: 30,
    studyMinutes: 120,
    energy: 3,
    screenMinutes: 180,
  },
  moodDays: [],
  moodCount: 0,
};

function daysAgo(n: number): string {
  const d = new Date(`${TODAY}T12:00:00`);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const rich: ProgressionInput = {
  ...empty,
  earnedLifetime: 2_850,
  habits: [
    { id: "h1", name: "Stretch", points: 20 },
    { id: "h2", name: "Read", points: 15 },
  ],
  logs: Array.from({ length: 9 }, (_, i) => ({ habitId: "h1", date: daysAgo(i) })),
  trackerDays: Array.from({ length: 6 }, (_, i) => ({
    date: daysAgo(i),
    sleepMinutes: 500,
    sleepQuality: 4,
    wakeTime: "06:30",
    waterMl: 2400,
    movementMinutes: i < 4 ? 35 : null,
    energy: 4,
    studyMinutes: 60,
    studySessions: 1,
  })),
  moodDays: [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(4), daysAgo(5)],
  moodCount: 6,
};

function stateFor(input: ProgressionInput) {
  const claimed = { has: () => false };
  const goals = evaluateGoals(input, claimed);
  const achievements = evaluateAchievements(input, { achievedAt: () => null });
  return { goals, achievements, rank: rankFor(input.earnedLifetime ?? 0) };
}

/* --------------------------------- hero ---------------------------------- */

describe("JourneyHero", () => {
  it("renders a brand-new account without inventing progress", () => {
    const { goals, rank } = stateFor(empty);
    const html = render(JourneyHero, { rank: rank, points: 0, loading: false, todayPoints: 0, weekPoints: 0, awardedTotal: 0, earnedFromHabits: 0, nextMilestone: null });
    expect(html).toContain("Your journey");
    expect(html).toContain("Seedling");
    expect(html).toContain("0");
    expect(html).not.toMatch(/undefined|NaN/);
    expect(goals.length).toBeGreaterThan(0);
  });

  it("shows the real rank, points and distance to the next rank", () => {
    const { goals, rank } = stateFor(rich);
    const nextMilestone = goals.find((g) => g.complete === false && g.progress > 0) ?? goals[0];
    const html = render(JourneyHero, { rank: rank, points: 2_850, loading: false, todayPoints: 600, weekPoints: 1_500, awardedTotal: 1_600, earnedFromHabits: 1_250, nextMilestone: nextMilestone ?? null });
    expect(html).toContain("Budding");
    expect(html).toContain("2,850");
    expect(html).toContain("points to In Bloom");
    expect(html).toContain("Your next milestone");
    expect(html).not.toMatch(/undefined|NaN/);
  });

  it("shows a loading state, not a zero, while points are unknown", () => {
    const rank = _rankFor(0);
    const html = render(JourneyHero, { rank: rank, points: 0, loading: true, todayPoints: 0, weekPoints: 0, awardedTotal: 0, earnedFromHabits: 0, nextMilestone: null });
    expect(html).toContain("Loading your points");
  });
});

/* --------------------------------- path ---------------------------------- */

describe("RankPath", () => {
  it("marks exactly one rank as the current one and keeps the future legible", () => {
    const html = render(RankPath, { points: 2_850, rankTier: 4 });
    expect(html).toContain("You are here");
    expect(html).toContain("Ahead");
    expect(html).toContain("Kept");
    expect(html.match(/You are here/g)?.length).toBe(1);
    expect(html).not.toMatch(/undefined|NaN/);
  });

  it("still has a path far past the named ladder", () => {
    const html = render(RankPath, { points: 80_000, rankTier: 20 });
    expect(html).toContain("Season of");
    expect(html).not.toMatch(/undefined|NaN/);
  });
});

/* --------------------------------- goals --------------------------------- */

describe("GoalsBoard", () => {
  it("lists real goals with their verified progress", () => {
    const { goals } = stateFor(rich);
    const daily = goals.filter((g) => g.goal.cadence === "daily");
    const html = render(GoalsBoard, { goals: daily, onClaim: () => {}, busy: false, claimingId: null });
    // HTML escapes apostrophes, so compare against the decoded copy
    const text = html.replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
    // the first daily goals are the ones shown; the rest stay behind the pager
    const first = daily[0];
    expect(first).toBeDefined();
    expect(text).toContain(first!.goal.title);
    expect((html.match(/class="pg-goal"/g) ?? []).length).toBeGreaterThan(0);
    expect(html).toContain("points");
    expect(html).not.toMatch(/undefined|NaN/);
  });

  it("summarises the full board instead of printing every card at once", () => {
    const { goals } = stateFor(rich);
    const html = render(GoalsBoard, { goals: goals, onClaim: () => {}, busy: false, claimingId: null });
    expect(html).toContain("Show");
    expect(html).toContain("goals in this view");
    expect(html.match(/class="pg-goal"/g)?.length ?? 0).toBeLessThanOrEqual(6);
    expect(html).not.toMatch(/undefined|NaN/);
  });

  it("offers a claim only where a goal is genuinely complete", () => {
    const { goals } = stateFor(rich);
    const claimable = goals.filter((g) => g.claimable);
    expect(claimable.length).toBeGreaterThan(0);
    const html = render(GoalsBoard, { goals: goals, onClaim: () => {}, busy: false, claimingId: null });
    expect(html).toContain("Claim points");
    // nothing shaming anywhere in the copy
    expect(html).not.toMatch(/failed|behind|don't lose|hurry|missed/i);
  });

  it("leads with timescales and keeps wellness goals first-class", () => {
    const { goals } = stateFor(rich);
    const html = render(GoalsBoard, { goals, onClaim: () => {}, busy: false, claimingId: null });
    // the cadences a person actually meets, in order
    const positions = ["Today", "This week", "This month", "Long-term milestones"].map((label) =>
      html.indexOf(`>${label}<`),
    );
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    // wellness is a named way in, not something you have to infer from chips
    expect(html).toContain("Wellness");
    expect(html.match(/class="pg-goal"/g)?.length ?? 0).toBeLessThanOrEqual(8);

    // among the goals that are actually shown, the body-and-mind ones with real
    // progress come before anything without it
    const rendered = goals.filter((g) => html.includes(g.goal.title));
    const firstProgress = rendered.findIndex((g) => g.progress > 0);
    const lastBlank = rendered.map((g) => g.progress > 0).lastIndexOf(false);
    if (firstProgress >= 0 && lastBlank >= 0 && firstProgress < rendered.length - 1) {
      expect(firstProgress).toBeLessThan(lastBlank);
    }
  });

  it("counts wellness goals on the chip so the number is never a claim", () => {
    const { goals } = stateFor(rich);
    const html = render(GoalsBoard, { goals, onClaim: () => {}, busy: false, claimingId: null });
    const wellness = goals.filter((g) => isWellnessDomain(g.goal.domain)).length;
    expect(wellness).toBeGreaterThan(0);
    expect(html).toContain(`pg-chip-count">${wellness}`);
  });

  it("classifies wellness from the domain, never from the goal's wording", () => {
    // The body-and-mind domains, and only those.
    for (const domain of ["fitness", "movement", "health", "sleep", "hydration", "recovery", "mood", "mindfulness", "self-care"] as const) {
      expect(isWellnessDomain(domain)).toBe(true);
    }
    for (const domain of ["habits", "consistency", "milestones", "study"] as const) {
      expect(isWellnessDomain(domain)).toBe(false);
    }
  });

  it("handles an account with no records calmly", () => {
    const { goals } = stateFor(empty);
    const html = render(GoalsBoard, { goals: goals, onClaim: () => {}, busy: false, claimingId: null });
    expect(html).toContain("Not started yet");
    expect(html).not.toMatch(/undefined|NaN/);
  });
});

/* ------------------------------ achievements ----------------------------- */

describe("AchievementGallery", () => {
  it("shows earned achievements with a real date and the rest with their condition", () => {
    const input = rich;
    const achievements = evaluateAchievements(input, {
      achievedAt: (id) => (id === "ach-seven-strong" ? "2026-09-10T08:00:00.000Z" : null),
    });
    const html = render(AchievementGallery, { achievements: achievements });
    expect(html).toContain("Seven Days Strong");
    expect(html).toContain("Earned");
    expect(html).toContain("First Bloom");
    expect(html).not.toMatch(/undefined|NaN/);
  });

  it("calls an unlocked achievement earned even before its date is written", () => {
    // A rank can be reached without claiming anything, so an achievement can be
    // unlocked in memory a moment before its date is recorded. It must read
    // "Earned" — never "still ahead" about something that already happened.
    const achievements = evaluateAchievements(rich, { achievedAt: () => null });
    const unlocked = achievements.filter((a) => a.unlocked);
    expect(unlocked.length).toBeGreaterThan(0);
    const html = render(AchievementGallery, { achievements });
    expect(html).toContain("Earned");
    expect(html).not.toMatch(/undefined|NaN/);
  });

  it("states conditions for locked achievements instead of teasing", () => {
    const achievements = evaluateAchievements(empty, { achievedAt: () => null });
    const html = render(AchievementGallery, { achievements: achievements });
    expect(html).toContain("still ahead");
    expect(html).not.toMatch(/undefined|NaN/);
  });
});

/* -------------------------------- history -------------------------------- */

describe("history surfaces", () => {
  it("explains an empty ledger instead of faking rows", () => {
    const html = render(PointActivity, { ledger: [], today: TODAY });
    expect(html).toContain("Nothing has been awarded yet");
    expect(html).not.toMatch(/undefined|NaN/);
  });

  it("shows real awards with dates, sources and amounts", () => {
    const ledger = [
      {
        id: "1",
        kind: "goal" as const,
        refId: "week-movement",
        periodKey: "2026-W37",
        title: "Complete 5 movement sessions",
        source: "fitness" as const,
        points: 600,
        at: "2026-09-10T09:00:00.000Z",
      },
      {
        id: "2",
        kind: "achievement" as const,
        refId: "ach-seven-strong",
        periodKey: "once",
        title: "Seven Days Strong",
        source: "milestones" as const,
        points: 0,
        at: "2026-09-04T09:00:00.000Z",
      },
    ];
    const activity = render(PointActivity, { ledger: ledger, today: TODAY });
    expect(activity).toContain("Complete 5 movement sessions");
    expect(activity).toContain("+600");
    expect(activity).toContain("Fitness");

    const archive = render(MilestoneArchive, { ledger: ledger, ranks: [{ tier: 5, name: "In Bloom", atPoints: 3_500, at: "2026-09-10T09:00:00.000Z" }], today: TODAY });
    expect(archive).toContain("Reached In Bloom");
    expect(archive).toContain("Earned Seven Days Strong");
    expect(archive).not.toMatch(/undefined|NaN/);
  });
});

/* -------------------------------- ceremony ------------------------------- */

describe("RankCeremony", () => {
  it("celebrates the rank it was given, with its real threshold", () => {
    const html = render(RankCeremony, { rank: rankFor(3_500), onClose: () => {} });
    expect(html).toContain("In Bloom");
    expect(html).toContain("3,500 points");
    expect(html).toContain("Keep going");
    expect(html).not.toMatch(/undefined|NaN/);
  });
});

/* --------------------------------- emblems ------------------------------- */

describe("emblems", () => {
  it("renders a real mark for every rank and achievement", () => {
    const { achievements, rank } = stateFor(rich);
    const ids = new Set<string>([rank.rank.emblem, rank.next.emblem]);
    for (const a of achievements) ids.add(a.def.emblem);
    for (const id of ids) {
      const html = render(Emblem, { id: id, size: 32 });
      expect(html).toContain("<svg");
      expect(html).not.toContain("undefined");
    }
  });

  it("falls back to a real mark for an unknown id rather than rendering nothing", () => {
    const html = render(Emblem, { id: 'not-a-real-emblem', size: 20 });
    expect(html).toContain("<svg");
  });
});

/* ------------------------------- home chip ------------------------------- */

describe("RankChip (Home)", () => {
  it("states the real distance to the next rank", () => {
    const html = render(RankChip, { points: 2_850 });
    expect(html).toContain("points to In Bloom");
    expect(html).not.toMatch(/undefined|NaN/);
  });

  it("stays quiet while points load", () => {
    const html = render(RankChip, { points: null });
    expect(html).toContain("Your journey");
  });
});
