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
 *
 * The card itself is bespoke — a gold disc with the points sparkle (the
 * same glyph the PointsChip wallet carries) beside the amount and the
 * habit's name — but it wears TOAST_SHELL_STYLE, the one shell every
 * toast in the app wears, so it reads as family, not as a one-off.
 */

import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { TOAST_SHELL_STYLE } from "@/components/system/toastShell";
import { POINTS_EARNED } from "@/lib/points/ledger";

export function PointsAwardToast() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onEarned = (event: Event) => {
      const detail = (event as CustomEvent<{ points?: unknown; label?: unknown }>).detail;
      const points = typeof detail?.points === "number" ? detail.points : 0;
      if (points <= 0) return;
      if (window.location.pathname.startsWith("/rewards")) return;
      const label = typeof detail?.label === "string" && detail.label ? detail.label : undefined;
      toast.custom(
        () => (
          <div style={TOAST_SHELL_STYLE} className="flex items-center gap-3 px-4 py-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary"
            >
              <Sparkles className="size-[18px]" strokeWidth={1.8} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[length:var(--text-callout)] font-semibold leading-snug text-foreground">
                +{points} Bloom Points
              </span>
              {label ? (
                <span className="text-[length:var(--text-support)] leading-snug text-muted-foreground">
                  {label}
                </span>
              ) : null}
            </span>
          </div>
        ),
        {
          duration: 2600,
          // Sonner paints the global toastOptions shell on the wrapper
          // element too; the card above already wears it, so the wrapper
          // is stripped back to nothing rather than double-painting it.
          style: {
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
          },
        },
      );
    };
    window.addEventListener(POINTS_EARNED, onEarned);
    return () => window.removeEventListener(POINTS_EARNED, onEarned);
  }, []);
  return null;
}
