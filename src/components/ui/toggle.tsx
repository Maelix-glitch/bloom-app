import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Toggle (UI update U2, plan §2.2): sized on the button scale (44 px row),
 * control radius, and the tabs' on-state language — gold-deep ground, gold
 * text — so a pressed toggle and an active tab read as the same gesture.
 */
const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-control text-sm font-medium cursor-pointer transition-colors duration-[var(--motion-standard)] ease-out-expo hover:bg-surface-3 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=on]:bg-gold-deep data-[state=on]:text-gold [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-border-strong bg-transparent hover:bg-surface-3 hover:text-foreground",
      },
      size: {
        default: "h-11 px-3 min-w-11",
        sm: "h-9 px-2 min-w-9",
        lg: "h-12 px-3.5 min-w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
