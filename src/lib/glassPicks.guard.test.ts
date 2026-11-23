/**
 * True Liquid Glass guards (M-224) — the owner's correction, 2026-11-23.
 *
 * This file replaces the M-221 "glass picks" census wholesale. M-221
 * spread the material across the owner's picked AREAS; the owner
 * reviewed it live and ruled it "isn't correct glass", supplying
 * Apple's iOS 26 Liquid Glass rules as the standard. Bloom is a web
 * app — the native APIs do not apply, the RULES do:
 *
 *   1. Glass lives ONLY on the floating/control layer — floating
 *      toolbars, pills, the dock, floating controls. Never on stacked
 *      cards, list items or full content panels.
 *   2. Never opacity < 1 on the glass element itself — the backdrop
 *      layer renders at full strength; tint rides as an overlay
 *      background layer on top of it.
 *   3. Glass needs colourful/scrolling content behind it to refract —
 *      over flat black it reads flat (why M-221's panels failed and
 *      the sidebar lost its colour).
 *   4. Shapes are pills or rounded rects ≥20px, so the specular edge
 *      and lensing can show.
 *
 * The pins:
 *   1. the material in glass.css carries the rebuilt recipe — the
 *      REGULAR variant (floating chrome) and the CLEAR variant
 *      (lighter, for colourful grounds like the invitation gate),
 *      the specular rim, the lensing gradient, the palette washes
 *      kept as overlay tints under their opacity ceilings, and the
 *      readability fallbacks at their floors;
 *   2. the FLOATING-LAYER ALLOWLIST: exactly these surfaces consume
 *      the material, each with a full-strength backdrop layer and no
 *      sub-1 opacity of its own;
 *   3. the PANEL BLOCKLIST: the surfaces M-221 glassed that this
 *      correction returns to solid — their sheets carry no --lg-
 *      token at all, and Today's home blocks carry none either;
 *   4. the keep-solid invariants (Profile / Rewards / sheets /
 *      billing) stand unchanged from M-221.
 *
 * Out of scope by name: the sidebar rail blocks in styles.css
 * (.app-sidebar, .app-sidebar-profile, .rail-points-card,
 * .app-nav-link-active) are M-223's territory — that slice restores
 * the rail to solid under the same directive. This census neither
 * allows nor blocks them; it pins only that no OTHER rail selector
 * joins them while the two slices integrate.
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
const materialBlock = (text: string, selector: string, needle: string) =>
  exactBlocks(text, selector).find((b) => b.body.includes(needle));

/** Every selector whose block consumes a --lg- backdrop token. */
const lgBackdropConsumers = (text: string): string[] =>
  blocks(text)
    .filter((b) => /backdrop-filter:\s*var\(--lg-/.test(b.body))
    .map((b) => b.selector.trim().split(/\s+/).pop()!);

const SUB_ONE_OPACITY = /(?:^|;)\s*opacity:\s*0?\.\d+/;

describe("true liquid glass (M-224): the rebuilt material", () => {
  it("the REGULAR variant: full-strength blur + saturate at 24px/180%", () => {
    expect(GLASS).toContain("--lg-blur: blur(24px) saturate(180%)");
    /* The deep name survives as the regular recipe's alias — the
       dock and orb consume it, and one material means one recipe. */
    expect(GLASS).toContain("--lg-blur-deep: blur(24px) saturate(180%)");
  });

  it("the CLEAR variant: a lighter recipe for colourful grounds", () => {
    expect(GLASS).toContain("--lg-blur-clear: blur(14px) saturate(165%)");
    expect(GLASS).toContain("--lg-fallback-clear: rgba(17, 19, 24, 0.32)");
    expect(GLASS).toContain(
      "--lg-tint-clear: color-mix(in oklab, var(--surface) 26%, transparent)",
    );
  });

  it("the specular rim reads as light on a curved edge", () => {
    /* A bright top edge at full specular strength, a soft shaded
       lower inset — not the M-221 step rim. */
    const rim = GLASS.match(/--lg-rim:\s*([^;]+);/)![1]!;
    expect(rim).toContain("inset 0 1px 0 rgba(255, 255, 255, 0.62)");
    expect(rim).toContain("inset 0 -14px 20px -16px rgba(0, 0, 0, 0.45)");
    /* rim-soft stays inset-only (the drift card rule leans on it). */
    const soft = GLASS.match(/--lg-rim-soft:\s*([^;]+);/)![1]!;
    for (const layer of soft.split(/,(?![^()]*\)) /)) {
      expect(layer.trim().startsWith("inset")).toBe(true);
    }
  });

  it("the lensing gradient: bright at the rim, clearing to centre", () => {
    const lens = GLASS.match(/--lg-lens:\s*([\s\S]*?);/)![1]!;
    expect(lens).toContain("linear-gradient");
    expect(lens).toContain("radial-gradient");
    expect(lens).toContain("rgba(255, 255, 255, 0)");
    /* The legacy sheen name keeps working, as the same lens. */
    expect(GLASS).toContain("--lg-sheen: var(--lg-lens)");
  });

  it("the palette washes stay overlay tints under their ceilings", () => {
    expect(GLASS).toContain("rgba(220, 192, 143, 0.2)");
    expect(GLASS).toContain("rgba(143, 199, 162, 0.18)");
    expect(GLASS).toContain("rgba(227, 145, 159, 0.17)");
    expect(GLASS).toContain("--lg-wash-gold:");
    expect(GLASS).toContain("--lg-wash-sage:");
    expect(GLASS).toContain("--lg-wash-rose:");
  });

  it("the readability fallbacks hold their floors", () => {
    expect(GLASS).toContain("--lg-fallback: rgba(17, 19, 24, 0.52)");
    expect(GLASS).toContain("--lg-fallback-strong: rgba(17, 19, 24, 0.72)");
    expect(GLASS).toContain(
      "--lg-tint: color-mix(in oklab, var(--surface) 50%, transparent)",
    );
    expect(GLASS).toContain(
      "--lg-tint-strong: color-mix(in oklab, var(--surface) 68%, transparent)",
    );
  });

  it(".glass-panel is the rebuilt structure: backdrop layer, tint overlay, lens, rim", () => {
    const panel = lastBlock(GLASS, ".glass-panel")!;
    expect(panel.body).toContain("background-color: var(--lg-fallback-strong)");
    expect(panel.body).toContain("background-color: var(--lg-tint-strong)");
    expect(panel.body).toContain("background-image: var(--lg-lens)");
    expect(panel.body).toContain("backdrop-filter: var(--lg-blur)");
    expect(panel.body).toContain("box-shadow: var(--lg-rim), var(--lg-shadow)");
    expect(panel.body).not.toMatch(SUB_ONE_OPACITY);
  });
});

