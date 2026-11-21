// @vitest-environment jsdom
/**
 * The section-system guard (brief v4, Slice 3) — Part 2's anatomy as
 * executable pins, in Bloom's guard tradition (vitest/jsdom + CSS
 * source pins, as sheet.guard does; this repo has no Playwright):
 *
 *   (a) H2 — every top-level Nutrition section renders a REAL serif
 *       H2 inside a `.section-head`; an eyebrow or an 11px group
 *       label can never be a section's only heading (M-84). The
 *       "Today's mix" label block is gone: its guideline notes live
 *       under an H2 "Today's balance", its adjustment notes under
 *       "How today's plan was adjusted".
 *   (b) RHYTHM — `.section` carries the 56px margin token
 *       (`--space-14`) — structural proxy: jsdom has no layout, so
 *       the pin reads the stylesheet, and the render asserts every
 *       top-level section carries the class (M-87).
 *   (c) SCROLL MARGIN — `.section` and the `.nut-jump` anchor
 *       wrappers carry `scroll-margin-top: 80px`, and the sub-nav is
 *       sticky at the shell's `--app-top-bar` offset with a
 *       `:focus-visible`-only ring and a `[data-selected]` treatment.
 *   (d) ONE BODY STYLE — `.nut-note`, the 12px grey paragraph style
 *       that carried the plan's sentences, is pinned to the 14px
 *       secondary step (M-86).
 *   (e) METER CAPS (Slice 5, M-92) — `.req li` carries the brief's
 *       grid verbatim: 7rem label, `minmax(0, 20rem)` bar, count in
 *       the adjacent column, left-aligned beside its bar.
 *
 * Scope: the whole Nutrition page rendered through the real
 * prefs-backed flow (seeded assessment, a real composed plan written
 * to storage, a seeded food log) — the sections as the page assembles
 * them, not as isolated components.
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
import { generatePlan, writeFoodLog, writePlan, type LogEntry } from "@/lib/nutrition";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { NutritionPage } from "@/components/nutrition/NutritionPage";

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

/* --------------------- Part A: stylesheet pins ---------------------- */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ");

/** Innermost rule blocks of a stylesheet, comments stripped (as sheet.guard). */
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

/** Blocks whose selector list names `sel` exactly (last line of the
 *  selector chunk, comma-split — residue from enclosing @media rules
 *  rides on earlier lines). */
function rulesFor(rel: string, sel: string): { selector: string; body: string }[] {
  return blocks(read(rel)).filter((b) => {
    const lastLine = b.selector.split("\n").pop() ?? "";
    return lastLine
      .split(",")
      .map((s) => s.trim())
      .includes(sel);
  });
}

function rulesMatching(rel: string, needle: string): { selector: string; body: string }[] {
  return blocks(read(rel)).filter((b) => b.selector.includes(needle));
}

