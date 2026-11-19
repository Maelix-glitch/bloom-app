// @vitest-environment jsdom
/**
 * The polish guard (brief v4, Slice 1) — Part 6 checks 1 and 5 in
 * Bloom's guard tradition (vitest/jsdom; this repo has no Playwright):
 *
 *   (1) TRUNCATION — no visible rendered paragraph or note longer
 *       than 40 chars may end without terminal punctuation
 *       (. ! ? … ) " ” :) — a sentence cut mid-word by a slice() or
 *       a clamp is exactly the M-81 defect. `data-allow="truncated"`
 *       on the element or an ancestor exempts, with the reason
 *       recorded where the exemption is used.
 *   (5) SAY IT ONCE — every rendered `data-metric="<key>"` must be
 *       unique per key. Cross-section duplicates that exist today
 *       (M-83) run in DEBT mode: the guard asserts the duplicate set
 *       equals exactly KNOWN_DUPLICATE_METRICS — a NEW duplicate
 *       fails, and clearing one (v4 Slice 5) requires removing it
 *       from the list. Within a single section, duplicates fail
 *       immediately, debt or not.
 *
 * Scope: the plan section + the Metabolic Twin, rendered together
 * through the REAL prefs-backed flow (seeded assessment, seeded food
 * log, the real compose) — the two sections M-83 names, plus the
 * plan's notes where M-81 lives. The hero's figures carry
 * data-metric attributes from this slice but are not rendered here;
 * its ledger captions are fragments by design and would take a
 * data-allow exemption if the sweep (v4 Slice 6) extends check 1
 * to the hero.
 *
 * The storage round-trip test is the deterministic M-81 pin: the
 * owner's exact corner composed by the real engine, serialised and
 * re-parsed — on the pre-fix parser every note over 300 chars came
 * back cut mid-word.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

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
import { ASSESSMENT_KEY, EMPTY_ANSWERS, type AssessmentState } from "@/lib/assessment/state";
import {
  generatePlan,
  parsePlanValue,
  planValueOf,
  writeFoodLog,
  type LogEntry,
} from "@/lib/nutrition";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";
import {
  EMPTY_BEHAVIOURAL,
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { NutritionPlanSection } from "@/components/nutrition/NutritionPlanSection";
import { MetabolicTwinSection } from "@/components/nutrition/MetabolicTwinSection";

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

/* ------------------------------ the audit ------------------------------ */

const TERMINAL = /[.!?…)"”:]$/;

function visibleParagraphs(scope: HTMLElement): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>("p")].filter(
    (p) => !p.closest("details, dialog, [hidden]") && !p.closest('[data-allow="truncated"]'),
  );
}

/** Check 1: rendered sentences that end mid-thought. */
export function truncatedTexts(scope: HTMLElement): string[] {
  return visibleParagraphs(scope)
    .map((p) => (p.textContent ?? "").trim())
    .filter((t) => t.length > 40 && !TERMINAL.test(t));
}

/** Check 5: data-metric keys rendered more than once. */
export function duplicateMetrics(scope: HTMLElement): string[] {
  const seen = new Map<string, number>();
  scope.querySelectorAll<HTMLElement>("[data-metric]").forEach((el) => {
    const key = el.getAttribute("data-metric")!;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  });
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k).sort();
}

function sectionOf(el: HTMLElement): HTMLElement | null {
  return el.closest("section");
}

/** Within-section duplicates — never allowed, debt list or not. */
export function withinSectionDuplicates(scope: HTMLElement): string[] {
  const perSection = new Map<HTMLElement, Map<string, number>>();
  scope.querySelectorAll<HTMLElement>("[data-metric]").forEach((el) => {
    const section = sectionOf(el);
    if (!section) return;
    const counts = perSection.get(section) ?? new Map<string, number>();
    const key = el.getAttribute("data-metric")!;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    perSection.set(section, counts);
  });
  const out: string[] = [];
  for (const counts of perSection.values()) {
    for (const [key, n] of counts) if (n > 1) out.push(key);
  }
  return out.sort();
}

/**
 * The M-83 debt, recorded 2026-11-19 (brief v4 Slice 1): facts the
 * plan section and the Twin BOTH state today. v4 Slice 5 (Twin
 * absorbs "What your plan learned") clears this list to empty —
 * removing an entry without removing the duplicate fails the
 * within-page assertion below, and adding a duplicate fails it too.
 */
export const KNOWN_DUPLICATE_METRICS: readonly string[] = [
  "intake-kcal-avg",
  "intake-protein-avg",
  "maintenance-requirements",
];

/* ------------------------------ fixtures ------------------------------- */

/** The owner's corner as Assessment answers (his live record:
 *  95 kg, 165 cm, 19 y, lose at 1 kg/week, mostly sitting, omnivore,
 *  budget tier 2, south indian, no cooking, ~10 min prep, his
 *  equipment). Sex reads "unspecified" — the branch of the target
 *  formula that yields his live 1,350 kcal guide (the floor). */
