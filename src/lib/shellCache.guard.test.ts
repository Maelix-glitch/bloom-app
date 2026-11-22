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
