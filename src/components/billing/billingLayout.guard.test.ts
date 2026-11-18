import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Paywall layout guards — the 2026-11-18 owner screenshots.
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
 * region, the period toggle is centred, and the plan-card buttons pin to
 * the card foot so the pair composes as one unit.
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

  it("plan states are status badges, not the gold action treatment", () => {
    /* The gold gradient is the action language; a state that does
       nothing must not wear it. The badge is pinned to the card foot
       on the same margin rule as the real button. */
    const status = block(billingCss, ".bill-card-status");
    expect(status).not.toContain("gold-gradient");
    expect(status).toMatch(/border:\s*1px solid/);
    const pin = block(billingCss, ".bill-card .bill-card-status");
    expect(pin).toMatch(/margin-top:\s*auto/);
    expect(sheetTsx).toContain("bill-card-status");
  });

  it("plan-card buttons pin to the card foot, aligned across the pair", () => {
    /* ".bill-card {" with its brace — ".bill-cards" precedes it in the
       file and would otherwise match the prefix. */
    const card = block(billingCss, ".bill-card {");
    expect(card).toMatch(/display:\s*flex/);
    expect(card).toMatch(/flex-direction:\s*column/);
    const btn = block(billingCss, ".bill-card .bill-btn");
    expect(btn).toMatch(/margin-top:\s*auto/);
  });
});
