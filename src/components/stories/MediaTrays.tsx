/**
 * MediaTrays — music + GIF pickers.
 * Music searches licensed 30-second previews and always accepts your own
 * audio; GIFs search the catalog when a key is connected and always accept
 * your uploads. Creation never breaks because a provider is missing.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Disc3, Music2, Pause, Play, Search, Upload } from "lucide-react";

import { StorySheet } from "./StorySheet";
import {
  gifProvider,
  musicProvider,
  validateAudioFile,
  validateGifFile,
  type GifAsset,
  type MusicTrack,
} from "@/lib/stories/providers";
import { probeAudioDuration } from "@/lib/profile/media";
import { MOTION_PACK, type MotionItem } from "@/lib/stories/catalogs";
import { cn } from "@/lib/utils";

export interface PickedMusic {
  trackId: string;
  title: string;
  artist: string;
  src?: string | undefined;
  durationMs: number;
  /** The user's own file, uploaded at publish. */
  file?: File | undefined;
}

function useDebounced(value: string, ms = 350): string {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* --------------------------------- music -------------------------------- */

const MUSIC_MOODS = [
  "Morning acoustic",
  "Lo-fi chill",
  "Soft piano",
  "Feel good",
  "Party hits",
  "Focus",
  "Love songs",
  "Rainy day",
];

export function MusicTray({
  onPick,
  onClose,
}: {
  onPick: (music: PickedMusic) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const debounced = useDebounced(query);

  useEffect(() => {
    let alive = true;
    if (!musicProvider.configured) return;
    setLoading(true);
    const run = debounced.trim() ? musicProvider.search(debounced, 20) : musicProvider.trending(30);
    void run.then((t) => alive && setTracks(t)).finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [debounced]);

  useEffect(() => () => audioRef.current?.pause(), []);

  const togglePreview = (track: MusicTrack) => {
    const audio = audioRef.current;
    if (!audio || !track.previewUrl) return;
    if (previewId === track.id) {
      audio.pause();
      setPreviewId(null);
      return;
    }
    audio.src = track.previewUrl;
    void audio.play().catch(() => setPreviewId(null));
    setPreviewId(track.id);
  };

  const onAudioFile = async (file: File | null) => {
    if (!file) return;
    const invalid = validateAudioFile(file);
    if (invalid) {
      setAudioError(invalid);
      return;
    }
    setAudioError(null);
    setAudioBusy(true);
    try {
      const durationMs = await probeAudioDuration(file);
      const title = file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "My audio";
      onPick({
        trackId: `own:${Date.now()}`,
        title,
        artist: "Your audio",
        durationMs: durationMs || 15000,
        file,
      });
    } finally {
      setAudioBusy(false);
    }
  };

  return (
    <StorySheet title="Music" subtitle="Set the mood — gently." onClose={onClose}>
      <audio ref={audioRef} preload="none" onEnded={() => setPreviewId(null)} />
      <div className="flex flex-col gap-3 pb-2">
        {musicProvider.configured ? (
          <>
            <label className="flex items-center gap-2.5 rounded-full border border-border bg-surface/60 px-4 py-2.5 transition-colors focus-within:border-border-strong">
              <Search className="size-4 shrink-0 text-faint" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search songs and artists…"
                aria-label="Search music"
                className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-faint/70"
              />
            </label>
            <div
              className="flex gap-1.5 overflow-x-auto pb-0.5"
              role="group"
              aria-label="Browse by mood"
            >
              {MUSIC_MOODS.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setQuery(mood)}
                  aria-pressed={query === mood}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors",
                    query === mood
                      ? "border-[color:var(--profile-accent-border,var(--border-strong))] bg-[color:var(--profile-accent-soft,var(--surface-2))] text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mood}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={audioBusy}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3.5 text-left transition-colors hover:border-border-strong disabled:opacity-50"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-3 text-muted-foreground">
            <Upload className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold">
              {audioBusy ? "Reading your audio…" : "Use your own audio"}
            </span>
            <span className="block text-[11.5px] text-faint">An MP3 of yours, up to 12 MB.</span>
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = "";
            void onAudioFile(file);
          }}
        />
        {audioError ? <p className="text-[12px] text-rose">{audioError}</p> : null}

        {!musicProvider.configured ? (
          <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface/40 px-4 py-8 text-center">
            <Disc3 className="size-5 text-faint" aria-hidden />
            <p className="display text-[15px] text-muted-foreground">No song catalog connected.</p>
            <p className="max-w-[32ch] text-[12.5px] text-faint">
              Bloom only plays music it has the rights to. Your own audio above works beautifully.
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-2 py-2" aria-label="Loading music" role="status">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-2/60" />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-faint">
            {debounced.trim() ? "No songs match that." : "Nothing trending right now."}
          </p>
        ) : (
          <>
            {musicProvider.attribution ? (
              <p className="mono text-center text-[10px] uppercase tracking-[0.1em] text-faint">
                {musicProvider.attribution}
              </p>
            ) : null}
            <ul className="flex flex-col gap-1.5">
              {tracks.map((track) => (
                <li
                  key={track.id}
                  className="flex items-center gap-3 rounded-2xl border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-surface/60"
                >
                  <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-3 text-muted-foreground">
                    {track.artworkUrl ? (
                      <img
                        src={track.artworkUrl}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Music2 className="size-4" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13.5px] font-semibold">
                      {track.title}
                      {track.explicit ? (
                        <span className="mono ml-1.5 rounded border border-border px-1 text-[9px] text-faint">
                          E
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {track.artist}
                    </span>
                  </span>
                  {track.previewUrl ? (
                    <button
                      type="button"
                      onClick={() => togglePreview(track)}
                      aria-label={
                        previewId === track.id ? `Pause ${track.title}` : `Preview ${track.title}`
                      }
                      className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {previewId === track.id ? (
                        <Pause className="size-3.5" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      onPick({
                        trackId: track.id,
                        title: track.title,
                        artist: track.artist,
                        src: track.previewUrl ?? undefined,
                        durationMs: track.durationMs,
                      })
                    }
                    className="bsheet-primary h-9 shrink-0 px-4 text-[12.5px]"
                  >
                    Use
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </StorySheet>
  );
}

/* ---------------------------------- GIF ---------------------------------- */

export function GifTray({
  onPick,
  onPickMotion,
  onClose,
}: {
  /** `file` is set when the GIF comes from the device — uploaded at publish. */
  onPick: (gif: GifAsset, file?: File) => void;
  onPickMotion: (item: MotionItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const debounced = useDebounced(query);

  useEffect(() => {
    let alive = true;
    if (!gifProvider.configured) return;
    setLoading(true);
    const run = debounced.trim() ? gifProvider.search(debounced, 24) : gifProvider.trending(24);
    void run.then((g) => alive && setGifs(g)).finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [debounced]);

  const trendingLabel = useMemo(() => (debounced.trim() ? "Results" : "Trending"), [debounced]);

  const onUploadFile = (file: File | null) => {
    if (!file || uploadBusy) return;
    const invalid = validateGifFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploadError(null);
    setUploadBusy(true);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setUploadBusy(false);
      onPick(
        {
          id: `upload:${Date.now().toString(36)}`,
          src: url,
          still: url,
          width: img.naturalWidth || 200,
          height: img.naturalHeight || 200,
          title: file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "My GIF",
        },
        file,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setUploadBusy(false);
      setUploadError("That file wouldn't open as an image. Try another GIF.");
    };
    img.src = url;
  };

  return (
    <StorySheet title="GIFs" subtitle="A little motion, when words won't do." onClose={onClose}>
      <div className="flex flex-col gap-3 pb-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadBusy}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3.5 text-left transition-colors hover:border-border-strong disabled:opacity-50"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-3 text-muted-foreground">
            <Upload className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold">
              {uploadBusy ? "Reading your GIF…" : "Upload a GIF"}
            </span>
            <span className="block text-[11.5px] text-faint">
              A .gif or animated .webp of yours, up to 4 MB.
            </span>
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = "";
            onUploadFile(file);
          }}
        />
        {uploadError ? <p className="text-[12px] text-rose">{uploadError}</p> : null}

        {gifProvider.configured ? (
          <label className="flex items-center gap-2.5 rounded-full border border-border bg-surface/60 px-4 py-2.5 transition-colors focus-within:border-border-strong">
            <Search className="size-4 shrink-0 text-faint" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GIFs…"
              aria-label="Search GIFs"
              className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-faint/70"
            />
          </label>
        ) : null}

        {!gifProvider.configured ? (
          <p className="text-[12px] leading-relaxed text-faint">
            GIF search lights up when a catalog key is connected — meanwhile your uploads and Bloom
            Motion below carry the moment.
          </p>
        ) : loading ? (
          <div className="grid grid-cols-3 gap-2" aria-label="Loading GIFs" role="status">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-surface-2/60" />
            ))}
          </div>
        ) : gifs.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-faint">
            {debounced.trim() ? "No GIFs match that." : "Nothing here right now."}
          </p>
        ) : (
          <>
            <p className={cn("eyebrow")}>{trendingLabel}</p>
            <div className="grid grid-cols-3 gap-2">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => onPick(gif)}
                  aria-label={`Add GIF: ${gif.title}`}
                  className="overflow-hidden rounded-xl border border-transparent transition-all hover:border-border active:scale-95"
                >
                  <img
                    src={gif.still}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </>
        )}

        <p className={cn("eyebrow", "pt-1")}>Bloom Motion · always with you</p>
        <div className="grid grid-cols-6 gap-2" role="group" aria-label="Bloom Motion pack">
          {MOTION_PACK.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPickMotion(item)}
              title={item.label}
              aria-label={`Add motion: ${item.label}`}
              data-anim={item.animation}
              className="motion-cell"
            >
              <span aria-hidden>{item.emoji}</span>
            </button>
          ))}
        </div>
      </div>
    </StorySheet>
  );
}
