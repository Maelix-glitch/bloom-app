import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * UI system guards (Slice U0 of the premium UI update; flipped to FAIL in
 * U8, 2026-11-09).
 *
 * The design-token system in `src/styles.css` only stays a system if new
 * code stops bypassing it. These structural tests (same mechanism as
 * `supabase.guard.test.ts`) scan the source for the bypasses the plan
 * (§1.6) forbids:
 *
 *   1. hex literals in `src/styles/**` and `src/components/**` — FAILED
 *      since U8. A hex may live only (a) in styles.css, the token home,
 *      (b) on a custom-property DEFINITION line in a feature stylesheet
 *      (the sanctioned scoped-token pattern: cycle's --ci-*, Coach's
 *      identity remnant, the Stories --story-* content palette…), or
 *      (c) in the exempt files below, each with its reason recorded.
 *      Baseline was 470 (2026-11-07, main @ c32cfa0); U8 budget: 0
 *      outside those rules. Reproduce the census any time with
 *      `node scripts/ui-inventory.mjs`.
 *   2. Google Fonts families outside Fraunces / Inter / IBM Plex Mono
 *      (plus the D4 Stories exceptions) — FAILED since U8. All type is
 *      self-hosted now, so any googleapis link coming back is drift.
 *   3. `animate-spin` / `animate-bounce` class names — still WARN: the
 *      motion law is settle, never spin or bounce (plan §1.5), but the
 *      kit's functional loading spinner is a recorded exception under
 *      review, so this one keeps reporting instead of failing.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, keep: (name: string) => boolean, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith("_backup") || name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, keep, out);
    /* Test files quote the patterns they guard against (this one included);
       counting them would make every baseline self-referential. */
    else if (keep(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const toRel = (p: string) => p.slice(SRC.length + 1).split(sep).join("/");
const readAll = (files: string[]) =>
  files.map((path) => ({ rel: toRel(path), text: readFileSync(path, "utf8") }));

const CSS_AND_COMPONENTS = readAll([
  ...walk(join(SRC, "styles"), (n) => n.endsWith(".css")),
  ...walk(join(SRC, "components"), (n) => /\.(css|tsx?)$/.test(n)),
]);
const ALL_SOURCES = readAll(walk(SRC, (n) => /\.(css|tsx?)$/.test(n)));

describe("UI guard: hex literals outside the token home", () => {
  /* styles.css defines the tokens — hex belongs there and nowhere else
     in the styling/component layer, with two sanctioned forms:
       · a hex on a custom-property definition line in a feature
         stylesheet is a scoped token being BORN, not a bypass
         (cycle's --ci-* phase system works exactly like this);
       · the files below are exempt, each for a recorded reason.
     lib/ is outside this guard's surface by design: the Stories canvas
     and template palettes there are content DATA (what a user picks),
     not chrome. */
  const ALLOWLIST = new Set(["styles.css"]);
  const EXEMPT = new Map<string, string>([
    /* The brand mark: its tile + sage→gold gradient are the definition
       the favicon is synced from (see the file's own header). */
    ["components/BloomLogo.tsx", "brand mark definition"],
    /* The notification bell's cast-gold SVG gradient — a brand rendering
       of the same gradient shell.css paints for the count badge. */
    ["components/notifications/NotificationCenter.tsx", "the bell's gradient"],
    /* Stories canvas/editor palettes are content data (template and
       element colours a user chooses), not app chrome. */
    ["components/stories/", "Stories content palettes"],
  ]);
  const HEX = /#[0-9a-fA-F]{6}\b/;
  const DEFINITION = /^\s*--[a-zA-Z0-9-]+\s*:/;

  it("fails on any hex that is not a token definition or exempt", () => {
    const offenders: string[] = [];
    for (const f of CSS_AND_COMPONENTS) {
      if (ALLOWLIST.has(f.rel)) continue;
      if ([...EXEMPT.keys()].some((k) => f.rel === k || f.rel.startsWith(k))) continue;
      f.text.split("\n").forEach((line, i) => {
        if (HEX.test(line) && !DEFINITION.test(line)) offenders.push(`${f.rel}:${i + 1}`);
      });
    }
    expect(
      offenders,
      `hex literals outside token definitions: ${offenders.slice(0, 12).join(", ")}`,
    ).toEqual([]);
  });
});

describe("UI guard: Google Fonts families outside the three", () => {
  const ALLOWED = new Set(["Fraunces", "Inter", "IBM Plex Mono"]);
  /* D4 exception, ADOPTED 2026-11-08: Stories canvas presets
     (handwritten/romantic/poster voices, incl. stored stories) get three
     scoped families — Caveat with the global set, and Cormorant Garamond +
     Oswald only on the Stories-bearing routes (/, /profile, /$handle).
     Since the self-hosting slice (2026-11-09) all of them are @font-face
     in styles/fonts.css / styles/fonts-stories.css served from /fonts —
     this tripwire now watches for any Google Fonts link coming back. */
  const EXCEPTIONS = new Set(["Caveat", "Cormorant Garamond", "Oswald"]);

  it("reports families loaded outside the system", () => {
    const loaded = new Map<string, string[]>();
    for (const f of ALL_SOURCES) {
      for (const m of f.text.matchAll(/fonts\.googleapis\.com\/css2\?([^"'\s]+)/g)) {
        for (const part of m[1]!.split("&")) {
          if (!part.startsWith("family=")) continue;
          const name = decodeURIComponent(part.slice(7).split(":")[0]!).replace(/\+/g, " ");
          loaded.set(name, [...(loaded.get(name) ?? []), f.rel]);
        }
      }
    }
    const outside = [...loaded.entries()].filter(
      ([name]) => !ALLOWED.has(name) && !EXCEPTIONS.has(name),
    );
    expect(
      outside.map(([n]) => n),
      "type is self-hosted; a Google Fonts family outside the system means a link crept back",
    ).toEqual([]);
  });
});

describe("UI guard (warn): spin and bounce", () => {
  it("reports animate-spin / animate-bounce usages", () => {
    const spin = ALL_SOURCES.reduce((s, f) => s + (f.text.match(/animate-spin/g) ?? []).length, 0);
    const bounce = ALL_SOURCES.reduce(
      (s, f) => s + (f.text.match(/animate-bounce/g) ?? []).length,
      0,
    );
    console.warn(`[ui-guard] animate-spin: ${spin} (baseline 20) · animate-bounce: ${bounce} (baseline 0)`);
  });
});

describe("UI guard: type scale discipline (P2-1)", () => {
  /* Premium pass 2, slice 1: the surfaces below size their text from the
     type scale in styles.css :root (--text-display … --text-micro). Any
     literal font-size at or below the section step (18px) in these files
     is the ad-hoc half-pixel soup regrowing — half-pixel sizes, and
     anything under the 10px micro floor, fail here. Display sizes above
     18px stay literal until the display slice (P2-6). Scoped systems
     (stories.css, cycle.css, components/ci, components/stories) are
     deliberately outside this guard until P2-7. */
  const MIGRATED_CSS = new Set([
    "styles.css",
    "styles/shell.css",
    "styles/bloom-sheet.css",
    "styles/trackers.css",
    "styles/rewards.css",
    "styles/mood.css",
    "styles/coach.css",
    "styles/profile.css",
    "styles/progression.css",
    "styles/health-tools.css",
    "styles/access.css",
    "styles/add-habit-modal.css",
    "styles/welcome.css",
    "styles/admin-panel.css",
    "styles/responsive.css",
  ]);
  const MIGRATED_TSX_PREFIXES = [
    "components/assessment/",
    "components/home/",
    "components/mood/",
    "components/profile/",
    "components/report/",
    "components/rewards/",
    "components/system/",
    "components/tk/",
    "components/ui/",
    "routes/",
  ];
  const ROUTES = readAll(
    walk(join(SRC, "routes"), (n) => n.endsWith(".tsx")).filter(
      (p) => !toRel(p).startsWith("routes/admin/"),
    ),
  );
  const POOL = [...CSS_AND_COMPONENTS, ...ROUTES].filter(
    (f) =>
      MIGRATED_CSS.has(f.rel) ||
      MIGRATED_TSX_PREFIXES.some((p) => f.rel.startsWith(p)),
  );
  const CSS_SIZE = /font-size:\s*(\d+(?:\.\d+)?)px/g;
  const CSS_FONT_SHORT = /\bfont:\s*(\d+(?:\.\d+)?)px/g;
  const TSX_SIZE = /text-\[(\d+(?:\.\d+)?)px\]/g;

  it("fails on literal small sizes in migrated files", () => {
    const offenders: string[] = [];
    for (const f of POOL) {
      const pats = f.rel.endsWith(".css") ? [CSS_SIZE, CSS_FONT_SHORT] : [TSX_SIZE];
      for (const pat of pats) {
        for (const m of f.text.matchAll(pat)) {
          if (parseFloat(m[1]!) <= 18) offenders.push(`${f.rel}: ${m[0]}`);
        }
      }
    }
    expect(
      offenders,
      `small text must come from the type scale: ${offenders.slice(0, 12).join(", ")}`,
    ).toEqual([]);
  });
});

describe("UI guard: small-text system (P2-2)", () => {
  /* Premium pass 2, slice 2 — the owner's named priority ("the small text
     looks cheap quality"). P2-1 put every small size on the scale; this
     guard pins the rest of each role's recipe so the dialect cannot
     regrow: tracking and leading come from --tracking-* / --leading-*,
     meta-sized text on raised surfaces takes the --faint-strong contrast
     step (register R3), Inter never asks for the nonexistent 700 face
     (R5), and numeric UI keeps tabular figures (R12). Recorded bands,
     mirroring the audit's slice plan: line-height literals >= 1.62 are
     the prose band (Coach messages, panel ledes — long-form air, owned
     by the body/display work), and display-sized rules (clamp or >= 19px)
     keep their leading until P2-6. styles.css is exempt throughout: it is
     the recipe home, as in the hex guard. */
  const FEATURE_CSS = new Set([
    "styles/shell.css",
    "styles/bloom-sheet.css",
    "styles/trackers.css",
    "styles/rewards.css",
    "styles/mood.css",
    "styles/coach.css",
    "styles/profile.css",
    "styles/progression.css",
    "styles/health-tools.css",
    "styles/access.css",
    "styles/add-habit-modal.css",
    "styles/welcome.css",
    "styles/admin-panel.css",
    "styles/responsive.css",
  ]);
  const TSX_PREFIXES = [
    "components/assessment/",
    "components/home/",
    "components/mood/",
    "components/profile/",
    "components/report/",
    "components/rewards/",
    "components/system/",
    "components/tk/",
    "components/ui/",
    "routes/",
  ];
  const ROUTES2 = readAll(
    walk(join(SRC, "routes"), (n) => n.endsWith(".tsx")).filter(
      (p) => !toRel(p).startsWith("routes/admin/"),
    ),
  );
  const POOL2 = [...CSS_AND_COMPONENTS, ...ROUTES2].filter(
    (f) => FEATURE_CSS.has(f.rel) || TSX_PREFIXES.some((p) => f.rel.startsWith(p)),
  );
  const CSS_POOL = POOL2.filter((f) => f.rel.endsWith(".css"));
  const TSX_POOL = POOL2.filter((f) => f.rel.endsWith(".tsx"));
  const STYLES = ALL_SOURCES.find((f) => f.rel === "styles.css")!;

  /* Innermost rule blocks of a stylesheet, comments stripped: the
     selector chunk is whatever sits between the previous close brace
     and this block's open brace. Keyframe steps (from / to / %) are
     returned too and skipped by callers — they animate, they don't
     set type. */
  function blocks(text: string): { selector: string; body: string }[] {
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, " ");
    const out: { selector: string; body: string }[] = [];
    let prev = 0;
    for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
      out.push({ selector: clean.slice(prev, m.index).trim(), body: m[1]! });
      prev = m.index + m[0].length;
    }
    return out;
  }
  const isKeyframe = (sel: string) => /(^|[,\s])(from|to|\d+(?:\.\d+)?%)\s*$/.test(sel.trim());
  const isDisplayBlock = (body: string) => {
    const m = body.match(/font-size:\s*([^;]+);/);
    if (!m) return false;
    const v = m[1]!.trim();
    if (v.startsWith("clamp")) return true;
    /* P2-6 completed the display end of the scale: --text-title rules are
       display rules too, so the tight display leading stays legal there. */
    if (/var\(--text-(display|page|title)\)/.test(v)) return true;
    const px = v.match(/^(\d+(?:\.\d+)?)px/);
    return px ? parseFloat(px[1]!) >= 19 : false;
  };

  it("defines the small-text recipes and the meta contrast step in styles.css", () => {
    for (const needle of [
      "--faint-strong:",
      "--color-faint-strong: var(--faint-strong)",
      "@utility type-caption",
      "@utility type-label",
      "@utility type-meta",
      "@utility type-timestamp",
      "@utility type-badge",
    ]) {
      expect(STYLES.text, `styles.css must define ${needle}`).toContain(needle);
    }
    const meta = blocks(STYLES.text).find((b) => b.selector.includes("@utility type-meta"))!;
    expect(meta.body).toContain("color: var(--faint-strong)");
    expect(meta.body).toContain("letter-spacing: var(--tracking-meta)");
    const stamp = blocks(STYLES.text).find((b) => b.selector.includes("@utility type-timestamp"))!;
    expect(stamp.body).toContain("font-variant-numeric: tabular-nums");
    const badge = blocks(STYLES.text).find((b) => b.selector.includes("@utility type-badge"))!;
    expect(badge.body).toContain("font-weight: 600");
  });

  it("fails on letter-spacing literals in migrated stylesheets", () => {
    const offenders: string[] = [];
    for (const f of CSS_POOL) {
      for (const b of blocks(f.text)) {
        if (isKeyframe(b.selector)) continue;
        for (const m of b.body.matchAll(/letter-spacing:\s*(-?\d[^;]*);/g)) {
          offenders.push(`${f.rel}: letter-spacing: ${m[1]!.trim()}`);
        }
      }
    }
    expect(
      offenders,
      `tracking comes from --tracking-*: ${offenders.slice(0, 12).join(", ")}`,
    ).toEqual([]);
  });

  it("fails on line-height literals outside the prose band and display rules", () => {
    const offenders: string[] = [];
    for (const f of CSS_POOL) {
      for (const b of blocks(f.text)) {
        if (isKeyframe(b.selector) || isDisplayBlock(b.body)) continue;
        for (const m of b.body.matchAll(/line-height:\s*([^;]+);/g)) {
          const v = m[1]!.trim().replace(/\s*!important$/, "");
          if (/^var\(--leading-/.test(v)) continue;
          const num = parseFloat(v);
          if (!Number.isNaN(num) && num >= 1.62 && !v.endsWith("px")) continue; /* prose band */
          offenders.push(`${f.rel}: line-height: ${v}`);
        }
      }
    }
    expect(
      offenders,
      `leading comes from --leading-*: ${offenders.slice(0, 12).join(", ")}`,
    ).toEqual([]);
  });

  it("fails on font-weight 700 and on meta-sized text in --faint (R5, R3)", () => {
    const offenders: string[] = [];
    for (const f of CSS_POOL) {
      for (const b of blocks(f.text)) {
        if (isKeyframe(b.selector)) continue;
        if (/font-weight:\s*700\b/.test(b.body)) offenders.push(`${f.rel}: font-weight: 700`);
        if (
          /font-size:\s*var\(--text-(meta|micro)\)/.test(b.body) &&
          /color:\s*var\(--faint\)/.test(b.body)
        ) {
          offenders.push(`${f.rel}: meta/micro text in --faint (use --faint-strong)`);
        }
        for (const m of b.body.matchAll(/font-variant-numeric:\s*([^;]+);/g)) {
          if (!m[1]!.includes("tabular-nums")) {
            offenders.push(`${f.rel}: font-variant-numeric without tabular-nums`);
          }
        }
      }
    }
    expect(offenders, offenders.slice(0, 12).join(", ")).toEqual([]);
  });

  it("fails on ad-hoc tracking, small-text leading, bold and faint meta in migrated TSX", () => {
    const offenders: string[] = [];
    for (const f of TSX_POOL) {
      for (const m of f.text.matchAll(/tracking-\[(-?\d+(?:\.\d+)?)em\]/g)) {
        /* One recorded exemption: the footer wordmark in routes/index.tsx
           (font-display "BLOOM" at 0.5em) is display type — P2-6 owns it. */
        if (f.rel === "routes/index.tsx" && m[1] === "0.5") continue;
        offenders.push(`${f.rel}: ${m[0]}`);
      }
      for (const m of f.text.matchAll(/leading-\[(\d+(?:\.\d+)?)\]/g)) {
        if (parseFloat(m[1]!) >= 1.3) offenders.push(`${f.rel}: ${m[0]}`);
      }
      for (const m of f.text.matchAll(/leading-\[\d+(?:\.\d+)?px\]/g)) {
        offenders.push(`${f.rel}: ${m[0]}`);
      }
      if (/\bfont-bold\b/.test(f.text)) offenders.push(`${f.rel}: font-bold`);
      for (const m of f.text.matchAll(/className=(?:\{`([^`]*)`|"([^"]*)")/gs)) {
        const s = m[1] ?? m[2] ?? "";
        if (
          (s.includes("text-[length:var(--text-meta)]") ||
            s.includes("text-[length:var(--text-micro)]")) &&
          /(^|\s)text-faint(\s|$)/.test(s)
        ) {
          offenders.push(`${f.rel}: meta/micro text in text-faint (use text-faint-strong)`);
        }
      }
    }
    expect(offenders, offenders.slice(0, 12).join(", ")).toEqual([]);
  });

  it("keeps phone and rail tab labels on one recipe (R6)", () => {
    const responsive = CSS_POOL.find((f) => f.rel === "styles/responsive.css")!;
    expect(responsive.text).toContain("--bloom-nav-label: var(--text-micro)");
    const nav = blocks(responsive.text).find(
      (b) => b.selector.includes(".app-mobile-nav > a") && b.body.includes("--bloom-nav-label"),
    )!;
    expect(nav.body).toContain("font-weight: 500");
    expect(nav.body).toContain("line-height: var(--leading-micro)");
    expect(nav.body).toContain("letter-spacing: var(--tracking-body)");
    const chip = TSX_POOL.find((f) => f.rel === "components/system/PointsChip.tsx")!;
    expect(chip.text).toContain("tabular-nums");
  });
});

describe("UI guard: spacing rhythm (P2-3)", () => {
  /* Premium pass 2, slice 3 — register R7 (padding off-rhythm tail) and
     R17 (icon-button geometry). The --space-* scale (styles.css :root)
     is the only spacing language for padding / margin / gap in the
     migrated stylesheets: a literal that IS a scale step (16px, 1rem,
     0.5rem …) must be written as its token, so the value can never drift
     from the scale again. Recorded bands, mirroring the audit: off-scale
     literals stay literal in this slice — the half-step band (the 2px
     grid: 6/10/14/18px …), one-off layout geometry, negative overlaps and
     calc() compositions; snapping those is editorial work on the card
     families (the --space-4 card recipe adopted by .bt-card, .pf-card,
     .wl-card and the Coach panel in this slice), not a blanket rewrite.
     styles.css is exempt from the literal scan: it is the token home,
     as in the hex and P2-2 guards. */
  const FEATURE_CSS = new Set([
    "styles/shell.css",
    "styles/bloom-sheet.css",
    "styles/trackers.css",
    "styles/rewards.css",
    "styles/mood.css",
    "styles/coach.css",
    "styles/profile.css",
    "styles/progression.css",
    "styles/health-tools.css",
    "styles/access.css",
    "styles/add-habit-modal.css",
    "styles/welcome.css",
    "styles/admin-panel.css",
    "styles/responsive.css",
  ]);
  const POOL = CSS_AND_COMPONENTS.filter((f) => FEATURE_CSS.has(f.rel));
  const STYLES = ALL_SOURCES.find((f) => f.rel === "styles.css")!;

  function blocks(text: string): { selector: string; body: string }[] {
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, " ");
    const out: { selector: string; body: string }[] = [];
    let prev = 0;
    for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
      out.push({ selector: clean.slice(prev, m.index).trim(), body: m[1]! });
      prev = m.index + m[0].length;
    }
    return out;
  }
  const isKeyframe = (sel: string) => /(^|[,\s])(from|to|\d+(?:\.\d+)?%)\s*$/.test(sel.trim());

  const SCALE_LITERALS = new Set([
    "4px", "0.25rem", "8px", "0.5rem", "12px", "0.75rem", "16px", "1rem",
    "20px", "1.25rem", "24px", "1.5rem", "32px", "2rem", "40px", "2.5rem",
    "48px", "3rem",
  ]);
  const SPACE_PROP =
    /\b(padding(?:-[a-z]+)?|padding-inline(?:-[a-z]+)?|padding-block(?:-[a-z]+)?|margin(?:-[a-z]+)?|margin-inline(?:-[a-z]+)?|margin-block(?:-[a-z]+)?|gap|row-gap|column-gap)\s*:\s*([^;]+);/g;

  it("fails on literal scale-step spacing in migrated stylesheets (R7)", () => {
    const offenders: string[] = [];
    for (const f of POOL) {
      for (const b of blocks(f.text)) {
        if (isKeyframe(b.selector)) continue;
        for (const m of b.body.matchAll(SPACE_PROP)) {
          const v = m[2]!.replace(/\s*!important$/, "");
          if (v.includes("calc(")) continue; /* recorded band: compositions */
          for (const tok of v.split(/\s+/)) {
            if (SCALE_LITERALS.has(tok)) {
              offenders.push(`${f.rel}: ${m[1]}: ${tok} (use var(--space-*))`);
            }
          }
        }
      }
    }
    expect(
      offenders,
      `spacing comes from --space-*: ${offenders.slice(0, 12).join(", ")}`,
    ).toEqual([]);
  });

  it("keeps icon buttons on the shared geometry roles (R17)", () => {
    expect(STYLES.text).toContain("--icon-btn-sm:");
    expect(STYLES.text).toContain("--icon-btn-md:");
    const shell = POOL.find((f) => f.rel === "styles/shell.css")!;
    const disc = blocks(shell.text).find(
      (b) => b.selector.includes(".bloom-icon-btn") && b.body.includes("--bib-size"),
    )!;
    expect(disc.body).toContain("--bib-size: var(--icon-btn-md)");
    expect(disc.body).toContain("place-items: center");
    const profile = POOL.find((f) => f.rel === "styles/profile.css")!;
    const pf = blocks(profile.text).find(
      (b) => b.selector.includes(".pf-icon-btn") && b.body.includes("place-items: center"),
    )!;
    expect(pf.body).toContain("width: var(--icon-btn-sm)");
    expect(pf.body).toContain("height: var(--icon-btn-sm)");
    expect(pf.body).toContain("place-items: center");
  });
});

describe("UI guard: depth, elevation, hairlines (P2-4)", () => {
  /* Premium pass 2, slice 4 — register R8 (radius drift), R9 (hairline
     recipes), R10 (hand-written shadows), R11 (photo-panel edges).
     Radius values that ARE a role step must be written as the role
     token; off-role literals (12/14/18px …) stay literal as a recorded
     band — snapping them is per-family editorial work, not a blanket
     rewrite. The dialog family (access gate panel, add-habit modal,
     reward delivery modal) shares the one --elevation-dialog recipe;
     the BloomSheet panel shadows are deliberately NOT in that family —
     they were tuned for sheets over photography (PR #87) and are
     recorded as their own recipe. Hairlines resolve to two strengths
     (--hairline / --hairline-soft); surface line tokens point at them. */
  const FEATURE_CSS = new Set([
    "styles/shell.css",
    "styles/bloom-sheet.css",
    "styles/trackers.css",
    "styles/rewards.css",
    "styles/mood.css",
    "styles/coach.css",
    "styles/profile.css",
    "styles/progression.css",
    "styles/health-tools.css",
    "styles/access.css",
    "styles/add-habit-modal.css",
    "styles/welcome.css",
    "styles/admin-panel.css",
    "styles/responsive.css",
  ]);
  const TSX_PREFIXES = [
    "components/assessment/",
    "components/home/",
    "components/mood/",
    "components/profile/",
    "components/report/",
    "components/rewards/",
    "components/system/",
    "components/tk/",
    "components/ui/",
    "routes/",
  ];
  const ROUTES = readAll(
    walk(join(SRC, "routes"), (n) => n.endsWith(".tsx")).filter(
      (p) => !toRel(p).startsWith("routes/admin/"),
    ),
  );
  const POOL = [...CSS_AND_COMPONENTS, ...ROUTES].filter(
    (f) => FEATURE_CSS.has(f.rel) || TSX_PREFIXES.some((p) => f.rel.startsWith(p)),
  );
  const CSS_POOL = POOL.filter((f) => f.rel.endsWith(".css"));
  const TSX_POOL = POOL.filter((f) => f.rel.endsWith(".tsx"));
  const STYLES = ALL_SOURCES.find((f) => f.rel === "styles.css")!;

  function blocks(text: string): { selector: string; body: string }[] {
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, " ");
    const out: { selector: string; body: string }[] = [];
    let prev = 0;
    for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
      out.push({ selector: clean.slice(prev, m.index).trim(), body: m[1]! });
      prev = m.index + m[0].length;
    }
    return out;
  }

  const ROLE_LITERALS = new Set(["999px", "10px", "16px", "20px", "22px"]);

  it("fails on literal role-step radii in migrated stylesheets (R8)", () => {
    const offenders: string[] = [];
    for (const f of CSS_POOL) {
      for (const b of blocks(f.text)) {
        for (const m of b.body.matchAll(/border(?:-[a-z]+)?-radius\s*:\s*([^;]+);/g)) {
          const v = m[1]!.replace(/\s*!important$/, "");
          if (v.includes("calc(") || v.includes("var(")) continue;
          for (const tok of v.split(/\s+/)) {
            if (ROLE_LITERALS.has(tok)) {
              offenders.push(`${f.rel}: border-radius: ${tok} (use var(--radius-*))`);
            }
          }
        }
      }
    }
    expect(
      offenders,
      `radius comes from --radius-*: ${offenders.slice(0, 12).join(", ")}`,
    ).toEqual([]);
  });

  it("fails on literal role-step radii in migrated TSX (R8)", () => {
    const offenders: string[] = [];
    for (const f of TSX_POOL) {
      for (const m of f.text.matchAll(/rounded-\[(\d+(?:\.\d+)?)px\]/g)) {
        if (ROLE_LITERALS.has(`${m[1]}px`)) offenders.push(`${f.rel}: ${m[0]}`);
      }
    }
    expect(offenders, offenders.slice(0, 12).join(", ")).toEqual([]);
  });

  it("keeps the dialog family on the one elevation role (R10)", () => {
    const sites: [string, string][] = [
      ["styles/access.css", ".ag-panel"],
      ["styles/add-habit-modal.css", ".bloom-add-habit .modal"],
      ["styles/rewards.css", ".reward-delivery-modal"],
    ];
    for (const [rel, sel] of sites) {
      const f = CSS_POOL.find((x) => x.rel === rel)!;
      const hit = blocks(f.text).some(
        (b) => b.selector.includes(sel) && b.body.includes("box-shadow: var(--elevation-dialog)"),
      );
      expect(hit, `${rel} ${sel} must use var(--elevation-dialog)`).toBe(true);
    }
  });

  it("keeps hairlines on the two shared recipes (R9)", () => {
    expect(STYLES.text).toContain("--hairline: var(--border)");
    expect(STYLES.text).toContain("--hairline-soft:");
    const profile = CSS_POOL.find((f) => f.rel === "styles/profile.css")!;
    expect(profile.text).toContain("--pf-line: var(--hairline-soft)");
    const progression = CSS_POOL.find((f) => f.rel === "styles/progression.css")!;
    expect(progression.text).toContain("--pg-line-soft: var(--hairline-soft)");
  });

  it("keeps the photo-panel edge a single-sourced pair (R11)", () => {
    const shell = CSS_POOL.find((f) => f.rel === "styles/shell.css")!;
    expect(shell.text).toContain("--photo-r: 28px");
    expect(shell.text).toContain("calc(var(--photo-r) - 1px)");
  });
});

describe("UI guard: motion and state polish (P2-5)", () => {
  /* Premium pass 2, slice 5 — register R13 (duration/easing dialects,
     the overshoot badge pop), R14 (one easing), R15 (tab-switch lag).
     UI motion in the migrated stylesheets runs on the four-step scale
     (--motion-micro/standard/page/signature) with the one house easing
     (--ease-out-expo); a component may keep its own easing TOKEN
     (var(--mm-ease), var(--ease)) — what may not regrow is a bare
     dialect: literal durations in the UI band, the bare ease keywords,
     or a hand-typed bezier. Recorded bands: sub-60ms state hacks
     (1ms/0.001ms visibility flips), motion over 1000ms and ambient
     infinite loops (ceremony, motes, shimmers — a tempo, not a state
     change), and keyframe internals. TSX durations follow the same
     scale through the var forms; duration-200 stays, being exactly
     --motion-standard. */
  const FEATURE_CSS = new Set([
    "styles/shell.css",
    "styles/bloom-sheet.css",
    "styles/trackers.css",
    "styles/rewards.css",
    "styles/mood.css",
    "styles/coach.css",
    "styles/profile.css",
    "styles/progression.css",
    "styles/health-tools.css",
    "styles/access.css",
    "styles/add-habit-modal.css",
    "styles/welcome.css",
    "styles/admin-panel.css",
    "styles/responsive.css",
  ]);
  const TSX_PREFIXES = [
    "components/assessment/",
    "components/home/",
    "components/mood/",
    "components/profile/",
    "components/report/",
    "components/rewards/",
    "components/system/",
    "components/tk/",
    "components/ui/",
    "routes/",
  ];
  const ROUTES = readAll(
    walk(join(SRC, "routes"), (n) => n.endsWith(".tsx")).filter(
      (p) => !toRel(p).startsWith("routes/admin/"),
    ),
  );
  const POOL = [...CSS_AND_COMPONENTS, ...ROUTES].filter(
    (f) => FEATURE_CSS.has(f.rel) || TSX_PREFIXES.some((p) => f.rel.startsWith(p)),
  );
  const CSS_POOL = POOL.filter((f) => f.rel.endsWith(".css"));
  const TSX_POOL = POOL.filter((f) => f.rel.endsWith(".tsx"));
  const STYLES = ALL_SOURCES.find((f) => f.rel === "styles.css")!;

  function blocks(text: string): { selector: string; body: string }[] {
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, " ");
    const out: { selector: string; body: string }[] = [];
    let prev = 0;
    for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
      out.push({ selector: clean.slice(prev, m.index).trim(), body: m[1]! });
      prev = m.index + m[0].length;
    }
    return out;
  }
  const isKeyframe = (sel: string) => /(^|[,\s])(from|to|\d+(?:\.\d+)?%)\s*$/.test(sel.trim());
  const stripVars = (v: string) => v.replace(/var\([^)]*\)/g, " ");
  const DIALECT_BEZIER =
    /cubic-bezier\(\s*(0\.22\s*,\s*0\.61|0\.22\s*,\s*1\s*,|0\.4\s*,\s*0\s*,\s*0\.2|0\.3\s*,\s*0\.6|0\.17\s*,\s*0\.67|0\.34\s*,\s*1\.56|0\.16\s*,\s*1\s*,\s*0\.3)/;

  function motionOffenders(f: { rel: string; text: string }): string[] {
    const out: string[] = [];
    for (const b of blocks(f.text)) {
      if (isKeyframe(b.selector)) continue;
      for (const m of b.body.matchAll(/\b(transition|animation)(-duration)?\s*:\s*([^;]+);/g)) {
        const prop = m[1]!;
        const longhand = m[2] === "-duration";
        let v = m[3]!;
        if (prop === "animation" && /\binfinite\b/.test(v)) continue;
        /* In a shorthand only the FIRST time value of each comma segment
           is the duration; the second is a delay — choreography, which
           stays literal (entrance staggers). Longhands are all duration. */
        const segments: string[] = [];
        {
          let depth = 0;
          let cur = "";
          for (const ch of v) {
            if (ch === "(") depth += 1;
            if (ch === ")") depth -= 1;
            if (ch === "," && depth === 0) {
              segments.push(cur);
              cur = "";
            } else cur += ch;
          }
          segments.push(cur);
        }
        for (const seg of segments) {
          /* A var(--motion-*) ahead of the first literal already holds
             the duration slot; that literal is then the delay. */
          const motionVarAt = seg.search(/var\(--motion/);
          const firstLit = seg.match(/(-?\d*\.?\d+)(ms|s)\b/);
          const slotTaken =
            !longhand && motionVarAt !== -1 && firstLit !== null && motionVarAt < (firstLit.index ?? 0);
          const times = slotTaken
            ? []
            : longhand
              ? [...seg.matchAll(/(-?\d*\.?\d+)(ms|s)\b/g)]
              : ([firstLit].filter(Boolean) as RegExpMatchArray[]);
          for (const t of times) {
            const ms = parseFloat(t[1]!) * (t[2] === "s" ? 1000 : 1);
            if (ms >= 60 && ms <= 1000) {
              out.push(`${f.rel}: ${prop} duration ${t[0]} (use var(--motion-*))`);
            }
          }
        }
        v = stripVars(v);
        if (/\bease-in-out\b|\bease-in\b|\bease-out\b|\bease\b/.test(v)) {
          out.push(`${f.rel}: ${prop} easing dialect (use var(--ease-out-expo))`);
        }
        if (DIALECT_BEZIER.test(v)) {
          out.push(`${f.rel}: ${prop} hand-typed bezier (use var(--ease-out-expo))`);
        }
      }
    }
    return out;
  }

  it("fails on off-scale durations and easing dialects in migrated CSS (R13/R14)", () => {
    const offenders = CSS_POOL.flatMap(motionOffenders);
    expect(
      offenders,
      `motion comes from --motion-* + --ease-out-expo: ${offenders.slice(0, 12).join(", ")}`,
    ).toEqual([]);
  });

  it("fails on off-scale durations and easing dialects in migrated TSX (R13/R14)", () => {
    const offenders: string[] = [];
    for (const f of TSX_POOL) {
      for (const m of f.text.matchAll(/\bduration-(300|500|700)\b/g)) {
        offenders.push(`${f.rel}: ${m[0]} (use duration-[var(--motion-*)])`);
      }
      for (const m of f.text.matchAll(/(?<![\w-])ease-(?:in-out|out)(?![\w-])/g)) {
        offenders.push(`${f.rel}: ${m[0]} (use ease-[var(--ease-out-expo)])`);
      }
    }
    expect(offenders, offenders.slice(0, 12).join(", ")).toEqual([]);
  });

  it("keeps tab returns free of replayed entrances (R15)", () => {
    expect(STYLES.text).toContain("html.bloom-navigated .bloom-page-enter");
    expect(STYLES.text).toContain("html.bloom-navigated .home-rise");
    const root = TSX_POOL.find((f) => f.rel === "routes/__root.tsx")!;
    expect(root.text).toContain("bloom-navigated");
  });
});

describe("UI guard: display type (P2-6)", () => {
  /* Premium pass 2, slice 6 — the ≥19px world P2-1 deliberately left
     literal. Titles now sit on the completed scale: --text-section
     (18px) and the new --text-title step (22px) between it and the
     fluid --text-page clamp; the shared sheet-heading recipe in TSX
     reads the title token. What stays literal is a recorded set, not
     drift: hero/display titles (fluid clamps and the ≥25px display
     family), responsive ladders (.pf-name, the TSX display pairs),
     numerals and glyph sizes, the Bloom wordmark, and scoped display
     systems (ci-display — P2-7 keeps its floor, not this slice's
     ladder). Fraunces optical sizing is already global (P2-1 put
     font-optical-sizing on body and the display utility); display
     tracking now comes from --tracking-display, not a lookalike
     literal in the utility. */
  const FEATURE_CSS = new Set([
    "styles/shell.css",
    "styles/bloom-sheet.css",
    "styles/trackers.css",
    "styles/rewards.css",
    "styles/mood.css",
    "styles/coach.css",
    "styles/profile.css",
    "styles/progression.css",
    "styles/health-tools.css",
    "styles/access.css",
    "styles/add-habit-modal.css",
    "styles/welcome.css",
    "styles/admin-panel.css",
    "styles/responsive.css",
  ]);
  const TSX_PREFIXES = [
    "components/assessment/",
    "components/home/",
    "components/mood/",
    "components/profile/",
    "components/report/",
    "components/rewards/",
    "components/system/",
    "components/tk/",
    "components/ui/",
    "routes/",
  ];
  const ROUTES = readAll(
    walk(join(SRC, "routes"), (n) => n.endsWith(".tsx")).filter(
      (p) => !toRel(p).startsWith("routes/admin/"),
    ),
  );
  const POOL = [...CSS_AND_COMPONENTS, ...ROUTES].filter(
    (f) => FEATURE_CSS.has(f.rel) || TSX_PREFIXES.some((p) => f.rel.startsWith(p)),
  );
  const CSS_POOL = POOL.filter((f) => f.rel.endsWith(".css"));
  const TSX_POOL = POOL.filter((f) => f.rel.endsWith(".tsx"));
  const STYLES = ALL_SOURCES.find((f) => f.rel === "styles.css")!;

  function blocks(text: string): { selector: string; body: string }[] {
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, " ");
    const out: { selector: string; body: string }[] = [];
    let prev = 0;
    for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
      out.push({ selector: clean.slice(prev, m.index).trim(), body: m[1]! });
      prev = m.index + m[0].length;
    }
    return out;
  }
  const isKeyframe = (sel: string) => /(^|[,\s])(from|to|\d+(?:\.\d+)?%)\s*$/.test(sel.trim());
  const pxOf = (v: string): number | null => {
    const px = v.match(/^([\d.]+)px$/);
    if (px) return parseFloat(px[1]!);
    const rem = v.match(/^([\d.]+)rem$/);
    if (rem) return parseFloat(rem[1]!) * 16;
    return null;
  };

  /* Recorded CSS exemptions: [file, selector needle] — hero/display
     titles, the .pf-name ladder, numerals, glyph sizes. */
  const CSS_EXEMPT: [string, string][] = [
    ["styles/bloom-sheet.css", ".bsheet-h1"],
    ["styles/bloom-sheet.css", ".bedit-name"],
    ["styles/trackers.css", ".at-centre-fig"],
    ["styles/mood.css", ".bmood-title"],
    ["styles/coach.css", ".coach-metric-value"],
    ["styles/profile.css", ".pf-name"],
    ["styles/profile.css", ".pf-number-value"],
    ["styles/progression.css", ".pg-points"],
    ["styles/add-habit-modal.css", ".icon-preview"],
    ["styles/add-habit-modal.css", ".dropzone-icon"],
    ["styles/add-habit-modal.css", ".success-badge"],
  ];
  /* Recorded TSX exemptions (19–24px band): wordmark, numerals,
     display ladders/pairs, scoped ci-display. */
  const TSX_EXEMPT = new Set([
    "components/home/HomeSidebar.tsx",
    "components/mood/Distribution.tsx",
    "components/mood/primitives.tsx",
    "components/profile/DataSheets.tsx",
    "components/profile/FeaturedMoment.tsx",
    "components/profile/PublicProfileView.tsx",
    "components/profile/SignedOutProfile.tsx",
    "components/report/WeeklyReportPage.tsx",
    "components/tk/HistoryTable.tsx",
    "routes/$handle.tsx",
  ]);

  it("defines the title step and tokenised display tracking", () => {
    expect(STYLES.text).toContain("--text-title:");
    expect(STYLES.text).toContain("letter-spacing: var(--tracking-display)");
  });

  it("fails on unrecorded literal display sizes in migrated CSS", () => {
    const offenders: string[] = [];
    for (const f of CSS_POOL) {
      for (const b of blocks(f.text)) {
        if (isKeyframe(b.selector)) continue;
        for (const m of b.body.matchAll(/font-size:\s*([^;]+);/g)) {
          const p = pxOf(m[1]!.trim());
          if (p === null || p < 19) continue;
          const exempt = CSS_EXEMPT.some(([rel, sel]) => rel === f.rel && b.selector.includes(sel));
          if (!exempt) offenders.push(`${f.rel}: font-size: ${m[1]} in ${b.selector.slice(0, 48)}`);
        }
      }
    }
    expect(
      offenders,
      `titles come from --text-section/--text-title: ${offenders.slice(0, 12).join(", ")}`,
    ).toEqual([]);
  });

  it("fails on unrecorded literal title-band sizes in migrated TSX", () => {
    const offenders: string[] = [];
    for (const f of TSX_POOL) {
      if (TSX_EXEMPT.has(f.rel)) continue;
      for (const m of f.text.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
        const p = parseFloat(m[1]!);
        if (p >= 19 && p <= 24) offenders.push(`${f.rel}: ${m[0]}`);
      }
    }
    expect(offenders, offenders.slice(0, 12).join(", ")).toEqual([]);
  });
});

describe("UI guard: scoped systems floor (P2-7)", () => {
  /* Premium pass 2, slice 7 — the scoped systems (Cycle's --ci-* world
     and the Stories canvas chrome) join the same 10px floor the rest of
     the app got in P2-1, WITHOUT flattening their content voices: only
     sub-floor UI text moves, onto var(--text-micro); the canvas DSL's
     own point sizes (story template content, set per template) are not
     UI text and are untouched. The font: shorthand is floor-checked in
     every stylesheet — a size set through the shorthand is exactly how
     a sub-floor value could slip past the font-size scans. */
  const SCOPED_CSS = ALL_SOURCES.filter(
    (f) => f.rel === "styles/stories.css" || f.rel === "styles/cycle.css",
  );
  const SCOPED_TSX = [
    ...readAll(walk(join(SRC, "components/ci"), (n) => n.endsWith(".tsx"))),
    ...readAll(walk(join(SRC, "components/stories"), (n) => n.endsWith(".tsx"))),
    ...readAll(walk(join(SRC, "components/highlights"), (n) => n.endsWith(".tsx"))),
  ].filter((f) => !f.rel.endsWith(".test.tsx"));
  const pxOf = (v: string): number | null => {
    const px = v.match(/^([\d.]+)px$/);
    if (px) return parseFloat(px[1]!);
    const rem = v.match(/^([\d.]+)rem$/);
    if (rem) return parseFloat(rem[1]!) * 16;
    return null;
  };

  it("keeps Cycle and Stories UI text at or above the 10px floor", () => {
    const offenders: string[] = [];
    for (const f of SCOPED_CSS) {
      for (const m of f.text.matchAll(/font-size:\s*([^;]+);/g)) {
        const p = pxOf(m[1]!.trim());
        if (p !== null && p < 10) offenders.push(`${f.rel}: font-size: ${m[1]}`);
      }
    }
    for (const f of SCOPED_TSX) {
      for (const m of f.text.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
        if (parseFloat(m[1]!) < 10) offenders.push(`${f.rel}: ${m[0]}`);
      }
    }
    expect(offenders, offenders.slice(0, 12).join(", ")).toEqual([]);
  });

  it("keeps the font: shorthand above the floor in every stylesheet", () => {
    const offenders: string[] = [];
    for (const f of ALL_SOURCES.filter((x) => x.rel.endsWith(".css"))) {
      for (const m of f.text.matchAll(/\bfont:\s*([^;]+);/g)) {
        const sm = m[1]!.match(/(\d+(?:\.\d+)?)px/);
        if (sm && parseFloat(sm[1]!) < 10) offenders.push(`${f.rel}: font: ${m[1]!.slice(0, 40)}`);
      }
    }
    expect(offenders, offenders.slice(0, 12).join(", ")).toEqual([]);
  });
});
