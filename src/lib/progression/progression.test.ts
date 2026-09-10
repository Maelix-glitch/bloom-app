/**
 * Progression QA — the guarantees the journey makes.
 *
 * These are the checks from the product brief, expressed as tests:
 *   · points come from real records only (no fabrication, no estimation)
 *   · a completed goal awards once and only once, per period
 *   · a rank unlock happens exactly once when a goal crosses a threshold
 *   · the ladder never ends: 0 → 20,000 → 1,000,000 all resolve
 *   · missing a day never erases progress
 *   · achievements need their real condition, and never double-award
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  evaluateAchievements,
  evaluateGoals,
  goalTarget,
  isoWeekKey,
  longestRun,
  periodKeyFor,
  resolveSpec,
  windowDays,
} from "./evaluate";
import { GOALS, GOAL_BY_ID, recommendNext } from "./goals";
import { ACHIEVEMENTS } from "./achievements";
import { CYCLE_STEP, LADDER_BASE, NAMED_RANK_COUNT, cycleRankAt, journeyRanks, rankFor } from "./ranks";
import type { GoalProgress, ProgressionInput } from "./types";

/* ------------------------------- fixtures -------------------------------- */

const TODAY = "2026-09-10";

function input(overrides: Partial<ProgressionInput> = {}): ProgressionInput {
  return {
    today: TODAY,
    earnedLifetime: 0,
    mode: "device",
    habits: [
      { id: "h1", name: "Stretch", points: 20 },
      { id: "h2", name: "Water", points: 10 },
    ],
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
    ...overrides,
  };
}

/** n consecutive days of habit ticks, ending today. */
function consecutiveLogs(n: number, from = TODAY) {
  const logs: { habitId: string; date: string }[] = [];
  const anchor = new Date(`${from}T12:00:00`);
  for (let i = 0; i < n; i += 1) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    logs.push({ habitId: "h1", date: iso });
  }
  return logs;
}

function trackerDay(date: string, overrides: Partial<ProgressionInput["trackerDays"][number]> = {}) {
  return {
    date,
    sleepMinutes: null,
    sleepQuality: null,
    wakeTime: null,
    waterMl: null,
    movementMinutes: null,
    energy: null,
    studyMinutes: 0,
    studySessions: 0,
    ...overrides,
  };
}

const noClaims = { has: () => false };

function goalState(goals: GoalProgress[], id: string): GoalProgress {
  const found = goals.find((g) => g.goal.id === id);
  if (!found) throw new Error(`missing goal ${id}`);
  return found;
}

/* ------------------------------ verification ----------------------------- */

