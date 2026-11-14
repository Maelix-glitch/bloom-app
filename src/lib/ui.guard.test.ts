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
    if (/var\(--text-(display|page)\)/.test(v)) return true;
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
