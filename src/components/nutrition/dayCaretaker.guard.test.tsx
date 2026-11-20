// @vitest-environment jsdom
/**
 * The M-162 guard — YOUR WHOLE DAY: the plan's caretaker section
 * derives every number it shows from exactly three sources — the
 * Trackers goals, the wake-time preference, and the composed plan's
 * own meals and timeline — plus the lib's named general-care
 * windows. Executable pins:
 *
 *   (a) THE SECTION EXISTS, IN ITS PLACE — after the "Your day"
 *       card, before "Today's balance"; with nothing chosen and
 *       nothing set, its readings are the defaults' arithmetic
 *       (wake 06:30, sleep target 480 → in bed by 22:30; movement
 *       30; screen 3 hours; caffeine boundary 14:30). Its largest
 *       meal is the stored plan's own largest meal, by the plan's
 *       totals. No kcal figure appears anywhere in the section.
 *   (b) THE NUMBERS FOLLOW THE GOALS — seeding distinctive
 *       Trackers goals (450 / 45 / 240) moves every reading by
 *       exactly those figures and nothing else.
 *   (c) THE LAST-MEAL LINE TELLS THE TRUTH BOTH WAYS — a last meal
 *       outside the two hours before bed is stated as sitting
 *       clear; one inside is stated as inside, as a thing to shift
 *       earlier; a plan with no clock gets the rule stated against
 *       the bedtime alone, never an invented meal time.
 *   (d) THE WAKE ROW WRITES THE PREFERENCE AND NOTHING ELSE —
 *       changing it stores health.dayRhythm.v1 and re-reads the
 *       window; the stored plan is byte-identical afterwards and
 *       no staleness is named (the caretaker frame is not a plan
 *       input).
 *   (e) THE SOURCES ARE THE ONLY SOURCES — the component's doors
 *       are the trackers hook and the rhythm pref; the lib is pure
 *       (no clock, no network) and its only target figures are the
 *       named fallbacks; the section's words carry none of the
 *       house banned words.
 *
 * Fixtures: the house pattern (planSnack.guard) — a real composed
 * plan re-stamped to today over a seeded complete Assessment,
 * with its timeline's clock times set by the fixture so the
 * last-meal verdict is deterministic.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";

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

import { getPref, setPref } from "@/lib/prefs";
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
import { DAY_RHYTHM_KEY, parseDayRhythm } from "@/lib/nutrition/dayRhythm";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition";
import { GOALS_PREF } from "@/lib/trackers/store";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { NutritionPlanSection } from "./NutritionPlanSection";

afterEach(cleanup);

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
    id: "plan-caretaker-guard",
  });
  if (!outcome.ok) throw new Error("expected a plan");
  return outcome.plan;
}

/** A timeline over the plan's own meals with the fixture's clock
 *  times — every meal the plan holds, in time order, framed by the
 *  wake and sleep items the stored-plan parser requires. */
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

