/**
 * TourTooltip — the card that explains each step.
 *
 * Purely presentational: `TourOverlay` owns every bit of geometry and writes
 * this card's position directly to the DOM, so nothing here re-renders while
 * the highlight moves. What it does own is the *content* transition — the card
 * morphs its height and cross-fades its copy in the direction you travelled,
 * which is the half of "smooth" you actually look at.
 *
 * Shape of a step: an eyebrow (where you are), a title in the display face,
 * one or two sentences, an efficiency tip, and a do / don't pair. Premium
 * means restraint: hairlines, no cartoons, one accent.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Lightbulb, Sparkles, X } from "lucide-react";

import type { TourStep } from "@/lib/tour/types";
import type { Placement } from "@/lib/tour/placement";

interface Props {
  step: TourStep;
  index: number;
  total: number;
  placement: Placement;
  /** 1 = travelling forward, -1 = back. The copy slides in from that side. */
  direction: 1 | -1;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
}

/** How long the outgoing step stays on screen while it fades. */
const GHOST_MS = 340;

function StepCopy({ step }: { step: TourStep }) {
  return (
    <div className="tour-copy">
      <p className="tour-eyebrow">
        <Sparkles className="size-3" aria-hidden="true" />
        {step.target.replace(/-/g, " ")}
      </p>
      <h3 className="tour-title" id="tour-step-title">
        {step.title}
      </h3>
      <p className="tour-body">{step.body}</p>

      {step.tip ? (
        <p className="tour-tip">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <strong>Efficient</strong> {step.tip}
          </span>
        </p>
      ) : null}

      {step.good || step.bad ? (
        <div className="tour-dos">
          {step.good ? (
            <p className="tour-do">
              <span className="tour-mark tour-mark--good" aria-hidden="true">
                <Check className="size-3" strokeWidth={2.75} />
              </span>
              <span>
                <strong>Do</strong> {step.good}
              </span>
            </p>
          ) : null}
          {step.bad ? (
            <p className="tour-do">
              <span className="tour-mark tour-mark--bad" aria-hidden="true">
                <AlertTriangle className="size-3" />
              </span>
              <span>
                <strong>Don't</strong> {step.bad}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TourTooltip({
  step,
  index,
  total,
  placement,
  direction,
  onNext,
  onPrev,
  onSkip,
  onClose,
}: Props) {
  const stackRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const previous = useRef<TourStep | null>(null);
  const [ghost, setGhost] = useState<TourStep | null>(null);

  /* Keep the outgoing step around for one cross-fade. */
  useEffect(() => {
    const prev = previous.current;
    previous.current = step;
    if (!prev || prev.id === step.id) return undefined;
    setGhost(prev);
    const timer = window.setTimeout(() => setGhost(null), GHOST_MS);
    return () => window.clearTimeout(timer);
  }, [step]);

  /*
   * Drive the stack's height from the live pane. Both panes are absolutely
   * positioned inside it, so the card's height is ours to animate: it morphs
   * from one step's length to the next instead of jumping, and the overlay's
   * ResizeObserver picks the change up and glides the card to its new place.
   * (`height: auto` never transitions, which is exactly what the first paint
   * wants.)
   */
  useLayoutEffect(() => {
    const stack = stackRef.current;
    const live = liveRef.current;
    if (!stack || !live) return;
    stack.style.height = `${live.offsetHeight}px`;
  }, [step.id, ghost]);

  const last = index === total - 1;

  return (
    <div
      className="tour-card"
      data-tour-card=""
      data-placement={placement}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
    >
      <span className="tour-arrow" data-side={placement} aria-hidden="true" />
      {/* the hairline at the top edge is the progress bar: one glance tells you
          how much tour is left, without a number competing with the title */}
      <span className="tour-progress" aria-hidden="true">
        <span
          className="tour-progress-fill"
          style={{ transform: `scaleX(${total > 0 ? (index + 1) / total : 0})` }}
        />
      </span>

      <div className="tour-stack" ref={stackRef}>
        {ghost ? (
          <div className="tour-pane is-ghost" data-dir={-direction} aria-hidden="true">
            <StepCopy step={ghost} />
          </div>
        ) : null}
        <div key={step.id} className="tour-pane is-live" data-dir={direction} ref={liveRef}>
          <StepCopy step={step} />
        </div>
      </div>

      <div className="tour-foot">
        <div className="tour-dots" aria-hidden="true">
          {Array.from({ length: total }).map((_, dot) => (
            <span
              key={dot}
              className="tour-dot"
              data-state={dot === index ? "current" : dot < index ? "done" : "todo"}
            />
          ))}
        </div>

        <div className="tour-actions">
          <button type="button" className="tour-btn tour-btn--quiet" onClick={onSkip}>
            Skip
          </button>
          {index > 0 ? (
            <button type="button" className="tour-btn tour-btn--ghost" onClick={onPrev}>
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back
            </button>
          ) : null}
          <button type="button" className="tour-btn tour-btn--primary" onClick={onNext}>
            {last ? "Finish" : "Next"}
            {last ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <ArrowRight className="size-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <button
        type="button"
        className="tour-close"
        onClick={onClose}
        aria-label="Close the tour"
        title="Close (Esc)"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
