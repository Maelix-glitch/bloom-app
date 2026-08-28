/**
 * Profile section rhythm — one quiet head style used by every layer below
 * the hero. Sentence-case serif titles (no uppercase noise), tight margins,
 * and a consistent gap scale so the page never drifts into dead zones.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ProfileSection({
  label,
  title,
  sub,
  right,
  gap = "default",
  children,
}: {
  label?: string;
  title?: string;
  sub?: string;
  right?: ReactNode;
  gap?: "default" | "wide" | "tight";
  children?: ReactNode;
}) {
  return (
    <section
      aria-label={title ?? label}
      className={cn(gap === "tight" ? "mt-9" : gap === "wide" ? "mt-13" : "mt-11")}
    >
      {title || right ? (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            {label ? (
              <p className="mono mb-1 text-[10px] lowercase tracking-[0.06em] text-faint">
                {label}
              </p>
            ) : null}
            <h2 className="display text-[20px] leading-tight sm:text-[22px]">{title}</h2>
            {sub ? (
              <p className="mt-1 max-w-[54ch] text-[12.5px] leading-relaxed text-muted-foreground">
                {sub}
              </p>
            ) : null}
          </div>
          {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
