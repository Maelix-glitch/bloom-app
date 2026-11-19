// @vitest-environment jsdom
/**
 * Trackers guards (Brief v6 Slice 6 — M-128, M-129, M-131, M-132, M-133,
 * M-134). The §6 layout guards need real geometry and are verified live
 * by the parent; what CAN be pinned structurally is pinned here:
 *
 *   1. M-128: `text-transform: uppercase` does not exist in the trackers
 *      sheet at all — the mono+uppercase pairing cannot regrow, and no
 *      rendered paragraph on the page is all caps.
 *   2. M-129: every tracker tile carries a quick-log control wired to
 *      the existing write path (water's +250 ml, energy's five dots,
 *      sleep's "Log last night" into its existing sheet).
 *   3. M-131: the 24h dial is gone; the Bloom flower stands in its
 *      place with one petal per tracker, filled from the core's own
 *      `met` state, beside the serif "N of 6 reached today".
 *   4. M-132: the Targets section is a display list — human units, no
 *      form inputs outside the sheet; one "Edit targets" button.
 *   5. M-133: achievement zero-states never render a bare "0".
 *   6. M-134: the sleep section states its empty record ONCE, and the
 *      "What the record shows" / "The route" sections do not render a
 *      head over an empty body.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

/** jsdom ships no matchMedia, and BloomSheet asks it whether this is a phone. */
beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const TRACKERS_CSS = read("styles/trackers.css");
const PAGE = read("components/tk/TrackersPage.tsx");

/* Mutable store fixture — the mock reads the current world at render
   time, so each case sets the record it needs. */
const world = vi.hoisted(() => ({
  current: null as null | Record<string, unknown>,
}));

vi.mock("@/hooks/useTrackers", () => ({
  useTrackers: () => world.current,
}));

vi.mock("@/hooks/useAssessment", () => ({
  useAssessment: () => ({
    state: { status: "complete", answers: { sleepHoursTypical: null } },
  }),
}));

import {
  analyzeTrackers,
  DEFAULT_GOALS,
  emptyDay,
  TRACKERS,
  type DayEntry,
  type TrackerId,
} from "@/lib/trackers/core";
import { TrackersPage } from "./TrackersPage";

const TODAY = "2026-11-18";
const ALL: TrackerId[] = TRACKERS.map((t) => t.id);

function makeStore(days: DayEntry[]) {
  return {
    sync: { state: "saved", message: "On this device" },
    syncNow: () => {},
    days,
    goals: { ...DEFAULT_GOALS },
    analysis: analyzeTrackers(days, DEFAULT_GOALS, TODAY, { active: ALL }),
    today: TODAY,
    hydrated: true,
    saveDay: () => ({ ok: true as const }),
    removeDay: () => {},
    clearAll: () => {},
    setGoal: () => {},
    resetGoals: () => {},
    active: [...ALL],
    setActive: () => {},
    toggleActive: () => {},
    customSubjects: [],
    rememberSubject: () => {},
    forgetSubject: () => {},
    undoable: null,
    undo: () => {},
    dismissUndo: () => {},
  };
}

function day(date: string, patch: Partial<DayEntry>): DayEntry {
  return { ...emptyDay(date), ...patch };
}

/** A day that meets every target at once. */
const FULL_DAY = day(TODAY, {
  sleepMinutes: 480,
  waterMl: 2200,
  sessions: [{ subject: "General", minutes: 120, startAt: null }],
  movementMinutes: 30,
  energy: 4,
  screenMinutes: 120,
});

afterEach(() => cleanup());

describe("trackers v6 guards — the sheet (M-128)", () => {
  it("carries no uppercase text-transform anywhere", () => {
    expect(TRACKERS_CSS).not.toMatch(/text-transform:\s*uppercase/);
  });

  it("the dial is deleted from the page source", () => {
    expect(PAGE).not.toContain("at-compass");
    expect(PAGE).not.toContain("at-centre-label");
    expect(PAGE).not.toContain("RING_ORDER");
  });
});

