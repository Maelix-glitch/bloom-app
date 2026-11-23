/**
 * The invariant the shell edge cache (M-218) stands on, pinned.
 *
 * src/lib/shell-cache.ts serves repeat document loads from the
 * edge because SSR output is a pure function of the URL. That is
 * true today ONLY because no server-side code can see anything
 * per-request: there are no server functions, nothing reads
 * cookies or request headers while rendering, and the Supabase
 * session lives in browser localStorage (src/lib/supabase.ts,
 * persistSession) where the server cannot reach it.
 *
 * If any of those vectors ever appears in a non-test source, the
 * shared cache stops being safe — this guard fails first, and the
 * cache layer must be re-reviewed (or the new vector bypassed)
 * before it ships. Client-side uses are out of scope by design:
 * the patterns below are the server request APIs, which client
 * code has no reason to name.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SHELL_CACHE_SEARCH_PARAMS } from "./shell-cache";

const SRC = join(process.cwd(), "src");

const SERVER_VARIANCE_VECTORS = [
  "createServerFn",
  "useServerFn",
  "getWebRequest",
  "getRequestHeader",
  "getCookie",
  "setCookie",
] as const;

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* sourceFiles(path);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      yield path;
    }
  }
}

describe("no server-side per-request variance vectors exist in src", () => {
  it("no non-test source names a server function or request-state API", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, "utf8");
      for (const vector of SERVER_VARIANCE_VECTORS) {
        if (text.includes(vector)) offenders.push(`${file}: ${vector}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no non-test source reads the Cookie or Authorization request headers", () => {
    const offenders: string[] = [];
    const headerRead = /headers\.get\(\s*["'](cookie|authorization)["']/i;
    for (const file of sourceFiles(SRC)) {
      /* The one sanctioned reader: src/lib/shell-cache.ts reads the
         Authorization header ONLY to refuse caching — the safe
         direction. It never reads Cookie, and it never lets either
         header influence what is rendered. */
      if (file.endsWith(join("lib", "shell-cache.ts"))) continue;
      if (headerRead.test(readFileSync(file, "utf8"))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

/**
 * The M-227 widenings stand on two censuses, pinned here.
 *
 * The cache key drops every search param except
 * SHELL_CACHE_SEARCH_PARAMS. That is safe only while those are
 * ALL the params any render can depend on: the routes that
 * validate search are exactly the known two, every key they
 * validate is allowlisted, and nothing reads the query string
 * directly. And 404s for file-extension paths are cacheable
 * only while no app route has a dot in a path segment — a
 * dotted path reaching the worker is then provably a missing
 * file, never a page.
 */
describe("M-227: the search-param and dotted-path censuses hold", () => {
  const ROUTES = join(SRC, "routes");
  /* The only routes that validate search today. Adding
     validateSearch anywhere else must fail here first, so the
     allowlist gets a deliberate update in the same change. */
  const SEARCH_ROUTE_FILES = ["nutrition.report.tsx", "profile.tsx"];

  it("validateSearch exists only in the known route files", () => {
    const found: string[] = [];
    for (const file of sourceFiles(ROUTES)) {
      if (readFileSync(file, "utf8").includes("validateSearch")) {
        found.push(file.slice(ROUTES.length + 1));
      }
    }
    expect(found.sort()).toEqual([...SEARCH_ROUTE_FILES].sort());
  });

  it("every validated search key is in SHELL_CACHE_SEARCH_PARAMS — and vice versa", () => {
    const validated = new Set<string>();
    for (const name of SEARCH_ROUTE_FILES) {
      const text = readFileSync(join(ROUTES, name), "utf8");
      const schema = text.match(/\w*[Ss]earch\w*\s*=\s*z\.object\(\{([\s\S]*?)\}\)/);
      expect(schema, `${name}: search schema not found`).not.toBeNull();
      for (const line of schema![1].split("\n")) {
        const key = line.match(/^\s*(\w+):/)?.[1];
        if (key) validated.add(key);
      }
    }
    expect([...validated].sort()).toEqual([...SHELL_CACHE_SEARCH_PARAMS].sort());
  });

  it("no non-test source reads the query string directly", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, "utf8");
      if (text.includes("location.search")) offenders.push(`${file}: location.search`);
      if (/new URLSearchParams\(\s*(window\.)?location/.test(text)) {
        offenders.push(`${file}: URLSearchParams(location…)`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no route path has a dot in any segment", () => {
    const tree = readFileSync(join(SRC, "routeTree.gen.ts"), "utf8");
    const paths = [...tree.matchAll(/fullPath: '([^']+)'/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThan(0);
    const dotted = paths.filter((p) => p.split("/").some((seg) => seg.includes(".")));
    expect(dotted).toEqual([]);
  });
});
