/**
 * Default profile photographs — a curated set, not a grab-bag.
 *
 * Uploading a photo is friction: you have to find one, crop it, and decide
 * whether you want your face in an app about your moods. Most people skip it
 * and end up as two grey initials forever. So Bloom ships a small set of real
 * photographs — the same photography the rest of the app is built from — that
 * can be chosen in one tap and still look considered.
 *
 * The set is curated as ONE family (owner directive, 2026-11-15: the old
 * defaults "are random photos"): dark botanical, dusk light, gold warmth —
 * Bloom's palette, drawn only from imagery already in the repo (the mood and
 * home photography, plus the Rewards art campaign under
 * `public/rewards/art/`). Two of the original nine were cut for breaking the
 * family: `bokeh` (busy gold speckle that reads as stock party lights at
 * avatar size, and its ring tint was a violet the photo does not contain)
 * and `lake` (a blue daylight landscape, off-palette). Labels and tints are
 * checked against what each photo actually shows — `petal` is a white bloom
 * on dark leaves, not a pink petal, and is labelled and tinted so. A profile
 * still holding a retired preset id falls back to initials via
 * `resolveAvatar` — never a broken image, never a substitute face.
 *
 * They are stored in the *same field* as an uploaded avatar (`avatarPath`),
 * distinguished by a `preset:` prefix. That keeps one code path for "what is
 * this person's picture": no second column, no migration, and an upload simply
 * overwrites the preset. `resolveAvatar()` is the only place that has to know
 * the difference — it hands back a bundled asset URL for a preset and a
 * Supabase storage URL for anything else.
 */

import candle from "@/assets/mood/candle.jpg";
import flowerBranch from "@/assets/mood/flower-branch.jpg";
import flowerDetail from "@/assets/mood/flower-detail.jpg";
import heroWindow from "@/assets/mood/hero-window.jpg";
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
  { id: "leaf", label: "Dark leaf", src: leafDark, tint: "#7fb8a6" },
  { id: "botanical", label: "Fern", src: sidebarBotanical, tint: "#8fa98a" },
  { id: "petal", label: "White bloom", src: flowerDetail, tint: "#c9d4ae" },
  { id: "branch", label: "Blossom branch", src: flowerBranch, tint: "#d79bb4" },
  { id: "window", label: "Morning window", src: heroWindow, tint: "#c9a88a" },
  { id: "dusk", label: "Dusk window", src: windowDusk, tint: "#a88ca0" },
  { id: "candle", label: "Candlelight", src: candle, tint: "#e6b088" },
  /* From the Rewards art campaign (public/rewards/art) — a public path, not
     a bundled import, exactly as the rewards catalogue references it. */
  { id: "goldenhour", label: "Golden hour", src: "/rewards/art/golden-hour.jpg", tint: "#d9a05a" },
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
