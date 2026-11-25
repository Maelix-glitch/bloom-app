import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleHealth } from "./lib/observability/health";
import { handleStatus } from "./lib/observability/status";
import { primeServerEnv, withLatencySampling } from "./lib/observability/latency";
import { withSecurityHeaders } from "./lib/security-headers";
import { withShellCache } from "./lib/shell-cache";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    /* M-242: capture the platform env once (the built chain
       forwards only the request to this entry, so the env and
       ctx parameters cannot be relied on - see
       lib/observability/latency.ts). A no-op after first call. */
    await primeServerEnv();
    /* M-242: /api/health answers before the SSR pipeline - one
       small database check, no render, nothing cached (the shell
       cache already excludes /api paths). The alert check watches
       this endpoint. */
    if (new URL(request.url).pathname === "/api/health") {
      try {
        return withSecurityHeaders(await handleHealth(env));
      } catch {
        /* handleHealth is built to never throw; if it somehow
           does, fall through to the normal pipeline rather than
           answering health with the error page. */
      }
    }
    /* M-247: /api/status feeds the public status page - the same
       database check plus the 24h per-route percentiles. Always
       200 with the state inside the payload (it is a page feed,
       not an alarm); aggregate timings only, no per-person data. */
    if (new URL(request.url).pathname === "/api/status") {
      try {
        return withSecurityHeaders(await handleStatus(env));
      } catch {
        /* Same discipline as health: never answer the feed with
           the error page. */
      }
    }
    try {
      const handler = await getServerEntry();
      /* Document GETs may be served from the shell edge cache
         (M-218, lib/shell-cache.ts): repeat loads within the TTL
         skip the SSR render entirely — the fix for the load
         test's Worker-CPU 1102s. The render below is unchanged;
         the cache only decides whether it needs to run. */
      const render = async () =>
        normalizeCatastrophicSsrResponse(await handler.fetch(request, env, ctx));
      /* M-242: every app request is timed and sampled
         (lib/observability/latency.ts) around the cache + render
         pipeline. The sampler is fire-and-forget and cannot
         affect the response; it only decides whether this
         request's duration joins public.latency_samples. */
      const response = await withLatencySampling(request, env, ctx, () =>
        withShellCache(request, {}, render),
      );
      /* Every response — document, asset, redirect, error — carries
         the security headers (see lib/security-headers.ts). The
         shell cache returns raw responses, so cache hits pass
         through here exactly like fresh renders and carry the
         identical header set. */
      return withSecurityHeaders(response);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
