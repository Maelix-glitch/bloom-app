/**
 * MediaTrays — Instagram-exact music + GIF pickers.
 * Music tray: matches screenshot exactly — handle, search #262626,
 * pills For you / Trending / Saved / Original audio, ranked list 1-10 with up/down arrows,
 * NEW badges, thumbnails, bookmark, like Instagram.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { Music2, Pause, Play, Search, Upload, Bookmark, TrendingUp, TrendingDown } from "lucide-react";
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

const IG_TRENDING_MOCK = [
  { id: "1", title: "Original audio", artist: "at_tyagii", handle: "at_tyagii", duration: "0:17", artwork: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face", rank: 1, trend: 'up' as const, isOriginal: true },
  { id: "2", title: "Original audio", artist: "itzz_m_a_y_a_18", handle: "itzz_m_a_y_a_18", duration: "0:28", artwork: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face", rank: 2, trend: 'up' as const, isOriginal: true },
  { id: "3", title: "Haral Hi Zindagi Jiye Me", artist: "Amit Aashik, Srishti Bharti", handle: "amit_aashik", duration: "4:57", artwork: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", rank: 3, trend: 'up' as const },
  { id: "4", title: "Qismat Kaur", artist: "Gulab Sidhu, Kulshan Sandhu", handle: "gulab_sidhu", duration: "3:42", artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", rank: 4, trend: 'up' as const },
  { id: "5", title: "Original audio", artist: "punam__rajput_2310", handle: "punam__rajput_2310", duration: "0:08", artwork: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face", rank: 5, trend: 'down' as const, isOriginal: true },
  { id: "6", title: "Original audio", artist: "tingloocartoons", handle: "tingloocartoons", duration: "0:10", artwork: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=200&h=200&fit=crop", rank: 6, trend: 'up' as const, isOriginal: true },
  { id: "7", title: "Original audio", artist: "anju_yadav753", handle: "anju_yadav753", duration: "0:17", artwork: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face", rank: 7, trend: 'new' as const, isOriginal: true },
  { id: "8", title: "Jeeva Shivachi Bail Jodi", artist: "Chandrashekar Gadgil, Shakuntala Jadhav", handle: "chandra_gadgil", duration: "5:12", artwork: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop", rank: 8, trend: 'up' as const },
  { id: "9", title: "Original audio", artist: "tyagideepanshi", handle: "tyagideepanshi", duration: "0:12", artwork: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop&crop=face", rank: 9, trend: 'new' as const, isOriginal: true },
  { id: "10", title: "Original audio", artist: "bhatitales", handle: "bhatitales", duration: "0:14", artwork: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=face", rank: 10, trend: 'up' as const, isOriginal: true },
  { id: "11", title: "Die With A Smile", artist: "Lady Gaga, Bruno Mars", handle: "ladygaga", duration: "4:11", artwork: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", rank: 11, trend: 'up' as const },
  { id: "12", title: "APT.", artist: "ROSE, Bruno Mars", handle: "roses_are_rosie", duration: "2:49", artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop", rank: 12, trend: 'up' as const },
  { id: "13", title: "Espresso", artist: "Sabrina Carpenter", handle: "sabrinacarpenter", duration: "2:55", artwork: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", rank: 13, trend: 'down' as const },
  { id: "14", title: "Birds of a Feather", artist: "Billie Eilish", handle: "billieeilish", duration: "3:30", artwork: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop", rank: 14, trend: 'up' as const },
  { id: "15", title: "Not Like Us", artist: "Kendrick Lamar", handle: "kendricklamar", duration: "4:34", artwork: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop", rank: 15, trend: 'new' as const },
];

const MUSIC_TABS = [
  { id: 'for-you', label: 'For you' },
  { id: 'trending', label: 'Trending' },
  { id: 'saved', label: 'Saved' },
  { id: 'original', label: 'Original audio' },
] as const;

export function MusicTray({ onPick, onClose }: { onPick: (music: PickedMusic) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof MUSIC_TABS)[number]['id']>('trending');
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const debounced = useDebounced(query);

  useEffect(() => {
    let alive = true;
    if (!musicProvider.configured) return;
    setLoading(true);
    const run = debounced.trim() ? musicProvider.search(debounced, 20) : musicProvider.trending(30);
    void run.then((t) => alive && setTracks(t)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [debounced]);

  useEffect(() => () => audioRef.current?.pause(), []);

  const togglePreview = (track: MusicTrack) => {
    const audio = audioRef.current;
    if (!audio || !track.previewUrl) return;
    if (previewId === track.id) { audio.pause(); setPreviewId(null); return; }
    audio.src = track.previewUrl;
    void audio.play().catch(() => setPreviewId(null));
    setPreviewId(track.id);
  };

  const onAudioFile = async (file: File | null) => {
    if (!file) return;
    const invalid = validateAudioFile(file);
    if (invalid) { setAudioError(invalid); return; }
    setAudioError(null);
    setAudioBusy(true);
    try {
      const durationMs = await probeAudioDuration(file);
      const title = file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "My audio";
      onPick({ trackId: `own:${Date.now()}`, title, artist: "Your audio", durationMs: durationMs || 15000, file });
    } finally { setAudioBusy(false); }
  };

  const displayMock = useMemo(() => {
    let list = IG_TRENDING_MOCK;
    if (activeTab === 'original') list = list.filter(t => t.isOriginal);
    if (activeTab === 'saved') list = list.filter(t => saved.has(t.id));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.handle.toLowerCase().includes(q));
    }
    return list;
  }, [activeTab, query, saved]);

  return (
    <div className="fixed inset-0 z-[92] flex flex-col justify-end bg-black/70" role="dialog" aria-label="Music">
      <div className="flex max-h-[88vh] w-full flex-col rounded-t-[16px] bg-[#121212] border-t border-[#262626]">
        <div className="flex flex-col items-center gap-3 px-4 pt-3 pb-3 shrink-0">
          <div className="h-1 w-10 rounded-full bg-[#363636]" />
        </div>
        <div className="px-4 pb-3 shrink-0">
          <label className="flex w-full items-center gap-3 rounded-[10px] bg-[#262626] px-3 py-3">
            <Search className="size-[18px] shrink-0 text-[#a8a8a8]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="w-full bg-transparent text-[16px] text-white outline-none placeholder:text-[#a8a8a8]" />
          </label>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 shrink-0 scrollbar-none">
          {MUSIC_TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={cn("shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition-all", activeTab === tab.id ? "bg-white text-black" : "bg-[#262626] text-white")}>{tab.label}</button>
          ))}
        </div>
        <audio ref={audioRef} preload="none" onEnded={() => setPreviewId(null)} />
        <div className="flex-1 overflow-y-auto px-2 pb-6">
          <div className="px-2 py-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={audioBusy} className="flex w-full items-center gap-3 rounded-xl bg-[#1a1a1a] border border-[#262626] px-4 py-3.5 text-left active:scale-[0.98] mb-3">
              <span className="grid size-10 place-items-center rounded-full bg-[#262626] text-white"><Upload className="size-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-white">{audioBusy ? "Reading…" : "Your audio"}</span><span className="block text-[12px] text-[#a8a8a8]">Upload MP3, up to 12 MB</span></span>
            </button>
            <input ref={fileRef} type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm" className="hidden" onChange={(e) => { const file = e.target.files?.[0] ?? null; e.target.value = ""; void onAudioFile(file); }} />
            {audioError ? <p className="text-[13px] text-[#ff3040] px-2">{audioError}</p> : null}
          </div>
          {musicProvider.configured && loading ? (
            <div className="flex flex-col gap-2 py-2 px-2">{[0,1,2,3,4].map((i) => (<div key={i} className="h-16 animate-pulse rounded-xl bg-[#1a1a1a]" />))}</div>
          ) : null}
          <ul className="flex flex-col">
            {displayMock.map((item) => (
              <li key={item.id} className="flex items-center gap-2 px-2 py-2.5 hover:bg-[#1e1e1e] active:bg-[#1a1a1a] rounded-lg">
                <div className="flex w-10 shrink-0 flex-col items-center gap-1">
                  <span className="text-[18px] font-bold leading-none text-white">{item.rank}</span>
                  {item.trend === 'up' ? (<TrendingUp className="size-3 text-[#1DB954]" />) : item.trend === 'down' ? (<TrendingDown className="size-3 text-[#ff3040]" />) : (<span className="rounded-[4px] bg-[#0095f6] px-1 py-0.5 text-[8px] font-bold leading-none text-white">NEW</span>)}
                </div>
                <div className="relative size-14 shrink-0 overflow-hidden rounded-[8px] bg-[#262626]"><img src={item.artwork} alt="" className="h-full w-full object-cover" loading="lazy" /></div>
                <div className="min-w-0 flex-1 leading-tight"><span className="block truncate text-[15px] font-semibold text-white">{item.title}</span><span className="flex items-center gap-1 truncate text-[13px] text-[#a8a8a8]"><span className="text-[11px]">↗</span><span className="truncate">{item.handle} • {item.duration}</span></span></div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setSaved((s) => { const n = new Set(s); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; }); }} className="grid size-8 place-items-center text-white shrink-0"><Bookmark className={cn("size-5", saved.has(item.id) ? "fill-white" : "")} /></button>
              </li>
            ))}
          </ul>
          {musicProvider.configured && tracks.length > 0 && (query.trim() || activeTab !== 'trending') ? (
            <div className="mt-4 border-t border-[#262626] pt-4">
              <p className="px-4 pb-2 text-[12px] font-semibold uppercase tracking-widest text-[#a8a8a8]">Search results</p>
              <ul className="flex flex-col gap-1">
                {tracks.map((track) => (
                  <li key={track.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[#1a1a1a]">
                    <span className="grid size-12 place-items-center overflow-hidden rounded-lg bg-[#262626] text-white">{track.artworkUrl ? (<img src={track.artworkUrl} alt="" className="size-full object-cover" loading="lazy" />) : (<Music2 className="size-5" />)}</span>
                    <span className="min-w-0 flex-1 leading-tight"><span className="block truncate text-[14px] font-semibold text-white">{track.title}</span><span className="block truncate text-[12px] text-[#a8a8a8]">{track.artist}</span></span>
                    {track.previewUrl ? (<button type="button" onClick={() => togglePreview(track)} className="grid size-8 place-items-center rounded-full bg-[#262626] text-white">{previewId === track.id ? <Pause className="size-4" /> : <Play className="size-4" />}</button>) : null}
                    <button type="button" onClick={() => onPick({ trackId: track.id, title: track.title, artist: track.artist, src: track.previewUrl ?? undefined, durationMs: track.durationMs })} className="rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-black">Add</button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 -z-10" />
    </div>
  );
}

export function GifTray({ onPick, onClose }: { onPick: (gif: GifAsset, file?: File) => void; onPickMotion?: (item: any) => void; onClose: () => void; }) {
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
    return () => { alive = false; };
  }, [debounced]);

  const trendingLabel = useMemo(() => (debounced.trim() ? "Results" : "Trending"), [debounced]);

  const onUploadFile = (file: File | null) => {
    if (!file || uploadBusy) return;
    const invalid = validateGifFile(file);
    if (invalid) { setUploadError(invalid); return; }
    setUploadError(null);
    setUploadBusy(true);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setUploadBusy(false);
      onPick({ id: `upload:${Date.now().toString(36)}`, src: url, still: url, width: img.naturalWidth || 200, height: img.naturalHeight || 200, title: file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "My GIF" }, file);
    };
    img.onerror = () => { URL.revokeObjectURL(url); setUploadBusy(false); setUploadError("Couldn't open that file"); };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-[91] flex flex-col justify-end bg-black/60" role="dialog" aria-label="GIFs">
      <div className="flex max-h-[80vh] w-full flex-col rounded-t-[12px] bg-[#121212] border-t border-[#262626]">
        <div className="flex flex-col gap-3 border-b border-[#262626] px-4 py-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#363636]" />
          <div className="flex items-center justify-between"><h2 className="text-[16px] font-semibold text-white">GIF</h2><button type="button" onClick={onClose} className="text-[14px] font-medium text-[#0095f6]">Done</button></div>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadBusy} className="flex w-full items-center gap-3 rounded-xl bg-[#1a1a1a] border border-[#262626] px-4 py-3.5 text-left active:scale-[0.98]"><span className="grid size-10 place-items-center rounded-full bg-[#262626] text-white"><Upload className="size-5" /></span><span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-white">{uploadBusy ? "Reading…" : "Upload GIF"}</span><span className="block text-[12px] text-[#a8a8a8]">Your .gif or .webp, up to 4 MB</span></span></button>
          <input ref={fileRef} type="file" accept="image/gif,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0] ?? null; e.target.value = ""; onUploadFile(file); }} />
          {uploadError ? <p className="text-[13px] text-[#ff3040]">{uploadError}</p> : null}
          {gifProvider.configured ? (<label className="flex items-center gap-2 rounded-lg bg-[#262626] px-3 py-2.5"><Search className="size-4 shrink-0 text-[#a8a8a8]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search GIFs" className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#a8a8a8]" /></label>) : null}
          {!gifProvider.configured ? (<p className="text-[13px] text-[#a8a8a8]">Upload your own GIFs — GIF search needs a key</p>) : loading ? (<div className="grid grid-cols-3 gap-2">{[0,1,2,3,4,5].map((i) => (<div key={i} className="aspect-square animate-pulse rounded-lg bg-[#1a1a1a]" />))}</div>) : gifs.length === 0 ? (<p className="py-8 text-center text-[14px] text-[#a8a8a8]">{debounced.trim() ? "No results" : "Nothing trending"}</p>) : (<><p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a8]">{trendingLabel}</p><div className="grid grid-cols-3 gap-2">{gifs.map((gif) => (<button key={gif.id} type="button" onClick={() => onPick(gif)} className="overflow-hidden rounded-lg active:scale-95 transition-transform"><img src={gif.still} alt="" loading="lazy" className="aspect-square w-full object-cover" /></button>))}</div></>)}
        </div>
      </div>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 -z-10" />
    </div>
  );
}
