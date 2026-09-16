/**
 * ProfileHero — the cover, the avatar breaking its edge, the name row.
 *
 * Reads like the profile header of any large social app on purpose: people
 * already know where the name, @handle, bio and buttons live. What sits in
 * the cover is the difference — the last twelve weeks of the record drawn as
 * a pulse line, and the things being tracked as tags. The avatar is still
 * the story ring: an unseen story lights it and opens the viewer; without a
 * story the circle edits the photo and the plus starts one.
 */

import { useEffect, useState, type ReactNode } from "react";
import {
  Archive,
  Eye,
  LogIn,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  ShieldCheck,
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

/** Avatar diameter: 96 on phones, 124 above — mirrors --pf-avatar in profile.css. */
function useAvatarSize(): number {
  const [size, setSize] = useState(124);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setSize(mq.matches ? 96 : 124);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return size;
}

export interface HeroStoryState {
  count: number;
  unseen: number;
  nextExpiry: string | null;
  /** active→unseen transitions get one entrance animation */
  animateIn: boolean;
}

/** One value per day, oldest first — the cover's pulse line. */
export function CoverPulse({ values, className }: { values: number[]; className?: string }) {
  const w = 600;
  const h = 100;
  const n = values.length;
  if (n < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => {
    const x = (i / (n - 1)) * w;
    const y = h - 8 - (v / max) * (h - 30);
    return [x, y] as const;
  });
  /* smooth with quadratic midpoints */
  let d = `M ${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i += 1) {
    const [px, py] = pts[i - 1]!;
    const [x, y] = pts[i]!;
    const mx = (px + x) / 2;
    const my = (py + y) / 2;
    d += ` Q ${px} ${py} ${mx} ${my}`;
  }
  d += ` T ${pts[pts.length - 1]![0]} ${pts[pts.length - 1]![1]}`;
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="pf-pulse-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--pf-accent)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--pf-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#pf-pulse-fill)" />
      <path
        d={d}
        fill="none"
        stroke="var(--pf-accent)"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

export function ProfileHero({
  identity,
  story,
  ambient,
  pulse,
  tags,
  memberSince,
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
  rankPill = null,
}: {
  identity: ProfileIdentity;
  story: HeroStoryState;
  ambient: string | null;
  /** Logged-things-per-day for the cover line, oldest first. */
  pulse: number[];
  /** Short tags for the cover: what is being tracked. */
  tags: string[];
  memberSince: string | null;
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
  /** The progression rank, shown beside the name (optional, real data only). */
  rankPill?: ReactNode;
}) {
  const ringState: "none" | "unseen" | "seen" | "prompt" =
    story.count > 0 ? (story.unseen > 0 ? "unseen" : "seen") : "prompt";
  const remaining = story.nextExpiry ? formatRemaining(story.nextExpiry) : null;
  const hasStory = story.count > 0;
  const avatarSize = useAvatarSize();
  /* the ring adds its own inset + stroke; the wrapper is the outer size */
  const innerSize = avatarSize - 2 * (6 + 2.5) - 8;
  const since = memberSince
    ? new Date(memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  return (
    <section aria-label="Profile" className="pf-rise">
      {/* ------------------------------- cover ------------------------------ */}
      <div
        className="pf-cover"
        style={
          ambient ? ({ ["--pf-ambient" as string]: ambient } as React.CSSProperties) : undefined
        }
      >
        <CoverPulse values={pulse} className="pf-cover-pulse" />
        {tags.length > 0 ? (
          <div className="pf-cover-tags" aria-label="Tracking">
            {tags.slice(0, 5).map((t) => (
              <span key={t} className="pf-cover-tag">
                {t}
              </span>
            ))}
            {tags.length > 5 ? <span className="pf-cover-tag">+{tags.length - 5}</span> : null}
          </div>
        ) : null}
        <div className="pf-cover-actions">
          <button
            type="button"
            onClick={onShare}
            className="pf-icon-btn"
            aria-label="Share profile"
            title="Share profile"
          >
            <Share2 className="size-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Profile options" className="pf-icon-btn">
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[210px] border-border bg-surface-2">
              <DropdownMenuItem
                onClick={onPreview}
                className="cursor-pointer gap-2.5 text-[13px] focus:bg-surface-3"
              >
                <Eye className="size-4 text-faint" /> Preview as others see it
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
      </div>

      {/* --------------------------- avatar + name row ---------------------- */}
      <div className="pf-head">
        <div className="pf-avatar-wrap">
          <StoryRing
            state={ringState}
            size={innerSize}
            accent={identity.accent}
            animateIn={story.animateIn}
            className="pf-ring"
          >
            <button
              type="button"
              onClick={hasStory ? onOpenStory : onEdit}
              aria-label={
                hasStory
                  ? `View your story — ${story.count} moment${story.count === 1 ? "" : "s"}`
                  : "Change profile photo"
              }
              className={cn("pf-avatar-btn", hasStory && "cursor-pointer")}
            >
              <ProfileAvatar
                name={identity.displayName}
                avatarPath={identity.avatarPath}
                accent={identity.accent}
                size={innerSize}
              />
            </button>
          </StoryRing>
          <button
            type="button"
            onClick={onCreateStory}
            aria-label="Add story"
            title="Add story"
            className="pf-avatar-add"
          >
            <Plus className="size-4" strokeWidth={2.4} aria-hidden />
          </button>
        </div>

        <div className="pf-head-main">
          <div className="min-w-0">
            <h1 className="pf-name">
              {identity.displayName}
              {rankPill}
            </h1>
            <div className="pf-handle">
              {identity.username ? (
                <span>@{identity.username}</span>
              ) : (
                <button type="button" onClick={onEdit} className="pf-handle-btn">
                  choose your @username
                </button>
              )}
              {since ? (
                <>
                  <span aria-hidden>·</span>
                  <span>tracking since {since}</span>
                </>
              ) : null}
              {hasStory ? (
                <button
                  type="button"
                  onClick={onOpenStory}
                  className={cn("pf-pill", story.unseen > 0 && "pf-pill--live")}
                >
                  {story.count} {story.count === 1 ? "moment" : "moments"}
                  {remaining ? <span className="text-amber">{remaining}</span> : null}
                </button>
              ) : null}
            </div>
            <p className={cn("pf-bio", !identity.bio && "pf-bio--empty")}>
              {identity.bio || "A line about you — what you're working on, what you track, why."}
            </p>
            {completion.show ? (
              <p className="pf-eyebrow mt-2">
                profile {completion.done} of {completion.total} complete
              </p>
            ) : null}
          </div>
          <div className="pf-actions">
            <button type="button" onClick={onEdit} className="pf-btn pf-btn--primary">
              <Pencil className="size-3.5" aria-hidden /> Edit profile
            </button>
            <button type="button" onClick={onCreateStory} className="pf-btn">
              <Plus className="size-3.5" aria-hidden /> Moment
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
