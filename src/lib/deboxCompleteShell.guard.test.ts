/**
 * De-box Complete guards — the shell (M-186) and the coordinator's audit
 * fixes (Profile, Cycle), 2026-11-21.
 *
 * The owner's full de-box reaches the chrome and the two audit surfaces
 * that still wore layout-container rims. The pins below hold the
 * cascade-end blocks that carry the changes, in the house pattern: the
 * LAST exact block for a selector is the rendered winner, so that is
 * what gets read — never the superseded base rule (the M-176 lesson).
 *
 *   (a) the rail: no right border; separation is the tonal step that
 *       was always underneath it;
 *   (b) the assessment slab exception: .pf-card.assess-card keeps its
 *       owner-ruled strong border (a bleed-through fix) while the
 *       generic .pf-card rim goes;
 *   (c) the grouped settings list: rim and glass shadow gone, the
 *       tonal wash and row hairlines stay;
 *   (d) Cycle's one layout container: rim and deep shadow gone, the
 *       tonal surface and its ::before specular catch stay;
 *   (e) the ruled glass places the shell owns are untouched: the phone
 *       brand bar still wears the Night Glass tokens.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const STYLES = read("styles.css");
const PROFILE = read("styles/profile.css");
const CYCLE = read("styles/cycle.css");

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

/* A block "is" a selector when its selector text ENDS with it (the
   house blockFor convention): a cascade-end block appended after a
   media query carries that query's stray closing brace in its slice,
   so exact equality would miss the very blocks this guard exists to
   pin. Ends-with still excludes descendants (".x .y" ends with ".y"
   only when .y is the subject) and pseudo variants. */
const exactBlocks = (text: string, selector: string) =>
  blocks(text).filter((b) => b.selector.trim().endsWith(selector));
const lastBlock = (text: string, selector: string) => {
  const all = exactBlocks(text, selector);
  return all[all.length - 1];
};

describe("de-box complete: the shell (M-186)", () => {
  it("the rail's right border is gone — the cascade-end block removes it", () => {
    expect(STYLES).toContain("De-box Complete (M-186)");
    const sidebar = lastBlock(STYLES, ".app-sidebar")!;
    expect(sidebar).toBeDefined();
    expect(sidebar.body).toContain("border-right: none");
  });

  it("the tonal step that separates rail from canvas still stands", () => {
    /* The border was drawn over a tonal separation: --sidebar is its
       own step against the canvas, pinned in the .app-nav token block.
       Removing the line is only honest while the step remains. */
    expect(STYLES).toContain("--sidebar: #0b0c10");
    expect(STYLES).toContain("--background: #0a0b0e");
  });

  it("the active nav link wears the M-221 glass pill — a tint step kept on the solid rail", () => {
    /* RE-CONTRACTED by M-221 (disclosed, owner's glass picks
       2026-11-23): the active destination takes the preview's glass
       pill — a tint step with the rim, no second backdrop blur.
       M-223 note (owner directive 2026-11-23): the rail's own
       background is solid again, but the in-rail tint steps were
       expressly kept, so this pin stands exactly as M-221 left it.
       The gold tick/glyph signals below are unchanged. */
    const active = lastBlock(STYLES, ".app-nav-link-active")!;
    expect(active.body).toContain("background-color: var(--lg-tint)");
    expect(active.body).toContain("box-shadow: var(--lg-rim-soft)");
    expect(active.body).not.toContain("backdrop-filter");
  });

  it("the gold signal survives: tick and active glyph rules untouched", () => {
    const tick = lastBlock(STYLES, ".app-nav-tick")!;
    expect(tick.body).toContain("width: 3px");
    expect(tick.body).toContain("background: var(--gold)");
    expect(STYLES).toContain(".app-nav-link-active .app-nav-glyph");
  });

  it("the phone brand bar keeps its ruled Night Glass", () => {
    expect(STYLES).toContain("background: var(--lg-tint-strong)");
    expect(STYLES).toContain("backdrop-filter: var(--lg-blur)");
  });
});

describe("de-box complete: audit fixes (Profile, Cycle)", () => {
  it("the generic .pf-card rim is gone, scoped away from the slab", () => {
    const card = lastBlock(PROFILE, ".pf-card:not(.assess-card)")!;
    expect(card).toBeDefined();
    expect(card.body).toContain("border: none");
  });

  it("the owner-ruled assessment slab keeps its strong border", () => {
    const slab = lastBlock(PROFILE, ".pf-card.assess-card")!;
    expect(slab).toBeDefined();
    expect(slab.body).toContain("border-color: var(--border-strong)");
    expect(slab.body).toContain("background: var(--surface)");
  });

  it("the grouped settings list loses rim and glass shadow", () => {
    const group = lastBlock(PROFILE, ".pf-group-rows")!;
    expect(group.body).toContain("border: none");
    expect(group.body).toContain("box-shadow: none");
  });

  it("Cycle's layout container loses rim and shadow, keeps its surface", () => {
    const card = lastBlock(CYCLE, ".ci-card")!;
    expect(card.body).toContain("border: none");
    expect(card.body).toContain("box-shadow: none");
    /* The base rule's tonal surface and the ::before specular catch
       are the depth cues that remain — both still defined. */
    const base = exactBlocks(CYCLE, ".ci-card")[0]!;
    expect(base.body).toContain("background: var(--ci-surface)");
    expect(CYCLE).toContain(".ci-card::before");
  });
});
