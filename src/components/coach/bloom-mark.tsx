import { cn } from "@/lib/utils";

import { BloomLogo } from "@/components/BloomLogo";

/**
 * Bloom's mark, as the Coach wears it — the very same tile the favicon shows,
 * so Coach no longer carries its own lavender variant of the brand. `active`
 * (thinking / awaiting) breathes via CSS on the wrapper.
 */
export function CoachGlyph({
  size = 20,
  active = false,
  className,
}: {
  size?: number;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("coach-glyph", active && "coach-glyph-active", className)}
      aria-hidden="true"
    >
      <BloomLogo size={size} />
    </span>
  );
}

/** A tiny Bloom tile — Bloom noticing something. Optional label text. */
export function NoticeGlyph({ size = 13, className }: { size?: number; className?: string }) {
  return <BloomLogo size={size} className={className} />;
}
