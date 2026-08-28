/**
 * ProfileHero — the identity anchor. Avatar dominant, name strongest,
 * username secondary, bio personal, actions obvious. Everything else on the
 * page defers to this.
 */

import { useState } from "react";
import { Archive, Eye, MoreHorizontal, Pencil, Share2, ShieldCheck, LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ProfileIdentity } from "@/lib/profile/types";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

export function ProfileHero({
  identity,
  onEdit,
  onShare,
  onPreview,
  onOpenArchive,
  onOpenPrivacy,
  onSignOut,
  completion,
  avatarBusy = false,
  isSignedIn = true,
  onSignIn,
}: {
  identity: ProfileIdentity;
  onEdit: () => void;
  onShare: () => void;
  onPreview: () => void;
  onOpenArchive: () => void;
  onOpenPrivacy: () => void;
  onSignOut: () => void;
  completion: { done: number; total: number; show: boolean };
  avatarBusy?: boolean;
  isSignedIn?: boolean;
  onSignIn?: () => void;
}) {
  return (
    <section
      aria-label="Profile"
      className="relative -mx-5 px-5 pt-10 pb-2 sm:mx-0 sm:px-0 sm:pt-14"
    >
      {/* menu */}
      <div className="absolute right-0 top-0 z-10 sm:top-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Profile options"
            className="grid size-9 place-items-center rounded-full border border-border bg-surface/60 text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground data-[state=open]:border-border-strong data-[state=open]:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[210px] border-border bg-surface-2">
            <DropdownMenuItem
              onClick={onPreview}
              className="gap-2.5 text-[13px] focus:bg-surface-3 cursor-pointer"
            >
              <Eye className="size-4 text-faint" /> Preview profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onOpenArchive}
              className="gap-2.5 text-[13px] focus:bg-surface-3 cursor-pointer"
            >
              <Archive className="size-4 text-faint" /> Story archive
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onOpenPrivacy}
              className="gap-2.5 text-[13px] focus:bg-surface-3 cursor-pointer"
            >
              <ShieldCheck className="size-4 text-faint" /> Privacy
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={onSignOut}
              className="gap-2.5 text-[13px] text-muted-foreground focus:bg-surface-3 focus:text-rose cursor-pointer"
            >
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col items-center text-center">
        <p className="eyebrow mb-7 flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full"
            style={{ background: "var(--profile-accent, var(--sage))" }}
          />
          Your Bloom space
        </p>

        <button
          type="button"
          onClick={onEdit}
          aria-label="Change profile photo"
          className={cn(
            "group relative mb-5 rounded-full transition-transform duration-300 hover:scale-[1.015] active:scale-[0.995]",
            avatarBusy && "animate-pulse",
          )}
        >
          <ProfileAvatar
            name={identity.displayName}
            avatarPath={identity.avatarPath}
            accent={identity.accent}
            size={116}
            ring="quiet"
          />
          <span
            aria-hidden
            className="absolute inset-x-0 -bottom-1 mx-auto grid h-7 w-7 translate-y-full place-items-center rounded-full border border-border bg-surface-2 text-muted-foreground opacity-0 shadow-md transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <Pencil className="size-3" />
          </span>
        </button>

        <h1
          className="display max-w-[16ch] text-[29px] leading-[1.1] text-balance break-words sm:text-[34px]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {identity.displayName}
        </h1>

        {identity.username ? (
          <p className="mono mt-1.5 text-[12px] tracking-[0.02em] text-muted-foreground">
            @{identity.username}
          </p>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="mono mt-1.5 rounded-full px-2 py-0.5 text-[11px] tracking-[0.02em] text-faint transition-colors hover:text-foreground"
          >
            claim your @username
          </button>
        )}

        <p
          className={cn(
            "mt-3.5 max-w-[46ch] text-pretty leading-relaxed text-muted-foreground",
            identity.bio ? "text-[14.5px]" : "text-[13.5px] italic text-faint",
          )}
        >
          {identity.bio || "A little about you..."}
        </p>

        {completion.show ? (
          <p className="mono mt-3 text-[10px] uppercase tracking-[0.08em] text-faint">
            Your Bloom space is taking shape — {completion.done} of {completion.total}
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium text-[var(--primary-foreground)] transition-transform duration-300 hover:scale-[1.02]"
            style={{
              background:
                "linear-gradient(135deg, var(--profile-accent, var(--violet)), var(--sky))",
              boxShadow: "var(--profile-accent-glow)",
            }}
          >
            <Pencil className="size-3.5" aria-hidden /> Edit profile
          </button>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-5 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <Share2 className="size-3.5" aria-hidden /> Share
          </button>
        </div>
      </div>
    </section>
  );
}
