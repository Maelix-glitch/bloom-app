/**
 * Bloom Story Platform — external content providers, abstracted.
 * GIF and music catalogs plug in here. Nothing in the story UI imports a
 * vendor SDK: trays talk to these interfaces, and when no provider is
 * configured they degrade to honest empty states instead of breaking
 * creation. Only approved sources are ever queried.
 */

export interface GifAsset {
  id: string;
  /** Playable URL (approved source only). */
  src: string;
  still: string;
  width: number;
  height: number;
  title: string;
}

export interface GifProvider {
  readonly id: string;
  readonly label: string;
  readonly configured: boolean;
  trending(limit: number): Promise<GifAsset[]>;
  search(query: string, limit: number): Promise<GifAsset[]>;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  /** 30s preview URL from the licensed catalog. */
  previewUrl: string | null;
  artworkUrl: string | null;
  durationMs: number;
  explicit: boolean;
}

export interface MusicProvider {
  readonly id: string;
  readonly label: string;
  readonly configured: boolean;
  /** Shown as a footnote so previews are credited. */
  readonly attribution?: string | undefined;
  search(query: string, limit: number): Promise<MusicTrack[]>;
  trending(limit: number): Promise<MusicTrack[]>;
}

/* ------------------------------ GIF: Tenor ------------------------------ */
/* Enabled only when a key is provided; otherwise `configured` is false and
 * the tray shows its graceful empty state. https-only, validated URLs. */

const TENOR_KEY =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[
      "VITE_TENOR_API_KEY"
    ]) ||
  "";

function isHttps(url: unknown): url is string {
  return typeof url === "string" && url.startsWith("https://") && url.length < 2048;
}

interface TenorResult {
  id: string;
  title?: string;
  media_formats?: Record<string, { url?: string; dims?: [number, number] }>;
}

function mapTenor(item: TenorResult): GifAsset | null {
  const formats = item.media_formats ?? {};
  const play = formats["gif"]?.url ?? formats["mediumgif"]?.url ?? formats["tinygif"]?.url;
  const still = formats["tinygif"]?.url ?? formats["nanogif"]?.url ?? play;
  if (!isHttps(play)) return null;
  const dims = formats["gif"]?.dims ?? formats["mediumgif"]?.dims ?? [220, 220];
  return {
    id: `tenor:${item.id}`,
    src: play,
    still: isHttps(still) ? still : play,
    width: dims[0] || 220,
    height: dims[1] || 220,
    title: typeof item.title === "string" ? item.title.slice(0, 80) : "GIF",
  };
}

class TenorGifProvider implements GifProvider {
  readonly id = "tenor";
  readonly label = "GIFs";
  readonly configured = TENOR_KEY.length > 0;

  private async query(endpoint: string, params: Record<string, string>): Promise<GifAsset[]> {
    if (!this.configured) return [];
    const url = new URL(`https://tenor.googleapis.com/v2/${endpoint}`);
    url.searchParams.set("key", TENOR_KEY);
    url.searchParams.set("client_key", "bloom_app");
    url.searchParams.set("media_filter", "gif,tinygif,nanogif");
    url.searchParams.set("contentfilter", "medium");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`gif provider ${res.status}`);
    const data = (await res.json()) as { results?: TenorResult[] };
    return (data.results ?? []).map(mapTenor).filter((g): g is GifAsset => g !== null);
  }

  trending(limit: number): Promise<GifAsset[]> {
    return this.query("featured", { limit: String(Math.min(limit, 20)) }).catch(() => []);
  }

  search(query: string, limit: number): Promise<GifAsset[]> {
    const q = query.trim();
    if (!q) return Promise.resolve([]);
    return this.query("search", { q: q.slice(0, 80), limit: String(Math.min(limit, 20)) }).catch(
      () => [],
    );
  }
}

class EmptyGifProvider implements GifProvider {
  readonly id = "none";
  readonly label = "GIFs";
  readonly configured = false;
  trending(): Promise<GifAsset[]> {
    return Promise.resolve([]);
  }
  search(): Promise<GifAsset[]> {
    return Promise.resolve([]);
  }
}

