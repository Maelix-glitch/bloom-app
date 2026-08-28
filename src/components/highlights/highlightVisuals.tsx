/**
 * HighlightMark — the glyph inside a highlight circle (icon if the owner
 * picked one, otherwise the collection's initial). Presentation only; the
 * maps live in lib/profile/highlightMeta.
 */

import type { BloomAccent, HighlightIcon } from "@/lib/profile/types";
import { HIGHLIGHT_ICON_COMPONENTS } from "@/lib/profile/highlightMeta";

export function HighlightMark({
  icon,
  name,
  accent,
  size = 60,
}: {
  icon: HighlightIcon | null;
  name: string;
  accent: BloomAccent;
  size?: number;
}) {
  const Icon = icon ? HIGHLIGHT_ICON_COMPONENTS[icon] : null;
  void accent;
  return (
    <span className="grid place-items-center" style={{ width: size, height: size }} aria-hidden>
      {Icon ? (
        <Icon className="text-[#F6F4EC]" strokeWidth={1.7} style={{ width: size * 0.42, height: size * 0.42 }} />
      ) : (
        <span className="display leading-none text-[#F6F4EC]" style={{ fontSize: size * 0.38, letterSpacing: "-0.02em" }}>
          {name.trim().slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}
