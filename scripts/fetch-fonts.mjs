#!/usr/bin/env node
/**
 * Vendor Bloom's fonts at build time.
 *
 * The woff2 files are build outputs, not source: they are fetched from
 * Google's css2 sheets (the exact sheets the app used to link at runtime),
 * kept to the latin + latin-ext subsets, and written to public/fonts/,
 * where styles/fonts.css + styles/fonts-stories.css reference them via
 * @font-face. Browsers therefore load type from Bloom itself — never
 * from Google — and the service worker cache-firsts it.
 *
 * Integrity: scripts/fonts-manifest.json pins every file's byte size.
 * Files already on disk matching the manifest are left alone (no network,
 * so rebuilds and offline work are unaffected). A size mismatch after a
 * download fails the build loudly: if Google ever rotates the files,
 * regenerate the CSS + manifest together instead of shipping a font the
 * descriptors don't describe.
 *
 * Run directly (`node scripts/fetch-fonts.mjs`) to repair a checkout;
 * `prebuild` / `prebuild:worker` run it automatically.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "fonts");
const MANIFEST = JSON.parse(readFileSync(join(ROOT, "scripts", "fonts-manifest.json"), "utf8"));

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const SHEETS = [
  "https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap",
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Oswald:wght@400;500;600&display=swap",
];
const KEEP = new Set(["latin", "latin-ext"]);

const fileNameFor = (family, style, weight, subset) =>
  `${family.replaceAll(" ", "-")}-${subset}-${style}-${weight.replaceAll(" ", "").replaceAll("..", "-")}.woff2`;

function missingOrStale() {
  return Object.entries(MANIFEST).filter(([name, size]) => {
    const p = join(OUT_DIR, name);
    return !existsSync(p) || statSync(p).size !== size;
  });
}

async function main() {
  const stale = missingOrStale();
  if (stale.length === 0) {
    console.log(`[fonts] all ${Object.keys(MANIFEST).length} woff2 files present and verified — skipping fetch`);
    return;
  }
  console.log(`[fonts] fetching ${stale.length} file(s)…`);
  mkdirSync(OUT_DIR, { recursive: true });
  const wanted = new Map(); // filename -> source url
  for (const sheet of SHEETS) {
    const css = await (await fetch(sheet, { headers: { "User-Agent": UA } })).text();
    for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*{([^}]+)}/g)) {
      const [, subset, body] = m;
      if (!KEEP.has(subset)) continue;
      const family = /font-family:\s*'([^']+)'/.exec(body)[1];
      const style = /font-style:\s*(\w+)/.exec(body)[1];
      const weight = /font-weight:\s*([\d. ]+)/.exec(body)[1].trim();
      const url = /url\((https:[^)]+\.woff2)\)/.exec(body)[1];
      wanted.set(fileNameFor(family, style, weight, subset), url);
    }
  }
  for (const [name] of stale) {
    const url = wanted.get(name);
    if (!url) throw new Error(`[fonts] ${name} is in the manifest but not in the current css2 sheets`);
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    if (buf.length !== MANIFEST[name]) {
      throw new Error(
        `[fonts] ${name}: downloaded ${buf.length} bytes, manifest pins ${MANIFEST[name]}. ` +
          "Google rotated the file — regenerate fonts.css/fonts-stories.css and the manifest together.",
      );
    }
    writeFileSync(join(OUT_DIR, name), buf);
    console.log(`[fonts] wrote ${name} (${buf.length} bytes)`);
  }
  const left = missingOrStale();
  if (left.length) throw new Error(`[fonts] still missing/stale after fetch: ${left.map(([n]) => n).join(", ")}`);
  console.log("[fonts] done — all files verified against the manifest");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
