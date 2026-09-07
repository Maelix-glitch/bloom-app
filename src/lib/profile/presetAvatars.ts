/**
 * Default profile photographs.
 *
 * Uploading a photo is friction: you have to find one, crop it, and decide
 * whether you want your face in an app about your moods. Most people skip it
 * and end up as two grey initials forever. So Bloom ships a small set of real
 * photographs — the same photography the rest of the app is built from — that
 * can be chosen in one tap and still look considered.
 *
 * They are stored in the *same field* as an uploaded avatar (`avatarPath`),
 * distinguished by a `preset:` prefix. That keeps one code path for "what is
 * this person's picture": no second column, no migration, and an upload simply
 * overwrites the preset. `resolveAvatar()` is the only place that has to know
 * the difference — it hands back a bundled asset URL for a preset and a
 * Supabase storage URL for anything else.
 */

import bokeh from "@/assets/mood/bokeh.jpg";
import candle from "@/assets/mood/candle.jpg";
import flowerBranch from "@/assets/mood/flower-branch.jpg";
import flowerDetail from "@/assets/mood/flower-detail.jpg";
import heroWindow from "@/assets/mood/hero-window.jpg";
import mountainLake from "@/assets/mood/mountain-lake.jpg";
import leafDark from "@/assets/home/leaf-dark.jpg";
import windowDusk from "@/assets/home/window-dusk.jpg";
import sidebarBotanical from "@/assets/home/sidebar-botanical.jpg";

export const PRESET_PREFIX = "preset:";

export interface PresetAvatar {
  id: string;
  /** Shown to screen readers and under the swatch. */
  label: string;
  src: string;
  /** Rough dominant hue — lets the surrounding ring match the photo. */
  tint: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "window", label: "Morning window", src: heroWindow, tint: "#c9a88a" },
  { id: "branch", label: "Blossom branch", src: flowerBranch, tint: "#d79bb4" },
  { id: "petal", label: "Petal", src: flowerDetail, tint: "#e0a9c8" },
  { id: "candle", label: "Candlelight", src: candle, tint: "#e6b088" },
  { id: "bokeh", label: "Evening lights", src: bokeh, tint: "#a58bff" },
  { id: "lake", label: "Mountain lake", src: mountainLake, tint: "#8fb6d9" },
  { id: "leaf", label: "Dark leaf", src: leafDark, tint: "#7fb8a6" },
  { id: "dusk", label: "Dusk", src: windowDusk, tint: "#9a8fc4" },
  { id: "botanical", label: "Botanical", src: sidebarBotanical, tint: "#8fa98a" },
];

const BY_ID = new Map(PRESET_AVATARS.map((p) => [p.id, p]));

export const isPreset = (path: string | null | undefined): boolean =>
  typeof path === "string" && path.startsWith(PRESET_PREFIX);

export const presetPath = (id: string): string => `${PRESET_PREFIX}${id}`;

export function presetFor(path: string | null | undefined): PresetAvatar | null {
  if (!isPreset(path)) return null;
  return BY_ID.get((path as string).slice(PRESET_PREFIX.length)) ?? null;
}

/**
 * The URL for any avatar path. `remote` is the storage resolver — passed in
 * rather than imported so this module stays free of Supabase and testable.
 */
export function resolveAvatar(
  path: string | null | undefined,
  remote: (p: string) => string | null,
): string | null {
  if (!path) return null;
  const preset = presetFor(path);
  if (preset) return preset.src;
  /* A preset id we no longer ship: fall back to initials rather than a 404. */
  if (isPreset(path)) return null;
  return remote(path);
}
