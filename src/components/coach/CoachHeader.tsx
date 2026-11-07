import { useEffect, useState } from "react";
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
  /* The quick-switch chord is ⌘K on a Mac and Ctrl K everywhere else. The
     button used to render ⌘K while its accessible name said "Ctrl K" — one
     of the two was always wrong. Until the platform is known (server /
     first paint) the kbd shows a neutral "K"; the effect resolves it in the
     same tick as hydration, before it can be read as either. */
  const [mac, setMac] = useState<boolean | null>(null);
  useEffect(() => {
    setMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent));
  }, []);
  const hint = mac === null ? "K" : mac ? "⌘K" : "Ctrl K";
  const hintName = mac === null ? "Command or Control K" : mac ? "Command K" : "Ctrl K";

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
          aria-label={`Quick switch (${hintName})`}
          title="Quick switch"
        >
          {mac ? <Command className="size-3.5" aria-hidden="true" /> : null}
          <kbd>{hint}</kbd>
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