describe("trackers v6 guards — empty record", () => {
  it("every tile renders a quick-log control, and no dotted baseline", () => {
    world.current = makeStore([]);
    const { container } = render(<TrackersPage />);
    const tiles = container.querySelectorAll(".at-territory");
    expect(tiles.length).toBe(6);
    for (const tile of tiles) {
      expect(
        tile.querySelector(".at-territory-actions button"),
        `tile ${tile.getAttribute("data-id")} has a quick-log control`,
      ).toBeTruthy();
    }
    expect(within(tiles[1] as HTMLElement).getByRole("button", { name: /\+250\s?ml/i })).toBeTruthy();
    expect(within(tiles[0] as HTMLElement).getByRole("button", { name: /log last night/i })).toBeTruthy();
    const energy = tiles[4] as HTMLElement;
    for (const n of ["1", "2", "3", "4", "5"]) {
      expect(within(energy).getByRole("button", { name: n })).toBeTruthy();
    }
    /* the dotted "nothing here" baseline is gone from empty tiles */
    expect(container.querySelector(".at-contour-empty")).toBeNull();
  });

  it("the flower stands where the dial was: six petals, none filled, serif count", () => {
    world.current = makeStore([]);
    const { container } = render(<TrackersPage />);
    expect(container.querySelector(".at-compass")).toBeNull();
    const flower = container.querySelector('[data-testid="tracker-flower"]');
    expect(flower).toBeTruthy();
    expect(flower!.querySelectorAll("[data-petal]").length).toBe(6);
    expect(flower!.querySelectorAll('[data-petal][data-met="true"]').length).toBe(0);
    expect(flower!.textContent).toContain("0 of 6 reached today");
  });

  it("targets are a display list: human units, one edit button, no inputs on the page", () => {
    world.current = makeStore([]);
    const { container } = render(<TrackersPage />);
    expect(screen.getByRole("button", { name: /edit targets/i })).toBeTruthy();
    expect(container.querySelectorAll(".tk2-targets-display li").length).toBe(6);
    const display = container.querySelector(".tk2-targets-display")!;
    expect(display.textContent).toContain("8 h");
    expect(display.textContent).toContain("2.2 L");
    expect(display.textContent).not.toContain("480");
    expect(display.textContent).not.toContain("2200");
    /* the form lives in the sheet — closed sheets render nothing */
    expect(container.querySelectorAll("input").length).toBe(0);
  });

  it("no rendered paragraph is all caps", () => {
    world.current = makeStore([]);
    const { container } = render(<TrackersPage />);
    const offenders: string[] = [];
    for (const el of container.querySelectorAll("p, li, span")) {
      const text = (el.textContent ?? "").trim();
      if (text.length > 24 && /[A-Z]/.test(text) && text === text.toUpperCase()) {
        offenders.push(text.slice(0, 40));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the sleep section states its empty record once (M-134)", () => {
    /* a logged day exists (so the section mounts) but no night is
       recorded — the sleep record itself is empty */
    world.current = makeStore([day(TODAY, { waterMl: 250 })]);
    const { container } = render(<TrackersPage />);
    const section = container.querySelector('[aria-label="Sleep and recovery"]');
    expect(section).toBeTruthy();
    const text = section!.textContent ?? "";
    /* one honest line about the empty record — not two */
    expect(text.match(/no nights recorded/gi)?.length ?? 0).toBe(1);
    expect(text).not.toContain("no sleep debt to read");
  });
});

describe("trackers v6 guards — a full day", () => {
  it("the flower fills every petal from the core's met state", () => {
    world.current = makeStore([FULL_DAY]);
    const { container } = render(<TrackersPage />);
    const flower = container.querySelector('[data-testid="tracker-flower"]')!;
    expect(flower.querySelectorAll('[data-petal][data-met="true"]').length).toBe(6);
    expect(flower.textContent).toContain("6 of 6 reached today");
  });

  it("achievement zero-states carry no bare 0 (M-133)", () => {
    /* one logged day, nothing met, no streaks: every unearned tile is
       in its zero state */
    world.current = makeStore([day(TODAY, { waterMl: 250 })]);
    const { container } = render(<TrackersPage />);
    const badges = container.querySelector(".tk2-badges");
    expect(badges).toBeTruthy();
    expect(badges!.textContent ?? "").not.toMatch(/\b0\b/);
  });

  it("the route does not render when no series has a logged day (M-134)", () => {
    /* a day holding only a note: a day exists, but every tracker series
       is empty — the route chart would be a blank stage under a head */
    world.current = makeStore([day(TODAY, { notes: "felt off" })]);
    const { container } = render(<TrackersPage />);
    expect(container.textContent).not.toContain("The route");
  });

  it("'What the record shows' does not render when there are no observations (M-134)", () => {
    /* fourteen days of below-target movement only: days are logged, the
       route has data, but the observations engine honestly has nothing
       to say — the section head must not stand over an empty body */
    const days: DayEntry[] = [];
    const [y, m, dd] = TODAY.split("-").map(Number) as [number, number, number];
    for (let i = 0; i < 14; i += 1) {
      const date = new Date(Date.UTC(y, m - 1, dd - i)).toISOString().slice(0, 10);
      days.push(day(date, { movementMinutes: 10 }));
    }
    world.current = makeStore(days);
    const { container } = render(<TrackersPage />);
    expect(container.textContent).not.toContain("What the record shows");
  });
});
