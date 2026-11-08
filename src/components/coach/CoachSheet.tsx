import type { ReactNode } from "react";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { BloomSheet } from "@/components/ui/bloom-sheet";
import { Button } from "@/components/ui/button";

/**
 * The mobile conversation list, on the one overlay pattern (U6, plan §5.2).
 * BloomSheet owns the scrim, focus trap, escape and motion; this wrapper
 * keeps the Coach head (title + close) and hands the panel the
 * `.coach-overlay-scope` token scope, since the portal mounts outside
 * `.coach-page`. The old hand-rolled left drawer goes with the pattern —
 * on phones the list now arrives as the standard bottom sheet, on desktop
 * as the centred card.
 */
export function CoachSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <BloomSheet
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      className="coach-overlay-scope"
    >
      <div className="coach-overlay-stack">
        <div className="coach-sheet-head">
          <h2 className="coach-sheet-title">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            <BloomIcon name="close" size={16} />
          </Button>
        </div>
        {children}
      </div>
    </BloomSheet>
  );
}
