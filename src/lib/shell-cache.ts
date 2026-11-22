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
 *     or file paths (hashed /assets are already immutable for a
 *     year via the generated _headers; they keep that handling),
 *     never a request carrying an Authorization header.
 *   · Only 200 text/html responses are stored.
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
 */

export const SHELL_CACHE_TTL_SECONDS = 120;

/** Bump to orphan every cached shell deliberately. */
export const SHELL_CACHE_VERSION = 1;

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

/** The cache key for a document request: same origin, a versioned
 *  synthetic prefix, then the full path + query — so two URLs
 *  never share an entry, and a version bump orphans them all. */
export function shellCacheKey(request: Request): Request {
  const url = new URL(request.url);
  return new Request(
    `${url.origin}${KEY_PREFIX}/v${SHELL_CACHE_VERSION}${url.pathname}${url.search}`,
    { method: "GET" },
  );
}

function isDocumentPath(pathname: string): boolean {
  if (pathname === "/api" || pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/assets/")) return false;
  /* Static files (favicon.ico, sw.js, manifest.webmanifest,
     robots.txt, fonts, images) are not documents; their last
     segment carries an extension. Bloom's document routes never
     do — handles are [a-z0-9_], the rest are plain words. */
  const lastSegment = pathname.split("/").pop() ?? "";
  return !lastSegment.includes(".");
}

/** Only plain, anonymous document GETs are cacheable. A request
 *  carrying an Authorization header is refused outright: document
 *  loads never send one today, and if one ever does, it must not
 *  share a cache entry with the anonymous shell. */
export function isShellCacheableRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  if (request.headers.get("authorization")) return false;
  return isDocumentPath(new URL(request.url).pathname);
}

function platformCache(): ShellCacheLike | null {
  const caches = (globalThis as { caches?: { default?: ShellCacheLike } }).caches;
  return caches?.default ?? null;
}

/**
 * Serve a document request from the edge cache when possible;
 * otherwise render it (and store the render when it is a 200
 * HTML document). `render` is the app's normal SSR pipeline —
 * this layer changes WHEN it runs, never what it produces.
 */
export async function withShellCache(
  request: Request,
  deps: ShellCacheDeps,
  render: () => Promise<Response>,
): Promise<Response> {
  if (!isShellCacheableRequest(request)) return render();

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
      if (fresh) {
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
  if (response.status !== 200 || !contentType.includes("text/html")) {
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
