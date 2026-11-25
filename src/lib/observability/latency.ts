/**
 * M-242 - server-side latency sampling.
 *
 * The 111-concept backend audit found Bloom had no record of how
 * long any request takes: no p50, no p95, no p99, so "is the app
 * slow?" was unanswerable. This module is the measuring half. The
 * Worker's server entry (src/server.ts) times every app request
 * and hands the result here; this module decides whether the
 * request is sampled and, if so, writes one row to
 * public.latency_samples (migration 20261125_latency_observability)
 * through PostgREST with the service-role key.
 *
 * The discipline, in order of importance:
 *
 *   1. A sample must NEVER affect the response. The insert is
 *      fire-and-forget: registered with a waitUntil, and every
 *      failure is swallowed. (The shell-cache note in
 *      src/lib/shell-cache.ts records that the built chain does
 *      not reliably pass an ExecutionContext this deep. M-245
 *      proved it live: after the M-242 deploy, 73 eligible page
 *      loads produced ZERO samples - the ctx never reaches this
 *      layer in the shipped Worker, so a floating write is
 *      dropped the moment the response finishes. The waitUntil
 *      therefore comes from the platform module, captured by
 *      primeServerEnv exactly like the env; a ctx waitUntil is
 *      used only when one is actually passed. A lost sample
 *      costs a statistic; a broken page costs a user.)
 *   2. It must be CHEAP. The Worker lives under a hard CPU ceiling
 *      (M-227). Sampling is one comparison and, for roughly 1 in
 *      10 requests, one small JSON POST issued AFTER the response
 *      exists. No body is read, no header is parsed beyond the
 *      pathname, nothing is awaited.
 *   3. The service-role key exists only here, on the server. This
 *      module is imported by src/server.ts alone; nothing in the
 *      client bundle references it, and the key is never read from
 *      import.meta.env (which is baked into the shipped bundle at
 *      build time). One wrinkle, verified in the built output: the
 *      nitro chain invokes this app's entry with the request ONLY
 *      (lazyService: mod.fetch(req)), so neither env nor ctx is
 *      forwarded to src/server.ts in the shipped Worker. The env
 *      is therefore read through the cloudflare:workers module
 *      (primeServerEnv, called once from the server entry), which
 *      is the platform's own channel and works regardless of what
 *      the chain forwards. An explicitly passed env still wins,
 *      which is what the tests use.
 *
 * Sampling rule: every request slower than SLOW_MS is recorded
 * (slow requests are the ones p99 is made of, and they are rare),
 * plus a flat SAMPLE_RATE of the rest so the percentiles have a
 * representative base.
 */

export const LATENCY_SAMPLE_RATE = 0.1;
export const LATENCY_SLOW_MS = 1000;

export interface ServerSupabaseConfig {
  url: string;
  serviceRoleKey: string | null;
  anonKey: string | null;
}

type EnvRecord = Record<string, unknown>;

function envString(env: EnvRecord | null, key: string): string | null {
  const value = env?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * The platform env, captured once via the cloudflare:workers
 * module (see the module note: the built chain forwards only the
 * request, so the fetch handler's env parameter is not a reliable
 * channel in the shipped Worker). Off-platform (tests, plain
 * node) the import fails and the cache stays null - resolution
 * then relies on the explicitly passed env, exactly as the tests
 * drive it. Idempotent and safe to call on every request.
 */
let platformEnvCache: EnvRecord | null | undefined;

/**
 * The platform's waitUntil, captured by the same prime. The
 * execution context never reaches this layer in the shipped
 * Worker (see the module note), so the write's keep-alive comes
 * from the cloudflare:workers module - the platform's own
 * channel, valid while a request is being handled. Null when
 * the module does not offer one (off-platform, older runtime).
 */
type WaitUntilFn = (promise: Promise<unknown>) => void;
let platformWaitUntilCache: WaitUntilFn | null | undefined;

export async function primeServerEnv(): Promise<void> {
  if (platformEnvCache !== undefined) return;
  try {
    const mod = (await import(/* @vite-ignore */ "cloudflare:workers")) as {
      env?: EnvRecord;
      waitUntil?: WaitUntilFn;
    };
    platformEnvCache = mod.env ?? null;
    platformWaitUntilCache =
      typeof mod.waitUntil === "function" ? mod.waitUntil : null;
  } catch {
    platformEnvCache = null;
    platformWaitUntilCache = null;
  }
}

/** Test seam: primeServerEnv fills the platform waitUntil from
    the module; tests set it directly to prove the fallback. */
export function setPlatformWaitUntilForTests(fn: WaitUntilFn | null): void {
  platformWaitUntilCache = fn;
}

/**
 * Resolve the server-side Supabase config from the Worker env.
 * The URL may also come from the build-time VITE_SUPABASE_URL
 * (public, already printed in the client bundle); the service-role
 * key may ONLY come from the runtime env - it is a secret and is
 * never baked into a bundle.
 */
export function resolveServerConfig(env: unknown): ServerSupabaseConfig {
  const record = (env ?? null) as EnvRecord | null;
  const platform = platformEnvCache ?? null;
  const baked = import.meta.env as EnvRecord;
  const pick = (key: string): string | null =>
    envString(record, key) ?? envString(platform, key);
  const url = (
    pick("SUPABASE_URL") ??
    pick("VITE_SUPABASE_URL") ??
    envString(baked, "VITE_SUPABASE_URL") ??
    ""
  ).replace(/\/+$/, "");
  return {
    url,
    serviceRoleKey: pick("SUPABASE_SERVICE_ROLE_KEY"),
    anonKey: pick("SUPABASE_ANON_KEY") ?? envString(baked, "VITE_SUPABASE_ANON_KEY"),
  };
}

/** The sampling decision: slow is always kept, the rest is a dice roll. */
export function shouldSample(durationMs: number, roll: number): boolean {
  if (durationMs > LATENCY_SLOW_MS) return true;
  return roll < LATENCY_SAMPLE_RATE;
}

/**
 * Postgres percentile_cont semantics in TS: linear interpolation
 * over the sorted values, rank = p * (n - 1). The SQL view
 * public.latency_percentiles computes the same function in the
 * database; this is the reference implementation the tests pin,
 * so the two can never quietly drift apart in meaning.
 */
export function percentileCont(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0] ?? null;
  const rank = p * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const frac = rank - lo;
  const loVal = sorted[lo] ?? 0;
  const hiVal = sorted[hi] ?? loVal;
  return loVal + (hiVal - loVal) * frac;
}

