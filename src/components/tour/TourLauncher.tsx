/**
 * TourLauncher — entry points to start tours.
 *
 * - Floating "?" button on desktop (bottom-right, above rewards)
 * - Inline cards for each page (Today, Mood, etc) that say "Take a quick tour"
 * - Global prompt when new user arrives
 */

import { useState } from "react";
import { HelpCircle, Map, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TourId } from "@/lib/tour/types";
import { TOURS } from "./tours";
import { useTour } from "./TourContext";

export function TourFab() {
  const { isActive, startTour, showPrompt, close } = useTour();
  const [promptDismissed, setPromptDismissed] = useState(false);

  if (isActive) return null;

  return (
    <>
      {/* prompt for new users */}
      {showPrompt && !promptDismissed ? (
        <div className="tour-prompt pointer-events-auto fixed bottom-[84px] left-4 right-4 z-[2999] max-w-[360px] rounded-[18px] border bg-surface/90 p-4 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.6)] backdrop-blur-xl lg:bottom-6 lg:left-auto lg:right-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-faint">
                <Sparkles className="size-3" /> New to Bloom?
              </p>
              <h4 className="display mt-1 text-[15px] leading-tight">
                Take a 60-second tour — only what you have.
              </h4>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Small popups, arrows pointing at real buttons, dos & don'ts, and how to be
                efficient.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPromptDismissed(true)}
              className="grid size-6 place-items-center rounded-full border border-border text-faint"
            >
              <X className="size-3" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => startTour("global")}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-[12.5px] font-medium text-background"
            >
              <Map className="size-3.5" /> Start tour
            </button>
            <button
              type="button"
              onClick={() => {
                setPromptDismissed(true);
                close();
              }}
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-surface-2 px-4 text-[12.5px]"
            >
              Maybe later
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => startTour("global")}
        aria-label="Take a tour of Bloom"
        title="Take a tour"
        data-tour="tour-fab"
        className="tour-fab pointer-events-auto fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-[30] grid size-12 place-items-center rounded-full border border-border bg-surface/80 text-foreground shadow-[0_12px_24px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-transform hover:scale-[1.04] active:scale-[0.96] lg:bottom-6"
      >
        <HelpCircle className="size-5" />
      </button>
    </>
  );
}

export function TourCard({
  tourId,
  className,
  containerClassName,
}: {
  tourId: TourId;
  className?: string;
  containerClassName?: string;
}) {
  const { startTour, completed } = useTour();
  const def = TOURS[tourId];
  if (!def) return null;
  const done = Boolean(completed[tourId]);

  /* Once the tutorial is over on a section, remove it completely from the page. */
  if (done) return null;

  const card = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[18px] border bg-[color-mix(in_oklab,var(--surface)_84%,transparent)] p-4 backdrop-blur",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--violet)_24%,transparent)] to-transparent"
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-faint">
            <Map className="size-3" /> {def.steps.length} steps · {def.label}
          </p>
          <h4 className="display mt-1 text-[15px] leading-tight">{def.description}</h4>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {tourId === "home" && "Greeting, habits, map, flow — how Today works."}
            {tourId === "mood" && "Compose, timeline, insights — make mood useful."}
            {tourId === "trackers" && "Compass, ledger, goals — log honestly, once at night."}
            {tourId === "cycle" && "Calendar, predictions, phase — only period needed."}
            {tourId === "coach" && "Ask/Reflect/Plan lenses, composer, context — second mind."}
            {tourId === "profile" && "Avatar ring, share sheet, record, featured, privacy, data."}
            {tourId === "rewards" && "Rank, atelier, goals — quiet progress, not grinding."}
            {tourId === "global" && "Bloom in 60 seconds — only what you have."}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => startTour(tourId)}
        data-tour={`tour-start-${tourId}`}
        className="mt-3 inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background transition-opacity hover:opacity-90"
      >
        Take tour <Map className="size-3.5" />
      </button>
    </div>
  );

  if (containerClassName) {
    return <div className={containerClassName}>{card}</div>;
  }
  return card;
}

export function TourInlineList({ ids, className }: { ids: TourId[]; className?: string }) {
  return (
    <div className={cn("grid gap-3", className)}>
      {ids.map((id) => (
        <TourCard key={id} tourId={id} />
      ))}
    </div>
  );
}
