// @vitest-environment jsdom
/**
 * The Today de-box guard (M-183) — the owner's complete de-box order
 * (every tab, desktop AND mobile), pinned for the Today page.
 *
 * M-221 SUPERSESSION (owner's glass picks, 2026-11-23, disclosed):
 * Today is a ruled glass place now. The lg zones, the Growth card
 * and the bottom overview wear the shared Liquid Glass material;
 * the pins for those three carry the glass values. Everything the
 * picks did NOT name keeps its M-183 contract below: the Assessment
 * callout stays unboxed, the deltas stay hairline rows, the facts
 * strip and hero chips are untouched.
 *
 * The original M-183 contract, for the record:
 *   · at lg, Today's remaining panels and bands are borderless
 *     tonal zones (solid tonal step, 24px radius, specular depth,
 *     NO border, NO glass), via one .home-page-scoped lg block;
 *   · Assessment ("Your starting point") is UNBOXED entirely at
 *     every width — no border, no box background, no shadow — by
 *     its own .home-page rule; the generic panel rule excludes it
 *     by name because it is not a panel at all;
 *   · Growth (LevelCard) is the view's single tonal surface card:
 *     borderless, 24px, at every width (.home-growth);
 *   · the bottom overview (WeekChart + ChangesCard) is unboxed at
 *     every width (.home-open), with a vertical hairline + ~48px
 *     separation between the columns at lg (.home-open-split);
 *   · "What changed" deltas are hairline rows at every width, not
 *     mini-cards nested in a panel;
 *   · the StatTiles facts are a telemetry strip at every width,
 *     dividers running 40% of the strip's height (see also the
 *     re-contracted pin in firstBloom.guard.test.tsx);
 *   · the hero quick-action chips wear the flat translucent fill
 *     (white 4%, brightening to 8% on hover), never a backdrop blur;
 *   · the hero photo keeps its media frame but not its drop shadow;
 *   · and the freeze holds for everything the spec did NOT name:
 *     the BASE .home-panel / .home-band rules carry their exact
 *     M-174 values, so un-named surfaces below lg render as before.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const CSS = read("styles.css");
const BAND = read("components/home/OverviewBand.tsx");
const LEVEL = read("components/home/LevelCard.tsx");
const WEEK = read("components/home/WeekChart.tsx");
const INDEX = read("routes/index.tsx");

/** The first flat rule block for a selector: `selector { … }`. */
function ruleBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`rule block not found: ${selector}`);
  return m[1];
}

/** The M-183 lg block: from its registry comment to the media close. */
function m183LgBlock(): string {
  const start = CSS.indexOf("Today joins the de-box system in full (M-183");
  if (start < 0) throw new Error("M-183 block not found");
  const mediaStart = CSS.indexOf("@media (min-width: 1024px)", start);
  return CSS.slice(mediaStart, CSS.indexOf("\n}", mediaStart));
}

/** The M-183 all-widths stretch: from the delta-rows comment onward. */
function m183Flow(): string {
  const start = CSS.indexOf('"What changed" (ChangesCard): a bordered mini-card');
  if (start < 0) throw new Error("M-183 flow not found");
  return CSS.slice(start, start + 6000);
}

describe("Today de-box (M-183) — the stack's panels join the system at lg", () => {
  it("the override lives inside the lg media query, scoped to .home-page", () => {
    const block = m183LgBlock();
    expect(block).toContain(".home-page .home-panel");
    expect(block).toContain(".home-page .home-band:not(.assess-prompt)");
  });

  it("the zones wear the M-221 glass: strong tint, sheen, rim — 24px radius kept", () => {
    /* RE-CONTRACTED by M-221 (disclosed, owner's glass picks
       2026-11-23): Today is a ruled glass place now. The tonal-zone
       values are superseded by the shared Liquid Glass material at
       panel strength; the 24px radius and the .home-page scoping
       stand. */
    const block = m183LgBlock();
    expect(block).toContain("background-color: var(--lg-fallback-strong);");
    expect(block).toContain("background-color: var(--lg-tint-strong);");
    expect(block).toContain("background-image: var(--lg-sheen);");
    expect(block).toContain("border: 1px solid var(--lg-border);");
    expect(block).toContain("border-radius: var(--radius-card);");
    expect(block).toContain("box-shadow: var(--lg-rim-soft), var(--lg-shadow);");
    expect(block).toContain("backdrop-filter: var(--lg-blur);");
    expect(block).not.toContain("--glass-");
  });
});