describe("verification reads real records only", () => {
  it("counts nothing when there is no data", () => {
    const goals = evaluateGoals(input(), noClaims);
    expect(goals.every((g) => g.progress === 0)).toBe(true);
    expect(goals.every((g) => !g.claimable)).toBe(true);
  });

  it("counts distinct habit days inside the window", () => {
    expect(resolveSpec({ on: "habitDays", window: 7 }, input({ logs: consecutiveLogs(4) }))).toBe(4);
    // a tick 10 days ago is outside a 7-day window…
    expect(
      resolveSpec({ on: "habitDays", window: 7 }, input({ logs: consecutiveLogs(1, "2026-08-31") })),
    ).toBe(0);
    // …but inside the lifetime one
    expect(
      resolveSpec({ on: "habitDays", window: 400 }, input({ logs: consecutiveLogs(1, "2026-08-31") })),
    ).toBe(1);
  });

  it("keeps the longest run even after a missed day", () => {
    // 5 days, a gap, then 2 more — the run is 5, and nothing is erased.
    const logs = [
      ...consecutiveLogs(5, "2026-09-01"),
      ...consecutiveLogs(2, "2026-09-10"),
    ];
    expect(longestRun(new Set(logs.map((l) => l.date)))).toBe(5);
    expect(resolveSpec({ on: "habitDays", window: 400 }, input({ logs }))).toBe(7);
  });

  it("reads movement, hydration and sleep from tracker days", () => {
    const days = [
      trackerDay("2026-09-09", { movementMinutes: 25, waterMl: 800 }),
      trackerDay("2026-09-10", { movementMinutes: 40, waterMl: 2400, sleepMinutes: 500, sleepQuality: 4, wakeTime: "06:45" }),
    ];
    const base = input({ trackerDays: days });
    expect(resolveSpec({ on: "movementSessions", window: 7 }, base)).toBe(2);
    expect(resolveSpec({ on: "trackerDays", tracker: "water", window: 7 }, base)).toBe(2);
    expect(resolveSpec({ on: "trackerGoalDays", tracker: "sleep", window: 7 }, base)).toBe(1);
    expect(resolveSpec({ on: "recoveryDays", window: 7 }, base)).toBe(1);
    expect(resolveSpec({ on: "earlyDays", before: "07:30", window: 7 }, base)).toBe(1);
  });

  it("never infers a wake time that was not logged", () => {
    const days = [trackerDay("2026-09-10", { sleepMinutes: 500, sleepQuality: 4 })];
    expect(resolveSpec({ on: "earlyDays", before: "07:30", window: 7 }, input({ trackerDays: days }))).toBe(0);
  });

  it("counts study sessions from the sessions list", () => {
    const days = [trackerDay("2026-09-10", { studyMinutes: 90, studySessions: 3 })];
    expect(resolveSpec({ on: "studySessions", window: 7 }, input({ trackerDays: days }))).toBe(3);
    expect(resolveSpec({ on: "trackerDays", tracker: "study", window: 7 }, input({ trackerDays: days }))).toBe(1);
  });

  it("balance days count any check-in, from any record", () => {
    const base = input({
      logs: consecutiveLogs(1),
      trackerDays: [trackerDay("2026-09-09", { energy: 4 })],
      moodDays: ["2026-09-08"],
    });
    expect(resolveSpec({ on: "balanceDays", window: 7 }, base)).toBe(3);
  });

  it("counts mood days only where entries exist", () => {
    expect(resolveSpec({ on: "moodDays", window: 7 }, input({ moodDays: ["2026-09-10", "2026-09-09"] }))).toBe(2);
  });

  it("uses the person's own routine as the daily target", () => {
    const goal = GOAL_BY_ID.get("daily-routine");
    if (!goal) throw new Error("missing daily-routine");
    const base = input({
      habits: [
        { id: "a", name: "A", points: 10 },
        { id: "b", name: "B", points: 10 },
        { id: "c", name: "C", points: 10 },
      ],
    });
    expect(goalTarget(goal, base)).toBe(3);
    const goals = evaluateGoals({ ...base, logs: [{ habitId: "a", date: TODAY }] }, noClaims);
    const state = goalState(goals, "daily-routine");
    expect(state.progress).toBe(1);
    expect(state.complete).toBe(false);
    expect(state.remaining).toBe(2);
  });

  it("windows are inclusive of today and end exactly at the horizon", () => {
    expect(windowDays(TODAY, 7)).toEqual({ from: "2026-09-04", to: TODAY });
    expect(windowDays(TODAY, 1)).toEqual({ from: TODAY, to: TODAY });
  });
});

/* ------------------------------ claim safety ----------------------------- */