describe("section system — stylesheet pins", () => {
  it("the 72px rhythm is a token, and .section carries it with the 80px scroll margin", () => {
    /* M-195 re-contract (disclosed): the decongestion pass raised the
       section step 56px → 72px at the owner's order; the pin keeps its
       strictness — the rhythm is still one named token with one value. */
    expect(read("styles.css")).toContain("--space-14: 4.5rem");
    const section = rulesFor("styles/nutrition.css", ".section");
    expect(section.length, ".section rule exists").toBeGreaterThan(0);
    const body = section.map((b) => b.body).join("\n");
    expect(body).toContain("margin-block-start: var(--space-14)");
    expect(body).toContain("scroll-margin-top: 80px");
  });

  it(".section-head__title is the serif 24px step; the subtitle is the 14px secondary step", () => {
    const title = rulesFor("styles/nutrition.css", ".section-head__title");
    expect(title.length, ".section-head__title rule exists").toBeGreaterThan(0);
    const titleBody = title.map((b) => b.body).join("\n");
    expect(titleBody).toContain("font-family: var(--font-display)");
    expect(titleBody).toContain("font-size: 1.5rem");
    const sub = rulesFor("styles/nutrition.css", ".section-head__sub");
    expect(sub.length, ".section-head__sub rule exists").toBeGreaterThan(0);
    expect(sub.map((b) => b.body).join("\n")).toContain("font-size: var(--text-callout)");
  });

  it("the sub-nav is sticky under the app top bar, with a selected treatment and a focus-visible-only ring", () => {
    const nav = rulesFor("styles/nutrition.css", ".nut-subnav");
    expect(nav.length, ".nut-subnav rule exists").toBeGreaterThan(0);
    const body = nav.map((b) => b.body).join("\n");
    expect(body).toContain("position: sticky");
    expect(body).toContain("top: var(--app-top-bar)");
    expect(
      rulesMatching("styles/nutrition.css", ".nut-subnav").some((b) =>
        b.selector.includes("[data-selected]"),
      ),
      "a [data-selected] treatment scoped to the sub-nav",
    ).toBe(true);
    expect(
      rulesMatching("styles/nutrition.css", ".nut-subnav").some((b) =>
        b.selector.includes(":focus-visible"),
      ),
      "a :focus-visible rule scoped to the sub-nav",
    ).toBe(true);
  });

  it("the anchor wrappers clear the sticky sub-nav at 80px", () => {
    const jump = rulesFor("styles/nutrition.css", ".nut-jump");
    expect(jump.length, ".nut-jump rule exists").toBeGreaterThan(0);
    expect(jump.map((b) => b.body).join("\n")).toContain("scroll-margin-top: 80px");
  });

  it(".nut-note no longer carries sentences at the 12px caption step (M-86)", () => {
    const note = rulesFor("styles/nutrition.css", ".nut-note");
    expect(note.length, ".nut-note rule exists").toBeGreaterThan(0);
    const body = note.map((b) => b.body).join("\n");
    expect(body).toContain("font-size: var(--text-callout)");
    expect(body).not.toContain("--text-caption");
  });

  /* Brief v4 Slice 5 (M-92): requirement meters are capped — the
     brief's grid verbatim (label 7rem, bar at most 20rem, count in
     the adjacent 3rem column). jsdom has no layout, so the cap is
     pinned on the stylesheet: a 1fr bar or a label over 7rem fails
     here, and the count's column follows the bar directly. */
  it("requirement meters are capped: 7rem label, bar ≤ 20rem, count adjacent (M-92)", () => {
    const req = rulesFor("styles/nutrition.css", ".req li");
    expect(req.length, ".req li rule exists").toBeGreaterThan(0);
    const body = req.map((b) => b.body).join("\n");
    expect(body).toContain("grid-template-columns: 7rem minmax(0, 20rem) 3rem");
    const count = rulesFor("styles/nutrition.css", ".req b");
    expect(count.length, ".req b rule exists").toBeGreaterThan(0);
    expect(count.map((b) => b.body).join("\n")).toContain("text-align: start");
  });
});

/* ---------------------- Part B: the page render --------------------- */

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
    id: `section-e-${seq}`,
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

function sectionByLabel(container: HTMLElement, label: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`section[aria-label="${label}"]`);
  expect(el, `section "${label}" renders`).not.toBeNull();
  return el!;
}

/** Every shelled section: the .section class (rhythm + scroll margin)
 *  and a real H2 in a .section-head (the hero keeps its own head —
 *  Part 2 sanctions the hero's eyebrow + display H2). */
function expectShelled(container: HTMLElement, label: string, hero = false): HTMLElement {
  const section = sectionByLabel(container, label);
  expect(section.classList.contains("section"), `"${label}" carries .section`).toBe(true);
  const h2 = section.querySelector("h2");
  expect(h2, `"${label}" renders a real H2`).not.toBeNull();
  if (!hero) {
    expect(h2!.closest(".section-head"), `"${label}" H2 sits in a .section-head`).not.toBeNull();
    expect(
      h2!.classList.contains("section-head__title"),
      `"${label}" H2 uses the shared title style`,
    ).toBe(true);
  }
  return section;
}