describe("true liquid glass (M-224): the floating-layer allowlist", () => {
  it("the dock + orb chrome wears the regular recipe (deep alias)", () => {
    expect(materialBlock(STYLES, ".dock__top", "var(--lg-blur-deep)")).toBeDefined();
    expect(materialBlock(STYLES, ".dock__log", "var(--lg-blur-deep)")).toBeDefined();
    expect(materialBlock(ORB, ".coach-orb", "var(--lg-blur-deep)")).toBeDefined();
    expect(materialBlock(ORB, ".coach-orb::before", "var(--lg-blur-deep)")).toBeDefined();
  });

  it("the TopBar sync pill and the phone brand bar wear the regular recipe", () => {
    expect(materialBlock(STYLES, ".home-sync-pill", "var(--lg-blur)")).toBeDefined();
    expect(materialBlock(STYLES, ".app-mobile-bar", "var(--lg-blur)")).toBeDefined();
  });

  it("Today's quick-action pills join the floating layer — the quiet ghost opts out", () => {
    const chip = materialBlock(STYLES, ".home-chip", "var(--lg-blur)");
    expect(chip).toBeDefined();
    expect(chip!.body).toContain("background-color: var(--lg-fallback)");
    expect(chip!.body).toContain("background-color: var(--lg-tint)");
    expect(chip!.body).toContain("border-radius: var(--radius-pill)");
    const quiet = lastBlock(STYLES, ".home-chip--quiet")!;
    expect(quiet.body).toContain("backdrop-filter: none");
  });

  it("the invitation gate wears the CLEAR variant over its colourful ground", () => {
    expect(materialBlock(INVITE, ".ag-input", "var(--lg-blur-clear)")).toBeDefined();
    expect(materialBlock(INVITE, ".ag-btn--quiet", "var(--lg-blur-clear)")).toBeDefined();
  });

  it("no allowlisted surface fades its own element (rule 2)", () => {
    const surfaces: [string, string][] = [
      [STYLES, ".dock__top"],
      [STYLES, ".dock__log"],
      [STYLES, ".home-sync-pill"],
      [STYLES, ".home-chip"],
      [ORB, ".coach-orb"],
      [INVITE, ".ag-input"],
      [INVITE, ".ag-btn--quiet"],
    ];
    for (const [sheet, sel] of surfaces) {
      const block = materialBlock(sheet, sel, "backdrop-filter")!;
      expect(block, `${sel} material block`).toBeDefined();
      expect(block.body, `${sel} sub-1 opacity`).not.toMatch(SUB_ONE_OPACITY);
    }
  });

  it("the census is exact: no other surface consumes a --lg- backdrop", () => {
    /* styles.css also holds the rail blocks (M-223's territory) —
       named here so nothing new can hide among them. */
    const rail = [".app-sidebar", ".app-sidebar-profile"];
    const stylesConsumers = lgBackdropConsumers(STYLES)
      .filter((s) => !rail.includes(s))
      .sort();
    expect(stylesConsumers).toEqual(
      [".app-mobile-bar", ".dock__log", ".dock__top", ".home-chip", ".home-sync-pill"].sort(),
    );
    expect(lgBackdropConsumers(ORB).sort()).toEqual(
      [".coach-orb", ".coach-orb::before"].sort(),
    );
    expect(lgBackdropConsumers(INVITE).sort()).toEqual(
      [".ag-btn--quiet", ".ag-input"].sort(),
    );
    /* In glass.css itself only the material's own utility classes
       may carry a backdrop filter. */
    for (const sel of lgBackdropConsumers(GLASS)) {
      expect(sel.startsWith(".glass-"), `${sel} in glass.css`).toBe(true);
    }
  });
});