describe("Today de-box (M-183) — Assessment is an open callout", () => {
  it("the generic panel rule excludes it by name, and its own rule unboxes it", () => {
    expect(m183LgBlock()).toContain(":not(.assess-prompt)");
    const open = ruleBlock(CSS, ".home-page .home-band.assess-prompt");
    expect(open).toContain("background-color: transparent;");
    expect(open).toContain("border: 0;");
    expect(open).toContain("box-shadow: none;");
    expect(open).toContain("padding: 0;");
    expect(open).not.toContain("--glass-");
  });

  it("the base slab rule still stands, untouched, outside the Today scope", () => {
    /* Newline-anchored: the base rule starts a line, the .home-page
       override does not match this anchor. */
    const at = CSS.indexOf("\n.home-band.assess-prompt {");
    if (at < 0) throw new Error("base assess-prompt rule not found");
    const slab = CSS.slice(at, CSS.indexOf("}", at));
    expect(slab).toContain("border-color: var(--border-strong);");
  });
});

describe("Today de-box (M-183) — Growth wears the page's glass (M-221)", () => {
  it("LevelCard carries the hook and the rule is M-221 glass at 24px", () => {
    /* RE-CONTRACTED by M-221 (disclosed): the "single tonal card"
       intent is superseded — the whole Today stack wears one
       material, Growth included. */
    expect(LEVEL).toContain("home-growth");
    const growth = ruleBlock(CSS, ".home-page .home-growth");
    expect(growth).toContain("background-color: var(--lg-tint-strong);");
    expect(growth).toContain("border: 1px solid var(--lg-border);");
    expect(growth).toContain("border-radius: var(--radius-card);");
    expect(growth).toContain("box-shadow: var(--lg-rim-soft), var(--lg-shadow);");
    expect(growth).toContain("backdrop-filter: var(--lg-blur);");
    expect(growth).not.toContain("--glass-");
  });
});

describe("Today de-box (M-183) — the bottom overview wears glass (M-221)", () => {
  it("WeekChart and ChangesCard carry the open hooks", () => {
    expect(WEEK).toContain("home-open");
    expect(BAND).toContain("home-open home-open-split");
  });

  it("the open rule now carries the M-221 glass at every width", () => {
    /* RE-CONTRACTED by M-221 (disclosed): the bottom overview is the
       VITALIS Overview surface — glassed by the owner's picks. The
       glass takes back the card inset (the components' authored
       p-5 / sm:p-7 values, declared in the rule). */
    const open = ruleBlock(m183Flow(), ".home-page .home-open");
    expect(open).toContain("background-color: var(--lg-tint-strong);");
    expect(open).toContain("background-image: var(--lg-sheen);");
    expect(open).toContain("border: 1px solid var(--lg-border);");
    expect(open).toContain("border-radius: var(--radius-card);");
    expect(open).toContain("box-shadow: var(--lg-rim-soft), var(--lg-shadow);");
    expect(open).toContain("backdrop-filter: var(--lg-blur);");
    expect(open).toContain("padding: var(--space-5);");
  });

  it("the split column parts on the grid gap at lg — no hairline (M-221)", () => {
    const flow = m183Flow();
    const mediaStart = flow.indexOf("@media (min-width: 1024px)");
    const split = ruleBlock(flow.slice(mediaStart), ".home-page .home-open-split");
    expect(split).toContain("border-left: 0;");
    expect(split).toContain("padding-left: var(--space-6);");
  });
});

