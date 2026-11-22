import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * M-207 — the post-deploy live-sweep fixes, pinned at the source.
 *
 * Item 3 (sticky nav overlap): on Nutrition the anchored sections are
 * the `.nut-jump` wrappers (Plan / Grocery / Condition modes /
 * Programmes / Dishes). Below lg the phone brand bar (60px) stacks on
 * top of the sticky sub-nav (~60px single row, ~112px wrapped), so the
 * base 80px scroll margin left a jumped-to heading — "Cook it, then
 * log it" — under the stuck nav. The margins below grow with the band:
 * 136px below lg (120px band + air), 188px at phone widths where the
 * nav wraps (172px band + air). The base rule and the lg reading stay
 * exactly as they were (the section-system pins read the base rule).
 */

const css = readFileSync(join(process.cwd(), "src/styles/nutrition.css"), "utf8");

function mediaBlock(query: string): string {
  const at = css.indexOf(`@media ${query}`);
  expect(at, `@media ${query} exists in nutrition.css`).toBeGreaterThanOrEqual(0);
  return css.slice(at, at + 400);
}

describe("M-207 — Nutrition anchor scroll margins clear the sticky band", () => {
  it("keeps the base .nut-jump margin at 80px (the lg reading)", () => {
    const base = css.match(/\.nut-jump\s*\{([^}]*)\}/);
    expect(base?.[1]).toContain("scroll-margin-top: 80px");
  });

  it("grows the margin below lg, where the brand bar stacks over the nav", () => {
    const block = mediaBlock("(max-width: 64rem)");
    expect(block).toMatch(/\.nut-jump\s*\{\s*scroll-margin-top:\s*136px/);
  });

  it("grows it again at phone widths, where the sub-nav wraps to two rows", () => {
    const block = mediaBlock("(max-width: 40rem)");
    expect(block).toMatch(/\.nut-jump\s*\{\s*scroll-margin-top:\s*188px/);
  });

  it("pins the day divider the resumed Coach thread renders (F-13)", () => {
    const coachCss = readFileSync(join(process.cwd(), "src/styles/coach.css"), "utf8");
    expect(coachCss).toContain(".coach-day-divider");
    const thread = readFileSync(
      join(process.cwd(), "src/components/coach/CoachThread.tsx"),
      "utf8",
    );
    expect(thread).toContain("coach-day-divider");
    expect(thread).toContain("localDayKey");
  });
});
