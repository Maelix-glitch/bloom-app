/**
 * TemplatesTray — 200+ fire templates, theme-matched only, no branding, no names.
 * Instagram-exact dark sheet, 2-col grid rounded 16px, image previews only, play button.
 * Categories: Trending, Birthday, Anniversary, Festival, Fashion, Nature, Memories, Love, Minimal
 */

import { useMemo, useState } from "react";
import { X, Search, Play } from "lucide-react";
import { CANVA_CATEGORIES, CANVA_TEMPLATES, type CanvaCategory, type CanvaTemplate } from "@/lib/stories/canvaTemplates";
import { cn } from "@/lib/utils";

function TemplateCard({ template, onPick }: { template: CanvaTemplate; onPick: (t: CanvaTemplate) => void }) {
  const hash = template.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const showPlay = hash % 3 === 0;

  const renderPreview = () => {
    if (template.category === 'festival') {
      return (
        <div className="absolute inset-0 flex flex-col bg-[#fff8e7]">
          <div className="h-[62%] relative overflow-hidden">
            <img src={template.thumbnail} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 p-2.5 flex flex-col justify-center bg-white">
            <p className="text-[12px] font-bold leading-tight text-[#5a3a1a]" style={{ fontFamily: "'Playfair Display', serif" }}>{template.text}</p>
            <p className="text-[8px] text-[#8b7355] leading-tight mt-1 line-clamp-2">{template.subtext}</p>
          </div>
        </div>
      );
    }
    if (template.layout === 'scrapbook') {
      return (
        <div className="absolute inset-0 bg-[#fefefe] p-1">
          <div className="h-full w-full bg-white rounded-[10px] border border-[#f0e6d3] p-1 flex flex-col gap-1 relative overflow-hidden">
            <div className="absolute -top-1 left-3 w-7 h-2.5 bg-[#fff8c6]/90 rotate-3 rounded-[1px] shadow-sm z-10" />
            <div className="flex gap-1 h-[58%]">
              <div className="flex-1 rounded-[8px] overflow-hidden bg-[#f5f5f5]"><img src={template.thumbnail} alt="" className="w-full h-full object-cover" /></div>
              <div className="w-[38%] flex flex-col gap-1">
                <div className="flex-1 rounded-[6px] bg-[#fff0f5] flex items-center justify-center"><span className="text-[14px]">🌸</span></div>
                <div className="h-5 rounded-[4px] bg-[#f5f1e8] flex items-center justify-center"><span className="text-[6px] font-bold text-[#8b7355] rotate-2" style={{ fontFamily: "'Dancing Script', cursive" }}>love you</span></div>
              </div>
            </div>
            <div className="flex-1 bg-[#fffaf0] rounded-[8px] p-1.5 border border-[#f5e6d3]">
              <p className="text-[10px] font-bold leading-tight text-[#5a4a3a]" style={{ fontFamily: "'Great Vibes', cursive" }}>{template.text}</p>
              <p className="text-[6px] text-[#8b7355] mt-0.5 line-clamp-2">{template.subtext}</p>
            </div>
          </div>
        </div>
      );
    }
    if (template.layout === 'polaroid') {
      return (
        <div className="absolute inset-0 bg-[#f8f6f0] p-2 flex flex-col items-center justify-center">
          <div className="bg-white rounded-[2px] p-2 shadow-[0_2px_10px_rgba(0,0,0,0.15)] rotate-1 w-[86%]">
            <div className="aspect-[4/3] bg-[#f0f0f0] rounded-[1px] overflow-hidden"><img src={template.thumbnail} alt="" className="w-full h-full object-cover" /></div>
            <div className="pt-2 pb-0.5"><p className="text-[9px] font-bold text-center text-[#2a2a2a]" style={{ fontFamily: "'Dancing Script', cursive" }}>{template.text}</p></div>
          </div>
        </div>
      );
    }
    if (template.layout === 'magazine') {
      return (
        <div className="absolute inset-0 bg-black">
          <img src={template.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-2.5">
            <p className="text-[13px] font-black leading-[0.9] text-white uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>{template.text.split(" ").slice(0, 2).join(" ")}</p>
            <p className="text-[7px] text-white/70 mt-1 line-clamp-2">{template.subtext}</p>
          </div>
        </div>
      );
    }
    if (template.layout.startsWith('collage')) {
      const count = template.layout === 'collage-2' ? 2 : template.layout === 'collage-3' ? 3 : 4;
      return (
        <div className="absolute inset-0 bg-white p-1">
          <div className={`grid gap-1 h-full ${count === 2 ? 'grid-rows-2' : 'grid-cols-2 grid-rows-2'}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={`rounded-[8px] overflow-hidden bg-[#f5f5f5] relative ${i === 0 && count === 3 ? 'row-span-2' : ''}`}>
                <img src={`${template.thumbnail}&${i}`} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="absolute inset-0">
        <img src={template.thumbnail} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="text-[12px] font-bold leading-tight text-white drop-shadow" style={{ fontFamily: template.fontFamily }}>{template.text}</p>
        </div>
      </div>
    );
  };

  return (
    <button type="button" onClick={() => onPick(template)} className="relative aspect-[3/4] w-full overflow-hidden rounded-[16px] bg-[#1c1c1e] border border-[#2c2c2e] active:scale-[0.97] transition-transform group">
      {renderPreview()}
      {showPlay ? (
        <span className="absolute left-2 bottom-2 grid size-6 place-items-center rounded-full bg-black/70 backdrop-blur-md text-white">
          <Play className="size-3 fill-white ml-[1px]" />
        </span>
      ) : null}
    </button>
  );
}

export function TemplatesTray({ onPick, onClose }: { onPick: (t: CanvaTemplate) => void; onClose: () => void }) {
  const [category, setCategory] = useState<CanvaCategory>('trending');
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = CANVA_TEMPLATES;
    if (category !== 'trending') list = list.filter(t => t.category === category);
    else list = [...list].slice(0, 100);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(t => t.text.toLowerCase().includes(q) || t.category.includes(q as any));
    }
    return list;
  }, [category, query]);

  return (
    <div className="fixed inset-0 z-[92] flex flex-col bg-[#121212] text-white" role="dialog" aria-label="Templates">
      <div className="flex flex-col items-center gap-3 px-4 pt-3 pb-3 shrink-0 border-b border-[#262626]">
        <div className="h-1 w-9 rounded-full bg-[#363636]" />
        <div className="flex w-full items-center justify-between">
          <h2 className="text-[17px] font-semibold">Templates</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-[#262626] text-white">
            <X className="size-5" />
          </button>
        </div>
        <label className="flex w-full items-center gap-2 rounded-full bg-[#262626] px-4 py-2.5">
          <Search className="size-4 shrink-0 text-[#a8a8a8]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates" className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-[#8e8e8e]" />
        </label>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0 scrollbar-none border-b border-[#262626]/50">
        {CANVA_CATEGORIES.map((c) => (
          <button key={c.id} type="button" onClick={() => setCategory(c.id)} className={cn("shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium border transition-all", category === c.id ? "bg-white text-black border-white" : "bg-[#262626] text-[#a8a8a8] border-[#363636]")}>{c.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-black p-3">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onPick(CANVA_TEMPLATES[0]!)} className="aspect-[3/4] w-full rounded-[16px] bg-[#1c1c1e] border border-[#2c2c2e] flex flex-col items-center justify-center gap-2 active:scale-[0.97]">
            <span className="grid size-10 place-items-center rounded-full border border-white text-[22px] font-light">+</span>
            <span className="text-[13px] font-medium">Create blank</span>
          </button>
          {filtered.map((t) => (<TemplateCard key={t.id} template={t} onPick={onPick} />))}
        </div>
      </div>
    </div>
  );
}
