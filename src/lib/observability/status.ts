/**
 * M-247 - the public status page's data feed (GET /api/status).
 *
 * The page at /status is Bloom's public face for "is it up, and
 * is it fast": it shows only what the observability layer already
 * measures (M-242/M-245) - the same database check /api/health
 * runs, plus the per-route percentiles from public.latency_
 * percentiles over the last 24 hours. Aggregate timings and
 * route names only; no per-person data exists in this payload
 * because none exists in the view.
 *
 * The service-role key stays server-side, exactly as in
 * health.ts: this module is imported by src/server.ts alone,
 * and the page fetches this endpoint, never the database.
 *
 * The degraded threshold is ONE definition shared with the
 * alert watch: a route is "slower than usual" when its 24h p99
 * passes 2,000 ms on at least 20 samples (below that the p99 is
 * one or two requests wearing a crown).
 */

import { checkDatabase } from "./health";
import { resolveServerConfig, type FetchImpl } from "./latency";

export const LATENCY_DEGRADED_P99_MS = 2000;
export const LATENCY_DEGRADED_MIN_SAMPLES = 20;

/* M-248: the speed bands live in their own import-free module
   (speedBands.ts) so the client page can use them without
   pulling this server module into the browser bundle. They are
   re-exported here so the feed and the page share one source. */
export {
  SPEED_FAST_MAX_MS,
  speedBand,
  speedBarPercent,
  type SpeedBand,
} from "./speedBands";

export interface RouteLatency {
  route: string;
  samples: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  degraded: boolean;
}

export interface StatusPayload {
  ok: boolean;
  db: "ok" | "error";
  checkedAt: string;
  window: "24h";
  routes: RouteLatency[];
}

/** One row of the latency_percentiles view, as PostgREST returns it. */
interface PercentileRow {
  route?: unknown;
  samples?: unknown;
  p50_ms?: unknown;
  p95_ms?: unknown;
  p99_ms?: unknown;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/** The degraded rule, in one place (see the module note). */
export function isDegraded(samples: number, p99Ms: number): boolean {
  return samples >= LATENCY_DEGRADED_MIN_SAMPLES && p99Ms > LATENCY_DEGRADED_P99_MS;
}

/**
 * Shape raw view rows into the payload's route list: malformed
 * rows are dropped (a status page must never print a number it
 * cannot stand behind), the rest sort by sample count so the
 * busiest pages read first.
 */
export function shapeStatusRows(rows: readonly PercentileRow[]): RouteLatency[] {
  const shaped: RouteLatency[] = [];
  for (const row of rows) {
    if (typeof row.route !== "string" || row.route.length === 0) continue;
    const samples = num(row.samples);
    const p50Ms = num(row.p50_ms);
    const p95Ms = num(row.p95_ms);
    const p99Ms = num(row.p99_ms);
    if (samples === null || p50Ms === null || p95Ms === null || p99Ms === null) {
      continue;
    }
    shaped.push({
      route: row.route,
      samples,
      p50Ms,
      p95Ms,
      p99Ms,
      degraded: isDegraded(samples, p99Ms),
    });
  }
  return shaped.sort((a, b) => b.samples - a.samples || a.route.localeCompare(b.route));
}

async function fetchPercentileRows(
  env: unknown,
  fetchImpl: FetchImpl,
): Promise<PercentileRow[]> {
  const config = resolveServerConfig(env);
  const key = config.serviceRoleKey;
  if (!config.url || !key) return [];
  const auth = "Bearer " + key;
  try {
    const res = await fetchImpl(
      `${config.url}/rest/v1/latency_percentiles?select=route,samples,p50_ms,p95_ms,p99_ms&window=eq.24h`,
      { headers: { apikey: key, authorization: auth } },
    );
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as PercentileRow[]) : [];
  } catch {
    return [];
  }
}

/**
 * Build the status payload. Never throws: a database that cannot
 * be reached reports db "error" with an empty route list, which
 * is precisely what the page needs to say "needs attention".
 */
export async function buildStatus(
  env: unknown,
  fetchImpl: FetchImpl = fetch,
  now: () => Date = () => new Date(),
): Promise<StatusPayload> {
  const dbOk = await checkDatabase(env, fetchImpl).catch(() => false);
  const routes = dbOk ? await fetchPercentileRows(env, fetchImpl) : [];
  return {
    ok: dbOk,
    db: dbOk ? "ok" : "error",
    checkedAt: now().toISOString(),
    window: "24h",
    routes: shapeStatusRows(routes),
  };
}

/**
 * GET /api/status. Always 200: this is a page feed, not an
 * alarm - the payload's own ok flag carries the state (the
 * alert watch keeps using /api/health and its 503).
 */
export async function handleStatus(
  env: unknown,
  fetchImpl: FetchImpl = fetch,
): Promise<Response> {
  const payload = await buildStatus(env, fetchImpl).catch(
    (): StatusPayload => ({
      ok: false,
      db: "error",
      checkedAt: new Date().toISOString(),
      window: "24h",
      routes: [],
    }),
  );
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
