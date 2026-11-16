/**
 * FoodPhoto — the reference food's real photograph, as a small square
 * thumbnail (P3-R). Renders nothing at all when the food has no
 * photograph — a photo-less reference food and every own/custom food
 * keep exactly the row they had before photos existed, with no empty
 * box and no broken-image chrome. The box is a fixed 48px square (see
 * .nut-food-thumb), so a photograph that is still loading never moves
 * the row.
 *
 * The thumbnail is a button: tapping it opens the photograph full-size
 * in a lightbox with the food's name and its credit (photographer and
 * licence, read from the same manifest as the credits sheet — never
 * hand-typed). The alt text is the food's name: the photograph
 * genuinely depicts that food — every pin in the manifest was reviewed
 * against the food it illustrates — so naming it is accurate, not
 * decorative.
 */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { foodPhotoFor, type FoodPhoto as FoodPhotoCredit } from "@/lib/nutrition";

export function FoodPhoto({ foodId, name }: { foodId: string; name: string }) {
  const photo = foodPhotoFor(foodId);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (!photo) return null;
  return (
    <>
      <button
        type="button"
        className="nut-food-thumb-btn"
        onClick={() => setOpen(true)}
        aria-label={`View photo of ${name}`}
      >
        <img
          className="nut-food-thumb"
          src={photo.src}
          alt={name}
          width={48}
          height={48}
          loading="lazy"
          decoding="async"
        />
      </button>
      {open ? <FoodPhotoLightbox photo={photo} name={name} onClose={close} /> : null}
    </>
  );
}

/**
 * The full view: the photograph large, its food's name, and the credit
 * line. Closes on the backdrop, the close button, and Escape. The key
 * listener runs in the capture phase and stops the event: a photo can
 * be opened from inside the add-food sheet or the credits sheet, and
 * Escape must close the photograph, not the sheet underneath it.
 *
 * The lightbox is portaled to the document body. Rendered inline, it
 * would inherit its host's geometry: inside a BloomSheet (the credits
 * sheet) the sheet panel is a containing block for fixed descendants,
 * so the "full-screen" backdrop resolved against the sheet's own box,
 * inside its scrollable list, at a layer the sheet's 2000/2001
 * stacking context owns — the photograph opened where the user
 * couldn't see it. At the body, the backdrop covers the viewport and
 * .nut-lightbox-backdrop's z-index (2100, above the sheet's 2001)
 * paints it over every host; the portal still bubbles through this
 * component tree, so the host sheet reads taps on the photograph as
 * its own content and stays open beneath it.
 */
function FoodPhotoLightbox({
  photo,
  name,
  onClose,
}: {
  photo: FoodPhotoCredit;
  name: string;
  onClose: () => void;
}) {
  /* Scroll lock + Escape, while open — the add-food sheet's pattern. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="nut-dialog-backdrop nut-lightbox-backdrop" onClick={onClose}>
      <div
        className="nut-lightbox-panel"
        role="dialog"
        aria-modal="true"
        aria-label={name}
        onClick={(e) => e.stopPropagation()}
      >
        <img className="nut-lightbox-img" src={photo.src} alt={name} />
        <div className="nut-lightbox-meta">
          <div className="min-w-0 flex-1">
            <p className="text-[length:var(--text-callout)] font-medium text-foreground">
              {name}
            </p>
            <p className="mt-0.5 text-[length:var(--text-caption)] text-muted-foreground">
              Photo by {photo.author} · {photo.license}
            </p>
            <a
              className="nut-inline-link text-[length:var(--text-caption)]"
              href={photo.pageUrl}
              target="_blank"
              rel="noreferrer"
            >
              View on Wikimedia Commons
            </a>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
