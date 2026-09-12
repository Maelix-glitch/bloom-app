/**
 * StorySheet — Instagram-exact bottom sheet.
 * Dark #121212, handle, Done blue, border #262626.
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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const onFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.scrollIntoView !== "function") return;
      if (!sheet.contains(target)) return;
      window.setTimeout(() => {
        try {
          target.scrollIntoView({ block: "nearest", behavior: "smooth" });
        } catch {
          target.scrollIntoView();
        }
      }, 120);
    };
    sheet.addEventListener("focusin", onFocus);
    return () => sheet.removeEventListener("focusin", onFocus);
  }, []);

  return (
    <div className="fixed inset-0 z-[91] flex flex-col justify-end bg-black/60" role="dialog" aria-modal="true" aria-label={label ?? title}>
      <div className="absolute inset-0" onClick={requestClose} aria-hidden />
      <div
        ref={sheetRef}
        className={`relative flex max-h-[80vh] w-full flex-col rounded-t-[12px] bg-[#121212] border-t border-[#262626] transition-transform duration-200 ${
          closing ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="flex flex-col items-center gap-3 border-b border-[#262626] px-4 py-3">
          <div className="h-1 w-10 rounded-full bg-[#363636]" />
          <div className="flex w-full items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold leading-tight text-white">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-[13px] text-[#a8a8a8]">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label={`Close ${title}`}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-[#262626] text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer ? (
          <div className="border-t border-[#262626] px-4 py-3 pb-[max(14px,env(safe-area-inset-bottom))]">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
