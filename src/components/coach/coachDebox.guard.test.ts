import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * De-box guards — Coach slice (M-175 programme, Coach page).
 *
 * The thread is an editorial canvas, not a stack of boxes:
 *   1. Bloom's replies carry NO bubble at all (no background, no border
 *      on the copy block); the reader's messages are soft tonal modules
 *      — the de-box tone + specular catch, no border, radius in the
 *      16–20px nested-module band, and the `.dbx-module` class in the
 *      markup.
 *   2. The composer is one borderless tonal object; the dock separates
 *      it from the thread with the ONE hairline token, and send/action
 *      controls are full pills.
 *   3. Suggestions (welcome starters, follow-up chips) are tonal pills,
 *      never bordered boxes.
 *   4. Context-panel lists are hairline-grouped rows (`.dbx-rows` /
 *      `.dbx-row` in the markup, `--dbx-hairline` between rows), and
 *      structured response blocks are tonal modules with no border —
 *      no box-in-a-box anywhere on the treated surfaces.
 *   5. The overlay families keep the sheet contract: the palette panel
 *      stays an opaque slab (solid fallback first, per the legacy-engine
 *      rule) and no treated surface gains glass — backdrop-filter may
 *      not appear outside the pre-existing camera backdrop.
 *
 * M-221 SUPERSESSION (owner's glass picks, 2026-11-23, disclosed):
 * Coach chat is a ruled glass place. The two thread bubbles wear the
 * shared material — the user's gold-tinted, Bloom's clear — via the
 * cascade-end M-221 blocks in coach.css, and the pins for those two
 * read the WINNING (last) blocks (the M-176 lesson). Contract items
 * 2–5 stand untouched; the backdrop-filter census gains exactly the
 * two bubbles.
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const COACH = read("styles/coach.css");
const USER_MESSAGE = read("components/coach/UserMessage.tsx");
const CONTEXT_PANEL = read("components/coach/ContextPanel.tsx");

/** The first flat rule block for a selector: `selector { … }`. */
function ruleBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`rule block not found: ${selector}`);
  return m[1]!;
}

/** The LAST flat rule block for a selector — the cascade winner when
 *  a slice appends its override at the file's end (M-221). */
function ruleBlockLast(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const all = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "g"))];
  if (all.length === 0) throw new Error(`rule block not found: ${selector}`);
  return all[all.length - 1]![1]!;
}

/** A visible border declaration (a `border:` shorthand that paints). */
const PAINTED_BORDER = /border:\s*1px\s+solid|border:\s*1px\s+dashed/;

describe("de-box Coach: the thread is an open canvas", () => {
  it("the user bubble is gold-tinted glass (M-221), radius 16–20px", () => {
    /* RE-CONTRACTED by M-221 (disclosed): the tonal module is
       superseded by the preview's gold-tinted glass. Geometry stays
       in the base block; the material is pinned on the WINNING
       (cascade-end) block. */
    const base = ruleBlock(COACH, ".coach-user-bubble");
    const radius = base.match(/border-radius:\s*(\d+)px/);
    expect(radius).not.toBeNull();
    const px = Number(radius![1]);
    expect(px).toBeGreaterThanOrEqual(16);
    expect(px).toBeLessThanOrEqual(20);
    const block = ruleBlockLast(COACH, ".coach-user-bubble");
    expect(block).toContain("background-color: var(--lg-fallback);");
    expect(block).toContain("background-color: var(--lg-tint);");
    expect(block).toContain("background-image: var(--lg-wash-gold);");
    expect(block).toContain("border: 1px solid rgba(242, 228, 198, 0.35);");
    expect(block).toContain("backdrop-filter: var(--lg-blur);");
    expect(USER_MESSAGE).toContain("coach-user-bubble dbx-module");
  });

  it("Bloom's message copy wears clear glass (M-221)", () => {
    /* RE-CONTRACTED by M-221 (disclosed): the open copy gains the
       preview's clear-glass bubble — the material at panel tint,
       sources and actions still outside it. Pinned on the winning
       block; the base typography block stays paint-free. */
    const base = ruleBlock(COACH, ".coach-msg-copy");
    expect(base).not.toMatch(/background|border\s*:/);
    const block = ruleBlockLast(COACH, ".coach-msg-copy");
    expect(block).toContain("background-color: var(--lg-fallback);");
    expect(block).toContain("background-color: var(--lg-tint);");
    expect(block).toContain("background-image: var(--lg-sheen);");
    expect(block).toContain("border: 1px solid var(--lg-border);");
    expect(block).toContain("border-radius: 6px 19px 19px 19px;");
    expect(block).toContain("backdrop-filter: var(--lg-blur);");
  });

  it("structured blocks are tonal modules, never bordered cards", () => {
    const block = ruleBlock(COACH, ".coach-block");
    expect(block).not.toMatch(PAINTED_BORDER);
    expect(block).toContain("border: none;");
    expect(block).toContain("background: var(--dbx-tone);");
    /* the box-in-a-box inside the proposal block is gone too */
    const change = ruleBlock(COACH, ".coach-proposal-change");
    expect(change).not.toMatch(PAINTED_BORDER);
    expect(change).toContain("border: none;");
  });
});

