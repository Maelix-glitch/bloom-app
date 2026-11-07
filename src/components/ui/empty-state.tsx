import * as React from "react";

import { BloomIcon } from "@/components/icons/BloomIcon";
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
 * The mark is the registry's `empty-garden` glyph (U4, plan §3): a sprout
 * over a ground arc — an empty garden, not an error.
 */

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
        {glyph ?? <BloomIcon name="empty-garden" size={28} />}
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