function follows(a: Element, b: Element): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe("whole-day guard — the plan as caretaker (M-162)", () => {
  it("(a) the section stands after the day card, before the balance — defaults' arithmetic, the plan's own largest meal", () => {
    seedAndStore((plan) =>
      fixtureTimeline(plan, {
        breakfast: "07:15",
        lunch: "13:05",
        snack: "17:15",
        dinner: "19:45",
      }),
    );
    const stored = readPlan()!;
    const { container } = render(<NutritionPlanSection />);

    const day = sectionByLabel(container, "Your day");
    const whole = sectionByLabel(container, "Your whole day");
    const balance = sectionByLabel(container, "Today's balance");
    expect(follows(day, whole)).toBe(true);
    expect(follows(whole, balance)).toBe(true);

    const text = whole.textContent ?? "";
    expect(text).toContain("In bed by 10:30 PM · Up at 6:30 AM · 8 hours");
    expect(text).toContain("Your movement target is 30 minutes in the day.");
    expect(text).toContain("From 9:30 PM — screens dim, then off.");
    expect(text).toContain("Your screen target for the day is 3 hours.");
    expect(text).toContain("Caffeine after 2:30 PM.");
    expect(text).toContain("not medical advice");

    /* The largest meal is the stored plan's, by its own totals. */
    const largest = stored.meals.reduce((a, b) => (b.kcal > a.kcal ? b : a));
    const item = stored.timeline?.items.find((i) => i.kind === "meal" && i.meal === largest.meal);
    expect(text).toContain(`The day’s largest meal is ${item?.label ?? largest.meal}`);

    /* No energy figure is stated anywhere in the section. */
    expect(text).not.toMatch(/kcal/);
  });

  it("(b) seeding distinctive Trackers goals moves every reading by exactly those figures", () => {
    seedAndStore();
    setPref(GOALS_PREF, {
      sleepMinutes: 450,
      waterMl: 3000,
      studyMinutes: 120,
      movementMinutes: 45,
      energy: 3,
      screenMinutes: 240,
    });
    const { container } = render(<NutritionPlanSection />);
    const text = sectionByLabel(container, "Your whole day").textContent ?? "";
    expect(text).toContain("In bed by 11:00 PM · Up at 6:30 AM · 7 hours 30 minutes");
    expect(text).toContain("Your movement target is 45 minutes in the day.");
    expect(text).toContain("Your screen target for the day is 4 hours.");
    expect(text).toContain("Caffeine after 3:00 PM.");
    expect(text).toContain("From 10:00 PM — screens dim, then off.");
  });

  it("(c) the last-meal line tells the truth both ways — and refuses a time it does not have", () => {
    /* Outside: dinner 19:45 on the default frame (bed 22:30). */
    seedAndStore((plan) =>
      fixtureTimeline(plan, {
        breakfast: "07:15",
        lunch: "13:05",
        snack: "17:15",
        dinner: "19:45",
      }),
    );
    const first = render(<NutritionPlanSection />);
    expect(sectionByLabel(first.container, "Your whole day").textContent).toContain(
      "A heavy meal in the last two hours — Dinner at 7:45 PM already sits outside them.",
    );
    cleanup();

    /* Inside: the snack at 21:15 is the day's last meal. */
    seedAndStore((plan) =>
      fixtureTimeline(
        plan,
        { breakfast: "07:15", lunch: "13:05", dinner: "19:45", snack: "21:15" },
        { snack: "Evening snack" },
      ),
    );
    const second = render(<NutritionPlanSection />);
    expect(sectionByLabel(second.container, "Your whole day").textContent).toContain(
      "Evening snack at 9:15 PM sits inside the last two hours before bed — on a day you can, bring the last meal earlier.",
    );
    cleanup();

    /* No clock: the composed (relative) timeline — the rule is
       stated against the bedtime alone. */
    seedAndStore();
    const third = render(<NutritionPlanSection />);
    expect(sectionByLabel(third.container, "Your whole day").textContent).toContain(
      "A heavy meal in the last two hours before bed — with bed at 10:30 PM, the last meal wants to end by 8:30 PM.",
    );
  });

  it("(d) the wake row writes the preference — the plan is untouched, nothing goes stale", () => {
    seedAndStore();
    const storedBefore = readPlan();
    const { container } = render(<NutritionPlanSection />);
    const whole = sectionByLabel(container, "Your whole day");
    expect(whole.textContent).toContain("In bed by 10:30 PM · Up at 6:30 AM · 8 hours");
    expect(container.textContent).not.toContain("the plan below still uses the older numbers");

    const input = whole.querySelector<HTMLInputElement>('input[type="time"]');
    expect(input, "the wake-time row renders").not.toBeNull();
    fireEvent.change(input!, { target: { value: "07:30" } });

    expect(getPref(DAY_RHYTHM_KEY, parseDayRhythm, null)).toEqual({ wakeTime: "07:30" });
    expect(whole.textContent).toContain("In bed by 11:30 PM · Up at 7:30 AM · 8 hours");
    expect(readPlan()).toEqual(storedBefore);
    expect(container.textContent).not.toContain("the plan below still uses the older numbers");
  });

  it("(e) the sources are the only sources — pure lib, two doors, no banned words", () => {
    const SRC = join(process.cwd(), "src");
    const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
    const component = read("components/nutrition/DayCaretakerSection.tsx");
    const lib = read("lib/nutrition/dayRhythm.ts");

    expect(component).toContain("useTrackers");
    expect(component).toContain("DAY_RHYTHM_KEY");
    expect(component).not.toContain("generatePlan");
    expect(component).not.toContain("PLAN_METHOD_VERSION");

    expect(lib).not.toContain("fetch(");
    expect(lib).not.toContain("Date.now");
    expect(lib).not.toContain("new Date(");
    expect(lib).toContain("FALLBACK_SLEEP_MINUTES = 480");
    expect(lib).toContain("FALLBACK_MOVEMENT_MINUTES = 30");
    expect(lib).toContain("FALLBACK_SCREEN_MINUTES = 180");

    seedAndStore();
    const { container } = render(<NutritionPlanSection />);
    const text = sectionByLabel(container, "Your whole day").textContent ?? "";
    expect(text).not.toMatch(/\b(left|burn|earn|cheat|failed|junk|clean)\b/i);
    expect(text.toLowerCase()).not.toContain("to go");
    /* The section speaks within itself: the words are rendered, once. */
    expect(within(container).getByRole("heading", { name: "Your whole day" })).toBeTruthy();
  });
});