export interface LatencySample {
  route: string;
  method: string;
  status: number;
  duration_ms: number;
  region: string | null;
}

/** Paths the sampler leaves alone: the health endpoint (it would
 *  sample itself), hashed assets (served by the assets layer, and
 *  not app routes), and any file-extension path (static files and
 *  bot probes - the same distinction shell-cache.ts draws). */
export function isSampledPath(pathname: string): boolean {
  if (pathname === "/api/health") return false;
  if (pathname === "/api" || pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/assets/")) return false;
  const lastSegment = pathname.split("/").pop() ?? "";
  if (lastSegment.includes(".")) return false;
  return true;
}

type WaitUntilCtx = { waitUntil?: (promise: Promise<unknown>) => void } | null | undefined;

function narrowCtx(ctx: unknown): WaitUntilCtx {
  if (ctx != null && typeof ctx === "object") return ctx as WaitUntilCtx;
  return null;
}

export type FetchImpl = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Write one sample, fire-and-forget. Returns true when a write was
 * attempted. Never throws and never rejects: the returned promise
 * (when waitUntil gets it) resolves either way.
 */
export function recordLatencySample(
  env: unknown,
  sample: LatencySample,
  ctx?: unknown,
  fetchImpl: FetchImpl = fetch,
): boolean {
  const config = resolveServerConfig(env);
  if (!config.url || !config.serviceRoleKey) return false;

  const write = (async () => {
    try {
      await fetchImpl(`${config.url}/rest/v1/latency_samples`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: config.serviceRoleKey as string,
          authorization: `Bearer ${config.serviceRoleKey as string}`,
          prefer: "return=minimal",
        },
        body: JSON.stringify(sample),
      });
    } catch {
      /* A lost sample costs a statistic. Nothing else may happen. */
    }
  })();

  /* Keep-alive, in order: a ctx waitUntil when one actually
     reaches this layer (tests, a future chain), else the
     platform module's waitUntil captured by primeServerEnv -
     in the shipped Worker the ctx never arrives (M-245: 73
     eligible live loads, zero samples), so the platform
     channel is the one that keeps the write alive. Either may
     refuse (no active request context); the write then floats,
     exactly as before. */
  const ctxWaitUntil = narrowCtx(ctx)?.waitUntil;
  if (typeof ctxWaitUntil === "function") {
    try {
      ctxWaitUntil.call(narrowCtx(ctx), write);
      return true;
    } catch {
      /* A ctx that refuses the promise falls through to the
         platform channel. */
    }
  }
  if (typeof platformWaitUntilCache === "function") {
    try {
      platformWaitUntilCache(write);
    } catch {
      /* Outside a request context the write floats, as before. */
    }
  }
  return true;
}

export interface LatencyDeps {
  now?: () => number;
  random?: () => number;
  fetchImpl?: FetchImpl;
}

function requestRegion(request: Request): string | null {
  const cf = (request as unknown as { cf?: { colo?: unknown } }).cf;
  return typeof cf?.colo === "string" && cf.colo.length > 0 ? cf.colo : null;
}

/**
 * Time a render and sample it per the rule. Mirrors the
 * withShellCache wrapper shape in src/server.ts: this layer
 * changes WHEN a write happens, never what the response is.
 */
export async function withLatencySampling(
  request: Request,
  env: unknown,
  ctx: unknown,
  render: () => Promise<Response>,
  deps: LatencyDeps = {},
): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (!isSampledPath(pathname)) return render();

  const now = deps.now ?? (() => performance.now());
  const startedAt = now();
  const response = await render();
  const durationMs = Math.max(0, Math.round(now() - startedAt));

  const roll = (deps.random ?? Math.random)();
  if (shouldSample(durationMs, roll)) {
    recordLatencySample(
      env,
      {
        route: pathname.slice(0, 256),
        method: request.method,
        status: response.status,
        duration_ms: durationMs,
        region: requestRegion(request),
      },
      ctx,
      deps.fetchImpl,
    );
  }
  return response;
}
