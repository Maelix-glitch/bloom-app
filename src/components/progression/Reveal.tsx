/**
 * PgReveal — the journey's scroll-reveal.
 *
 * Sections drift up out of the dark as you reach them, which is what gives the
 * page its "descending into a vault" pacing. Purely decorative: the content is
 * in the DOM from the first paint, reduced-motion shows everything instantly,
 * and the useInView fallback guarantees nothing can stay hidden.
 */

import type { CSSProperties, ReactNode } from "react";

import { useInView } from "@/components/ci/motion";

export function PgReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Milliseconds to stagger this block after its siblings. */
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`pg-reveal${className ? ` ${className}` : ""}`}
      data-visible={inView ? "true" : "false"}
      style={{ ["--pg-reveal-delay" as string]: `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
