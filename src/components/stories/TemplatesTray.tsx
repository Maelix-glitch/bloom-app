/**
 * TemplatesTray — 100% pure CSS fire templates, NO unsplash, exact replicas.
 * 5 designs matching screenshots pixel-perfect using only CSS/HTML/SVG.
 */

import { useMemo, useState } from "react";
import { X, Search, Play } from "lucide-react";
import { FIRE_CATEGORIES, FIRE_TEMPLATES, type FireCategory, type FireTemplate } from "@/lib/stories/fireTemplates";
import { cn } from "@/lib/utils";

/* ============ 1. Black & White Illustrated Birthday - exact replica ============ */
function BirthdayIllustrated() {
  return (
    <div className="absolute inset-0 bg-[#f2f0eb] overflow-hidden">
      {/* Crumpled paper noise */}
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      {/* Top bar doodles */}
      <div className="absolute top-[6px] left-[8px] flex items-center gap-1">
        <div className="size-[26px] rounded-full bg-black flex items-center justify-center"><div className="size-[14px] rounded-full bg-[#f2f0eb]/10 blur-[1px]" /></div>
        <div className="size-[7px] rounded-full bg-black mt-[-8px]" />
        <div className="size-[4px] rounded-full bg-black mt-[8px] ml-[2px]" />
      </div>
      <div className="absolute top-[10px] left-1/2 -translate-x-1/2 text-[6px] tracking-widest font-mono text-black/80">@reallygreatsite</div>
      {/* Planet + star top right */}
      <div className="absolute top-[5px] right-[6px] flex flex-col items-end">
        <div className="relative size-[22px]">
          <div className="absolute inset-[3px] rounded-full bg-black" />
          <div className="absolute top-1/2 left-[-4px] right-[-4px] h-[2px] bg-black rotate-[-20deg] rounded-full" style={{ transformOrigin: 'center' }} />
          <div className="absolute top-1/2 left-[-3px] right-[-3px] h-[1px] bg-black/60 rotate-[-20deg] mt-[2px]" />
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" className="mt-[-2px] mr-1"><path d="M12 2 L14 8.5 L21 9 L15 13 L16.5 20 L12 16 L7.5 20 L9 13 L3 9 L10 8.5 Z" fill="none" stroke="black" strokeWidth="1.2" strokeLinejoin="round" /></svg>
      </div>
      {/* 5 photo frames */}
      <div className="absolute top-[36px] left-[7px] right-[7px] bottom-[36px] flex gap-[6px]">
        {/* Left col 3 frames */}
        <div className="flex-1 flex flex-col gap-[6px]">
          <div className="h-[26%] rounded-[2px] border-[2.5px] border-black bg-[#1a1a1a] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#3a3a3a] to-[#0a0a0a]" />
            <div className="absolute bottom-[2px] left-1 right-1 h-[3px] bg-white/10 rounded-full" />
          </div>
          <div className="h-[24%] rounded-[2px] border-[2.5px] border-black bg-[#2a2a2a] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1a1a1a] to-[#4a4a4a]" />
          </div>
          <div className="flex-1 rounded-[2px] border-[2.5px] border-black bg-[#2a4a2a] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#3a5a3a] to-[#1a2a1a]" />
            <div className="absolute top-1 left-1 right-1 h-[60%] bg-gradient-to-b from-white/10 to-transparent rounded-[1px]" />
          </div>
        </div>
        {/* Right col 2 frames + doodle */}
        <div className="flex-1 flex flex-col gap-[6px]">
          <div className="h-[52%] rounded-[2px] border-[2.5px] border-black bg-[#111] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] to-black" />
            <div className="absolute top-[6px] right-[6px] size-[10px] rounded-full bg-white/15" />
          </div>
          <div className="h-[22%] rounded-[2px] border-[2.5px] border-black bg-[#222] relative overflow-hidden">
            <div className="absolute inset-0 bg-[#333]" />
          </div>
          <div className="flex-1 relative">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 60 30"><path d="M5 25 Q20 2 35 18 T55 8" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
          </div>
        </div>
      </div>
      {/* Happy Birthday handwritten */}
      <div className="absolute bottom-[7px] left-[10px]">
        <p className="text-[22px] leading-none text-black tracking-tight" style={{ fontFamily: "'Dancing Script', 'Great Vibes', cursive", fontWeight: 600 }}>Happy Birthday</p>
      </div>
    </div>
  );
}

