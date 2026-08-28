/**
 * PublicProfileView — the honest public face of a profile. Everything here
 * is either public identity or content the user explicitly shared. Used by
 * the preview dialog and by someone else visiting /@username.
 */

import { useState } from "react";
import { Lock } from "lucide-react";

import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import type { ProfileViewModel } from "@/components/profile/ProfileView";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { StoryRail } from "@/components/stories/StoryRail";
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
      className="flex flex-col gap-10"
      style={{
        // profile-level personalization, expressed through tokens, not ad-hoc colors
        ["--profile-accent" as string]: accentVar[identity.accent],
        ["--profile-accent-soft" as string]: `color-mix(in oklab, ${accentVar[identity.accent]} 10%, transparent)`,
        ["--profile-accent-border" as string]: `color-mix(in oklab, ${identity.accent ? accentVar[identity.accent] : "var(--violet)"} 40%, transparent)`,
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
        <ProfileAvatar
          name={identity.displayName}
          avatarPath={identity.avatarPath}
          accent={identity.accent}
          size={96}
        />
        <h1 className="display mt-4 text-[26px] leading-tight break-words">
          {identity.displayName}
        </h1>
        {identity.username ? (
          <p className="mono mt-1 text-[12px] text-muted-foreground">@{identity.username}</p>
        ) : null}
        {identity.bio ? (
          <p className="mt-3 max-w-[44ch] text-[14px] leading-relaxed text-muted-foreground">
            {identity.bio}
          </p>
        ) : null}
      </header>

      {stories.length > 0 ? (
        <section aria-label="Shared stories">
          <StoryRail
            stories={stories}
            displayName={identity.displayName}
            avatarPath={identity.avatarPath}
            accent={identity.accent}
            seenIds={EMPTY_SEEN}
            onCreate={() => undefined}
            onOpen={(i) => setViewer(i)}
            viewOnly
          />
        </section>
      ) : null}

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

const EMPTY_SEEN: ReadonlySet<string> = new Set();
