/**
 * The shell edge cache (M-218) — the fix for the load test's
 * Cloudflare 1102 failures.
 *
 * The finding (owner's load test, 2026-11-22; results in
 * ~/workspace/loadtest/results.json): at ~50 concurrent fresh page
 * loads, 10–16% of requests failed with Cloudflare error 1102 —
 * the Worker exceeded its CPU limit — because EVERY document
 * request server-rendered the full React tree, and nothing was
 * cached anywhere.
 *
 * Why caching the document HTML is safe here (investigated, not
 * assumed — the invariant is pinned by shellCache.guard.test.ts):
 * SSR output is a pure function of the URL. No server-side code
 * reads cookies or request headers; there are no server functions
 * at all; the only route loader returns the validated URL param;
 * and the Supabase session lives in browser localStorage
 * (src/lib/supabase.ts, persistSession), which the server cannot
 * see. Every document renders the same signed-out shell, and all
 * personalised data loads client-side after hydration. If a
 * per-request input ever reaches the server render, the guard
 * fails and this layer must be re-reviewed before it ships.
 *
 * The contract:
 *   · GET document requests only — never /api paths, never asset
 *     paths (hashed /assets are already immutable for a year via
 *     the generated _headers; they keep that handling), never a
 *     request carrying an Authorization header. File-extension
 *     paths engage only for 404s (see the M-227 note below).
 *   · Only 200 and 404 text/html responses are stored (404s
 *     since M-227 — the not-found document is as pure a
 *     function of the URL as the shell is).
 *   · Entries live SHELL_CACHE_TTL_SECONDS. 120s is deliberate:
 *     long enough to collapse a burst (the load pattern was
 *     thousands of loads inside 20s — within the TTL they cost
 *     one render per URL per colo), short enough that any content
 *     change is live within two minutes even without a redeploy.
 *   · The cache key carries an explicit version segment
 *     (SHELL_CACHE_VERSION): bumping it orphans every old entry,
 *     so a future HTML change can invalidate deliberately. A
 *     deploy also replaces the Worker, which is the natural
 *     cache-bust for shipped changes.
 *   · Responses carry an x-bloom-shell-cache: hit|miss marker so
 *     the behaviour is observable. The stored copy additionally
 *     carries internal bookkeeping headers (the stored-at stamp
 *     for TTL checks, and the render's own Cache-Control — see
 *     below); they are stripped or restored before a hit is
 *     served and never leak.
 *   · The Cache API only returns entries it considers fresh, and
 *     a response with no freshness headers has a freshness
 *     lifetime of zero — a stored shell would never match. The
 *     stored copy therefore carries Cache-Control: max-age=<TTL>
 *     for the cache's own bookkeeping, while the render's
 *     original Cache-Control (documents send none today) is kept
 *     in an internal header and restored on the way out — so a
 *     hit's headers are the render's headers, exactly.
 *   · Security headers are NOT this module's job: src/server.ts
 *     applies its standard set (withSecurityHeaders) to whatever
 *     this layer returns, on hits and misses alike, so the CSP —
 *     Razorpay origins included (M-213) — is identical either way.
 *   · The cache can never break a page: every cache operation is
 *     best-effort, and any failure degrades to the plain render.
 *   · The store is AWAITED on the miss, with a buffered body —
 *     never deferred. The nitro chain invokes this app's server
 *     entry with the request only (the built lazyService calls
 *     mod.fetch(req)), so no ExecutionContext ever reaches this
 *     layer: a waitUntil-deferred store would race the response
 *     teardown and silently never land. That failure is exactly
 *     what the first M-218 smoke showed — healthy Cache API
 *     (probe-verified), marker on every response, and every
 *     request a miss. Buffering costs the miss its streaming;
 *     a miss happens once per URL per TTL per colo, and the
 *     body is a few hundred KB of HTML the render just built.
 *
 * M-227 (CPU budget) — two widenings, each measured before it
 * was made (local workerd profiling, 2026-11-23):
 *
 *   · The cache key no longer carries the raw query string.
 *     Renders of the same path with different junk parameters
 *     (?utm_source=…, ?fbclid=…, cache-busters) were verified
 *     byte-identical except the router's per-render timestamp —
 *     yet every variant keyed separately and paid a full SSR
 *     render. The key now keeps ONLY the search params a route
 *     actually validates and consumes (SHELL_CACHE_SEARCH_PARAMS:
 *     the entire validateSearch census of the app — `d` on
 *     /nutrition/report, whose SSR output provably varies with
 *     it, and `story`/`view` on /profile), sorted for stability,
 *     and drops everything else. The guard
 *     (shellCache.guard.test.ts) fails if a route ever validates
 *     a search param outside that list, or if any source starts
 *     reading the request's query string directly.
 *   · 404 document responses are stored under the same TTL
 *     discipline. The router's 404 decision is a pure function
 *     of the pathname (the one loader validates the handle's
 *     FORMAT, never its existence), and the 404 document itself
 *     was verified byte-identical across junk paths — yet every
 *     bot probe and typo paid a full React render, forever
 *     uncached. Paths whose last segment carries an extension
 *     (/wp-login.php, /.env, …) engage the layer for 404s ONLY:
 *     a request reaches this code at all only because the
 *     assets layer already missed it, no app route has a dot in
 *     a segment (guarded against routeTree.gen.ts), and a
 *     non-404 render on such a path passes through untouched
 *     and unstored, exactly as before.
 */

