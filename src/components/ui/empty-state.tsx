import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * EmptyState (UI update U2, plan §5.5) — the one branded empty state.
 *
 * Screens used to each invent their own "nothing here yet" block; §5.5
 * settles the pattern: the botanical mark in a quiet ring, a Fraunces
 * headline, one supporting line, and a single gold action slot. Callers
 * pass the action (normally the kit Button, default variant) — there is
 * deliberately room for exactly one, so an empty screen stays calm and
 * points at the next meaningful thing to do.
 *
 * The mark is hand-drawn to the §3.2 glyph spec (24 grid, 1.6 stroke,
 * round caps, currentColor): a sprout over a ground arc — an empty garden,
 * not an error. When U4's bespoke icon registry lands, its `empty-garden`
 * glyph can replace this inline mark without an API change.
 */
function EmptyGardenMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 20.5c-.2-4.5.2-9 1.5-12.7" />
      <path d="M12.4 10.6c-2.9.3-5.6-1.3-6.6-5 3.6.1 6.2 1.8 6.6 5Z" />
      <path d="M13.4 8.1c.3-3.1 2.3-5.2 5.6-5.6-.2 3.4-2.3 5.4-5.6 5.6Z" />
      <path d="M4.5 20.9c2.5.7 5 1.1 7.5 1.1s5-.4 7.5-1.1" />
    </svg>
  );
}

export interface EmptyStateProps {
  /** Fraunces headline — a ReactNode so callers can italicise a keyword with .display-em. */
  title: React.ReactNode;
  /** One supporting line, set in the support size at body leading. */
  description?: React.ReactNode;
  /** The one gold action — normally a kit <Button>. */
  action?: React.ReactNode;
  /** Overrides the botanical mark (e.g. a U4 registry glyph). */
  glyph?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, glyph, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div
        aria-hidden
        className="flex h-16 w-16 items-center justify-center rounded-full border border-border-subtle bg-surface-2 text-gold"
      >
        {glyph ?? <EmptyGardenMark className="h-7 w-7" />}
      </div>
      <h3 className="mt-5 font-display text-[22px] font-medium leading-tight text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="mt-2 max-w-[42ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