export const gifProvider: GifProvider = TENOR_KEY ? new TenorGifProvider() : new EmptyGifProvider();

/* ------------------------- music: licensed catalog ----------------------- */
/* No unauthorized streaming: the catalog serves Apple's own 30-second
 * previews (keyless Search API), and anything else is the user's own file.
 * If the catalog is unreachable the tray falls back to own-audio only. */

interface ITunesSong {
  trackId: number;
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackExplicitness?: string;
}

function mapITunes(item: ITunesSong): MusicTrack | null {
  if (typeof item.trackName !== "string" || typeof item.artistName !== "string") return null;
  if (typeof item.trackId !== "number") return null;
  const preview =
    typeof item.previewUrl === "string" && item.previewUrl.startsWith("https://")
      ? item.previewUrl
      : null;
  const artwork =
    typeof item.artworkUrl100 === "string"
      ? item.artworkUrl100.replace("100x100bb", "200x200bb")
      : null;
  return {
    id: `itunes:${item.trackId}`,
    title: item.trackName.slice(0, 120),
    artist: item.artistName.slice(0, 120),
    previewUrl: preview,
    artworkUrl: artwork && artwork.startsWith("https://") ? artwork : null,
    // Previews are 30 seconds; stories only ever play a short slice.
    durationMs: 30000,
    explicit: item.trackExplicitness === "explicit",
  };
}

class ITunesMusicProvider implements MusicProvider {
  readonly id = "itunes";
  readonly label = "Music";
  readonly configured = true;
  readonly attribution = "30-second previews · iTunes";

  private async query(term: string, limit: number): Promise<MusicTrack[]> {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", term.slice(0, 80));
    url.searchParams.set("media", "music");
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 20)));
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`music provider ${res.status}`);
    const data = (await res.json()) as { results?: ITunesSong[] };
    return (data.results ?? [])
      .map(mapITunes)
      .filter((t): t is MusicTrack => t !== null && t.previewUrl !== null);
  }

  search(query: string, limit: number): Promise<MusicTrack[]> {
    const q = query.trim();
    if (!q) return Promise.resolve([]);
    return this.query(q, limit).catch(() => []);
  }

  /** No charts endpoint without a key, so trending blends feel-good searches. */
  async trending(limit: number): Promise<MusicTrack[]> {
    const terms = ["feel good morning", "happy acoustic", "calm piano"];
    const settled = await Promise.allSettled(terms.map((t) => this.query(t, 6)));
    const seen = new Set<string>();
    const merged: MusicTrack[] = [];
    for (const s of settled) {
      if (s.status !== "fulfilled") continue;
      for (const track of s.value) {
        if (seen.has(track.id)) continue;
        seen.add(track.id);
        merged.push(track);
      }
    }
    return merged.slice(0, limit);
  }
}

export const musicProvider: MusicProvider = new ITunesMusicProvider();

/** Attach the user's own audio file as story music (their file, their rights). */
export const OWN_AUDIO = {
  maxBytes: 12 * 1024 * 1024,
  accepted: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm"],
} as const;

export function validateAudioFile(file: File): string | null {
  if (!OWN_AUDIO.accepted.includes(file.type as (typeof OWN_AUDIO.accepted)[number])) {
    return "That isn't an audio file we can use. Try an MP3.";
  }
  if (file.size > OWN_AUDIO.maxBytes) {
    return "That audio is too large. Keep it under 12 MB.";
  }
  if (file.size < 1024) return "That audio looks empty. Try a different file.";
  return null;
}

/** A GIF from the user's own device — uploaded to their storage at publish. */
export const OWN_GIF = {
  maxBytes: 4 * 1024 * 1024,
  accepted: ["image/gif", "image/webp"],
} as const;

export function validateGifFile(file: File): string | null {
  if (!OWN_GIF.accepted.includes(file.type as (typeof OWN_GIF.accepted)[number])) {
    return "That isn't a GIF. Pick a .gif or animated .webp file.";
  }
  if (file.size > OWN_GIF.maxBytes) {
    return "That GIF is too large. Keep it under 4 MB.";
  }
  if (file.size < 64) return "That file looks empty. Try a different GIF.";
  return null;
}
