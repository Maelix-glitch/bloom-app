/**
 * TemplateBrowser + TemplatePreview.
 *
 * Browsing is the fun part, so it gets the room it deserves: full-bleed 9:16
 * previews rendered by the real canvas (so what you see is literally the
 * thing you'll edit), natural-language search, favourites, recents, and a
 * preview step before committing. Choosing a template never dumps you into a
 * half-finished editor.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Heart, Search, SlidersHorizontal, Sparkles } from "lucide-react";

import { StoryCanvas } from "./StoryCanvas";
import {
  STORY_TEMPLATE_LIBRARY,
  favoriteTemplateIds,
  instantiateTemplate,
  recentTemplateIds,
  searchTemplates,
  templateMeta,
  templateSections,
  toggleTemplateFavorite,
  TEMPLATES_CHANGED,
  type StoryTemplateDef,
} from "@/lib/stories/templates";
import { BOARD_TEMPLATES } from "@/lib/stories/templates/library/boards";
import type { BloomStoryData } from "@/lib/stories/types";

/* ------------------------------- thumbnail ------------------------------- */

/**
 * A real composition at thumbnail size. The canvas only mounts once the card
 * scrolls near the viewport — 141 mounted canvases would be 141 ResizeObservers
 * and a very slow first paint.
 */