export const SHELL_CACHE_TTL_SECONDS = 120;

/** Bump to orphan every cached shell deliberately. Bumped to 2
 *  by M-227: the key semantics (normalised query) and the stored
 *  set (404 documents) both changed, so every v1 entry is
 *  orphaned rather than reinterpreted. */
export const SHELL_CACHE_VERSION = 2;

/** The only search params that may appear in a cache key — the
 *  complete validateSearch census of the app (M-227). A param is
 *  listed because a route validates it and its component reads
 *  it during render: `d` (/nutrition/report — SSR output varies
 *  with it), `story` and `view` (/profile). Every other param is
 *  presentation-neutral to the server render (verified: renders
 *  differing only in junk params are byte-identical apart from
 *  the router's render timestamp) and is dropped from the key,
 *  so tracking parameters and cache-busters share the entry
 *  they would have rendered. shellCache.guard.test.ts fails if
 *  a route validates a param that is not listed here. */
export const SHELL_CACHE_SEARCH_PARAMS: readonly string[] = ["d", "story", "view"];

export const SHELL_CACHE_MARKER_HEADER = "x-bloom-shell-cache";
const STORED_AT_HEADER = "x-bloom-shell-stored-at";
const ORIGINAL_CACHE_CONTROL_HEADER = "x-bloom-shell-orig-cache-control";
const KEY_PREFIX = "/__bloom-shell";

/** The slice of the Cache API this layer uses (caches.default in
 *  the Worker; a fake in tests). */
