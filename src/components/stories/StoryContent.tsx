/**
 * StoryContent — Instagram-exact renderer for non-rich stories.
 * Rich stories go through StoryCanvas (shared). Text-only stories render like Instagram Create:
 * centered white text on black/gradient, large, bold.
 */

import { useState } from "react";

import { cn } from "@/lib/utils";
import type { Story } from "@/lib/profile/types";
import { STORY_KIND_META, storyMediaUrl } from "@/lib/profile/storyMeta";
import { StoryCanvas, type CanvasMedia } from "@/components/stories/StoryCanvas";

export function StoryContent({
  story,
  compact = false,
  className,
  onMediaFail,
}: {
  story: Story;
  compact?: boolean;
  className?: string;
  onMediaFail?: () => void;
}) {
  const [mediaState, setMediaState] = useState<"loading" | "ready" | "failed">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const hasPhoto = story.kind === "photo" && Boolean(story.mediaPath);
  const meta = STORY_KIND_META[story.kind];

  const isRich =
    story.mediaType === "video" ||
    story.elements.length > 0 ||
    story.backgroundId != null ||
    story.filterId != null ||
    story.music != null;

  if (isRich) {
    const media: CanvasMedia =
      story.mediaType === "video"
        ? { type: "video", src: storyMediaUrl(story) }
        : story.mediaType === "image" && story.mediaPath
          ? { type: "image", src: storyMediaUrl(story) }
          : { type: "none", src: null };
    return (
      <StoryCanvas
        media={media}
        backgroundId={story.backgroundId}
        filterId={story.filterId}
        adjustments={story.adjustments}
        elements={story.elements}
        mode="static"
        alt={story.altText ?? story.title}
        createdAt={story.createdAt}
        className={className}
      />
    );
  }

  // Instagram text story fallback - black bg, centered white text
  return (
    <figure
      className={cn(
        "flex h-full w-full flex-col items-center justify-center text-center bg-black",
        compact ? "gap-3 px-4 py-6" : "gap-5 px-6 py-8",
        className,
      )}
    >
      {hasPhoto ? (
        <div className="relative flex min-h-0 w-full flex-1 items-center justify-center bg-black">
          {mediaState === "loading" ? (
            <div className="absolute inset-0 grid place-items-center" aria-hidden>
              <span className="h-24 w-24 animate-pulse rounded-full bg-[#262626]" />
            </div>
          ) : null}
          {mediaState === "failed" ? (
            <div className="absolute inset-0 grid place-items-center px-6">
              <div className="text-center">
                <p className="text-[16px] text-white">Couldn't load this moment.</p>
                <button
                  type="button"
                  className="mt-3 rounded-full border border-white/30 px-4 py-1.5 text-[12px] text-white hover:bg-white/10 transition-colors"
                  onClick={() => {
                    setMediaState("loading");
                    setReloadKey((k) => k + 1);
                  }}
                >
                  Try again
                </button>
              </div>
            </div>
          ) : null}
          <img
            key={reloadKey}
            src={storyMediaUrl(story) ?? ""}
            alt={story.title || "Story photo"}
            loading="lazy"
            onLoad={() => setMediaState("ready")}
            onError={() => {
              setMediaState("failed");
              onMediaFail?.();
            }}
            className={cn(
              "mx-auto max-h-full max-w-full object-contain transition-opacity duration-500",
              mediaState === "ready" ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      ) : null}

      {!hasPhoto ? (
        <div className={cn("flex flex-col items-center px-6", compact ? "gap-2" : "gap-4")}>
          {story.title ? (
            <p
              className={cn(
                "text-balance font-bold text-white text-center leading-tight",
                compact ? "text-[20px]" : "text-[28px] sm:text-[32px]",
              )}
              style={{
                maxWidth: "20ch",
                fontFamily: "system-ui, -apple-system, sans-serif",
                textShadow: "0 2px 12px rgba(0,0,0,0.5)",
                wordBreak: "break-word",
              }}
            >
              {story.title}
            </p>
          ) : null}

          {story.body ? (
            <p
              className={cn(
                "whitespace-pre-line text-pretty leading-relaxed text-white text-center",
                compact ? "text-[15px]" : "text-[18px]",
              )}
              style={{ maxWidth: "28ch", textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
            >
              {story.body}
            </p>
          ) : null}

          {!story.title && !story.body ? (
            <p className="text-[13px] uppercase tracking-[0.08em] text-white/60">{meta.label}</p>
          ) : null}
        </div>
      ) : story.title ? (
        <figcaption
          className={cn(
            "font-semibold text-white text-center mt-4",
            compact ? "text-[16px]" : "text-[18px]",
          )}
          style={{ maxWidth: "36ch", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
        >
          {story.title}
        </figcaption>
      ) : null}
    </figure>
  );
}
