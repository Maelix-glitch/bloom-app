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
