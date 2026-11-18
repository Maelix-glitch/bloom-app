import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Profile Account-nav guards (senior audit slice C, Plan A — organise in
 * place). The settings half of /profile carries a local nav whose chips are
 * anchors to section ids. These pins keep the three sides of that contract
 * from drifting apart:
 *   1. every nav entry points at a real section, in the same order, and the
 *      section carries .pf-jump (the scroll-margin class);
 *   2. the jump margin always clears the sticky tabs bar — 6px top padding
 *      + a 44px tab + its 1px rule ≈ 51px, plus the 60px phone brand bar
 *      (--bloom-header-h) the bar sticks under at ≤1023px: obstruction
 *      51px / 111px, so the margins must stay ≥ 60px / ≥ 120px;
 *   3. the chips keep the 44px touch floor (--bloom-touch-min).
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ");

const tsx = read("routes/profile.tsx");
const css = stripComments(read("styles/profile.css"));

const navEntries = [...tsx.matchAll(/\{\s*id: "(pf-[a-z-]+)", label: "([^"]+)" \}/g)].map((m) => ({
  id: m[1]!,
  label: m[2]!,
}));

const jumpSections = [...tsx.matchAll(/<section\s+id="(pf-[a-z-]+)"\s+className="[^"]*pf-jump/g)].map(
  (m) => m[1]!,
);

describe("profile account nav", () => {
  it("renders the nav from ACCOUNT_NAV as labelled anchors", () => {
    expect(tsx).toContain('aria-label="Account sections"');
    expect(tsx).toContain("ACCOUNT_NAV.map");
    expect(tsx).toContain("pf-account-chip");
    expect(navEntries.length).toBeGreaterThanOrEqual(4);
  });

  it("every nav entry lands on a .pf-jump section, in page order", () => {
    expect(jumpSections).toEqual(navEntries.map((e) => e.id));
  });

  it("jump margins clear the sticky tabs bar at both sticky offsets", () => {
    const margins = [...css.matchAll(/\.pf-jump\s*\{\s*scroll-margin-top:\s*(\d+)px/g)].map((m) =>
      Number(m[1]),
    );
    expect(margins.length).toBe(2);
    expect(margins[0]).toBeGreaterThanOrEqual(60);
    expect(margins[1]).toBeGreaterThanOrEqual(120);
    expect(margins[1]!).toBeGreaterThan(margins[0]!);
  });

  it("nav chips keep the touch floor", () => {
    const chip = /\.pf-account-chip\s*\{([^}]*)\}/.exec(css);
    expect(chip).not.toBeNull();
    expect(chip![1]).toContain("min-height: var(--bloom-touch-min)");
  });
});