describe("claim safety", () => {
  it("a completed goal is claimable exactly once per period", () => {
    const logs = consecutiveLogs(5);
    const goals = evaluateGoals(input({ logs }), noClaims);
    const weekly = goalState(goals, "week-consistency");
    expect(weekly.complete).toBe(true);
    expect(weekly.claimable).toBe(true);

    // A second evaluation with the award recorded flips it to claimed.
    const claimedKey = `${weekly.goal.id}|${weekly.periodKey}`;
    const after = evaluateGoals(input({ logs }), {
      has: (id, period) => `${id}|${period}` === claimedKey,
    });
    const again = goalState(after, "week-consistency");
    expect(again.complete).toBe(true);
    expect(again.claimable).toBe(false);
    expect(again.claimed).toBe(true);
  });

  it("periods roll over cleanly: daily, weekly, monthly, one-time", () => {
    const daily = GOAL_BY_ID.get("daily-move");
    const weekly = GOAL_BY_ID.get("week-movement");
    const monthly = GOAL_BY_ID.get("month-movement");
    const once = GOAL_BY_ID.get("run-7");
    if (!daily || !weekly || !monthly || !once) throw new Error("missing goals");

    expect(periodKeyFor(daily, TODAY)).toBe(TODAY);
    expect(periodKeyFor(weekly, TODAY)).toBe(isoWeekKey(TODAY));
    expect(periodKeyFor(monthly, TODAY)).toBe("2026-09");
    expect(periodKeyFor(once, TODAY)).toBe("once");

    // A new day is a new period for a daily goal; a new week for a weekly one.
    expect(periodKeyFor(daily, "2026-09-11")).not.toBe(periodKeyFor(daily, TODAY));
    expect(periodKeyFor(weekly, "2026-09-05")).not.toBe(periodKeyFor(weekly, TODAY));
  });

  it("an insufficient-progress goal cannot be claimed and says so kindly", () => {
    const goals = evaluateGoals(input({ logs: consecutiveLogs(3) }), noClaims);
    const weekly = goalState(goals, "week-consistency");
    expect(weekly.complete).toBe(false);
    expect(weekly.claimable).toBe(false);
    expect(weekly.remaining).toBe(2);
  });

  it("one-time milestones stay claimed forever", () => {
    const logs = consecutiveLogs(10);
    const claimedOnce = evaluateGoals(input({ logs }), {
      has: (id, period) => id === "run-7" && period === "once",
    });
    const run7 = goalState(claimedOnce, "run-7");
    expect(run7.claimable).toBe(false);
    // and the longer run is still waiting, unaffected
    expect(goalState(claimedOnce, "run-14").claimed).toBe(false);
  });
});

/* --------------------------------- ranks --------------------------------- */

describe("ranks", () => {
  it("derives the rank from earned points", () => {
    expect(rankFor(0).rank.name).toBe("Seedling");
    expect(rankFor(499).rank.name).toBe("Seedling");
    expect(rankFor(500).rank.name).toBe("First Bloom");
    expect(rankFor(3_500).rank.name).toBe("In Bloom");
    expect(rankFor(4_000).rank.name).toBe("In Bloom");
    expect(rankFor(5_000).rank.name).toBe("Flourish");
    expect(rankFor(25_000).rank.name).toBe("Bloomkeeper");
  });

  it("a goal crossing a threshold unlocks the rank exactly once", () => {
    const before = rankFor(2_850);
    expect(before.rank.name).toBe("Budding");
    expect(before.remaining).toBe(650);

    const after = rankFor(2_850 + 700);
    expect(after.rank.name).toBe("In Bloom");
    expect(after.rank.tier).toBeGreaterThan(before.rank.tier);

    // Re-evaluating at the same balance yields the same tier — a re-cross can
    // never be mistaken for a new rank-up (the ledger keys on the tier).
    expect(rankFor(3_550).rank.tier).toBe(after.rank.tier);
  });

  it("never ends: 0 → 20,000 → a million all resolve to a real rank", () => {
    for (const points of [0, 500, 1_000, 2_500, 4_000, 10_000, 20_000, 250_000, 1_000_000]) {
      const state = rankFor(points);
      expect(state.rank.name.length).toBeGreaterThan(0);
      expect(state.next.tier).toBe(state.rank.tier + 1);
      expect(state.next.threshold).toBeGreaterThan(state.rank.threshold);
      expect(state.progress).toBeGreaterThanOrEqual(0);
      expect(state.progress).toBeLessThanOrEqual(1);
    }
  });

  it("the cycle layer keeps opening without repeating a threshold", () => {
    const thresholds = new Set<number>();
    for (let i = 0; i < 60; i += 1) {
      const rank = cycleRankAt(i);
      expect(thresholds.has(rank.threshold)).toBe(false);
      thresholds.add(rank.threshold);
    }
    expect(cycleRankAt(0).threshold).toBe(25_000 + CYCLE_STEP);
    expect(cycleRankAt(1).threshold - cycleRankAt(0).threshold).toBe(CYCLE_STEP);
  });

  it("the journey path always shows the person's own rank", () => {
    const ranks = journeyRanks(3_600, 2, 3);
    expect(ranks.some((r) => r.tier === rankFor(3_600).rank.tier)).toBe(true);
    expect(ranks.length).toBeGreaterThanOrEqual(4);
    // and it works past the named ladder
    const deep = journeyRanks(80_000, 2, 3);
    expect(deep.some((r) => r.threshold > 25_000)).toBe(true);
  });

  it("the named ladder is ordered and starts at zero", () => {
    expect(LADDER_BASE[0]?.threshold).toBe(0);
    for (let i = 1; i < LADDER_BASE.length; i += 1) {
      const prev = LADDER_BASE[i - 1];
      const curr = LADDER_BASE[i];
      if (!prev || !curr) throw new Error("ladder gap");
      expect(curr.threshold).toBeGreaterThan(prev.threshold);
      expect(curr.tier).toBe(prev.tier + 1);
    }
    expect(NAMED_RANK_COUNT).toBe(12);
  });
});

