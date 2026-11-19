import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Switch (UI update U2, plan §2.2): a full 44×24 hit area. The track is
 * --surface-3 at rest and gold when on; the thumb is cream at rest and the
 * dark primary-foreground on gold, travelling at --motion-standard.
 * No stock shadows.
 *
 * Visible in both states (rulebook v2 §6, registry M-67): the track
 * carries a 1px --border-strong rim at rest — against a card the bare
 * surface-3 track was nearly invisible — turning gold with the fill
 * when on, and the OFF thumb is muted-foreground, not cream: the
 * brightest element in the row must not be the off state, or off
 * reads as on.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-pill border border-border-strong transition-colors duration-[var(--motion-standard)] ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-3",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-muted-foreground ring-0 transition-transform duration-[var(--motion-standard)] ease-out-expo data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-primary-foreground data-[state=unchecked]:translate-x-[2px]",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
