/**
 * StorySheet — the polished bottom sheet every story tray shares.
 * Backdrop dismiss, Escape, safe-area padding, spring entrance. One closing
 * animation path so sheets never pop out of existence.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function StorySheet({
  title,
  subtitle,
  onClose,
  children,
  footer,
  label,
}: {
  title: string;
  subtitle?: string | undefined;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode | undefined;
  label?: string | undefined;
}) {
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const requestClose = useCallback(() => {
    setClosing(true);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        requestClose();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [requestClose]);

  /* lock body scroll while a sheet lives */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="bstory" role="dialog" aria-modal="true" aria-label={label ?? title}>
      <div className="ssheet-backdrop" onClick={requestClose} aria-hidden />
      <div ref={sheetRef} className="ssheet" data-closing={closing || undefined}>
        <div className="ssheet-grip" aria-hidden />
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-1">
          <div className="min-w-0">
            <h2 className="display text-[18px] leading-tight">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={`Close ${title}`}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="ssheet-scroll min-h-0 flex-1 px-5">{children}</div>
        {footer ? (
          <div className="border-t border-border px-5 py-3 pb-[max(14px,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
