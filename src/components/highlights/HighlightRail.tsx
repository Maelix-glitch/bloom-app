/**
 * Highlights — keepsakes, not settings. Soft-square covers (a real story
 * photo when the collection has one, an accent letter otherwise), names,
 * honest counts, and a single quiet "New" slot.
 */

import { Plus, Sparkles } from "lucide-react";

import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import type { HighlightItem } from "@/lib/profile/types";
import { storyMediaUrl } from "@/lib/profile/storyMeta";

/** first real photo in the collection leads as the cover — no invented art. */
function coverUrl(highlight: HighlightItem): string | null {
  const withMedia = highlight.stories.find((s) => s.kind === "photo" && s.mediaPath);
  return withMedia ? storyMediaUrl(withMedia) : null;
}

export function HighlightRail({
  highlights,
  onOpen,
  onCreate,
  onEdit,
  viewOnly = false,
}: {
  highlights: HighlightItem[];
  onOpen: (index: number) => void;
  onCreate: () => void;
  onEdit: (highlight: HighlightItem) => void;
  viewOnly?: boolean;
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
    <ol className="no-scrollbar -mx-1 flex items-start gap-3.5 overflow-x-auto px-1 pb-1">
      {highlights.map((highlight, i) => {
        const cover = coverUrl(highlight);
        return (
          <li key={highlight.id} className="shrink-0">
            <div className="group relative">
              <button
                type="button"
                onClick={() => onOpen(i)}
                aria-label={`Open ${highlight.name} highlight`}
                className="flex w-[88px] flex-col items-center gap-2 rounded-2xl px-1.5 pb-2 pt-1 transition-colors hover:bg-surface-2/50"
              >
                <span
                  className="relative grid h-[64px] w-[64px] place-items-center overflow-hidden rounded-xl border transition-transform duration-[var(--motion-med)] group-hover:scale-[1.02]"
                  style={{
                    borderColor: `color-mix(in oklab, ${accentVar[highlight.accent]} 35%, transparent)`,
                    background: `radial-gradient(120% 110% at 50% 0%, color-mix(in oklab, ${accentVar[highlight.accent]} 18%, var(--surface-2)), var(--surface-2) 70%)`,
                  }}
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover opacity-85 transition-opacity duration-[var(--motion-med)] group-hover:opacity-100"
                      onError={(e) =>
                        ((e.currentTarget as HTMLImageElement).style.display = "none")
                      }
                    />
                  ) : null}
                  <span
                    className={cn(
                      "display relative text-[20px] leading-none",
                      cover && "text-[#F4F2EB] drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)]",
                    )}
                    style={
                      cover
                        ? undefined
                        : {
                            color: `color-mix(in oklab, ${accentVar[highlight.accent]} 85%, var(--foreground))`,
                          }
                    }
                    aria-hidden
                  >
                    {highlight.name.trim().slice(0, 1).toUpperCase()}
                  </span>
                  <span
                    className="absolute right-1 bottom-1 grid size-[18px] place-items-center rounded-full border border-background/50 bg-background/75 backdrop-blur-[2px]"
                    aria-hidden
                  >
                    <Sparkles className="size-2.5 text-faint" strokeWidth={1.8} />
                  </span>
                </span>
                <span className="w-full text-center leading-tight">
                  <span className="block truncate text-[12px] font-medium text-foreground">
                    {highlight.name}
                  </span>
                  {highlight.stories.length > 0 ? (
                    <span className="mono block text-[9.5px] tracking-[0.04em] text-faint">
                      {highlight.stories.length}{" "}
                      {highlight.stories.length === 1 ? "story" : "stories"}
                    </span>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onEdit(highlight)}
                style={{ display: viewOnly ? "none" : undefined }}
                aria-label={`Edit ${highlight.name} highlight`}
                className="mono absolute -top-1.5 right-0 hidden rounded-full border border-border bg-surface-2 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] text-faint transition-colors hover:text-foreground group-hover:block group-focus-within:block"
              >
                Edit
              </button>
            </div>
          </li>
        );
      })}
      <li className={cn("shrink-0 pt-1", viewOnly && "hidden")}>
        <button
          type="button"
          onClick={onCreate}
          aria-label="Create a highlight"
          className="group grid h-[64px] w-[64px] place-items-center rounded-xl border border-dashed border-border-strong bg-transparent transition-[background-color,transform] duration-[var(--motion-med)] hover:scale-[1.02] hover:bg-surface-2/60"
        >
          <Plus
            className="size-4 text-faint transition-colors group-hover:text-foreground"
            aria-hidden
          />
        </button>
        <p className="mt-2 w-[64px] text-center text-[12px] text-faint">New</p>
      </li>
    </ol>
  );
}