export function TemplateThumb({
  def,
  width = 132,
  data,
}: {
  def: StoryTemplateDef;
  width?: number;
  data: BloomStoryData | null;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [near, setNear] = useState(false);
  const composed = useMemo(() => instantiateTemplate(def), [def]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "160px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const height = Math.round((width * 16) / 9);
  if (!composed) return <span className="stpl-thumb" style={{ width, height }} />;

  // An exact board crop beats the live render on the button — what you see is
  // the reference art, untouched.
  if (def.previewSrc) {
    return (
      <span className="stpl-thumb" style={{ width, height }} aria-hidden data-tone={def.tone}>
        <img
          src={def.previewSrc}
          alt=""
          className="stpl-canvas-img"
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
          loading="lazy"
          draggable={false}
        />
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className="stpl-thumb"
      style={{ width, height }}
      aria-hidden
      data-tone={def.tone}
    >
      {near ? (
        <StoryCanvas
          media={{ type: "none", src: null }}
          background={composed.composed.background}
          elements={composed.composed.elements}
          data={data}
          mode="static"
          fixedScale={width / 390}
          showMaskDefs={false}
          className="stpl-canvas"
        />
      ) : (
        <span className="stpl-skeleton" style={{ opacity: 0.9 }} />
      )}
    </span>
  );
}

/* --------------------------------- card ---------------------------------- */

function TemplateCard({
  def,
  data,
  favorite,
  onOpen,
  onToggleFavorite,
}: {
  def: StoryTemplateDef;
  data: BloomStoryData | null;
  favorite: boolean;
  onOpen: (def: StoryTemplateDef) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const meta = templateMeta(def);
  return (
    <div className="stpl-card">
      <button
        type="button"
        className="stpl-card-hit"
        onClick={() => onOpen(def)}
        aria-label={`Preview the ${def.name} template`}
      >
        <TemplateThumb def={def} data={data} />
        <span className="stpl-card-name">{def.name}</span>
        <span className="stpl-card-meta">
          {meta.photoSlots > 0
            ? `${meta.photoSlots} photo${meta.photoSlots === 1 ? "" : "s"}`
            : null}
          {meta.photoSlots > 0 && meta.metrics.length > 0 ? " · " : null}
          {meta.metrics.length > 0 ? "Bloom data" : null}
          {meta.photoSlots === 0 && meta.metrics.length === 0 ? "Type-led" : null}
        </span>
      </button>
      <button
        type="button"
        className="stpl-fav"
        onClick={() => onToggleFavorite(def.id)}
        aria-pressed={favorite}
        aria-label={
          favorite ? `Remove ${def.name} from favourites` : `Save ${def.name} to favourites`
        }
      >
        <Heart className="size-3.5" data-filled={favorite || undefined} aria-hidden />
      </button>
    </div>
  );
}

/* -------------------------------- search --------------------------------- */

/** "For You" — time of day plus whatever they've been reaching for lately. */
function forYou(favorites: string[], recents: string[]): StoryTemplateDef[] {
  const hour = new Date().getHours();
  const wanted =
    hour < 5
      ? ["night", "sleep", "mood"]
      : hour < 11
        ? ["morning", "selfcare", "gratitude"]
        : hour < 15
          ? ["wins", "study", "food"]
          : hour < 19
            ? ["wellness", "fitness", "habits"]
            : ["night", "memories", "love", "quotes"];

  const recentCats = new Set(
    recents
      .map((id) => STORY_TEMPLATE_LIBRARY.find((t) => t.id === id)?.category)
      .filter((c): c is NonNullable<typeof c> => Boolean(c)),
  );

  const seen = new Set<string>();
  const out: StoryTemplateDef[] = [];
  const push = (t: StoryTemplateDef) => {
    if (seen.has(t.id)) return;
    seen.add(t.id);
    out.push(t);
  };

  for (const cat of wanted) {
    for (const t of STORY_TEMPLATE_LIBRARY.filter((t) => t.category === cat).slice(0, 4)) push(t);
  }
  for (const id of favorites.slice(0, 4)) {
    const t = STORY_TEMPLATE_LIBRARY.find((x) => x.id === id);
    if (t) push(t);
  }
  for (const cat of recentCats) {
    for (const t of STORY_TEMPLATE_LIBRARY.filter((t) => t.category === cat).slice(0, 3)) push(t);
  }
  return out.slice(0, 14);
}

/* ------------------------------- browser --------------------------------- */

export function TemplateBrowser({
  onPick,
  onClose,
  data,
  initialId,
}: {
  onPick: (def: StoryTemplateDef) => void;
  onClose: () => void;
  data: BloomStoryData | null;
  initialId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => favoriteTemplateIds());
  const [recents, setRecents] = useState<string[]>(() => recentTemplateIds());
  const [preview, setPreview] = useState<StoryTemplateDef | null>(null);
  const [tick, setTick] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onChange = () => {
      setFavorites(favoriteTemplateIds());
      setRecents(recentTemplateIds());
      setTick((t) => t + 1);
    };
    window.addEventListener(TEMPLATES_CHANGED, onChange);
    return () => window.removeEventListener(TEMPLATES_CHANGED, onChange);
  }, []);

  useEffect(() => {
    if (initialId) {
      const def = STORY_TEMPLATE_LIBRARY.find((t) => t.id === initialId);
      if (def) setPreview(def);
    }
  }, [initialId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !preview) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, preview]);

  const toggleFavorite = useCallback((id: string) => {
    toggleTemplateFavorite(id);
    setFavorites(favoriteTemplateIds());
  }, []);

  const hits = useMemo(() => (query.trim().length > 0 ? searchTemplates(query, 40) : []), [query]);
  const sections = useMemo(() => templateSections(), [tick]);
  void tick;

  const forYouList = useMemo(() => forYou(favorites, recents), [favorites, recents]);
  const favoriteDefs = useMemo(
    () =>
      favorites
        .map((id) => STORY_TEMPLATE_LIBRARY.find((t) => t.id === id))
        .filter(Boolean) as StoryTemplateDef[],
    [favorites],
  );
  const recentDefs = useMemo(
    () =>
      recents
        .map((id) => STORY_TEMPLATE_LIBRARY.find((t) => t.id === id))
        .filter(Boolean) as StoryTemplateDef[],
    [recents],
  );

  const rows =
    query.trim().length > 0
      ? [{ id: "search", label: `Results for “${query.trim()}”`, items: hits }]
      : [
          { id: "for-you", label: "For you", items: forYouList },
          { id: "special", label: "Special Templates", items: BOARD_TEMPLATES },
          ...(recentDefs.length > 0
            ? [{ id: "recent", label: "Recently used", items: recentDefs }]
            : []),
          ...(favoriteDefs.length > 0
            ? [{ id: "favorites", label: "Favorites", items: favoriteDefs }]
            : []),
          ...sections.map((s) => ({ id: s.id, label: s.label, items: s.items })),
        ];

  return (
    <div className="stpl-browser" role="dialog" aria-modal="true" aria-label="Story templates">
      <header className="stpl-head">
        <button
          type="button"
          className="sv-icon-btn"
          onClick={onClose}
          aria-label="Close templates"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h2 className="display text-[18px] leading-tight">Start somewhere</h2>
          <p className="text-[11.5px] text-muted-foreground">
            {STORY_TEMPLATE_LIBRARY.length} designs — every one a starting point.
          </p>
        </div>
      </header>

      <div className="stpl-search">
        <Search className="size-4 shrink-0 opacity-60" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try “something for my workout” or “three photos”"
          aria-label="Search templates"
          className="stpl-search-input"
        />
        {query ? (
          <button
            type="button"
            className="stpl-search-clear"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="stpl-scroll">
        {query.trim().length > 0 && hits.length === 0 ? (
          <p className="stpl-empty">
            Nothing matched that yet. Try a mood (“calm”), a count (“two photos”), or a moment
            (“birthday”).
          </p>
        ) : null}

        {rows.map((row) =>
          row.items.length === 0 ? null : (
            <section key={row.id} className="stpl-section">
              <h3 className="stpl-section-label">
                <Sparkles className="size-3" aria-hidden /> {row.label}
              </h3>
              <div className="stpl-row">
                {row.items.map((def) => (
                  <TemplateCard
                    key={`${row.id}-${def.id}`}
                    def={def}
                    data={data}
                    favorite={favorites.includes(def.id)}
                    onOpen={setPreview}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            </section>
          ),
        )}
      </div>

      {preview ? (
        <TemplatePreview
          def={preview}
          data={data}
          favorite={favorites.includes(preview.id)}
          onToggleFavorite={() => toggleFavorite(preview.id)}
          onUse={() => onPick(preview)}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------- preview --------------------------------- */

export function TemplatePreview({
  def,
  data,
  favorite,
  onToggleFavorite,
  onUse,
  onClose,
}: {
  def: StoryTemplateDef;
  data: BloomStoryData | null;
  favorite: boolean;
  onToggleFavorite: () => void;
  onUse: () => void;
  onClose: () => void;
}) {
  const composed = useMemo(() => instantiateTemplate(def), [def]);
  const meta = templateMeta(def);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onClose]);

  if (!composed) return null;

  return (
    <div
      className="stpl-preview"
      role="dialog"
      aria-modal="true"
      aria-label={`${def.name} preview`}
    >
      <div className="stpl-preview-backdrop" onClick={onClose} aria-hidden />
      <div className="stpl-preview-body">
        <div className="stpl-preview-frame">
          <StoryCanvas
            media={{ type: "none", src: null }}
            background={composed.composed.background}
            elements={composed.composed.elements}
            data={data}
            mode="static"
          />
        </div>

        <div className="stpl-preview-info">
          <p className="stpl-preview-cat">{def.category}</p>
          <h2 className="display text-[22px] leading-tight">{def.name}</h2>
          <p className="stpl-preview-hint">{def.hint}</p>

          <ul className="stpl-preview-badges">
            {meta.photoSlots > 0 ? (
              <li>
                {meta.photoSlots} photo slot{meta.photoSlots === 1 ? "" : "s"}
              </li>
            ) : null}
            {meta.hasText ? <li>Text you can rewrite</li> : null}
            {meta.metrics.length > 0 ? <li>Bloom data · {meta.metrics.length}</li> : null}
            {meta.hasStickers ? <li>Decor</li> : null}
          </ul>

          <p className="stpl-preview-note">
            A starting point. Every layer — photos, type, colour, background — stays yours to
            change.
          </p>

          <div className="stpl-preview-actions">
            <button
              type="button"
              className="stpl-fav stpl-fav-lg"
              onClick={onToggleFavorite}
              aria-pressed={favorite}
              aria-label={favorite ? "Remove from favourites" : "Save to favourites"}
            >
              <Heart className="size-4" data-filled={favorite || undefined} aria-hidden />
            </button>
            <button type="button" className="stpl-use-btn" onClick={onUse}>
              Use this template
            </button>
            <button
              type="button"
              className="sv-icon-btn"
              onClick={onUse}
              aria-label="Customize this template"
              title="Customize"
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
