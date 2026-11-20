// @vitest-environment jsdom
/**
 * The N2 primitives guard (brief v7, Slice N2) — the Plan page's new
 * chrome as executable pins, in Bloom's guard tradition (vitest/jsdom
 * + CSS source pins; this repo has no Playwright):
 *
 *   (a) SEGMENTED GOAL CONTROL (M-142's pill half) — one radiogroup of
 *       real radios, a NEUTRAL sliding thumb (no gold anywhere in the
 *       control), the thumb moving by transform over 180ms, selection
 *       reported through the one callback the section wires to
 *       usePlan.setGoal.
 *   (b) UNDERLINE SUB-NAV (M-155) — the section anchors are text, not
 *       pills: no `.nut-chip` on any item, the active item carries
 *       data-selected + aria-current="page", and ONE gold underline
 *       indicator exists to slide under it (transform only).
 *   (c) ONE DISCLOSURE (M-157) — the `.more` component: a button with
 *       aria-expanded, content that fades in, a rotating chevron, a
 *       hairline top border — and ZERO native <details>/<summary>
 *       anywhere on the Nutrition page or in its sections' source.
 *   (d) STAT STRIP — four serif figures (Energy · Protein · Water ·
 *       Meals) with hairline dividers; guide values as DASHED badges
 *       (estimated/planned per rule 4) carrying the data-metric names
 *       the old header sentence carried; water via fmtLitres; the
 *       Energy cell leaves entirely under hideCalories.
 *   (e) DAY PATH (M-144/M-159 primitive half) — fixture stops in
 *       planView's rail shape: order preserved, the fill drawn to the
 *       "now" stop (scaleY, transform only), exactly one pulsing
 *       marker (the page's only looping animation), word time labels
 *       (never "—"), estimated times dashed-underlined, meal stops
 *       linking to #meal-{slot}, an optional photo thumb per stop,
 *       and reduced-motion CSS that stills the pulse and the draw.
 *
 * Scope: the primitives rendered directly, plus the whole Nutrition
 * page rendered through the real prefs-backed flow (the
 * sectionSystem guard's seeding) for the page-level pins.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

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
import { shiftDay, todayLocal } from "@/lib/localDay";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  toHealthProfile,
  type AssessmentState,
} from "@/lib/assessment/state";
import { GOAL_LABEL } from "@/lib/assessment/questions";
import { fmtLitres } from "@/lib/format";
import { generatePlan, writeFoodLog, writePlan, type LogEntry } from "@/lib/nutrition";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";
import type { PlanRailStop } from "@/lib/nutrition/planView";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { NutritionPage, NutritionSubNav } from "@/components/nutrition/NutritionPage";
import {
  DayPath,
  MoreDisclosure,
  SegmentedGoalControl,
  StatStrip,
} from "@/components/nutrition/PlanPrimitives";

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
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList);
  window.localStorage.clear();
  resetPrefCache();
});

/* --------------------- stylesheet pin helpers ---------------------- */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ");
const css = stripComments(read("styles/nutrition.css"));

function blocks(text: string): { selector: string; body: string }[] {
  const clean = stripComments(text);
  const out: { selector: string; body: string }[] = [];
  let prev = 0;
  for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
    out.push({ selector: clean.slice(prev, m.index).trim(), body: m[1]! });
    prev = m.index + m[0].length;
  }
  return out;
}

function rulesFor(sel: string): { selector: string; body: string }[] {
  return blocks(read("styles/nutrition.css")).filter((b) => {
    const lastLine = b.selector.split("\n").pop() ?? "";
    return lastLine
      .split(",")
      .map((s) => s.trim())
      .includes(sel);
  });
}

const ruleBody = (sel: string) =>
  rulesFor(sel)
    .map((b) => b.body)
    .join("\n");

/* ------------------- (a) segmented goal control -------------------- */

