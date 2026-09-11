// scripts/fix-worker-chunks.mjs
//
// TEMPORARY (prod-500 workaround): post-build repair for a Rolldown codegen
// defect in the Nitro cloudflare-module output.
//
// What breaks: Rolldown fuses its `__exportAll` runtime helper into the small
// TanStack server facade chunk (`_ssr/server-*.mjs`), while the big server
// runtime chunk imports the helper back from the facade — a static import
// cycle. The helper is emitted as a `var`, so when the runtime chunk's
// top-level code runs first it sees `undefined` and throws
// `TypeError: __exportAll is not a function`, 500ing every SSR route in the
// worker. (`npm run dev` never bundles, so it is unaffected.)
//
// What this does: for every helper import that crosses a cyclic chunk edge,
// it inlines a local copy of the helper into the importer and removes the
// import, severing the cycle. Acyclic chunks are left alone, so on a fixed
// toolchain this script is a harmless no-op. Revert (and drop the
// `build:worker` script) once the toolchain stops merging the runtime helper
// into cyclic chunks.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SERVER_DIR = join(process.cwd(), ".output", "server");

// Canonical Rolldown runtime helpers (pure; `__exportAll` depends on `__defProp`).
const KNOWN_HELPERS = {
  __defProp: "var __defProp = Object.defineProperty;",
  __exportAll:
    'var __exportAll = (all, no_symbols) => { let target = {}; for (var name in all) __defProp(target, name, { get: all[name], enumerable: true }); if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" }); return target; };',
};
const HELPER_NAMES = Object.keys(KNOWN_HELPERS);
const MARKER = "/* bloom-chunk-fix: inlined to break a cyclic chunk edge */";

function allChunks(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allChunks(full));
    else if (entry.isFile() && (entry.name.endsWith(".mjs") || entry.name.endsWith(".js")))
      out.push(full);
  }
  return out;
}

// `export { a as b, c };`  ->  Map(exportedName -> localName)
function parseExports(code) {
  const map = new Map();
  for (const m of code.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const spec = part.trim();
      if (!spec) continue;
      const alias = spec.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
      if (alias) map.set(alias[2], alias[1]);
      else if (/^[\w$]+$/.test(spec)) map.set(spec, spec);
    }
  }
  return map;
}

// Yields { statement, imported, local, source } for single-specifier imports.
function* singleImports(code) {
  const re = /import\s*\{\s*([\w$]+)(?:\s+as\s+([\w$]+))?\s*\}\s*from\s*["']([^"']+)["'];?/g;
  let m;
  while ((m = re.exec(code))) {
    yield { statement: m[0], imported: m[1], local: m[2] ?? m[1], source: m[3] };
  }
}

function definesLocal(code, name) {
  return new RegExp(`(?:var|let|const|function)\\s+${name}\\b`).test(code);
}

function importsBack(targetCode, targetDir, importerFile) {
  for (const t of singleImports(targetCode)) {
    if (!t.source.startsWith(".")) continue;
    if (resolve(targetDir, t.source) === importerFile) return true;
  }
  return false;
}

function main() {
  if (!existsSync(SERVER_DIR)) {
    console.error(`[bloom-chunk-fix] ${SERVER_DIR} missing — run \`npm run build\` first.`);
    process.exit(1);
  }

  // Cloudflare rejects compatibility dates in the future, and Nitro stamps
  // *today's local date* — ahead of Cloudflare's UTC date for part of each
  // day (IST is UTC+5:30). Pin the last known-good date so deploys never fail.
  // Bump it forward manually once in a while if you want newer runtime behavior.
  const WRANGLER_JSON = join(SERVER_DIR, "wrangler.json");
  try {
    const raw = readFileSync(WRANGLER_JSON, "utf8");
    const next = raw.replace(
      /"compatibility_date"\s*:\s*"[^"]*"/,
      '"compatibility_date": "2026-09-10"',
    );
    if (next !== raw) {
      writeFileSync(WRANGLER_JSON, next);
      console.log(
        "[bloom-chunk-fix] pinned compatibility_date to 2026-09-10 (Cloudflare rejects future dates).",
      );
    }
  } catch (error) {
    console.error(
      `[bloom-chunk-fix] WARNING: could not pin compatibility_date (${error}).`,
    );
  }

  const chunks = allChunks(SERVER_DIR);
  const codeOf = new Map(chunks.map((f) => [f, readFileSync(f, "utf8")]));
  const exportsOf = new Map(chunks.map((f) => [f, parseExports(codeOf.get(f))]));

  // Refuse to half-patch: a helper shared through a multi-specifier import
  // needs manual review, not silent surgery.
  for (const f of chunks) {
    const code = codeOf.get(f);
    for (const m of code.matchAll(/import\s*\{([^}]*,[^}]*)\}\s*from\s*["']([^"']+)["'];?/g)) {
      if (!m[2].startsWith(".")) continue;
      const target = resolve(dirname(f), m[2]);
      if (!codeOf.has(target)) continue;
      const exported = exportsOf.get(target);
      const hitsHelper = m[1].split(",").some((part) => {
        const spec = part.trim().match(/^([\w$]+)(?:\s+as\s+[\w$]+)?$/);
        return spec && HELPER_NAMES.includes(exported.get(spec[1]));
      });
      if (hitsHelper && importsBack(codeOf.get(target), dirname(target), f)) {
        console.error(
          `[bloom-chunk-fix] REFUSING: ${relative(SERVER_DIR, f)} imports a runtime helper ` +
            `through a multi-specifier import across a cycle. Needs manual review.`,
        );
        process.exit(1);
      }
    }
  }

  let patched = 0;
  for (const importer of chunks) {
    const original = codeOf.get(importer);
    if (original.includes(MARKER)) {
      console.log(`[bloom-chunk-fix] skip ${relative(SERVER_DIR, importer)} (already patched)`);
      continue;
    }
    let code = original;
    for (const imp of singleImports(original)) {
      if (!imp.source.startsWith(".")) continue; // bare/node: imports never cycle
      const target = resolve(dirname(importer), imp.source);
      if (!codeOf.has(target)) continue;
      const targetLocal = exportsOf.get(target).get(imp.imported);
      if (!targetLocal || !HELPER_NAMES.includes(targetLocal)) continue;
      if (!importsBack(codeOf.get(target), dirname(target), importer)) continue; // acyclic: fine
      let inject = `${MARKER}\n`;
      if (
        targetLocal === "__exportAll" &&
        !definesLocal(code, "__defProp") &&
        ![...singleImports(code)].some((s) => s.local === "__defProp")
      ) {
        inject += `${KNOWN_HELPERS.__defProp}\n`;
      }
      inject += KNOWN_HELPERS[targetLocal].replace(/^var ([\w$]+) =/, `var ${imp.local} =`);
      code = code.replace(imp.statement, () => inject);
      patched += 1;
      console.log(
        `[bloom-chunk-fix] ${relative(SERVER_DIR, importer)}: inlined ${imp.local} ` +
          `(was imported from ${relative(SERVER_DIR, target)})`,
      );
    }
    if (code !== original) {
      writeFileSync(importer, code);
      codeOf.set(importer, code);
    }
  }

  console.log(
    patched === 0
      ? "[bloom-chunk-fix] no cyclic helper imports found; nothing to do."
      : `[bloom-chunk-fix] done: ${patched} import(s) inlined.`,
  );
}

main();