import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * System-slice guards (2026-11-18, senior diagnosis slices A/B/D/N).
 *
 * The design-system layer only stays a layer if the patterns it
 * introduced cannot quietly regress:
 *
 *   1. ONE flat gold primary — the gradient-plus-glow button styles
 *      stay retired (the profile half is also pinned in ui.guard).
 *   2. The shared patterns exist in the token home: --measure, the
 *      split card, the kv row, and the .note (whose whole point is
 *      full-contrast 14px text — pinned, so a safety disclaimer can
 *      never shrink back to the dimmest line on its card).
 *   3. The source-chip rule: estimated chips are dashed.
 *   4. The Assessment card carries ONE eyebrow: its two sub-eyebrows
 *      stay deleted (they are sentence-case sans subheads now).
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const STYLES = read("styles.css");
const PROFILE_CSS = read("styles/profile.css");
const NUTRITION_CSS = read("styles/nutrition.css");
const ASSESSMENT_ENTRY = read("components/assessment/AssessmentEntry.tsx");

function blockFor(text: string, selector: string): string {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, " ");
  let prev = 0;
  for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
    const sel = clean.slice(prev, m.index).trim();
    prev = m.index + m[0].length;
    if (sel.endsWith(selector)) return m[1]!;
  }
  throw new Error(`selector not found: ${selector}`);
}

describe("system guard: one flat gold primary", () => {
  it("the nutrition gold button is flat — no gradient, no glow", () => {
    const gold = blockFor(NUTRITION_CSS, ".nut-btn-gold");
    expect(gold).toContain("background: var(--gold)");
    expect(gold).not.toContain("gold-gradient");
    expect(gold).not.toContain("box-shadow");
  });

  it("the profile primary stays flat too", () => {
    const primary = blockFor(PROFILE_CSS, ".pf-btn--primary");
    expect(primary).not.toContain("gold-gradient");
    expect(primary).not.toContain("box-shadow");
  });
});

describe("system guard: the shared patterns exist", () => {
  it("one measure token, at 62ch", () => {
    expect(STYLES).toContain("--measure: 62ch");
  });

  it("the split card and the kv row are defined once, in the token home", () => {
    expect(blockFor(STYLES, ".split-card")).toContain("grid-template-columns");
    expect(blockFor(STYLES, ".kv-row")).toContain("11rem");
    expect(blockFor(STYLES, ".kv-row--control")).toContain("var(--measure)");
  });

  it("the note is full-contrast body text, never a dim caption", () => {
    const note = blockFor(STYLES, ".note");
    expect(note).toContain("font-size: var(--text-callout)");
    expect(note).toContain("color: var(--foreground)");
    expect(note).toContain("background: var(--surface-2)");
  });
});

describe("system guard: source chips", () => {
  it("an estimated chip is dashed; measured stays solid", () => {
    const est = blockFor(NUTRITION_CSS, '.nut-badge[data-estimate="true"]');
    expect(est).toContain("border-style: dashed");
  });
});

describe("system guard: one eyebrow per card (Assessment)", () => {
  it("the sub-eyebrows stay deleted — subheads are sans h3s now", () => {
    expect(ASSESSMENT_ENTRY).not.toContain('pf-eyebrow">Since your assessment');
    expect(ASSESSMENT_ENTRY).not.toContain('pf-eyebrow">Previous assessments');
    expect(ASSESSMENT_ENTRY).toContain('pf-subhead">Since your assessment');
    expect(ASSESSMENT_ENTRY).toContain('pf-subhead">Previous assessments');
  });

  it("the Profile assessment card is a split card", () => {
    expect(ASSESSMENT_ENTRY).toContain("split-card-aside");
  });
});
