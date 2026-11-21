// @vitest-environment jsdom
/**
 * The M-198 guard — YOUR WHOLE DAY AS THE DAY ARC: the ribbon's
 * replacement composition (owner-approved preview, built exact)
 * is pinned as DATA-DRIVEN, not as a picture of one person's day:
 *
 *   (a) SIX NODES FROM THE CARETAKER DATA — with the fixture
 *       plan, the arc renders six medallion nodes whose captions
 *       are the derivation's own times (up, the walk after the
 *       plan's largest meal, caffeine ends, last meal by,
 *       wind-down, in bed), each positioned where the pure
 *       geometry in lib/nutrition/dayArc places its time —
 *       recomputed here from the lib, never copied from the
 *       component. The component source carries no hard-coded
 *       clock reading of the owner's day.
 *   (b) THE NODES FOLLOW THE INPUTS — distinctive Trackers goals
 *       move the bed / caffeine / wind-down captions by exactly
 *       the derivation's figures.
 *   (c) "YOU ARE HERE" IS THE REAL TIME — with the clock held at
 *       21:07 the marker sits between the last-meal and wind-down
 *       nodes (the warp keeps its neighbours); held at 03:00 it
 *       sits on the night tail, in the valley.
 *   (d) THE COMPOSITION'S RULES — the ribbon classes are gone
 *       from stylesheet and component alike; the arc's CSS block
 *       carries no glass and no backdrop filter, and stills the
 *       draw-in and the pulse under reduced motion.
 *   (e) THE WORDS DID NOT MOVE — the sleep figures' sentence and
 *       the Tonight zones read exactly as the M-162 guard pins
 *       them (that guard passes unmodified beside this one).
 *   (f) THE WALK BY SEQUENCE (M-199) — when the plan gives the
 *       largest meal no clock, the walk medallion still rides:
 *       placed by the geometry's sequence rule between Up and
 *       Caffeine ends, its caption naming the order and claiming
 *       no hour.
 *   (g) THE LABEL'S PLACEMENT IS THE RULE (M-199) — the "You are
 *       here" label carries the displacement classes the pure
 *       geometry computes (lifted at 22:13, the live defect;
 *       undisplaced on a clear stretch of arc).
 *
 * Fixtures: the M-162 guard's house pattern — a real composed
 * plan re-stamped to today over a seeded complete Assessment,
 * with its timeline's clock times set by the fixture.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ userId: "user-1", ready: true }),
}));

import { setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import { todayLocal } from "@/lib/localDay";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  toHealthProfile,
  type AssessmentState,
} from "@/lib/assessment/state";
import {
  generatePlan,
  readPlan,
  writePlan,
  type DailyPlan,
  type Meal,
  type PlanTimeline,
  type PlanTimelineItem,
} from "@/lib/nutrition";
import { clockToMinutes } from "@/lib/nutrition/dayRhythm";
import {
  ARC_VIEW_H,
  ARC_VIEW_W,
  arcAnchorsFromRawXs,
  arcAnchorsOf,
  arcAwakeFraction,
  arcFrameOf,
  arcNowLabelPlacementOf,
  arcSequenceRawX,
  arcXForFraction,
  arcYAtX,
} from "@/lib/nutrition/dayArc";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition";
import { GOALS_PREF } from "@/lib/trackers/store";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { NutritionPlanSection } from "./NutritionPlanSection";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  window.matchMedia =
    window.matchMedia ??
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList);
  window.localStorage.clear();
  resetPrefCache();
});

const ANSWERS = {
  ageYears: 30,
  heightCm: 175,
  weightKg: 82,
  sex: "female" as const,
  goal: "lose" as const,
  activity: "light" as const,
  pregnantOrBreastfeeding: false,
  eatingDisorderHistory: false,
  unexplainedWeightChange: false,
};

function composePlan(): DailyPlan {
  const state: AssessmentState = {
    version: 1,
    status: "complete",
    step: "summary",
    answers: { ...EMPTY_ANSWERS, ...ANSWERS },
    consents: [],
    startedAt: null,
    completedAt: "2026-11-10T03:05:00.000Z",
    updatedAt: "2026-11-10T03:05:00.000Z",
  };
  setPref(ASSESSMENT_KEY, state);
  const profile = toHealthProfile(state, "user-1");
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, "2026-11-18"),
    fallbackTargets: null,
    foods: USDA_REFERENCE_FOODS,
    dishes: DISH_LIBRARY,
    day: "2026-11-18",
    now: "2026-11-18T03:00:00.000Z",
    id: "plan-day-arc-guard",
  });
  if (!outcome.ok) throw new Error("expected a plan");
  return outcome.plan;
}

function fixtureTimeline(
  plan: DailyPlan,
  times: Partial<Record<Meal, string>>,
  labels: Partial<Record<Meal, string>> = {},
): PlanTimeline {
  const slotLabel: Record<Meal, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
  };
  const meals = plan.meals
    .filter((m) => times[m.meal])
    .map((m): PlanTimelineItem => ({
      kind: "meal",
      meal: m.meal,
      time: times[m.meal]!,
      label: labels[m.meal] ?? slotLabel[m.meal],
    }))
    .sort((a, b) => (a.time! < b.time! ? -1 : 1));
  return {
    anchor: "sleep_log",
    items: [
      { kind: "wake", time: "06:30", label: "On waking" },
      ...meals,
      { kind: "wind_down", time: "21:45", label: "Wind down" },
      { kind: "sleep", time: "22:30", label: "Bedtime" },
    ],
  };
}

function seedAndStore(buildTimeline?: (plan: DailyPlan) => PlanTimeline): DailyPlan {
  const plan = composePlan();
  const stored: DailyPlan = {
    ...plan,
    day: todayLocal(),
    ...(buildTimeline ? { timeline: buildTimeline(plan) } : {}),
  };
  writePlan(stored);
  const read = readPlan();
  if (!read) throw new Error("expected the stored plan to parse");
  return read;
}

function sectionByLabel(container: HTMLElement, label: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`section[aria-label="${label}"]`);
  expect(el, `section "${label}" renders`).not.toBeNull();
  return el!;
}

function seedTimedPlan(): DailyPlan {
  return seedAndStore((plan) =>
    fixtureTimeline(plan, {
      breakfast: "07:15",
      lunch: "13:05",
      snack: "17:15",
      dinner: "19:45",
    }),
  );
}

function nodeByKey(whole: HTMLElement, key: string): HTMLElement {
  const el = whole.querySelector<HTMLElement>(`[data-arc-node="${key}"]`);
  expect(el, `arc node "${key}" renders`).not.toBeNull();
  return el!;
}

const leftPct = (el: HTMLElement): number => parseFloat(el.style.left);
const topPct = (el: HTMLElement): number => parseFloat(el.style.top);

describe("day arc guard — your whole day as the Day Arc (M-198)", () => {
  it("(a) six nodes, captioned from the caretaker data, placed by the lib geometry", () => {
    const stored = seedTimedPlan();
    const { container } = render(<NutritionPlanSection />);
    const whole = sectionByLabel(container, "Your whole day");

    const nodes = [...whole.querySelectorAll<HTMLElement>("[data-arc-node]")];
    expect(nodes).toHaveLength(6);
    expect(nodes.map((n) => n.dataset.arcNode)).toEqual(
      expect.arrayContaining(["up", "walk", "caffeine", "lastMeal", "windDown", "bed"]),
    );

    /* Captions are the derivation's own readings (defaults:
       wake 06:30, sleep 480 → bed 22:30, caffeine 14:30,
       last meal by 20:30, wind-down 21:30, movement 30). */
    expect(nodeByKey(whole, "up").textContent).toContain("6:30 AM");
    expect(nodeByKey(whole, "up").textContent).toContain("Up");
    expect(nodeByKey(whole, "caffeine").textContent).toContain("2:30 PM");
    expect(nodeByKey(whole, "caffeine").textContent).toContain("Caffeine ends");
    expect(nodeByKey(whole, "lastMeal").textContent).toContain("8:30 PM");
    expect(nodeByKey(whole, "lastMeal").textContent).toContain("Last meal by");
    expect(nodeByKey(whole, "windDown").textContent).toContain("9:30 PM");
    expect(nodeByKey(whole, "windDown").textContent).toContain("Wind-down");
    expect(nodeByKey(whole, "bed").textContent).toContain("10:30 PM");
    expect(nodeByKey(whole, "bed").textContent).toContain("In bed");

    /* The walk node rides the stored plan's own largest meal. */
    const largest = stored.meals.reduce((a, b) => (b.kcal > a.kcal ? b : a));
    const item = stored.timeline?.items.find((i) => i.kind === "meal" && i.meal === largest.meal);
    expect(item?.time).toBeTruthy();
    expect(nodeByKey(whole, "walk").textContent).toContain(`After ${item?.label}`);
    expect(nodeByKey(whole, "walk").textContent).toContain("Walk · 30 min");

    /* Positions: recomputed from the lib geometry over the same
       inputs — the rendered nodes sit where the mapping puts
       them, in day order, lefts strictly increasing. */
    const frame = arcFrameOf(390, 1350);
    const minutes = [390, clockToMinutes(item!.time!), 870, 1230, 1290, 1350].sort(
      (a, b) => arcAwakeFraction(a, frame) - arcAwakeFraction(b, frame),
    );
    const anchors = arcAnchorsOf(minutes, frame);
    nodes.forEach((node, i) => {
      expect(leftPct(node)).toBeCloseTo((anchors.placed[i] / ARC_VIEW_W) * 100, 1);
      expect(topPct(node)).toBeCloseTo((arcYAtX(anchors.placed[i]) / ARC_VIEW_H) * 100, 1);
      if (i > 0) expect(leftPct(node)).toBeGreaterThan(leftPct(nodes[i - 1]));
    });

    /* Nothing about this person's day is hard-coded in the
       component: the readings above come from the lib. (Comments
       are stripped first — the pin is about rendered values, and
       the file's older comments name example readings.) */
    const component = readFileSync(
      join(process.cwd(), "src/components/nutrition/DayCaretakerSection.tsx"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(component).not.toContain("10:30 PM");
    expect(component).not.toContain("6:30 AM");
    expect(component).not.toContain("2:30 PM");
  });

  it("(b) distinctive Trackers goals move the evening captions by the derivation's figures", () => {
    seedTimedPlan();
    setPref(GOALS_PREF, {
      sleepMinutes: 450,
      waterMl: 3000,
      studyMinutes: 120,
      movementMinutes: 45,
      energy: 3,
      screenMinutes: 240,
    });
    const { container } = render(<NutritionPlanSection />);
    const whole = sectionByLabel(container, "Your whole day");
    expect(nodeByKey(whole, "bed").textContent).toContain("11:00 PM");
    expect(nodeByKey(whole, "caffeine").textContent).toContain("3:00 PM");
    expect(nodeByKey(whole, "windDown").textContent).toContain("10:00 PM");
    expect(nodeByKey(whole, "walk").textContent).toContain("Walk · 45 min");
  });

  it("(c) the now marker is the real time — evening between its neighbours, night in the valley", () => {
    seedTimedPlan();
    /* Hold the local clock by its hands only (hours/minutes) —
       the rest of the render pipeline keeps its real timers. */
    const hours = vi.spyOn(Date.prototype, "getHours").mockReturnValue(21);
    const minutes = vi.spyOn(Date.prototype, "getMinutes").mockReturnValue(7);
    const evening = render(<NutritionPlanSection />);
    const wholeEvening = sectionByLabel(evening.container, "Your whole day");
    const marker = wholeEvening.querySelector<HTMLElement>("[data-arc-now]");
    expect(marker, "the now marker renders").not.toBeNull();
    expect(marker!.textContent).toContain("You are here");
    expect(leftPct(marker!)).toBeGreaterThan(leftPct(nodeByKey(wholeEvening, "lastMeal")));
    expect(leftPct(marker!)).toBeLessThan(leftPct(nodeByKey(wholeEvening, "windDown")));
    cleanup();

    hours.mockReturnValue(3);
    minutes.mockReturnValue(0);
    const night = render(<NutritionPlanSection />);
    const wholeNight = sectionByLabel(night.container, "Your whole day");
    const nightMarker = wholeNight.querySelector<HTMLElement>("[data-arc-now]");
    expect(nightMarker, "the now marker renders at night").not.toBeNull();
    /* The night tail lives past the valley bottom (x ≥ 846 of
       880 → left ≥ 96.1%): at 03:00 the marker is well into it. */
    expect(leftPct(nightMarker!)).toBeGreaterThan(95);
    hours.mockRestore();
    minutes.mockRestore();
  });

  it("(d) the ribbon is retired and the arc's CSS keeps the house rules", () => {
    const css = readFileSync(join(process.cwd(), "src/styles/nutrition.css"), "utf8");
    const component = readFileSync(
      join(process.cwd(), "src/components/nutrition/DayCaretakerSection.tsx"),
      "utf8",
    );
    expect(css).not.toContain("nut-care-ribbon");
    expect(component).not.toContain("nut-care-ribbon");

    const block = css.slice(css.indexOf("M-198 — "));
    expect(block.length).toBeGreaterThan(0);
    expect(block).not.toContain("backdrop-filter");
    expect(block.toLowerCase()).not.toContain("glass");
    expect(block).toContain(".nut-care-arc-path");
    expect(block).toContain(".nut-care-medallion");

    /* Reduced motion stills the draw-in, the node entrances and
       the pulse — the block's own reduced-motion rule names them. */
    const reduced = block.slice(block.indexOf("prefers-reduced-motion: reduce"));
    expect(reduced).toContain(".nut-care-arc-path");
    expect(reduced).toContain(".nut-care-here-dot::after");
    expect(reduced).toContain("animation: none");
    expect(reduced).toContain("stroke-dashoffset: 0");
  });

  it("(f) the walk rides by sequence when the plan gives its meal no clock (M-199)", () => {
    /* The owner's live shape: a relative day — the timeline
       names every meal but carries no clock at all, so the
       largest meal has no time. The preview still showed its
       medallion, and so must the arc. */
    const slotLabel: Record<Meal, string> = {
      breakfast: "Breakfast",
      lunch: "Lunch",
      dinner: "Dinner",
      snack: "Snack",
    };
    const relativeTimeline = (plan: DailyPlan): PlanTimeline => ({
      anchor: "relative",
      items: [
        { kind: "wake", time: null, label: "On waking" },
        ...plan.meals.map(
          (m): PlanTimelineItem => ({
            kind: "meal",
            meal: m.meal,
            time: null,
            label: slotLabel[m.meal],
          }),
        ),
        { kind: "wind_down", time: null, label: "Wind down" },
        { kind: "sleep", time: null, label: "Bedtime" },
      ],
    });
    const stored = seedAndStore(relativeTimeline);
    const { container } = render(<NutritionPlanSection />);
    const whole = sectionByLabel(container, "Your whole day");

    const nodes = [...whole.querySelectorAll<HTMLElement>("[data-arc-node]")];
    expect(nodes).toHaveLength(6);
    expect(nodes.map((n) => n.dataset.arcNode)).toEqual(
      expect.arrayContaining(["up", "walk", "caffeine", "lastMeal", "windDown", "bed"]),
    );

    /* The caption names the order and the walk — and claims no
       hour: the time line is the meal's name, digit-free. */
    const largest = stored.meals.reduce((a, b) => (b.kcal > a.kcal ? b : a));
    const walk = nodeByKey(whole, "walk");
    const timeLine = walk.querySelector(".nut-care-node-time");
    expect(timeLine?.textContent).toBe(`After ${slotLabel[largest.meal]}`);
    expect(timeLine?.textContent).not.toMatch(/\d/);
    expect(walk.textContent).toContain("Walk · 30 min");

    /* Its place is the sequence rule's, recomputed from the
       lib: after Up, before Caffeine ends, relaxed with the
       whole set exactly as the timed nodes are. */
    const frame = arcFrameOf(390, 1350);
    const rawOf = (mins: number) => arcXForFraction(arcAwakeFraction(mins, frame));
    const raws = [
      rawOf(390),
      arcSequenceRawX(rawOf(390), rawOf(870)),
      rawOf(870),
      rawOf(1230),
      rawOf(1290),
      rawOf(1350),
    ];
    const anchors = arcAnchorsFromRawXs(raws);
    nodes.forEach((node, i) => {
      expect(leftPct(node)).toBeCloseTo((anchors.placed[i]! / ARC_VIEW_W) * 100, 1);
    });
    expect(leftPct(walk)).toBeGreaterThan(leftPct(nodeByKey(whole, "up")));
    expect(leftPct(walk)).toBeLessThan(leftPct(nodeByKey(whole, "caffeine")));
  });

  it("(g) the now label's placement is the geometry's rule — lifted at 22:13, home when clear (M-199)", () => {
    seedTimedPlan();
    const hours = vi.spyOn(Date.prototype, "getHours").mockReturnValue(22);
    const minutes = vi.spyOn(Date.prototype, "getMinutes").mockReturnValue(13);
    const evening = render(<NutritionPlanSection />);
    const whole = sectionByLabel(evening.container, "Your whole day");
    const marker = whole.querySelector<HTMLElement>("[data-arc-now]");
    expect(marker, "the now marker renders").not.toBeNull();

    /* Recompute the rule from the lib over the rendered points:
       at 22:13 the marker is wedged against Wind-down, and the
       placement the live sweep caught striking through its
       medallion (left, at the dot's height) is not the one the
       component may use — it must be lifted, offence-free. */
    const pointOf = (el: HTMLElement) => ({
      x: (leftPct(el) / 100) * ARC_VIEW_W,
      y: (topPct(el) / 100) * ARC_VIEW_H,
    });
    const nodePoints = [...whole.querySelectorAll<HTMLElement>("[data-arc-node]")].map(pointOf);
    const expected = arcNowLabelPlacementOf(pointOf(marker!), nodePoints);
    expect(expected).toEqual({ side: "left", level: "lifted" });
    expect(marker!.classList.contains("is-flip")).toBe(true);
    expect(marker!.classList.contains("is-lifted")).toBe(true);
    expect(marker!.classList.contains("is-below")).toBe(false);
    expect(marker!.classList.contains("is-raised")).toBe(false);
    expect(marker!.classList.contains("is-dropped")).toBe(false);
    cleanup();

    /* 09:00 — the arc around the marker is clear, and the label
       keeps the home placement: no displacement classes at all. */
    hours.mockReturnValue(9);
    minutes.mockReturnValue(0);
    const morning = render(<NutritionPlanSection />);
    const morningWhole = sectionByLabel(morning.container, "Your whole day");
    const morningMarker = morningWhole.querySelector<HTMLElement>("[data-arc-now]");
    expect(morningMarker, "the now marker renders in the morning").not.toBeNull();
    for (const cls of ["is-flip", "is-below", "is-raised", "is-lifted", "is-dropped"]) {
      expect(morningMarker!.classList.contains(cls), cls).toBe(false);
    }
    hours.mockRestore();
    minutes.mockRestore();
  });

  it("(e) the words did not move — figures sentence and Tonight zones verbatim", () => {
    seedTimedPlan();
    const { container } = render(<NutritionPlanSection />);
    const text = sectionByLabel(container, "Your whole day").textContent ?? "";
    expect(text).toContain("In bed by 10:30 PM · Up at 6:30 AM · 8 hours.");
    expect(text).toContain("Tonight — do");
    expect(text).toContain("Tonight — avoid");
    expect(text).toContain("The room dark and cool; the morning’s clothes and bag laid out ready.");
    expect(text).toContain("Your movement target is 30 minutes in the day.");
  });
});
