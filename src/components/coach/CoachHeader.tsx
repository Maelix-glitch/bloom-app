import { Command, Menu } from "lucide-react";

import { CoachGlyph } from "./bloom-mark";
import { cn } from "@/lib/utils";

/**
 * The workspace header — identity on the left, the personal-context indicator
 * on the right. Deliberately slim: the conversation owns the page.
 */
export function CoachHeader({
  ready,
  contextLabel,
  contextLive,
  onOpenContext,
  onOpenNav,
  onOpenPalette,
}: {
  ready: boolean;
  contextLabel: string;
  contextLive: boolean;
  onOpenContext: () => void;
  onOpenNav: () => void;
  onOpenPalette: () => void;
}) {
  return (
    <header className="coach-header">
      <div className="coach-header-left">
        <button
          type="button"
          className="coach-header-menu coach-mobile-only"
          onClick={onOpenNav}
          aria-label="Open conversation list"
          aria-haspopup="dialog"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <CoachGlyph size={24} className="coach-header-glyph" />
        <div className="coach-header-identity">
          <h1 className="coach-header-title">
            Bloom Coach
            <span className={cn("coach-ready-dot", ready && "is-busy")} aria-hidden="true" />
            <span className="coach-ready-text sr-only">{ready ? "Responding" : "Ready"}</span>
          </h1>
          <p className="coach-header-subtitle">Your personal wellbeing companion</p>
        </div>
      </div>
      <div className="coach-header-right">
        <button
          type="button"
          className="coach-palette-btn coach-desktop-only"
          onClick={onOpenPalette}
          aria-label="Quick switch (Ctrl K)"
          title="Quick switch"
        >
          <Command className="size-3.5" aria-hidden="true" />
          <kbd>⌘K</kbd>
        </button>
        <button
          type="button"
          className={cn("coach-context-chip coach-header-context", !contextLive && "is-quiet")}
          onClick={onOpenContext}
          aria-haspopup="dialog"
          aria-expanded={false}
        >
          <span className="coach-context-dot" aria-hidden="true" />
          <span>{contextLabel}</span>
        </button>
      </div>
    </header>
  );
}
