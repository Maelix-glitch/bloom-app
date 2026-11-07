import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input — Bloom form field (UI update U2, plan §2.2).
 *
 * 44 px tall on the elevated surface, control radius, faint placeholder.
 * Focus is the gold system: gold border plus the 2 px gold ring (no offset —
 * a field sits on cards of several depths, so the ring hugs the field).
 * Errors speak in --danger via aria-invalid, never a stock red, and there
 * is no stock shadow-sm.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-control border border-border bg-surface-2 px-3.5 py-2 text-base transition-colors duration-[var(--motion-standard)] ease-out-expo file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-faint focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/40 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
