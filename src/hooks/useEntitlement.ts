/**
 * useEntitlement — the React face of lib/billing/entitlement.
 *
 * Returns the shared entitlement state: "loading" until the first
 * read lands, then the service's state (ready with the real numbers,
 * or unavailable — signed out, unconfigured, or billing not yet
 * applied — which every surface must render without inventing
 * figures). Subscribes to the shared cache so a spend, a sign-in or
 * a plan change updates every mounted surface together.
 */

import { useEffect, useState } from "react";

import {
  fetchEntitlement,
  peekEntitlement,
  subscribeEntitlement,
  type EntitlementState,
} from "@/lib/billing/entitlement";

export type UseEntitlementState = EntitlementState | { kind: "loading" };

export function useEntitlement(): UseEntitlementState {
  const [state, setState] = useState<UseEntitlementState>(
    () => peekEntitlement() ?? { kind: "loading" },
  );

  useEffect(() => {
    const stop = subscribeEntitlement((next) => setState(next));
    void fetchEntitlement().then((next) => setState(next));
    return stop;
  }, []);

  return state;
}
