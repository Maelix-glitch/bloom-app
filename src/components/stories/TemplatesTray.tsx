/**
 * TemplatesTray — 100% pure CSS fire templates, NO unsplash, exact replicas of screenshots.
 * Black and White Illustrated Birthday, Gray Beige Memories, Janmashtami, Today Dump, Scrapbook Love
 * All templates built with divs, gradients, SVG doodles, tape, flowers — no external photos.
 */

import { useMemo, useState } from "react";
import { X, Search, Play } from "lucide-react";
import { FIRE_CATEGORIES, FIRE_TEMPLATES, type FireCategory, type FireTemplate } from "@/lib/stories/fireTemplates";
import { cn } from "@/lib/utils";

function BirthdayIllustrated() {
  return (
    <div className="absolute inset-0 bg-[#f0f0f0] overflow-hidden">
      {/* Crumpled paper texture via CSS */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
      {/* Top doodles */}
      <div className="absolute top-2 left-2 flex items-start gap-1">
        <div className="size-8 rounded-full border-2 border-black bg-black relative"><div className="absolute inset-1 rounded-full bg-white/20" /></div>
        <div className="flex flex-col gap-0.5 mt-1">
          <div className="size-1.5 rounded-full bg-black" />
          <div className="size-1 rounded-full bg-black ml-2" />
        </div>
      </div>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[6px] font-mono text-black">@reallygreatsite</div>
      <div className="absolute top-2 right-2">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1"><path d="M12 2 L13.5 8.5 L20 9 L14.5 13.5 L16 20 L12 15.5 L8 20 L9.5 13.5 L4 9 L10.5 8.5 Z" /><circle cx="18" cy="4" r="1" fill="black" /></svg>
      </div>
      {/* Photo grid - 5 frames black border, placeholder gradients not photos */}
      <div className="absolute top-10 left-2 right-2 bottom-12 grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          <div className="h-[28%] rounded-[2px] border-2 border-black bg-gradient-to-br from-[#3a3a3a] to-[#1a1a1a] relative overflow-hidden"><div className="absolute inset-0 flex items-center justify-center text-white/40 text-[8px]">IMG</div><div className="absolute bottom-0.5 left-0.5 right-0.5 h-1 bg-black/50" /></div>
          <div className="h-[28%] rounded-[2px] border-2 border-black bg-gradient-to-br from-[#4a4a4a] to-[#2a2a2a]"><div className="w-full h-full flex items-center justify-center text-white/30 text-[7px]">IMG</div></div>
          <div className="flex-1 rounded-[2px] border-2 border-black bg-gradient-to-br from-[#2a4a3a] to-[#1a2a1a] relative"><div className="absolute inset-0 flex items-center justify-center text-white/30 text-[6px]">MOUNTAIN</div></div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-[42%] rounded-[2px] border-2 border-black bg-gradient-to-br from-[#2a2a2a] to-[#0a0a0a] relative"><div className="absolute top-1 right-1 size-2 bg-white/20 rounded-full" /><div className="absolute bottom-2 left-2 right-2 text-[6px] text-white/60">person</div></div>
          <div className="h-[24%] rounded-[2px] border-2 border-black bg-gradient-to-br from-[#3a3a3a] to-[#1a1a1a]" />
          <div className="flex-1 relative"><svg className="absolute -top-1 -right-1 w-12 h-6" viewBox="0 0 50 20"><path d="M2 18 Q10 2 20 12 T40 8" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg></div>
        </div>
      </div>
      {/* Happy Birthday handwritten bottom */}
      <div className="absolute bottom-2 left-2 right-2">
        <p className="text-[18px] leading-none text-black" style={{ fontFamily: "'Great Vibes', cursive, 'Dancing Script', cursive" }}>Happy Birthday</p>
      </div>
    </div>
  );
}

function MemoriesMinimal() {
  return (
    <div className="absolute inset-0 bg-[#3a3a3a] overflow-hidden p-1.5">
      <div className="absolute top-2 left-3 text-white text-[16px] font-light tracking-wide" style={{ fontFamily: "'Dancing Script', cursive" }}>Memories</div>
      <div className="absolute top-10 left-1.5 right-1.5 bottom-1.5 grid grid-cols-2 grid-rows-3 gap-1.5">
        {/* Row 1 */}
        <div className="relative rounded-[2px] overflow-hidden bg-[#8b7355]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-2 bg-white/90 rotate-6 shadow-sm" /><div className="w-full h-full bg-gradient-to-br from-[#d4a574] to-[#8b7355] flex items-center justify-center text-white/40 text-[7px]">KNEE</div></div>
        <div className="rounded-[2px] bg-[#5a6a7a]"><div className="w-full h-full bg-gradient-to-br from-[#a0b0c0] to-[#5a6a7a]" /></div>
        {/* Row 2 with text box */}
        <div className="col-span-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-[2px] bg-[#2a2a2a] relative"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-2 bg-white/80 -rotate-3" /><div className="w-full h-full bg-[#1a1a1a]" /></div>
          <div className="rounded-[2px] bg-[#f5f1e8] p-2 flex items-center"><p className="text-[7px] leading-tight text-[#2a2a2a]">Tiny pieces of life that made this season beautiful.</p></div>
        </div>
        {/* Row 3 */}
        <div className="rounded-[2px] bg-[#4a4a4a] relative"><div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-2 bg-white/80 rotate-3" /><div className="w-full h-full bg-gradient-to-br from-[#6a7a8a] to-[#3a4a5a]" /></div>
        <div className="rounded-[2px] bg-[#2a2a2a] relative overflow-hidden">
          <div className="absolute bottom-2 left-2 w-8 h-0.5 bg-white rounded-full rotate-12" />
          <div className="absolute bottom-0 right-1 w-6 h-2 bg-white/90 -rotate-6" />
          <div className="w-full h-full bg-[#1a1a1a]" />
        </div>
      </div>
    </div>
  );
}

function JanmashtamiTemplate() {
  return (
    <div className="absolute inset-0 bg-[#fffef5] overflow-hidden">
      {/* Marigold garland top */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-[#fffbe6] border-b border-[#fde68a]/30">
        <div className="absolute top-0 left-0 right-0 h-3 flex justify-around items-center px-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="size-2 rounded-full bg-[#fbbf24] shadow-sm" />
              <div className="w-px h-2 bg-[#f59e0b]/50" />
              <div className="size-3 rounded-full bg-[#fde68a] border border-[#fbbf24] flex items-center justify-center text-[6px]">🌼</div>
            </div>
          ))}
        </div>
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-6">
          <div className="size-5 rounded-[3px] bg-[#fef3c7] border border-[#fbbf24] shadow-sm flex items-center justify-center text-[8px]">🪔</div>
          <div className="size-5 rounded-[3px] bg-[#fef3c7] border border-[#fbbf24] shadow-sm flex items-center justify-center text-[8px]">🪔</div>
        </div>
      </div>
      <div className="absolute top-20 left-0 right-0 flex flex-col items-center">
        <p className="text-[11px] text-[#1e40af]/70" style={{ fontFamily: "'Dancing Script', cursive" }}>Happy</p>
        <p className="text-[20px] font-bold text-[#1e40af] leading-none tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Janamashtami</p>
        <div className="mt-6 w-20 h-20 rounded-full bg-gradient-to-br from-[#fde68a] to-[#f59e0b] border-2 border-[#fbbf24] flex items-center justify-center shadow-inner"><span className="text-[24px]">🪔</span></div>
        <div className="mt-3 flex gap-1"><div className="size-1 rounded-full bg-[#fbbf24]" /><div className="size-1 rounded-full bg-[#f59e0b]" /><div className="size-1 rounded-full bg-[#fbbf24]" /></div>
      </div>
      <div className="absolute bottom-3 left-0 right-0 text-center"><p className="text-[6px] text-[#a8a8a8]">www.reallygreatsite.com</p></div>
    </div>
  );
}

function NatureDump() {
  return (
    <div className="absolute inset-0 bg-[#f5f1e8] overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[42%] bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] relative">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `radial-gradient(circle at 20% 30%, #f59e0b 2px, transparent 2px), radial-gradient(circle at 60% 20%, #fbbf24 1px, transparent 1px), radial-gradient(circle at 80% 50%, #d97706 1.5px, transparent 1.5px)` }} />
        <div className="absolute top-2 left-3 text-white text-[18px] drop-shadow" style={{ fontFamily: "'Dancing Script', cursive" }}>Today Dump</div>
        <div className="absolute bottom-2 left-2 right-2 flex gap-1">
          <div className="flex-1 h-8 rounded-[4px] bg-white/30 backdrop-blur-sm" />
          <div className="flex-1 h-8 rounded-[4px] bg-white/20 backdrop-blur-sm" />
        </div>
      </div>
      <div className="absolute top-[44%] left-2 right-2 bottom-2">
        <div className="bg-white rounded-[4px] p-1 shadow-[0_2px_8px_rgba(0,0,0,0.1)] border border-[#e8d5c4]">
          <div className="aspect-[4/3] bg-gradient-to-br from-[#a7f3d0] to-[#6ee7b7] rounded-[2px] relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-white/80 flex items-center justify-center"><div className="w-12 h-1 bg-[#2a2a2a] rounded-full" /></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20px]">🧍‍♀️</div>
          </div>
          <div className="flex justify-between items-center px-1 py-1"><div className="w-6 h-px bg-[#2a2a2a]" /><div className="w-4 h-px bg-[#2a2a2a]" /></div>
        </div>
      </div>
    </div>
  );
}

function ScrapbookLove() {
  return (
    <div className="absolute inset-0 bg-[#fefefe] overflow-hidden">
      {/* Lined paper left */}
      <div className="absolute top-0 left-0 w-[28%] h-full bg-[#fef9c3] border-r border-[#fde68a] p-1">
        <div className="w-full h-full" style={{ backgroundImage: `repeating-linear-gradient(transparent, transparent 10px, #fde68a 10px, #fde68a 11px)` }} />
      </div>
      {/* Crumpled paper texture */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      {/* Pink flower top */}
      <div className="absolute top-0 left-[28%] right-0 h-[18%] flex items-start justify-start p-1">
        <div className="size-14 rounded-full bg-gradient-to-br from-[#f9a8d4] to-[#ec4899] shadow-sm relative flex items-center justify-center"><span className="text-[20px]">🌸</span><div className="absolute -bottom-1 -right-1 size-3 rounded-full bg-[#fde68a] border border-white" /></div>
        <div className="ml-2 mt-2 flex-1">
          <div className="w-full h-8 rounded-full border-2 border-white shadow-sm bg-transparent relative">
            <div className="absolute inset-1 rounded-full border border-white/60" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-6 bg-white/40 rounded-full blur-[0.5px]" />
          </div>
        </div>
      </div>
      {/* Top photo - 2 girls on log */}
      <div className="absolute top-[16%] left-[30%] right-2 h-[32%] rounded-[4px] border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] overflow-hidden bg-[#4a7a4a] relative rotate-1">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4a7a4a] to-[#2a5a2a]" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-2"><div className="size-6 rounded-full bg-[#f5d0a0]" /><div className="size-6 rounded-full bg-[#e8c4a0]" /></div>
        <div className="absolute inset-0 border-2 border-white/50 rounded-[3px] m-1" style={{ borderStyle: 'dashed' }} />
      </div>
      {/* Love you tag */}
      <div className="absolute top-[46%] left-[30%] w-[42%] h-7 bg-[#d4a574] rounded-[3px] border border-[#b8935f] shadow-sm flex items-center justify-center rotate-1 z-10">
        <span className="text-[9px] font-bold text-[#5a3a1a]" style={{ fontFamily: "'Dancing Script', cursive" }}>Love you ♡</span>
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 size-2 rounded-full bg-[#fefefe] border border-[#b8935f]" />
      </div>
      {/* Bottom photos torn edges */}
      <div className="absolute top-[54%] left-1 right-1 bottom-1 flex gap-1">
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.15)] rounded-[2px] rotate-[-1deg] p-1">
            <div className="w-full h-[70%] bg-gradient-to-br from-[#a0c4e0] to-[#6a9ac0] rounded-[1px] relative"><div className="absolute bottom-1 left-1 size-3 rounded-full bg-black/20" /><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1"><div className="size-4 rounded-full bg-[#f5d0a0]" /><div className="size-4 rounded-full bg-[#e8c4a0]" /></div></div>
            <div className="h-[30%] bg-white flex items-center justify-center"><div className="w-8 h-4 bg-[#f5f1e8] rounded-[2px]" /></div>
          </div>
          {/* Torn edge */}
          <div className="absolute top-0 right-0 bottom-0 w-2 bg-[#fefefe]" style={{ clipPath: 'polygon(0 0, 100% 0, 60% 10%, 100% 20%, 40% 30%, 100% 40%, 60% 50%, 100% 60%, 40% 70%, 100% 80%, 60% 90%, 100% 100%, 0 100%)' }} />
        </div>
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-[#e8d5c4] rounded-[2px] p-1">
            <div className="w-full h-full bg-[#d4a574]/30 rounded-[2px] relative">
              <div className="absolute bottom-1 right-1 text-[16px]">🌺</div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-[#8b4513]">🌹</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, onPick }: { template: FireTemplate; onPick: (t: FireTemplate) => void }) {
  const hash = template.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const showPlay = hash % 3 === 0;

  const render = () => {
    switch (template.layout) {
      case 'birthday-illustrated': return <BirthdayIllustrated />;
      case 'memories-minimal': return <MemoriesMinimal />;
      case 'janmashtami': return <JanmashtamiTemplate />;
      case 'nature-dump': return <NatureDump />;
      case 'scrapbook-love': return <ScrapbookLove />;
      default: return <BirthdayIllustrated />;
    }
  };

  return (
    <button type="button" onClick={() => onPick(template)} className="relative aspect-[3/4] w-full overflow-hidden rounded-[16px] bg-white border border-[#e8e8e8] shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-[0.97] transition-transform">
      {render()}
      {showPlay ? <span className="absolute left-2 bottom-2 grid size-6 place-items-center rounded-full bg-black/70 text-white"><Play className="size-3 fill-white ml-px" /></span> : null}
    </button>
  );
}

export function TemplatesTray({ onPick, onClose }: { onPick: (t: FireTemplate) => void; onClose: () => void }) {
  const [category, setCategory] = useState<FireCategory>('trending');
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = FIRE_TEMPLATES;
    if (category !== 'trending') list = list.filter(t => t.category === category);
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
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-[#262626] text-white"><X className="size-5" /></button>
        </div>
        <label className="flex w-full items-center gap-2 rounded-full bg-[#262626] px-4 py-2.5">
          <Search className="size-4 shrink-0 text-[#a8a8a8]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates" className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-[#8e8e8e]" />
        </label>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0 scrollbar-none border-b border-[#262626]/50">
        {FIRE_CATEGORIES.map((c) => (
          <button key={c.id} type="button" onClick={() => setCategory(c.id as FireCategory)} className={cn("shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium border transition-all", category === c.id ? "bg-white text-black border-white" : "bg-[#262626] text-[#a8a8a8] border-[#363636]")}>{c.label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto bg-black p-3">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onPick(FIRE_TEMPLATES[0]!)} className="aspect-[3/4] w-full rounded-[16px] bg-[#1c1c1e] border border-[#2c2c2e] flex flex-col items-center justify-center gap-2 active:scale-[0.97]">
            <span className="grid size-10 place-items-center rounded-full border border-white text-[22px] font-light">+</span>
            <span className="text-[13px] font-medium">Create blank</span>
          </button>
          {filtered.map((t) => (<TemplateCard key={t.id} template={t} onPick={onPick} />))}
        </div>
        <div className="mt-6 pb-10 text-center"><p className="text-[11px] text-[#6a6a6a]">24 fire templates • No unsplash • Pure CSS • Exact replicas</p></div>
      </div>
    </div>
  );
}
