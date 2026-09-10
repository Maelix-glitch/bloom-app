/**
 * StickerTray — the Bloom sticker shop as a fast bottom sheet.
 * Search across names + tags, recents, favorites, and categorized browsing.
 * Tapping inserts at canvas center; a tiny heart favorites without leaving.
 */

import { useMemo, useState } from "react";
import { Heart, Search } from "lucide-react";

import { StorySheet } from "./StorySheet";
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
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          recordStickerUse(def.id);
          onPick(def.id);
        }}
        aria-label={`Add ${def.name} sticker`}
        title={def.name}
        className="se-sticker-cell size-full"
      >
        <StickerArt id={def.id} size={52} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleStickerFavorite(def.id);
        }}
        aria-label={favorite ? `Remove ${def.name} from favorites` : `Favorite ${def.name}`}
        aria-pressed={favorite}
        className={cn(
          "absolute right-1 top-1 grid size-6 place-items-center rounded-full transition-colors",
          favorite ? "text-rose" : "text-faint/60 hover:text-muted-foreground",
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
    <StorySheet title="Stickers" subtitle="Made by Bloom, for your moments." onClose={onClose}>
      <div className="flex flex-col gap-3 pb-2">
        <label className="flex items-center gap-2.5 rounded-full border border-border bg-surface/60 px-4 py-2.5 transition-colors focus-within:border-border-strong">
          <Search className="size-4 shrink-0 text-faint" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search calm, water, celebrate…"
            aria-label="Search stickers"
            className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-faint/70"
          />
        </label>

        {!searching ? (
          <div
            className="flex gap-1 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Sticker categories"
          >
            <button
              key="recent"
              type="button"
              role="tab"
              aria-selected={tab === "recent"}
              onClick={() => setTab("recent")}
              className="se-tray-tab"
              data-active={tab === "recent"}
            >
              Recent
            </button>
            <button
              key="favorites"
              type="button"
              role="tab"
              aria-selected={tab === "favorites"}
              onClick={() => setTab("favorites")}
              className="se-tray-tab"
              data-active={tab === "favorites"}
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
                className="se-tray-tab"
                data-active={tab === c.id}
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : null}

        {grid.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <p className="display text-[15px] text-muted-foreground">
              {tab === "favorites" && !searching ? "No favorites yet." : "Nothing matches that."}
            </p>
            <p className="max-w-[28ch] text-[12.5px] text-faint">
              {tab === "favorites" && !searching
                ? "Tap the little heart on any sticker to keep it here."
                : "Try calm, moon, water, or celebrate."}
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
    </StorySheet>
  );
}
