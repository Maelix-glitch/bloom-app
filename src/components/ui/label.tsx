"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Label (UI update U2, plan §2.2): the field label is --text-support in
 * Inter 500; the `caps` variant is the small-caps metadata treatment the
 * hero uses for form section labels (--text-meta, --tracking-meta, the
 * secondary text colour).
 */
const labelVariants = cva("font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70", {
  variants: {
    variant: {
      default: "text-[length:var(--text-support)] leading-snug text-foreground",
      caps: "text-[length:var(--text-meta)] uppercase tracking-[var(--tracking-meta)] text-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, variant, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants({ variant }), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label, labelVariants };
