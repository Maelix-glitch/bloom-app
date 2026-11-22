import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Paywall layout guards — the 2026-11-18 owner screenshots, carried
 * forward into design G (M-216).
 *
 * The paywall rendered its stack flush inside the BloomSheet panel. The
 * panel is `overflow: hidden` with a 28px border radius and carries no
 * inset of its own, so:
 *   1. the first line (the eyebrow) began ~5px below the top border and
 *      ~2px inside the left one — inside the corner curve, which clipped
 *      its first letter ("LOOM PREMIUM");
 *   2. every unpadded line sat on the panel's border while the padded
 *      cards only looked inset — the broken alignment in the shots;
 *   3. with no scroll region, content past the panel cap was hard-clipped
 *      with no way to reach it.
 *
 * These pins hold the fix the way sheet.guard.test.ts holds the sheet
 * families: the stack owns a real inset, lives inside the shell's scroll
 * region, and the period toggle is centred. M-216 replaced the two plan
 * cards with design G's comparison composition, so the card pins became
 * G pins: the two column heads and the button row are two-column grids
 * at EVERY width (the ledger is the point of the design — it never
 * collapses into stacked cards), the ledger rows align label + two
 * cells, prices never wrap mid-figure, and the G heads are opaque
 * panels (no backdrop-filter anywhere in the billing sheet's CSS).
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ");

/** The declaration block of one exact selector, comments stripped. */
function block(css: string, selector: string): string {
  const clean = stripComments(css);
  const at = clean.indexOf(selector);
  expect(at, `${selector} not found`).toBeGreaterThanOrEqual(0);
  const open = clean.indexOf("{", at);
  const close = clean.indexOf("}", open);
  return clean.slice(open + 1, close);
}

/** Every declaration block for one exact selector (base + overrides). */
function blocks(css: string, selector: string): string[] {
  const clean = stripComments(css);
  const out: string[] = [];
  let at = clean.indexOf(selector);
  while (at >= 0) {
    const open = clean.indexOf("{", at);
    const close = clean.indexOf("}", open);
    out.push(clean.slice(open + 1, close));
    at = clean.indexOf(selector, close);
  }
  return out;
}

const billingCss = read("styles/billing.css");
const sheetTsx = read("components/billing/PaywallSheet.tsx");

describe("paywall layout guards", () => {
  it("the stack owns its inset — content never sits on the panel border", () => {
    const stack = block(billingCss, ".bill-stack");
    /* --space-6 = 24px: at 24px below the panel's top the 28px corner
       curve has spent itself (~0.2px of inset left), so the eyebrow
       clears the clip zone with its full first letter. */
    expect(stack).toMatch(/padding:\s*var\(--space-6\)/);
  });

  it("the stack renders inside the sheet's scroll region", () => {
    const scrollAt = sheetTsx.indexOf('className="bsheet-scroll"');
    const stackAt = sheetTsx.indexOf('className="bill-stack"');
    expect(scrollAt).toBeGreaterThanOrEqual(0);
    expect(stackAt).toBeGreaterThan(scrollAt);
  });

  it("the period toggle is centred on the sheet's axis", () => {
    const row = block(billingCss, ".bill-toggle-row");
    expect(row).toMatch(/display:\s*flex/);
    expect(row).toMatch(/justify-content:\s*center/);
    expect(sheetTsx).toContain('className="bill-toggle-row"');
  });

  it("the sheet carries a visible close, not just Escape and the backdrop", () => {
    /* Audit slice A: sibling sheets render the family's round ×
       (DataSheets' SheetClose); the paywall never did, so on desktop
       nothing on screen said the sheet could be closed. */
    expect(sheetTsx).toContain('aria-label="Close"');
    expect(sheetTsx).toContain("bill-close");
    const close = block(billingCss, ".bsheet-icon.bill-close");
    expect(close).toMatch(/width:\s*44px/);
    expect(close).toMatch(/height:\s*44px/);
  });

  it("design G: the column heads are a two-column grid at every width — never stacked", () => {
    const heads = block(billingCss, ".bill-g-heads");
    expect(heads).toMatch(/display:\s*grid/);
    expect(heads).toMatch(/grid-template-columns:\s*1fr 1fr/);
    /* No override may collapse the pair into one column at phone
       width: the comparison is the design, so the columns tighten
       instead of stacking. */
    for (const b of blocks(billingCss, ".bill-g-heads")) {
      expect(b).not.toMatch(/grid-template-columns:\s*1fr\s*;/);
    }
    expect(sheetTsx).toContain("bill-g-heads");
  });

  it("design G: the ledger rows align a label with the two plan cells", () => {
    const row = block(billingCss, ".bill-g-row");
    expect(row).toMatch(/display:\s*grid/);
    expect(row).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(sheetTsx).toContain("data-comparison-row");
    expect(sheetTsx).toContain("PAYWALL_COMPARISON");
  });

  it("design G: one button per column, in a two-column row", () => {
    const btns = block(billingCss, ".bill-g-btns");
    expect(btns).toMatch(/display:\s*grid/);
    expect(btns).toMatch(/grid-template-columns:\s*1fr 1fr/);
    expect(sheetTsx).toContain("bill-g-btns");
  });

  it("prices never wrap mid-figure", () => {
    const price = block(billingCss, ".bill-price");
    expect(price).toMatch(/white-space:\s*nowrap/);
  });

  it("the G heads are opaque panels — no backdrop-filter surface in billing.css", () => {
    /* Owner's bleed-through rule, verified at creation time (M-216):
       the sheet panel is the family's opaque slab, and the G column
       heads bottom out on a solid token — no translucent fill, no
       blur standing in for a surface. sheet.guard's census pins the
       winning background; this pins the absence of blur here. */
    expect(billingCss).not.toContain("backdrop-filter");
    const head = block(billingCss, ".bill-g-head {");
    expect(head).toMatch(/background:\s*var\(--surface-2\)/);
  });

  it("plan states wear the state treatment, not the gold action fill", () => {
    /* The gold gradient is the action language; a state that does
       nothing must not wear it. In design G the state is a disabled
       button (one button per column keeps the pair composed), in
       the sage state treatment the card-era badge carried. */
    const state = block(billingCss, ".bill-btn-state");
    expect(state).not.toContain("gold-gradient");
    expect(state).toMatch(/border:\s*1px solid/);
    expect(sheetTsx).toContain("bill-btn-state");
  });
});
