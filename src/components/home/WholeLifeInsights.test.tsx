// @vitest-environment jsdom
/**
 * WholeLifeInsights — presentation over buildWholeLifeInsights, with
 * the five data hooks mocked at the module boundary (the engine itself
 * is pinned in lib/insights/insights.test.ts). The section must show
 * real patterns with their sample sizes, the honest not-enough-data
 * state with its counts, and nothing but a skeleton before the
 * record has settled.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const trackersState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const habitsState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const moodState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const nutritionState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const bodyState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/hooks/useTrackers", () => ({ useTrackers: () => trackersState.current }));
vi.mock("@/hooks/useHabits", () => ({ useHabits: () => habitsState.current }));
vi.mock("@/hooks/useMoodSystem", () => ({ useMoodSystem: () => moodState.current }));
vi.mock("@/hooks/useNutrition", () => ({ useNutrition: () => nutritionState.current }));
vi.mock("@/hooks/useBodyProfile", () => ({ useBodyProfile: () => bodyState.current }));

import { shiftDay } from "@/lib/localDay";
import type { MoodEntry } from "@/lib/mood/types";
import type { DayEntry } from "@/lib/trackers/core";
import { WholeLifeInsights } from "./WholeLifeInsights";

afterEach(cleanup);

const TODAY = "2026-11-18";
const day = (back: number): string => shiftDay(TODAY, -back);

let seq = 0;
const mood = (date: string, value: number): MoodEntry => ({
  id: `m${(seq += 1)}`,
  timestamp: `${date}T09:00:00`,
  mood: value,
  energy: 5,
  stress: 5,
  emotions: [],
  tags: [],
});

const tracker = (date: string, sleepMinutes: number): DayEntry => ({
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
    moodEntries.push(mood(day(back), long ? 9 : 5));
    trackerDays.push(tracker(day(back), long ? 510 : 330));
  }
  trackersState.current = { today: TODAY, days: trackerDays };
  moodState.current = { entries: moodEntries };
  habitsState.current = { logs: [] };
  nutritionState.current = { entries: [] };
  bodyState.current = { weighIns: [] };
}

describe("WholeLifeInsights", () => {
  it("renders a pattern with its sample size and window", () => {
    setRecord(10);
    const { container } = render(<WholeLifeInsights ready />);
    expect(container.textContent).toContain("Mood tends to run higher after longer sleep");
    expect(container.textContent).toContain("Based on 10 paired days · last 56 days");
    expect(container.textContent).toContain("never what causes what");
  });

  it("shows the honest pending state with real counts when data is thin", () => {
    setRecord(5);
    const { container } = render(<WholeLifeInsights ready />);
    expect(container.textContent).toContain("Not enough paired days yet");
    expect(container.textContent).toContain("Sleep & mood");
    expect(container.textContent).toContain("5 of 8 paired days");
    expect(container.textContent).not.toContain("tends to run");
  });

  it("paints no data before the record has settled", () => {
    setRecord(10);
    const { container } = render(<WholeLifeInsights ready={false} />);
    expect(container.querySelector("section")!.getAttribute("aria-busy")).toBe("true");
    expect(container.textContent).not.toContain("tends to run");
    expect(container.textContent).not.toContain("paired days");
  });
});
