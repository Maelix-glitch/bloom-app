// @vitest-environment jsdom
/**
 * Nutrition hero guards (Brief v6 Slice 7 — M-124, M-125, M-126).
 * What CAN be pinned structurally is pinned here:
 *
 *   1. M-126: the hero numeral is kcal EATEN so far, with the guide as
 *      its context line ("of your ~1,350 kcal guide"). The words
 *      "kcal left" never render — no countdown. (Framing only: the
 *      targets and every computed number are the lib's, unchanged.)
 *   2. M-125: the concentric double ring is gone — no <circle> in the
 *      hero at all. The day reads as two house meters (Calories,
 *      Protein), each a real progressbar whose max is the guide and
 *      whose now is what was eaten.
 *   3. M-124: the hero footer is ONE row (.nut-hero-foot): provenance
 *      summary on the left ("Provenance ledger · N entries · state"),
 *      the eating window as one chip on the right. "Nothing to verify
 *      yet" is part of that line on an empty day, never a floating
 *      fragment. The estimate line is one row — chip + short line —
 *      and the BMR/TDEE specifics live in the ledger detail, not in a
 *      wrapped sentence under a chip.
 *   4. M-125 (page): a logged-out day is ONE compact .empty-row
 *      (icon + line + Log action), not a full card. The fresh-account
 *      state keeps the full EmptyState — there the empty state IS the
 *      page's main content (house rule, styles.css at .empty-row).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ userId: "user-1", ready: true }),
}));

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const HERO = read("components/nutrition/NutritionHero.tsx");

import { setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import { shiftDay, todayLocal } from "@/lib/localDay";
import { BODY_KEY, DEFAULT_BODY, type BodyProfile } from "@/lib/health/body";
import {
  compareTotalsToTargets,
  type NutritionTargets,
  type TotalsComparison,
} from "@/lib/nutrition/targets";
import type { DayLog, LogEntry, Nutrients } from "@/lib/nutrition/types";
import { createEntryFromFood, saveCustomFood } from "@/lib/nutrition";
import { logEntry } from "@/lib/nutrition/log";
import type { NutritionTargetState } from "@/hooks/useNutrition";
import { NutritionHero } from "./NutritionHero";
import { NutritionPage } from "./NutritionPage";

beforeEach(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  window.localStorage.clear();
  resetPrefCache();
});

afterEach(() => cleanup());

/* ------------------------------- hero fixtures ------------------------------ */

const DAY = "2026-11-19";
const TARGETS: NutritionTargets = { kcal: 1350, proteinG: 171 };
const READY: NutritionTargetState = { kind: "ready", targets: TARGETS };

function entry(id: string, kcal: number, kind: "usda" | "user_entered", createdAt: string): LogEntry {
  return {
    id,
    day: DAY,
    meal: "breakfast",
    foodId: null,
    snapshot: null,
    name: id,
    amount: { grams: 100 },
    nutrients: { kcal, proteinG: 10, carbsG: 20, fatG: 5 },
    provenance: { kind, sourceId: id, label: kind === "usda" ? "USDA" : "Your value" },
    source: "search",
    createdAt,
  };
}

const LOGGED_TOTALS: Nutrients = { kcal: 850, proteinG: 47, carbsG: 90, fatG: 30 };
const LOGGED: DayLog = {
  day: DAY,
  entries: [
    entry("e1", 500, "usda", "2026-11-19T08:05:00.000Z"),
    entry("e2", 350, "user_entered", "2026-11-19T13:20:00.000Z"),
  ],
  totals: LOGGED_TOTALS,
};
const EMPTY: DayLog = {
  day: DAY,
  entries: [],
  totals: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
};

function renderHero(log: DayLog, comparison: TotalsComparison) {
  return render(
    <NutritionHero
      day={DAY}
      today={DAY}
      log={log}
      targetState={READY}
      comparison={comparison}
      bmr={1808}
      tdee={2170}
    />,
  );
}

/* --------------------------------- the hero -------------------------------- */