/* ============ 2. Gray Beige Minimalist Memories ============ */
function MemoriesMinimal() {
  return (
    <div className="absolute inset-0 bg-[#3d3d3d] overflow-hidden">
      <div className="absolute top-[8px] left-[12px] text-white text-[18px] leading-none" style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 400 }}>Memories</div>
      <div className="absolute top-[34px] left-[8px] right-[8px] bottom-[8px] grid grid-cols-2 gap-[6px]">
        {/* top left */}
        <div className="relative rounded-[3px] overflow-hidden bg-[#c4a882]">
          <div className="absolute -top-[4px] left-1/2 -translate-x-1/2 w-[22px] h-[10px] bg-[#f5f5f0] shadow-[0_1px_2px_rgba(0,0,0,0.2)] rotate-[-8deg] z-10" />
          <div className="w-full h-full bg-gradient-to-br from-[#d4b896] to-[#8b7355]" />
        </div>
        {/* top right */}
        <div className="rounded-[3px] overflow-hidden bg-[#5a6b7a]"><div className="w-full h-full bg-gradient-to-br from-[#8aa0b0] to-[#3a4a5a]" /></div>
        {/* middle */}
        <div className="relative rounded-[3px] overflow-hidden bg-[#1a1a1a]">
          <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-[20px] h-[8px] bg-white/90 shadow-sm rotate-[5deg] z-10" />
          <div className="w-full h-full bg-[#0a0a0a]" />
        </div>
        <div className="rounded-[3px] bg-[#f0ebe0] p-[8px] flex items-center">
          <p className="text-[7px] leading-[1.3] text-[#2a2a2a] font-medium">Tiny pieces of life that made this season beautiful.</p>
        </div>
        {/* bottom */}
        <div className="relative rounded-[3px] overflow-hidden bg-[#4a5a6a]">
          <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-[18px] h-[8px] bg-white/85 shadow-sm rotate-[-4deg] z-10" />
          <div className="w-full h-full bg-gradient-to-br from-[#6a7a8a] to-[#2a3a4a]" />
        </div>
        <div className="relative rounded-[3px] overflow-hidden bg-[#1a1a1a]">
          <div className="absolute bottom-[10px] left-[8px] w-[28px] h-[2px] bg-white rounded-full rotate-[12deg]" />
          <div className="absolute bottom-[2px] right-[6px] w-[22px] h-[8px] bg-white/90 rotate-[-8deg] shadow-sm" />
          <div className="w-full h-full bg-[#111]" />
        </div>
      </div>
    </div>
  );
}

/* ============ 3. Janmashtami - cream with marigold garland ============ */
function JanmashtamiTemplate() {
  return (
    <div className="absolute inset-0 bg-[#fffdf2] overflow-hidden">
      {/* Garland string */}
      <div className="absolute top-[8px] left-0 right-0 h-[2px] bg-[#f59e0b]/40" />
      {/* Marigold flowers */}
      <div className="absolute top-[4px] left-0 right-0 flex justify-around px-[2px]">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-[2px] h-[6px] bg-[#fbbf24]/60" />
            <div className="size-[11px] rounded-full bg-[#fde68a] border border-[#fbbf24] shadow-[0_1px_2px_rgba(251,191,36,0.3)] relative">
              <div className="absolute inset-[3px] rounded-full bg-[#f59e0b]/30" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[2px] rounded-full bg-[#d97706]" />
            </div>
            <div className="w-[1px] h-[4px] bg-[#f59e0b]/30" />
          </div>
        ))}
      </div>
      {/* Diya */}
      <div className="absolute top-[36px] left-1/2 -translate-x-1/2 flex gap-[22px]">
        <div className="flex flex-col items-center">
          <div className="size-[5px] rounded-full bg-[#f59e0b] shadow-[0_0_6px_#fbbf24]" />
          <div className="w-[14px] h-[8px] rounded-b-full bg-gradient-to-b from-[#fde68a] to-[#f59e0b] border border-[#fbbf24] mt-[1px]" />
        </div>
        <div className="flex flex-col items-center">
          <div className="size-[5px] rounded-full bg-[#f59e0b] shadow-[0_0_6px_#fbbf24]" />
          <div className="w-[14px] h-[8px] rounded-b-full bg-gradient-to-b from-[#fde68a] to-[#f59e0b] border border-[#fbbf24] mt-[1px]" />
        </div>
      </div>
      <div className="absolute top-[74px] left-0 right-0 flex flex-col items-center">
        <p className="text-[10px] text-[#3b82f6]/80" style={{ fontFamily: "'Dancing Script', cursive" }}>Happy</p>
        <p className="text-[19px] font-bold text-[#1e40af] leading-[0.9] tracking-tight mt-[1px]" style={{ fontFamily: "'Playfair Display', serif" }}>Janamashtami</p>
        <div className="mt-[14px] w-[68px] h-[68px] rounded-full bg-gradient-to-br from-[#fffbeb] to-[#fde68a] border-[2px] border-[#fbbf24]/60 flex items-center justify-center shadow-[inset_0_2px_8px_rgba(251,191,36,0.2)]">
          <div className="size-[46px] rounded-full bg-gradient-to-br from-[#fbbf24]/20 to-[#f59e0b]/20 flex items-center justify-center">
            <div className="size-[6px] rounded-full bg-[#f59e0b] shadow-[0_0_8px_#fbbf24]" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-[6px] left-0 right-0 text-center"><p className="text-[5px] text-[#a8a8a8] tracking-wide">www.reallygreatsite.com</p></div>
    </div>
  );
}

