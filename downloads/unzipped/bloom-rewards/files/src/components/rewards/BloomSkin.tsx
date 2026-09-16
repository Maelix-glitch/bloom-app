/**
 * BloomSkin — applies the equipped Atelier look app-wide.
 *
 * Mounted once at the root, this subscribes to reward-store changes and
 * republishes the equipped profile as <html> data attributes (see
 * src/lib/rewards/customization.ts + the skin block in styles.css). Every
 * route that uses the shared tokens changes with the equipped theme/palette;
 * Today reads the wallpaper attribute for its ambience, and ProfileAvatar
 * reads the frame.
 *
 * Customization is the *second* layer of the journey: nothing here awards
 * points, and Bloom is fully usable with nothing equipped.
 */

import { useEffect } from "react";

import { applySkin, readPreviewFromDom, sanitizeProfile } from "@/lib/rewards/customization";
import { loadRewardsStore, subscribeRewards } from "@/lib/rewards/store";

export function BloomSkin() {
  useEffect(() => {
    const sync = () => {
      // A live preview (Atelier) owns the attributes while it is open.
      if (readPreviewFromDom()) return;
      applySkin(sanitizeProfile(loadRewardsStore().equipped));
    };
    sync();
    return subscribeRewards(sync);
  }, []);
  return null;
}
