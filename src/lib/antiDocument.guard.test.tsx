// @vitest-environment jsdom
/**
 * The anti-document guard (anti-document brief v3, Slice 1) — the
 * brief's Playwright test re-implemented in Bloom's guard tradition
 * (vitest/jsdom structural guards; this repo has no Playwright). Four
 * checks over a rendered section:
 *
 *   (a) no visible <p> over 200 characters outside <details>/<dialog>
 *       (the paragraph budget) — `data-allow="long-text"` exempts;
 *   (b) every card carries a visual anchor — a meter, progressbar,
 *       svg, image, tile figure, vstat, badge/chip or empty row
 *       (the anchor law);
 *   (c) no card carries more than one visible paragraph of its own
 *       (paragraphs inside nested cards belong to those cards);
 *   (d) no form anatomy: a `.kv-row` is by definition Bloom's
 *       label-left / value-right grid (11rem minmax(0,1fr) auto), so
 *       a kv-row carrying a switch or a value cell inside a DISPLAY
 *       section is the form look made structural. jsdom has no
 *       layout; this is the honest structural proxy, and the tile
 *       conversion is the fix it measures.
 *
 * Strict for every section this file renders: the Metabolic Twin
 * (Slice 3) and, since Slice 4, Condition Modes and Programmes —
 * their census pins were flipped to strict assertions when the mode
 * tiles and programme cards landed. The plan section's learned block
 * has its own guard file (antiDocumentPlan.guard.test.ts) because it
 * renders through the real prefs-driven hooks, which this file mocks
 * for the Twin.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const nutritionState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const bodyState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const habitsState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/hooks/useNutrition", () => ({
  useNutrition: () => nutritionState.current,
}));
vi.mock("@/hooks/useBodyProfile", () => ({
  useBodyProfile: () => bodyState.current,
}));
vi.mock("@/hooks/useHabits", () => ({
  useHabits: () => habitsState.current,
}));
/* ProgrammesSection's useAssessment reads the body profile and
   throws on an empty record; the census renders the section with a
   completed assessment (the state it has for every real user who
   reaches the Nutrition page). Only `state.answers.goal` is read. */
vi.mock("@/hooks/useAssessment", () => ({
  useAssessment: () => ({ state: { status: "complete", answers: { goal: "lose" } } }),
}));

import type { Habit, HabitLog } from "@/lib/home/habits";
import type { LogEntry } from "@/lib/nutrition/types";
import { writeModes } from "@/lib/modes/modes";
import { resetPrefCache } from "@/lib/prefsStore";
import { MetabolicTwinSection } from "@/components/nutrition/MetabolicTwinSection";
import { ModesSection } from "@/components/nutrition/ModesSection";
import { ProgrammesSection } from "@/components/nutrition/ProgrammesSection";

afterEach(cleanup);

/* ------------------------------ the audit ------------------------------ */

const ANCHOR_SELECTOR =
  ".meter, [role='progressbar'], svg, img, canvas, .tile__figure, .vstat, .nut-badge, .src-chip, .empty-row, .stat";
const CARD_SELECTOR = ".nut-card, .tile, .insight, .programme";

