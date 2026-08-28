/**
 * Highlights — keepsake circles. Gradient + icon (or a real story photo when
 * the collection has one), a name, an honest count. "See all" folds the rail
 * open into a wrapped grid when there's enough to warrant it.
 */

import { useState } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { HighlightItem } from "@/lib/profile/types";
import { storyMediaUrl } from "@/lib/profile/storyMeta";
import { HighlightMark } from "./highlightVisuals";
import { highlightGradient } from "@/lib/profile/highlightMeta";

/** first real photo in the collection leads as the cover — no invented art. */
function coverUrl(highlight: HighlightItem): string | null {
  const withMedia = highlight.stories.find((s) => s.kind === "photo" && s.mediaPath);
  return withMedia ? storyMediaUrl(withMedia) : null;
}

function Circle({
  highlight,
  onClick,
  size = 64,
}: {
  highlight: HighlightItem;
  onClick: () => void;
  size?: number;
}) {
  const [coverBroken, setCoverBroken] = useState(false);
  const cover = coverBroken ? null : coverUrl(highlight);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${highlight.name} highlight`}
      className="group flex w-[92px] shrink-0 flex-col items-center gap-2 rounded-2xl px-1 pb-2 pt-1 transition-colors hover:bg-surface-2/50"
    >
      <span
        className="relative grid place-items-center overflow-hidden rounded-full shadow-[0_12px_30px_-16px_rgba(0,0,0,0.95)] transition-transform duration-[var(--motion-med)] group-hover:scale-[1.05]"
        style={{
          width: size,
          height: size,
          background: cover ? "var(--surface-2)" : highlightGradient[highlight.accent],
          outline: "1px solid color-mix(in oklab, var(--foreground) 9%, transparent)",
          outlineOffset: 2,
        }}
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            onError={() => setCoverBroken(true)}
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <span className="relative">
          <HighlightMark
            icon={highlight.icon}
            name={highlight.name}
            accent={highlight.accent}
            size={size}
          />
        </span>
      </span>
      <span className="w-full text-center leading-tight">
        <span className="block truncate text-[12px] font-medium text-foreground">
          {highlight.name}
        </span>
        {highlight.stories.length > 0 ? (
          <span className="mono block text-[9.5px] tracking-[0.04em] text-faint">
            {highlight.stories.length} {highlight.stories.length === 1 ? "story" : "stories"}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function HighlightRail({
  highlights,
  onOpen,
  onCreate,
  onEdit,
  viewOnly = false,
  showAll = false,
}: {
  highlights: HighlightItem[];
  onOpen: (index: number) => void;
  onCreate: () => void;
  onEdit: (highlight: HighlightItem) => void;
  viewOnly?: boolean;
  showAll?: boolean;
}) {
  if (highlights.length === 0 && viewOnly) return null;

  if (highlights.length === 0) {
    return (
      <button
        type="button"
        onClick={onCreate}
        className="group inline-flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-left transition-colors hover:border-[color:var(--profile-accent-border)]"
      >
        <Plus
          className="size-4 text-faint transition-colors group-hover:text-foreground"
          aria-hidden
        />
        <span>
          <span className="block text-[13px] font-medium text-foreground">Create a highlight</span>
          <span className="block text-[12px] text-muted-foreground">
            Keep something worth remembering — choose the stories, name it, done.
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        showAll
          ? "flex flex-wrap gap-2"
          : "no-scrollbar -mx-1 flex items-start gap-2 overflow-x-auto px-1 pb-1",
      )}
    >
      {highlights.map((highlight, i) => (
        <div key={highlight.id} className="group/hi relative">
          <Circle highlight={highlight} onClick={() => onOpen(i)} />
          {!viewOnly ? (
            <button
              type="button"
              onClick={() => onEdit(highlight)}
              aria-label={`Edit ${highlight.name} highlight`}
              className="mono absolute -top-1 right-0 hidden rounded-full border border-border bg-surface-2 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] text-faint transition-colors hover:text-foreground group-hover/hi:block group-focus-within/hi:block"
            >
              Edit
            </button>
          ) : null}
        </div>
      ))}
      <div className="flex w-[92px] shrink-0 flex-col items-center gap-2 px-1 pt-1">
        <button
          type="button"
          onClick={onCreate}
          aria-label="Create a highlight"
          className={cn(
            "group grid h-[64px] w-[64px] place-items-center rounded-full border border-dashed border-border-strong bg-transparent transition-[background-color,transform] duration-[var(--motion-med)] hover:scale-[1.05] hover:bg-surface-2/60",
          )}
        >
          <Plus
            className="size-4 text-faint transition-colors group-hover:text-foreground"
            aria-hidden
          />
        </button>
        <p className="text-[12px] text-faint">New</p>
      </div>
    </div>
  );
}
