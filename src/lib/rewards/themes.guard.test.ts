import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CATALOG } from "./catalog";
import { THEME_ART } from "./themeArt";
import { THEME_PALETTE_IDS, themePalette } from "./themePalettes";

/**
 * Themes guard (M-237).
 *
 * The approved line-up is twelve founded themes. A theme only counts as
 * shipped when all three of its parts exist together:
 *
 *   1. a catalogue entry (kind "theme") in the rewards catalog, free
 *      at 0 points (owner decision, 2026-11-24, M-238: the twelve base
 *      themes are free for every user; M-237's 850 points was
 *      superseded before ship, and premium themes will be a later,
 *      separate set);
 *   2. a complete token block in src/styles.css (all seven tokens the
 *      theme system restyles);
 *   3. a complete art set in THEME_ART, with the three artwork files
 *      really on disk under src/assets/themes/<slug>/.
 *
 * The blue-violet band pin for theme surfaces lives in
 * noViolet.guard.test.ts (M-236) and runs over every block found here.
 */

const SRC = join(process.cwd(), "src");
const TOKENS = [
  "--background",
  "--surface",
  "--surface-2",
  "--surface-3",
  "--border",
  "--border-strong",
  "--accent-secondary",
];

const themes = CATALOG.components.filter((c) => c.kind === "theme");

describe("M-237 · the twelve founded themes are complete", () => {
  it("the catalogue carries exactly the twelve approved themes, free at 0 points", () => {
    expect(themes.map((t) => t.id).sort()).toEqual(
      [
        "th-brass-lamp",
        "th-cedar-shelf",
        "th-clay-court",
        "th-dusk-rose",
        "th-ember",
        "th-honey-hour",
        "th-ink-serenity",
        "th-midnight-tide",
        "th-moss-rest",
        "th-rain-leaf",
        "th-rosewood",
        "th-velvet-night",
      ].sort(),
    );
    for (const theme of themes) {
      expect(theme.points, theme.id).toBe(0);
      expect(theme.rarity, theme.id).toBe("premium");
    }
  });

  it("every theme has a complete token block in styles.css", () => {
    const css = readFileSync(join(SRC, "styles.css"), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    for (const theme of themes) {
      const block =
        css.match(
          new RegExp(`html\\[data-bloom-theme="${theme.id}"\\]\\s*\\{[^}]*\\}`),
        )?.[0] ?? "";
      expect(block, theme.id).not.toBe("");
      for (const token of TOKENS) {
        expect(block, `${theme.id} ${token}`).toContain(`${token}:`);
      }
    }
  });

  it("every theme has a complete art set and the files exist", () => {
    for (const theme of themes) {
      const set = THEME_ART[theme.id];
      expect(set, theme.id).toBeDefined();
      expect(set!.sidebar, theme.id).toBeTruthy();
      expect(set!.overview, theme.id).toBeTruthy();
      expect(set!.mood, theme.id).toBeTruthy();
      const slug = theme.id.replace(/^th-/, "");
      for (const slot of ["sidebar", "overview", "mood"] as const) {
        const path = join(SRC, "assets", "themes", slug, `${slot}.webp`);
        expect(existsSync(path), `${theme.id} ${slot}`).toBe(true);
      }
    }
    // No orphan art sets for themes the catalogue does not carry.
    expect(Object.keys(THEME_ART).sort()).toEqual(
      themes.map((t) => t.id).sort(),
    );
  });

  it("the gallery palette module mirrors styles.css value for value (M-238)", () => {
    const css = readFileSync(join(SRC, "styles.css"), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    expect(THEME_PALETTE_IDS.sort()).toEqual(themes.map((t) => t.id).sort());
    for (const theme of themes) {
      const block =
        css.match(
          new RegExp(`html\\[data-bloom-theme="${theme.id}"\\]\\s*\\{[^}]*\\}`),
        )?.[0] ?? "";
      const palette = themePalette(theme.id);
      expect(palette, theme.id).toHaveLength(TOKENS.length);
      for (const entry of palette) {
        expect(entry.value, `${theme.id} ${entry.token}`).not.toBe("");
        expect(block, `${theme.id} ${entry.token}`).toContain(
          `${entry.token}: ${entry.value};`,
        );
      }
    }
  });

  it("no catalogue copy reaches for a sky or blue accent that no longer exists", () => {
    for (const theme of themes) {
      const words = `${theme.intent} ${theme.detail}`.toLowerCase();
      expect(words, theme.id).not.toContain("sky accent");
      expect(words, theme.id).not.toContain("ink-blue");
      expect(words, theme.id).not.toContain("deep blue");
    }
  });
});
