/**
 * Glass picks guards (M-221) — the owner's glass programme, 2026-11-23.
 *
 * The owner picked his areas from the 14-area before/after preview:
 * GLASS — Today, VITALIS Overview, Nutrition day plan, Grocery,
 * Trackers, Coach chat, Stories, Sidebar + TopBar, Dock + orb
 * (deepened), Welcome gate (deepened). SOLID — Profile, Rewards,
 * Assessment sheet, and every billing surface (M-220's territory).
 *
 * The pins:
 *   1. the material extensions in glass.css carry their exact values
 *      (the deep blur/rim, the palette washes with their opacity
 *      ceilings — a wash may never deepen past its pinned stops);
 *   2. every picked area's winning block consumes the ONE material;
 *   3. READABILITY FLOOR: every text-bearing glass surface declares
 *      its plain fallback background (var(--lg-fallback) /
 *      var(--lg-fallback-strong)) BEFORE its color-mix tint line —
 *      so even with no backdrop-filter support the text sits on a
 *      ≥52% ink coat, never on live page content bleeding through;
 *      and no text surface rides on a wash alone;
 *   4. the keep-solid sheets carry no glass tokens at all;
 *   5. glass never stacks: no treated surface is a descendant of
 *      another, and the two surfaces that live INSIDE the glass rail
 *      (the points card, the active pill) take a tint step with no
 *      backdrop blur of their own.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const GLASS = read("styles/glass.css");
const STYLES = read("styles.css");
const ORB = read("styles/orb.css");
const NUTRITION = read("styles/nutrition.css");
const TRACKERS = read("styles/trackers.css");
const COACH = read("styles/coach.css");
const STORIES = read("styles/stories.css");
const INVITE = read("styles/invite.css");

function blocks(text: string): { selector: string; body: string }[] {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, " ");
  const out: { selector: string; body: string }[] = [];
  let prev = 0;
  for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
    out.push({ selector: clean.slice(prev, m.index).trim(), body: m[1]! });
    prev = m.index + m[0].length;
  }
  return out;
}

const exactBlocks = (text: string, selector: string) =>
  blocks(text).filter((b) => b.selector.trim().endsWith(selector));
const lastBlock = (text: string, selector: string) => {
  const all = exactBlocks(text, selector);
  return all[all.length - 1];
};
/** A block for the selector that carries the needle (the material block). */
const materialBlock = (text: string, selector: string, needle: string) =>
  exactBlocks(text, selector).find((b) => b.body.includes(needle));

describe("glass picks (M-221): the material extensions", () => {
  it("the deep material carries its exact values", () => {
    expect(GLASS).toContain("--lg-blur-deep: blur(24px) saturate(190%)");
    expect(GLASS).toContain("--lg-rim-deep:");
    expect(GLASS).toContain("rgba(255, 255, 255, 0.7)");
  });

  it("the palette washes keep their opacity ceilings", () => {
    /* The washes are decorative tint layers; their first stops are
       the ceilings (gold 20%, sage 18%, rose 17%) — pinned so a wash
       can never quietly become a fill. */
    expect(GLASS).toContain("rgba(220, 192, 143, 0.2)");
    expect(GLASS).toContain("rgba(143, 199, 162, 0.18)");
    expect(GLASS).toContain("rgba(227, 145, 159, 0.17)");
    expect(GLASS).toContain("--lg-wash-gold:");
    expect(GLASS).toContain("--lg-wash-sage:");
    expect(GLASS).toContain("--lg-wash-rose:");
  });
});

