import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Feel-layer guards (Brief v6 Slice 3 — motion/interaction foundation).
 *
 * The §6 layout guards need real geometry and are verified live by the
 * parent; what CAN be pinned structurally is pinned here:
 *
 *   1. The feel tokens exist in the token layer (styles.css :root) with
 *      the brief's exact values — a token renamed or re-valued fails.
 *   2. `.feel-in` is an IO-gated rise (12px + fade on --dur-slow /
 *      --ease-out), settles on [data-visible="true"], is still on tab
 *      returns (the house bloom-navigated rule), and its stagger caps
 *      at 6 steps of 60ms.
 *   3. Reduced motion neutralises the new utilities in motion.css's
 *      own opt-out block (extended, never duplicated).
 *   4. The press token is referenced by the shared atoms (bm-press,
 *      home-chip, dock, nut-btn, bsheet) — press is one value app-wide.
 *   5. The global :focus-visible treatment (2px gold, offset 2px) is
 *      present — components keep their own rings, everything else
 *      inherits this one.
 *   6. The application pattern landed: FeelIn wraps the section shells
 *      of Today, Trackers and Nutrition — and is NOT stacked on Mood's
 *      mm-enter shells (recorded decision, bloom-v6-feel-log.md).
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const STYLES = read("styles.css");
const MOTION = read("styles/motion.css");
const NUTRITION_CSS = read("styles/nutrition.css");
const SHEET_CSS = read("styles/bloom-sheet.css");

/** The first flat rule block for a selector: `selector { … }`, any indent. */
function ruleBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`^\\s*${escaped} \\{([^}]*)\\}`, "m"));
  return m?.[1] ?? "";
}

describe("feel guards (v6 Slice 3)", () => {
  it("the feel tokens exist in styles.css with the brief's exact values", () => {
    expect(STYLES).toContain("--ease-out: cubic-bezier(0.22, 1, 0.36, 1);");
    expect(STYLES).toContain("--ease-spring: cubic-bezier(0.34, 1.4, 0.44, 1);");
    expect(STYLES).toContain("--press: scale(0.97);");
    expect(STYLES).toContain("--dur-fast: 150ms;");
    expect(STYLES).toContain("--dur-med: 300ms;");
    expect(STYLES).toContain("--dur-slow: 600ms;");
    expect(STYLES).toContain("--lift-shadow: 0 12px 32px rgb(0 0 0 / 0.28), 0 2px 8px rgb(0 0 0 / 0.22);");
  });

  it(".feel-in rises 12px and fades on the feel tokens, settling when visible", () => {
    const base = ruleBlock(MOTION, ".feel-in");
    expect(base).toContain("opacity: 0;");
    expect(base).toContain("transform: translateY(12px);");
    expect(base).toContain("var(--dur-slow)");
    expect(base).toContain("var(--ease-out)");
    const settled = ruleBlock(MOTION, '.feel-in[data-visible="true"]');
    expect(settled).toContain("opacity: 1;");
    expect(settled).toContain("transform: none;");
  });

  it(".feel-in is still on tab returns, like every house entrance", () => {
    const killed = ruleBlock(MOTION, "html.bloom-navigated .feel-in");
    expect(killed).toContain("opacity: 1;");
    expect(killed).toContain("transition: none;");
  });

  it("the stagger caps at six 60ms steps", () => {
    expect(MOTION).toContain(".feel-stagger > .feel-in:nth-child(2)");
    expect(MOTION).toContain("--feel-delay: 60ms;");
    expect(MOTION).toContain(".feel-stagger > .feel-in:nth-child(6)");
    expect(MOTION).toContain("--feel-delay: 300ms;");
    /* No seventh step: nothing in the stagger passes the 300ms cap. */
    expect(MOTION).not.toMatch(/--feel-delay: (3[3-9]\d|[4-9]\d\d)ms/);
  });

  it(".feel-lift lifts 1px onto the lift shadow, hover-capable devices only", () => {
    const hover = ruleBlock(MOTION, ".feel-lift:hover");
    expect(hover).toContain("transform: translateY(-1px);");
    expect(hover).toContain("box-shadow: var(--lift-shadow);");
    expect(MOTION).toContain("@media (hover: hover) and (prefers-reduced-motion: no-preference)");
  });

  it("reduced motion neutralises the feel utilities in motion.css's opt-out block", () => {
    const rm = MOTION.slice(MOTION.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(rm).toContain(".feel-in");
    expect(rm).toContain("opacity: 1;");
    expect(rm).toContain(".feel-lift");
    /* One opt-out block in the file — extended, never duplicated. */
    expect(MOTION.match(/@media \(prefers-reduced-motion: reduce\)/g)).toHaveLength(1);
  });

  it("the shared atoms press on the one press token", () => {
    expect(ruleBlock(MOTION, ".bm-press:active")).toContain("transform: var(--press);");
    expect(ruleBlock(STYLES, ".home-chip:active")).toContain("transform: var(--press);");
    expect(STYLES).toContain(".dock__top:active");
    expect(STYLES).toContain(".dock__log:active");
    expect(ruleBlock(NUTRITION_CSS, ".nut-btn:active")).toContain("transform: var(--press);");
    expect(SHEET_CSS).toContain("transform: var(--press);");
  });

  it("the gold primary lifts on hover in Nutrition, as its sheet sibling already does", () => {
    expect(ruleBlock(NUTRITION_CSS, ".nut-btn-gold:hover")).toContain("transform: translateY(-1px);");
    expect(ruleBlock(SHEET_CSS, ".bsheet-primary:hover:not(:disabled)")).toContain(
      "transform: translateY(-1px);",
    );
  });

  it("one global focus-visible treatment: 2px gold, offset 2px", () => {
    const focus = ruleBlock(STYLES, ":focus-visible");
    expect(focus).toContain("outline: 2px solid rgba(220, 192, 143, 0.7);");
    expect(focus).toContain("outline-offset: 2px;");
  });

  it("FeelIn exists on the house useInView and wraps Today, Trackers and Nutrition shells", () => {
    const feelInPath = join(SRC, "components/system/FeelIn.tsx");
    expect(existsSync(feelInPath)).toBe(true);
    const feelIn = readFileSync(feelInPath, "utf8");
    expect(feelIn).toContain("useInView");
    expect(feelIn).toContain("data-visible");
    expect(read("routes/index.tsx")).toContain("FeelIn");
    expect(read("components/tk/TrackersPage.tsx")).toContain("FeelIn");
    expect(read("components/nutrition/NutritionPage.tsx")).toContain("FeelIn");
  });

  it("Mood's mm-enter shells never stack feel-in (recorded decision)", () => {
    expect(read("components/mood/page/MoodPage.tsx")).not.toContain("FeelIn");
    expect(read("styles/mood.css")).toContain(".mm-enter");
  });
});
