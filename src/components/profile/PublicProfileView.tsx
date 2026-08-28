/**
 * PublicProfileView — the honest public face of a Bloom space. Identity
 * first, shared moments second, kept things third. Used identically by the
 * preview dialog and by a visitor arriving at /@handle.
 */

import { useState } from "react";
import { Lock } from "lucide-react";

import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import type { ProfileViewModel } from "@/components/profile/ProfileView";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { StoryRing } from "@/components/profile/StoryRing";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { HighlightRail } from "@/components/highlights/HighlightRail";
import { FeaturedCard } from "@/components/profile/FeaturedMoment";

export function PublicProfileView({
  model,
  asPreview = false,
}: {
  model: ProfileViewModel;
  asPreview?: boolean;
}) {
  const [viewer, setViewer] = useState<number | null>(null);
  const [highlightViewIndex, setHighlightViewIndex] = useState<number | null>(null);

  const { identity, stories, highlights, featured } = model;
  const highlightView =
    highlightViewIndex !== null ? (highlights[highlightViewIndex] ?? null) : null;
  const hasContent = stories.length > 0 || highlights.length > 0 || Boolean(featured);

  if (!hasContent && !asPreview) {
    return (
      <div className="mx-auto max-w-[480px] rounded-2xl border border-border bg-surface/40 p-8 text-center">
        <Lock className="mx-auto size-5 text-faint" strokeWidth={1.5} aria-hidden />
        <p className="display mt-4 text-[20px]">This space is private.</p>
        <p className="mx-auto mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-muted-foreground">
          {identity.username
            ? `${identity.displayName} keeps their Bloom to themselves right now — and that's okay.`
            : "This profile hasn't been shared yet."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-9"
      style={{
        ["--profile-accent" as string]: accentVar[identity.accent],
        ["--profile-accent-soft" as string]: `color-mix(in oklab, ${accentVar[identity.accent]} 10%, transparent)`,
        ["--profile-accent-border" as string]: `color-mix(in oklab, ${accentVar[identity.accent]} 40%, transparent)`,
      }}
    >
      {asPreview ? (
        <p
          className={cn(
            "mono mx-auto w-fit rounded-full border px-3.5 py-1 text-[10px] uppercase tracking-[0.1em]",
            model.canBeShared ? "border-sage/40 text-sage" : "border-amber/40 text-amber",
          )}
        >
          Profile preview · {model.canBeShared ? "visible to visitors" : "nothing shared yet"}
        </p>
      ) : null}

      <header className="flex flex-col items-center text-center">
        <StoryRing
          state={stories.length > 0 ? "unseen" : "none"}
          size={104}
          accent={identity.accent}
        >
          <button
            type="button"
            onClick={() => stories.length > 0 && setViewer(0)}
            disabled={stories.length === 0}
            aria-label={
              stories.length > 0
                ? `View ${identity.displayName.split(" ")[0]}'s stories`
                : undefined
            }
            className={
              stories.length > 0
                ? "cursor-pointer rounded-full transition-transform duration-[var(--motion-med)] hover:scale-[1.015]"
                : "cursor-default"
            }
          >
            <ProfileAvatar
              name={identity.displayName}
              avatarPath={identity.avatarPath}
              accent={identity.accent}
              size={104}
            />
          </button>
        </StoryRing>
        <h1 className="display mt-4 text-[28px] leading-tight break-words sm:text-[32px]">
          {identity.displayName}
        </h1>
        {identity.username ? (
          <p className="mono mt-1 text-[12px] text-faint">@{identity.username}</p>
        ) : null}
        {identity.bio ? (
          <p className="mt-3 max-w-[44ch] text-[14px] leading-relaxed text-muted-foreground">
            {identity.bio}
          </p>
        ) : null}
        {stories.length > 0 ? (
          <button
            type="button"
            onClick={() => setViewer(0)}
            className="mono mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] tracking-[0.06em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            style={{
              borderColor:
                "color-mix(in oklab, var(--profile-accent, var(--violet)) 35%, transparent)",
            }}
          >
            <span
              className="size-1.5 rounded-full bg-[var(--profile-accent,var(--violet))]"
              aria-hidden
            />
            {stories.length} {stories.length === 1 ? "story" : "stories"}
          </button>
        ) : null}
      </header>

      {highlights.length > 0 ? (
        <section aria-label="Highlights">
          <HighlightRail
            highlights={highlights}
            onOpen={(i) => setHighlightViewIndex(i)}
            onCreate={() => undefined}
            onEdit={() => undefined}
            viewOnly
          />
        </section>
      ) : null}

      {featured ? (
        <section aria-label="Featured moment" className="mx-auto w-full max-w-[560px]">
          <FeaturedCard content={featured} accent={identity.accent} />
        </section>
      ) : null}

      <StoryViewer
        target={viewer !== null ? { stories, startIndex: viewer } : null}
        viewerName={identity.displayName}
        viewerAvatarPath={identity.avatarPath}
        accent={identity.accent}
        onClose={() => setViewer(null)}
      />
      <StoryViewer
        target={highlightView ? { stories: highlightView.stories, startIndex: 0 } : null}
        viewerName={`${highlightView?.name ?? ""} — highlight`}
        viewerAvatarPath={identity.avatarPath}
        accent={highlightView?.accent ?? identity.accent}
        onClose={() => setHighlightViewIndex(null)}
      />
    </div>
  );
}
