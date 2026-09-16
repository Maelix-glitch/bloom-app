/**
 * Bloom Rewards — customization skin.
 *
 * Equipping a reward writes nothing into every page's markup. Instead the
 * equipped profile is published as data attributes on <html>:
 *
 *   data-bloom-theme="th-velvet-night"
 *   data-bloom-palette="pl-lavender-mist"
 *   data-bloom-wallpaper="wp-moonlit-garden"
 *   data-bloom-frame="fr-crescent"
 *   data-bloom-effect="fx-petals"
 *   data-bloom-preview="set-deep-rest"   (non-destructive preview)
 *
 * The actual restyle lives in one CSS block (src/styles.css), so any Bloom
 * page that uses the shared tokens changes automatically — the theme really
 * does apply across the app. JS here only keeps the attributes honest with
 * the catalog (unknown ids are never published) and manages preview vs.
 * equipped state.
 */

import { componentsById } from "./catalog";
import type { EquippedProfile } from "./types";

export const SKIN_CHANGED = "bloom:skin-changed";

export interface ActiveSkin {
  themeId?: string;
  paletteId?: string;
  wallpaperId?: string;
  profileFrameId?: string;
  effectId?: string;
}

/** Validate a profile against the catalog and keep only real components. */
export function sanitizeProfile(profile: EquippedProfile): ActiveSkin {
  const out: ActiveSkin = {};
  const map: Record<keyof ActiveSkin, string | undefined> = {
    themeId: profile.themeId,
    paletteId: profile.paletteId,
    wallpaperId: profile.wallpaperId,
    profileFrameId: profile.profileFrameId,
    effectId: profile.effectId,
  };
  const expectedKind: Record<keyof ActiveSkin, string> = {
    themeId: "theme",
    paletteId: "palette",
    wallpaperId: "wallpaper",
    profileFrameId: "profileFrame",
    effectId: "effect",
  };
  for (const slot of Object.keys(expectedKind) as (keyof ActiveSkin)[]) {
    const id = map[slot];
    if (!id) continue;
    const comp = componentsById.get(id);
    if (comp && comp.kind === expectedKind[slot]) {
      out[slot] = id;
    }
  }
  return out;
}

const SKIN_ATTRS: Record<keyof ActiveSkin, string> = {
  themeId: "data-bloom-theme",
  paletteId: "data-bloom-palette",
  wallpaperId: "data-bloom-wallpaper",
  profileFrameId: "data-bloom-frame",
  effectId: "data-bloom-effect",
};

function setAttr(name: string, value: string | null): void {
  const el = typeof document !== "undefined" ? document.documentElement : null;
  if (!el) return;
  if (value) el.setAttribute(name, value);
  else el.removeAttribute(name);
}

/** Publish a skin (equipped or preview) to <html>. */
export function applySkin(skin: ActiveSkin, previewOfId?: string | null): void {
  for (const slot of Object.keys(SKIN_ATTRS) as (keyof ActiveSkin)[]) {
    setAttr(SKIN_ATTRS[slot], skin[slot] ?? null);
  }
  setAttr("data-bloom-preview", previewOfId ?? null);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SKIN_CHANGED));
  }
}

/** Remove every skin attribute (Bloom Default). */
export function clearSkin(): void {
  applySkin({}, null);
}

export function readSkinFromDom(): ActiveSkin {
  const el = typeof document !== "undefined" ? document.documentElement : null;
  if (!el) return {};
  const out: ActiveSkin = {};
  const read = (slot: keyof ActiveSkin, attr: string) => {
    const v = el.getAttribute(attr);
    if (v) (out as Record<string, string>)[slot] = v;
  };
  read("themeId", SKIN_ATTRS.themeId);
  read("paletteId", SKIN_ATTRS.paletteId);
  read("wallpaperId", SKIN_ATTRS.wallpaperId);
  read("profileFrameId", SKIN_ATTRS.profileFrameId);
  read("effectId", SKIN_ATTRS.effectId);
  return out;
}

/** Current preview target (offer id), or null. */
export function readPreviewFromDom(): string | null {
  const el = typeof document !== "undefined" ? document.documentElement : null;
  return el?.getAttribute("data-bloom-preview") ?? null;
}

/** The artwork a wallpaper uses (its real asset). */
export function wallpaperArt(wallpaperId: string): string | null {
  return componentsById.get(wallpaperId)?.art ?? null;
}
