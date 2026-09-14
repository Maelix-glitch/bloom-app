/**
 * GIPHY catalog client — talks to Bloom's `giphy` Edge Function.
 *
 * The GIPHY key is a Supabase secret (`GIPHY_API_KEY`). This module never
 * reads a VITE_ key and never calls api.giphy.com: the function holds the
 * secret and returns GIPHY's `data` array.
 *
 * Failures are empty arrays, not throws — a missing catalog stays empty
 * rather than substituting another source.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export const GIPHY_FUNCTION = "giphy";

export type GiphyCatalog = "gifs" | "stickers";
export type GiphyEndpoint = "trending" | "search";

export interface GiphyImage {
  url?: string;
  width?: string | number;
  height?: string | number;
}

export interface GiphyResult {
  id: string;
  title?: string;
  images?: {
    fixed_width?: GiphyImage;
    fixed_width_still?: GiphyImage;
    original?: GiphyImage;
    original_still?: GiphyImage;
  };
}

export interface GiphyQueryParams {
  catalog: GiphyCatalog;
  endpoint: GiphyEndpoint;
  q?: string;
  limit: number;
}

export type GiphyQuery = (
  catalog: GiphyCatalog,
  endpoint: GiphyEndpoint,
  params: Record<string, string>,
) => Promise<GiphyResult[]>;

function readData(payload: unknown): GiphyResult[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data.filter((item): item is GiphyResult => {
    return (
      Boolean(item) && typeof item === "object" && typeof (item as GiphyResult).id === "string"
    );
  });
}

/**
 * Ask the edge function. Resolves to `[]` rather than rejecting — a quiet
 * tray is the honest outcome when Bloom isn't connected or GIPHY is down.
 */
export const queryGiphyCatalog: GiphyQuery = async (catalog, endpoint, params) => {
  if (!hasSupabaseConfig) return [];

  try {
    const { data, error } = await supabase.functions.invoke(GIPHY_FUNCTION, {
      body: {
        catalog,
        endpoint,
        q: params["q"],
        limit: Number(params["limit"] ?? 24),
      } satisfies GiphyQueryParams,
    });
    if (error) return [];
    return readData(data);
  } catch {
    return [];
  }
};
