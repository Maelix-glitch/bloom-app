/**
 * FoodPhoto — the reference food's real photograph, as a small square
 * thumbnail (P3-R). Renders nothing at all when the food has no
 * photograph — a photo-less reference food and every own/custom food
 * keep exactly the row they had before photos existed, with no empty
 * box and no broken-image chrome. The box is a fixed 48px square (see
 * .nut-food-thumb), so a photograph that is still loading never moves
 * the row.
 *
 * The alt text is the food's name: the photograph genuinely depicts
 * that food — every pin in the manifest was reviewed against the food
 * it illustrates — so naming it is accurate, not decorative.
 */

import { foodPhotoFor } from "@/lib/nutrition";

export function FoodPhoto({ foodId, name }: { foodId: string; name: string }) {
  const photo = foodPhotoFor(foodId);
  if (!photo) return null;
  return (
    <img
      className="nut-food-thumb"
      src={photo.src}
      alt={name}
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
    />
  );
}
