/**
 * MediaTrays — Instagram-exact music + GIF pickers.
 * Dark #121212, search #262626, no ugly Bloom motion.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { Disc3, Music2, Pause, Play, Search, Upload } from "lucide-react";

import {
  gifProvider,
  musicProvider,
  validateAudioFile,
  validateGifFile,
  type GifAsset,
  type MusicTrack,
} from "@/lib/stories/providers";
import { probeAudioDuration } from "@/lib/profile/media";
import { cn } from "@/lib/utils";

export interface PickedMusic {
  trackId: string;
  title: string;
  artist: string;
  src?: string | undefined;
  durationMs: number;
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

const MUSIC_MOODS = ["Trending", "Chill", "Love", "Party", "Focus", "Sad", "Happy", "Vibes"];

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
    <div className="fixed inset-0 z-[91] flex flex-col justify-end bg-black/60" role="dialog" aria-label="Music">
      <div className="flex max-h-[80vh] w-full flex-col rounded-t-[12px] bg-[#121212] border-t border-[#262626]">
        <div className="flex flex-col gap-3 border-b border-[#262626] px-4 py-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#363636]" />
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-white">Music</h2>
            <button type="button" onClick={onClose} className="text-[14px] font-medium text-[#0095f6]">
              Done
            </button>
          </div>
        </div>

        <audio ref={audioRef} preload="none" onEnded={() => setPreviewId(null)} />

        <div className="flex flex-col gap-3 overflow-y-auto px-4 py-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          {musicProvider.configured ? (
            <>
              <label className="flex items-center gap-2 rounded-lg bg-[#262626] px-3 py-2.5">
                <Search className="size-4 shrink-0 text-[#a8a8a8]" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search music"
                  className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#a8a8a8]"
                />
              </label>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {MUSIC_MOODS.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setQuery(mood === "Trending" ? "" : mood)}
                    className={cn(
                      "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium",
                      query === mood || (mood === "Trending" && !query)
                        ? "border-white bg-white text-black"
                        : "border-[#363636] bg-[#262626] text-white",
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
            className="flex w-full items-center gap-3 rounded-xl bg-[#1a1a1a] border border-[#262626] px-4 py-3.5 text-left active:scale-[0.98]"
          >
            <span className="grid size-10 place-items-center rounded-full bg-[#262626] text-white">
              <Upload className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-white">{audioBusy ? "Reading…" : "Your audio"}</span>
              <span className="block text-[12px] text-[#a8a8a8]">Upload MP3, up to 12 MB</span>
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
          {audioError ? <p className="text-[13px] text-[#ff3040]">{audioError}</p> : null}

          {!musicProvider.configured ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-[#1a1a1a] border border-[#262626] px-4 py-10 text-center">
              <Disc3 className="size-6 text-[#a8a8a8]" />
              <p className="text-[15px] font-semibold text-white">No catalog</p>
              <p className="text-[13px] text-[#a8a8a8]">Your own audio above works</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col gap-2 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-[#1a1a1a]" />
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[#a8a8a8]">{debounced.trim() ? "No results" : "Nothing trending"}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {tracks.map((track) => (
                <li key={track.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#1a1a1a]">
                  <span className="grid size-12 place-items-center overflow-hidden rounded-lg bg-[#262626] text-white">
                    {track.artworkUrl ? (
                      <img src={track.artworkUrl} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <Music2 className="size-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[14px] font-semibold text-white">{track.title}</span>
                    <span className="block truncate text-[12px] text-[#a8a8a8]">{track.artist}</span>
                  </span>
                  {track.previewUrl ? (
                    <button
                      type="button"
                      onClick={() => togglePreview(track)}
                      className="grid size-8 place-items-center rounded-full bg-[#262626] text-white"
                    >
                      {previewId === track.id ? <Pause className="size-4" /> : <Play className="size-4" />}
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
                    className="rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-black"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 -z-10" />
    </div>
  );
}

export function GifTray({
  onPick,
  onClose,
}: {
  onPick: (gif: GifAsset, file?: File) => void;
  onPickMotion?: (item: any) => void;
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
      setUploadError("Couldn't open that file");
    };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-[91] flex flex-col justify-end bg-black/60" role="dialog" aria-label="GIFs">
      <div className="flex max-h-[80vh] w-full flex-col rounded-t-[12px] bg-[#121212] border-t border-[#262626]">
        <div className="flex flex-col gap-3 border-b border-[#262626] px-4 py-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#363636]" />
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-white">GIF</h2>
            <button type="button" onClick={onClose} className="text-[14px] font-medium text-[#0095f6]">
              Done
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadBusy}
            className="flex w-full items-center gap-3 rounded-xl bg-[#1a1a1a] border border-[#262626] px-4 py-3.5 text-left active:scale-[0.98]"
          >
            <span className="grid size-10 place-items-center rounded-full bg-[#262626] text-white">
              <Upload className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-white">{uploadBusy ? "Reading…" : "Upload GIF"}</span>
              <span className="block text-[12px] text-[#a8a8a8]">Your .gif or .webp, up to 4 MB</span>
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
          {uploadError ? <p className="text-[13px] text-[#ff3040]">{uploadError}</p> : null}

          {gifProvider.configured ? (
            <label className="flex items-center gap-2 rounded-lg bg-[#262626] px-3 py-2.5">
              <Search className="size-4 shrink-0 text-[#a8a8a8]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search GIFs"
                className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#a8a8a8]"
              />
            </label>
          ) : null}

          {!gifProvider.configured ? (
            <p className="text-[13px] text-[#a8a8a8]">Upload your own GIFs — GIF search needs a key</p>
          ) : loading ? (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-[#1a1a1a]" />
              ))}
            </div>
          ) : gifs.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[#a8a8a8]">{debounced.trim() ? "No results" : "Nothing trending"}</p>
          ) : (
            <>
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a8]">{trendingLabel}</p>
              <div className="grid grid-cols-3 gap-2">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => onPick(gif)}
                    className="overflow-hidden rounded-lg active:scale-95 transition-transform"
                  >
                    <img src={gif.still} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 -z-10" />
    </div>
  );
}
