import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nutrition layout — the wide measure is the tab's alone (N-WIDE).
 *
 * The owner drew the Nutrition cards wide (prototype page container:
 * max-width 1120px, 20px gutters, 48px from lg) and Bloom's tab was
 * rendering in the 880px document measure the clinician report uses.
 * The widening is therefore scoped to a page class the tab's root
 * carries and the report does not: the base .nut-wrap measure stays
 * 880px, the 1120px value exists only under .nut-page, and the
 * stylesheet itself is loaded only by the /nutrition route — no other
 * tab can pick the width up.
 */

const SRC = join(process.cwd(), "src");
const css = readFileSync(join(SRC, "styles", "nutrition.css"), "utf8");

function block(selector: RegExp): string {
  const match = css.match(selector);
  if (!match?.[1]) throw new Error(`rule not found: ${selector}`);
  return match[1];
}

describe("Nutrition layout: the wide measure is scoped to the tab page", () => {
  it("the base .nut-wrap keeps the 880px document measure", () => {
    const base = block(/\.nut-wrap\s*\{([^}]*)\}/);
    expect(base).toContain("max-width: 880px");
    expect(base).not.toContain("1120px");
  });

  it("the wide measure lives only under .nut-page, at the prototype's values", () => {
    const wide = block(/\.nut-wrap\.nut-page\s*\{([^}]*)\}/);
    expect(wide).toContain("max-width: 1120px");
    expect(wide).toContain("padding-inline: var(--space-5)");
    const wideLg = block(
      /@media \(min-width: 1024px\)\s*\{\s*\.nut-wrap\.nut-page\s*\{([^}]*)\}/,
    );
    expect(wideLg).toContain("padding-inline: var(--space-12)");
    /* The declaration occurs once in the whole stylesheet — under the
       page scope, nowhere else. */
    expect(css.match(/max-width: 1120px/g)).toHaveLength(1);
  });

  it("the tab page carries the scope and the report does not", () => {
    const page = readFileSync(
      join(SRC, "components", "nutrition", "NutritionPage.tsx"),
      "utf8",
    );
    expect(page).toContain('className="nut-wrap nut-page"');
    const report = readFileSync(
      join(SRC, "components", "nutrition", "NutritionReportPage.tsx"),
      "utf8",
    );
    expect(report).toContain('className="nut-wrap nut-report"');
    expect(report).not.toContain("nut-page");
  });

  it("the stylesheet is loaded by the /nutrition route only", () => {
    const routesDir = join(SRC, "routes");
    const loaders = readdirSync(routesDir).filter(
      (name) =>
        statSync(join(routesDir, name)).isFile() &&
        readFileSync(join(routesDir, name), "utf8").includes("styles/nutrition.css"),
    );
    expect(loaders).toEqual(["nutrition.tsx"]);
  });
});
