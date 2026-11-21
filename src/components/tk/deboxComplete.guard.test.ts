import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Trackers de-box COMPLETE guards (M-190; owner directive 2026-11-21).
 *
 * M-184 took the frame off the six territory cards; the complete
 * programme finishes the Trackers page: the six rigid cards become
 * soft borderless surface zones, the flower stands frameless on the
 * open canvas, and the record table's card opens up.
 *
 * The M-176 lesson is the whole point of this file: every pin names a
 * class TrackersPage.tsx (or the component it renders) ACTUALLY puts
 * on the page, and the component side is pinned alongside the CSS, so
 * the guard can never pass against a surface the page does not render.
 *
 *   · The six trackers render as <li class="at-territory"> inside
 *     <ul class="at-territories"> — title .at-place, status .at-coord,
 *     progress .at-contour + .at-territory-foot, quick-increment pills
 *     in .at-territory-actions. NOT .trk tiles (§4.3 was never built
 *     here) and NOT the atlas route/contrasts rows (already open).
 *   · The flower is <figure class="at-flower"> (TrackerFlower) inside
 *     .at-flower-col inside the .at-board section.
 *   · The record table is HistoryTable's <Card> → .ci-card.
 */

const SRC = join(process.cwd(), "src");
const CSS = readFileSync(join(SRC, "styles/trackers.css"), "utf8");
const PAGE = readFileSync(join(SRC, "components/tk/TrackersPage.tsx"), "utf8");
const FLOWER = readFileSync(join(SRC, "components/tk/TrackerFlower.tsx"), "utf8");
const HISTORY = readFileSync(join(SRC, "components/tk/HistoryTable.tsx"), "utf8");

const marker = CSS.indexOf("De-box COMPLETE — Trackers (M-190");
const BLOCK = marker >= 0 ? CSS.slice(marker) : "";

const rule = (selector: RegExp) => BLOCK.match(selector);

describe("trackers de-box complete (M-190) — the six trackers", () => {
  it("the M-190 block exists at the cascade end, after M-184", () => {
    expect(marker).toBeGreaterThan(CSS.indexOf("De-box, second pass (M-184"));
  });

  it("the page really renders the classes this block styles", () => {
    /* The M-176 miss, pinned shut on the component side: the zone, its
       parts and the board must be the page's own markup. */
    expect(PAGE).toContain('className="at-territories"');
    expect(PAGE).toContain('className="at-territory"');
    expect(PAGE).toContain('className="at-place"');
    expect(PAGE).toContain('className="at-coord"');
    expect(PAGE).toContain('className="at-territory-actions"');
    expect(PAGE).toContain('className="at-territory-foot"');
    expect(PAGE).toContain('className="at-board"');
    expect(PAGE).toContain('className="at-flower-col"');
    /* …and the block styles those classes, not a namesake elsewhere. */
    expect(BLOCK).toContain(".tk2-root .at-territory");
    expect(BLOCK).toContain(".tk2-root .at-territories");
  });

  it("each territory is a soft borderless zone: tonal step, 20px radius, specular only", () => {
    const zone = rule(/\.tk2-root \.at-territory \{([^}]*)\}/);
    expect(zone).not.toBeNull();
    expect(zone![1]).toContain("background: var(--surface);");
    expect(zone![1]).toContain("border: none;");
    /* the spec's 20px, as the house token: --radius-xl = --radius + 4px */
    expect(zone![1]).toContain("border-radius: var(--radius-xl);");
    expect(zone![1]).toContain("box-shadow: var(--dbx-specular);");
    /* No shadow box: the ONLY box-shadow declaration in the zone is
       the specular catch token — never a literal offset/blur shadow. */
    const shadows = [...zone![1].matchAll(/box-shadow:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(shadows).toEqual(["var(--dbx-specular)"]);
  });

  it("hover is a tonal step, never a frame or a lift", () => {
    const hover = rule(/\.tk2-root \.at-territory:hover \{([^}]*)\}/);
    expect(hover).not.toBeNull();
    expect(hover![1]).toContain("background: var(--surface-2);");
    expect(hover![1]).toContain("border: none;");
    expect(hover![1]).toContain("transform: none;");
    expect(hover![1]).not.toContain("border-color");
  });

  it("the zones keep the board's 2-column rhythm (gap only — the grid itself is the base rule)", () => {
    const list = rule(/\.tk2-root \.at-territories \{([^}]*)\}/);
    expect(list).not.toBeNull();
    expect(list![1]).toContain("gap:");
    expect(list![1]).not.toContain("border");
    expect(list![1]).not.toContain("background");
  });
});

describe("trackers de-box complete (M-190) — the flower, frameless", () => {
  it("TrackerFlower renders the figure this block keeps frameless", () => {
    expect(FLOWER).toContain('className="at-flower"');
    expect(FLOWER).toContain('data-testid="tracker-flower"');
    expect(BLOCK).toContain(".tk2-root .at-flower");
  });

  it("no enclosing frame: board, column and figure wear no surface, border or shadow", () => {
    const frame = rule(
      /\.tk2-root \.at-board,\s*\.tk2-root \.at-flower-col,\s*\.tk2-root \.at-flower \{([^}]*)\}/,
    );
    expect(frame).not.toBeNull();
    expect(frame![1]).toContain("background: none;");
    expect(frame![1]).toContain("border: none;");
    expect(frame![1]).toContain("border-radius: 0;");
    expect(frame![1]).toContain("box-shadow: none;");
  });

  it("the viz itself is untouched: the block never styles petals, heart or count", () => {
    expect(BLOCK).not.toContain(".at-petal");
    expect(BLOCK).not.toContain(".at-flower-heart");
    expect(BLOCK).not.toContain(".at-flower-seed");
    expect(BLOCK).not.toContain(".at-flower-count");
    expect(BLOCK).not.toContain(".at-flower svg");
  });
});

describe("trackers de-box complete (M-190) — the record card opens up", () => {
  it("HistoryTable really renders the .ci-card this block opens", () => {
    expect(HISTORY).toContain("<Card>");
    expect(HISTORY).toContain('from "@/components/ci/primitives"');
    expect(BLOCK).toContain(".tk2-root .ci-card");
  });

  it("the card wears no surface, border, radius or shadow on this page", () => {
    const card = rule(/\.tk2-root \.ci-card \{([^}]*)\}/);
    expect(card).not.toBeNull();
    expect(card![1]).toContain("background: none;");
    expect(card![1]).toContain("border: none;");
    expect(card![1]).toContain("border-radius: 0;");
    expect(card![1]).toContain("box-shadow: none;");
  });

  it("the card's top-highlight strip goes with the frame", () => {
    const strip = rule(/\.tk2-root \.ci-card::before \{([^}]*)\}/);
    expect(strip).not.toBeNull();
    expect(strip![1]).toContain("content: none;");
  });
});

describe("trackers de-box complete (M-190) — sheets stay opaque and untouched", () => {
  it("the block names no sheet, modal or backdrop class", () => {
    expect(BLOCK).not.toContain("bsheet");
    expect(BLOCK).not.toContain("tk2-log");
    expect(BLOCK).not.toContain("tk2-targets-sheet");
    expect(BLOCK).not.toContain("backdrop");
  });
});
