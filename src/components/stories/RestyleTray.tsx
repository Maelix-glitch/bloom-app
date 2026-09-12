/**
 * RestyleTray — Instagram-exact Restyle screen.
 * Matches screenshots: title Restyle, pills Trending/Film Effects/Lighting/Utilities/World, 3-col grid with GIRL image previews + flower icon + name.
 * Girl back there like Instagram — any image okay, we use 3 girl faces.
 */

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { RESTYLE_CATEGORIES, RESTYLE_EFFECTS, type RestyleCategory, type RestyleEffect } from "@/lib/stories/catalogs";
import { cn } from "@/lib/utils";

const PREVIEW_IMAGES = [
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=500&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=500&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=500&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=400&h=500&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1512310604669-443f26c35f52?w=400&h=500&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=500&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face",
];

function getPreviewImage(id: string): string {
  const hash = id.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  return PREVIEW_IMAGES[Math.abs(hash) % PREVIEW_IMAGES.length]!;
}

function EffectCard({ effect, onPick }: { effect: RestyleEffect; onPick: (e: RestyleEffect) => void }) {
  return (
    <button type="button" onClick={() => onPick(effect)} className="flex flex-col gap-2 text-left active:scale-[0.97] transition-transform group">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[16px] bg-[#1c1c1e] border border-[#2c2c2e]">
        <img src={getPreviewImage(effect.id)} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: effect.css }} loading="lazy" />
        {effect.overlay && effect.overlay !== "none" ? <div className="absolute inset-0 mix-blend-overlay opacity-80" style={{ background: effect.overlay }} /> : null}
        {/* Flower icon top-left like IG */}
        <span className="absolute left-2 top-2 grid size-6 place-items-center rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="opacity-90">
            <circle cx="12" cy="12" r="2" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <ellipse key={a} cx="12" cy="6" rx="2" ry="3" transform={`rotate(${a} 12 12)`} />
            ))}
          </svg>
        </span>
        {/* Subtle gradient bottom like IG for legibility */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>
      <span className="px-1 text-[13px] font-medium leading-tight text-white truncate">{effect.name}</span>
    </button>
  );
}

export function RestyleTray({ onPick, onClose }: { onPick: (effect: RestyleEffect) => void; onClose: () => void }) {
  const [tab, setTab] = useState<RestyleCategory>("film");

  const filtered = useMemo(() => {
    if (tab === "trending") return RESTYLE_EFFECTS;
    return RESTYLE_EFFECTS.filter((e) => e.category === tab);
  }, [tab]);

  return (
    <div className="fixed inset-0 z-[92] flex flex-col bg-[#121212] text-white" role="dialog" aria-label="Restyle">
      <div className="flex flex-col items-center gap-3 px-4 pt-3 pb-4 shrink-0">
        <div className="h-1 w-9 rounded-full bg-[#363636]" />
        <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Restyle</h2>
        <p className="text-[13px] text-[#a8a8a8] -mt-2">Choose a style — girl preview with effect</p>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-4 shrink-0 scrollbar-none">
        {RESTYLE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setTab(c.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-[14px] font-medium border transition-colors",
              tab === c.id ? "bg-[#2a2a2a] border-[#3a3a3a] text-white" : "bg-transparent border-[#2a2a2a] text-[#a8a8a8]",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((effect) => (
            <EffectCard key={effect.id} effect={effect} onPick={onPick} />
          ))}
        </div>
      </div>

      <button type="button" onClick={onClose} className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-[#2a2a2a] text-white">
        <X className="size-5" />
      </button>
    </div>
  );
}
