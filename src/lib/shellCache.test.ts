/**
 * The shell edge cache (M-218) — the fix for the load test's
 * Cloudflare 1102s: at ~50 concurrent fresh page loads, 10–16% of
 * requests died because every document load re-rendered the whole
 * React tree on the Worker and burst its CPU limit.
 *
 * The cache is only safe because SSR output is a pure function of
 * the URL: no server code reads cookies or request headers, there
 * are no server functions, and the Supabase session lives in
 * browser localStorage where the server cannot see it (the
 * invariant is pinned by shellCache.guard.test.ts). These tests pin
 * the layer's own contract against a fake Cache API:
 *
 *   · a miss renders once and stores; a hit serves the stored body
 *     without rendering again;
 *   · the security headers — CSP included — are byte-identical on
 *     hits and misses once src/server.ts applies its standard set;
 *   · only 200 text/html responses to GET document requests are
 *     stored — errors, assets, /api paths, non-GET requests and
 *     Authorization-bearing requests never enter the cache;
 *   · entries die at the TTL, and the internal bookkeeping
 *     headers never leak to a real response;
 *   · the store lands WITHOUT any execution context — the nitro
 *     chain invokes the app entry with the request only, so the
 *     layer awaits the store on the miss (a deferred store raced
 *     the response teardown in the first live smoke and silently
 *     never landed; these tests pass no ctx anywhere, which is
 *     the production condition);
 *   · a broken cache degrades to a plain render, never to an error.
 */
import { describe, expect, it } from "vitest";

import { SECURITY_HEADERS, withSecurityHeaders } from "./security-headers";
import {
  SHELL_CACHE_TTL_SECONDS,
  SHELL_CACHE_VERSION,
  shellCacheKey,
  withShellCache,
  type ShellCacheLike,
} from "./shell-cache";

/* A Cache-API-shaped fake: stores clones, hands back clones, the
   way the real Cache API does. */
class FakeCache implements ShellCacheLike {
  readonly store = new Map<string, Response>();
  async match(request: Request): Promise<Response | undefined> {
    return this.store.get(request.url)?.clone();
  }
  async put(request: Request, response: Response): Promise<void> {
    this.store.set(request.url, response.clone());
  }
}

const HTML = "<!doctype html><html><body>Bloom shell</body></html>";

function renderer(status = 200, body = HTML) {
  let calls = 0;
  return {
    calls: () => calls,
    render: async () => {
      calls += 1;
      return new Response(body, {
        status,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    },
  };
}

const doc = (path = "/") => new Request(`https://bloom.test${path}`);

describe("miss then hit", () => {
  it("renders once, stores, then serves the stored body without rendering", async () => {
    const cache = new FakeCache();
    const r = renderer();

    const miss = await withShellCache(doc("/"), { cache }, r.render);
    expect(r.calls()).toBe(1);
    expect(miss.headers.get("x-bloom-shell-cache")).toBe("miss");
    expect(await miss.text()).toBe(HTML);
    expect(cache.store.size).toBe(1);

    const hit = await withShellCache(doc("/"), { cache }, r.render);
    expect(r.calls()).toBe(1);
    expect(hit.headers.get("x-bloom-shell-cache")).toBe("hit");
    expect(await hit.text()).toBe(HTML);
  });

  it("keys by the full URL — different query strings are different entries", async () => {
    const cache = new FakeCache();
    const r = renderer();

    await withShellCache(doc("/?a=1"), { cache }, r.render);
    await withShellCache(doc("/?a=2"), { cache }, r.render);
    expect(r.calls()).toBe(2);
    expect(cache.store.size).toBe(2);

    const hit = await withShellCache(doc("/?a=1"), { cache }, r.render);
    expect(hit.headers.get("x-bloom-shell-cache")).toBe("hit");
    expect(r.calls()).toBe(2);
  });
});

describe("headers on hits and misses", () => {
  it("carries byte-identical security headers (CSP incl. Razorpay) once applied", async () => {
    const cache = new FakeCache();
    const r = renderer();

    const miss = withSecurityHeaders(await withShellCache(doc("/"), { cache }, r.render));
    const hit = withSecurityHeaders(await withShellCache(doc("/"), { cache }, r.render));

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(hit.headers.get(name), name).toBe(value);
      expect(hit.headers.get(name), name).toBe(miss.headers.get(name));
    }
    expect(hit.headers.get("Content-Security-Policy")).toContain("https://*.razorpay.com");
    expect(hit.status).toBe(miss.status);
  });

  it("never leaks the internal bookkeeping headers", async () => {
    const cache = new FakeCache();
    const r = renderer();

    const miss = await withShellCache(doc("/"), { cache }, r.render);
    expect(miss.headers.get("x-bloom-shell-stored-at")).toBeNull();
    expect(miss.headers.get("x-bloom-shell-orig-cache-control")).toBeNull();

    const hit = await withShellCache(doc("/"), { cache }, r.render);
    expect(hit.headers.get("x-bloom-shell-stored-at")).toBeNull();
    expect(hit.headers.get("x-bloom-shell-orig-cache-control")).toBeNull();
  });

  it("gives the stored copy a max-age for the Cache API, but serves hits with the render's own Cache-Control", async () => {
    const cache = new FakeCache();
    const r = renderer();

    /* The render sends no Cache-Control (documents today). */
    const miss = await withShellCache(doc("/"), { cache }, r.render);
    expect(miss.headers.get("cache-control")).toBeNull();

    /* The stored copy must carry freshness, or the Cache API
       treats it as stale the moment it is written and a hit can
       never happen. */
    const stored = [...cache.store.values()][0];
    expect(stored?.headers.get("cache-control")).toBe(
      `public, max-age=${SHELL_CACHE_TTL_SECONDS}`,
    );

    /* …but the hit restores the render's own state: no
       Cache-Control reaches the visitor. */
    const hit = await withShellCache(doc("/"), { cache }, r.render);
    expect(hit.headers.get("x-bloom-shell-cache")).toBe("hit");
    expect(hit.headers.get("cache-control")).toBeNull();
  });

  it("restores a render's own Cache-Control verbatim on a hit", async () => {
    const cache = new FakeCache();
    let calls = 0;
    const render = async () => {
      calls += 1;
      return new Response(HTML, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "private, no-store",
        },
      });
    };
    const miss = await withShellCache(doc("/"), { cache }, render);
    expect(miss.headers.get("cache-control")).toBe("private, no-store");

    const hit = await withShellCache(doc("/"), { cache }, render);
    expect(calls).toBe(1);
    expect(hit.headers.get("cache-control")).toBe("private, no-store");
  });
});

