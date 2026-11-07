import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, it } from "vitest";

/**
 * UI system guards — WARN LEVEL (Slice U0 of the premium UI update).
 *
 * The design-token system in `src/styles.css` only stays a system if new
 * code stops bypassing it. These structural tests (same mechanism as
 * `supabase.guard.test.ts`) scan the source and REPORT the three bypasses
 * the plan (§1.6) will eventually forbid:
 *
 *   1. hex literals in `src/styles/**` and `src/components/**` outside the
 *      allowlist (the token definitions themselves live in styles.css);
 *   2. Google Fonts families outside Fraunces / Inter / IBM Plex Mono
 *      (Caveat is the recorded exception — Stories canvas presets, plan
 *      decision D4, pending the owner's answer);
 *   3. `animate-spin` / `animate-bounce` class names (motion is settle,
 *      never spin or bounce — plan §1.5).
 *
 * For this slice they only warn: each test prints the current count and
 * the recorded baseline, and passes. The counts may only go down. In
 * Slice U8 the expectations flip to hard failures against the final
 * budgets. Baselines recorded 2026-11-07 on main @ c32cfa0; reproduce
 * them any time with `node scripts/ui-inventory.mjs`.
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

describe("UI guard (warn): hex literals outside the token home", () => {
  /* styles.css defines the tokens — hex belongs there and nowhere else
     in the styling/component layer. Feature CSS outside src/styles and
     lib code join the count in U8; for now this is the managed surface. */
  const ALLOWLIST = new Set(["styles.css"]);
  const HEX = /#[0-9a-fA-F]{6}\b/g;

  it("reports the current count", () => {
    let count = 0;
    const offenders: string[] = [];
    for (const f of CSS_AND_COMPONENTS) {
      if (ALLOWLIST.has(f.rel)) continue;
      const n = (f.text.match(HEX) ?? []).length;
      if (n) offenders.push(`${f.rel} (${n})`);
      count += n;
    }
    console.warn(
      `[ui-guard] hex literals outside allowlist: ${count} (baseline 470 across styles+components; U8 budget: 0 outside exemptions)`,
    );
    if (offenders.length) console.warn(`[ui-guard] in: ${offenders.slice(0, 12).join(", ")}`);
  });
});

describe("UI guard (warn): Google Fonts families outside the three", () => {
  const ALLOWED = new Set(["Fraunces", "Inter", "IBM Plex Mono"]);
  /* D4 exception, pending the owner's decision: Stories canvas presets
     (handwritten/romantic/poster voices, incl. stored stories) resolve
     Caveat — and currently also Cormorant Garamond and Oswald — from the
     root link. Caveat is the exception the plan recommends keeping,
     Stories-scoped; the other two are drift even by that reading. */
  const EXCEPTIONS = new Set(["Caveat"]);

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
    console.warn(
      `[ui-guard] font families loaded: ${[...loaded.keys()].join(", ")}; outside the three (excl. Caveat/D4): ${outside.map(([n]) => n).join(", ") || "none"}`,
    );
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