/* ------------------------------ achievements ----------------------------- */

describe("the economy", () => {
  it("never pays a trivial amount for a goal", () => {
    // Bloom Points are meant to feel like progress. A goal award is always at
    // least an order of magnitude above the smallest habit tick (5), so no goal
    // can read as a token gesture.
    for (const goal of GOALS) {
      expect(goal.points).toBeGreaterThanOrEqual(100);
      expect(Number.isInteger(goal.points)).toBe(true);
    }
  });

  it("keeps repeating cadences honest about what they pay", () => {
    // A daily goal is available every day, so it must not out-pay a weekly or
    // one-time goal of comparable work.
    const daily = GOALS.filter((g) => g.cadence === "daily");
    const weekly = GOALS.filter((g) => g.cadence === "weekly");
    const longest = GOALS.filter((g) => g.cadence === "one-time");
    expect(Math.max(...daily.map((g) => g.points))).toBeLessThan(
      Math.max(...weekly.map((g) => g.points)),
    );
    expect(Math.max(...weekly.map((g) => g.points))).toBeLessThan(
      Math.max(...longest.map((g) => g.points)),
    );
  });

  it("keeps the top of the ladder reachable but never final", () => {
    const top = Math.max(...GOALS.map((g) => g.points));
    const lastNamed = LADDER_BASE[LADDER_BASE.length - 1];
    if (!lastNamed) throw new Error("empty ladder");
    // the whole catalog could be claimed more than once over and the ladder
    // would still have somewhere to go
    expect(cycleRankAt(1).threshold).toBeGreaterThan(lastNamed.threshold);
    expect(top).toBeGreaterThanOrEqual(10_000);
  });
});

describe("achievements", () => {
  const never = { achievedAt: () => null };

  it("unlock only when their real condition is met", () => {
    const cold = evaluateAchievements(input(), never);
    expect(cold.every((a) => !a.unlocked)).toBe(true);

    const warm = evaluateAchievements(input({ logs: consecutiveLogs(7) }), never);
    const seven = warm.find((a) => a.def.id === "ach-seven-strong");
    expect(seven?.unlocked).toBe(true);
    const thirty = warm.find((a) => a.def.id === "ach-thirty-strong");
    expect(thirty?.unlocked).toBe(false);
    expect(thirty?.progress).toBe(7);
  });

  it("rank achievements follow real earned points", () => {
    const states = evaluateAchievements(input({ earnedLifetime: 3_500 }), never);
    expect(states.find((a) => a.def.id === "ach-in-bloom")?.unlocked).toBe(true);
    expect(states.find((a) => a.def.id === "ach-flourish")?.unlocked).toBe(false);
  });

  it("carry their real earned date when they have one", () => {
    const states = evaluateAchievements(input({ logs: consecutiveLogs(7) }), {
      achievedAt: (id) => (id === "ach-seven-strong" ? "2026-09-10T08:00:00.000Z" : null),
    });
    const seven = states.find((a) => a.def.id === "ach-seven-strong");
    expect(seven?.achievedAt).toBe("2026-09-10T08:00:00.000Z");
  });

  it("defines a real condition for every achievement", () => {
    for (const def of ACHIEVEMENTS) {
      expect(def.condition.length).toBeGreaterThan(8);
      expect(def.target).toBeGreaterThan(0);
      // every action-based achievement must be resolvable from real records
      expect(() => resolveSpec(def.spec, input())).not.toThrow();
    }
  });
});

/* ------------------------------ next milestone --------------------------- */

