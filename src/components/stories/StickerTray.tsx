/**
 * StickerTray — GIPHY stickers as a fast bottom sheet.
 * Search + trending from GIPHY only. No local pack, no substitute catalog.
 */

import { CatalogSearchTray } from "./MediaTrays";
import { stickerProvider, type StickerAsset } from "@/lib/stories/providers";

const STICKER_CHIPS = ["Love", "Calm", "Celebrate", "Sleepy", "Coffee", "Sparkle", "Fire", "Party"];

export function StickerTray({
  onPick,
  onClose,
}: {
  onPick: (sticker: StickerAsset) => void;
  onClose: () => void;
}) {
  return (
    <CatalogSearchTray
      title="Stickers"
      subtitle="From GIPHY, for your moments."
      placeholder="Search stickers…"
      searchLabel="Search stickers"
      addLabel={(name) => `Add sticker: ${name}`}
      chips={STICKER_CHIPS}
      provider={stickerProvider}
      fit="contain"
      unconfigured="Sticker catalog isn't connected."
      onPick={onPick}
      onClose={onClose}
    />
  );
}
