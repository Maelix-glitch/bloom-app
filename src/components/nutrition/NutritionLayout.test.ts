import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nutrition layout — the tab page takes the app-wide container (N-WIDE,
 * as superseded by Brief v6 Slice 2, 2026-11-19).
 *
 * History: the tab page once held its own 1120px measure, then the
 * owner's 2026-11-17 directive ("the cards are not wide enough") raised
 * every main tab page to 1280px, scoped to the .nut-page class so the
 * clinician report kept its 880px document measure. Brief v6 §2
 * supersedes that directive: ONE container for every page —
 * `--container: 1120px`, centred, 24px gutters (M-76, resolved by v6).
 * The tab now consumes the token under the same .nut-page scope; the
 * report's 880px document measure is unchanged, and the stylesheet is
 * still loaded only by the /nutrition route. The app-wide pin lives in
 * src/lib/shell.guard.test.ts; this file keeps the Nutrition-specific
 * half: the scope split between tab and report.
 */

const SRC = join(process.cwd(), "src");
const css = readFileSync(join(SRC, "styles", "nutrition.css"), "utf8");

function block(selector: RegExp): string {
  const match = css.match(selector);
  if (!match?.[1]) throw new Error(`rule not found: ${selector}`);
  return match[1];
}

describe("Nutrition layout: the container is scoped to the tab page", () => {
  it("the base .nut-wrap keeps the 880px document measure", () => {
    const base = block(/\.nut-wrap\s*\{([^}]*)\}/);
    expect(base).toContain("max-width: 880px");
    expect(base).not.toContain("1280px");
    expect(base).not.toContain("var(--container)");
  });

  it("the container lives only under .nut-page, from the shared token", () => {
    const wide = block(/\.nut-wrap\.nut-page\s*\{([^}]*)\}/);
    expect(wide).toContain("max-width: var(--container)");
    expect(wide).toContain("padding-inline: var(--space-5)");
    /* The superseded 1280px measure occurs nowhere in the stylesheet,
       and the token is consumed exactly once — under the page scope. */
    expect(css.match(/max-width: 1280px/g)).toBeNull();
    expect(css.match(/max-width: var\(--container\)/g)).toHaveLength(1);
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
