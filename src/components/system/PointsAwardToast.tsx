/**
 * The one "you earned this" confirmation.
 *
 * Every earning path (a habit tick, a verified goal, a milestone) records an
 * idempotent point event and the ledger announces it. This listens once at the
 * root, so the amount is visible wherever the earning happened — and only
 * once, because the ledger refuses a duplicate event before it announces.
 *
 * On the Journey page the claim float already owns the moment, so the toast
 * stays out of its way.
 */

import { useEffect } from "react";
import { toast } from "sonner";

import { POINTS_EARNED } from "@/lib/points/ledger";

export function PointsAwardToast() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onEarned = (event: Event) => {
      const detail = (event as CustomEvent<{ points?: unknown; label?: unknown }>).detail;
      const points = typeof detail?.points === "number" ? detail.points : 0;
      if (points <= 0) return;
      if (window.location.pathname.startsWith("/rewards")) return;
      toast(`+${points} Bloom Points`, {
        description: typeof detail?.label === "string" && detail.label ? detail.label : undefined,
        duration: 2600,
      });
    };
    window.addEventListener(POINTS_EARNED, onEarned);
    return () => window.removeEventListener(POINTS_EARNED, onEarned);
  }, []);
  return null;
}