describe("de-box Coach: composer, dock and suggestions", () => {
  it("the dock is hairline-separated from the thread", () => {
    const dock = ruleBlock(COACH, ".coach-dock");
    expect(dock).toContain("border-top: 1px solid var(--dbx-hairline);");
  });

  it("the composer is borderless and keeps its legacy-engine fallback", () => {
    const block = ruleBlock(COACH, ".coach-composer");
    expect(block).not.toMatch(PAINTED_BORDER);
    expect(block).toContain("border: none;");
    /* the layered color-mix background still carries the plain solid
       declaration BEFORE it (ui.guard's legacy-engine contract) */
    const plain = block.indexOf("background: var(--surface-2);");
    const mixed = block.search(/background:[^;]*color-mix/);
    expect(plain).toBeGreaterThanOrEqual(0);
    expect(mixed).toBeGreaterThan(plain);
  });

  it("send and composer action controls are full pills", () => {
    expect(ruleBlock(COACH, ".coach-send")).toContain(
      "border-radius: var(--radius-pill);",
    );
    expect(ruleBlock(COACH, ".coach-send")).not.toMatch(PAINTED_BORDER);
    expect(ruleBlock(COACH, ".coach-composer-icon")).toContain(
      "border-radius: var(--radius-pill);",
    );
  });

  it("suggestions are tonal pills, not bordered boxes", () => {
    const followup = ruleBlock(COACH, ".coach-followup");
    expect(followup).not.toMatch(PAINTED_BORDER);
    expect(followup).toContain("border-radius: var(--radius-pill);");
    expect(followup).toContain("background: var(--dbx-tone);");
    const starter = ruleBlock(COACH, ".coach-starter");
    expect(starter).not.toMatch(PAINTED_BORDER);
    expect(starter).toContain("border-radius: var(--radius-pill);");
    expect(starter).toContain("background: var(--dbx-tone);");
  });
});

describe("de-box Coach: lists are hairline rows, sheets stay slabs", () => {
  it("the context lists use the shared hairline-row classes", () => {
    expect(CONTEXT_PANEL).toContain("coach-signal-list dbx-rows");
    expect(CONTEXT_PANEL).toContain("coach-signal-row dbx-row");
    expect(CONTEXT_PANEL).toContain("coach-memory-list dbx-rows");
    expect(CONTEXT_PANEL).toContain("coach-memory-item dbx-row");
  });

  it("list containers wear no box; rows split on the one hairline", () => {
    const list = ruleBlock(COACH, ".coach-signal-list");
    expect(list).not.toMatch(/background|border\s*:|border-radius/);
    const sibling = ruleBlock(COACH, ".coach-signal-row + .coach-signal-row");
    expect(sibling).toContain("border-top: 1px solid var(--dbx-hairline);");
    const item = ruleBlock(COACH, ".coach-memory-item");
    expect(item).not.toMatch(PAINTED_BORDER);
    expect(item).not.toMatch(/background\s*:/);
    const itemSibling = ruleBlock(COACH, ".coach-memory-item + .coach-memory-item");
    expect(itemSibling).toContain("border-top: 1px solid var(--dbx-hairline);");
  });

  it("the palette panel stays an opaque slab (sheet contract untouched)", () => {
    const block = ruleBlock(COACH, ".coach-palette");
    expect(block).toContain("background: var(--surface);");
    expect(block).toContain("max-height:");
    expect(block).not.toContain("backdrop-filter");
    const menu = ruleBlock(COACH, ".coach-row-menu");
    expect(menu).toContain("background: var(--surface-2);");
    const attach = ruleBlock(COACH, ".coach-attach-menu");
    expect(attach).toContain("background: var(--surface-2);");
  });

  it("backdrop-filter survives only on the camera backdrop and the two M-221 thread bubbles", () => {
    const hits = [...COACH.matchAll(/\.([a-z-]+)\s*\{[^}]*backdrop-filter/g)].map(
      (m) => m[1],
    );
    expect(hits).toEqual(["coach-camera-backdrop", "coach-user-bubble", "coach-msg-copy"]);
  });
});