export interface ShellCacheLike {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface ShellCacheDeps {
  /** undefined resolves the platform default cache; null disables
   *  the layer (plain render). */
  cache?: ShellCacheLike | null;
  now?: () => number;
}

/** The query string as the cache key sees it (M-227): only the
 *  params in SHELL_CACHE_SEARCH_PARAMS survive, sorted by name
 *  then value so parameter order never splits an entry. Returns
 *  "" (no "?") when nothing survives. */
function normalisedSearch(url: URL): string {
  const kept: [string, string][] = [];
  for (const [name, value] of url.searchParams) {
    if (SHELL_CACHE_SEARCH_PARAMS.includes(name)) kept.push([name, value]);
  }
  if (kept.length === 0) return "";
  kept.sort(([an, av], [bn, bv]) => (an === bn ? (av < bv ? -1 : av > bv ? 1 : 0) : an < bn ? -1 : 1));
  const params = new URLSearchParams();
  for (const [name, value] of kept) params.append(name, value);
  return `?${params.toString()}`;
}

/** The cache key for a document request: same origin, a versioned
 *  synthetic prefix, then the path + NORMALISED query — so two
 *  URLs whose renders can differ never share an entry, URLs that
 *  differ only in dropped params always do, and a version bump
 *  orphans them all. */
export function shellCacheKey(request: Request): Request {
  const url = new URL(request.url);
  return new Request(
    `${url.origin}${KEY_PREFIX}/v${SHELL_CACHE_VERSION}${url.pathname}${normalisedSearch(url)}`,
    { method: "GET" },
  );
}

function isExcludedPath(pathname: string): boolean {
  if (pathname === "/api" || pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/assets/")) return true;
  return false;
}

function hasFileExtension(pathname: string): boolean {
  /* Static files (favicon.ico, sw.js, manifest.webmanifest,
     robots.txt, fonts, images) carry an extension in their last
     segment. Bloom's document routes never do — handles are
     [a-z0-9_], the rest are plain words. */
  const lastSegment = pathname.split("/").pop() ?? "";
  return lastSegment.includes(".");
}

/** How a request may use the cache (M-227):
 *    "document"  — a document path: 200s and 404s are served
 *                  from and stored to the cache.
 *    "not-found" — a file-extension path: the layer engages for
 *                  404s only. Such a request reaches the worker
 *                  solely because the assets layer missed it —
 *                  the file does not exist — and the render is
 *                  the generic not-found document.
 *    null        — the layer does not engage at all. */
export type ShellCacheScope = "document" | "not-found" | null;

export function shellCacheScope(request: Request): ShellCacheScope {
  if (request.method !== "GET") return null;
  /* A request carrying an Authorization header is refused
     outright: document loads never send one today, and if one
     ever does, it must not share a cache entry with the
     anonymous shell. */
  if (request.headers.get("authorization")) return null;
  const pathname = new URL(request.url).pathname;
  if (isExcludedPath(pathname)) return null;
  return hasFileExtension(pathname) ? "not-found" : "document";
}

/** Only plain, anonymous document GETs are fully cacheable. */
export function isShellCacheableRequest(request: Request): boolean {
  return shellCacheScope(request) === "document";
}

function platformCache(): ShellCacheLike | null {
  const caches = (globalThis as { caches?: { default?: ShellCacheLike } }).caches;
  return caches?.default ?? null;
}

/**
 * Serve a document request from the edge cache when possible;
 * otherwise render it (and store the render when it is a
 * storable HTML document — a 200 shell, or a 404 document under
 * the M-227 rules). `render` is the app's normal SSR pipeline —
 * this layer changes WHEN it runs, never what it produces.
 */
export async function withShellCache(
  request: Request,
  deps: ShellCacheDeps,
  render: () => Promise<Response>,
): Promise<Response> {
  const scope = shellCacheScope(request);
  if (scope === null) return render();

  const cache = deps.cache !== undefined ? deps.cache : platformCache();
  if (!cache) return render();

  const now = deps.now ?? Date.now;
  const key = shellCacheKey(request);

  try {
    const cached = await cache.match(key);
    if (cached) {
      const storedAt = Number(cached.headers.get(STORED_AT_HEADER));
      const fresh =
        Number.isFinite(storedAt) && now() - storedAt <= SHELL_CACHE_TTL_SECONDS * 1000;
      /* A "not-found"-scope request may only ever be served a
         stored 404 — the store side never writes anything else
         under such a key, and this keeps it that way even if a
         future store rule changes. */
      const servable = scope === "document" || cached.status === 404;
      if (fresh && servable) {
        const headers = new Headers(cached.headers);
        headers.delete(STORED_AT_HEADER);
        /* Restore the render's own Cache-Control (documents send
           none, so this usually deletes the bookkeeping value the
           stored copy carried for the Cache API's freshness). */
        const originalCacheControl = headers.get(ORIGINAL_CACHE_CONTROL_HEADER);
        headers.delete(ORIGINAL_CACHE_CONTROL_HEADER);
        if (originalCacheControl !== null) {
          headers.set("cache-control", originalCacheControl);
        } else {
          headers.delete("cache-control");
        }
        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers,
        });
      }
      /* Stale: fall through and render; the store below overwrites
         the same key. */
    }
  } catch {
    /* A failed read degrades to a plain render. */
  }

  const response = await render();

  const contentType = response.headers.get("content-type") ?? "";
  /* What may be stored (M-227): document scope stores its 200
     shells and its 404 documents; not-found scope stores 404s
     only — a file-extension path that renders anything else
     passes through untouched and unmarked, exactly as it did
     before the layer engaged for it at all. */
  const storeable =
    contentType.includes("text/html") &&
    (scope === "document"
      ? response.status === 200 || response.status === 404
      : response.status === 404);
  if (!storeable) {
    return response;
  }

  /* Buffer the body, then AWAIT the store (see the module note:
     no execution context reaches this layer, so a deferred store
     would race the response teardown and never land). The same
     buffered body is what the visitor gets — byte-identical to
     the render, headers untouched apart from the marker. */
  const body = await response.text();

  try {
    const storedHeaders = new Headers(response.headers);
    storedHeaders.set(STORED_AT_HEADER, String(now()));
    storedHeaders.set(SHELL_CACHE_MARKER_HEADER, "hit");
    /* The Cache API treats a response with no freshness headers
       as immediately stale and would never hand it back — give
       the STORED copy a max-age of exactly the TTL for the
       cache's own bookkeeping, remembering the render's original
       Cache-Control so a hit can restore it untouched. */
    const originalCacheControl = storedHeaders.get("cache-control");
    if (originalCacheControl !== null) {
      storedHeaders.set(ORIGINAL_CACHE_CONTROL_HEADER, originalCacheControl);
    }
    storedHeaders.set("cache-control", `public, max-age=${SHELL_CACHE_TTL_SECONDS}`);
    await cache.put(
      key,
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: storedHeaders,
      }),
    );
  } catch {
    /* Storing is best-effort; serving the render is not. */
  }

  const headers = new Headers(response.headers);
  headers.set(SHELL_CACHE_MARKER_HEADER, "miss");
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
