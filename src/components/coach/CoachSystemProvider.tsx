/**
 * CoachSystemProvider — the one Coach store for the whole app.
 *
 * `useCoachSystem` is a hook, so every component that called it used to
 * own a separate in-memory copy of the conversation store: the Coach
 * page's copy, the Today panel's copy, each correct on its own screen
 * and each blind to the other until a reload re-read localStorage. The
 * root layout mounts this provider once, so every surface — the Coach
 * tab, the Today panel, the floating orb — reads and writes the SAME
 * store instance, and a message sent anywhere is simply there,
 * everywhere, immediately.
 *
 * Surfaces that render outside the provider (unit tests, isolated
 * previews) keep working: they fall back to their own `useCoachSystem`
 * instance, exactly as before.
 */

import { createContext, useContext, type ReactNode } from "react";

import { useCoachSystem } from "@/hooks/useCoachSystem";

export type CoachSystem = ReturnType<typeof useCoachSystem>;

export const CoachSystemContext = createContext<CoachSystem | null>(null);

export function CoachSystemProvider({ children }: { children: ReactNode }) {
  const coach = useCoachSystem();
  return <CoachSystemContext.Provider value={coach}>{children}</CoachSystemContext.Provider>;
}

/** The shared store when a provider is mounted; null outside one. */
export function useCoachSystemContext(): CoachSystem | null {
  return useContext(CoachSystemContext);
}
