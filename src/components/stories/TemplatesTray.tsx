/**
 * TemplatesTray — Canva-quality 200+ templates, Instagram-exact dark sheet but Canva light cards inside.
 * Matches screenshots: 2-col grid, rounded 16px, image previews, play button, titles.
 * Categories: Trending, Birthday, Anniversary, Festival, Fashion, Nature, Memories, Love, Minimal
 * All free, premium quality, scrapbook/birthday/festival fire templates.
 */

import { useMemo, useState } from "react";
import { X, Search, Play } from "lucide-react";
import { CANVA_CATEGORIES, CANVA_TEMPLATES, type CanvaCategory, type CanvaTemplate } from "@/lib/stories/canvaTemplates";
import { cn } from "@/lib/utils";

function TemplateCard({ template, onPick }: { template: CanvaTemplate; onPick: (t: CanvaTemplate) => void }) {
  const hash = template.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const showPlay = hash % 3 === 0;
  const isFree = hash % 5 === 0;

  // Generate Canva-like collage preview based on layout using CSS
  const renderPreview = () => {
    if (template.category === 'festival') {
      return (
        <div className="absolute inset-0 flex flex-col bg-[#fff8e7]">
          <div className="h-[45%] bg-gradient-to-br from-[#ffecd2] to-[#fcb69f] relative overflow-hidden">
            <img src={template.thumbnail} alt="" className="w-full h-full object-cover mix-blend-multiply opacity-80" />
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-[13px] font-bold leading-tight text-[#8b4513]" style={{ fontFamily: "'Playfair Display', serif" }}>{template.text}</p>
            </div>
          </div>
          <div className="flex-1 p-2 flex flex-col justify-center bg-white">
            <p className="text-[9px] text-[#6a4a3a] leading-tight">{template.subtext}</p>
            <div className="mt-2 flex gap-1">
              <div className="h-1 w-1 rounded-full bg-[#ff6b35]" />
              <div className="h-1 w-1 rounded-full bg-[#f7931e]" />
              <div className="h-1 w-1 rounded-full bg-[#ffd23f]" />
            </div>
          </div>
        </div>
      );
    }
    if (template.layout === 'scrapbook') {
      return (
        <div className="absolute inset-0 bg-[#fefefe] p-1.5">
          <div className="h-full w-full bg-white rounded-[8px] border border-[#f0e6d3] shadow-sm p-1.5 flex flex-col gap-1.5 relative overflow-hidden">
            {/* Tape effect */}
            <div className="absolute -top-1 left-4 w-8 h-3 bg-[#fff8c6]/80 rotate-3 rounded-[2px] shadow-sm" />
            <div className="flex gap-1 h-[55%]">
              <div className="flex-1 rounded-[6px] overflow-hidden bg-[#f5f5f5] border border-[#e8e8e8]">
                <img src={template.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="w-[40%] flex flex-col gap-1">
                <div className="flex-1 rounded-[4px] bg-[#fff0f5] border border-[#ffe4ec] flex items-center justify-center">
                  <span className="text-[16px]">🌸</span>
                </div>
                <div className="h-6 rounded-[4px] bg-[#f0f0f0] flex items-center justify-center">
                  <span className="text-[7px] font-bold text-[#8b7355] rotate-2" style={{ fontFamily: "'Dancing Script', cursive" }}>love you</span>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-[#fffaf0] rounded-[6px] p-1.5 border border-[#f5e6d3]">
              <p className="text-[11px] font-bold leading-tight text-[#5a4a3a]" style={{ fontFamily: "'Great Vibes', cursive" }}>{template.text}</p>
              <p className="text-[7px] text-[#8b7355] mt-1 leading-tight">{template.subtext.slice(0, 40)}</p>
            </div>
            {/* Flower decoration */}
            <div className="absolute bottom-1 right-1 text-[14px] opacity-60">🌺</div>
          </div>
        </div>
      );
    }
    if (template.layout === 'polaroid') {
      return (
        <div className="absolute inset-0 bg-[#f8f6f0] p-2 flex flex-col items-center justify-center">
          <div className="bg-white rounded-[2px] p-2 shadow-[0_2px_8px_rgba(0,0,0,0.12)] rotate-1 w-[88%]">
            <div className="aspect-[4/3] bg-[#f0f0f0] rounded-[1px] overflow-hidden">
              <img src={template.thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="pt-2 pb-1">
              <p className="text-[10px] font-bold text-center text-[#2a2a2a]" style={{ fontFamily: "'Dancing Script', cursive" }}>{template.text}</p>
              <p className="text-[7px] text-center text-[#8a8a8a] mt-0.5">{template.subtext.slice(0, 30)}</p>
            </div>
          </div>
          <div className="mt-2 flex gap-1">
            <div className="w-6 h-1 bg-[#e8d5c4] rounded-full" />
            <div className="w-3 h-1 bg-[#e8d5c4] rounded-full" />
          </div>
        </div>
      );
    }
    if (template.layout === 'magazine') {
      return (
        <div className="absolute inset-0 bg-black">
          <img src={template.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute top-2 left-2 right-2 flex justify-between">
            <span className="bg-white text-black text-[7px] px-2 py-1 rounded-full font-bold tracking-widest">STYLED WELL</span>
            <span className="text-white/60 text-[6px]">®reallygreatsite.com</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-[18px] font-black leading-[0.9] text-white uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>{template.text.split(" ").slice(0, 3).join(" ")}</p>
            <p className="text-[8px] text-white/70 mt-1 leading-tight">{template.subtext.slice(0, 50)}</p>
            <div className="mt-2 flex gap-1">
              <div className="w-8 h-8 rounded-[4px] bg-white/20 backdrop-blur-sm border border-white/30 overflow-hidden">
                <img src={template.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="w-8 h-8 rounded-[4px] bg-white/20 backdrop-blur-sm border border-white/30 overflow-hidden">
                <img src={template.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (template.layout.startsWith('collage')) {
      const count = template.layout === 'collage-2' ? 2 : template.layout === 'collage-3' ? 3 : 4;
      return (
        <div className="absolute inset-0 bg-white p-1">
          <div className={`grid gap-1 h-full ${count === 2 ? 'grid-cols-1 grid-rows-2' : count === 3 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2 grid-rows-2'}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={`rounded-[8px] overflow-hidden bg-[#f5f5f5] relative ${i === 0 && count === 3 ? 'row-span-2' : ''}`}>
                <img src={`${template.thumbnail}&${i}`} alt="" className="w-full h-full object-cover" />
                {i === 0 ? (
                  <div className="absolute bottom-1 left-1 right-1 bg-white/90 backdrop-blur-sm rounded-[4px] px-1.5 py-1">
                    <p className="text-[8px] font-bold text-black leading-tight truncate">{template.text}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="absolute top-1 right-1 bg-black/70 text-white text-[6px] px-1.5 py-0.5 rounded-full backdrop-blur-sm">#{template.category}</div>
        </div>
      );
    }
    // single
    return (
      <div className="absolute inset-0">
        <img src={template.thumbnail} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <p className="text-[14px] font-bold leading-tight text-white drop-shadow-lg" style={{ fontFamily: template.fontFamily }}>{template.text}</p>
          <p className="text-[9px] text-white/80 mt-1 leading-tight">{template.subtext}</p>
        </div>
      </div>
    );
  };

  return (
    <button
      type="button"
      onClick={() => onPick(template)}
      className="flex flex-col gap-1.5 text-left active:scale-[0.98] transition-transform group"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[16px] bg-white border border-[#e8e8e8] shadow-[0_2px_8px_rgba(0,0,0,0.08)] group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow">
        {renderPreview()}

        {/* Play button for video templates like Canva */}
        {showPlay ? (
          <span className="absolute left-2 bottom-2 grid size-7 place-items-center rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20 shadow-lg">
            <Play className="size-3.5 fill-white ml-[1px]" />
          </span>
        ) : null}

        {isFree ? (
          <span className="absolute right-2 top-2 rounded-full bg-[#a259ff] px-2 py-0.5 text-[8px] font-bold text-white shadow-sm">FREE</span>
        ) : null}
      </div>
      <span className="px-1 text-[11px] font-medium leading-tight text-[#1a1a1a] truncate dark:text-white/90">{template.name}</span>
    </button>
  );
}

export function TemplatesTray({ onPick, onClose }: { onPick: (t: CanvaTemplate) => void; onClose: () => void }) {
  const [category, setCategory] = useState<CanvaCategory>('trending');
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = CANVA_TEMPLATES;
    if (category !== 'trending') {
      list = list.filter(t => t.category === category);
    } else {
      // trending = featured + random
      list = [...list].sort((a, b) => (a.id.charCodeAt(0) - b.id.charCodeAt(0))).slice(0, 80);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.text.toLowerCase().includes(q) || t.category.includes(q as any));
    }
    return list;
  }, [category, query]);

  return (
    <div className="fixed inset-0 z-[92] flex flex-col bg-white text-black dark:bg-[#121212] dark:text-white" role="dialog" aria-label="Templates">
      {/* Header like Canva screenshot - but adapted to our dark sheet */}
      <div className="flex flex-col gap-3 px-4 pt-3 pb-4 shrink-0 border-b border-[#e8e8e8] dark:border-[#262626] bg-white dark:bg-[#121212]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-1 w-9 rounded-full bg-[#d1d1d1] dark:bg-[#363636]" />
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[22px] font-black tracking-tight" style={{ fontFamily: "'Canva Sans', sans-serif, cursive", background: 'linear-gradient(90deg, #00c4cc, #7d2ae8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Canva</span>
                <span className="text-[12px] font-medium text-[#6a6a6a] dark:text-[#a8a8a8] ml-2">Templates</span>
              </div>
            </div>
            <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-[#f0f0f0] dark:bg-[#262626] text-black dark:text-white">
              <X className="size-5" />
            </button>
          </div>
        </div>

        <label className="flex w-full items-center gap-2 rounded-full bg-[#f0f0f0] dark:bg-[#262626] px-4 py-2.5 border border-[#e8e8e8] dark:border-transparent">
          <Search className="size-4 shrink-0 text-[#6a6a6a] dark:text-[#a8a8a8]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates"
            className="w-full bg-transparent text-[14px] text-black dark:text-white outline-none placeholder:text-[#8e8e8e]"
          />
        </label>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {CANVA_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium border transition-all",
                category === c.id ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white" : "bg-white text-[#333] border-[#e8e8e8] dark:bg-[#262626] dark:text-[#a8a8a8] dark:border-[#363636]",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f8f8f8] dark:bg-[#000000] p-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Create blank card like Canva screenshot */}
          <button
            type="button"
            onClick={() => onPick(CANVA_TEMPLATES[0]!)}
            className="aspect-[3/4] w-full rounded-[16px] bg-white border border-[#e8e8e8] dark:bg-[#1c1c1e] dark:border-[#2c2c2e] flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform"
          >
            <span className="grid size-10 place-items-center rounded-full border-2 border-black dark:border-white text-[24px] font-light">+</span>
            <span className="text-[14px] font-medium text-black dark:text-white">Create blank</span>
          </button>

          {filtered.map((template) => (
            <TemplateCard key={template.id} template={template} onPick={onPick} />
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 pb-10">
          <p className="text-[12px] text-[#8e8e8e]">220+ premium templates • All free</p>
          <p className="text-[11px] text-[#a8a8a8]">Birthday • Anniversary • Festival • Fashion • Nature • Memories</p>
        </div>
      </div>
    </div>
  );
}
