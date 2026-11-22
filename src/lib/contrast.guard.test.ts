import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * WCAG AA contrast guards (dark-mode audit, 2026-11-18; audit item 58).
 *
 * Bloom is a dark-theme app. This guard recomputes the real text/background
 * pairings from the token sources — the same pairings the audit measured —
 * and fails if any of them drops below WCAG AA (4.5:1 for normal text;
 * placeholder text is held to the same floor). It exists so a future
 * palette tweak cannot silently regress readability: before this audit,
 * twenty pairings failed, most of them one shared recipe (foreground
 * color-mixes at 30–48%) repeated across the sheets.
 *
 * Method, matching the audit exactly:
 *   - Ratios use the WCAG 2.x relative-luminance formula.
 *   - `color-mix(in oklab, …)` is resolved in oklab per CSS Color 5, then
 *     alpha-composited (source-over) onto the pairing's ground.
 *   - Text on the house surfaces sits on glass cards: the card fill is the
 *     surface token under the 5%-white top stop of --glass-bg, so house
 *     text is judged on min(raw surface, glass composite). The method is
 *     calibrated against the house's own recorded measurements in
 *     styles.css (--faint 4.97:1 and --faint-strong 6.82:1 "on --surface"
 *     reproduce only on the glass composite).
 *   - Scoped systems (Cycle, Coach, the add-habit modal, the admin panel,
 *     the access gate) are judged on their own flat grounds.
 *
 * Deliberately NOT guarded (documented exemptions from the audit):
 * disabled/inactive states (WCAG 1.4.3 exempts them), the unearned-
 * achievement dimming in progression.css (names stay full-contrast; only
 * the icon glyphs and rarity tag are dimmed), decorative separators and
 * glows, and Stories text over user photography (unknowable ground — the
 * editor chrome over known tokens is covered by the token pairings).
 */

const SRC = join(process.cwd(), "src");
const css = (p: string) =>
  readFileSync(join(SRC, p), "utf8").replace(/\/\*[\s\S]*?\*\//g, " ");

/* ---------------- token extraction ---------------- */

function blockWith(text: string, needle: string): string | null {
  const idx = text.indexOf(needle);
  if (idx < 0) return null;
  let best: [number, number] | null = null;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;
    let depth = 0;
    for (let j = i; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}" && --depth === 0) {
        if (i < idx && idx < j && (!best || j - i < best[1] - best[0])) best = [i, j];
        break;
      }
    }
  }
  return best ? text.slice(best[0] + 1, best[1]) : null;
}

function blockAfter(text: string, sel: string): string | null {
  const i = text.indexOf(sel);
  if (i < 0) return null;
  const open = text.indexOf("{", i);
  let depth = 0;
  for (let j = open; j < text.length; j++) {
    if (text[j] === "{") depth++;
    else if (text[j] === "}" && --depth === 0) return text.slice(open + 1, j);
  }
  return null;
}

function defs(block: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!block) return out;
  for (const m of block.matchAll(/--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1] as string] = (m[2] as string).trim();
  return out;
}

/** The `color:` value of the first rule whose selector contains `sel`. */
function ruleColor(text: string, sel: string): string | null {
  const block = blockAfter(text, sel);
  if (!block) return null;
  const m = block.match(/(?:^|;)\s*color:\s*([^;]+);/);
  return m ? (m[1] as string).trim() : null;
}

const stylesCss = css("styles.css");
const house = defs(blockWith(stylesCss, "--ink:"));
const cycleCss = css("styles/cycle.css");
const ciBase = defs(blockWith(cycleCss, "--ci-bg:"));
const ciOrchid = { ...ciBase, ...defs(blockAfter(cycleCss, '[data-theme="orchid"]')) };
const coach = defs(blockWith(css("styles/coach.css"), "--coach-lav:"));
const ahm = defs(blockWith(css("styles/add-habit-modal.css"), "--ahm-bg:"));
const ap = defs(blockWith(css("styles/admin-panel.css"), "--ap-scrim:"));
const accessCss = css("styles/access.css");

