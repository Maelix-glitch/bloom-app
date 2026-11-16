import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nutrition UI guard — the lib's labelling rule, pinned at the surface.
 *
 * The nutrition lib hands the UI nutrients only as labelled bundles
 * (`labelledFoodNutrients` / `labelledEntryNutrients`) and owns every
 * nutrient computation (per-100 g scaling, totals, target comparison).
 * If a component ever reaches into a food's per-100 g profile itself, it
 * can produce a number with no provenance label and maths that can drift
 * from the lib's — the two failure modes the module exists to prevent.
 * These scans keep the surface honest: components and the hook may
 * format amounts and read servings, but per-100 g values are only ever
 * read through the lib's accessors, and the input object the custom-food
 * form assembles is data entry, not computation.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const toRel = (p: string) => p.slice(SRC.length + 1).split(sep).join("/");

const SURFACE_FILES = [
  ...walk(join(SRC, "components", "nutrition")),
  join(SRC, "hooks", "useNutrition.ts"),
];

describe("Nutrition guard: the surface consumes the lib, never re-derives it", () => {
  it("no component or hook reads a per-100 g profile directly", () => {
    const offenders = SURFACE_FILES.filter((f) =>
      /per100g\s*\./.test(readFileSync(f, "utf8")),
    ).map(toRel);
    expect(
      offenders,
      "reading per100g.* in the UI bypasses the labelled bundle — use labelledFoodNutrients / entryNutrientsFor from the lib",
    ).toEqual([]);
  });

  it("the page, sheet and cards build on the nutrition lib", () => {
    for (const rel of [
      "components/nutrition/NutritionPage.tsx",
      "components/nutrition/AddFoodSheet.tsx",
      "components/nutrition/NutritionEntryCards.tsx",
    ]) {
      const source = readFileSync(join(SRC, rel), "utf8");
      expect(source, rel).toContain('from "@/hooks/useNutrition"');
    }
    /* The page and the sheet also take labelled bundles and entry maths
       straight from the lib; the cards need nothing beyond the hook. */
    for (const rel of [
      "components/nutrition/NutritionPage.tsx",
      "components/nutrition/AddFoodSheet.tsx",
    ]) {
      const source = readFileSync(join(SRC, rel), "utf8");
      expect(source, rel).toContain('from "@/lib/nutrition"');
    }
  });

  it("every nutrient number in the day view arrives via a labelled bundle", () => {
    /* N-UI moved the entry rows from the page into the Timeline; the
       rule is unchanged — the component that renders entry numbers
       reads them through the labelled bundle. */
    const timeline = readFileSync(
      join(SRC, "components", "nutrition", "NutritionTimeline.tsx"),
      "utf8",
    );
    expect(timeline).toContain("labelledEntryNutrients");
    const sheet = readFileSync(join(SRC, "components", "nutrition", "AddFoodSheet.tsx"), "utf8");
    expect(sheet).toContain("labelledFoodNutrients");
  });
});
