/**
 * PhotoCreditsSheet — attribution for the reference foods' photographs
 * (P3-R), in BloomSheet chrome like the add-food flow.
 *
 * Every photograph in the plan and the add-food results is a real
 * photograph from Wikimedia Commons under a free licence. CC BY and
 * CC BY-SA photographs legally require attribution; CC0 and public
 * domain ones are credited anyway, because the photographers and
 * archives deserve it and because a credit is how a reader verifies
 * that a picture is what it claims to be. Every line below is rendered
 * from the generated manifest — author and licence are Commons' own
 * metadata, never hand-typed — and each links to the Commons file page.
 */

import { X } from "lucide-react";

import { BloomSheet } from "@/components/ui/bloom-sheet";
import { Button } from "@/components/ui/button";
import { FOOD_PHOTO_CREDITS } from "@/lib/nutrition";
import { FoodPhoto } from "./FoodPhoto";

export function PhotoCreditsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <BloomSheet open={open} onClose={onClose} title="Photo credits" size="lg" className="nut-sheet">
      <div className="flex max-h-[82vh] flex-col px-5 pb-6 pt-6 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
              Nutrition
            </p>
            <h2 className="mt-2 font-display text-[length:var(--text-title)] leading-tight text-foreground">
              Photo credits
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        <p className="mt-3 max-w-[56ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
          The food photographs in Bloom are real photographs from Wikimedia Commons, each
          used under the free licence shown with it. Follow a credit to the original file
          page to see the photograph in full and check its licence.
        </p>

        <ul className="no-scrollbar mt-5 min-h-0 flex-1 divide-y divide-border-subtle overflow-y-auto pr-1">
          {FOOD_PHOTO_CREDITS.map((credit) => (
            <li key={credit.foodId} className="nut-credit">
              <FoodPhoto foodId={credit.foodId} name={credit.foodName} />
              <div className="min-w-0 flex-1">
                <p className="text-[length:var(--text-callout)] font-medium text-foreground">
                  {credit.foodName}
                </p>
                <p className="mt-0.5 text-[length:var(--text-caption)] text-muted-foreground">
                  Photo by {credit.author} · {credit.license}
                </p>
                <a
                  className="nut-inline-link text-[length:var(--text-caption)]"
                  href={credit.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Wikimedia Commons
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </BloomSheet>
  );
}
