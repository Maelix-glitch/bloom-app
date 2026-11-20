/**
 * M-168 — the Trackers sheets polish pins (owner screenshots,
 * 2026-11-21: "not really clean and professional… a lot of
 * imperfection"). Structural pins only — geometry is live-verified —
 * for the defects that were pure CSS/source shape:
 *
 *   1. A target's figure hugs its content and its unit sits beside
 *      it: the grid input is ch-wide, never width:100% (which exiled
 *      the unit to the cell's far edge); the plan-set auto figure
 *      (water) is width:auto for the same reason.
 *   2. The human line's home is the cell's foot (margin-top: auto),
 *      so every cell in a row lands its reading on the same line.
 *   3. The log field carries no native number spinner, in any engine.
 *   4. The log sheet's close × sits fully inside the panel at the
 *      family's clearance (right-4 top-4), never straddling the edge
 *      at right-0 top-0; and its number field keeps its designed
 *      28px at desktop widths too (md:text-[28px] — the kit Input's
 *      md:text-sm otherwise shrank it to a stray-looking glyph in a
 *      60px field).
 *   5. The "What you track" chips share one height.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");

/** Innermost rule blocks of a stylesheet (as sheet.guard). */
function blocks(text: string): { selector: string; body: string }[] {
  const clean = stripComments(text);
  const out: { selector: string; body: string }[] = [];
  let prev = 0;
  for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
    out.push({ selector: clean.slice(prev, m.index).trim(), body: m[1]! });
    prev = m.index + m[0].length;
  }
  return out;
}

const CSS = read("styles/trackers.css");
const CSS_BLOCKS = blocks(CSS);
const blockWith = (needle: string) => CSS_BLOCKS.find((b) => b.selector.includes(needle));
const MODAL = read("components/tk/TrackerModal.tsx");

describe("M-168 — targets grid: figure and unit are one group", () => {
  it("the grid input is content-wide, never stretched", () => {
    const b = blockWith(".tk2-targets-grid input");
    expect(b).toBeTruthy();
    expect(b!.body).toContain("width: 5ch");
    expect(b!.body).not.toContain("width: 100%");
  });

  it("the plan-set auto figure is content-wide too", () => {
    const b = blockWith(".tk2-target-auto-value");
    expect(b).toBeTruthy();
    expect(b!.body).toContain("width: auto");
    expect(b!.body).not.toContain("width: 100%");
  });

  it("the human line is anchored at the cell's foot", () => {
    const b = blockWith(".tk2-target-human");
    expect(b).toBeTruthy();
    expect(b!.body).toContain("margin-top: auto");
  });

  it("the track chips share one height", () => {
    const b = CSS_BLOCKS.find(
      (x) => x.selector.trim().endsWith(".tk2-active-toggle") && x.body.includes("display"),
    );
    expect(b).toBeTruthy();
    expect(b!.body).toContain("min-height: 34px");
  });
});

describe("M-168 — the log sheet: no stray chrome", () => {
  it("the native number spinner is removed in every engine", () => {
    expect(CSS).toContain('tk2-log-panel input[type="number"]::-webkit-inner-spin-button');
    expect(CSS).toContain('tk2-log-panel input[type="number"]::-webkit-outer-spin-button');
    const b = CSS_BLOCKS.find(
      (x) =>
        x.selector.trim() === '.bsheet-panel.tk2-log-panel input[type="number"]' &&
        x.body.includes("appearance"),
    );
    expect(b).toBeTruthy();
    expect(b!.body).toContain("appearance: textfield");
  });

  it("the close × sits inside the panel at the family clearance", () => {
    expect(MODAL).toContain("bsheet-icon absolute right-4 top-4");
    expect(MODAL).not.toContain("bsheet-icon absolute right-0 top-0");
  });

  it("the number field keeps its designed size at desktop widths", () => {
    expect(MODAL).toContain("md:text-[28px]");
  });
});