describe("section system — Nutrition page render", () => {
  it("every top-level section is shelled with a real H2; the mix block is Today's balance now", () => {
    /* The plan-section test's fixture: the 2026-11-18 rotation, whose
       fruit shortfall is a guideline (balance) note. Composed by the
       real engine and written to storage, so the page reads a ready
       plan — the same fixture NutritionPlanSection.test pins. */
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
      id: "plan-section-guard",
    });
    if (!outcome.ok) throw new Error("expected a plan");
    expect(outcome.plan.notes.some((n) => n.includes("of fruit"))).toBe(true);
    writePlan({ ...outcome.plan, day: todayLocal() });
    const today = todayLocal();
    writeFoodLog([logEntry(shiftDay(today, -1)), logEntry(shiftDay(today, -2))]);

    const { container } = render(<NutritionPage />);

    expectShelled(container, "Day totals", true);
    const plan = expectShelled(container, "Your plan for today");
    expectShelled(container, "Your metabolic twin");
    expectShelled(container, "Grocery list and pantry");
    expectShelled(container, "Condition modes");
    expectShelled(container, "Programmes");
    expectShelled(container, "Dishes");
    expectShelled(container, "Pattern lab");

    /* The balance section: its own top-level section with the H2 the
       brief names — and the plan section no longer holds the
       guideline judgement (the mix block is retired).
       Slice 4 update (brief 3.2): the fruit-guideline SENTENCE this
       guard pinned became the fruit goal meter — the same fact,
       rendered as the viz the brief mandates.
       Brief v7 N4 update: the meter's "to go" hint line is deleted
       with the rest of the balance prose — the pin follows it: the
       meter's goal (aria-valuemax) stands, the banned phrase is
       gone, and the section holds no paragraph at all. */
    const balance = expectShelled(container, "Today's balance");
    expect(within(balance).getByRole("heading", { level: 2 }).textContent).toBe(
      "Today's balance",
    );
    const fruitMeter = within(balance)
      .getAllByRole("progressbar")
      .find((m) => m.getAttribute("aria-label")?.startsWith("Fruit:"));
    expect(fruitMeter, "the fruit goal meter").toBeTruthy();
    expect(fruitMeter!.getAttribute("aria-valuemax")).toBe("100");
    expect(within(balance).queryByText(/to go/)).toBeNull();
    expect(balance.querySelectorAll("p").length).toBe(0);
    expect(
      within(container).queryByText(
        /fruit — the ICMR-NIN guideline aims for at least 100 g across the day/,
      ),
    ).toBeNull();
    expect(within(container).queryByText("Today's mix")).toBeNull();

    /* The sub-nav's anchors all land on sections that exist. */
    const nav = container.querySelector<HTMLElement>(".nut-subnav");
    expect(nav, "the sub-nav renders").not.toBeNull();
    const hrefs = [...nav!.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "#nut-plan",
      "#nut-grocery",
      "#nut-modes",
      "#nut-programmes",
      "#nut-dishes",
    ]);
    for (const href of hrefs) {
      expect(
        container.querySelector(href!),
        `anchor target ${href} exists`,
      ).not.toBeNull();
    }
  });

  it("adjustment reasons get their own shelled section, apart from the balance", async () => {
    /* The owner's corner (the polish guard's fixture): no cooking +
       ~10 min prep forces the kitchen relaxation — an ADJUSTMENT
       reason. Composed through the page's own flow. */
    seedAssessment({
      ageYears: 19,
      heightCm: 165,
      weightKg: 95,
      sex: "unspecified",
      goal: "lose",
      rateKgPerWeek: 1,
      activity: "sedentary",
      dietaryPattern: "omnivore",
      mealsPerDay: 3,
      foodBudget: 2,
      cuisinePreference: "south_indian",
      cookingAbility: "none",
      prepTimeMaxMinutes: 10,
      equipment: ["stove", "pressure_cooker", "mixer_grinder", "fridge"],
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
      unexplainedWeightChange: false,
    });
    const today = todayLocal();
    writeFoodLog([logEntry(shiftDay(today, -1)), logEntry(shiftDay(today, -2))]);

    const { container } = render(<NutritionPage />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    await screen.findByRole("button", { name: /Suggest different meals/ }, { timeout: 8000 });

    const adjusted = expectShelled(container, "How today's plan was adjusted");
    expect(within(adjusted).getByRole("heading", { level: 2 }).textContent).toBe(
      "How today's plan was adjusted",
    );
    /* Brief v7 N4: the kitchen row is worded by `adjustmentCopy`
       now — its title is "Some dishes need cooking" (the old
       `reasonCopy` title "Kitchen limits relaxed" retired with the
       prose partition). */
    expect(within(adjusted).getByText(/Some dishes need cooking/)).toBeTruthy();
    const plan = sectionByLabel(container, "Your plan for today");
    expect(within(plan).queryByText(/Some dishes need cooking/)).toBeNull();
  }, 30000);
});
