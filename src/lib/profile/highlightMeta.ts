/**
 * Highlight presentation metadata — icon components and the accent→gradient
 * map, shared by the rail, the composer, and covers. Data only.
 */

import { Heart, Leaf, NotebookPen, Plane, Sparkles, Star, Trophy, type LucideIcon } from "lucide-react";

import type { BloomAccent, HighlightIcon } from "./types";

export const HIGHLIGHT_ICON_COMPONENTS: Record<HighlightIcon, LucideIcon> = {
  sparkle: Sparkles,
  trophy: Trophy,
  journal: NotebookPen,
  heart: Heart,
  plane: Plane,
  leaf: Leaf,
  star: Star,
};

export const HIGHLIGHT_ICON_LABELS: Record<HighlightIcon, string> = {
  sparkle: "Spark",
  trophy: "Trophy",
  journal: "Journal",
  heart: "Heart",
  plane: "Plane",
  leaf: "Leaf",
  star: "Star",
};

/** Accent → gradient pair, Bloom hues only (the app's own palette). */
export const highlightGradient: Record<BloomAccent, string> = {
  violet:
    "linear-gradient(135deg, color-mix(in oklab, var(--violet) 85%, black 15%), color-mix(in oklab, var(--rose) 55%, var(--violet)))",
  sky: "linear-gradient(135deg, color-mix(in oklab, var(--sky) 80%, black 12%), color-mix(in oklab, var(--violet) 55%, var(--sky)))",
  amber:
    "linear-gradient(135deg, color-mix(in oklab, var(--amber) 78%, black 14%), color-mix(in oklab, var(--rose) 35%, var(--amber)))",
  sage: "linear-gradient(135deg, color-mix(in oklab, var(--sage) 72%, black 12%), color-mix(in oklab, var(--sky) 45%, var(--sage)))",
  rose: "linear-gradient(135deg, color-mix(in oklab, var(--rose) 78%, black 12%), color-mix(in oklab, var(--violet) 45%, var(--rose)))",
};
