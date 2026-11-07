import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge (UI update U2, plan §2.2): a pill on a token ground at the meta
 * text size — no stock shadow, no stock ring. The default badge is a quiet
 * --surface-3 chip; `gold` is the one accent badge (points, rank).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-[length:var(--text-meta)] font-medium transition-colors duration-[var(--motion-standard)] ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: "border-border-subtle bg-surface-3 text-foreground",
        secondary: "border-border-subtle bg-surface-2 text-muted-foreground",
        gold: "border-transparent bg-gold-deep text-gold",
        destructive: "border-danger/30 bg-danger/10 text-rose-bright",
        outline: "border-border-strong bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