describe("N2 — segmented goal control", () => {
  it("is one radiogroup of real radios named by the full goal labels", () => {
    render(<SegmentedGoalControl current="lose" onSelect={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "Your goal" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(4);
    expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual([
      GOAL_LABEL.lose,
      GOAL_LABEL.maintain,
      GOAL_LABEL.gain,
      GOAL_LABEL.recomp,
    ]);
    expect((screen.getByRole("radio", { name: GOAL_LABEL.lose }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect(
      (screen.getByRole("radio", { name: GOAL_LABEL.gain }) as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("reports selection through the one callback, with the goal key", () => {
    const onSelect = vi.fn();
    render(<SegmentedGoalControl current="lose" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio", { name: GOAL_LABEL.maintain }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("maintain");
  });

  it("the thumb is neutral (no gold anywhere), indexed to the selection, moved by transform", () => {
    const { container, rerender } = render(
      <SegmentedGoalControl current="lose" onSelect={() => {}} />,
    );
    const group = container.querySelector(".seg")!;
    expect(group.querySelectorAll('[class*="gold"]')).toHaveLength(0);
    const thumb = group.querySelector<HTMLElement>(".seg__thumb")!;
    expect(thumb, "the sliding thumb renders").not.toBeNull();
    expect(thumb.dataset["index"]).toBe("0");
    expect(thumb.style.transform).toContain("translateX");
    rerender(<SegmentedGoalControl current="recomp" onSelect={() => {}} />);
    expect(container.querySelector<HTMLElement>(".seg__thumb")!.dataset["index"]).toBe("3");
  });

  it("CSS: the thumb slides by transform over 180ms on a neutral surface; no gold in the control", () => {
    const thumb = ruleBody(".seg__thumb");
    expect(thumb).toContain("transform");
    expect(thumb).toContain("180ms");
    expect(thumb).toContain("var(--surface");
    const segRules = blocks(read("styles/nutrition.css")).filter((b) =>
      b.selector.includes(".seg"),
    );
    expect(segRules.length).toBeGreaterThan(0);
    for (const r of segRules) {
      expect(r.body, `.seg rule ${r.selector} carries no gold`).not.toContain("gold");
    }
    /* (The gold-gradient `.nut-chip-solid` treatment survives elsewhere
       — AddFoodSheet, DishesSection — but the goal control is not one
       of its users any more; the page-level part of this guard pins
       that the plan section renders none.) */
  });
});

/* ----------------------- (b) underline sub-nav --------------------- */

describe("N2 — underline sub-nav", () => {
  const entries = ["nut-plan", "nut-grocery", "nut-modes", "nut-programmes", "nut-dishes"];

  it("items are text anchors, never pills; the active one is marked for the underline", () => {
    const { container } = render(<NutritionSubNav active="nut-modes" showGrocery />);
    const nav = container.querySelector(".nut-subnav")!;
    const anchors = [...nav.querySelectorAll("a")];
    expect(anchors.map((a) => a.getAttribute("href"))).toEqual(entries.map((e) => `#${e}`));
    for (const a of anchors) {
      expect(a.classList.contains("nut-chip"), "no pill class on a sub-nav item").toBe(false);
    }
    const active = nav.querySelector('[data-selected="true"]')!;
    expect(active.textContent).toBe("Condition modes");
    expect(active.getAttribute("aria-current")).toBe("page");
    const indicator = nav.querySelector<HTMLElement>(".nut-subnav__indicator")!;
    expect(indicator, "one sliding underline indicator").not.toBeNull();
    expect(indicator.dataset["active"]).toBe("nut-modes");
    expect(indicator.style.transform).toContain("translateX");
  });

  it("CSS: the bar stays sticky, items hold the touch floor, the indicator is a 2px gold slide", () => {
    expect(ruleBody(".nut-subnav")).toContain("position: sticky");
    expect(ruleBody(".nut-subnav__item")).toContain("min-height: var(--bloom-touch-min)");
    const indicator = ruleBody(".nut-subnav__indicator");
    expect(indicator).toContain("height: 2px");
    expect(indicator).toContain("background: var(--gold)");
    expect(indicator).toContain("transform");
    /* The pill treatment scoped to the sub-nav is gone. */
    expect(css).not.toContain(".nut-subnav .nut-chip");
  });
});

/* ------------------------- (c) one disclosure ---------------------- */

describe("N2 — the .more disclosure", () => {
  it("is a button + region, never a native details; the chevron state rides on the root", () => {
    const { container } = render(
      <MoreDisclosure label="How this plan is built">
        <p>Built from real dishes.</p>
      </MoreDisclosure>,
    );
    expect(container.querySelector("details")).toBeNull();
    expect(container.querySelector("summary")).toBeNull();
    const button = screen.getByRole("button", { name: /How this plan is built/ });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Built from real dishes.")).toBeNull();
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Built from real dishes.")).toBeTruthy();
    expect(container.querySelector(".more")!.getAttribute("data-open")).toBe("true");
    fireEvent.click(button);
    expect(screen.queryByText("Built from real dishes.")).toBeNull();
  });

  it("can start open (the Past runs case)", () => {
    render(
      <MoreDisclosure label="Past runs (2)" defaultOpen>
        <p>Runs listed.</p>
      </MoreDisclosure>,
    );
    expect(screen.getByText("Runs listed.")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Past runs/ }).getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("CSS: hairline top border, content fades in within 240ms, the chevron rotates by transform", () => {
    expect(ruleBody(".more")).toContain("border-top");
    expect(ruleBody(".more__body")).toContain("240ms");
    const chev = blocks(read("styles/nutrition.css")).filter((b) =>
      b.selector.includes(".more") && b.selector.includes("chev"),
    );
    expect(chev.some((b) => b.body.includes("rotate(180deg)"))).toBe(true);
    expect(chev.some((b) => b.body.includes("transition") && b.body.includes("transform"))).toBe(
      true,
    );
  });

  it("source: no native details/summary survives in any Nutrition section", () => {
    for (const rel of [
      "components/nutrition/NutritionPlanSection.tsx",
      "components/nutrition/MetabolicTwinSection.tsx",
      "components/nutrition/ProgrammesSection.tsx",
      "components/nutrition/NutritionPage.tsx",
    ]) {
      const src = read(rel);
      expect(src, `${rel} carries no <details>`).not.toContain("<details");
      expect(src, `${rel} carries no <summary>`).not.toContain("<summary");
    }
  });
});

/* --------------------------- (d) stat strip ------------------------ */

describe("N2 — stat strip", () => {
  const totals = {
    planKcal: 1320,
    guideKcal: 1350,
    planProteinG: 165,
    guideProteinG: 171,
    waterMl: 3350,
    meals: 4,
  };

  it("renders four labelled serif figures; guides are dashed badges with the metric names", () => {
    const { container } = render(<StatStrip {...totals} />);
    const strip = container.querySelector(".stat-strip")!;
    const cells = [...strip.querySelectorAll(".stat-strip__cell")];
    expect(cells.map((c) => c.getAttribute("data-cell"))).toEqual([
      "energy",
      "protein",
      "water",
      "meals",
    ]);
    expect(strip.textContent).toContain("1,320");
    expect(strip.textContent).toContain("165");
    expect(strip.textContent).toContain(fmtLitres(3350));
    const kcalGuide = strip.querySelector('[data-metric="plan-kcal-guide"]')!;
    const proteinGuide = strip.querySelector('[data-metric="plan-protein-guide"]')!;
    expect(kcalGuide.textContent).toContain("1,350");
    expect(proteinGuide.textContent).toContain("171");
    expect(kcalGuide.classList.contains("stat-strip__guide")).toBe(true);
  });

  it("hideCalories removes the Energy cell and every kcal figure", () => {
    const { container } = render(<StatStrip {...totals} showKcal={false} />);
    const strip = container.querySelector(".stat-strip")!;
    expect(strip.querySelector('[data-cell="energy"]')).toBeNull();
    expect(strip.textContent).not.toContain("kcal");
    expect(strip.querySelectorAll(".stat-strip__cell")).toHaveLength(3);
  });

  it("CSS: serif figures, hairline dividers between cells, dashed guide badges", () => {
    expect(ruleBody(".stat-strip__value")).toContain("var(--font-display)");
    const divider = blocks(read("styles/nutrition.css")).filter((b) =>
      b.selector.includes(".stat-strip__cell"),
    );
    expect(divider.some((b) => b.body.includes("border-left"))).toBe(true);
    expect(ruleBody(".stat-strip__guide")).toContain("dashed");
  });
});

/* ---------------------------- (e) day path ------------------------- */

const STOPS: PlanRailStop[] = [
  { key: "wake", label: "On waking", kind: "water", whenText: "~6:30 AM", whenEstimated: true, state: "later" },
  { key: "breakfast", label: "Breakfast", kind: "meal", whenText: "~7:40 AM", whenEstimated: true, state: "done", meal: "breakfast", kcal: 520 },
  { key: "lunch", label: "Lunch", kind: "meal", whenText: "~1:00 PM", whenEstimated: true, state: "now", meal: "lunch", kcal: 610 },
  { key: "snack", label: "Snack", kind: "meal", whenText: "Afternoon", whenEstimated: false, state: "later", meal: "snack", kcal: 180 },
  { key: "dinner", label: "Dinner", kind: "meal", whenText: "Evening", whenEstimated: false, state: "later", meal: "dinner", kcal: 540 },
  { key: "winddown", label: "Wind down", kind: "rest", whenText: "Night", whenEstimated: false, state: "later" },
  { key: "bed", label: "Bedtime", kind: "rest", whenText: "Night", whenEstimated: false, state: "later" },
];

describe("N2 — day path primitive", () => {
  it("renders the stops in planView order with word labels and no dash anywhere", () => {
    const { container } = render(<DayPath stops={STOPS} />);
    const items = [...container.querySelectorAll(".day-path__stop")];
    expect(items.map((li) => li.getAttribute("data-key"))).toEqual(STOPS.map((s) => s.key));
    expect(container.textContent).not.toContain("—");
    expect(container.textContent).toContain("Afternoon");
  });

  it("the fill is drawn to the now stop by transform; exactly one stop pulses", () => {
    const { container } = render(<DayPath stops={STOPS} />);
    const fill = container.querySelector<HTMLElement>(".day-path__fill")!;
    expect(fill.style.transform).toContain("scaleY");
    expect(Math.abs(Number(fill.dataset["fill"]) - 2 / 6)).toBeLessThan(0.001);
    const pulses = container.querySelectorAll(".day-path__pulse");
    expect(pulses).toHaveLength(1);
    expect(pulses[0]!.closest(".day-path__stop")!.getAttribute("data-state")).toBe("now");
    expect(container.querySelectorAll('.day-path__stop[data-state="now"]')).toHaveLength(1);
    expect(
      container.querySelector('.day-path__stop[data-state="done"] .day-path__check'),
    ).not.toBeNull();
  });

  it("meal stops link to their rows; estimated times are marked; a thumb renders when given", () => {
    const { container } = render(
      <DayPath stops={STOPS} thumbFor={(s) => (s.meal === "lunch" ? "/lunch.webp" : null)} />,
    );
    const lunch = container.querySelector('.day-path__stop[data-key="lunch"]')!;
    expect(lunch.querySelector("a")!.getAttribute("href")).toBe("#meal-lunch");
    expect(lunch.querySelector(".day-path__when")!.getAttribute("data-estimated")).toBe("true");
    const img = lunch.querySelector<HTMLImageElement>(".day-path__thumb")!;
    expect(img.getAttribute("src")).toBe("/lunch.webp");
    const snack = container.querySelector('.day-path__stop[data-key="snack"]')!;
    expect(snack.querySelector(".day-path__when")!.hasAttribute("data-estimated")).toBe(false);
    expect(snack.querySelector(".day-path__thumb")).toBeNull();
  });

  it("with nothing reached, the fill is zero and nothing pulses", () => {
    const later = STOPS.map((s) => ({ ...s, state: "later" as const }));
    const { container } = render(<DayPath stops={later} />);
    expect(Number(container.querySelector<HTMLElement>(".day-path__fill")!.dataset["fill"])).toBe(0);
    expect(container.querySelectorAll(".day-path__pulse")).toHaveLength(0);
  });

  it("CSS: the pulse is the only looping animation; reduced motion stills pulse and draw", () => {
    const pathRules = blocks(read("styles/nutrition.css")).filter((b) =>
      b.selector.includes(".day-path"),
    );
    const animated = pathRules.filter((b) => b.body.includes("animation"));
    expect(animated.every((b) => b.selector.includes("__pulse"))).toBe(true);
    expect(ruleBody(".day-path__when[data-estimated=\"true\"]")).toContain("dashed");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.day-path__pulse\s*\{\s*animation: none/,
    );
    expect(css).toMatch(/\.day-path__fill\s*\{[^}]*transition:[^}]*transform/);
  });
});

/* --------------------- (f) the page, assembled --------------------- */

function seedAssessment(answers: Partial<AssessmentState["answers"]>): void {
  const state: AssessmentState = {
    version: 1,
    status: "complete",
    step: "summary",
    answers: { ...EMPTY_ANSWERS, ...answers },
    consents: [],
    startedAt: "2026-11-10T03:00:00.000Z",
    completedAt: "2026-11-10T03:05:00.000Z",
    updatedAt: "2026-11-10T03:05:00.000Z",
  };
  setPref(ASSESSMENT_KEY, state);
}

let seq = 0;
function logEntry(day: string): LogEntry {
  seq += 1;
  return {
    id: `prims-e-${seq}`,
    day,
    meal: "lunch",
    foodId: "usda-168893",
    snapshot: null,
    name: "Whole wheat flour (atta)",
    amount: { grams: 400 },
    nutrients: { kcal: 1800, proteinG: 90, carbsG: 180, fatG: 60 },
    provenance: { kind: "usda", sourceId: "usda-168893", label: "USDA" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

describe("N2 — the Nutrition page with the primitives in place", () => {
  it("no native details; sub-nav items are not pills; the plan header carries control + strip", () => {
    const answers = {
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
    seedAssessment(answers);
    const state: AssessmentState = {
      version: 1,
      status: "complete",
      step: "summary",
      answers: { ...EMPTY_ANSWERS, ...answers },
      consents: [],
      startedAt: null,
      completedAt: "2026-11-10T03:05:00.000Z",
      updatedAt: "2026-11-10T03:05:00.000Z",
    };
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
      id: "plan-prims-guard",
    });
    if (!outcome.ok) throw new Error("expected a plan");
    writePlan({ ...outcome.plan, day: todayLocal() });
    const today = todayLocal();
    writeFoodLog([logEntry(shiftDay(today, -1)), logEntry(shiftDay(today, -2))]);

    const { container } = render(<NutritionPage />);

    expect(container.querySelectorAll("details")).toHaveLength(0);
    expect(container.querySelectorAll("summary")).toHaveLength(0);

    const nav = container.querySelector(".nut-subnav")!;
    expect(nav, "the sub-nav renders").not.toBeNull();
    for (const a of nav.querySelectorAll("a")) {
      expect(a.classList.contains("nut-chip")).toBe(false);
    }
    expect(nav.querySelector(".nut-subnav__indicator")).not.toBeNull();

    const plan = container.querySelector<HTMLElement>('section[aria-label="Your plan for today"]')!;
    expect(plan, "the plan section renders").not.toBeNull();
    expect(within(plan).getByRole("radiogroup", { name: "Your goal" })).toBeTruthy();
    expect(plan.querySelectorAll(".nut-chip-solid")).toHaveLength(0);
    const strip = plan.querySelector(".stat-strip")!;
    expect(strip, "the stat strip renders in the plan header").not.toBeNull();
    expect(strip.querySelectorAll(".stat-strip__cell")).toHaveLength(4);

    /* "How this plan is built" — protected content, new chrome: a
       button now, and its words still one tap away. Brief v7 N5:
       the disclosure lives in the day section (the shell split moved
       it with the meals it explains). */
    const day = container.querySelector<HTMLElement>('section[aria-label="Your day"]')!;
    expect(day, "the day section renders").not.toBeNull();
    const more = within(day).getByRole("button", { name: /How this plan is built/ });
    fireEvent.click(more);
    expect(within(day).getByText(/Plans are built from real dishes/)).toBeTruthy();
  });
});
