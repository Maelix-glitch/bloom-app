/**
 * Default profile photographs — a curated set, not a grab-bag.
 *
 * Uploading a photo is friction: you have to find one, crop it, and decide
 * whether you want your face in an app about your moods. Most people skip it
 * and end up as two grey initials forever. So Bloom ships a small set of real
 * photographs that can be chosen in one tap and still look considered.
 *
 * The 2026-11-15 rework (owner: "change the profile pictures… replace them
 * with high quality") rebuilt the set as ONE family — dark botanical, dusk
 * light, gold warmth, Bloom's palette — and, just as importantly, as
 * dedicated avatar editions: every preset is a square 896px WebP derivative
 * under `src/assets/avatars/`, cropped on its subject and re-encoded for the
 * sizes an avatar is actually shown at (29–106 KB). Before this, presets
 * pointed at the full landscape originals shared with other screens — and
 * `goldenhour` at a 223 KB public original — so a 40px rail avatar decoded
 * the same pixels as a full-screen hero.
 *
 * Sources, all committed in-repo (no hotlinks, ever): six are Bloom's own
 * photography (the mood/home sets and the Rewards art campaign), re-cropped;
 * two (`fern`, `bloom`) are new photographs made for this set in the same
 * language. Two S3 ids were retired for reading as dark smudges at avatar
 * size — `botanical` (mostly black negative space, ferns only along the
 * bottom edge) and `dusk` (a wide interior scene) — and a profile still
 * holding a retired id falls back to initials via `resolveAvatar`: never a
 * broken image, never a substitute face. Labels and tints describe what
 * each photo actually shows (`branch` is a cream blossom, tinted warm
 * cream-gold — not the pink its predecessor claimed).
 *
 * They are stored in the *same field* as an uploaded avatar (`avatarPath`),
 * distinguished by a `preset:` prefix. That keeps one code path for "what is
 * this person's picture": no second column, no migration, and an upload simply
 * overwrites the preset. `resolveAvatar()` is the only place that has to know
 * the difference — it hands back a bundled asset URL for a preset and a
 * Supabase storage URL for anything else.
 */

import bloom from "@/assets/avatars/bloom.webp";
import branch from "@/assets/avatars/branch.webp";
import candle from "@/assets/avatars/candle.webp";
import fern from "@/assets/avatars/fern.webp";
import goldenhour from "@/assets/avatars/goldenhour.webp";
import leaf from "@/assets/avatars/leaf.webp";
import petal from "@/assets/avatars/petal.webp";
import windowMorning from "@/assets/avatars/window.webp";

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
  { id: "leaf", label: "Dark leaf", src: leaf, tint: "#7fb8a6" },
  { id: "fern", label: "Fern at dusk", src: fern, tint: "#8fa15f" },
  { id: "petal", label: "White bloom", src: petal, tint: "#c9d4ae" },
  { id: "branch", label: "Blossom branch", src: branch, tint: "#d9c39a" },
  { id: "window", label: "Morning window", src: windowMorning, tint: "#c9a88a" },
  { id: "candle", label: "Candlelight", src: candle, tint: "#e6b088" },
  { id: "bloom", label: "Golden bloom", src: bloom, tint: "#d99a3d" },
  { id: "goldenhour", label: "Golden hour", src: goldenhour, tint: "#d9a05a" },
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
