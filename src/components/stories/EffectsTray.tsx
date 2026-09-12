/**
 * EffectsTray — Instagram-exact Effects (AR face filters).
 * Dark #121212, handle, search, pills, 3-col grid with girl preview image + effect.
 * Like IG: effects have creator name, try button, save. Girl back there like Instagram.
 */

import { useMemo, useState } from "react";
import { Search, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EffectItem {
  id: string;
  name: string;
  creator: string;
  category: "trending" | "appearance" | "aesthetic" | "fun" | "world";
  preview: string;
  color: string;
  css: string;
  overlay?: string;
}

// Instagram girl preview — like IG effects show face with filter
const PREVIEW_GIRL = "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face";
const PREVIEW_GIRL_2 = "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=400&fit=crop&crop=face";
const PREVIEW_GIRL_3 = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face";

const EFFECTS: EffectItem[] = [
  { id: "soft-glow", name: "Soft Glow", creator: "instagram", category: "appearance", preview: "✨", color: "#feda75", css: "brightness(1.15) contrast(0.9) saturate(1.1)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "golden-hour", name: "Golden Hour", creator: "bloom", category: "aesthetic", preview: "🌅", color: "#fa7e1e", css: "sepia(0.2) saturate(1.3) brightness(1.05) hue-rotate(-10deg)", overlay: "linear-gradient(45deg, rgba(255,180,0,0.2), transparent)" },
  { id: "bw-mood", name: "B&W Mood", creator: "ig", category: "aesthetic", preview: "🌙", color: "#000000", css: "grayscale(1) contrast(1.1) brightness(1.05)", overlay: "none" },
  { id: "sparkle", name: "Sparkle", creator: "effects", category: "fun", preview: "💫", color: "#d62976", css: "brightness(1.1) contrast(1.05) saturate(1.2)", overlay: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 50%)" },
  { id: "vintage", name: "Vintage", creator: "retro", category: "aesthetic", preview: "📼", color: "#8e8e8e", css: "sepia(0.3) contrast(0.9) brightness(1.05) saturate(0.8)", overlay: "linear-gradient(0deg, rgba(255,200,100,0.15), transparent)" },
  { id: "heart-eyes", name: "Heart Eyes", creator: "love", category: "fun", preview: "😍", color: "#ed4956", css: "saturate(1.4) contrast(1.05)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,100,150,0.15), transparent 60%)" },
  { id: "freckles", name: "Freckles", creator: "beauty", category: "appearance", preview: "✿", color: "#f5c6a0", css: "contrast(1.05) saturate(1.1) brightness(1.02)", overlay: "none" },
  { id: "butterfly", name: "Butterfly", creator: "nature", category: "fun", preview: "🦋", color: "#a8edea", css: "saturate(1.2) brightness(1.08) hue-rotate(5deg)", overlay: "none" },
  { id: "rainbow", name: "Rainbow", creator: "color", category: "aesthetic", preview: "🌈", color: "#ff9ff3", css: "saturate(1.5) hue-rotate(10deg) contrast(1.05)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "angel", name: "Angel", creator: "heaven", category: "appearance", preview: "👼", color: "#ffffff", css: "brightness(1.12) contrast(0.95) saturate(1.1)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.5), transparent 50%)" },
  { id: "devil", name: "Devil", creator: "mischief", category: "fun", preview: "😈", color: "#ff3040", css: "contrast(1.2) saturate(1.3) hue-rotate(-10deg)", overlay: "linear-gradient(180deg, rgba(255,0,0,0.15), transparent)" },
  { id: "crown", name: "Crown", creator: "royal", category: "fun", preview: "👑", color: "#feca57", css: "brightness(1.08) contrast(1.1) saturate(1.2)", overlay: "none" },
  { id: "glasses", name: "Glasses", creator: "style", category: "appearance", preview: "👓", color: "#000000", css: "contrast(1.05) brightness(1.02)", overlay: "none" },
  { id: "flower-crown", name: "Flower Crown", creator: "bloom", category: "appearance", preview: "🌸", color: "#ff6b9d", css: "saturate(1.3) brightness(1.05) hue-rotate(-5deg)", overlay: "none" },
  { id: "space", name: "Space", creator: "cosmos", category: "world", preview: "🚀", color: "#4f5bd5", css: "hue-rotate(20deg) saturate(1.3) contrast(1.1)", overlay: "radial-gradient(circle at 50% 50%, rgba(100,100,255,0.2), transparent 60%)" },
  { id: "underwater", name: "Underwater", creator: "ocean", category: "world", preview: "🌊", color: "#0095f6", css: "hue-rotate(10deg) saturate(1.4) brightness(1.05)", overlay: "linear-gradient(180deg, rgba(0,150,255,0.2), transparent)" },
  { id: "fire", name: "Fire", creator: "hot", category: "fun", preview: "🔥", color: "#fa7e1e", css: "saturate(1.5) contrast(1.15) brightness(1.02) hue-rotate(-10deg)", overlay: "linear-gradient(45deg, rgba(255,100,0,0.2), transparent)" },
  { id: "ice", name: "Ice", creator: "cold", category: "aesthetic", preview: "❄️", color: "#48dbfb", css: "saturate(0.7) brightness(1.15) hue-rotate(180deg) contrast(0.95)", overlay: "linear-gradient(180deg, rgba(200,230,255,0.3), transparent)" },
];

const CATEGORIES: { id: EffectItem["category"] | "trending"; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "appearance", label: "Appearance" },
  { id: "aesthetic", label: "Aesthetic" },
  { id: "fun", label: "Fun" },
  { id: "world", label: "World" },
];

function getPreviewImage(id: string): string {
  const hash = id.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const idx = hash % 3;
  if (idx === 0) return PREVIEW_GIRL;
  if (idx === 1) return PREVIEW_GIRL_2;
  return PREVIEW_GIRL_3;
}

export function EffectsTray({ onPick, onClose }: { onPick: (effect: EffectItem) => void; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof CATEGORIES)[0]["id"]>("trending");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = EFFECTS;
    if (tab !== "trending") list = list.filter((e) => e.category === tab);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q) || e.creator.toLowerCase().includes(q));
    }
    return list;
  }, [tab, query]);

  return (
    <div className="fixed inset-0 z-[92] flex flex-col bg-[#121212] text-white" role="dialog" aria-label="Effects">
      <div className="flex flex-col items-center gap-3 px-4 pt-3 pb-4 shrink-0 border-b border-[#262626]">
        <div className="h-1 w-9 rounded-full bg-[#363636]" />
        <div className="flex w-full items-center justify-between">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Effects</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-[#262626] text-white">
            <span className="text-[18px]">×</span>
          </button>
        </div>

        <label className="flex w-full items-center gap-2 rounded-lg bg-[#262626] px-3 py-2.5">
          <Search className="size-4 shrink-0 text-[#a8a8a8]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search effects"
            className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#a8a8a8]"
          />
        </label>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0 scrollbar-none border-b border-[#262626]/50">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setTab(c.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium border transition-all",
              tab === c.id ? "bg-white text-black border-white" : "bg-[#262626] text-[#a8a8a8] border-[#363636]",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((effect) => (
            <button
              key={effect.id}
              type="button"
              onClick={() => onPick(effect)}
              className="flex flex-col items-center gap-2 text-left active:scale-[0.97] transition-transform group"
            >
              <div className="relative aspect-square w-full">
                <div className="absolute inset-0 rounded-full border-2 border-[#2c2c2e] overflow-hidden bg-[#1c1c1e] group-active:scale-95 transition-transform">
                  <img src={getPreviewImage(effect.id)} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: effect.css }} loading="lazy" />
                  {effect.overlay && effect.overlay !== "none" ? <div className="absolute inset-0 mix-blend-overlay opacity-70" style={{ background: effect.overlay }} /> : null}
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 grid size-6 place-items-center rounded-full bg-black/50 backdrop-blur-md text-[14px] border border-white/20">{effect.preview}</span>
                </div>
                <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-[#262626] border border-[#363636] text-white z-10">
                  <Bookmark
                    className={cn("size-3", saved.has(effect.id) ? "fill-white" : "")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSaved((s) => {
                        const n = new Set(s);
                        if (n.has(effect.id)) n.delete(effect.id);
                        else n.add(effect.id);
                        return n;
                      });
                    }}
                  />
                </span>
              </div>
              <span className="flex flex-col items-center">
                <span className="text-[12px] font-semibold text-white leading-tight truncate max-w-[80px]">{effect.name}</span>
                <span className="text-[10px] text-[#a8a8a8] truncate max-w-[80px]">{effect.creator}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
