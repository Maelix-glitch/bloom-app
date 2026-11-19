// @vitest-environment jsdom
/**
 * The anti-document guard for the plan section's "What your plan
 * learned" block (anti-document brief v3, Slice 1) — the companion
 * to antiDocument.guard.test.ts. The block lives inside
 * NutritionPlanSection and is driven by the section's real
 * prefs-backed hooks, so this guard renders the whole section the
 * way its own test does (seeded assessment, seeded food log, the
 * real compose flow) and audits only the learned block's subtree.
 * The four checks and their meaning are defined in
 * antiDocument.guard.test.ts; the small audit helper is duplicated
 * here rather than imported across test files.
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
 *  resort (the learned block's root is a plain div, not a card). */
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

/* -------------------------------- test --------------------------------- */

describe("anti-document guard — What your plan learned (strict)", () => {
  it("insight cards, not a stack of notes", async () => {
    seedAssessment();
    const today = todayLocal();
    /* Three logged days before today: enough for the adherence
       learning (>= 2 recent days) and for the still-gathering
       maintenance note (> 0 logged days, no weigh-ins) — the two
       prose notes the old block stacked. */
    writeFoodLog([logEntry(shiftDay(today, -1)), logEntry(shiftDay(today, -2)), logEntry(shiftDay(today, -3))]);

    render(<NutritionPlanSection />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    await screen.findByRole("button", { name: /Compose again/ }, { timeout: 6000 });

    const label = [...document.querySelectorAll("p")].find((p) =>
      (p.textContent ?? "").includes("What your plan learned"),
    );
    expect(label, "the learned block renders").toBeTruthy();
    const block = label!.parentElement!;
    /* The block's audit scope includes the methodology line that
       trails it — after the rebuild that line lives in the block's
       own <details>, so audit the block's parent section subtree
       scoped to the block plus its details sibling. */
    const audit = auditSection(block);
    expect(audit.longP, "paragraphs over 200 chars").toEqual([]);
    expect(audit.anchorless, "cards with no visual anchor").toEqual([]);
    expect(audit.manyP, "cards with more than one paragraph").toEqual([]);
    expect(audit.wideGap, "label/value form rows").toBe(0);
  }, 20000);
});
