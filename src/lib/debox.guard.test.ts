import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * De-box foundation guards (M-175) — the surface system every de-boxed
 * page builds on (~/workspace/bloom-debox-spec.md). Pinned here:
 *
 *   1. styles.css imports debox.css exactly once.
 *   2. The shared tokens carry the spec's exact values: the hairline at
 *      white 6%, the specular catch as an inset top highlight.
 *   3. .dbx-surface is a hero: radius inside the 24–28px band, rim via
 *      --border-subtle (white 5%), depth from the specular token.
 *   4. .dbx-module wears NO border — a bordered module inside a surface
 *      is the box-in-a-box the programme removes.
 *   5. .dbx-strip is truly borderless: no background, border or shadow
 *      in its block; its cells separate by the hairline token and are
 *      tabular-nums.
 *   6. No white-alpha value anywhere in debox.css exceeds the 8% cap.
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const STYLES = read("styles.css");
const DEBOX = read("styles/debox.css");

/** The first flat rule block for a selector: `selector { … }`. */
function ruleBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`rule block not found: ${selector}`);
  return m[1];
}

describe("de-box foundation (M-175)", () => {
  it("styles.css imports the de-box system exactly once", () => {
    const hits = STYLES.match(/@import "\.\/styles\/debox\.css";/g) ?? [];
    expect(hits.length).toBe(1);
  });

  it("the shared tokens carry the spec's values", () => {
    expect(DEBOX).toContain("--dbx-hairline: rgb(255 255 255 / 0.06);");
    expect(DEBOX).toContain(
      "--dbx-specular: inset 0 1px 0 rgb(255 255 255 / 0.06);",
    );
    expect(DEBOX).toContain("--dbx-tone: rgb(255 255 255 / 0.03);");
  });

  it(".dbx-surface is a hero: 24–28px radius, capped rim, specular depth", () => {
    const block = ruleBlock(DEBOX, ".dbx-surface");
    const radius = block.match(/border-radius:\s*(\d+)px/);
    expect(radius).not.toBeNull();
    const px = Number(radius![1]);
    expect(px).toBeGreaterThanOrEqual(24);
    expect(px).toBeLessThanOrEqual(28);
    expect(block).toContain("border: 1px solid var(--border-subtle);");
    expect(block).toContain("box-shadow: var(--dbx-specular);");
  });

  it(".dbx-module wears no border (no box-in-a-box)", () => {
    const block = ruleBlock(DEBOX, ".dbx-module");
    expect(block).not.toMatch(/border\s*:/);
    expect(block).toContain("border-radius: 16px;");
    expect(block).toContain("background-color: var(--dbx-tone);");
  });

  it(".dbx-strip is borderless; cells split by hairline and count tabular", () => {
    const strip = ruleBlock(DEBOX, ".dbx-strip");
    expect(strip).not.toMatch(/background|border|box-shadow/);
    const cell = ruleBlock(DEBOX, ".dbx-cell");
    expect(cell).toContain("font-variant-numeric: tabular-nums;");
    const sibling = ruleBlock(DEBOX, ".dbx-cell + .dbx-cell");
    expect(sibling).toContain("border-left: 1px solid var(--dbx-hairline);");
  });

  it("no white-alpha in debox.css exceeds the 8% cap", () => {
    const alphas = [...DEBOX.matchAll(/rgb\(255 255 255 \/ (0\.\d+)\)/g)].map(
      (m) => Number(m[1]),
    );
    expect(alphas.length).toBeGreaterThan(0);
    for (const a of alphas) expect(a).toBeLessThanOrEqual(0.08);
  });
});