function seedOwnerAssessment(): void {
  const state: AssessmentState = {
    version: 1,
    status: "complete",
    step: "summary",
    answers: {
      ...EMPTY_ANSWERS,
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
    },
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
    id: `polish-e-${seq}`,
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

function seedLog(): void {
  const today = todayLocal();
  writeFoodLog([
    logEntry(shiftDay(today, -1)),
    logEntry(shiftDay(today, -2)),
    logEntry(shiftDay(today, -3)),
  ]);
}

/* -------------------------------- tests -------------------------------- */

describe("polish guard — storage round-trip (the M-81 pin)", () => {
  it("a composed plan's notes survive serialise → parse whole, every one ending a sentence", () => {
    const profile: HealthProfile = {
      ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
      ageYears: 19,
      sex: "unspecified",
      height: observation(quantity(165, "cm"), { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" }),
      weight: observation(quantity(95, "kg"), { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" }),
      goal: "lose",
      activity: "sedentary",
      rateKgPerWeek: 1,
      dietary: {
        ...EMPTY_DIETARY,
        pattern: "omnivore",
        budgetTier: 2,
        cuisinePreference: "south_indian",
        mealsPerDay: 3,
      },
      behavioural: {
        ...EMPTY_BEHAVIOURAL,
        cookingAbility: "none",
        equipment: ["stove", "pressure_cooker", "mixer_grinder", "fridge"],
        prepTimeMaxMinutes: 10,
      },
      constraints: {
        ...EMPTY_CONSTRAINTS,
        pregnantOrBreastfeeding: false,
        eatingDisorderHistory: false,
      },
    };
    const outcome = generatePlan({
      profile,
      safety: classifySafety(toSafetyInput(profile)),
      gatedOutcome: { ok: false, reason: "profile_incomplete", missing: [] },
      fallbackTargets: { kcal: 1350, proteinG: 171 },
      foods: USDA_REFERENCE_FOODS,
      dishes: DISH_LIBRARY,
      day: "2026-11-19",
      now: "2026-11-19T03:00:00.000Z",
      id: "plan-polish-guard",
    });
    if (!outcome.ok) throw new Error("owner corner plan refused");
    const plan = outcome.plan;
    /* The corner must actually produce the kitchen relaxation —
       otherwise this pin guards nothing. (Pin updated for brief v4:
       the composer now emits the kitchen-relaxed REASON and the
       note string is reasons.ts's derived detail for it, so the
       old prose "leave almost no real dishes…" no longer exists
       anywhere — that is the fix, not a weakening.) */
    expect(plan.reasons?.some((r) => r.kind === "kitchen-relaxed")).toBe(true);
    expect(plan.notes.some((n) => n.startsWith("Your kitchen answers"))).toBe(true);

    const parsed = parsePlanValue(JSON.parse(JSON.stringify(planValueOf(plan))));
    expect(parsed).not.toBeNull();
    for (const note of parsed!.notes) {
      expect(note.length, `note cut or over-long: ${note.slice(0, 60)}`).toBeLessThanOrEqual(2000);
      expect(TERMINAL.test(note.trim()), `note ends mid-sentence: …${note.slice(-40)}`).toBe(true);
    }
    /* The kitchen reason survives the round trip AS DATA, with its
       relaxation stages intact, and its derived note arrives WHOLE
       — the screenshot's cut ("…no longer fit — y") cannot recur:
       the parser's bound is a tamper bound, not an editor. */
    const kitchenReason = parsed!.reasons?.find((r) => r.kind === "kitchen-relaxed");
    expect(kitchenReason).toBeDefined();
    if (kitchenReason?.kind === "kitchen-relaxed") {
      expect(kitchenReason.stages.length).toBeGreaterThan(0);
    }
    const kitchen = parsed!.notes.find((n) => n.startsWith("Your kitchen answers"))!;
    expect(kitchen).toBe("Your kitchen answers leave almost no real dishes, so cooking is allowed.");
  });
});

describe("polish guard — Nutrition render (plan + Twin)", () => {
  it("no truncated sentences; data-metric duplicates are exactly the recorded M-83 debt", async () => {
    seedOwnerAssessment();
    seedLog();

    const first = render(
      <>
        <NutritionPlanSection />
        <MetabolicTwinSection />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    await screen.findByRole("button", { name: /Compose again/ }, { timeout: 8000 });
    first.unmount();

    /* Remount: the sections now read the STORED plan back through
       the parser — the exact path that cut the owner's note. */
    const { container } = render(
      <>
        <NutritionPlanSection />
        <MetabolicTwinSection />
      </>,
    );
    await screen.findByRole("button", { name: /Compose again/ }, { timeout: 8000 });

    expect(truncatedTexts(container), "rendered sentences cut mid-thought").toEqual([]);
    expect(withinSectionDuplicates(container), "duplicates inside one section").toEqual([]);
    expect(
      duplicateMetrics(container),
      "cross-section duplicates beyond the recorded M-83 debt",
    ).toEqual([...KNOWN_DUPLICATE_METRICS]);
  }, 30000);
});
