/**
 * ProfileAvatar — the identity mark used across the hero, rails, and the
 * public view. Image when present (never distorted), an atmospheric initials
 * treatment as fallback, never a broken icon.
 */

import { useEffect, useState, type CSSProperties } from "react";

import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import { objectUrl } from "@/lib/profile/profileService";
import { resolveAvatar } from "@/lib/profile/presetAvatars";
import { initialsFor, type BloomAccent } from "@/lib/profile/types";
import { PREFS_CHANGED } from "@/lib/prefs";

export type AvatarRing = "none" | "quiet" | "story-unseen" | "story-seen";

/**
 * Reward profile frames — equipped frames from the Rewards ecosystem ring the
 * profile mark everywhere ProfileAvatar renders (rail, profile hero, story
 * rows). Frames defer to story rings when one is active.
 */
const FRAME_RINGS: Record<string, CSSProperties> = {
  "fr-crescent": {
    border: `1px solid color-mix(in oklab, var(--violet) 65%, transparent)`,
    boxShadow: `inset 0 0 0 1px color-mix(in oklab, var(--violet) 22%, transparent)`,
  },
  "fr-laurel": {
    border: `1px solid color-mix(in oklab, var(--sage) 78%, transparent)`,
    boxShadow: `0 0 0 3px color-mix(in oklab, var(--sage) 12%, transparent)`,
  },
  "fr-gold-line": {
    border: `1.5px solid color-mix(in oklab, var(--gold) 85%, transparent)`,
  },
  "fr-soft-bloom": {
    border: `1px solid color-mix(in oklab, var(--rose) 70%, transparent)`,
    boxShadow: `0 0 0 3px color-mix(in oklab, var(--rose) 14%, transparent)`,
  },
  "fr-halo": {
    border: `1px solid color-mix(in oklab, var(--sky) 45%, transparent)`,
    boxShadow: `0 0 0 1px color-mix(in oklab, var(--sky) 20%, transparent), 0 0 18px color-mix(in oklab, var(--sky) 22%, transparent)`,
  },
};

export function ProfileAvatar({
  name,
  avatarPath,
  accent = "violet",
  size = 96,
  ring = "none",
  className,
  overrideFrame = null,
}: {
  name: string;
  avatarPath: string | null;
  accent?: BloomAccent;
  size?: number;
  ring?: AvatarRing;
  className?: string;
  /** Force a frame id (studio previews); default: the equipped frame. */
  overrideFrame?: string | null;
}) {
  const [broken, setBroken] = useState(false);
  const [frameId, setFrameId] = useState<string | null>(null);

  useEffect(() => {
    if (overrideFrame !== null) return;
    const sync = () => {
      const el = typeof document !== "undefined" ? document.documentElement : null;
      setFrameId(el?.getAttribute("data-bloom-frame") ?? null);
    };
    sync();
    window.addEventListener("bloom:skin-changed", sync);
    window.addEventListener(PREFS_CHANGED, sync);
    return () => {
      window.removeEventListener("bloom:skin-changed", sync);
      window.removeEventListener(PREFS_CHANGED, sync);
    };
  }, [overrideFrame]);

  /* Handles both a `preset:` photo shipped with the app and an upload. */
  const src = resolveAvatar(avatarPath, objectUrl);
  const varAccent = accentVar[accent];

  const showImage = Boolean(src) && !broken;
  const activeFrame = overrideFrame !== null ? overrideFrame : frameId;
  const frameStyle = ring === "none" && activeFrame ? FRAME_RINGS[activeFrame] : null;

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
      {frameStyle ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-[6px] rounded-full"
          style={frameStyle}
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