describe("nutrition v6 guards — no countdown (M-126)", () => {
  it("the numeral is what was eaten; the guide is its context line", () => {
    const { container } = renderHero(LOGGED, compareTotalsToTargets(LOGGED_TOTALS, TARGETS));
    expect(container.querySelector('[data-metric="day-kcal-headline"]')?.textContent).toBe("850");
    expect(container.querySelector('[data-metric="day-kcal-vs-target"]')?.textContent).toContain(
      "of your ~1,350 kcal guide",
    );
    expect(container.textContent).not.toContain("kcal left");
  });

  it("the hero source carries no countdown wording at all", () => {
    expect(HERO).not.toContain("kcal left");
    expect(HERO).not.toContain("kcal past your guide");
  });
});

describe("nutrition v6 guards — meters, not rings (M-125)", () => {
  it("no circle is drawn in the hero; two progressbar meters carry the day", () => {
    const { container } = renderHero(LOGGED, compareTotalsToTargets(LOGGED_TOTALS, TARGETS));
    expect(container.querySelectorAll("circle").length).toBe(0);
    const kcal = screen.getByRole("progressbar", { name: "Calories against target" });
    expect(kcal.getAttribute("aria-valuemax")).toBe("1350");
    expect(kcal.getAttribute("aria-valuenow")).toBe("850");
    const protein = screen.getByRole("progressbar", { name: "Protein against target" });
    expect(protein.getAttribute("aria-valuemax")).toBe("171");
    expect(protein.getAttribute("aria-valuenow")).toBe("47");
  });
});

describe("nutrition v6 guards — one footer row (M-124)", () => {
  it("provenance summary and the eating-window chip share one row", () => {
    const { container } = renderHero(LOGGED, compareTotalsToTargets(LOGGED_TOTALS, TARGETS));
    const foot = container.querySelector(".nut-hero-foot");
    expect(foot).not.toBeNull();
    expect(foot?.textContent).toContain("Provenance ledger");
    expect(foot?.textContent).toContain("2 entries");
    expect(foot?.textContent).toContain("100% from stated values");
    expect(foot?.textContent).toContain("Eating window");
  });

  it("the estimate line is chip + short line; the specifics moved to the ledger detail", () => {
    const { container } = renderHero(LOGGED, compareTotalsToTargets(LOGGED_TOTALS, TARGETS));
    const chip = container.querySelector('[data-testid="estimate-chip"]');
    expect(chip).not.toBeNull();
    const note = chip?.closest(".nut-note");
    expect(note?.textContent).toContain("Mifflin");
    expect(note?.textContent).not.toContain("at rest");
    expect(container.querySelector('[data-testid="target-source-line"]')?.textContent).toContain(
      "1,808 kcal at rest",
    );
  });

  it("on an empty day, 'Nothing to verify yet' is part of the one provenance line", () => {
    const emptyTotals = EMPTY.totals;
    const { container } = renderHero(EMPTY, compareTotalsToTargets(emptyTotals, TARGETS));
    const foot = container.querySelector(".nut-hero-foot");
    expect(foot?.textContent).toContain("Nothing to verify yet");
    expect(foot?.textContent).toContain("Eating window");
  });
});

/* ------------------------------ the page's row ----------------------------- */

describe("nutrition v6 guards — an empty day is a row, not a card (M-125)", () => {
  it("renders one .empty-row with the log action, and no full card", () => {
    const profile: BodyProfile = {
      ...DEFAULT_BODY,
      heightCm: 175,
      weightKg: 82,
      age: 30,
      sex: "female",
      activity: "light",
      goal: "maintain",
      updatedAt: "2026-11-15T08:30:00.000Z",
    };
    setPref(BODY_KEY, profile);
    const oats = saveCustomFood({
      name: "Guard Oats",
      per100g: { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 },
    });
    if (!oats) throw new Error("seed refused");
    const yesterday = shiftDay(todayLocal(), -1);
    const e = createEntryFromFood({
      food: oats,
      amount: { grams: 100 },
      meal: "breakfast",
      day: yesterday,
      source: "search",
      now: "2026-11-15T08:30:00.000Z",
    });
    if (!e) throw new Error("entry refused");
    logEntry(e);

    const { container } = render(<NutritionPage />);
    const rows = [...container.querySelectorAll(".empty-row")].filter((r) =>
      (r.textContent ?? "").includes("Nothing logged yet"),
    );
    expect(rows.length).toBe(1);
    expect(rows[0]?.querySelector("button")?.textContent).toMatch(/log your first food/i);
    expect(container.querySelector('section.nut-card[aria-label="Nothing logged yet"]')).toBeNull();
  });
});
