/**
 * ProfileAvatar — the identity mark used across the hero, rails, and the
 * public view. Image when present (never distorted), an atmospheric initials
 * treatment as fallback, never a broken icon.
 */

import { useState } from "react";

import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import { objectUrl } from "@/lib/profile/profileService";
import { initialsFor, type BloomAccent } from "@/lib/profile/types";

export type AvatarRing = "none" | "quiet" | "story-unseen" | "story-seen";

export function ProfileAvatar({
  name,
  avatarPath,
  accent = "violet",
  size = 96,
  ring = "none",
  className,
}: {
  name: string;
  avatarPath: string | null;
  accent?: BloomAccent;
  size?: number;
  ring?: AvatarRing;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = objectUrl(avatarPath);
  const varAccent = accentVar[accent];

  const showImage = Boolean(src) && !broken;

  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      {ring !== "none" ? (
        <span
          aria-hidden
          className="absolute -inset-[5px] rounded-full"
          style={
            ring === "story-unseen"
              ? {
                  padding: 2,
                  background: `conic-gradient(from 210deg, color-mix(in oklab, ${varAccent} 85%, transparent), color-mix(in oklab, var(--sky) 60%, transparent) 45%, color-mix(in oklab, ${varAccent} 20%, transparent) 70%, color-mix(in oklab, ${varAccent} 85%, transparent))`,
                  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }
              : ring === "story-seen"
                ? { border: `1px solid color-mix(in oklab, ${varAccent} 30%, transparent)` }
                : { border: `1px solid color-mix(in oklab, ${varAccent} 45%, transparent)` }
          }
        />
      ) : null}

      {showImage ? (
        <img
          src={src!}
          alt=""
          width={size}
          height={size}
          onError={() => setBroken(true)}
          className="size-full rounded-full object-cover"
          style={{ border: "1px solid color-mix(in oklab, var(--border-strong) 80%, transparent)" }}
        />
      ) : (
        <span
          role="img"
          aria-label={`${name}'s profile mark`}
          className="grid size-full place-items-center rounded-full"
          style={{
            background: `radial-gradient(115% 105% at 50% -5%, color-mix(in oklab, ${varAccent} 15%, var(--surface-2)), var(--surface) 62%)`,
            border: "1px solid var(--border)",
            boxShadow:
              "inset 0 1px 0 color-mix(in oklab, var(--foreground) 7%, transparent), 0 10px 30px -18px rgba(0,0,0,0.8)",
          }}
        >
          <span
            className="display select-none leading-none"
            style={{
              color: `color-mix(in oklab, ${varAccent} 72%, var(--foreground))`,
              fontSize: size * 0.4,
              letterSpacing: "-0.03em",
            }}
          >
            {initialsFor(name)}
          </span>
        </span>
      )}
    </span>
  );
}