describe("what never enters the cache", () => {
  it("does not store non-200 responses — a 404 renders again next time", async () => {
    const cache = new FakeCache();
    const r = renderer(404, "<!doctype html><html><body>branded 404</body></html>");

    const first = await withShellCache(doc("/nope"), { cache }, r.render);
    expect(first.status).toBe(404);
    expect(cache.store.size).toBe(0);

    await withShellCache(doc("/nope"), { cache }, r.render);
    expect(r.calls()).toBe(2);
  });

  it("does not store non-HTML responses", async () => {
    const cache = new FakeCache();
    let calls = 0;
    const render = async () => {
      calls += 1;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    };
    await withShellCache(doc("/data"), { cache }, render);
    expect(cache.store.size).toBe(0);
    await withShellCache(doc("/data"), { cache }, render);
    expect(calls).toBe(2);
  });

  it("leaves non-GET requests untouched", async () => {
    const cache = new FakeCache();
    const r = renderer();
    const post = new Request("https://bloom.test/", { method: "POST" });
    const res = await withShellCache(post, { cache }, r.render);
    expect(r.calls()).toBe(1);
    expect(res.headers.get("x-bloom-shell-cache")).toBeNull();
    expect(cache.store.size).toBe(0);
  });

  it("bypasses asset, file and /api paths even when the render is HTML", async () => {
    const cache = new FakeCache();
    const r = renderer();
    for (const path of ["/assets/app-abc123.js", "/favicon.ico", "/sw.js", "/api/thing"]) {
      const res = await withShellCache(doc(path), { cache }, r.render);
      expect(res.headers.get("x-bloom-shell-cache"), path).toBeNull();
    }
    expect(cache.store.size).toBe(0);
  });

  it("bypasses requests carrying an Authorization header", async () => {
    const cache = new FakeCache();
    const r = renderer();
    const authed = new Request("https://bloom.test/", {
      headers: { authorization: "Bearer token" },
    });
    const res = await withShellCache(authed, { cache }, r.render);
    expect(res.headers.get("x-bloom-shell-cache")).toBeNull();
    expect(cache.store.size).toBe(0);
  });
});

describe("TTL and key shape", () => {
  it("re-renders once the stored entry is older than the TTL", async () => {
    const cache = new FakeCache();
    const r = renderer();

    await withShellCache(doc("/"), { cache }, r.render);
    expect(cache.store.size).toBe(1);

    /* Age the stored entry past the TTL, as the real cache would
       present it on a later request. */
    const key = shellCacheKey(doc("/"));
    const stored = cache.store.get(key.url);
    expect(stored).toBeDefined();
    const aged = new Response(await stored!.clone().text(), { headers: stored!.headers });
    aged.headers.set(
      "x-bloom-shell-stored-at",
      String(Date.now() - (SHELL_CACHE_TTL_SECONDS + 1) * 1000),
    );
    cache.store.set(key.url, aged);

    const again = await withShellCache(doc("/"), { cache }, r.render);
    expect(r.calls()).toBe(2);
    expect(again.headers.get("x-bloom-shell-cache")).toBe("miss");
  });

  it("builds keys with an explicit version segment over the full path + query", () => {
    const key = shellCacheKey(doc("/nutrition?a=1"));
    expect(key.url).toContain(`/__bloom-shell/v${SHELL_CACHE_VERSION}/nutrition?a=1`);
    expect(shellCacheKey(doc("/")).url).toContain(`/__bloom-shell/v${SHELL_CACHE_VERSION}/`);
    expect(shellCacheKey(doc("/trackers")).url).not.toBe(key.url);
  });
});

describe("failure degrades to a plain render", () => {
  it("a cache that throws on match and put still serves the render", async () => {
    const broken: ShellCacheLike = {
      async match() {
        throw new Error("cache down");
      },
      async put() {
        throw new Error("cache down");
      },
    };
    const r = renderer();
    const res = await withShellCache(doc("/"), { cache: broken }, r.render);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(HTML);
  });

  it("no cache available at all still serves the render", async () => {
    const r = renderer();
    const res = await withShellCache(doc("/"), { cache: null }, r.render);
    expect(res.status).toBe(200);
    expect(r.calls()).toBe(1);
  });
});
