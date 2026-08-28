/**
 * One renderer for one concept: story content is composed here once and used
 * by the viewer, the composer preview, and public profile cards — no
 * parallel implementations.
 */

import { useState } from "react";
import { Sunrise } from "lucide-react";

import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import type { Story } from "@/lib/profile/types";
import { STORY_KIND_META, storyMediaUrl } from "@/lib/profile/storyMeta";

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
  const accent = accentVar[story.accent];
  const hasPhoto = story.kind === "photo" && Boolean(story.mediaPath);
  const meta = STORY_KIND_META[story.kind];

  return (
    <figure
      className={cn(
        "flex h-full w-full flex-col items-center justify-center text-center",
        compact ? "gap-3 px-4 py-6" : "gap-5 px-6 py-8",
        className,
      )}
      style={{
        background: `radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, ${accent} 10%, transparent), transparent 62%), radial-gradient(90% 70% at 50% 110%, color-mix(in oklab, ${accent} 7%, transparent), transparent 55%)`,
      }}
    >
      {hasPhoto ? (
        <div className={cn("relative flex min-h-0 w-full flex-1 items-center justify-center")}>
          {mediaState === "loading" ? (
            <div className="absolute inset-0 grid place-items-center" aria-hidden>
              <span className="h-24 w-24 animate-pulse rounded-full bg-surface-3/60" />
            </div>
          ) : null}
          {mediaState === "failed" ? (
            <div className="absolute inset-0 grid place-items-center px-6">
              <div className="text-center">
                <p className="display text-[16px] text-muted-foreground">
                  Couldn't load this moment.
                </p>
                <button
                  type="button"
                  className="mono mt-3 rounded-full border border-border px-4 py-1.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
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
            style={{ boxShadow: "0 30px 80px -40px rgba(0,0,0,0.9)" }}
          />
        </div>
      ) : null}

      {!hasPhoto ? (
        <div className={cn("flex flex-col items-center", compact ? "gap-2" : "gap-4")}>
          {meta.icon ? (
            <span
              className="grid size-10 place-items-center rounded-full border"
              style={{
                borderColor: `color-mix(in oklab, ${accent} 35%, transparent)`,
                background: `color-mix(in oklab, ${accent} 10%, transparent)`,
                color: accent,
              }}
              aria-hidden
            >
              {(() => {
                const MetaIcon = meta.icon;
                return <MetaIcon className="size-[18px]" strokeWidth={1.6} />;
              })()}
            </span>
          ) : story.kind === "text" ? (
            <Sunrise className="size-5 text-faint" aria-hidden strokeWidth={1.6} />
          ) : null}

          {story.title ? (
            <p
              className={cn(
                "display text-balance",
                compact ? "text-[18px] leading-snug" : "text-[26px] leading-[1.15] sm:text-[32px]",
              )}
              style={{ maxWidth: "34ch" }}
            >
              {story.title}
            </p>
          ) : null}

          {story.body ? (
            <p
              className={cn(
                "whitespace-pre-line text-pretty leading-relaxed text-muted-foreground",
                compact ? "text-[13px]" : "text-[15px]",
              )}
              style={{ maxWidth: "46ch" }}
            >
              {story.body}
            </p>
          ) : null}

          <p className="eyebrow mt-2">{meta.label}</p>
        </div>
      ) : story.title ? (
        <figcaption
          className={cn("display", compact ? "text-[15px]" : "text-[19px]")}
          style={{ maxWidth: "36ch" }}
        >
          {story.title}
        </figcaption>
      ) : null}
    </figure>
  );
}