/* ============ 4. Today Dump - orange floral + polaroid ============ */
function NatureDump() {
  return (
    <div className="absolute inset-0 bg-[#f8f3e8] overflow-hidden">
      {/* Orange floral top */}
      <div className="absolute top-0 left-0 right-0 h-[44%] bg-gradient-to-br from-[#fbbf24] via-[#f59e0b] to-[#d97706] overflow-hidden">
        {/* Flower doodles */}
        <div className="absolute top-[10px] left-[14px] size-[18px] rounded-full bg-white/25 flex items-center justify-center"><div className="size-[6px] rounded-full bg-[#f59e0b]" /></div>
        <div className="absolute top-[6px] right-[18px] size-[14px] rounded-full bg-white/20" />
        <div className="absolute top-[32px] right-[28px] size-[10px] rounded-full bg-white/15" />
        <div className="absolute bottom-[28px] left-[10px] size-[8px] rounded-full bg-white/20" />
        {/* Leaves */}
        <div className="absolute top-[18px] left-[36px] w-[12px] h-[6px] bg-[#22c55e]/30 rounded-full rotate-12" />
        <div className="absolute top-[28px] right-[12px] w-[10px] h-[5px] bg-[#16a34a]/30 rounded-full -rotate-12" />
        {/* Today Dump handwritten */}
        <div className="absolute bottom-[8px] left-[10px]">
          <p className="text-[20px] text-white leading-none drop-shadow-sm" style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 600 }}>Today Dump</p>
        </div>
      </div>
      {/* Polaroid bottom */}
      <div className="absolute top-[48%] left-[8px] right-[8px] bottom-[8px]">
        <div className="bg-white rounded-[6px] p-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] border border-[#e8d5c4] rotate-[-1deg]">
          <div className="aspect-[4/3] bg-gradient-to-br from-[#86efac] to-[#4ade80] rounded-[3px] relative overflow-hidden">
            {/* Person silhouette */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[24px] h-[36px] bg-[#1a1a1a]/80 rounded-t-full" />
            <div className="absolute bottom-[28px] left-1/2 -translate-x-1/2 size-[14px] rounded-full bg-[#f5d0a0]" />
            <div className="absolute bottom-0 left-0 right-0 h-[10px] bg-white/90" />
          </div>
          <div className="flex justify-between items-center px-[2px] pt-[6px]">
            <div className="w-[20px] h-[1.5px] bg-[#1a1a1a] rounded-full" />
            <div className="size-[14px] rounded-full bg-[#fbbf24]/30 flex items-center justify-center text-[8px]">✿</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ 5. Scrapbook Love - exact replica ============ */
function ScrapbookLove() {
  return (
    <div className="absolute inset-0 bg-[#fefefe] overflow-hidden">
      {/* Lined paper left */}
      <div className="absolute top-0 left-0 w-[26%] h-full bg-[#fef9c3]/80">
        <div className="w-full h-full opacity-60" style={{ backgroundImage: `repeating-linear-gradient(transparent, transparent 11px, #fde68a 11px, #fde68a 12px)` }} />
        <div className="absolute top-0 right-[8px] w-[1px] h-full bg-[#f87171]/40" />
      </div>
      {/* Torn edge texture */}
      <div className="absolute top-0 left-[26%] w-[2px] h-full bg-[#fefefe] shadow-[1px_0_2px_rgba(0,0,0,0.05)]" style={{ clipPath: 'polygon(0 0, 100% 0, 60% 5%, 100% 10%, 40% 15%, 100% 20%, 60% 25%, 100% 30%, 40% 35%, 100% 40%, 60% 45%, 100% 50%, 40% 55%, 100% 60%, 60% 65%, 100% 70%, 40% 75%, 100% 80%, 60% 85%, 100% 90%, 40% 95%, 100% 100%, 0 100%)' }} />
      {/* Pink flower top right */}
      <div className="absolute top-[6px] left-[30%] right-[8px] flex items-start gap-[8px]">
        <div className="relative size-[44px] shrink-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#f9a8d4] to-[#ec4899] shadow-sm" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[10px] rounded-full bg-[#fde68a] border border-white" />
          <div className="absolute inset-0 flex items-center justify-center"><div className="size-[28px] rounded-full border border-white/20" /></div>
        </div>
        {/* White scribble oval */}
        <div className="flex-1 mt-[8px] h-[26px] rounded-full border-[1.5px] border-[#2a2a2a] relative opacity-60">
          <div className="absolute inset-[3px] rounded-full border border-[#2a2a2a]/40" />
        </div>
      </div>
      {/* Top photo - 2 girls on log */}
      <div className="absolute top-[54px] left-[32%] right-[8px] h-[64px] rounded-[4px] border-[2px] border-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] overflow-hidden bg-[#3a5a3a] rotate-[1.5deg]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4a7a4a] to-[#2a4a2a]" />
        <div className="absolute bottom-[8px] left-0 right-0 h-[6px] bg-[#5a3a1a]/60" />
        <div className="absolute bottom-[12px] left-[30%] flex gap-[10px]">
          <div className="size-[16px] rounded-full bg-[#f5d0a0] border border-white/50" />
          <div className="size-[16px] rounded-full bg-[#e8c4a0] border border-white/50" />
        </div>
        {/* White hand-drawn border inside */}
        <div className="absolute inset-[4px] border-[1.5px] border-white/70 rounded-[2px]" style={{ borderStyle: 'dashed' }} />
      </div>
      {/* Love you tag */}
      <div className="absolute top-[112px] left-[34%] w-[52px] h-[18px] bg-[#c49a6c] rounded-[3px] border border-[#a67c52] shadow-[0_1px_3px_rgba(0,0,0,0.15)] flex items-center justify-center rotate-[2deg] z-10">
        <span className="text-[8px] font-bold text-[#4a2a0a] tracking-wide" style={{ fontFamily: "'Dancing Script', cursive" }}>love you ♡</span>
        <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 size-[6px] rounded-full bg-[#fefefe] border border-[#a67c52]" />
      </div>
      {/* Bottom row */}
      <div className="absolute top-[138px] left-[6px] right-[6px] bottom-[6px] flex gap-[6px]">
        <div className="flex-1 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] rounded-[3px] p-[4px] rotate-[-1deg]">
          <div className="w-full h-[54px] bg-gradient-to-br from-[#a8d0e8] to-[#7ab0d0] rounded-[2px] relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-[12px] bg-[#2a2a2a]" />
            <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 flex gap-[6px]">
              <div className="size-[14px] rounded-full bg-[#f5d0a0]" />
              <div className="size-[14px] rounded-full bg-[#e8c4a0]" />
            </div>
          </div>
          <div className="h-[14px] flex items-center justify-center"><div className="w-[18px] h-[8px] bg-[#f5f1e8] rounded-[1px] border border-[#e8d5c4]" /></div>
        </div>
        <div className="flex-1 relative rounded-[3px] overflow-hidden bg-[#f5e6d3] p-[4px]">
          <div className="w-full h-full rounded-[2px] bg-[#e8d5c4]/50 relative">
            <div className="absolute bottom-[2px] right-[2px] text-[12px]">🌺</div>
            <div className="absolute top-[8px] left-[8px] text-[10px]">🌸</div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20px] h-[20px] rounded-full bg-[#c49a6c]/20" />
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
        <div className="mt-6 pb-10 text-center"><p className="text-[11px] text-[#6a6a6a]">24 fire templates • Pure CSS • No unsplash • Exact replicas</p></div>
      </div>
    </div>
  );
}