describe("the next milestone recommendation", () => {
  it("prefers a goal with real progress, then the closest", () => {
    const goals = evaluateGoals(
      input({
        logs: consecutiveLogs(3),
        trackerDays: [trackerDay("2026-09-10", { movementMinutes: 20 })],
      }),
      noClaims,
    );
    const next = recommendNext(goals);
    expect(next).not.toBeNull();
    expect(next?.progress).toBeGreaterThan(0);
    expect(next?.complete).toBe(false);
  });

  it("never recommends an already-claimed goal", () => {
    const goals = evaluateGoals(input({ logs: consecutiveLogs(7) }), {
      has: (id, period) => id === "week-consistency" && period === isoWeekKey(TODAY),
    });
    const next = recommendNext(goals);
    expect(next?.claimed).toBe(false);
  });

  it("returns null only when everything really is claimed", () => {
    const allClaimed = { has: () => true };
    const goals = evaluateGoals(input({ logs: consecutiveLogs(7) }), allClaimed);
    expect(recommendNext(goals)).toBeNull();
    // and even then, the ladder continues — there is no terminal page state
    expect(rankFor(50_000).next.name.length).toBeGreaterThan(0);
  });
});

/* -------------------------------- storage -------------------------------- */

describe("the award ledger", () => {
  beforeEach(() => {
    vi.resetModules();
    const store = new Map<string, string>();
    const localStorageMock = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    };
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStorageMock });
    // prefs.ts reads window.localStorage directly — the window mock owns it.
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: localStorageMock,
        dispatchEvent: () => true,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
  });

  it("awards once, refuses the duplicate, and never invents a record", async () => {
    const { recordAward, hasClaim, loadLedger, ledgerPoints } = await import("./store");

    const first = recordAward({
      kind: "goal",
      refId: "week-movement",
      periodKey: "2026-W37",
      title: "Complete 5 movement sessions",
      source: "fitness",
      points: 600,
    });
    expect(first?.points).toBe(600);

    const second = recordAward({
      kind: "goal",
      refId: "week-movement",
      periodKey: "2026-W37",
      title: "Complete 5 movement sessions",
      source: "fitness",
      points: 600,
    });
    expect(second).toBeNull();
    expect(ledgerPoints()).toBe(600);
    expect(hasClaim("week-movement", "2026-W37")).toBe(true);
    expect(loadLedger().ledger).toHaveLength(1);

    // a new week is a new, genuine award
    const nextWeek = recordAward({
      kind: "goal",
      refId: "week-movement",
      periodKey: "2026-W38",
      title: "Complete 5 movement sessions",
      source: "fitness",
      points: 600,
    });
    expect(nextWeek).not.toBeNull();
    expect(ledgerPoints()).toBe(1200);
  });

  it("records a rank exactly once, even if the threshold is crossed twice", async () => {
    const { recordRank, loadLedger } = await import("./store");
    expect(recordRank(5, "In Bloom", 3_500)).not.toBeNull();
    expect(recordRank(5, "In Bloom", 3_600)).toBeNull();
    expect(loadLedger().ranks.filter((r) => r.tier === 5)).toHaveLength(1);
    // a later tier is still welcome
    expect(recordRank(6, "Flourish", 5_000)).not.toBeNull();
  });

  it("walks a whole simulated journey without repeating an award", async () => {
    const { recordAward, ledgerPoints, loadLedger } = await import("./store");
    const goals = evaluateGoals(input({ logs: consecutiveLogs(30) }), {
      has: (id, period) => loadLedger().ledger.some((e) => e.refId === id && e.periodKey === period),
    });
    const completed = goals.filter((g) => g.complete);
    expect(completed.length).toBeGreaterThan(5);

    // Claim everything twice; only the first pass may move the balance.
    for (let pass = 0; pass < 2; pass += 1) {
      for (const goal of completed) {
        recordAward({
          kind: "goal",
          refId: goal.goal.id,
          periodKey: goal.periodKey,
          title: goal.goal.title,
          source: goal.goal.source,
          points: goal.goal.points,
        });
      }
    }
    const expected = completed.reduce((sum, g) => sum + g.goal.points, 0);
    expect(ledgerPoints()).toBe(expected);
    expect(loadLedger().ledger).toHaveLength(completed.length);

    // 30 consecutive days of habit keeping is a genuinely substantial balance
    expect(expected).toBeGreaterThanOrEqual(3_000);
  });
});
