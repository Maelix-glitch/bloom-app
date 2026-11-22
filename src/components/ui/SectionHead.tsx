/**
 * SectionHead — the one section head (Final Audit F-17, M-204).
 *
 * Anatomy: an optional kicker (the house `eyebrow`), a real heading
 * element in the Fraunces serif at the 24px step, an optional subline,
 * and an optional right-hand slot. The treatment is the one Nutrition's
 * section system pinned first (`.section-head` in nutrition.css,
 * sectionSystem.guard); the same rules now also live in the global
 * sheet so every screen can carry them.
 *
 * Surfaces adopt it in place of their bespoke heads: Mood's two local
 * SectionHeads delegate here, Today's band heads render through it,
 * Nutrition's hand-written `.section-head` markup is this component's
 * exact output, and Trackers uses the `atlas` variant — the atlas head
 * is a ruled sans label by design (M-128), so the variant renders only
 * the heading element with the atlas look: the draft's one hard
 * requirement there is that it be a real heading, not a <p>.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionHead({
  kicker,
  title,
  subline,
  right,
  icon,
  titleId,
  level = 2,
  variant,
  className,
  titleClassName,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  subline?: ReactNode;
  right?: ReactNode;
  /** A glyph seated left of the title stack (Mood's panel heads). */
  icon?: ReactNode;
  titleId?: string;
  level?: 2 | 3;
  /** "atlas" — Trackers' ruled label head, as a real heading element. */
  variant?: "atlas";
  className?: string;
  titleClassName?: string;
}) {
  const Heading = level === 3 ? "h3" : "h2";

  if (variant === "atlas") {
    return (
      <Heading id={titleId} className={cn("at-sectionhead", titleClassName)}>
        {title}
      </Heading>
    );
  }

  const main = (
    <div className="section-head__main">
      {kicker ? <div className="eyebrow">{kicker}</div> : null}
      <Heading
        id={titleId}
        className={cn("section-head__title", kicker ? "mt-1.5" : undefined, titleClassName)}
      >
        {title}
      </Heading>
      {subline ? <p className="section-head__sub">{subline}</p> : null}
    </div>
  );

  return (
    <div className={cn("section-head", className)}>
      {icon ? (
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="mt-1 shrink-0 text-gold" aria-hidden>
            {icon}
          </span>
          {main}
        </div>
      ) : (
        main
      )}
      {right}
    </div>
  );
}
