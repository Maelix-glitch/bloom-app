/**
 * The visual shell every toast wears: solid surface, hairline border,
 * the top highlight inset over a deep, soft drop shadow. Solid, never
 * frosted — a toast is an overlay panel, and overlay panels are opaque
 * (bleed-through fix, 2026-11-18; pinned by the sheet guard).
 *
 * Shared by the styled toasts (through BloomToaster's toastOptions) and
 * bespoke toast cards (the points award), so every toast looks like
 * family. Geometry that sonner owns (width, the title/description type)
 * lives in the toast block in styles.css; padding lives with each
 * surface, since the styled toast and a bespoke card pad differently.
 */

import type { CSSProperties } from "react";

export const TOAST_SHELL_STYLE: CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid color-mix(in oklab, var(--foreground) 12%, transparent)",
  color: "var(--foreground)",
  borderRadius: "24px",
  boxShadow:
    "inset 0 1px 0 0 color-mix(in oklab, var(--foreground) 10%, transparent), 0 24px 56px -12px rgba(0, 0, 0, 0.6), 0 8px 24px -8px rgba(0, 0, 0, 0.5)",
};
