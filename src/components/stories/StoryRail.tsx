/**
 * StoryRail — Instagram-exact horizontal story carousel.
 *
 * Instagram specs:
 * - Horizontal scroll, no scrollbar, snap, gap 12px
 * - First item: "Your story" with + badge (blue)
 * - Avatar outer 66px (56px image + ring), name 12px centered below, 74px max-width
 * - Unseen first, then seen, ordered by recency
 * - Seen ring: light gray #dbdbdb, Unseen: Instagram gradient
 * - Close friends: green ring
 * - Background: transparent (inherits page), border top/bottom subtle
 */

import { StoryAvatar } from "./StoryAvatar";
import type { BloomAccent, Story } from "@/lib/profile/types";

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
  const ring: "prompt" | "unseen" | "seen" = stories.length === 0 ? "prompt" : unseen > 0 ? "unseen" : "seen";

  if (loading) {
    return (
      <div className="ig-rail" aria-label="Loading stories" role="status">
        <div className="ig-rail-inner">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="ig-rail-item" aria-hidden>
              <div className="ig-rail-skeleton-avatar" />
              <div className="ig-rail-skeleton-name" />
            </div>
          ))}
        </div>
        <span className="sr-only">Loading stories…</span>
      </div>
    );
  }

  return (
    <div className="ig-rail" role="list" aria-label={label}>
      <div className="ig-rail-inner">
        {/* your story - Instagram first position */}
        <div role="listitem" className="ig-rail-item">
          <div className="ig-rail-avatar-wrap">
            <StoryAvatar
              name={name}
              avatarPath={avatarPath}
              accent={accent}
              size={56}
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
              label={stories.length === 0 ? "Add to your story" : `Open your story, ${unseen} unseen`}
            />
            {stories.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                aria-label="Add to your story"
                className="ig-rail-add-overlay"
              >
                {/* Invisible overlay - the visible + is inside StoryAvatar, this adds click area for add */}
                <span className="sr-only">Add to your story</span>
              </button>
            ) : null}
          </div>
          <span className="ig-rail-name">Your story</span>
        </div>

        {/* other people's stories */}
        {guests.map((guest) => (
          <div key={guest.userId} role="listitem" className="ig-rail-item">
            <div className="ig-rail-avatar-wrap">
              <StoryAvatar
                name={guest.displayName}
                avatarPath={guest.avatarPath}
                accent={guest.accent}
                size={56}
                ring={guest.unseenCount > 0 ? "unseen" : "seen"}
                closeFriends={guest.closeFriends}
                onClick={() => onOpenGuest?.(guest)}
                label={`Open ${guest.displayName}'s stories`}
              />
            </div>
            <span className="ig-rail-name">{guest.displayName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