describe("true liquid glass (M-224): the panel blocklist — solid again", () => {
  it("the removed areas' sheets carry no --lg- token at all", () => {
    for (const [name, sheet] of [
      ["nutrition.css", NUTRITION],
      ["trackers.css", TRACKERS],
      ["coach.css", COACH],
      ["stories.css", STORIES],
    ] as const) {
      expect(sheet.includes("--lg-"), `${name} must be glass-free`).toBe(false);
    }
  });

  it("Today's home blocks carry no liquid-glass material in any rule", () => {
    for (const sel of [
      ".home-panel",
      ".home-band",
      ".home-page .home-growth",
      ".home-page .home-open",
    ]) {
      for (const b of exactBlocks(STYLES, sel)) {
        expect(b.body, `${sel} glass token`).not.toContain("--lg-");
        expect(b.body, `${sel} lg backdrop`).not.toMatch(
          /backdrop-filter:\s*var\(--lg-/,
        );
      }
    }
    /* The restored panels are the de-box solids: the base panel is
       the M-174 dress (its own legacy --glass-* tokens and 14px
       frost — a different, older treatment, not this material),
       Growth/open are the tonal/open treatments. */
    const panel = lastBlock(STYLES, ".home-panel")!.body;
    expect(panel).toContain("background-image: var(--glass-bg)");
    /* M-225: the panel's leftover 14px frost is REMOVED — glass discipline
       keeps backdrop blur on the floating layer only. */
    expect(panel).not.toContain("backdrop-filter");
    expect(lastBlock(STYLES, ".home-page .home-growth")!.body).toContain(
      "box-shadow: var(--dbx-specular)",
    );
    expect(lastBlock(STYLES, ".home-page .home-open")!.body).toContain(
      "background-color: transparent",
    );
  });

  it("the Coach bubbles are tonal again and the composer stayed solid", () => {
    const user = lastBlock(COACH, ".coach-user-bubble")!;
    expect(user.body).toContain("background: var(--dbx-tone)");
    expect(user.body).not.toContain("backdrop-filter");
    const composer = lastBlock(COACH, ".coach-composer")!;
    expect(composer.body).not.toContain("backdrop-filter");
    expect(composer.body).not.toContain("--lg-");
  });
});

describe("true liquid glass (M-224): the solid list holds", () => {
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
});

describe("the sidebar rail — SOLID (M-223, spliced in at M-224 integration)", () => {
  /* M-224's census above deliberately leaves the rail blocks out of
     scope (M-223's territory). At integration the two slices land in
     order, so M-223's positive rail pin is spliced in here verbatim:
     the winning .app-sidebar block carries the solid surface —
     background: var(--sidebar), no glass tokens, no backdrop blur —
     and the de-box separation stands (no border returns). Inside the
     rail, the points card and active pill keep their M-221 tint
     steps with no blur of their own (M-223 kept them deliberately). */
  it("the winning .app-sidebar block is solid: var(--sidebar), no --lg-, no backdrop-filter", () => {
    const rail = lastBlock(STYLES, ".app-sidebar")!;
    expect(rail.body).toContain("background: var(--sidebar)");
    expect(rail.body).not.toContain("--lg-");
    expect(rail.body).not.toContain("backdrop-filter");
    expect(rail.body).toContain("border-right: none");
  });

  it("inside the rail: tint steps only — the points card and active pill carry no blur of their own", () => {
    const card = lastBlock(STYLES, ".rail-points-card")!;
    expect(card.body).toContain("background-color: var(--lg-tint)");
    expect(card.body).not.toContain("backdrop-filter");
    const pill = lastBlock(STYLES, ".app-nav-link-active")!;
    expect(pill.body).toContain("background-color: var(--lg-tint)");
    expect(pill.body).not.toContain("backdrop-filter");
  });
});
