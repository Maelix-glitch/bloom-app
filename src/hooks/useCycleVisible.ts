/**
 * Should this person see cycle features at all?
 *
 * Two independent switches, and the app has to respect both:
 *
 *   · **the onboarding answer** — "no, leave the cycle out". Structural: the
 *     nav entry, the Today ring, the coach's cycle topics and the profile card
 *     all disappear, because for this person they are noise, not a feature.
 *   · **the cycle mode** — "off", set from the Cycle page itself by someone who
 *     does have a cycle but has paused or stopped tracking (pregnancy,
 *     menopause, contraception, or just a break). This already hid the nav
 *     entry before onboarding existed.
 *
 * The distinction matters at the edges: mode "off" keeps the history and the
 * settings reachable, whereas the onboarding answer means the feature was never
 * theirs to begin with. So the hook returns both, and callers choose. Nothing
 * is ever deleted by either switch.
 *
 * Server render and first paint answer `true`, matching how `useCycleMode`
 * already behaves — a returning user should never watch the nav reshuffle.
 */

import { useCycleMode } from "@/hooks/useCycleMode";
import { useOnboarding } from "@/hooks/useOnboarding";

export interface CycleVisibility {
  /** Show cycle surfaces: nav, Today ring, coach topics, profile card. */
  visible: boolean;
  /** They told us the cycle isn't part of their Bloom. */
  optedOut: boolean;
  /** They track a cycle, but have tracking switched off right now. */
  trackingOff: boolean;
}

export function useCycleVisible(): CycleVisibility {
  const mode = useCycleMode();
  const { cycle, hydrated } = useOnboarding();

  /* Before storage is read, assume the fuller app rather than flashing a
     stripped-down one at someone who does use the cycle. */
  const optedOut = hydrated && !cycle;
  const trackingOff = mode === "off";

  return { visible: !optedOut && !trackingOff, optedOut, trackingOff };
}
