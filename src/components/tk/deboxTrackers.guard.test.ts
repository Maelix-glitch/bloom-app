import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Trackers de-box guards (M-176, M-184). The targets list and the badges
 * list were grids of bordered boxes — homogeneous rows wearing
 * containers. Pinned here, against the M-176 block in trackers.css:
 *
 *   1. Both grids become a single flex column (rows, not boxes).
 *   2. Their items carry no background, border, radius or shadow.
 *   3. Adjacent items separate by the shared hairline token only.
 *   4. An earned badge is a tonal gold wash with NO border — the
 *      highlight is a shift, never a frame.
 *   5. The de-box block does not touch .at-territory: the territory
 *      cards are real tappable objects and keep their tonal card.
 *
 * M-184 (below the M-176 pins) is the correction this file owed: the
 * M-176 pins held for the classes they named, but the Targets section
 * the page renders is not the form grid the block restyled — it is
 * .tk2-targets-display, which stayed a grid of bordered tiles live.
 * The M-184 pins name the ACTUAL classes, and pin the component side
 * too, so a guard can never again pass against a surface the page
 * does not render for the section it claims to cover.
 */

const SRC = join(process.cwd(), "src");
const CSS = readFileSync(join(SRC, "styles/trackers.css"), "utf8");
const TARGETS_TSX = readFileSync(join(SRC, "components/tk/Targets.tsx"), "utf8");

const marker = CSS.indexOf("De-box (M-176");
const marker184 = CSS.indexOf("De-box, second pass (M-184");
const BLOCK = marker >= 0 ? CSS.slice(marker, marker184 >= 0 ? marker184 : undefined) : "";
const BLOCK184 = marker184 >= 0 ? CSS.slice(marker184) : "";

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

/* ------------------------- M-184: the real surface ------------------------ */

describe("trackers de-box, second pass (M-184)", () => {
  it("the M-184 block exists, after the M-176 block", () => {
    expect(marker184).toBeGreaterThan(marker);
  });

  it("the page's Targets section really renders the display list this block styles", () => {
    /* The M-176 miss, pinned shut: the class the block de-boxes must be
       the class TargetsPanel puts on the page — not a namesake elsewhere. */
    expect(TARGETS_TSX).toContain('className="tk2-targets-display"');
    expect(BLOCK184).toContain(".tk2-root .tk2-targets-display");
    /* The block styles the display list, not the sheet's form grid. */
    expect(BLOCK184).not.toContain("targets-grid");
  });

  it("the display list is one column of open rows, not a tile grid", () => {
    const ul = BLOCK184.match(/\.tk2-root \.tk2-targets-display \{([^}]*)\}/);
    expect(ul).not.toBeNull();
    expect(ul![1]).toContain("display: flex;");
    expect(ul![1]).toContain("flex-direction: column;");
  });

  it("display rows wear no box: no background, border, radius or shadow", () => {
    const li = BLOCK184.match(/\.tk2-root \.tk2-targets-display li \{([^}]*)\}/);
    expect(li).not.toBeNull();
    expect(li![1]).toContain("background: none;");
    expect(li![1]).toContain("border: none;");
    expect(li![1]).toContain("border-radius: 0;");
    expect(li![1]).toContain("box-shadow: none;");
  });

  it("display rows separate by the shared hairline token only", () => {
    const sep = BLOCK184.match(/\.tk2-root \.tk2-targets-display li \+ li \{([^}]*)\}/);
    expect(sep).not.toBeNull();
    expect(sep![1]).toContain("border-top: 1px solid var(--dbx-hairline);");
  });

  it("the territory cards stay objects, but lose the frame", () => {
    const card = BLOCK184.match(/\.tk2-root \.at-territory \{([^}]*)\}/);
    expect(card).not.toBeNull();
    expect(card![1]).toContain("border: none;");
    /* RE-CONTRACTED by M-194 (disclosed): M-184's "stay objects" clause
       pinned the specular catch (box-shadow: var(--dbx-specular)).
       M-190/M-193 superseded that design — the territories are open
       canvas, no catch — and the catch's declaration is now removed at
       this source too, so the pin flips to the stricter outcome: no
       shadow of any kind in this block. The background clause below is
       unchanged (this block still may not strip the surface step; the
       final open state is owned by the later territory block and the
       cascade-truth guard). */
    expect(card![1]).toContain("box-shadow: none;");
    expect(card![1]).not.toContain("var(--dbx-specular)");
    /* Still an object: the tonal surface step is NOT stripped — only
       the border and the shadow box go. */
    expect(card![1]).not.toContain("background: none");
  });
});