describe("glass picks (M-221): every picked area consumes the one material", () => {
  it("Today: panels, bands, growth and the overview wear the material", () => {
    expect(materialBlock(STYLES, ".home-panel", "var(--lg-tint-strong)")).toBeDefined();
    expect(materialBlock(STYLES, ".home-band", "var(--lg-tint-strong)")).toBeDefined();
    expect(materialBlock(STYLES, ".home-page .home-growth", "var(--lg-tint-strong)")).toBeDefined();
    expect(materialBlock(STYLES, ".home-page .home-open", "var(--lg-tint-strong)")).toBeDefined();
  });

  it("Sidebar + TopBar: the rail, the sync pill — and no border returns", () => {
    const rail = lastBlock(STYLES, ".app-sidebar")!;
    expect(rail.body).toContain("background-color: var(--lg-tint-strong)");
    expect(rail.body).toContain("backdrop-filter: var(--lg-blur)");
    expect(rail.body).toContain("border-right: none");
    expect(materialBlock(STYLES, ".home-sync-pill", "var(--lg-blur)")).toBeDefined();
  });

  it("inside the rail: tint steps only — the points card and active pill carry no blur of their own", () => {
    const card = lastBlock(STYLES, ".rail-points-card")!;
    expect(card.body).toContain("background-color: var(--lg-tint)");
    expect(card.body).not.toContain("backdrop-filter");
    const pill = lastBlock(STYLES, ".app-nav-link-active")!;
    expect(pill.body).toContain("background-color: var(--lg-tint)");
    expect(pill.body).not.toContain("backdrop-filter");
  });

  it("Dock + orb: deepened to the deep material, the orb on its pedestal", () => {
    expect(materialBlock(STYLES, ".dock__top", "var(--lg-blur-deep)")).toBeDefined();
    expect(materialBlock(STYLES, ".dock__log", "var(--lg-blur-deep)")).toBeDefined();
    expect(materialBlock(STYLES, ".dock__top", "var(--lg-rim-deep)")).toBeDefined();
    expect(materialBlock(ORB, ".coach-orb", "var(--lg-blur-deep)")).toBeDefined();
    expect(materialBlock(ORB, ".coach-orb::before", "var(--lg-blur-deep)")).toBeDefined();
  });

  it("Nutrition: the day card, the Twin tiles, the grocery plate and sticky bar", () => {
    expect(lastBlock(NUTRITION, ".nut-day-card")!.body).toContain("var(--lg-tint-strong)");
    expect(lastBlock(NUTRITION, ".tile")!.body).toContain("var(--lg-tint-strong)");
    expect(lastBlock(NUTRITION, ".shop-progress")!.body).toContain("var(--lg-tint-strong)");
    expect(lastBlock(NUTRITION, ".shop-sticky")!.body).toContain("var(--lg-tint-strong)");
    expect(lastBlock(NUTRITION, ".shop-row.is-bought")!.body).toContain("var(--lg-wash-sage)");
  });

  it("Trackers: the territories are glass panes on the owner's hairline", () => {
    const t = lastBlock(TRACKERS, ".tk2-root .at-territory")!;
    expect(t.body).toContain("background-color: var(--lg-tint-strong)");
    expect(t.body).toContain("backdrop-filter: var(--lg-blur)");
    expect(t.body).toContain("border: 1px solid var(--border)");
    expect(t.body).toContain("border-radius: var(--radius-xl)");
  });

  it("Coach: gold user bubbles, clear Bloom bubbles", () => {
    const user = lastBlock(COACH, ".coach-user-bubble")!;
    expect(user.body).toContain("background-image: var(--lg-wash-gold)");
    expect(user.body).toContain("backdrop-filter: var(--lg-blur)");
    const bloom = lastBlock(COACH, ".coach-msg-copy")!;
    expect(bloom.body).toContain("background-color: var(--lg-tint)");
    expect(bloom.body).toContain("backdrop-filter: var(--lg-blur)");
  });

  it("Stories: the template frames carry the rim and the sheen", () => {
    const thumb = lastBlock(STORIES, ".stpl-thumb")!;
    expect(thumb.body).toContain("border-color: var(--lg-border)");
    expect(thumb.body).toContain("var(--lg-rim-soft)");
    expect(materialBlock(STORIES, ".stpl-thumb::after", "var(--lg-sheen)")).toBeDefined();
  });

  it("Welcome gate: the field and the quiet actions deepen", () => {
    expect(materialBlock(INVITE, ".ag-input", "var(--lg-blur-deep)")).toBeDefined();
    expect(materialBlock(INVITE, ".ag-btn--quiet", "var(--lg-blur-deep)")).toBeDefined();
  });
});

describe("glass picks (M-221): the readability floor", () => {
  /* Every text-bearing treated surface: [sheet, selector]. The
     material block must declare a plain fallback background-color
     BEFORE its color-mix tint line, and must carry a tint (never a
     wash alone) under its text. */
  const TEXT_SURFACES: [string, string][] = [
    [STYLES, ".home-panel"],
    [STYLES, ".home-page .home-open"],
    [STYLES, ".app-sidebar"],
    [NUTRITION, ".nut-day-card"],
    [NUTRITION, ".tile"],
    [NUTRITION, ".shop-progress"],
    [NUTRITION, ".shop-sticky"],
    [TRACKERS, ".tk2-root .at-territory"],
    [COACH, ".coach-user-bubble"],
    [COACH, ".coach-msg-copy"],
  ];

  it("the plain fallback lands before the tint on every text surface", () => {
    for (const [sheet, sel] of TEXT_SURFACES) {
      const block = materialBlock(sheet, sel, "backdrop-filter: var(--lg-blur)")!;
      expect(block, `${sel} material block`).toBeDefined();
      const fallback = block.body.search(
        /background-color: var\(--lg-fallback(-strong)?\);/,
      );
      const tint = block.body.search(
        /background-color: var\(--lg-tint(-strong)?\);/,
      );
      expect(fallback, `${sel} plain fallback`).toBeGreaterThanOrEqual(0);
      expect(tint, `${sel} tint`).toBeGreaterThan(fallback);
    }
  });

  it("the material itself guarantees the floor: fallbacks are ≥52% ink", () => {
    expect(GLASS).toContain("--lg-fallback: rgba(17, 19, 24, 0.52)");
    expect(GLASS).toContain("--lg-fallback-strong: rgba(17, 19, 24, 0.72)");
    expect(GLASS).toContain("--lg-tint: color-mix(in oklab, var(--surface) 50%, transparent)");
    expect(GLASS).toContain("--lg-tint-strong: color-mix(in oklab, var(--surface) 68%, transparent)");
  });
});

describe("glass picks (M-221): the solid list holds", () => {
  it("Profile, Rewards, the sheet kit and billing carry no glass tokens", () => {
    for (const rel of [
      "styles/profile.css",
      "styles/rewards.css",
      "styles/bloom-sheet.css",
      "styles/billing.css",
      "styles/admin-panel.css",
    ]) {
      expect(read(rel).includes("--lg-"), `${rel} must stay glass-free`).toBe(false);
    }
  });

  it("no treated surface nests inside another treated surface", () => {
    const treated =
      /(\.home-panel|\.home-band|\.home-open|\.tile|\.nut-day-card|\.at-territory|\.shop-progress|\.shop-sticky)\s+(\.home-panel|\.home-band|\.home-open|\.tile|\.nut-day-card|\.at-territory|\.shop-progress|\.shop-sticky)/;
    for (const sheet of [STYLES, NUTRITION, TRACKERS, COACH]) {
      const clean = sheet.replace(/\/\*[\s\S]*?\*\//g, " ");
      expect(treated.test(clean)).toBe(false);
    }
  });
});
