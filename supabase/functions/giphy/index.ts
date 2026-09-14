/**
 * Bloom GIPHY proxy — Supabase Edge Function.
 *
 * The story editor's GIF and sticker trays call this instead of GIPHY
 * directly, so `GIPHY_API_KEY` stays a server secret (`supabase secrets set`)
 * and never ships in the Vite bundle.
 *
 * Deploy:
 *   supabase functions deploy giphy
 *   supabase secrets set GIPHY_API_KEY=...
 *
 * Request:  { catalog: "gifs"|"stickers", endpoint: "trending"|"search", q?, limit? }
 * Response: { data: GiphyResult[] }  — the GIPHY payload, key stripped.
 */
/* eslint-disable */
// @ts-nocheck - Deno runtime, not part of the app's TS project.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CATALOGS = new Set(["gifs", "stickers"]);
const ENDPOINTS = new Set(["trending", "search"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const key = Deno.env.get("GIPHY_API_KEY")?.trim() ?? "";
  if (!key) return json({ data: [] }, 200);

  try {
    const body = await req.json().catch(() => ({}));
    const catalog = typeof body.catalog === "string" ? body.catalog : "";
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    if (!CATALOGS.has(catalog) || !ENDPOINTS.has(endpoint)) {
      return json({ error: "bad request" }, 400);
    }

    const q = typeof body.q === "string" ? body.q.trim().slice(0, 80) : "";
    if (endpoint === "search" && !q) return json({ data: [] }, 200);

    const limitRaw = Number(body.limit);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.round(limitRaw), 1), 24) : 24;

    const url = new URL(`https://api.giphy.com/v1/${catalog}/${endpoint}`);
    url.searchParams.set("api_key", key);
    url.searchParams.set("rating", "g");
    url.searchParams.set("bundle", "messaging_non_clips");
    url.searchParams.set("limit", String(limit));
    if (endpoint === "search") {
      url.searchParams.set("q", q);
      url.searchParams.set("lang", "en");
    }

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return json({ data: [] }, 200);
    const payload = await res.json();
    const data = Array.isArray(payload?.data) ? payload.data : [];
    return json({ data }, 200);
  } catch {
    return json({ data: [] }, 200);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
