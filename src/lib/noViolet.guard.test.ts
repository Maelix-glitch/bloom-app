import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * No-violet guard (M-225, "Slop removal").
 *
 * The owner's ruling (2026-11-23): every violet/lavender tone is retired
 * from Bloom's UI chrome. The only colours chrome may use are the brand
 * family — ink, gold, gold-soft, sage, rose, cream (plus the desaturated
 * slate semantic --info/--sky). This guard scans the actual source files
 * (comments stripped — prose history is not paint) for:
 *
 *   1. hex colours in the violet band (HSL hue 240–300) at real saturation;
 *   2. oklch colours in the violet band at real chroma;
 *   3. the retired tokens themselves (--violet, --dim-violet, --coach-lav)
 *      being defined or consumed anywhere in chrome source.
 *
 * ALLOWLIST (each with its justification — user content and opt-in theme
 * art are not app chrome):
 *   - src/components/stories/** and src/lib/stories/** — the Stories
 *     creative tooling: canvas backgrounds, paint/text/sticker palettes
 *     are colours the USER picks for their own story art.
 *   - The non-default Cycle gallery themes in src/styles/cycle.css
 *     ([data-theme="orchid"|"tide"|"fern"|"aurora"|"daybreak"|"ember"|"ink"])
 *     and their metadata in src/lib/cycle/themes.ts — opt-in theme art the
 *     user picks in the style gallery. The DEFAULT theme (nocturne) is
 *     pinned separately below: it must stay on house tokens.
 *   - Test files — fixtures may carry legacy stored values (e.g. a stored
 *     accent of "violet") precisely to prove the migration paths.
 *
 * Near-black neutrals (lightness < 0.06) are exempt from the hex rule:
 * at that depth a hue reading is channel noise, and Bloom's ink grounds
 * live there. Slate semantics (hue 240–255 at chroma/saturation under the
 * thresholds — the --mp-sad blue-grey, rain-glass tints) stay legal: they
 * read as blue-grey, not violet.
 */

const SRC = join(process.cwd(), "src");

const ALLOWLISTED_PREFIXES = ["components/stories/", "lib/stories/"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(css|ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function stripComments(s: string): string {
  // Block comments only (the cascadeTruth guard's approach) — line-comment
  // stripping would mangle URL strings in TS sources.
  return s.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** HSL of a #rgb/#rrggbb hex. Returns [hueDeg, saturation, lightness]. */
function hsl(hex: string): [number, number, number] {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = 0;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) hue = ((b - r) / d + 2) * 60;
  else hue = ((r - g) / d + 4) * 60;
  return [hue, s, l];
}

function violetHexes(text: string): string[] {
  const hits: string[] = [];
  for (const m of text.matchAll(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    const [hue, sat, light] = hsl(m[0]);
    if (hue >= 240 && hue <= 300 && sat >= 0.2 && light >= 0.06) hits.push(m[0]);
  }
  return hits;
}

function violetOklch(text: string): string[] {
  const hits: string[] = [];
  for (const m of text.matchAll(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/g)) {
    const chroma = parseFloat(m[2]);
    const hue = parseFloat(m[3]);
    // True violet band at any real chroma; the blue-violet edge (240–255)
    // only counts at high chroma so slate semantics stay legal.
    if (hue > 255 && hue <= 300 && chroma >= 0.02) hits.push(m[0]);
    else if (hue >= 240 && hue <= 255 && chroma >= 0.09) hits.push(m[0]);
  }
  return hits;
}

const files = walk(SRC).filter((p) => {
  const rel = p.slice(SRC.length + 1);
  return !ALLOWLISTED_PREFIXES.some((prefix) => rel.startsWith(prefix));
});

describe("M-225 · no violet in UI chrome", () => {
  it("no violet-band hex or oklch values in chrome source", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = file.slice(SRC.length + 1);
      // The non-default Cycle gallery themes are opt-in theme art (see header).
      if (rel === "styles/cycle.css" || rel === "lib/cycle/themes.ts") continue;
      const text = stripComments(readFileSync(file, "utf8"));
      for (const hit of [...violetHexes(text), ...violetOklch(text)]) {
        offenders.push(`${rel}: ${hit}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the retired tokens are neither defined nor consumed in chrome source", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = file.slice(SRC.length + 1);
      const text = stripComments(readFileSync(file, "utf8"));
      for (const token of ["--violet", "--dim-violet", "--coach-lav", "--grad-violet", "--glow-violet"]) {
        if (text.includes(token)) offenders.push(`${rel}: ${token}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the default Cycle theme (nocturne) carries no violet literals", () => {
    const css = stripComments(readFileSync(join(SRC, "styles/cycle.css"), "utf8"));
    const blocks = css.match(/\.ci\[data-theme="nocturne"\]\s*\{[^}]*\}/g) ?? [];
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(violetHexes(block)).toEqual([]);
      expect(violetOklch(block)).toEqual([]);
      expect(block).not.toContain("--violet");
    }
  });

  it("Velvet Night re-grounds on neutral ink, not hue-290 violet", () => {
    const css = stripComments(readFileSync(join(SRC, "styles.css"), "utf8"));
    const block = css.match(/html\[data-bloom-theme="th-velvet-night"\]\s*\{[^}]*\}/)?.[0] ?? "";
    expect(block).not.toBe("");
    expect(violetOklch(block)).toEqual([]);
    expect(violetHexes(block)).toEqual([]);
    expect(block).not.toContain("--violet");
  });

  it("the grocery group icons are glyphs, never raw emoji", () => {
    const journey = readFileSync(join(SRC, "lib/grocery/journey.ts"), "utf8");
    for (const emoji of ["🥬", "🍗", "🥛", "🫒", "🌿"]) {
      expect(journey).not.toContain(emoji);
    }
  });

  it(".home-panel carries no backdrop blur (glass is the floating layer only)", () => {
    const css = stripComments(readFileSync(join(SRC, "styles.css"), "utf8"));
    const block = css.match(/\.home-panel\s*\{[^}]*\}/)?.[0] ?? "";
    expect(block).not.toBe("");
    expect(block).not.toContain("backdrop-filter");
  });
});
