/**
 * M-258 — the phone date strip fits, and the points pill sits top-left.
 *
 * (1) The strip's floor widths (7 cells at min-width 44px + two 44px
 * steppers + gaps = 448px) exceeded a phone's ~344px content width, so
 * the last days ran off the right edge (owner screenshot, 2026-11-27).
 * The fix is a small-screen block at the END of nutrition.css: cells
 * give up the width floor and share the row; steppers and cell height
 * are untouched.
 * (2) HomeMobileBar: the points pill is its own left cluster
 * (justify-between); bell, settings and profile stay right.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(new URL("../../styles/nutrition.css", import.meta.url), "utf8");
const BAR = readFileSync(new URL("../home/HomeSidebar.tsx", import.meta.url), "utf8");

describe("M-258 date strip fit", () => {
  const block = CSS.slice(CSS.indexOf("M-258 — the date strip fits"));

  it("the small-screen block exists at the cascade end", () => {
    expect(CSS.indexOf("M-258 — the date strip fits")).toBeGreaterThan(
      CSS.indexOf(".nut-daycell {"),
    );
    expect(block).toContain("@media (max-width: 30rem)");
  });

  it("day cells give up the 44px width floor on small screens", () => {
    expect(block).toMatch(/\.nut-daycell \{[^}]*min-width: 0;/);
  });

  it("the day ring steps down so neighbouring rings never touch", () => {
    expect(block).toMatch(/\.nut-daycell svg \{[^}]*width: 30px;/);
  });

  it("the base rules keep their desktop floors (fix is phone-scoped)", () => {
    const base = CSS.slice(CSS.indexOf(".nut-daycell {"), CSS.indexOf(".nut-daycell {") + 200);
    expect(base).toContain("min-width: 44px;");
  });
});

describe("M-258 points pill placement", () => {
  it("the phone bar spreads its clusters apart", () => {
    expect(BAR).toContain("justify-between");
  });

  it("the points chip renders before the bell (left cluster first)", () => {
    const bar = BAR.slice(BAR.indexOf("export function HomeMobileBar"));
    expect(bar.indexOf("<PointsChip compact />")).toBeLessThan(
      bar.indexOf("<NotificationBell />"),
    );
  });
});
