/**
 * ProfileShareSheet — the Bloom-native way to share a profile.
 *
 * Before: the hero icon and the Settings row called `navigator.share` or
 * `clipboard.writeText` directly. That meant the actual sharing moment was a
 * system sheet (or a silent copy) with no Bloom chrome, no preview of what
 * a visitor sees, and no place to explain privacy. Milestones and rewards
 * already share through a Bloom-designed card; the profile should feel the
 * same — intentional, quiet, and on-brand.
 *
 * After: one sheet, opened from both entry points. Avatar, name, handle,
 * privacy note, link field, and two actions (Copy + system share). It uses
 * BloomSheet so phone/desktop, motion, and a11y match every other premium
 * dialog in the profile.
 */

import { useCallback, useMemo, useState } from "react";
import { Check, Copy, Eye, Link2, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { BloomSheet, SheetBody, SheetItem } from "@/components/ui/bloom-sheet";
import { accentVar } from "@/components/mood/primitives";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import type { ProfileIdentity, ProfilePrivacy } from "@/lib/profile/types";

export function ProfileShareSheet({
  open,
  onClose,
  identity,
  privacy,
  onPreview,
  onEditUsername,
}: {
  open: boolean;
  onClose: () => void;
  identity: ProfileIdentity | null;
  privacy: ProfilePrivacy | null;
  onPreview: () => void;
  onEditUsername: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const accent = identity?.accent ?? "violet";
  const username = identity?.username ?? null;
  const displayName = identity?.displayName ?? "Your Bloom";
  const bio = identity?.bio ?? null;

  const url = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (!username) return null;
    return `${window.location.origin}/@${username}`;
  }, [username]);

  const isPublic = privacy?.profileVisibility === "public";
  const canShareSystem = typeof navigator !== "undefined" && !!navigator.share;

  const handleCopy = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Profile link copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Couldn't copy automatically — here's your link", {
        description: url,
        duration: 6000,
      });
    }
  }, [url]);

  const handleSystemShare = useCallback(async () => {
    if (!url) return;
    if (!canShareSystem) {
      await handleCopy();
      return;
    }
    setSharing(true);
    try {
      await navigator.share({
        title: `${displayName} on Bloom`,
        text: bio ? bio.slice(0, 120) : `A space in Bloom — @${username}`,
        url,
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        (error as { name: string }).name === "AbortError"
      ) {
        // user dismissed — quiet
      } else {
        // fallback to copy
        await handleCopy();
      }
    } finally {
      setSharing(false);
    }
  }, [url, canShareSystem, displayName, bio, username, handleCopy]);

  const needsUsername = !username;

  return (
    <BloomSheet open={open} onClose={onClose} title="Share profile" size="md">
      {/* the family's visible way out (popup-premium slice) — this sheet
          relied on Escape / backdrop alone */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="bsheet-icon absolute right-4 top-4 z-10 sm:right-5"
      >
        <BloomIcon name="close" size={16} />
      </button>
      <SheetBody className="pb-6">
        {/* eyebrow + title */}
        <SheetItem className="px-5 pr-14 pt-1 sm:px-6 sm:pr-16">
          <p className="mono flex items-center gap-1.5 text-[length:var(--text-micro)] uppercase tracking-[var(--tracking-caps)] text-faint-strong">
            <Sparkles className="size-3" aria-hidden />
            Share your space
          </p>
          <h2 className="display mt-2 text-[length:var(--text-title)] leading-tight tracking-tight">
            {needsUsername ? "Pick a name for your space" : "Your profile link"}
          </h2>
          <p className="mt-1.5 text-[length:var(--text-support)] leading-relaxed text-muted-foreground">
            {needsUsername
              ? "A @username becomes the address of your Bloom. Choose one to make your profile shareable."
              : isPublic
                ? "Anyone with your link sees what you've chosen to share — name, bio, public moments."
                : "Your profile is private right now. Visitors will see a quiet note until you make it public."}
          </p>
        </SheetItem>

        {/* preview card — same accent language as the rest of profile */}
        <SheetItem className="px-5 pt-5 sm:px-6">
          <div
            className="relative overflow-hidden rounded-dialog border px-5 py-5"
            style={{
              borderColor: `color-mix(in oklab, ${accentVar[accent]} 24%, var(--border))`,
              background: `radial-gradient(120% 90% at 50% -20%, color-mix(in oklab, ${accentVar[accent]} 14%, var(--surface-2)), var(--surface) 62%)`,
            }}
          >
            {/* subtle top highlight like pf-cover */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, color-mix(in oklab, ${accentVar[accent]} 28%, transparent) 50%, transparent)`,
              }}
            />
            <div className="flex items-center gap-3.5">
              <ProfileAvatar
                name={displayName}
                avatarPath={identity?.avatarPath ?? null}
                accent={accent}
                size={52}
              />
              <div className="min-w-0 flex-1">
                <p className="display truncate text-[length:var(--text-section)] leading-tight">{displayName}</p>
                {username ? (
                  <p className="mono mt-0.5 truncate text-[length:var(--text-caption)] text-faint">@{username}</p>
                ) : (
                  <p className="mono mt-0.5 text-[length:var(--text-caption)] text-amber">no @username yet</p>
                )}
                {bio ? (
                  <p className="mt-2 line-clamp-2 max-w-[32ch] text-[length:var(--text-caption)] leading-snug text-muted-foreground">
                    {bio}
                  </p>
                ) : null}
              </div>
              <span
                className="mono hidden shrink-0 rounded-full border px-2.5 py-1 text-[length:var(--text-micro)] uppercase tracking-[var(--tracking-meta)] sm:inline-flex"
                style={{
                  borderColor: isPublic
                    ? "color-mix(in oklab, var(--sage) 30%, transparent)"
                    : "color-mix(in oklab, var(--amber) 30%, transparent)",
                  color: isPublic ? "var(--sage)" : "var(--amber)",
                  background: isPublic
                    ? "color-mix(in oklab, var(--sage) 10%, transparent)"
                    : "color-mix(in oklab, var(--amber) 10%, transparent)",
                }}
              >
                {isPublic ? "Public" : "Private"}
              </span>
            </div>

            {/* link field — the one piece that must be scannable */}
            {url ? (
              <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 backdrop-blur">
                <Link2 className="size-3.5 shrink-0 text-faint" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-mono text-[length:var(--text-caption)] text-muted-foreground">
                  {url.replace(/^https?:\/\//, "")}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  aria-label="Copy profile link"
                  className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {copied ? (
                    <Check className="size-3.5 text-sage" aria-hidden />
                  ) : (
                    <Copy className="size-3.5" aria-hidden />
                  )}
                </button>
              </div>
            ) : null}
          </div>
        </SheetItem>

        {/* actions — now synced, same sheet from both entry points */}
        <SheetItem className="px-5 pt-4 sm:px-6">
          {needsUsername ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditUsername();
                }}
                className="bsheet-primary h-11 w-full justify-center text-[length:var(--text-callout)]"
              >
                Choose your @username
              </button>
              <p className="text-center text-[length:var(--text-meta)] text-faint-strong">
                You can change it later — old links stop working.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface-2 px-4 text-[length:var(--text-support)] font-medium transition-colors hover:border-border-strong hover:text-foreground"
                >
                  {copied ? (
                    <Check className="size-4 text-sage" aria-hidden />
                  ) : (
                    <Copy className="size-4" aria-hidden />
                  )}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSystemShare()}
                  disabled={sharing}
                  className="bsheet-primary h-11 justify-center text-[length:var(--text-support)] disabled:opacity-60"
                >
                  <Share2 className="size-4" aria-hidden />
                  {canShareSystem ? "Share…" : "Share"}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    // small delay so sheet exit finishes before preview opens
                    window.setTimeout(() => onPreview(), 220);
                  }}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-border px-4 text-[length:var(--text-caption)] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Eye className="size-3.5" aria-hidden />
                  Preview as others see it
                </button>
              </div>
              <p className="text-center text-[length:var(--text-meta)] leading-relaxed text-faint-strong">
                Link opens at <span className="text-muted-foreground">/{username ? `@${username}` : ""}</span> ·{" "}
                {isPublic ? "visible to anyone with the link" : "shows a private note until you make it public"}
              </p>
            </div>
          )}
        </SheetItem>
      </SheetBody>
    </BloomSheet>
  );
}
