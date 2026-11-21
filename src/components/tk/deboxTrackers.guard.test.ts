import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Trackers de-box guards (M-176). The targets list and the badges list
 * were grids of bordered boxes — homogeneous rows wearing containers.
 * Pinned here, against the M-176 block at the end of trackers.css:
 *
 *   1. Both grids become a single flex column (rows, not boxes).
 *   2. Their items carry no background, border, radius or shadow.
 *   3. Adjacent items separate by the shared hairline token only.
 *   4. An earned badge is a tonal gold wash with NO border — the
 *      highlight is a shift, never a frame.
 *   5. The de-box block does not touch .at-territory: the territory
 *      cards are real tappable objects and keep their tonal card.
 */

const SRC = join(process.cwd(), "src");
const CSS = readFileSync(join(SRC, "styles/trackers.css"), "utf8");

const marker = CSS.indexOf("De-box (M-176");
const BLOCK = marker >= 0 ? CSS.slice(marker) : "";

describe("trackers de-box (M-176)", () => {
  it("the M-176 block exists at the cascade end", () => {
    expect(marker).toBeGreaterThan(0);
  });

  it("targets and badges render as one column of rows", () => {
    expect(BLOCK).toContain(".tk2-root .tk2-targets-grid,");
    expect(BLOCK).toContain("display: flex;");
    expect(BLOCK).toContain("flex-direction: column;");
  });

  it("row items wear no box: no background, border, radius or shadow", () => {
    const li = BLOCK.match(
      /\.tk2-root \.tk2-targets-grid li,\s*\.tk2-root \.tk2-badges-grid li \{([^}]*)\}/,
    );
    expect(li).not.toBeNull();
    expect(li![1]).toContain("background: none;");
    expect(li![1]).toContain("border: none;");
    expect(li![1]).toContain("border-radius: 0;");
    expect(li![1]).toContain("box-shadow: none;");
  });

  it("rows separate by the shared hairline token only", () => {
    expect(BLOCK).toContain("border-top: 1px solid var(--dbx-hairline);");
  });

  it("an earned badge is a tonal wash, never a frame", () => {
    const earned = BLOCK.match(
      /\.tk2-badges-grid li\[data-earned="true"\] \{([^}]*)\}/,
    );
    expect(earned).not.toBeNull();
    expect(earned![1]).toContain("color-mix(in oklab, var(--gold) 8%");
    expect(earned![1]).not.toMatch(/border\s*:/);
    expect(earned![1]).toContain("border-top: none;");
  });

  it("the territory cards are left as real-object cards", () => {
    expect(BLOCK).not.toContain(".at-territory {");
    expect(BLOCK).not.toContain(".at-territory,");
  });
});
