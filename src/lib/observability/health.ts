/**
 * M-242 - GET /api/health.
 *
 * The endpoint the future alert check (audit item #62) will watch:
 * a tiny JSON answer to one question - is the app up and can it
 * reach its database? No auth, no user data, nothing beyond the
 * status itself:
 *
 *   healthy:   200 { "ok": true,  "db": "ok" }
 *   unhealthy: 503 { "ok": false, "db": "error" }
 *
 * The database check is deliberately trivial: with the
 * service-role key (the normal production case) it reads a single
 * row's id from public.latency_samples - which also proves the
 * M-242 migration has landed. Before the key is configured it
 * falls back to the anon key against the PostgREST root, which
 * answers only when the API and its database are up. Any failure
 * - no config, a network error, a non-200 - reads as unhealthy:
 * a health endpoint that guesses "fine" is worse than none.
 *
 * src/server.ts intercepts the path before the SSR pipeline (and
 * the shell cache already excludes /api), so this costs one small
 * outbound request and no render.
 */

import { resolveServerConfig, type FetchImpl } from "./latency";

export interface HealthResult {
  ok: boolean;
  db: "ok" | "error";
}

export async function checkDatabase(
  env: unknown,
  fetchImpl: FetchImpl = fetch,
): Promise<boolean> {
  const config = resolveServerConfig(env);
  if (!config.url) return false;
  try {
    if (config.serviceRoleKey) {
      const res = await fetchImpl(
        `${config.url}/rest/v1/latency_samples?select=id&limit=1`,
        {
          headers: {
            apikey: config.serviceRoleKey,
            authorization: `Bearer ${config.serviceRoleKey}`,
          },
        },
      );
      return res.ok;
    }
    if (config.anonKey) {
      const res = await fetchImpl(`${config.url}/rest/v1/`, {
        headers: { apikey: config.anonKey },
      });
      return res.ok;
    }
    return false;
  } catch {
    return false;
  }
}

export async function handleHealth(
  env: unknown,
  fetchImpl: FetchImpl = fetch,
): Promise<Response> {
  const healthy = await checkDatabase(env, fetchImpl);
  const result: HealthResult = healthy ? { ok: true, db: "ok" } : { ok: false, db: "error" };
  return new Response(JSON.stringify(result), {
    status: healthy ? 200 : 503,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
