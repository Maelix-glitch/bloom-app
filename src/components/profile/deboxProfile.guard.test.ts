import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Profile de-box guards (M-179). Pinned against the M-179 block at the
 * end of profile.css:
 *
 *   1. The record-in-numbers tiles wear no box: no background, border,
 *      radius or shadow in the override.
 *   2. Strip cells separate by the shared hairline token.
 *   3. The hover state is a tonal wash only (a color-mix background,
 *      never a border colour change).
 */

const SRC = join(process.cwd(), "src");
const CSS = readFileSync(join(SRC, "styles/profile.css"), "utf8");

const marker = CSS.indexOf("De-box (M-179");
const BLOCK = marker >= 0 ? CSS.slice(marker) : "";

describe("profile de-box (M-179)", () => {
  it("the M-179 block exists at the cascade end", () => {
    expect(marker).toBeGreaterThan(0);
  });

  it("number tiles are open strip cells, not boxes", () => {
    const tile = BLOCK.match(/\.pf-number \{([^}]*)\}/);
    expect(tile).not.toBeNull();
    expect(tile![1]).toContain("background: transparent;");
    expect(tile![1]).toContain("border: none;");
    expect(tile![1]).toContain("box-shadow: none;");
  });

  it("cells separate by the shared hairline token", () => {
    expect(BLOCK).toContain("border-left: 1px solid var(--dbx-hairline);");
  });

  it("hover is a tonal wash, never a frame", () => {
    const hover = BLOCK.match(/a\.pf-number:hover,\s*button\.pf-number:hover \{([^}]*)\}/);
    expect(hover).not.toBeNull();
    expect(hover![1]).toContain("color-mix(in oklab, var(--pf-accent) 5%");
    expect(hover![1]).not.toContain("border-color");
    expect(hover![1]).not.toMatch(/border:\s/);
  });
});
