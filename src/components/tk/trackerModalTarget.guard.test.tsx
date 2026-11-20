// @vitest-environment jsdom
/**
 * M-167 — the log sheet's header states the RESOLVED water target.
 *
 * The modal used to read the raw stored manual goal for every tracker,
 * so water's header said "Target · 2.2L" (the stored default) while
 * the Trackers page, the targets sheet and the plan all measured
 * against the plan guide's 3.4 L. The modal now makes the exact
 * choice Targets.tsx makes: water wears store.waterTargetMl when one
 * exists, the stored goal otherwise; every other tracker is untouched.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { TrackerStore } from "@/hooks/useTrackers";
import { trackerDef, type DayEntry, type Goals } from "@/lib/trackers/core";
import { TrackerModal } from "./TrackerModal";

beforeEach(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

afterEach(cleanup);

const GOALS: Goals = {
  sleepMinutes: 480,
  waterMl: 2200,
  studyMinutes: 120,
  movementMinutes: 30,
  energy: 3,
  screenMinutes: 180,
};

function makeStore(waterTargetMl: number | null): TrackerStore {
  return {
    sync: { state: "off", message: "", signedIn: false },
    syncNow: () => {},
    days: [] as DayEntry[],
    goals: GOALS,
    waterTargetMl,
    analysis: null,
    today: "2026-11-21",
    hydrated: true,
    saveDay: () => ({ ok: true as const }),
    removeDay: () => {},
    clearAll: () => {},
    setGoal: () => {},
    resetGoals: () => {},
    active: ["sleep", "water", "study", "movement", "energy", "screen"],
    setActive: () => {},
    toggleActive: () => {},
    customSubjects: [],
    rememberSubject: () => {},
    forgetSubject: () => {},
    undoable: null,
    undo: () => {},
    dismissUndo: () => {},
  } as unknown as TrackerStore;
}

describe("M-167 — the log sheet header target", () => {
  it("water wears the resolved plan target when one exists", () => {
    render(<TrackerModal store={makeStore(3350)} tracker="water" onClose={() => {}} />);
    expect(screen.getByText(`Target · ${trackerDef("water").format(3350)}`)).toBeTruthy();
    expect(screen.queryByText(`Target · ${trackerDef("water").format(2200)}`)).toBeNull();
  });

  it("water falls back to the stored manual goal when no guide figure exists", () => {
    render(<TrackerModal store={makeStore(null)} tracker="water" onClose={() => {}} />);
    expect(screen.getByText(`Target · ${trackerDef("water").format(2200)}`)).toBeTruthy();
  });

  it("every other tracker still reads its stored goal, resolved figure or not", () => {
    render(<TrackerModal store={makeStore(3350)} tracker="sleep" onClose={() => {}} />);
    expect(screen.getByText(`Target · ${trackerDef("sleep").format(480)}`)).toBeTruthy();
  });
});
