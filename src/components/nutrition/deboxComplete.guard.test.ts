import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nutrition de-box COMPLETE guards (day view) — presentation only; the
 * engine, plan data and every number are pinned elsewhere and are
 * untouched. Pinned here, against the De-box COMPLETE block at the
 * cascade end of nutrition.css and the markup classes it targets (the
 * M-176 lesson: a rule for a class the page never renders is not a
 * de-box, so every targeted class is also pinned in its tsx):
 *
 *   1. Date strip: day cells carry no border; the selected day is a
 *      soft pill (pill radius, transparent border, warm gold fill).
 *   2. Hero (.nut-card-gold): fully open on the canvas (M-193 — the
 *      M-187 tonal zone still read as a panel live): no fill, no
 *      border, no radius, no shadow, 32px padding kept; inside it the
 *      footer hairline is the shared faint hairline and the
 *      eating-window chip is borderless footer typography, so the
 *      provenance ledger + estimates note are not nested sub-boxes.
 *   3. Meal slots (.nut-meal-slot): an open list on the canvas — no
 *      background, no enclosing border, no radius, only the shared
 *      1px bottom hairline and 20px vertical padding; the add button
 *      is borderless-minimal.
 *   4. Right column (.nut-week / .nut-spectrum): unboxed — no
 *      background, border, radius or padding; nutrient rows are
 *      separated by the shared hairline.
 */

const SRC = join(process.cwd(), "src");
const CSS = readFileSync(join(SRC, "styles/nutrition.css"), "utf8");
const TIMELINE = readFileSync(join(SRC, "components/nutrition/NutritionTimeline.tsx"), "utf8");
const PANELS = readFileSync(join(SRC, "components/nutrition/NutritionPanels.tsx"), "utf8");

const marker = CSS.indexOf("De-box COMPLETE");
const BLOCK = marker >= 0 ? CSS.slice(marker) : "";

function rule(selector: RegExp): string {
  const m = BLOCK.match(selector);
  expect(m, `rule ${selector} exists in the De-box COMPLETE block`).not.toBeNull();
  return m![1]!;
}

describe("nutrition de-box complete (day view)", () => {
  it("the block sits at the cascade end, after the M-177 block", () => {
    expect(marker).toBeGreaterThan(0);
    expect(marker).toBeGreaterThan(CSS.indexOf("De-box (M-177"));
  });

  it("date strip: unselected days carry no border, the cell is a pill", () => {
    const cell = rule(/\.nut-daycell \{([^}]*)\}/);
    expect(cell).toContain("border-color: transparent;");
    expect(cell).toContain("border-radius: var(--radius-pill);");
  });

  it("date strip: the selected day is a soft warm pill, never an outlined box", () => {
    const selected = rule(/\.nut-daycell\[data-selected\] \{([^}]*)\}/);
    expect(selected).toContain("border-color: transparent;");
    expect(selected).toContain("background: color-mix(in oklab, var(--gold)");
    expect(selected).not.toContain("border: 1px solid");
  });

  it("hero: fully open on the canvas (M-193: no fill, no radius, no shadow; padding kept)", () => {
    /* M-187's borderless tonal zone still read as one large rounded
       panel live (post-deploy sweep, 2026-11-21). M-193 opens the
       Day totals hero fully — this pin replaces the zone pin at
       greater strictness: no background presence may remain. */
    const hero = rule(/\.nut-card\.nut-card-gold \{([^}]*)\}/);
    expect(hero).toContain("background: transparent;");
    expect(hero).toContain("background-image: none;");
    expect(hero).toContain("border: none;");
    expect(hero).toContain("border-radius: 0;");
    expect(hero).toContain("box-shadow: none;");
    expect(hero).toContain("padding: var(--space-8);");
    expect(hero).not.toContain("var(--dbx-specular)");
  });

  it("hero: the footer hairline is the shared faint hairline", () => {
    const hairline = rule(/\.nut-card-gold \.nut-hairline \{([^}]*)\}/);
    expect(hairline).toContain("background: var(--dbx-hairline);");
  });

  it("hero: no nested sub-box — the eating-window chip is footer typography", () => {
    const chip = rule(/\.nut-card-gold \.nut-chip \{([^}]*)\}/);
    expect(chip).toContain("background: transparent;");
    expect(chip).toContain("border-color: transparent;");
  });

  it("meal slots: the class is rendered by the timeline, one section per meal", () => {
    expect(TIMELINE).toContain("nut-meal-slot");
    expect(TIMELINE).toContain("nut-meal-add");
    expect(TIMELINE).toContain("nut-meal-list");
  });

  it("meal slots: an open list — bottom hairline only, deep vertical air", () => {
    const slot = rule(/\.nut-card\.nut-meal-slot \{([^}]*)\}/);
    expect(slot).toContain("background: transparent;");
    expect(slot).toContain("border: none;");
    expect(slot).toContain("border-bottom: 1px solid var(--dbx-hairline);");
    expect(slot).toContain("border-radius: 0;");
    expect(slot).toContain("box-shadow: none;");
    /* M-195 re-contract (disclosed): the decongestion pass loosened the
       meal rows one step (var(--space-5) → var(--space-6)); the pin
       keeps naming the exact step so the air can't silently shrink. */
    expect(slot).toContain("padding: var(--space-6) 0;");
  });

  it("meal slots: the add button is borderless-minimal", () => {
    const add = rule(/\.nut-meal-slot \.nut-meal-add \{([^}]*)\}/);
    expect(add).toContain("border-color: transparent;");
    expect(add).toContain("background: transparent;");
  });

  it("right column: both panels are rendered with their de-box classes", () => {
    expect(PANELS).toContain("nut-week");
    expect(PANELS).toContain("nut-spectrum");
    expect(PANELS).toContain("nut-spectrum-row");
  });

  it("right column: unboxed — chart and spectrum sit directly on the canvas", () => {
    const panels = rule(/\.nut-card\.nut-week,\s*\.nut-card\.nut-spectrum \{([^}]*)\}/);
    expect(panels).toContain("background: transparent;");
    expect(panels).toContain("border: none;");
    expect(panels).toContain("border-radius: 0;");
    expect(panels).toContain("box-shadow: none;");
    expect(panels).toContain("padding: 0;");
  });

  it("right column: nutrient rows are separated by the shared hairline", () => {
    const row = rule(/\.nut-spectrum-row \{([^}]*)\}/);
    expect(row).toContain("border-bottom: 1px solid var(--dbx-hairline);");
  });
});