export interface SectionAudit {
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
 *  resort (a section root need not itself carry a card class). */
function ownerCard(p: HTMLElement, root: HTMLElement): HTMLElement {
  let el: HTMLElement | null = p.parentElement;
  while (el && el !== root) {
    if (el.matches(CARD_SELECTOR)) return el;
    el = el.parentElement;
  }
  return root;
}

/** Audit one rendered section root against the four checks. */
export function auditSection(root: HTMLElement): SectionAudit {
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

function expectNotADocument(root: HTMLElement) {
  const audit = auditSection(root);
  expect(audit.longP, "paragraphs over 200 chars").toEqual([]);
  expect(audit.anchorless, "cards with no visual anchor").toEqual([]);
  expect(audit.manyP, "cards with more than one paragraph").toEqual([]);
  expect(audit.wideGap, "label/value form rows").toBe(0);
}

/* --------------------------- Twin fixtures ----------------------------- */
/* The proven fixtures from MetabolicTwinSection.test.tsx. */

let seq = 0;
function dayEntry(day: string, kcal: number): LogEntry {
  seq += 1;
  return {
    id: `e-${seq}`,
    day,
    meal: "lunch",
    foodId: null,
    snapshot: null,
    name: "logged",
    amount: { grams: 100 },
    nutrients: { kcal, proteinG: 0, carbsG: 0, fatG: 0 },
    provenance: { kind: "user_entered", sourceId: "fixture", label: "Your value" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

function daysFrom(from: string, count: number, kcal: number): LogEntry[] {
  const out: LogEntry[] = [];
  const start = Date.parse(`${from}T12:00:00Z`);
  for (let i = 0; i < count; i += 1) {
    out.push(dayEntry(new Date(start + i * 86_400_000).toISOString().slice(0, 10), kcal));
  }
  return out;
}

const dailyHabit: Habit = {
  id: "h-1",
  name: "Walk",
  icon: "walk",
  iconType: "bloom",
  iconUrl: null,
  color: "sage",
  frequency: "daily",
  points: 10,
  reminderTime: null,
  priority: "normal",
  tags: [],
  goal: null,
  days: [],
  timesPerWeek: null,
  startDate: null,
  note: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  archived: false,
  pausedFrom: null,
  pausedUntil: null,
};

function setTwinStores(patch: {
  entries?: LogEntry[];
  weighIns?: { date: string; kg: number }[];
  habits?: Habit[];
  habitLogs?: HabitLog[];
}) {
  nutritionState.current = {
    entries: patch.entries ?? [],
    targetState: { kind: "ready", targets: { kcal: 2500, proteinG: 100 } },
    spectrumSex: "male",
    today: "2026-10-22",
  };
  bodyState.current = { weighIns: patch.weighIns ?? [] };
  habitsState.current = { habits: patch.habits ?? [], logs: patch.habitLogs ?? [] };
}

function richTwin() {
  const habitLogs: HabitLog[] = [];
  const start = Date.parse("2026-10-08T12:00:00Z");
  for (let i = 0; i < 14; i += 1) {
    const date = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
    habitLogs.push({ habitId: "h-1", date, completedAt: `${date}T09:00:00.000Z` });
  }
  setTwinStores({
    entries: daysFrom("2026-10-01", 12, 2500),
    weighIns: [
      { date: "2026-10-01", kg: 100 },
      { date: "2026-10-22", kg: 99 },
    ],
    habits: [dailyHabit],
    habitLogs,
  });
}

/* -------------------------------- tests -------------------------------- */

describe("anti-document guard — Metabolic Twin (strict)", () => {
  it("a record that can speak: tiles, not paragraphs", () => {
    richTwin();
    const { container } = render(<MetabolicTwinSection />);
    expectNotADocument(container.querySelector("section")!);
  });

  it("an empty record: gathering tiles, not paragraphs", () => {
    setTwinStores({});
    const { container } = render(<MetabolicTwinSection />);
    expectNotADocument(container.querySelector("section")!);
  });
});

describe("anti-document guard — Condition Modes (strict, Slice 4)", () => {
  it("mode tiles, not form rows — every mode off", () => {
    window.localStorage.clear();
    resetPrefCache();
    const { container } = render(<ModesSection />);
    expectNotADocument(container.querySelector("section")!);
  });

  it("the effect footer is present in both switch states", () => {
    window.localStorage.clear();
    resetPrefCache();
    const off = render(<ModesSection />);
    const offSection = off.container.querySelector("section")!;
    /* Both filtering modes state their effect while OFF… */
    expect(offSection.textContent).toMatch(/Would hide [\d,]+ of [\d,]+ dishes/);
    cleanup();

    /* …and with blood-sugar aware switched on. */
    writeModes(["blood_sugar"]);
    resetPrefCache();
    const on = render(<ModesSection />);
    const onSection = on.container.querySelector("section")!;
    expect(onSection.textContent).toMatch(/Would hide [\d,]+ of [\d,]+ dishes/);
    expectNotADocument(onSection);
  });
});

describe("anti-document guard — Programmes (strict, Slice 4)", () => {
  it("comparison cards, not stacked paragraphs", () => {
    window.localStorage.clear();
    resetPrefCache();
    const { container } = render(<ProgrammesSection />);
    expectNotADocument(container.querySelector("section")!);
  });

  it("past runs: an ended run reads 'Ended early' with a meter — the word 'Quit' never renders", () => {
    window.localStorage.clear();
    resetPrefCache();
    const { container } = render(<ProgrammesSection />);
    const section = container.querySelector("section")!;
    /* Enrol, then end the run: it becomes a past run. */
    const enrol = screen.getAllByRole("button", { name: "Enrol" })[0]!;
    fireEvent.click(enrol);
    fireEvent.click(screen.getByRole("button", { name: "End programme" }));
    expect(section.textContent).toContain("Past runs (1)");
    expect(section.textContent).toContain("Ended early");
    expect(section.textContent).not.toMatch(/\bQuit\b/);
    expect(section.querySelector("[role='progressbar']")).not.toBeNull();
    expectNotADocument(section);
  });
});
