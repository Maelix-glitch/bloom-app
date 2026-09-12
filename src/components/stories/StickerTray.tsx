/**
 * StickerTray — Instagram-exact sticker bottom sheet.
 * Dark #121212, search #262626, 4-col grid, white icons, like IG.
 */

import { useMemo, useState } from "react";
import { Heart, Search } from "lucide-react";

import {
  STICKER_CATEGORIES,
  STICKER_LIST,
  StickerArt,
  recordStickerUse,
  searchStickers,
  stickersByCategory,
  toggleStickerFavorite,
  useStickerMemory,
  type StickerCategory,
  type StickerDef,
} from "@/lib/stories/stickers";
import { cn } from "@/lib/utils";

function Cell({
  def,
  favorite,
  onPick,
}: {
  def: StickerDef;
  favorite: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => {
          recordStickerUse(def.id);
          onPick(def.id);
        }}
        aria-label={`Add ${def.name}`}
        className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl bg-[#1a1a1a] border border-[#262626] p-2 transition-transform active:scale-[0.96] group-hover:bg-[#262626]"
      >
        <StickerArt id={def.id} size={36} />
        <span className="truncate text-[10px] font-medium text-white/80">{def.name}</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleStickerFavorite(def.id);
        }}
        aria-label={favorite ? "Unfavorite" : "Favorite"}
        className={cn(
          "absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 backdrop-blur-sm transition-colors",
          favorite ? "text-[#ff3040]" : "text-white/40 hover:text-white/80",
        )}
      >
        <Heart className="size-3" fill={favorite ? "currentColor" : "none"} aria-hidden />
      </button>
    </div>
  );
}

export function StickerTray({
  onPick,
  onClose,
}: {
  onPick: (stickerId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<StickerCategory | "recent" | "favorites">("recent");
  const { recents, favorites } = useStickerMemory();

  const results = useMemo(() => searchStickers(query), [query]);
  const searching = query.trim().length > 0;

  const grid: StickerDef[] = useMemo(() => {
    if (searching) return results;
    if (tab === "recent") return recents.length ? recents : STICKER_LIST.slice(0, 12);
    if (tab === "favorites") return STICKER_LIST.filter((s) => favorites.has(s.id));
    return stickersByCategory(tab);
  }, [searching, results, tab, recents, favorites]);

  return (
    <div className="fixed inset-0 z-[91] flex flex-col justify-end bg-black/60" role="dialog" aria-label="Stickers">
      <div className="flex max-h-[75vh] w-full flex-col rounded-t-[12px] bg-[#121212] border-t border-[#262626]">
        {/* Handle */}
        <div className="flex flex-col items-center gap-3 border-b border-[#262626] px-4 py-3">
          <div className="h-1 w-10 rounded-full bg-[#363636]" />
          <div className="flex w-full items-center justify-between">
            <h2 className="text-[16px] font-semibold text-white">Stickers</h2>
            <button type="button" onClick={onClose} className="text-[14px] font-medium text-[#0095f6]">
              Done
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto px-4 py-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          {/* Search - Instagram */}
          <label className="flex items-center gap-2 rounded-lg bg-[#262626] px-3 py-2.5">
            <Search className="size-4 shrink-0 text-[#a8a8a8]" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search stickers"
              className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#a8a8a8]"
            />
          </label>

          {!searching ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1" role="tablist" aria-label="Categories">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "recent"}
                onClick={() => setTab("recent")}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                  tab === "recent" ? "bg-white text-black" : "bg-[#262626] text-white",
                )}
              >
                Recent
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "favorites"}
                onClick={() => setTab("favorites")}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                  tab === "favorites" ? "bg-white text-black" : "bg-[#262626] text-white",
                )}
              >
                Favorites
              </button>
              {STICKER_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === c.id}
                  onClick={() => setTab(c.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                    tab === c.id ? "bg-white text-black" : "bg-[#262626] text-white",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          ) : null}

          {grid.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-[16px] font-semibold text-white">
                {tab === "favorites" && !searching ? "No favorites" : "No results"}
              </p>
              <p className="max-w-[28ch] text-[14px] text-[#a8a8a8]">
                {tab === "favorites" && !searching ? "Tap heart to favorite stickers" : "Try different keywords"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2" role="list" aria-label="Stickers">
              {grid.map((def) => (
                <Cell key={def.id} def={def} favorite={favorites.has(def.id)} onPick={onPick} />
              ))}
            </div>
          )}
        </div>
      </div>

      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 -z-10" />
    </div>
  );
}
