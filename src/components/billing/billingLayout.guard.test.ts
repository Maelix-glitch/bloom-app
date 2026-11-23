import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Paywall layout guards — the 2026-11-18 owner screenshots, carried
 * through design G (M-216) into design A (M-220).
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
 * families: the stack owns a real inset and lives inside the shell's
 * scroll region. M-220 replaced design G's comparison composition with
 * design A, "The Invitation" (owner pick, 2026-11-23, copied exactly
 * from the approved preview), so the G pins became A pins: the panel
 * wears the preview's ink ground, the four glows ride inside it, the
 * column is the preview's 340px measure, the rows and the gold pill
 * carry the preview's literal values, and the owner's glass drop-down
 * is present — as the glass.css material consumed by class, never
 * re-tokenised in this stylesheet (billing.css stays --lg--free, as
 * glass.guard requires of the sheet kit).
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

/* The preview's gold gradient, in the house token form (the M-206
   drift discipline: values live on token definition lines). The
   tokens' values ARE the preview's stops — pinned at their birth
   lines in the test below. */
const PREVIEW_GOLD_GRADIENT =
  "linear-gradient(180deg, var(--gold-grad-hi) 0%, var(--gold) 55%, var(--gold-grad-lo) 100%)";
const stylesCss = read("styles.css");

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

  it("design A: the panel wears the preview's ink ground, opaque", () => {
    /* The preview's stage ground is ink #0a0b0e — the house
       --background token's exact value. The panel stays the family's
       opaque slab (sheet.guard censuses this class); only its tone
       is the design's. */
    const panel = block(billingCss, ".bsheet-panel.bill-a-panel {");
    expect(panel).toMatch(/background:\s*var\(--background\)/);
    expect(sheetTsx).toContain('panelClassName="bill-a-panel"');
  });

  it("design A: the preview's four corner glows ride inside the panel", () => {
    expect(sheetTsx).toContain("bill-a-glows");
    for (const glow of [
      ".bill-a-glow--gold-tl",
      ".bill-a-glow--sage-r",
      ".bill-a-glow--rose-bl",
      ".bill-a-glow--gold-br",
    ]) {
      expect(billingCss, `${glow} must be defined`).toContain(glow);
    }
    expect(billingCss).toContain("blur(70px)");
    /* The preview's own radial stops. */
    expect(billingCss).toContain("rgba(246, 233, 205, 0.5)");
    expect(billingCss).toContain("rgba(143, 199, 162, 0.42)");
    expect(billingCss).toContain("rgba(227, 145, 159, 0.34)");
  });

  it("design A: the column is the preview's 340px measure, centred", () => {
    const wrap = block(billingCss, ".bill-a-wrap");
    expect(wrap).toMatch(/max-width:\s*340px/);
    expect(wrap).toMatch(/margin:\s*0 auto/);
    expect(sheetTsx).toContain("bill-a-wrap");
  });

  it("design A: the headline is the preview's Fraunces at 37px, its words verbatim", () => {
    const title = block(billingCss, ".bill-a-title");
    expect(title).toMatch(/font-family:\s*var\(--font-display\)/);
    expect(title).toMatch(/font-size:\s*37px/);
    expect(title).toMatch(/font-weight:\s*500/);
    expect(sheetTsx).toContain("full bloom.");
    expect(sheetTsx).toContain("upgrading only opens more of the garden");
  });

  it("design A: the rows are the preview's radio rows at 18px radius", () => {
    const row = block(billingCss, ".bill-a-row {");
    expect(row).toMatch(/border-radius:\s*18px/);
    expect(row).toMatch(/background:\s*rgba\(23, 25, 31, 0\.72\)/);
    expect(row).toMatch(/padding:\s*15px 16px/);
    const chosen = block(billingCss, '.bill-a-row[aria-checked="true"] {');
    expect(chosen).toMatch(/border-color:\s*rgba\(220, 192, 143, 0\.65\)/);
    expect(sheetTsx).toContain('role="radio"');
    expect(sheetTsx).toContain("data-plan-row");
    /* Prices never wrap mid-figure. */
    const amt = block(billingCss, ".bill-a-amt");
    expect(amt).toMatch(/white-space:\s*nowrap/);
  });

  it("design A: the gold tokens the design consumes carry the preview's exact stops", () => {
    /* The gradient stops and the pill radius, at their definition
       lines in the token home — the values the preview printed as
       literals, unchanged. */
    expect(stylesCss).toMatch(/--gold-grad-hi:\s*#f6e9cd/);
    expect(stylesCss).toMatch(/--gold:\s*#dcc08f/);
    expect(stylesCss).toMatch(/--gold-grad-lo:\s*#c79d62/);
    expect(stylesCss).toMatch(/--gold-soft:\s*#f2e4c6/);
    expect(stylesCss).toMatch(/--radius-pill:\s*999px/);
    /* The scoped values the shared scale does not hold are born on
       the wrap: the on-gold ink and the orb's stops, verbatim. */
    const wrap = block(billingCss, ".bill-a-wrap");
    expect(wrap).toMatch(/--bill-a-on-gold:\s*#221806/);
    expect(wrap).toMatch(/--bill-a-orb-hi:\s*#f6e9cd/);
    expect(wrap).toMatch(/--bill-a-orb-mid:\s*#dcc08f/);
    expect(wrap).toMatch(/--bill-a-orb-sage:\s*#8fae94/);
    expect(wrap).toMatch(/--bill-a-orb-deep:\s*#5f7a63/);
    expect(wrap).toMatch(/--bill-a-orb-core:\s*#f8eed3/);
    /* The orb's stops ride those tokens by class, never literals. */
    expect(sheetTsx).toContain('className="orb-s0"');
    expect(sheetTsx).toContain('className="bill-a-orb-core"');
    expect(sheetTsx).not.toContain("stopColor");
  });

  it("design A: the period toggle's chosen side wears the preview's gold gradient", () => {
    const pressed = block(billingCss, '.bill-toggle button[aria-pressed="true"]');
    expect(pressed).toContain(PREVIEW_GOLD_GRADIENT);
    expect(pressed).toMatch(/color:\s*var\(--bill-a-on-gold\)/);
    expect(sheetTsx).toContain("bill-a-period-note");
  });

  it("design A: the one gold pill carries the preview's gradient, ink and shadow", () => {
    const cta = block(billingCss, ".bill-a-cta {");
    expect(cta).toContain(PREVIEW_GOLD_GRADIENT);
    expect(cta).toMatch(/color:\s*var\(--bill-a-on-gold\)/);
    expect(cta).toMatch(/border-radius:\s*var\(--radius-pill\)/);
    /* 15px over --space-5 (1.5rem = 24px): the preview's padding. */
    expect(cta).toMatch(/padding:\s*15px var\(--space-5\)/);
    expect(cta).toContain("0 12px 30px rgba(199, 157, 98, 0.28)");
  });

  it("plan states wear the state treatment, not the gold action fill", () => {
    /* The gold gradient is the action language; a state that does
       nothing must not wear it. In design A the state is the same
       pill, disabled, in the sage state treatment. */
    const state = block(billingCss, ".bill-a-cta--state");
    expect(state).not.toContain("#f6e9cd");
    expect(state).toMatch(/border:\s*1px solid/);
    expect(state).toMatch(/color:\s*var\(--sage\)/);
    expect(sheetTsx).toContain("bill-a-cta--state");
  });

  it("the owner's amendment: the glass drop-down lives under the selected row", () => {
    /* The drop-down wears the app's one glass material by CLASS
       (glass.css) — the single recorded exception to glass never
       entering a sheet (M-220). billing.css itself stays free of
       glass tokens, as glass.guard requires of the sheet kit: the
       material is consumed, never redefined, here. */
    expect(sheetTsx).toContain("glass-panel bill-a-includes");
    expect(sheetTsx).toContain("PAYWALL_BULLETS");
    expect(sheetTsx).toContain("What's included");
    expect(billingCss).not.toContain("--lg-");
    const includes = block(billingCss, ".bill-a-includes {");
    /* 16px over --space-4 (1.125rem = 18px): the layout's padding. */
    expect(includes).toMatch(/padding:\s*16px var\(--space-4\)/);
  });
});
