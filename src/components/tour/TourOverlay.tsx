/**
 * TourOverlay — dims everything, spotlights target, shows tooltip with arrow.
 *
 * - Uses fixed overlay with 4 cutout divs + spotlight ring
 * - Calculates best placement (top/bottom/left/right) based on viewport
 * - Scrolls target into view
 * - Skips step if target not found (with console warning)
 */

import { useEffect, useLayoutEffect, useState } from "react";
import type { TourStep } from "@/lib/tour/types";
import { TourTooltip } from "./TourTooltip";

interface Props {
  step: TourStep | null;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
}

type Placement = "top" | "bottom" | "left" | "right";

function getRect(target: string): DOMRect | null {
  const el = document.querySelector(`[data-tour=\"${target}\"]`) as HTMLElement | null;
  if (!el) return null;
  return el.getBoundingClientRect();
}

function bestPlacement(rect: DOMRect): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceTop = rect.top;
  const spaceBottom = vh - rect.bottom;
  const spaceLeft = rect.left;
  const spaceRight = vw - rect.right;

  // prefer bottom if enough space, else top, else side with more space
  if (spaceBottom > 300 || spaceBottom > spaceTop) return "bottom";
  if (spaceTop > 300) return "top";
  if (spaceRight > spaceLeft && spaceRight > 320) return "right";
  if (spaceLeft > 320) return "left";
  return "bottom";
}

export function TourOverlay({ step, index, total, onNext, onPrev, onSkip, onClose }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [placement, setPlacement] = useState<Placement>("bottom");

  // track target rect
  useLayoutEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }

    const update = () => {
      const r = getRect(step.target);
      if (r) {
        setRect(r);
        const auto = step.placement === "auto" || !step.placement ? bestPlacement(r) : (step.placement as Placement);
        setPlacement(auto);
        // scroll into view if needed
        const el = document.querySelector(`[data-tour=\"${step.target}\"]`) as HTMLElement | null;
        if (el) {
          const inView = r.top >= 80 && r.bottom <= window.innerHeight - 80;
          if (!inView) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      } else {
        setRect(null);
      }
    };

    update();
    const id = window.setInterval(update, 300);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [step]);

  // lock scroll when tour active? No — allow scroll, but dim.
  useEffect(() => {
    if (!step) return;
    const prev = document.body.style.overflow;
    // don't lock — user may need to scroll, we handle via scrollIntoView
    return () => {
      document.body.style.overflow = prev;
    };
  }, [step]);

  if (!step) return null;

  const hasTarget = !!rect;

  return (
    <div className="tour-overlay fixed inset-0 z-[3000] pointer-events-none">
      {/* dim */}
      <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--background)_72%,transparent)] backdrop-blur-[2px] pointer-events-auto" onClick={onClose} />

      {/* spotlight cutout — if no target, just dim */}
      {rect ? (
        <>
          {/* top */}
          <div
            className="absolute left-0 right-0 top-0 bg-[color-mix(in_oklab,var(--background)_86%,transparent)] pointer-events-auto"
            style={{ height: rect.top - 8 }}
            onClick={onClose}
          />
          {/* bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-[color-mix(in_oklab,var(--background)_86%,transparent)] pointer-events-auto"
            style={{ top: rect.bottom + 8 }}
            onClick={onClose}
          />
          {/* left */}
          <div
            className="absolute left-0 bg-[color-mix(in_oklab,var(--background)_86%,transparent)] pointer-events-auto"
            style={{ top: rect.top - 8, bottom: window.innerHeight - rect.bottom - 8, width: rect.left - 8 }}
            onClick={onClose}
          />
          {/* right */}
          <div
            className="absolute right-0 bg-[color-mix(in_oklab,var(--background)_86%,transparent)] pointer-events-auto"
            style={{ top: rect.top - 8, bottom: window.innerHeight - rect.bottom - 8, left: rect.right + 8 }}
            onClick={onClose}
          />

          {/* spotlight ring */}
          <div
            className="absolute rounded-[16px] border-2 border-[color-mix(in_oklab,var(--violet)_55%,transparent)] shadow-[0_0_0_4px_color-mix(in_oklab,var(--violet)_18%,transparent),0_12px_32px_-12px_rgba(0,0,0,0.6)] transition-all duration-300"
            style={{
              top: rect.top - 8,
              left: rect.left - 8,
              width: rect.width + 16,
              height: rect.height + 16,
            }}
          >
            {/* pulsing dot */}
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center">
              <span className="absolute size-5 animate-ping rounded-full bg-violet/30" />
              <span className="relative size-2 rounded-full bg-violet shadow-[0_0_12px_var(--violet)]" />
            </span>
          </div>
        </>
      ) : null}

      {/* tooltip or fallback */}
      {hasTarget ? (
        <TourTooltip
          step={step}
          index={index}
          total={total}
          targetRect={rect}
          placement={placement}
          onNext={onNext}
          onPrev={onPrev}
          onSkip={onSkip}
          onClose={onClose}
        />
      ) : (
        <div className="pointer-events-auto fixed left-1/2 top-1/2 z-[3002] w-[min(360px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border bg-surface p-5 shadow-2xl">
          <p className="mono text-[10px] uppercase tracking-[0.12em] text-faint">Step {index + 1} of {total}</p>
          <h3 className="display mt-1 text-[16px]">{step.title}</h3>
          <p className="mt-2 text-[13px] text-muted-foreground">{step.body}</p>
          <p className="mt-2 text-[11px] text-amber">Target "{step.target}" not on this screen — skipping to next available.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onSkip} className="mono text-[11px] uppercase text-faint">
              Skip tour
            </button>
            <button type="button" onClick={onNext} className="h-8 rounded-full bg-foreground px-4 text-[12.5px] text-background">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
