// @vitest-environment jsdom
/**
 * The anti-document guard, Slice 5 — the Profile "Your starting
 * point" card's header block (anti-document brief v3).
 *
 * The audit root is the card's `.split-card` header — the block this
 * slice rebuilds (intro line → `.note`). The card also hosts the
 * Living Assessment section and the Previous assessments list; those
 * are separate surfaces with their own tests and are not this
 * slice's claim. Scoping the audit to the rebuilt block follows the
 * plan guard's precedent (antiDocumentPlan.guard.test.ts audits the
 * learned block's subtree, not the whole plan section).
 *
 * This file renders through the REAL prefs store (the
 * AssessmentEntry.test pattern), which conflicts with the store mock
 * the Grocery/Labs guard uses — hence a separate file.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import { consentDecision } from "@/lib/vitalis/domain/consent";
import {
  ASSESSMENT_KEY,
  beginAssessment,
  completeAssessment,
  emptyAssessmentState,
  recordConsents,
  saveStep,
  type AssessmentState,
} from "@/lib/assessment/state";
import { AssessmentProfileCard } from "@/components/assessment/AssessmentEntry";

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
  ".meter, [role='progressbar'], svg, img, canvas, .tile__figure, .vstat, .nut-badge, .src-chip, .empty-row, .stat, .assess-state";
const CARD_SELECTOR = ".nut-card, .pf-card, .tile, .insight, .programme, .empty-row, .assess-box";

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

function ownerCard(p: HTMLElement, root: HTMLElement): HTMLElement {
  let el: HTMLElement | null = p.parentElement;
  while (el && el !== root) {
    if (el.matches(CARD_SELECTOR)) return el;
    el = el.parentElement;
  }
  return root;
}

function expectNotADocument(root: HTMLElement) {
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

  expect(longP, "paragraphs over 200 chars").toEqual([]);
  expect(anchorless, "cards with no visual anchor").toEqual([]);
  expect(manyP, "cards with more than one paragraph").toEqual([]);
  expect(wideGap, "label/value form rows").toBe(0);
}

/* ------------------------------ fixture -------------------------------- */

const T0 = "2026-11-10T10:00:00.000Z";
const T1 = "2026-11-10T10:05:00.000Z";
const T2 = "2026-11-12T09:30:00.000Z";

function completedState(): AssessmentState {
  let s = beginAssessment(emptyAssessmentState(T0), T0);
  s = recordConsents(
    s,
    [
      consentDecision("health_data_processing", true, T0),
      consentDecision("sensitive_health_processing", true, T0),
    ],
    T0,
  );
  s = saveStep(
    s,
    {
      ageYears: 34,
      heightCm: 172,
      weightKg: 74,
      goal: "lose",
      targetWeightKg: 68,
      rateKgPerWeek: 0.5,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
      unexplainedWeightChange: false,
      dietaryPattern: "vegetarian",
      mealsPerDay: 3,
      activity: "moderate",
      sleepHoursTypical: 7,
      sleepQuality: "good",
      morningRestedness: 4,
    },
    "summary",
    T1,
  );
  return completeAssessment(s, T2);
}

/* -------------------------------- test ---------------------------------- */

describe("anti-document guard — Profile starting point header (strict, Slice 5)", () => {
  it("a completed assessment: the intro is a note, the doors are intact", () => {
    setPref(ASSESSMENT_KEY, completedState());
    resetPrefCache();
    const { container } = render(<AssessmentProfileCard />);

    /* The doors this card exists for — untouched by the rebuild. */
    expect(screen.getByRole("button", { name: "View summary" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retake" })).toBeTruthy();

    const head = container.querySelector(".split-card")!;
    expectNotADocument(head as HTMLElement);
    /* The intro line renders as a note (icon + standing copy). */
    expect(head.querySelector(".note")?.textContent).toContain("Completed");
  });
});
