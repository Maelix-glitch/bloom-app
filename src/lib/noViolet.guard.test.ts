import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * No-violet guard (M-225, extended by M-233 — "total purge, no exemptions").
 *
 * The owner's ruling (2026-11-23, reaffirmed 2026-11-24): every
 * violet/lavender tone is retired from Bloom — not just app chrome. The
 * only colours any surface may use are the brand family — ink, gold,
 * gold-soft, sage, rose, cream (plus the desaturated slate semantic
 * --info/--sky). M-225 exempted the Stories creative tooling and the
 * non-default Cycle gallery themes as "user art"; the owner overruled
 * both exemptions on 2026-11-24 ("the purple or the velvet night color
 * is still there — change it all over"), so this guard now scans the
 * WHOLE src tree, test files included, for:
 *
 *   1. hex colours in the violet band (HSL hue 240–320) at real saturation;
 *   2. rgb()/rgba() colours in the same band at real saturation;
 *   3. oklch colours in the violet band at real chroma;
 *   4. hsl()/hsla() colours in the same band at real saturation;
 *   5. the retired tokens themselves (--violet, --dim-violet, --coach-lav)
 *      being defined or consumed anywhere in non-test source.
 *
 * Stories/Cycle content survives the purge as re-grounded brand-family
 * equivalents: same swatches, presets, filters and themes, same slot
 * counts — and stored ids resolve through the retired-id aliases in
 * src/lib/stories/canvas/backgrounds.ts and src/lib/stories/catalogs.ts.
 * Stored VALUES migrate the way M-225 taught: a stored accent of
 * "violet" reads as gold (src/lib/profile/types.ts, src/lib/home/today.ts,
 * the StoryEditor accent chain) — those string literals are data keys,
 * not paint, and are not scanned here.
 *
 * M-236 adds the surface pin: the band scan above tolerates low-chroma
 * slate (hue 240–255 under its thresholds), which is exactly where
 * Midnight Tide's card surfaces lived (hue 255, chroma ~0.03) — visible
 * as a blue-slate tint on every card, per the owner's 2026-11-24
 * screenshots. So a dedicated test below pins every appearance theme
 * block in styles.css: no background, surface or border token may
 * sit in hue 230–320 at chroma above 0.01, for any theme, present or
 * future.
 *
 * FIXTURE ALLOWLIST (values only — each file must name the retired
 * colours precisely to pin their absence; nothing here renders):
 *   - src/lib/ui.guard.test.ts — carries banned-value fixtures it
 *     asserts are absent from the stylesheets.
 *   - src/lib/profile/presetAvatars.test.ts — negative pin: asserts no
 *     curated avatar tint IS the retired violet #a58bff.
 *   - this file — it names the retired tokens and bands to ban them.
 *
 * Near-black neutrals (lightness < 0.06) are exempt from the hex rule:
 * at that depth a hue reading is channel noise, and Bloom's ink grounds
 * live there. Slate semantics (hue 240–255 at chroma/saturation under the
 * thresholds — the --mp-sad blue-grey, rain-glass tints) stay legal: they
 * read as blue-grey, not violet.
 */

const SRC = join(process.cwd(), "src");

const FIXTURE_FILES = new Set([
  "lib/noViolet.guard.test.ts",
  "lib/ui.guard.test.ts",
  "lib/profile/presetAvatars.test.ts",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(css|ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function stripComments(s: string): string {
  // Block comments only (the cascadeTruth guard's approach) — line-comment
  // stripping would mangle URL strings in TS sources.
  return s.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** HSL of an rgb triple (0–255). Returns [hueDeg, saturation, lightness]. */
function hslOf(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
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

function hsl(hex: string): [number, number, number] {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return hslOf(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}

const inVioletBand = (hue: number, sat: number, light: number) =>
  hue >= 240 && hue <= 320 && sat >= 0.2 && light >= 0.06;

function violetHexes(text: string): string[] {
  const hits: string[] = [];
  for (const m of text.matchAll(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    const [hue, sat, light] = hsl(m[0]);
    if (inVioletBand(hue, sat, light)) hits.push(m[0]);
  }
  return hits;
}

function violetRgbs(text: string): string[] {
  const hits: string[] = [];
  for (const m of text.matchAll(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/g)) {
    const [hue, sat, light] = hslOf(Number(m[1]), Number(m[2]), Number(m[3]));
    if (inVioletBand(hue, sat, light)) hits.push(m[0]);
  }
  return hits;
}

function violetHsls(text: string): string[] {
  const hits: string[] = [];
  for (const m of text.matchAll(/hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/g)) {
    if (inVioletBand(Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100)) hits.push(m[0]);
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
    if (hue > 255 && hue <= 320 && chroma >= 0.02) hits.push(m[0]);
    else if (hue >= 240 && hue <= 255 && chroma >= 0.09) hits.push(m[0]);
  }
  return hits;
}

const violetValues = (text: string) => [
  ...violetHexes(text),
  ...violetRgbs(text),
  ...violetHsls(text),
  ...violetOklch(text),
];

const allFiles = walk(SRC);
const valueFiles = allFiles.filter((p) => !FIXTURE_FILES.has(p.slice(SRC.length + 1)));
const sourceFiles = allFiles.filter((p) => !/\.test\.(ts|tsx)$/.test(p));

describe("M-233 · no violet anywhere in Bloom", () => {
  it("no violet-band colour values in any source or test file", () => {
    const offenders: string[] = [];
    for (const file of valueFiles) {
      const rel = file.slice(SRC.length + 1);
      const text = stripComments(readFileSync(file, "utf8"));
      for (const hit of violetValues(text)) {
        offenders.push(`${rel}: ${hit}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the retired tokens are neither defined nor consumed in source", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      const rel = file.slice(SRC.length + 1);
      const text = stripComments(readFileSync(file, "utf8"));
      for (const token of ["--violet", "--dim-violet", "--coach-lav", "--grad-violet", "--glow-violet"]) {
        if (text.includes(token)) offenders.push(`${rel}: ${token}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every Cycle gallery theme block is violet-free, the default included", () => {
    const css = stripComments(readFileSync(join(SRC, "styles/cycle.css"), "utf8"));
    const blocks = css.match(/\.ci\[data-theme="[a-z-]+"\]\s*\{[^}]*\}/g) ?? [];
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(violetValues(block)).toEqual([]);
      expect(block).not.toContain("--violet");
    }
  });

  it("Velvet Night grounds on warm night ink — no violet-band hue at any chroma", () => {
    const css = stripComments(readFileSync(join(SRC, "styles.css"), "utf8"));
    const block = css.match(/html\[data-bloom-theme="th-velvet-night"\]\s*\{[^}]*\}/)?.[0] ?? "";
    expect(block).not.toBe("");
    expect(violetValues(block)).toEqual([]);
    expect(block).not.toContain("--violet");
    // The owner named this theme: even a trace hue in the violet band fails.
    for (const m of block.matchAll(/oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/g)) {
      const hue = parseFloat(m[1]);
      expect(hue < 240 || hue > 320).toBe(true);
    }
  });

  it("Ink Serenity no longer leans violet (was hue 280 throughout)", () => {
    const css = stripComments(readFileSync(join(SRC, "styles.css"), "utf8"));
    const block = css.match(/html\[data-bloom-theme="th-ink-serenity"\]\s*\{[^}]*\}/)?.[0] ?? "";
    expect(block).not.toBe("");
    expect(violetValues(block)).toEqual([]);
  });

  it("no appearance theme tints its card surfaces blue-violet (M-236 surface pin)", () => {
    const css = stripComments(readFileSync(join(SRC, "styles.css"), "utf8"));
    const blocks = css.match(/html\[data-bloom-theme="[a-z-]+"\]\s*\{[^}]*\}/g) ?? [];
    // The six known themes must all be found, so this pin can never pass
    // vacuously on a broken match.
    expect(blocks.length).toBeGreaterThanOrEqual(6);
    expect(blocks.some((b) => b.includes("th-midnight-tide"))).toBe(true);
    const surfaceTokens = [
      "--background",
      "--surface",
      "--surface-2",
      "--surface-3",
      "--border",
      "--border-strong",
    ];
    const offenders: string[] = [];
    for (const block of blocks) {
      const theme = block.match(/data-bloom-theme="([a-z-]+)"/)?.[1] ?? "?";
      for (const token of surfaceTokens) {
        const decl = block.match(
          new RegExp(`${token}:\\s*oklch\\(\\s*([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)`),
        );
        if (!decl) continue;
        const chroma = parseFloat(decl[2]);
        const hue = parseFloat(decl[3]);
        if (hue >= 230 && hue <= 320 && chroma > 0.01) {
          offenders.push(`${theme} ${token}: oklch(${decl[1]} ${decl[2]} ${decl[3]})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("Midnight Tide grounds on wet stone, hue 160 at a trace of chroma (M-237, superseding M-236)", () => {
    const css = stripComments(readFileSync(join(SRC, "styles.css"), "utf8"));
    const block = css.match(/html\[data-bloom-theme="th-midnight-tide"\]\s*\{[^}]*\}/)?.[0] ?? "";
    expect(block).not.toBe("");
    // M-236 landed Tide on warm ink (hue 85) as an interim re-ground.
    // M-237 gives it the approved founded end state: wet stone, hue 160,
    // chroma at most 0.007, compressed steps, cut-edge border-strong.
    for (const step of ["0.165", "0.195", "0.22", "0.245", "0.34", "0.4"]) {
      expect(block).toContain(`oklch(${step} `);
    }
    for (const m of block.matchAll(/oklch\(\s*[\d.]+\s+([\d.]+)\s+([\d.]+)/g)) {
      expect(parseFloat(m[2])).toBe(160);
      expect(parseFloat(m[1])).toBeLessThanOrEqual(0.012);
    }
    expect(block).toContain("--accent-secondary: oklch(0.86 0.012 160)");
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
