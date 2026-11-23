// @vitest-environment jsdom
/**
 * The anti-document guard for the plan's learning surface — REWRITTEN
 * for brief v4 Slice 5, with the reason recorded here as the house
 * requires: this file used to audit the plan section's "What your
 * plan learned" block (v3 Slice 1). Slice 5 RETIRED that block —
 * the Twin absorbed its conclusions as an insight strip (brief 3.4),
 * its numbers stayed in the Twin's tiles, and the block's label is
 * gone (M-83/M-84). Auditing a removed block would guard nothing, so
 * the guard now audits the SUCCESSOR surface to the same four checks
 * (defined in antiDocument.guard.test.ts; the helper is duplicated
 * here rather than imported across test files):
 *
 *   · the "What your plan learned" label renders NOWHERE;
 *   · the Twin's insight strip (`.twin-strip`) is insight cards, not
 *     a stack of notes — no long paragraphs, every card anchored, at
 *     most one paragraph per card, no form rows;
 *   · the strip never exceeds two rows (the brief's cap).
 *
 * The render is the real prefs-backed flow, as before: seeded
 * assessment, seeded food log, the real compose, then a remount so
 * the sections read the stored plan back.
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
import { writeFoodLog, type LogEntry } from "@/lib/nutrition";
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

const ANCHOR_SELECTOR =
  ".meter, [role='progressbar'], svg, img, canvas, .tile__figure, .vstat, .nut-badge, .src-chip, .empty-row, .stat";
const CARD_SELECTOR = ".nut-card, .tile, .insight";

interface SectionAudit {
  longP: string[];
  anchorless: string[];
  manyP: string[];
  wideGap: number;
}

function visibleParagraphs(scope: HTMLElement): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>("p")].filter(
    (p) => !p.closest("details, dialog, [hidden]") && !p.closest('[data-allow="long-text"]'),
  );
}

function cardName(card: HTMLElement): string {
  return (
    card.querySelector("h2, h3")?.textContent?.trim() ??
    card.getAttribute("aria-label") ??
    "(untitled)"
  );
}

/** The card that owns a paragraph: walk up from it; the first card
 *  met owns it, and the audit root is the boundary card of last
 *  resort (the strip's root is a plain div, not a card). */
function ownerCard(p: HTMLElement, root: HTMLElement): HTMLElement {
  let el: HTMLElement | null = p.parentElement;
  while (el && el !== root) {
    if (el.matches(CARD_SELECTOR)) return el;
    el = el.parentElement;
  }
  return root;
}

function auditSection(root: HTMLElement): SectionAudit {
  const longP = visibleParagraphs(root)
    .filter((p) => (p.textContent ?? "").trim().length > 200)
    .map((p) => (p.textContent ?? "").trim().slice(0, 60));

  const cards = new Set<HTMLElement>([root]);
  root.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach((c) => cards.add(c));

  const allP = visibleParagraphs(root);
  const anchorless: string[] = [];
  const manyP: string[] = [];
  for (const card of cards) {
    if (!card.querySelector(ANCHOR_SELECTOR)) anchorless.push(cardName(card));
    const own = allP.filter((p) => ownerCard(p, root) === card);
    if (own.length > 1) manyP.push(cardName(card));
  }

  const wideGap = [...root.querySelectorAll<HTMLElement>(".kv-row, .setting")].filter(
    (row) => row.querySelector('[role="switch"], .kv-v') !== null,
  ).length;

  return { longP, anchorless, manyP, wideGap };
}

/* ------------------------------ fixtures ------------------------------- */

function seedAssessment(): void {
  const state: AssessmentState = {
    version: 1,
    status: "complete",
    step: "summary",
    answers: {
      ...EMPTY_ANSWERS,
      ageYears: 30,
      heightCm: 175,
      weightKg: 82,
      sex: "female",
      goal: "lose",
      activity: "light",
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
  /* A food-backed entry: the strict parser (parseLogEntry) drops a
     "search" entry without a foodId, so the fixture names a real
     reference food and inherits its provenance. */
  return {
    id: `guard-e-${seq}`,
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

/** A COMPLETE logged day (M-219, audit F-11): the day's totals
 *  split across lunch and dinner. The adherence learning the Twin
 *  strip carries reads complete days only — a single lunch entry
 *  is a fragment, and fragments no longer steer anything. */
function logDay(day: string): LogEntry[] {
  const lunch = logEntry(day);
  const dinner: LogEntry = {
    ...logEntry(day),
    meal: "dinner",
    nutrients: { kcal: 900, proteinG: 45, carbsG: 90, fatG: 30 },
  };
  lunch.nutrients = { kcal: 900, proteinG: 45, carbsG: 90, fatG: 30 };
  return [lunch, dinner];
}

/* -------------------------------- test --------------------------------- */

describe("anti-document guard — the absorbed insight strip (strict)", () => {
  it("the learned block is retired; its successor strip is insight cards, not notes", async () => {
    seedAssessment();
    const today = todayLocal();
    /* Three logged days before today: enough for the adherence
       learning (>= 2 recent days) — the conclusion the old block
       stacked as prose and the strip now carries as a card. */
    writeFoodLog([
      ...logDay(shiftDay(today, -1)),
      ...logDay(shiftDay(today, -2)),
      ...logDay(shiftDay(today, -3)),
    ]);

    const first = render(
      <>
        <NutritionPlanSection />
        <MetabolicTwinSection />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    await screen.findByRole("button", { name: /Suggest different meals/ }, { timeout: 8000 });
    first.unmount();

    /* Remount: both sections read the STORED plan — the state the
       strip's data (planLearningFor over the stored plan) needs. */
    const { container } = render(
      <>
        <NutritionPlanSection />
        <MetabolicTwinSection />
      </>,
    );
    await screen.findByRole("button", { name: /Suggest different meals/ }, { timeout: 8000 });

    /* The retired block's label renders nowhere (M-84's remainder
       dies with the block). */
    expect(container.textContent).not.toContain("What your plan learned");

    const twinSection = container.querySelector('section[aria-label="Your metabolic twin"]');
    expect(twinSection, "Twin section renders").not.toBeNull();
    const strip = twinSection!.querySelector<HTMLElement>(".twin-strip");
    expect(strip, "the Twin carries the absorbed insight strip").not.toBeNull();
    expect(
      strip!.querySelectorAll(".insight").length,
      "the strip is capped at two rows",
    ).toBeLessThanOrEqual(2);
    expect(
      strip!.querySelectorAll(".insight").length,
      "the adherence conclusion reaches the strip",
    ).toBeGreaterThan(0);

    const audit = auditSection(strip!);
    expect(audit.longP, "paragraphs over 200 chars").toEqual([]);
    expect(audit.anchorless, "cards with no visual anchor").toEqual([]);
    expect(audit.manyP, "cards with more than one paragraph").toEqual([]);
    expect(audit.wideGap, "label/value form rows").toBe(0);
  }, 30000);
});
