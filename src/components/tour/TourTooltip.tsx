/**
 * TourTooltip — small popup with arrow pointing at feature.
 *
 * Premium, not cartoonish: rounded 20px, soft border, accent hairline,
 * display font for title, mono eyebrow, good/bad with icons.
 * Arrow is a real CSS triangle that points at the target, with auto placement.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Sparkles, X, AlertTriangle, ArrowRight, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TourStep } from "@/lib/tour/types";

interface Props {
  step: TourStep;
  index: number;
  total: number;
  targetRect: DOMRect | null;
  placement: "top" | "bottom" | "left" | "right";
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function TourTooltip({ step, index, total, targetRect, placement, onNext, onPrev, onSkip, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (!targetRect || !cardRef.current) return;
    const card = cardRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    const gap = 14; // gap between target and card (arrow space)

    const cw = Math.min(360, vw - margin * 2);
    const ch = card.offsetHeight || 280;

    let top = 0;
    let left = 0;

    switch (placement) {
      case "bottom":
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - cw / 2;
        break;
      case "top":
        top = targetRect.top - ch - gap;
        left = targetRect.left + targetRect.width / 2 - cw / 2;
        break;
      case "right":
        top = targetRect.top + targetRect.height / 2 - ch / 2;
        left = targetRect.right + gap;
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2 - ch / 2;
        left = targetRect.left - cw - gap;
        break;
    }

    // clamp
    left = Math.max(margin, Math.min(left, vw - cw - margin));
    top = Math.max(margin + 8, Math.min(top, vh - ch - margin - 20));

    // if still off-screen, flip to bottom
    if (placement === "top" && top < margin) {
      top = targetRect.bottom + gap;
    }
    if (placement === "bottom" && top + ch > vh - margin) {
      top = targetRect.top - ch - gap;
    }

    setStyle({ top, left, width: cw });
  }, [targetRect, placement]);

  // close on esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft" && index > 0) onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev, index]);

  const arrowStyle: React.CSSProperties = {};
  if (targetRect) {
    const centerX = targetRect.left + targetRect.width / 2;
    const centerY = targetRect.top + targetRect.height / 2;
    if (placement === "bottom") {
      arrowStyle.left = Math.max(16, Math.min(centerX - (style.left as number || 0), 320));
      arrowStyle.top = -6;
    } else if (placement === "top") {
      arrowStyle.left = Math.max(16, Math.min(centerX - (style.left as number || 0), 320));
      arrowStyle.bottom = -6;
    } else if (placement === "right") {
      arrowStyle.top = Math.max(16, Math.min(centerY - (style.top as number || 0), 400));
      arrowStyle.left = -6;
    } else if (placement === "left") {
      arrowStyle.top = Math.max(16, Math.min(centerY - (style.top as number || 0), 400));
      arrowStyle.right = -6;
    }
  }

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={step.title}
      className={cn(
        "tour-card pointer-events-auto fixed z-[3002] flex flex-col overflow-hidden rounded-[20px] border bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.7),0_0_0_1px_rgba(0,0,0,0.4),inset_0_1px_0_color-mix(in_oklab,var(--foreground)_12%,transparent)] backdrop-blur-[20px]",
      )}
      style={style}
    >
      {/* arrow */}
      <span
        aria-hidden
        className={cn(
          "tour-arrow absolute size-3 rotate-45 border bg-[var(--surface)]",
          placement === "bottom" && "border-b-0 border-r-0",
          placement === "top" && "border-l-0 border-t-0",
          placement === "right" && "border-b-0 border-l-0",
          placement === "left" && "border-r-0 border-t-0",
        )}
        style={{
          ...arrowStyle,
          borderColor: "color-mix(in oklab, var(--border) 80%, transparent)",
        }}
      />

      {/* top hairline accent */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--violet) 32%, transparent) 50%, transparent)",
        }}
      />

      <div className="p-[18px]">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-faint">
              <Sparkles className="size-3" aria-hidden />
              Step {index + 1} of {total} · {step.target.replace(/-/g, " ")}
            </p>
            <h3 className="display mt-1.5 text-[17px] leading-tight tracking-tight">{step.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tutorial"
            className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-faint transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>

        {step.tip ? (
          <div className="mt-3 flex gap-2.5 rounded-xl border border-[color-mix(in_oklab,var(--amber)_22%,transparent)] bg-[color-mix(in_oklab,var(--amber)_8%,transparent)] px-3 py-2.5">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber" aria-hidden />
            <p className="text-[12px] leading-snug text-[color-mix(in_oklab,var(--foreground)_78%,transparent)]">
              <span className="font-medium">Efficient:</span> {step.tip}
            </p>
          </div>
        ) : null}

        {(step.good || step.bad) && (
          <div className="mt-3 grid gap-2">
            {step.good ? (
              <div className="flex gap-2">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--sage)_18%,transparent)] text-sage">
                  <Check className="size-3" strokeWidth={2.5} />
                </span>
                <p className="text-[12px] leading-snug text-muted-foreground">
                  <span className="font-medium text-sage">Do:</span> {step.good}
                </p>
              </div>
            ) : null}
            {step.bad ? (
              <div className="flex gap-2">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--rose)_16%,transparent)] text-rose">
                  <AlertTriangle className="size-3" />
                </span>
                <p className="text-[12px] leading-snug text-muted-foreground">
                  <span className="font-medium text-rose">Don't:</span> {step.bad}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-surface/50 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={cn(
                "h-1 rounded-full transition-all",
                i === index ? "w-6 bg-foreground" : i < index ? "w-3 bg-sage/60" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSkip}
            className="mono rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] text-faint transition-colors hover:text-foreground"
          >
            Skip
          </button>
          {index > 0 ? (
            <button
              type="button"
              onClick={onPrev}
              className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-surface-2 px-3 text-[12.5px] transition-colors hover:border-border-strong"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-foreground px-4 text-[12.5px] font-medium text-background transition-transform active:scale-[0.98]"
          >
            {index === total - 1 ? "Done" : "Next"}
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
