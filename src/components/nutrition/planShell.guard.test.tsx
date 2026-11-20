// @vitest-environment jsdom
/**
 * The N5 guard (brief v7, Slice N5) — HEADER + SHELL: the page becomes
 * one day. Executable pins:
 *
 *   (a) THE HEADER SAYS THE DAY, NOT THE GOAL (M-142) — the plan
 *       header's H2 is "Today's plan"; the goal's name appears as
 *       prose in the header ZERO times (the segmented control's own
 *       option labels are the control, not prose). Inside the header,
 *       the order is section-head → stat strip → goal control (§7.1).
 *   (b) THE RENAME (M-143's remnant) — "Compose again" is absent from
 *       the page; "Suggest different meals" is present, is a ghost
 *       button (never a second gold), and is wired to the same
 *       compose() handler (source pin).
 *   (c) ONE setGoal PATH (M-115, re-verified) — exactly ONE goal
 *       radiogroup renders; every SegmentedGoalControl in the section
 *       source writes through usePlan.setGoal; Programmes and Modes
 *       contain no goal control and no setGoal call at all.
 *   (d) THE §7.1 COMPOSITION — DOM order on the rendered fragment:
 *       header card → WaterBloom → day card (DayPath + meals) →
 *       Today's balance → How today's plan was adjusted; and in the
 *       page source the grocery section renders before the Twin.
 *   (e) WATER KEEPS ITS WIRING — the panel renders exactly once, as a
 *       sibling in the flow (inside NEITHER the header card NOR the
 *       day card), and its figure still carries the plan's own
 *       hydration target through fmtLitres.
 *   (f) THE MIFFLIN NOTE MOVED, WORDS UNCHANGED — no "Mifflin" text
 *       stands loose in the header card; the sentence lives inside
 *       the "How this plan is built" disclosure in the day card.
 *   (g) SHELL CALM — the header card carries no gold button; the
 *       whole fragment carries at most one (the clock-primary
 *       Log meal in the day card).
 *
 * Fixtures: the house pattern (planBalance.guard) — a real composed
 * plan re-stamped to today; expectations read the stored plan and
 * the lib formatters, never hard-coded figures.
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

import { setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import { todayLocal } from "@/lib/localDay";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  toHealthProfile,
  type AssessmentState,
} from "@/lib/assessment/state";
import { GOAL_LABEL } from "@/lib/assessment/questions";
import { fmtLitres } from "@/lib/format";
import {
  generatePlan,
  readPlan,
  USDA_REFERENCE_FOODS,
  writePlan,
} from "@/lib/nutrition";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
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

function seedAndStore(): void {
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
    id: "plan-shell-guard",
  });
  if (!outcome.ok) throw new Error("expected a plan");
  writePlan({ ...outcome.plan, day: todayLocal() });
}

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

function sectionByLabel(container: HTMLElement, label: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`section[aria-label="${label}"]`);
  expect(el, `section "${label}" renders`).not.toBeNull();
  return el!;
}

/** True when `b` comes after `a` in document order. */
function follows(a: Element, b: Element): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe("plan shell guard — brief v7 N5", () => {
  it("(a) the header says the day, not the goal; head → strip → control inside it", () => {
    seedAndStore();
    const stored = readPlan();
    if (!stored) throw new Error("expected a stored plan");
    const { container } = render(<NutritionPlanSection />);
    const header = sectionByLabel(container, "Your plan for today");

    const h2 = header.querySelector("h2");
    expect(h2, "the header H2 renders").not.toBeNull();
    expect(h2!.textContent?.trim()).toBe("Today's plan");
    expect(header.querySelector(".section-head__title")?.textContent?.trim()).toBe(
      "Today's plan",
    );

    /* The goal's name as prose: the section head and every paragraph
       in the header card are prose surfaces; none may carry the
       goal label. (The radiogroup's option labels are the control
       itself — the goal's one interactive statement — not prose.) */
    const goalLabel = GOAL_LABEL[stored.goal];
    expect(header.querySelector(".section-head")!.textContent).not.toContain(goalLabel);
    for (const p of header.querySelectorAll("p")) {
      expect(p.textContent).not.toContain(goalLabel);
    }

    /* §7.1 inside the header: section-head, then the stat strip,
       then the segmented goal control. */
    const head = header.querySelector(".section-head")!;
    const strip = header.querySelector(".stat-strip")!;
    const control = within(header).getByRole("radiogroup", { name: "Your goal" });
    expect(strip, "the stat strip renders in the header").not.toBeNull();
    expect(follows(head, strip)).toBe(true);
    expect(follows(strip, control)).toBe(true);
  });

  it("(b)+(g) 'Suggest different meals' replaces 'Compose again', ghost, no gold in the header", () => {
    seedAndStore();
    const { container } = render(<NutritionPlanSection />);
    expect(container.textContent).not.toContain("Compose again");

    const header = sectionByLabel(container, "Your plan for today");
    const button = within(header).getByRole("button", { name: /Suggest different meals/ });
    expect(button.classList.contains("nut-btn-ghost")).toBe(true);
    expect(header.querySelectorAll(".nut-btn-gold")).toHaveLength(0);
    /* At most one gold in the whole fragment: the clock-primary
       Log meal in the day card. */
    expect(container.querySelectorAll(".nut-btn-gold").length).toBeLessThanOrEqual(1);

    /* Wiring: the renamed button still calls the same compose(). */
    const src = read("components/nutrition/NutritionPlanSection.tsx");
    expect(src).toContain("Suggest different meals");
    expect(src).not.toContain("Compose again");
    expect(src).toMatch(/onClick=\{\(\) => compose\(\)\}[\s\S]{0,240}Suggest different meals/);
  });

  it("(c) one setGoal path: one radiogroup; the control is the only goal writer", () => {
    seedAndStore();
    const { container } = render(<NutritionPlanSection />);
    expect(container.querySelectorAll('[role="radiogroup"]')).toHaveLength(1);

    const section = read("components/nutrition/NutritionPlanSection.tsx");
    const controls = section.match(/<SegmentedGoalControl/g) ?? [];
    const wired = section.match(/onSelect=\{setGoal\}/g) ?? [];
    expect(controls.length).toBeGreaterThan(0);
    expect(wired).toHaveLength(controls.length);

    for (const rel of [
      "components/nutrition/ProgrammesSection.tsx",
      "components/nutrition/ModesSection.tsx",
    ]) {
      const src = read(rel);
      expect(src, `${rel} has no goal control`).not.toContain("SegmentedGoalControl");
      expect(src, `${rel} never writes the goal`).not.toContain("setGoal");
    }
  });

  it("(d)+(e) the §7.1 composition: header → water → day → balance → adjusted; water a sibling, once, plan's target", () => {
    seedAndStore();
    const stored = readPlan();
    if (!stored) throw new Error("expected a stored plan");
    if (!stored.hydration) throw new Error("expected a hydration schedule");
    const { container } = render(<NutritionPlanSection />);

    const header = sectionByLabel(container, "Your plan for today");
    const day = sectionByLabel(container, "Your day");
    const balance = sectionByLabel(container, "Today's balance");
    const adjusted = sectionByLabel(container, "How today's plan was adjusted");

    const scenes = container.querySelectorAll("[data-water-bloom]");
    expect(scenes, "the WaterBloom scene renders exactly once").toHaveLength(1);
    const scene = scenes[0]!;

    /* A sibling in the flow: inside neither card, between the two. */
    expect(header.contains(scene)).toBe(false);
    expect(day.contains(scene)).toBe(false);
    expect(follows(header, scene)).toBe(true);
    expect(follows(scene, day)).toBe(true);
    expect(follows(day, balance)).toBe(true);
    expect(follows(balance, adjusted)).toBe(true);

    /* The day card holds the path and the meals panel. */
    expect(day.querySelector(".meals-panel"), "the meals panel lives in the day card").not.toBeNull();

    /* Wiring unchanged: the figure carries the plan's own target. */
    const figure = container.querySelector(".water-bloom-figure");
    expect(figure, "the WaterBloom figure").not.toBeNull();
    expect(figure!.textContent).toContain(`of ${fmtLitres(stored.hydration.targetMl)}`);
  });

  it("(d2) page composition: the grocery section renders before the Metabolic Twin", () => {
    const page = read("components/nutrition/NutritionPage.tsx");
    const grocery = page.indexOf("<GrocerySection />");
    const twin = page.indexOf("<MetabolicTwinSection />");
    expect(grocery, "the grocery section renders on the page").toBeGreaterThan(-1);
    expect(twin, "the Twin section renders on the page").toBeGreaterThan(-1);
    expect(grocery).toBeLessThan(twin);
  });

  it("(f) the Mifflin note lives in 'How this plan is built' now — not loose in the header", () => {
    seedAndStore();
    const { container } = render(<NutritionPlanSection />);
    const header = sectionByLabel(container, "Your plan for today");
    expect(header.textContent).not.toContain("Mifflin");

    const day = sectionByLabel(container, "Your day");
    const more = within(day).getByRole("button", { name: /How this plan is built/ });
    fireEvent.click(more);
    const note = [...day.querySelectorAll("p")].find((p) =>
      p.textContent?.includes("Mifflin–St Jeor"),
    );
    expect(note, "the targets-estimate note renders inside the disclosure").toBeTruthy();
    expect(note!.textContent).toContain("a guide for the day, not a prescription");
  });
});