describe("Today de-box (M-183) — no box-in-a-box in What changed", () => {
  it("the deltas carry the row hooks and read as hairline rows at every width", () => {
    expect(BAND).toContain("home-delta-list");
    expect(BAND).toContain("home-delta-row");
    const flow = m183Flow();
    const row = ruleBlock(flow, ".home-page .home-delta-row");
    expect(row).toContain("border-top: 1px solid var(--dbx-hairline);");
    expect(row).toContain("background: transparent;");
    const first = ruleBlock(flow, ".home-page .home-delta-row:first-child");
    expect(first).toContain("border-top: 0;");
    /* The rows live in the all-widths flow, not inside the lg block. */
    expect(m183LgBlock()).not.toContain("home-delta-row");
  });
});

describe("Today de-box (M-183) — the facts strip and its 40% dividers", () => {
  it("the lg .home-fact block carries the divider, never panel values", () => {
    const base = CSS.indexOf("\n.home-fact {");
    const lgStart = CSS.indexOf("@media (min-width: 1024px)", base);
    const lgBlock = CSS.slice(lgStart, CSS.indexOf("\n}", lgStart));
    expect(lgBlock).toContain(".home-fact:nth-child(n + 2)");
    expect(lgBlock).toContain(".home-fact:nth-child(n + 2)::before");
    expect(lgBlock).toContain("height: 40%;");
    expect(lgBlock).not.toContain("--glass-bg");
    expect(lgBlock).not.toContain("--glass-border");
    expect(lgBlock).not.toContain("backdrop-filter");
    expect(lgBlock).not.toContain("padding: 28px");
  });

  it("the mobile divider is the same 40% hairline, on the even cells", () => {
    /* RE-CONTRACT (disclosed in M-183): the interrupted draft pinned
       the base even rule's full-height border-left. The complete
       spec's strip runs its dividers at 40% height, so the border
       became a centred ::before at the same hairline value — the
       cell's inset (padding-left 16px) is unchanged. */
    const even = ruleBlock(CSS, ".home-fact:nth-child(even)");
    expect(even).toContain("padding-left: 16px;");
    expect(even).not.toContain("border-left");
    const divider = ruleBlock(CSS, ".home-fact:nth-child(even)::before");
    expect(divider).toContain("height: 40%;");
    expect(divider).toContain("background: rgb(255 255 255 / 0.06);");
  });
});

describe("Today de-box (M-183) — the hero floats openly", () => {
  it("the quick-action chips wear the flat translucent fill, no blur", () => {
    const chip = ruleBlock(CSS, ".home-chip");
    expect(chip).toContain("background: rgb(255 255 255 / 0.04);");
    expect(chip).toContain("border-radius: var(--radius-pill);");
    expect(chip).not.toContain("backdrop-filter");
    const hover = ruleBlock(CSS, ".home-chip:hover");
    expect(hover).toContain("background: rgb(255 255 255 / 0.08);");
    expect(hover).not.toContain("border-strong");
  });

  it("the hero photo keeps its media frame, without the drop shadow", () => {
    expect(INDEX).toContain("overflow-hidden rounded-card border");
    expect(INDEX).not.toContain("0_40px_80px");
  });
});

describe("Today de-box (M-183) — the freeze holds where the spec is silent", () => {
  it("the base .home-panel rule carries the M-221 material — the freeze is lifted for this class", () => {
    /* RE-CONTRACTED by M-221 (disclosed): the owner's picks glass
       Today at every width, so the base rule itself wears the
       material now (plain strong fallback first, then the tint). */
    const panel = ruleBlock(CSS, ".home-panel");
    expect(panel).toContain("background-color: var(--lg-fallback-strong);");
    expect(panel).toContain("background-color: var(--lg-tint-strong);");
    expect(panel).toContain("background-image: var(--lg-sheen);");
    expect(panel).toContain("border: 1px solid var(--lg-border);");
    expect(panel).toContain("backdrop-filter: var(--lg-blur);");
  });

  it("the base .home-fact strip keeps its shape below lg", () => {
    const fact = ruleBlock(CSS, ".home-fact");
    expect(fact).toContain("padding-block: var(--space-1);");
    expect(fact).toContain("position: relative;");
  });

  it("the mobile lead stays mobile: the journey wrapper keeps its lg:hidden pin", () => {
    expect(INDEX).toContain("empty:hidden lg:hidden");
  });
});
