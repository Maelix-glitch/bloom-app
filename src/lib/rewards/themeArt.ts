/**
 * Bloom Rewards — per-theme art sets (M-237).
 *
 * A theme is no longer tokens alone: every theme in the catalogue carries
 * three artworks generated for its world (owner-approved AI art for theme
 * imagery, 2026-11-24; food photography stays real and is untouched by
 * this). The slots follow the imagery mechanics in the M-237 design:
 *
 *   sidebar  — the portrait band at the foot of the rail (HomeSidebar)
 *   overview — the Today hero, when no wallpaper is explicitly equipped
 *   mood     — the Mood page hero
 *
 * Consumption precedence (design §6): an explicitly equipped wallpaper
 * still wins the Overview hero; the theme's art comes next; the historic
 * hardcoded photographs remain the fallback when no theme is equipped.
 *
 * The imports are static so Vite emits one file per artwork and the
 * browser only downloads the set the equipped theme actually renders.
 */

import velvetNightSidebar from "@/assets/themes/velvet-night/sidebar.webp";
import velvetNightOverview from "@/assets/themes/velvet-night/overview.webp";
import velvetNightMood from "@/assets/themes/velvet-night/mood.webp";
import inkSerenitySidebar from "@/assets/themes/ink-serenity/sidebar.webp";
import inkSerenityOverview from "@/assets/themes/ink-serenity/overview.webp";
import inkSerenityMood from "@/assets/themes/ink-serenity/mood.webp";
import honeyHourSidebar from "@/assets/themes/honey-hour/sidebar.webp";
import honeyHourOverview from "@/assets/themes/honey-hour/overview.webp";
import honeyHourMood from "@/assets/themes/honey-hour/mood.webp";
import mossRestSidebar from "@/assets/themes/moss-rest/sidebar.webp";
import mossRestOverview from "@/assets/themes/moss-rest/overview.webp";
import mossRestMood from "@/assets/themes/moss-rest/mood.webp";
import duskRoseSidebar from "@/assets/themes/dusk-rose/sidebar.webp";
import duskRoseOverview from "@/assets/themes/dusk-rose/overview.webp";
import duskRoseMood from "@/assets/themes/dusk-rose/mood.webp";
import midnightTideSidebar from "@/assets/themes/midnight-tide/sidebar.webp";
import midnightTideOverview from "@/assets/themes/midnight-tide/overview.webp";
import midnightTideMood from "@/assets/themes/midnight-tide/mood.webp";
import clayCourtSidebar from "@/assets/themes/clay-court/sidebar.webp";
import clayCourtOverview from "@/assets/themes/clay-court/overview.webp";
import clayCourtMood from "@/assets/themes/clay-court/mood.webp";
import brassLampSidebar from "@/assets/themes/brass-lamp/sidebar.webp";
import brassLampOverview from "@/assets/themes/brass-lamp/overview.webp";
import brassLampMood from "@/assets/themes/brass-lamp/mood.webp";
import rainLeafSidebar from "@/assets/themes/rain-leaf/sidebar.webp";
import rainLeafOverview from "@/assets/themes/rain-leaf/overview.webp";
import rainLeafMood from "@/assets/themes/rain-leaf/mood.webp";
import cedarShelfSidebar from "@/assets/themes/cedar-shelf/sidebar.webp";
import cedarShelfOverview from "@/assets/themes/cedar-shelf/overview.webp";
import cedarShelfMood from "@/assets/themes/cedar-shelf/mood.webp";
import rosewoodSidebar from "@/assets/themes/rosewood/sidebar.webp";
import rosewoodOverview from "@/assets/themes/rosewood/overview.webp";
import rosewoodMood from "@/assets/themes/rosewood/mood.webp";
import emberSidebar from "@/assets/themes/ember/sidebar.webp";
import emberOverview from "@/assets/themes/ember/overview.webp";
import emberMood from "@/assets/themes/ember/mood.webp";

export interface ThemeArtSet {
  sidebar: string;
  overview: string;
  mood: string;
}

/** Art sets keyed by theme component id. Every catalogue theme has one. */
export const THEME_ART: Record<string, ThemeArtSet> = {
  "th-velvet-night": {
    sidebar: velvetNightSidebar,
    overview: velvetNightOverview,
    mood: velvetNightMood,
  },
  "th-ink-serenity": {
    sidebar: inkSerenitySidebar,
    overview: inkSerenityOverview,
    mood: inkSerenityMood,
  },
  "th-honey-hour": {
    sidebar: honeyHourSidebar,
    overview: honeyHourOverview,
    mood: honeyHourMood,
  },
  "th-moss-rest": {
    sidebar: mossRestSidebar,
    overview: mossRestOverview,
    mood: mossRestMood,
  },
  "th-dusk-rose": {
    sidebar: duskRoseSidebar,
    overview: duskRoseOverview,
    mood: duskRoseMood,
  },
  "th-midnight-tide": {
    sidebar: midnightTideSidebar,
    overview: midnightTideOverview,
    mood: midnightTideMood,
  },
  "th-clay-court": {
    sidebar: clayCourtSidebar,
    overview: clayCourtOverview,
    mood: clayCourtMood,
  },
  "th-brass-lamp": {
    sidebar: brassLampSidebar,
    overview: brassLampOverview,
    mood: brassLampMood,
  },
  "th-rain-leaf": {
    sidebar: rainLeafSidebar,
    overview: rainLeafOverview,
    mood: rainLeafMood,
  },
  "th-cedar-shelf": {
    sidebar: cedarShelfSidebar,
    overview: cedarShelfOverview,
    mood: cedarShelfMood,
  },
  "th-rosewood": {
    sidebar: rosewoodSidebar,
    overview: rosewoodOverview,
    mood: rosewoodMood,
  },
  "th-ember": {
    sidebar: emberSidebar,
    overview: emberOverview,
    mood: emberMood,
  },
};

/** The art set for an equipped theme id, or null when none is equipped. */
export function themeArtFor(themeId: string | undefined | null): ThemeArtSet | null {
  if (!themeId) return null;
  return THEME_ART[themeId] ?? null;
}
