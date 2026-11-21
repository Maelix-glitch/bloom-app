import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Mood de-box COMPLETE guards (owner directive 2026-11-21):
 *
 *   1. Hero: the window artwork carries .mp-hero-art and mood.css masks
 *      it on every edge while .mp-hero drops the section's surface
 *      tone — zero hard rectangular image edges.
 *   2. mood-log and mood-journey are boxless: the cascade-end block in
 *      mood.css overrides their .mp-panel dress to transparent / no
 *      border / no shadow, and mood-log's inner wrappers lose their
 *      panel padding so heading and faces sit on the canvas.
 *   3. The featured insight ("A small insight", rendered inside
 *      MoodJourney) is an editorial callout: .mp-insight-callout with a
 *      2px gold left bar + a white ~2% tint, and its old photo box
 *      (border classes + flowerDetail image) is gone from the markup.
 *   4. The mood web (mood-graph, and its loading skeleton) renders
 *      openly: boxless with exactly one top hairline, and its canvas
 *      frame carries no border in MoodGraph.tsx.
 *   5. mood-insights and mood-distribution are unboxed the same way;
 *      mood-streak is the page's ONE kept .mp-panel (its candle-photo
 *      gradient is built from --surface), and the closing banner's
 *      border treatment is gone.
 *
 * The M-180 guard (deboxMood.guard.test.tsx) is NOT re-contracted: the
 * base .mp-panel rule in styles.css is untouched and still governs the
 * kept streak panel; these pins are strictly additive.
 */

const SRC = join(process.cwd(), "src");
const MOOD = readFileSync(join(SRC, "styles/mood.css"), "utf8");
const PAGE = readFileSync(join(SRC, "components/mood/page/MoodPage.tsx"), "utf8");
const GRAPH = readFileSync(join(SRC, "components/mood/page/MoodGraph.tsx"), "utf8");

const marker = MOOD.indexOf("De-box Complete");
const BLOCK = MOOD.slice(marker);

describe("mood de-box complete", () => {
  it("the de-box complete block exists at the cascade end of mood.css", () => {
    expect(marker).toBeGreaterThan(0);
    // Nothing after the block may re-box the sections.
    expect(BLOCK).not.toContain("backdrop-filter");
  });

  it("hero artwork is masked into the canvas and the section tone is gone", () => {
    expect(PAGE).toContain("mp-hero relative overflow-hidden");
    expect(PAGE).toContain("mp-hero-art mm-hero-img");
    expect(BLOCK).toContain(".mood-page .mp-hero {\n  background: transparent;");
    expect(BLOCK).toContain(".mood-page .mp-hero-art {");
    expect(BLOCK).toContain("mask-image:");
    expect(BLOCK).toContain("linear-gradient(to bottom, transparent 0, #000 14%, #000 86%, transparent 100%)");
    expect(BLOCK).toContain("linear-gradient(to right, transparent 0, #000 10%, #000 90%, transparent 100%)");
    expect(BLOCK).toContain("mask-composite: intersect;");
  });

  it("mood-log and mood-journey are boxless", () => {
    expect(BLOCK).toContain('section.mp-panel[data-testid="mood-log"]');
    expect(BLOCK).toContain('section.mp-panel[data-testid="mood-journey"]');
    const rule = BLOCK.match(
      /section\.mp-panel\[data-testid="mood-log"\][^}]*\{([^}]*)\}/,
    );
    expect(rule).not.toBeNull();
    expect(rule![1]).toContain("background: transparent;");
    expect(rule![1]).toContain("border: 0;");
    expect(rule![1]).toContain("box-shadow: none;");
    // The log panel's inner wrappers lose their panel padding too.
    expect(BLOCK).toContain('section.mp-panel[data-testid="mood-log"] > div:first-child {\n  padding: 0;');
  });

  it("the featured insight is a gold-bar callout, not a photo box", () => {
    expect(PAGE).toContain('className="mp-insight-callout relative mt-10"');
    expect(PAGE).not.toContain("flowerDetail");
    expect(BLOCK).toContain(".mood-page .mp-insight-callout {");
    expect(BLOCK).toContain("border-left: 2px solid var(--gold);");
    expect(BLOCK).toContain("background: rgb(255 255 255 / 0.02);");
  });

  it("the mood web is open on the canvas under one top hairline", () => {
    expect(BLOCK).toContain('section.mp-panel[data-testid="mood-graph"]');
    expect(BLOCK).toContain('section[aria-label="Loading mood web"]');
    expect(BLOCK).toContain("border-top: 1px solid var(--dbx-hairline);");
    // The web's canvas frame itself carries no border any more.
    expect(GRAPH).not.toContain("mg-canvas relative flex flex-col overflow-hidden rounded-2xl border");
    expect(GRAPH).not.toContain("min-h-[380px] flex-col overflow-hidden rounded-2xl border");
  });

  it("insights and distribution are unboxed; streak is the one kept panel", () => {
    expect(BLOCK).toContain('section.mp-panel[data-testid="mood-insights"]');
    expect(BLOCK).toContain('section.mp-panel[data-testid="mood-distribution"]');
    // Streak keeps its .mp-panel dress and gets NO boxless override.
    expect(PAGE).toContain('className="mp-panel relative overflow-hidden" data-testid="mood-streak"');
    expect(BLOCK).not.toContain('data-testid="mood-streak"]');
    // Distribution's bokeh note and the closing banner lost their borders.
    expect(PAGE).toContain('className="relative overflow-hidden rounded-2xl"');
    expect(PAGE).not.toContain("rounded-[calc(var(--radius)+0.25rem)] border border-border");
  });
});
