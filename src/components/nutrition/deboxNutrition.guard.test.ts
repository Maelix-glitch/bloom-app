import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nutrition de-box guards (M-177) — presentation only; the plan's data
 * pins live in the plan* guards and are untouched. Pinned here, against
 * the M-177 block at the end of nutrition.css:
 *
 *   1. .nut-card's override shadow is the specular inset ONLY — the
 *      0 24px drop shadow never returns to an in-flow surface.
 *   2. The meal head's rule is the shared hairline token (white 6%),
 *      not --border-strong (white 12%).
 *   3. A dish card inside a .nut-card wears no frame: transparent
 *      background and border, hover a tonal lift only.
 */

const SRC = join(process.cwd(), "src");
const CSS = readFileSync(join(SRC, "styles/nutrition.css"), "utf8");

const marker = CSS.indexOf("De-box (M-177");
const BLOCK = marker >= 0 ? CSS.slice(marker) : "";

describe("nutrition de-box (M-177)", () => {
  it("the M-177 block exists at the cascade end", () => {
    expect(marker).toBeGreaterThan(0);
  });

  it(".nut-card depth is specular only — no drop shadow", () => {
    const card = BLOCK.match(/\.nut-card \{([^}]*)\}/);
    expect(card).not.toBeNull();
    expect(card![1]).toContain("box-shadow: inset 0 1px 0");
    expect(card![1]).not.toContain("24px");
  });

  it("the meal head rule is the shared hairline", () => {
    const head = BLOCK.match(/\.nut-meal-head \{([^}]*)\}/);
    expect(head).not.toBeNull();
    expect(head![1]).toContain("border-bottom: 1px solid var(--dbx-hairline);");
  });

  it("dish cards inside a section wear no frame", () => {
    const dish = BLOCK.match(/\.nut-card \.nut-dish-card \{([^}]*)\}/);
    expect(dish).not.toBeNull();
    expect(dish![1]).toContain("background: transparent;");
    expect(dish![1]).toContain("border-color: transparent;");
  });
});
