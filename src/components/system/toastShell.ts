/**
 * The visual shell every toast wears: frosted surface, hairline border,
 * the frosted-glass top highlight inset over a deep, soft drop shadow.
 *
 * Shared by the styled toasts (through BloomToaster's toastOptions) and
 * bespoke toast cards (the points award), so every toast looks like
 * family. Geometry that sonner owns (width, the title/description type)
 * lives in the toast block in styles.css; padding lives with each
 * surface, since the styled toast and a bespoke card pad differently.
 */

import type { CSSProperties } from "react";

export const TOAST_SHELL_STYLE: CSSProperties = {
  background: "color-mix(in oklab, var(--surface-2) 78%, transparent)",
  border: "1px solid color-mix(in oklab, var(--foreground) 12%, transparent)",
  color: "var(--foreground)",
  borderRadius: "24px",
  boxShadow:
    "inset 0 1px 0 0 color-mix(in oklab, var(--foreground) 10%, transparent), 0 24px 56px -12px rgba(0, 0, 0, 0.6), 0 8px 24px -8px rgba(0, 0, 0, 0.5)",
  backdropFilter: "blur(20px) saturate(1.4)",
  WebkitBackdropFilter: "blur(20px) saturate(1.4)",
};
