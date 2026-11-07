#!/usr/bin/env node
/**
 * Bloom UI inventory — the numbers the premium UI update is managed against.
 *
 * Run:  node scripts/ui-inventory.mjs
 *
 * Counts, over `src/`:
 *   - hardcoded hex literals in CSS and in TS/TSX (6-digit, the plan's method;
 *     3/4/8-digit forms are reported separately — design values are 6-digit)
 *   - inline `style={{…}}` occurrences in TSX
 *   - Google Fonts loads and the families they name
 *   - `animate-spin` / `animate-bounce` usages
 *   - CSS file count and total size
 *   - the top hex values, overall and in the global stylesheet bundle
 *     (src/styles.css + the files it @imports)
 *
 * Baseline recorded 2026-11-07 (Slice U0, main @ c32cfa0):
 *   CSS files 23 · 677 KB · hex(6) CSS 366 · hex(6) TS/TSX 651
 *   inline styles 566 in 139 files · animate-spin 20 · animate-bounce 0
 * These numbers may only go down (§1.6 of the UI update plan; the guard
 * tests in src/lib/ui.guard.test.ts flip from warn to fail in U8).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

function walk(dir, test, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith("_backup") || name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, test, out);
    else if (test(name)) out.push(full);
  }
  return out;
}

const read = (f) => readFileSync(f, "utf8");
const rel = (f) => f.slice(ROOT.length + 1);

const cssFiles = walk(SRC, (n) => n.endsWith(".css"));
const tsFiles = walk(SRC, (n) => /\.tsx?$/.test(n));
const HEX6 = /#[0-9a-fA-F]{6}\b/g;
const HEX_ANY = /#[0-9a-fA-F]{3,8}\b/g;

function tally(files, re) {
  const per = new Map();
  let total = 0;
  for (const f of files) {
    const n = (read(f).match(re) ?? []).length;
    if (n) per.set(f, n);
    total += n;
  }
  return { total, per };
}

function topValues(files, re, limit = 15) {
  const counts = new Map();
  for (const f of files)
    for (const m of read(f).match(re) ?? []) {
      const v = m.toLowerCase();
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

/* ---- CSS footprint ---- */
const cssKb = Math.round(cssFiles.reduce((s, f) => s + statSync(f).size, 0) / 1024);
console.log(`CSS: ${cssFiles.length} files, ${cssKb} KB`);

/* ---- hex ---- */
console.log(`hex (6-digit): CSS ${tally(cssFiles, HEX6).total} · TS/TSX ${tally(tsFiles, HEX6).total}`);
console.log(
  `hex (any width): CSS ${tally(cssFiles, HEX_ANY).total} · TS/TSX ${tally(tsFiles, HEX_ANY).total}`,
);
console.log("top hex overall:", topValues([...cssFiles, ...tsFiles], HEX_ANY, 20));

/* ---- global bundle (styles.css + its @imports) ---- */
const corePath = join(SRC, "styles.css");
const core = read(corePath);
const globalFiles = [corePath];
for (const m of core.matchAll(/@import\s+["']\.\/([^"']+)["']/g)) {
  const p = join(SRC, m[1]);
  try {
    statSync(p);
    globalFiles.push(p);
  } catch {
    /* not a local file */
  }
}
console.log(
  `global bundle: ${globalFiles.map(rel).join(", ")} · hex (any) ${tally(globalFiles, HEX_ANY).total}`,
);
console.log("top hex in global bundle:", topValues(globalFiles, HEX_ANY, 20));

/* ---- inline styles ---- */
let inlineTotal = 0;
let inlineFiles = 0;
for (const f of tsFiles) {
  const n = (read(f).match(/style=\{\{/g) ?? []).length;
  if (n) inlineFiles += 1;
  inlineTotal += n;
}
console.log(`inline style={{…}}: ${inlineTotal} in ${inlineFiles} files`);

/* ---- fonts ---- */
const families = new Map();
for (const f of tsFiles) {
  for (const m of read(f).matchAll(/fonts\.googleapis\.com\/css2\?([^"'\s]+)/g)) {
    for (const fam of m[1].split("&")) {
      if (fam.startsWith("family=")) {
        const name = decodeURIComponent(fam.slice(7).split(":")[0]).replace(/\+/g, " ");
        families.set(name, [...(families.get(name) ?? []), rel(f)]);
      }
    }
  }
}
console.log("Google Fonts families loaded:");
for (const [name, files] of [...families.entries()].sort()) {
  console.log(`  ${name} — ${[...new Set(files)].join(", ")}`);
}

/* ---- motion anti-patterns (test files excluded: they quote the patterns) ---- */
const motionFiles = [...cssFiles, ...tsFiles].filter((f) => !/\.test\.tsx?$/.test(f));
console.log(`animate-spin: ${tally(motionFiles, /animate-spin/g).total}`);
console.log(`animate-bounce: ${tally(motionFiles, /animate-bounce/g).total}`);
