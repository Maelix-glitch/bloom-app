/**
 * ProfileHero — identity first, moment alive. The avatar is no longer a
 * framed portrait with buttons around it: it IS the interaction. An unseen
 * story lights the Bloom ring; the ring opens the story. No story, a quiet
 * plus invites one. Everything else defers to that circle.
 */

import {
  Archive,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  ShieldCheck,
  LogIn,
  LogOut,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatRemaining } from "@/lib/profile/journey";
import type { ProfileIdentity } from "@/lib/profile/types";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { StoryRing } from "@/components/profile/StoryRing";

export interface HeroStoryState {
  count: number;
  unseen: number;
  nextExpiry: string | null;
  /** active→unseen transitions get one entrance animation */
  animateIn: boolean;
}

export function ProfileHero({
  identity,
  story,
  ambient,
  onEdit,
  onShare,
  onPreview,
  onOpenArchive,
  onOpenPrivacy,
  onSignOut,
  onSignIn,
  onOpenStory,
  onCreateStory,
  completion,
  isSignedIn = true,
}: {
  identity: ProfileIdentity;
  story: HeroStoryState;
  ambient: string | null;
  onEdit: () => void;
  onShare: () => void;
  onPreview: () => void;
  onOpenArchive: () => void;
  onOpenPrivacy: () => void;
  onSignOut: () => void;
  onSignIn?: () => void;
  onOpenStory: () => void;
  onCreateStory: () => void;
  completion: { done: number; total: number; show: boolean };
  isSignedIn?: boolean;
}) {
  const ringState: "none" | "unseen" | "seen" | "prompt" =
    story.count > 0 ? (story.unseen > 0 ? "unseen" : "seen") : "prompt";
  const remaining = story.nextExpiry ? formatRemaining(story.nextExpiry) : null;
  const hasStory = story.count > 0;

  return (
    <section aria-label="Profile" className="relative -mx-5 px-5 pb-1 pt-6 sm:mx-0 sm:px-0 sm:pt-8">
      {/* ambient atmosphere sampled from the person's own photo (or quiet accent) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-[1] h-[440px] overflow-clip"
      >
        <div
          className="absolute left-1/2 top-[-70px] h-[440px] w-[min(880px,220%)] -translate-x-1/2"
          style={{
            background: `radial-gradient(58% 62% at 50% 42%, ${ambient ?? "color-mix(in oklab, var(--profile-accent, var(--violet)) 9%, transparent)"}, transparent 70%)`,
            filter: "blur(12px)",
          }}
        />
      </div>

      <div className="absolute right-0 top-0 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Profile options"
            className="grid size-9 place-items-center rounded-full border border-border bg-surface/60 text-muted-foreground transition-[color,border-color,background-color] duration-[var(--motion-fast)] hover:border-border-strong hover:text-foreground data-[state=open]:border-border-strong data-[state=open]:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[210px] border-border bg-surface-2">
            <DropdownMenuItem
              onClick={onPreview}
              className="cursor-pointer gap-2.5 text-[13px] focus:bg-surface-3"
            >
              <Eye className="size-4 text-faint" /> Preview profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onOpenArchive}
              className="cursor-pointer gap-2.5 text-[13px] focus:bg-surface-3"
            >
              <Archive className="size-4 text-faint" /> Story archive
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onOpenPrivacy}
              className="cursor-pointer gap-2.5 text-[13px] focus:bg-surface-3"
            >
              <ShieldCheck className="size-4 text-faint" /> Privacy
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            {isSignedIn ? (
              <DropdownMenuItem
                onClick={onSignOut}
                className="cursor-pointer gap-2.5 text-[13px] text-muted-foreground focus:bg-surface-3 focus:text-rose"
              >
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={onSignIn}
                className="cursor-pointer gap-2.5 text-[13px] text-muted-foreground focus:bg-surface-3 focus:text-foreground"
              >
                <LogIn className="size-4" /> Sign in
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col items-center text-center">
        {/* the identity circle — click = open story when alive, else tend the photo */}
        <div className="relative">
          <StoryRing
            state={ringState}
            size={132}
            accent={identity.accent}
            animateIn={story.animateIn}
            className="mb-1"
          >
            <button
              type="button"
              onClick={hasStory ? onOpenStory : onEdit}
              aria-label={
                hasStory
                  ? `View your story — ${story.count} moment${story.count === 1 ? "" : "s"}`
                  : "Change profile photo"
              }
              className={cn(
                "group rounded-full transition-transform duration-[var(--motion-med)] ease-[var(--ease-out-expo)] hover:scale-[1.015] active:scale-[0.995]",
                hasStory && "cursor-pointer",
              )}
            >
              <ProfileAvatar
                name={identity.displayName}
                avatarPath={identity.avatarPath}
                accent={identity.accent}
                size={132}
              />
            </button>
          </StoryRing>

          <button
            type="button"
            onClick={onCreateStory}
            aria-label="Add story"
            title="Add story"
            className="absolute right-0.5 bottom-0.5 z-10 grid size-[30px] place-items-center rounded-full border-2 border-background bg-[var(--profile-accent,var(--violet))] text-[var(--primary-foreground)] shadow-[0_6px_16px_-8px_rgba(0,0,0,0.9)] transition-transform duration-[var(--motion-fast)] hover:scale-[1.1] active:scale-[0.96]"
          >
            <Plus className="size-4" strokeWidth={2.4} aria-hidden />
          </button>
        </div>

        <h1
          className="display mt-5 max-w-[16ch] text-[34px] leading-[1.06] text-balance break-words sm:text-[42px]"
          style={{ letterSpacing: "-0.022em" }}
        >
          {identity.displayName}
        </h1>

        {identity.username ? (
          <p className="mono mt-2 text-[12px] tracking-[0.03em] text-faint">@{identity.username}</p>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Choose your @username"
            className="mono mt-2 rounded-full px-2 py-0.5 text-[11px] tracking-[0.03em] text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-[var(--profile-accent)]"
          >
            Choose your @username
          </button>
        )}

        <p
          className={cn(
            "mt-3.5 max-w-[44ch] text-pretty leading-relaxed",
            identity.bio ? "text-[15px] text-muted-foreground" : "text-[13px] italic text-faint/80",
          )}
        >
          {identity.bio || "A little about you..."}
        </p>

        {completion.show ? (
          <p className="mono mt-3 text-[10px] tracking-[0.08em] text-faint uppercase">
            taking shape — {completion.done} of {completion.total}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-full px-4.5 py-2 text-[13px] font-medium text-foreground transition-[transform,background-color,border-color] duration-[var(--motion-med)] hover:scale-[1.015] active:scale-[0.99]"
            style={{
              background:
                "color-mix(in oklab, var(--profile-accent, var(--violet)) 15%, var(--surface-2))",
              border:
                "1px solid color-mix(in oklab, var(--profile-accent, var(--violet)) 40%, transparent)",
            }}
          >
            <Pencil className="size-3.5" aria-hidden /> Edit profile
          </button>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] text-muted-foreground transition-colors duration-[var(--motion-fast)] hover:bg-surface-2/60 hover:text-foreground"
          >
            <Share2 className="size-3.5" aria-hidden /> Share
          </button>
        </div>

        {/* the moment line — replaces the old rail; quiet, single-source */}
        <div className="mt-5 min-h-[22px]">
          {hasStory ? (
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[12px] text-muted-foreground">
              <button
                type="button"
                onClick={onOpenStory}
                className={cn(
                  "mono inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] tracking-[0.06em] uppercase transition-colors duration-[var(--motion-fast)]",
                  story.unseen > 0
                    ? "border-[color:var(--profile-accent-border)] bg-[color:var(--profile-accent-soft)] text-foreground hover:brightness-110"
                    : "border-border hover:border-border-strong hover:text-foreground",
                )}
              >
                {story.unseen > 0 ? (
                  <span
                    className="size-1.5 rounded-full bg-[var(--profile-accent,var(--violet))]"
                    aria-hidden
                  />
                ) : null}
                {story.count} {story.count === 1 ? "moment" : "moments"}
                {remaining ? <span className="text-amber">{remaining}</span> : null}
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-faint">Add a story — a moment, a mood, a small win.</p>
          )}
        </div>
      </div>
    </section>
  );
}
