/**
 * StoryRail — the compact horizontal story carousel for Home and Profile.
 * Your story first (avatar opens, + creates), then people's rings where the
 * product provides them. Skeletons while loading; a single graceful tile
 * when there is nothing yet — never a giant empty wall.
 */

import { StoryAvatar } from "./StoryAvatar";
import type { BloomAccent, Story } from "@/lib/profile/types";
import { cn } from "@/lib/utils";

export interface RailGuest {
  userId: string;
  displayName: string;
  avatarPath: string | null;
  accent: BloomAccent;
  stories: Story[];
  unseenCount: number;
  closeFriends?: boolean;
}

export function StoryRail({
  name,
  avatarPath,
  accent,
  stories,
  seenIds,
  loading,
  pulse,
  onOpen,
  onAdd,
  guests = [],
  onOpenGuest,
  label = "Stories",
}: {
  name: string;
  avatarPath: string | null;
  accent: BloomAccent;
  stories: Story[];
  seenIds: ReadonlySet<string>;
  loading: boolean;
  pulse?: boolean;
  onOpen: (index: number) => void;
  onAdd: () => void;
  guests?: RailGuest[];
  onOpenGuest?: ((guest: RailGuest) => void) | undefined;
  label?: string;
}) {
  const unseen = stories.filter((s) => !seenIds.has(s.id)).length;
  const ring = stories.length === 0 ? "prompt" : unseen > 0 ? "unseen" : "seen";

  if (loading) {
    return (
      <div className="srail" aria-label="Loading stories" role="status">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex min-w-[76px] flex-col items-center gap-2 px-1 py-1.5"
            aria-hidden
          >
            <div className="size-[64px] animate-pulse rounded-full bg-surface-2/70" />
            <div className="h-2.5 w-10 animate-pulse rounded-full bg-surface-2/70" />
          </div>
        ))}
        <span className="sr-only">Loading stories…</span>
      </div>
    );
  }

  return (
    <div className="srail" role="list" aria-label={label}>
      {/* your story */}
      <div role="listitem" className="flex flex-col items-center">
        <span className={cn("srail-item")} data-unseen={unseen > 0}>
          <span className="relative">
            <StoryAvatar
              name={name}
              avatarPath={avatarPath}
              accent={accent}
              size={62}
              ring={ring}
              pulse={pulse && unseen > 0}
              showAdd
              onClick={() => {
                if (stories.length === 0) onAdd();
                else {
                  const idx = Math.max(
                    0,
                    stories.findIndex((s) => !seenIds.has(s.id)),
                  );
                  onOpen(idx);
                }
              }}
              label={stories.length === 0 ? "Add a story" : `Open your story, ${unseen} unseen`}
            />
            {stories.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                aria-label="Add to your story"
                className="absolute -bottom-0.5 -right-0.5 z-10 grid size-6 place-items-center rounded-full border-2 border-[color:var(--background)] bg-[color:var(--foreground)] text-[13px] font-bold leading-none text-[color:var(--background)]"
              >
                +
              </button>
            ) : null}
          </span>
          <span className="srail-name">Your story</span>
        </span>
      </div>

      {/* people's stories, when the product provides them */}
      {guests.map((guest) => (
        <div key={guest.userId} role="listitem" className="flex flex-col items-center">
          <span className="srail-item" data-unseen={guest.unseenCount > 0}>
            <StoryAvatar
              name={guest.displayName}
              avatarPath={guest.avatarPath}
              accent={guest.accent}
              size={62}
              ring={guest.unseenCount > 0 ? "unseen" : "seen"}
              closeFriends={guest.closeFriends}
              onClick={() => onOpenGuest?.(guest)}
              label={`Open ${guest.displayName}'s stories`}
            />
            <span className="srail-name">{guest.displayName}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
