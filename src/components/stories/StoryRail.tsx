/**
 * StoryRail — the moments layer on Profile. Compact, horizontally scrolling,
 * never a giant empty card: with no stories it is a single inviting button.
 */

import { Plus } from "lucide-react";

import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import { formatRelativeDay } from "@/lib/profile/journey";
import type { Story } from "@/lib/profile/types";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

export function StoryRail({
  stories,
  displayName,
  avatarPath,
  accent,
  seenIds,
  onCreate,
  onOpen,
  viewOnly = false,
}: {
  stories: Story[];
  displayName: string;
  avatarPath: string | null;
  accent: Story["accent"];
  seenIds: ReadonlySet<string>;
  onCreate: () => void;
  onOpen: (index: number) => void;
  viewOnly?: boolean;
}) {
  if (stories.length === 0 && viewOnly) return null;

  if (stories.length === 0) {
    return (
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onCreate}
          aria-label="Create a story"
          className="group grid size-[62px] place-items-center rounded-full border border-dashed border-border-strong bg-surface-2/40 transition-all duration-300 hover:border-[color:var(--profile-accent-border)] hover:bg-surface-2"
        >
          <Plus
            className="size-[18px] text-faint transition-colors group-hover:text-foreground"
            strokeWidth={1.8}
            aria-hidden
          />
        </button>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground">Your story</p>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            Your moments will live here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ol className="no-scrollbar -mx-1 flex items-start gap-4 overflow-x-auto px-1 pb-1">
      {!viewOnly ? (
        <li>
          <RailItem label="Your story" sub="Add a moment" onClick={onCreate} plus accent={accent}>
            <ProfileAvatar
              name={displayName}
              avatarPath={avatarPath}
              accent={accent}
              size={54}
              ring="none"
            />
          </RailItem>
        </li>
      ) : null}
      {stories.map((story, i) => (
        <li key={story.id}>
          <RailItem
            label={
              story.title
                ? story.title.length > 14
                  ? `${story.title.slice(0, 13)}…`
                  : story.title
                : story.kind === "photo"
                  ? "Photo"
                  : "Moment"
            }
            sub={formatRelativeDay(story.createdAt)}
            onClick={() => onOpen(i)}
            ring={seenIds.has(story.id) ? "story-seen" : "story-unseen"}
            accent={story.accent}
          >
            <ProfileAvatar
              name={displayName}
              avatarPath={story.kind === "photo" ? story.mediaPath : avatarPath}
              accent={story.accent}
              size={54}
              ring="none"
            />
          </RailItem>
        </li>
      ))}
    </ol>
  );
}

function RailItem({
  children,
  label,
  sub,
  onClick,
  ring,
  plus = false,
  accent,
}: {
  children: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  ring?: "story-seen" | "story-unseen";
  plus?: boolean;
  accent: Story["accent"];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={plus ? `Create a story — ${label}` : `Open story: ${label}`}
      className="group flex w-[70px] shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 pb-1.5 pt-0.5 transition-colors hover:bg-surface-2/50"
    >
      <span className="relative">
        <span
          aria-hidden
          className={cn(
            "absolute -inset-[5px] rounded-full",
            ring === "story-unseen" && "opacity-90 transition-opacity group-hover:opacity-100",
          )}
          style={
            ring === "story-unseen"
              ? {
                  padding: 2,
                  background: `conic-gradient(from 210deg, ${accentVar[accent]}, color-mix(in oklab, var(--sky) 65%, transparent) 45%, color-mix(in oklab, ${accentVar[accent]} 25%, transparent) 72%, ${accentVar[accent]})`,
                  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }
              : ring === "story-seen"
                ? { border: `1px solid color-mix(in oklab, ${accentVar[accent]} 28%, transparent)` }
                : undefined
          }
        />
        {plus ? (
          <span className="absolute -bottom-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full border border-background bg-[var(--profile-accent,var(--violet))] text-[var(--primary-foreground)]">
            <Plus className="size-3" strokeWidth={2.4} aria-hidden />
          </span>
        ) : null}
        {children}
      </span>
      <span className="w-full text-center leading-tight">
        <span className="block truncate text-[12px] font-medium text-foreground">{label}</span>
        {sub ? (
          <span className="mono block truncate text-[9.5px] uppercase tracking-[0.06em] text-faint">
            {sub}
          </span>
        ) : null}
      </span>
    </button>
  );
}
