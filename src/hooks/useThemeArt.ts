import { useEffect, useState } from "react";

import { loadRewardsStore, subscribeRewards } from "@/lib/rewards/store";
import { themeArtFor, type ThemeArtSet } from "@/lib/rewards/themeArt";

/**
 * The equipped theme's art set (M-237), kept honest with the rewards
 * store the same way WallpaperFigure reads the equipped wallpaper:
 * sync on mount and on every store change. Returns null when no theme
 * is equipped, so callers fall back to their historic artwork.
 */
export function useThemeArt(): ThemeArtSet | null {
  const [art, setArt] = useState<ThemeArtSet | null>(null);
  useEffect(() => {
    const sync = () => setArt(themeArtFor(loadRewardsStore().equipped.themeId));
    sync();
    return subscribeRewards(sync);
  }, []);
  return art;
}
