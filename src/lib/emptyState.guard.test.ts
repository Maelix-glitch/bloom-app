import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Empty-state guards (2026-11-19, senior diagnosis §C).
 *
 * The slice's settlements, pinned so they cannot quietly regress:
 *
 *   1. The empty ROW exists once, in the token home — a compact row
 *      (icon chip, one line, one small action), the sibling of the
 *      full EmptyState, which stays reserved for the places an empty
 *      state IS the page's main content.
 *   2. The Nutrition page carries the merged fresh-account state:
 *      no logs and no plan means ONE empty state, and the sections
 *      it replaces (hero stack, twin, grocery, pattern lab) render
 *      only outside it.
 *   3. The getting-started card reads its steps from the real record
 *      and disappears when they are done — no seeded progress.
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const STYLES = read("styles.css");
const NUTRITION_PAGE = read("components/nutrition/NutritionPage.tsx");
const GETTING_STARTED = read("components/profile/GettingStartedCard.tsx");

function blockFor(text: string, selector: string): string {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, " ");
  let prev = 0;
  for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
    const sel = clean.slice(prev, m.index).trim();
    prev = m.index + m[0].length;
    if (sel.endsWith(selector)) return m[1]!;
  }
  throw new Error(`selector not found: ${selector}`);
}

describe("empty-state guard: the empty row pattern", () => {
  it("the row is defined once, in the token home, as a dashed bounded row", () => {
    const row = blockFor(STYLES, ".empty-row");
    expect(row).toContain("display: flex");
    expect(row).toContain("border: 1px dashed var(--border)");
    expect(row).toContain("font-size: var(--text-callout)");
  });

  it("the row's icon chip and action slot exist", () => {
    expect(blockFor(STYLES, ".empty-row-icon")).toContain("var(--surface-2)");
    expect(blockFor(STYLES, ".empty-row-action")).toContain("margin-left: auto");
  });
});

describe("empty-state guard: Nutrition's merged fresh state", () => {
  it("the merged condition is account-level: no entries, no ready plan", () => {
    expect(NUTRITION_PAGE).toContain("nutrition.entries.length === 0");
    expect(NUTRITION_PAGE).toContain("freshAccount");
  });

  it("the sections the merge replaces are gated on it", () => {
    expect(NUTRITION_PAGE).toContain("{!freshAccount ? <MetabolicTwinSection /> : null}");
    expect(NUTRITION_PAGE).toContain("{isToday && !freshAccount ? <GrocerySection /> : null}");
    expect(NUTRITION_PAGE).toContain("{!freshAccount ? <PatternLab patterns={patterns} /> : null}");
  });
});

describe("empty-state guard: getting started reads the record", () => {
  it("each step's state comes from its own real source", () => {
    expect(GETTING_STARTED).toContain('state.status === "complete"');
    expect(GETTING_STARTED).toContain("habits.habits.length > 0");
    expect(GETTING_STARTED).toContain("nutrition.entries.length > 0");
  });

  it("all steps done renders nothing, and settling shows nothing", () => {
    expect(GETTING_STARTED).toContain("if (doneCount === steps.length) return null;");
    expect(GETTING_STARTED).toContain("if (habits.loading) return null;");
  });
});