type Scope = Record<string, string>;
const CH: Record<string, Scope[]> = {
  house: [house],
  ci: [ciBase, house],
  orchid: [ciOrchid, house],
  coach: [coach, house],
  ahm: [ahm, house],
  ap: [ap, house],
};

/* ---------------- colour math (WCAG luminance, oklab mixes) ---------------- */

type Col = { rgb: [number, number, number]; a: number };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function srgbToLin(c: number) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linToSrgb(c: number) {
  c = clamp(c, 0, 1);
  return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
}
function rgbToOklab([r, g, b]: [number, number, number]): [number, number, number] {
  const R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function oklabToRgb([L, a, b]: [number, number, number]): [number, number, number] {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    linToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function parseColor(spec: string): Col {
  spec = spec.trim();
  let m: RegExpMatchArray | null;
  if ((m = spec.match(/^#([0-9a-f]{6})$/i))) {
    const h = m[1] as string;
    return { rgb: [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)], a: 1 };
  }
  if ((m = spec.match(/^#([0-9a-f]{3})$/i))) {
    const h = [...(m[1] as string)];
    return {
      rgb: [parseInt((h[0] as string) + h[0], 16), parseInt((h[1] as string) + h[1], 16), parseInt((h[2] as string) + h[2], 16)],
      a: 1,
    };
  }
  if ((m = spec.match(/^rgba?\(([^)]+)\)$/))) {
    const p = (m[1] as string).split(/[,\s/]+/).filter(Boolean).map(Number);
    return { rgb: [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0], a: p[3] ?? 1 };
  }
  if ((m = spec.match(/^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/))) {
    const L = +(m[1] as string), Cc = +(m[2] as string), H = +(m[3] as string);
    const a = m[4] === undefined ? 1 : +m[4];
    const rad = (H * Math.PI) / 180;
    return { rgb: oklabToRgb([L, Cc * Math.cos(rad), Cc * Math.sin(rad)]), a };
  }
  if (spec === "transparent") return { rgb: [0, 0, 0], a: 0 };
  if (spec === "white") return { rgb: [255, 255, 255], a: 1 };
  if (spec === "black") return { rgb: [0, 0, 0], a: 1 };
  throw new Error("unparsed color: " + spec);
}

function splitTop(s: string): string[] {
  const out: string[] = [];
  let d = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") d++;
    if (ch === ")") d--;
    if (ch === "," && d === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
}

function resolve(spec: string, chain: Scope[], depth = 0): Col {
  if (depth > 12) throw new Error("deep: " + spec);
  spec = spec.trim();
  const cm = spec.match(/^color-mix\(in oklab,\s*(.+)\)$/s);
  if (cm) {
    const parts = splitTop(cm[1] as string).map((p) => {
      const mm = p.trim().match(/^(.*?)\s+([\d.]+)%$/);
      return mm ? { spec: mm[1] as string, pct: +(mm[2] as string) as number | null } : { spec: p.trim(), pct: null as number | null };
    });
    const first = parts[0] as { spec: string; pct: number | null };
    const second = parts[1] as { spec: string; pct: number | null };
    if (first.pct === null && second.pct === null) { first.pct = 50; second.pct = 50; }
    if (first.pct === null) first.pct = 100 - (second.pct as number);
    if (second.pct === null) second.pct = 100 - (first.pct as number);
    const sum = (first.pct as number) + (second.pct as number);
    const c1 = resolveColor(first.spec, chain, depth + 1);
    const c2 = resolveColor(second.spec, chain, depth + 1);
    const w1 = (first.pct as number) / sum, w2 = (second.pct as number) / sum;
    const aOut = (Math.min(sum, 100) / 100) * (w1 * c1.a + w2 * c2.a);
    const lab1 = rgbToOklab(c1.rgb), lab2 = rgbToOklab(c2.rgb);
    const den = w1 * c1.a + w2 * c2.a;
    const lab: [number, number, number] =
      den === 0
        ? [0, 0, 0]
        : [
            (w1 * c1.a * lab1[0] + w2 * c2.a * lab2[0]) / den,
            (w1 * c1.a * lab1[1] + w2 * c2.a * lab2[1]) / den,
            (w1 * c1.a * lab1[2] + w2 * c2.a * lab2[2]) / den,
          ];
    return { rgb: oklabToRgb(lab), a: aOut };
  }
  return resolveColor(spec, chain, depth);
}

function resolveColor(spec: string, chain: Scope[], depth = 0): Col {
  spec = spec.trim();
  const vm = spec.match(/^var\(--([a-zA-Z0-9-]+)(?:\s*,\s*(.+))?\)$/s);
  if (vm) {
    const name = vm[1] as string;
    for (const scope of chain) if (scope[name] !== undefined) return resolve(scope[name] as string, chain, depth + 1);
    if (vm[2]) return resolve(vm[2], chain, depth + 1);
    throw new Error("unknown var --" + name);
  }
  if (spec.startsWith("color-mix")) return resolve(spec, chain, depth + 1);
  return parseColor(spec);
}

function over(fg: Col, bg: Col): Col {
  return {
    rgb: [
      fg.rgb[0] * fg.a + bg.rgb[0] * (1 - fg.a),
      fg.rgb[1] * fg.a + bg.rgb[1] * (1 - fg.a),
      fg.rgb[2] * fg.a + bg.rgb[2] * (1 - fg.a),
    ],
    a: 1,
  };
}
function lum({ rgb }: Col) {
  return 0.2126 * srgbToLin(rgb[0]) + 0.7152 * srgbToLin(rgb[1]) + 0.0722 * srgbToLin(rgb[2]);
}
function ratio(fg: Col, bg: Col) {
  const l1 = lum(fg), l2 = lum(bg);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const C = (spec: string, scope = "house") => {
  const chain = CH[scope];
  if (!chain) throw new Error("unknown scope " + scope);
  return resolve(spec, chain);
};
/** A house card ground: the surface token under the glass fill's white top stop. */
const glass = (bgSpec: string) => over({ rgb: [255, 255, 255], a: 0.05 }, C(bgSpec));
const onGround = (fgSpec: string, scope: string, bg: Col) => {
  const fg = C(fgSpec, scope);
  return ratio(fg.a < 1 ? over(fg, bg) : fg, bg);
};

const AA = 4.5;

/* ---------------- the pairings ---------------- */

describe("contrast guard — house tokens", () => {
  it("body, secondary and gold text clear AA on every house ground", () => {
    for (const bg of ["var(--background)", "var(--surface)", "var(--surface-2)", "var(--surface-3)"]) {
      for (const fg of ["var(--foreground)", "var(--text-secondary)", "var(--gold)"]) {
        expect(onGround(fg, "house", C(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(AA);
      }
    }
  });

  it("the quiet text steps clear AA on the grounds they actually sit on", () => {
    /* --faint: background, sidebar, and glass cards over surface/surface-2.
       (Every surface-3 hover ground re-colors its text, so faint never
       renders on surface-3 — see the audit.) */
    for (const bg of [C("var(--background)"), C("var(--sidebar)"), glass("var(--surface)"), glass("var(--surface-2)")]) {
      expect(onGround("var(--faint)", "house", bg), "--faint on a real ground").toBeGreaterThanOrEqual(AA);
    }
    for (const bg of [glass("var(--surface)"), glass("var(--surface-2)"), glass("var(--surface-3)")]) {
      expect(onGround("var(--faint-strong)", "house", bg), "--faint-strong on glass").toBeGreaterThanOrEqual(AA);
    }
  });

  it("ink text clears AA on the gold it sits on", () => {
    for (const stop of ["var(--gold)", "var(--gold-grad-lo)", "var(--gold-grad-hi)"]) {
      expect(onGround("var(--gold-ink)", "house", C(stop)), `gold-ink on ${stop}`).toBeGreaterThanOrEqual(AA);
    }
    expect(onGround("var(--primary-foreground)", "house", C("var(--primary)")), "primary label").toBeGreaterThanOrEqual(AA);
  });
});

describe("contrast guard — the recipes the 2026-11-18 audit lifted", () => {
  it("the eyebrow recipe clears AA on its worst ground (glass over surface-2)", () => {
    const value = ruleColor(stylesCss, "@utility eyebrow");
    expect(value, "eyebrow color declaration").not.toBeNull();
    const pct = value!.match(/var\(--foreground\)\s+([\d.]+)%/);
    expect(pct, "eyebrow must be a foreground percentage mix").not.toBeNull();
    expect(parseFloat(pct![1] as string)).toBeGreaterThanOrEqual(55);
    expect(onGround(value!, "house", glass("var(--surface-2)")), "eyebrow on glass(surface-2)").toBeGreaterThanOrEqual(AA);
  });

  /* Every quiet-text color-mix the audit raised: the percentage floor AND
     the recomputed ratio on the rule's real ground must both hold. */
  const lifted: Array<[string, string, string, number, () => Col]> = [
    // admin panel — flat ground --ap-panel, floor 52%
    ["styles/admin-panel.css", ".adm-search input::placeholder", "ap", 52, () => C("var(--ap-panel)", "ap")],
    ["styles/admin-panel.css", ".adm-kbd", "ap", 52, () => C("var(--ap-panel)", "ap")],
    ["styles/admin-panel.css", ".adm-group-label", "ap", 52, () => C("var(--ap-panel)", "ap")],
    ["styles/admin-panel.css", ".adm-item-detail", "ap", 52, () => C("var(--ap-panel)", "ap")],
    ["styles/admin-panel.css", ".adm-item-route", "ap", 52, () => C("var(--ap-panel)", "ap")],
    ["styles/admin-panel.css", ".adm-empty", "ap", 52, () => C("var(--ap-panel)", "ap")],
    ["styles/admin-panel.css", ".adm-note", "ap", 52, () => C("var(--ap-panel)", "ap")],
    // house sheets and panels — glass over --surface, floor 53%
    ["styles/bloom-sheet.css", ".bedit-field-input::placeholder", "house", 53, () => glass("var(--surface)")],
    ["styles/bloom-sheet.css", ".bedit-field-aside", "house", 53, () => glass("var(--surface)")],
    ["styles/mood.css", ".bmood-note::placeholder", "house", 53, () => glass("var(--surface)")],
    ["styles/mood.css", ".bmood-band-label", "house", 53, () => glass("var(--surface)")],
    ["styles/mood.css", ".bmood-field-label", "house", 53, () => glass("var(--surface)")],
    ["styles/mood.css", ".bmood-more-count", "house", 53, () => glass("var(--surface)")],
    ["styles/mood.css", ".bmood-unit", "house", 53, () => glass("var(--surface)")],
    ["styles/mood.css", ".bmood-danger", "house", 53, () => glass("var(--surface)")],
    ["styles/shell.css", ".ncenter-row-why", "house", 53, () => glass("var(--surface)")],
    ["styles/shell.css", ".ncenter-time", "house", 53, () => glass("var(--surface)")],
    ["styles/shell.css", ".ncenter-day {", "house", 53, () => glass("var(--surface)")],
    ["styles/shell.css", ".ncenter-foot", "house", 53, () => glass("var(--surface)")],
    ["styles/welcome.css", ".wl-summary-row span:first-child", "house", 53, () => glass("var(--surface)")],
    ["styles/progression.css", ".pg-goal-value.is-muted", "house", 53, () => glass("var(--surface)")],
    ["styles/trackers.css", ".tk2-sheet-input::placeholder", "house", 53, () => glass("var(--surface)")],
    // welcome grounds are the bare background, floor 53%
    ["styles/welcome.css", ".wl-eyebrow", "house", 53, () => C("var(--background)")],
    ["styles/welcome.css", ".wl-input::placeholder", "house", 53, () => C("var(--background)")],
    // the mood input's own ground: a 4% foreground wash over --surface
    [
      "styles/mood.css",
      ".bmood-input::placeholder",
      "house",
      53,
      () => over(C("color-mix(in oklab, var(--foreground) 4%, transparent)"), C("var(--surface)")),
    ],
  ];

  it.each(lifted)("%s %s stays at/above its AA floor", (file, selector, scope, floor, ground) => {
    const value = ruleColor(css(file), selector);
    expect(value, `${selector} color declaration`).not.toBeNull();
    const pct = value!.match(/var\(--foreground\)\s+([\d.]+)%/);
    /* A bare number (the old `0.2` in trackers.css) is invalid CSS and
       fails here, as it should: the declaration never reaches a user. */
    expect(pct, `${selector} must be a valid foreground percentage mix`).not.toBeNull();
    expect(parseFloat(pct![1] as string), `${selector} percentage`).toBeGreaterThanOrEqual(floor);
    expect(onGround(value!, scope, ground()), `${selector} ratio`).toBeGreaterThanOrEqual(AA);
  });
});

describe("contrast guard — scoped systems", () => {
  it("the add-habit modal's faint token clears AA on every modal surface", () => {
    for (const bg of ["var(--background)", "var(--surface)", "var(--surface-2)", "var(--surface-3)"]) {
      expect(onGround("var(--ahm-text-faint)", "ahm", C(bg, "ahm")), `ahm-text-faint on ${bg}`).toBeGreaterThanOrEqual(AA);
    }
  });

  it("Coach's primary action carries its label at AA — flat gold, ink text (M-203)", () => {
    /* Re-contracted by M-203 (F-16): the violet action gradient this pin
       used to measure is retired — Coach's primary and send now wear the
       shared Button's pairing, --gold-ink on --gold, the same pairing the
       house proves for the Profile and Nutrition primaries. */
    expect(onGround("var(--gold-ink)", "coach", C("var(--gold)", "coach")), "gold-ink on gold").toBeGreaterThanOrEqual(AA);
  });

  it("Cycle's muted text and input placeholder clear AA in both themes", () => {
    const placeholder = ruleColor(cycleCss, ".ci-input::placeholder");
    expect(placeholder, "ci-input placeholder declaration").not.toBeNull();
    for (const theme of ["ci", "orchid"]) {
      expect(onGround("var(--ci-text-mute)", theme, C("var(--ci-surface)", theme)), `mute on surface [${theme}]`).toBeGreaterThanOrEqual(AA);
      expect(onGround(placeholder!, theme, C("var(--ci-input-bg)", theme)), `placeholder [${theme}]`).toBeGreaterThanOrEqual(AA);
    }
  });

  it("the access gate's quiet label, copy and placeholder clear AA", () => {
    const label = ruleColor(accessCss, ".ag-label");
    const copy = ruleColor(accessCss, ".ag-copy");
    const placeholder = ruleColor(accessCss, ".ag-input::placeholder");
    expect(label && copy && placeholder, "access gate declarations").toBeTruthy();
    expect(onGround(label!, "house", glass("var(--surface)")), "ag-label").toBeGreaterThanOrEqual(AA);
    expect(onGround(copy!, "house", glass("var(--surface)")), "ag-copy").toBeGreaterThanOrEqual(AA);
    expect(onGround(placeholder!, "house", C("var(--surface-2)")), "ag-input placeholder").toBeGreaterThanOrEqual(AA);
  });
});
