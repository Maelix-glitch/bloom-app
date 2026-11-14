import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button — Bloom's action language, not stock shadcn (UI update U2, plan §2.2).
 *
 * The hero pattern, codified: a gold pill for the primary action (44 px,
 * 48 px at lg), quiet token-surfaced pills for everything else, no stock
 * shadows anywhere (elevation tokens only, and buttons sit flat), press
 * feedback from the shared `.bm-press` settle, and the one focus ring —
 * 2 px of gold at 60% on a 2 px offset of canvas.
 *
 * Geometry: default h-11 (44) · sm h-9 (36) · lg h-12 (48) · icon squares
 * match their row height. Icons render at 18 px, the hero's optical size.
 */
const buttonVariants = cva(
  "bm-press inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer transition-colors duration-[var(--motion-micro)] ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-gold-soft",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border-strong bg-transparent text-foreground hover:bg-surface-3",
        secondary: "border border-border bg-secondary text-secondary-foreground hover:bg-surface-3",
        ghost: "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 rounded-pill px-5",
        sm: "h-9 rounded-pill px-4 text-[length:var(--text-support)]",
        lg: "h-12 rounded-pill px-7 text-[length:var(--text-body)]",
        icon: "h-11 w-11 rounded-pill",
        "icon-sm": "h-9 w-9 rounded-pill",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
